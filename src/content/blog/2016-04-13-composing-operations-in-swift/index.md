---
title: "Composing operations in Swift"
slug: composing-operations-in-swift
pubDatetime: 2016-04-13
categories:
  - "programming"
tags:
  - "functional-programming"
  - "swift"
---

Continuing on [From traditional to reactive](https://koke.me/2016/04/11/from-traditional-to-reactive/), the problem I’m solving today is refactoring our image downloading system(s).

If I remember it correctly, it all started a long time ago when we switched to AFNetworking, and started using its `UIImageView.setImageWithURL` methods. To this day I still feel that there’s something terribly wrong in a view calling networking code directly, but that’s not today’s problem. Instead it’s how this system grew by adapting to each use case with ad-hoc solutions.

If I haven’t missed anything, we have:

- AFNetworking’s `setImageWIthURL`: you pass a URL and maybe a placeholder, and it eventually sets the image. It uses its own caching.
- `UIImageView.downloadImage(_:placeholderImage:)`, which is basically a wrapper for AFNetworking’s method which sets a few extra headers. Although it’s not very obvious why it’s even there.
- A newer `UIImageView.downloadImage(_)`, which skips AFNetworking and uses NSURLSession directly. This was recently developed for the sharing extension to remove the AFNetworking dependency. It creates the request, does the networking, sets the result, and it adds caching. It also cancels any previous requests if you reset the image view’s URL.
- Then we have `downloadGravatar` and `downloadBlavatar` which are just wrappers that take an email/hash or hostname and download the right Gravatar. At least these were refactored not long ago to move the URL generation into a separate `Gravatar` type. Although it seems the old methods are also still there and used in a few places.
- `WPImageSource`: basically all it does is prevent duplicate requests. Imagine you just loaded a table to display some comments and you need to load the gravatars. Several of the rows are for the same commenter, so the naive approach would request the same gravatar URL several times. This coalesces all of the requests into one. This doesn’t really have anything to do with images in theory, and could be more generic, although it also handles adding authentication headers for private blogs.
- `WPTableImageSource`: this one does quite a few things. The reason behind it was to load images for table view cells without sacrificing scrolling performance. So it uses [Photon](https://developer.wordpress.com/docs/photon/) to download images with the size we need. If Photon doesn’t give us what we want (if the original image is smaller than the target size, we don’t want to waste bandwidth) we resize locally. We cache both original and resized images. It also keeps track of the index path that corresponds to an image so we can call the delegate when it’s ready, and it supports invalidating the stored index paths when the table view contents have changed, so we don’t set the images in the wrong cell.

These are all variations of the same problem, built in slightly different ways. What I want to do is take all of this into composable units, each with a single responsibility.

So I built an example for one of the simple cases: implement a `UIImageView.setImageWithURL(_)` that uses Photon to resize the image to the image view’s size, downloads the image and sets it. No caching, placeholders or error handling, but it customizes the request a bit.

This is what the original code looked like approximately (changed a bit so the example is easier to follow):

<https://gist.github.com/koke/b17969fee2ba7e6a5a28859ae34af5e5>

The problem I encountered is that Photon has [an issue](https://code.trac.wordpress.org/ticket/62) resizing transparent images, so for this I want to skip photon and do the resizing on the device. If you want to do that with the original code I see two options: duplicate it, or start adding options to the function to change its behavior. I’m not sure which option is worse.

The first step is to break the existing method into steps:

1. “Photonize” the URL so we are asking for a resized image
2. Build the request
3. Fetch the data
4. Turn it into an image
5. Make sure it’s an image, or stop
6. Set the image view’s image to that

So I’ve extracted most of those steps into functions and this is what I got:

<https://gist.github.com/koke/d4835c510018d557835d85c5e51a3ffa>

This is much more functional, even if it looks sequential. It’s written that way because I find it’s easier to read, but you could write the same thing using nested functions.

<https://gist.github.com/koke/8dfd748cd0e0417460a22d3d50af95ee>

If you’re into Lisp, you might find this version more pleasing, but in Swift this feels harder to follow than using intermediate variables. This is why other languages have things like the compose operator which you can use to compose functions without all that nesting. When I followed this route, I hit some limitations on Swift generics, and it also looks very foreign. This might work well in Haskell where all functions are curried, but it’s not so much in Swift.

<https://gist.github.com/koke/d46e5028ee6b1a6b435be9e40c0e3ead>

Also note that the pattern of nesting breaks on `fetchData` as we don’t have a result yet. I would hardly call that _callback hell_, but we can start moving in that direction easily if we say we want all the image processing to happen in a background queue. Or if image resizing was an asynchronous operation.

<https://gist.github.com/koke/e982259b4362805d2762ad72229d0b33>

Then I tried with RxSwift. All I wanted for this could be done with a much simpler `Future` type, since I don’t need side effects, cancellation, or any operator other than `map`/`flatMap`. But I already had RxSwift on the project so I’m using it as an example of the syntax. I also added a second version with the transform chain grouped into smaller pieces to improve readability.

<https://gist.github.com/koke/f4f3878456c176fcd7e3718fa99b141f>

What I haven’t tried yet is a solution based on `NSOperation`, but I have the feeling that it would add a lot of boilerplate, and wouldn’t feel completely right in Swift.

Finally, what I think I’d build is something based on the traditional version with customization points. I’d love to _flatten_ the data pipeline and be able to just keep mapping over asynchronous values without depending on an external framework. For this example though, it seems that callbacks don’t complicate things much, at least yet. So I think I’ll start from something like this.

<https://gist.github.com/koke/7e29a893c4fbda8821fe273bb48a9717>

Here’s a gist with all the examples and the helper functions: [ImageServices.swift](https://gist.github.com/c118d6cb71cb60614db1c7aa90805a91)

If you have a better design, I’d love to hear about it.
