---
title: "Diving into Swift compiler performance"
slug: diving-into-swift-compiler-performance
pubDatetime: 2017-03-24
categories:
  - "programming"
tags:
  - "performance"
  - "swift"
---

It all starts by reading [this week in Swift](https://swiftnews.curated.co), and the article [The best hardware to build with Swift is not what you might think](https://www.linkedin.com/pulse/best-hardware-build-swift-what-you-might-think-jacek-suliga?utm_campaign=This%2BWeek%2Bin%2BSwift&utm_medium=web&utm_source=This_Week_in_Swift_124), written by the LinkedIn team about how apparently their Mac Pros are slower at building Swift than any other Mac.

I’ve spent so much time waiting for Xcode to compile over the past years than I’ve often toyed with the idea of getting an iMac or even a Mac Pro for the maximum possible performance, so this caught my attention. I’ve also been wondering if instead of throwing money at the problem, there might be some easy improvements to either reduce build time or to improve Swift performance.

Looking at the [reported issue](https://bugs.swift.org/browse/SR-4142) I discovered a couple Swift compiler flags that were new to me: `-driver-time-compilation` and `-Xfrontend -debug-time-compilation`, which will show something like this:

\[code\] ===-------------------------------------------------------------------------=== Swift compilation ===-------------------------------------------------------------------------=== Total Execution Time: 10.1296 seconds (10.6736 wall clock)

\---User Time--- --System Time-- --User+System-- ---Wall Time--- --- Name --- 3.9556 ( 99.9%) 6.1701 (100.0%) 10.1257 (100.0%) 10.6697 (100.0%) Type checking / Semantic analysis 0.0013 ( 0.0%) 0.0002 ( 0.0%) 0.0015 ( 0.0%) 0.0015 ( 0.0%) LLVM output 0.0011 ( 0.0%) 0.0001 ( 0.0%) 0.0013 ( 0.0%) 0.0013 ( 0.0%) SILGen 0.0005 ( 0.0%) 0.0001 ( 0.0%) 0.0006 ( 0.0%) 0.0006 ( 0.0%) IRGen 0.0003 ( 0.0%) 0.0001 ( 0.0%) 0.0003 ( 0.0%) 0.0003 ( 0.0%) LLVM optimization 0.0001 ( 0.0%) 0.0001 ( 0.0%) 0.0002 ( 0.0%) 0.0002 ( 0.0%) Parsing 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) SIL optimization 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) Name binding 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) AST verification 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) SIL verification (pre-optimization) 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) 0.0000 ( 0.0%) SIL verification (post-optimization) 3.9589 (100.0%) 6.1707 (100.0%) 10.1296 (100.0%) 10.6736 (100.0%) Total \[/code\]

I started looking into the results for the [WordPress app](https://github.com/wordpress-mobile/WordPress-iOS) and it looks like almost every bottleneck is in the `Type Checking` stage. As I’d find later, mostly in type inference. I’ve only tested this on `Debug` builds, as that’s where improvements could impact development best. For `Release`, I’d suspect the optimization stage would take a noticeable amount of time.

Time to look at what’s the slowest thing, and why. **Disclaimer:** the next shell commands might look extra complicated. I’ve used those tools for over a decade but never managed to fully learn all their power, so I’d jump from `grep` to `awk` to `sed` to `cut` and back, just because I know how to do it that way. I’m sure there’s a better way, but this got me the results I wanted so ¯\\_(ツ)_/¯.

Before you run these close Xcode, and really everything else if you can so you get more reliable results.

Do a clean build with all the debug flags and save the log. That way you can query it later without having to do another build.

\[code\] xcodebuild -destination 'platform=iOS Simulator,name=iPhone 7' \\ -sdk iphonesimulator -workspace WordPress.xcworkspace \\ -scheme WordPress -configuration Debug \\ clean build \\ OTHER_SWIFT_FLAGS="-driver-time-compilation \\ -Xfrontend -debug-time-function-bodies \\ -Xfrontend -debug-time-compilation" | tee profile.log \[/code\]

Print the compiled files sorted by build time:

\[code\] awk '/Driver Time Compilation/,/Total$/ { print }' profile.log | grep compile | cut -c 55- | sed -e 's/^ \*//;s/ (.\*%) compile / /;s/ \[^ \]\*Bridging-Header.h$//' | sed -e "s|$(pwd)/||" | sort -rn | tee slowest.log \[/code\]

Show the top 10 slowest files:

\[code\] head -10 slowest.log 2.9555 WordPress/Classes/Extensions/Math.swift 2.8760 WordPress/Classes/Utility/PushAuthenticationManager.swift 2.8751 WordPress/Classes/ViewRelated/Post/AztecPostViewController.swift 2.8748 WordPress/Classes/ViewRelated/People/InvitePersonViewController.swift 2.8741 WordPress/Classes/ViewRelated/System/PagedViewController.swift 2.8699 WordPress/Classes/ViewRelated/Views/WPRichText/WPTextAttachmentManager.swift 2.8680 WordPress/Classes/ViewRelated/Views/PaddedLabel.swift 2.8678 WordPress/Classes/ViewRelated/NUX/WPStyleGuide+NUX.swift 2.8666 WordPress/Classes/Networking/Remote Objects/RemoteSharingButton.swift 2.8162 Pods/Gridicons/Gridicons/Gridicons/GridiconsGenerated.swift \[/code\]

Almost 3 seconds on [Math.swift](https://github.com/wordpress-mobile/WordPress-iOS/blob/421b249100e613985b36f1fd5714a6cacf6dae80/WordPress/Classes/Extensions/Math.swift)? That doesn’t make any sense. Thanks to the `-debug-time-function-bodies` flag, I can look into `profile.log` and see it’s all the `round` function. To make this easier, and since it doesn’t depend on anything else in the app, I extracted that to a separate file. In this case, the `-Xfrontend -debug-time-expression-type-checking` flag helped identifying the line where the compiler was spending all the time:

\[code\] return self + sign \* (half - (abs(self) + half) % divisor) \[/code\]

When you look at it, it seems pretty obvious that those are all `Int`s, right? But what’s obvious to humans, might not be to a compiler. I tried another flag `-Xfrontend -debug-constraints` which resulted in a 53MB log file ?. But trying to make sense of it, it became apparent that `abs` was generic, so the compiler had to guess, and `+`,`-`,`*`, and `%` had also multiple candidates each, so the type checker seems to go through every combination rating them, before picking a winner. There is some good information on how the [type checker works](https://github.com/apple/swift/blob/master/docs/TypeChecker.rst) in the Swift repo, but I still have to read that completely.

A simple change (adding `as Int`) turns the 3 seconds into milliseconds:

\[code\] return self + sign \* (half - (abs(self) as Int + half) % divisor) \[/code\]

I’ve kept going through the list and in many cases I still can’t figure out what is slow, but there were some quick wins there. After 4 simple changes, build time was reduced by 18 seconds, a 12% reduction.
