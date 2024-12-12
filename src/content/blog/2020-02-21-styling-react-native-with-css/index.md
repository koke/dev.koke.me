---
title: "Styling React Native with CSS"
slug: styling-react-native-with-css
pubDatetime: 2020-02-21
categories:
  - "programming"
tags:
  - "css"
  - "gutenberg"
  - "mobile"
  - "react-native"
coverImage: "css-loves-react.png"
---

The [Gutenberg](https://wordpress.org/gutenberg/) project started as a way to bring a new editor to WordPress, but not only to your admin dashboards. For the past two years, we have been working on [a mobile version](https://en.blog.wordpress.com/2020/01/20/the-block-editor-is-now-supported-on-mobile-devices/) that leverages React Native to bring that same new editor to the [mobile apps](https://apps.wordpress.com).

Since we started the mobile project, we have been looking for ways to bridge the web and native platforms. One of those is being able to share styles.

I'm aware of solutions like [react-native-web](https://github.com/necolas/react-native-web) or [ReactXP](https://microsoft.github.io/reactxp/), but their approach seems to be making the web code look more like React Native. However, we are ultimately building a tool to build websites, so we lean more towards web technologies. Some of those styles are also likely to be shared with the frontend of the site, and we don't want to change how that's done and force React components into millions of websites.

## What we do today

React Native uses [inline styles](https://facebook.github.io/react-native/docs/style) and a flexbox-based layout system named [Yoga](https://yogalayout.com). It is different syntax, but it's easy to tell how it's all inspired by the web. The style property names ofter match the CSS equivalents, and Yoga works like [flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout). So we started writing those in CSS with the hope that we'd be able to eventually reuse CSS files for web and native.

```css
/* Some of the first CSS in the project */
.toolbar {
  height: 34;
  background-color: white;
  flex-direction: row;
  justify-content: space-between;
  padding-left: 20;
  padding-right: 20;
}
```

To make this work, we use a [transformer](https://github.com/wordpress-mobile/gutenberg-mobile/blob/ddb8b3fd1553dd57e528dcc0029b2bc014f585ed/sass-transformer.js) that takes the CSS file and converts it to a JavaScript object when imported. We also get [Sass](https://sass-lang.com) support in the process so we can use variables and other nice things. This uses [css-to-react-native-transform](https://github.com/kristerkari/css-to-react-native-transform/) which converts CSS text into objects, and in turn uses [css-to-react-native](https://github.com/styled-components/css-to-react-native), which converts individual declarations to properties that React Native can understand.

```javascript
// When you import a CSS file...
import style from "./style.scss";

// ...it's as if you defined an object with those properties
const style = {
  toolbar: {
    height: 34,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 20,
  },
};
```

## Sharing CSS is more challenging than that

Just because it looks similar, it doesn't mean that we can now take any CSS from the web and use it on mobile. This solution works by turning [class selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors) into keys for the style object (so `.toolbar` becomes `style.toolbar`), but it can't process any other kind of [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors). Because of that, there's no concern for the [CSS cascade](https://wattenberger.com/blog/css-cascade) or any sort of inherited values. **This is problem #1: what style applies to what element**.

Once you match a specific declaration block to a component, the system still needs to be able to understand all the declarations and transform them to valid values for React Native. This works correctly if you write the CSS with React Native in mind, but there is a lot that it's not supported. For instance, you can't use [calc()](https://developer.mozilla.org/en-US/docs/Web/CSS/calc) and if you dare to use a [unit](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Values_and_Units) other than `px`, you get a crash. **Problem #2 is not failing when there is something that isn't supported**.

![Error showing JSON value '1em' of type NSString cannot be converted to a YValue. Did you forget the % or pt suffix?](images/Simulator-Screen-Shot-iPhone-11-2020-02-21-at-12.29.10-300x110.png)

## Scoping component CSS

The main challenge that we have when matching a CSS rule to a specific element is that CSS is designed to be global to a web document, and resolving a selector becomes an impossible task without a DOM that keeps track of relationships. Matching a simple class or element selector is achievable, but when you start using [combinators or pseudo selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors), it quickly becomes an impossible task, since a component doesn't know much about where it sits in the hierarchy. If this were to work, it would probably have to be implemented in the React Native renderer.

We did [some experiments](https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_combinator) in supporting descendant and other basic selectors using React contexts, but it seemed like a big effort with not enough cross-platform potential.

Short of React Native implementing an official support for this in the engine, I think our best bet is to let go of selectors and rely on another system to match a specific style to a component. That could be [CSS Modules](https://github.com/css-modules/css-modules), or a CSS-in-JS solution like [Emotion](https://github.com/css-modules/css-modules) or [Styled Components](https://www.styled-components.com).

## Compatible style declarations

I think one of the most important factors for the success of CSS might have been his error handling model. Because different browsers implement new features at a different pace, they will often encounter CSS that they don't understand yet.

> When errors occur in CSS, the parser attempts to recover gracefully, throwing away only the minimum amount of content before returning to parsing as normal. This is because errors aren’t always mistakes—new syntax looks like an error to an old parser, and it’s useful to be able to add new syntax to the language without worrying about stylesheets that include it being completely broken in older UAs.
>
> [CSS Syntax Module Level 3](https://www.w3.org/TR/css-syntax-3/#error-handling)

Our current transformer doesn't work like this. It won't ignore things that look unsupported, and it will even crash on some instances of "invalid" declarations. It is very hard to share any CSS with another platform without that error resilience that the CSS standard demands.

If we had a CSS engine that respected the standard, we could have a shared style with unsupported values and a fallback that worked on React Native. In an ideal scenario, the following snippet would apply a `1em` left margin on the web (since the latest declaration has precedence) and `12px` on React Native (since it would only consider the last declaration that was valid).

```css
.component {
  /* React Native can understand this... */
  margin-left: 12px;
  /* ...but not this */
  margin-left: 1em;
}
```

## My wishlist for CSS support in React Native

This is only a starting point, and there are a lot of CSS features that we won't be able to support. All layout in React Native is based on flexbox, so we can hardly support any properties related to [CSS Grids](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout/Basic_Concepts_of_Grid_Layout). Also, because we transform the CSS during compilation, the result is always static, which leaves out a lot of features that depend on the runtime environment.

I can imagine the transformer returning a `DynamicStylesheet` instead of plain values, that gets resolved to actual values on render. A great example of this is dark mode. The web supports dark mode through the [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media query.

```css
.text {
  color: black;
  background: white;
}

@media (prefers-color-scheme: dark) {
  .text {
    color: white;
    background: black;
  }
}
```

This could be transformed to a dynamic style object that looked like this:

```javascript
const style = new DynamicStyleSheet({
  text: {
    color: new DynamicColorSchemeValue({ light: "black", dark: "white" }),
    background: new DynamicColorSchemeValue({ light: "white", dark: "black" }),
  },
});

const resolvedStyle = useDynamicStyleSheet(dynamicStyles);
```

This is basically what the [react-native-dark-mode](https://github.com/codemotionapps/react-native-dark-mode) API looks like already, but that same concept could be extrapolated to many other dynamic values, like [calc()](https://developer.mozilla.org/en-US/docs/Web/CSS/calc), or [any other media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries).

Other feature that would be really useful is the [@supports](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports) directive for _feature queries_. This would allow us to share the same CSS, but offer different fallbacks for unsupported styles. You can already see several `@supports (position: sticky)` in the Gutenberg code to contain styles specific to IE11.

Having all these things in place would not solve every problem. We still won't be able to support every feature, and sometimes we'll actually want different styles. Maybe a new `@media (react-native)` query could help contain those styles. However, this would set enough of a solid foundation that I believe would allow sharing CSS with web components.
