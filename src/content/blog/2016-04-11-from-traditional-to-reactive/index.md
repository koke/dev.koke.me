---
title: "From traditional to reactive"
slug: from-traditional-to-reactive
pubDatetime: 2016-04-11
categories:
  - "programming"
---

[Brent Simmons](http://inessential.com) has a series of posts about Reactive vs “Traditional” which sound a lot like the arguments we’re having internally as a team lately. I’ve gotten into RxSwift in the past months and believe it’s a great solution to a number of problems, but it is indeed a big dependency and has a steep learning curve.

I find RxSwift declarative style much easier to read and follow than the imperative counterparts, but it took a while to get there. I remember struggling for _months_ learning to think in terms of _streams_, and I was really motivated to learn it.

But I thought I’d take some time to take the example in [Comparing Reactive and Traditional](http://inessential.com/2016/04/08/comparing_reactive_and_traditional), as I don’t think it’s a fair comparison (and not in the way you might expect). You can download all the steps in a playground: [Traditional to Reactive.playground](https://kokejournal.files.wordpress.com/2016/04/traditional2reactive.zip).

My first “refactor” was just to clean up the code enough to compiled without errors, so I can put it on a playground.

Then I addressed what I found most confusing about the traditional implementation, which is all that throttling logic scattered around the view controller. There’s no need to go reactive there, we just need to contain all that logic and state in one place: `Throttle`. This is a generic class that takes a `timeout` and a `callback`, and you can send new values or `cancel`. It will call `callback` after `timeout` seconds since the last `input` unless a new `input` happens. Note that this class is generic and doesn’t need to know anything about the values. It is also easily testable.

<https://gist.github.com/koke/18951400e7dee559fad8e1a5096909ec>

This leaves us with a simpler view controller, but we still have some logic in there that’s not really specific and could be extracted: keeping only the last request and canceling the previous one. I’ve called this `SwitchToLatest`, and it couldn’t be simpler: it just has a `switchTo` method that keeps a reference to the task, and calls `cancel` on it whenever there’s a new one. It uses a new `Cancelable` protocol since we don’t really care about what the task is, we just need to know that we can `cancel` it. Also really easy to test.

<https://gist.github.com/koke/2189a797e8b18573a772c8a34cb1e423>

And this is how the final `ViewController` looks:

<https://gist.github.com/koke/bba95f0d0a8706f973c2d0dc6208d25d>

Here’s where I think the fair comparison starts. The traditional version has all the behaviors we want in units with a single responsibility, and the view controller takes these building blocks to do what it needs.

What RxSwift brings to the table is the ability to compose these units and a common pattern for cancellation. What you can’t do here is take `Throttle` and pipe its output into `SwitchToLatest`. But in this case, that’s fine.

The live search example is typically a nice example of reactive code as it showcases all of it’s features: streams of values, composition of operators, side effects on subscription, and disposables/cancellation. But as we’ve seen, it doesn’t work as a way for reactive code to prove its value, as the traditional counterpart is simple _enough_.

Compare this to the thing I was trying to write in RxSwift.

- We have some data that needs to be loaded from the API. That data might be used by a few different view controllers.
- When a request fails because of network conditions, it should be automatically retried a few times before we give up.
- We want to poll for new data every minute, counting since the last successful refresh.
- If a request is taking more than a few seconds, the UI should display a message indicating that “this is taking longer than expected”.
- If the request fails because an “unrecoverable” error or we give up on retrying, the UI should display an error and we shouldn’t try to poll for data until the user manually refreshes again.
- The UI should show a message when it detects it’s offline, and stop any polling attempts. When we detect we’re online we should resume polling. (I later learned that Apple doesn’t recommend using Reachability to prevent network requests unless they’ve already failed).
- If a second VC wants the same data, there should not be a second request going out. Not just caching, but reusing in-progress requests.

When written in RxSwift it was already a complex logic to follow, and I even had to write a couple of custom operators (`pausable` and `retryIf`). There’s [no silver bullet](https://en.wikipedia.org/wiki/No_Silver_Bullet), and that’s also true for RxSwift, but I believe it can help. I can’t imagine reasoning about all the possible states in a more traditional design.

I also would argue (although someone might disagree) that any time you use `NSNotificationCenter`, `NSFetchedResultsController`, or KVO, you are already doing some sort of reactive programming, just not in a declarative way.
