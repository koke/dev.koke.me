---
title: "Attaching patches to Pull Requests"
slug: attaching-patches-to-pull-requests
pubDatetime: 2016-04-26
categories:
  - "programming"
tags:
  - "code-review"
  - "git"
  - "tips"
---

This might sound strange, but sometimes I prefer patches to pull requests. The main scenario is when I’m reviewing someone else’s code and I want to propose an alternative implementation.

I could just create a new branch and pull request with my change, but then the conversation is split between two PRs, and there's a new branch that you have to clean up.

When the change is small enough, or I'm not sure if it will be accepted, I’d rather send a patch. So far I’ve been doing `git diff`, uploading the result to [gist](https://gist.github.com), and posting the link as a comment in the PR. This has a few shortcomings:

- No binary support.
- If the original author wants to use it, authorship is usually lost, unless they use the `--author` option for `git commit`, and even then there’s room for typos.

I know there’s a better way, as Git was originally designed to share patches, not pull requests. I think I’ve been avoiding it because it’s not as common and the original author might not know what to do with the patch. So I’m writing this as a quick tutorial.

## Creating a patch

Before creating a patch, you have to commit your changes. `git format-patch` will create a patch file for each commit, so your history can be preserved. Once you have a commit, your branch is ahead of origin, so we can use that to tell `format-patch` which commits to pick

\[code light="true"\] branch=git rev-parse --abbrev-ref HEAD origin="origin/$branch" git format-patch $origin \[/code\]

This will leave one or more `.patch` files in your project directory:

\[code light="true"\] $ ls \*.patch 0001-Store-relative-paths-for-reader-topics.patch \[/code\]

Upload those to Gist and leave a comment with the link on the PR:

\[code light="true"\] $ gist -co \*.patch \[/code\]

## Applying a patch

For a single patch, you can copy the **Raw** link in the Gist and download it

\[code light="true"\] $ curl -sLO <https://gist.github.com/koke/1b30d861e6bb9d366f69bc186d0e9525/raw/8cc27f3e589a7823b2e9f1746aa921b92da14187/0001-Store-relative-paths-for-reader-topics.patch> \[/code\]

If there are multiple files, make sure you use the **Download Zip** link (or download all the files one by one):

\[code light="true"\] $ curl -sLo patches.zip https://gist.github.com/koke/ab100907c17c4ef6a977350494679091/archive/3fb0136a21a6bc499bff2511750c62ae6dc41630.zip $ unzip -j patches.zip Archive: patches.zip 3fb0136a21a6bc499bff2511750c62ae6dc41630 inflating: 0001-Store-relative-paths-for-reader-topics.patch inflating: 0002-Whitespace-changes.patch \[/code\]

Once you have the patch file(s) in your project directory, just run `git am -s *.patch`:

\[code light="true"\] $ git am -s \*.patch Applying: Store relative paths for reader topics Applying: Whitespace changes \[/code\]

Review the changes, and if you’re happy with them, `git push` them. Otherwise, you can reset your branch to point at the pushed changes:

\[code light="true"\] branch=git rev-parse --abbrev-ref HEAD origin="origin/$branch" git reset --hard $origin \[/code\]

Finally, run `git clean -df`, or manually remove the downloaded files.
