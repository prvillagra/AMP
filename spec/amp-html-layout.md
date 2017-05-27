<!---
Copyright 2015 The AMP HTML Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS-IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# AMP HTML Layout System

## Overview

The main goal of the layout system is to ensure that AMP elements can express their layout
so that the runtime is able to infer sizing of elements before any remote resources, such as
JavaScript and data calls, have been completed. This is important since this significantly
reduces rendering and scrolling jank.

With this in mind, the AMP Layout System is designed to support few but flexible layouts
that provide good performance guarantees. This system relies on a set of attributes such
as `layout`, `width`, `height`, `sizes` and `heights` to express the element's layout and
sizing needs.

## Behavior

A non-container AMP element (i.e., `layout != container`) starts up in the unresolved/unbuilt mode in which
all of its children are hidden except for a placeholder (see `placeholder` attribute). The JavaScript
and data payload necessary to fully construct the element may still be downloading and initializing,
but the AMP runtime already knows how to size and lay out the element only relying on CSS classes and
`layout`, `width`, `height` and `media` attributes. In most cases, a `placeholder`, if specified, is
sized and positioned to take all of the element's space.

The `placeholder` is hidden as soon as the element is built and its first layout complete. At this
point, the element is expected to have all of its children properly built and positioned and ready
to be displayed and to accept a reader's input. This is the default behavior. Each element can override
to, e.g., hide `placeholder` faster or keep it around longer.

The element is sized and displayed based on the `layout`, `width`, `height` and `media` attributes
by the runtime. All of the layout rules are implemented via CSS internally. The element is said to
"define size" if its size is inferable via CSS styles and does not change based on its children:
available immediately or inserted dynamically. This does not mean that this element's size cannot
change. The layout could be fully responsive as is the case with `responsive`, `fixed-height`, `fill` and
`flex-item` layouts. It simply means that the size does not change without an explicit user action, e.g.
during rendering or scrolling or post download.

If the element has been configured incorrectly, in PROD it will not be rendered at all and in DEV mode the runtime will render the element in the error state. Possible errors include invalid or unsupported
values of `layout`, `width` and `height` attributes.





## Layout Attributes

### `width` and `height`

Depending on the value of the `layout` attribute, AMP component elements must have a `width` and `height` attribute that contains an integer pixel value. Actual layout behavior is determined by the `layout` attribute as described below.

In a few cases, if `width` or `height` are not specified, the AMP runtime can default these values as follows:
- `amp-pixel`: Both `width` and `height` are defaulted to 0.
- `amp-audio`: The default `width` and `height` are inferred from browser.

### `layout`

AMP provides a set of layouts that specify how an AMP component behaves in the document layout. You can specify a layout for a component by adding the `layout` attribute with one of the values specified in the table below.

**Example**: A simple responsive image, where width and height are used to determine the aspect ratio.

```html
<amp-img src="/img/amp.jpg"
    width="1080"
    height="610"
    layout="responsive"
    alt="an image"></amp-img>
```

Supported values for the `layout` attribute:

| Value          | Behavior  and  Requirements                              |
| -------------- | -------------------------------------------------------- |
| Not present    | If no value is specified, the layout for the component is inferred as follows: <ul><li> If <code>height</code> is present and <code>width</code> is absent or is set to <code>auto</code>, a <code>fixed-height</code> layout is assumed.</li><li>If <code>width</code> and <code>height</code> are present along with a <code>sizes</code> or <code>heights</code> attribute, a <code>responsive</code> layout is assumed.</li><li>If <code>width</code> and <code>height</code> are present, a  <code>fixed</code> layout is assumed.</li><li> if <code>width</code> and <code>height</code> are absent, a <code>container</code> layout is assumed.</li></ul> |
| `container` | The element lets its children define its size, much like a normal HTML `div`. The component is assumed to not have specific layout itself but only act as a container; its children are rendered immediately.
| `fill` | The element takes the space available to it&mdash;both width and height. In other words, the layout and size of a `fill` element matches its parent. |
| `fixed` | The element has a fixed width and height with no responsiveness supported. The `width` and `height` attributes must be present. The only exceptions are the `amp-pixel` and `amp-audio` components. |
| `fixed-height` |  The element takes the space available to it but keeps the height unchanged. This layout works well for elements such as `amp-carousel` that involves content positioned horizontally. The `height` attribute must be present. The `width` attribute must not be present or must be equal to `auto`. |
| `flex-item` | The element and other elements in its parent with layout type `flex-item` take the parent container's remaining space when the parent is a flexible container (i.e., `display: flex`). The `width` and `height` attributes are not required. |
| `nodisplay` | The element isn't displayed, and takes up zero space on the screen as if its display style was `none`. This layout can be applied to every AMP element.  It’s assumed that the element can display itself on user action (e.g., `amp-lightbox`). The `width` and `height` attributes are not required. |
| `responsive` | The element takes the space available to it and resizes its height automatically to the aspect ratio given by the `width` and `height` attributes. This layout works very well for most AMP elements, including `amp-img`, `amp-video`, etc.  The available space depends on the parent element and can also be customized using `max-width` CSS. The `width` and `height` attributes must be present. |

To find out which layouts are supported for a particular component, refer to the [reference documentation](https://www.ampproject.org/docs/reference/components) for that component. If a component does not support the specified value, AMP triggers a runtime error.

### `sizes`

All AMP elements that support the `responsive` layout, also support the  `sizes` attribute. The value of this attribute is a sizes expression
as described in the [img sizes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img), but extended to all elements, not just images. In short, the `sizes` attribute describes how the width of the element is calculated depending on the media conditions.

When the `sizes` attribute is specified along with `width` and `height`, the `layout` is defaulted to `responsive`.

**Example**: Using the `sizes` attribute

In the following example, if the viewport is wider than `320px`, the image will be 320px wide, otherwise, it will be 100vw wide (100% of the viewport width).

```html
<amp-img src="https://acme.org/image1.png"
    width="400" height="300"
    layout="responsive"
    sizes="(min-width: 320px) 320px, 100vw">
</amp-img>
```

### `heights`

All AMP elements that support the `responsive` layout, also support the `heights` attribute.
The value of this attribute is a sizes expression based on media expressions
as similar to the [img sizes attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img), but with two key differences:

 1. It applies to the height, not the width of the element.
 2. Percent values are allowed, e.g. `86%`. If a percent value is used, it indicates the percentage of the element's width.

When the `heights` attribute is specified along with `width` and `height`, the `layout` is defaulted to `responsive`.

**Example**: Using the `heights` attribute

In the following example, the height of the image will default to 80% of the width, but if the viewport is wider than `500px`, the height is capped at `200px`. Because the `heights` attribute is specified along with `width` and `height`, the layout defaults to `responsive`.


```html
<amp-img src="https://acme.org/image1.png"
    width="320" height="256"
    heights="(min-width:500px) 200px, 80%">
</amp-img>
```

### `media`

All AMP elements support the `media` attribute. The value of `media` is a media query. If the query does not match, the element is not rendered at all and its resources and potentially its child resources will not be fetched. If the browser window changes size or orientation, the media queries are re-evaluated and elements are hidden and shown based on the new results.

**Example**: Using the `media` attribute

In the following example, we have 2 images with mutually exclusive media queries. Depending on the screen width, one of the two images will be fetched and rendered. The `media` attribute is available on all AMP elements, so it can be used with non-image elements, such as ads.

```html
<amp-img
    media="(min-width: 650px)"
    src="wide.jpg"
    width=466
    height=355 layout="responsive" ></amp-img>
<amp-img
    media="(max-width: 649px)"
    src="narrow.jpg"
    width=527
    height=193 layout="responsive" ></amp-img>
```

### `placeholder`

The `placeholder` attribute can be set on any HTML element, not just AMP elements. The `placeholder` attribute indicates that the element marked with this attribute acts as a placeholder for the parent AMP element. If specified, a placeholder element must be a direct child of the AMP element. By default, the placeholder is immediately shown for the AMP element, even if the AMP element's resources have not been downloaded or initialized. Once ready, the AMP element typically hides its placeholder and shows the content. The exact behavior with respect to the placeholder is up to the element's implementation.

```html
<amp-anim src="animated.gif" width=466 height=355 layout="responsive" >
  <amp-img placeholder src="preview.png" layout="fill"></amp-img>
</amp-anim>
```

### `fallback`

The `fallback` attribute can be set on any HTML element, not just AMP elements. A fallback is a convention that allows the element to communicate to the reader that the browser does not support the element. If specified, a fallback element must be a direct child of the AMP element. The exact behavior with respect to the  fallback is up to the element's implementation.

```html
<amp-anim src="animated.gif" width=466 height=355 layout="responsive" >
  <div fallback>Cannot play animated images on this device.</div>
</amp-anim>
```

### `noloading`

The `noloading` attribute indicates whether the "loading indicator" should be turned off for this element. Many AMP elements are white-listed to show a "loading indicator", which is a basic animation that shows that the element has not yet fully loaded. The elements can opt out of this behavior by adding
this attribute.

## (tl;dr) Summary of Layout Requirements & Behaviors

The following table describes the acceptable parameters, CSS classes, and styles used for the `layout` attribute. Note that:

1. Any CSS class marked prefixed with `-amp-` and elements prefixed with `i-amp-` are considered to be internal to AMP and their use in user stylesheets is not allowed. They are shown here simply for informational purposes.
2. Even though `width` and `height` are specified in the table as required, the default rules may apply as is the case with `amp-pixel` and `amp-audio`.

| Layout       | Width/Height Required? | Defines Size? | Additional Elements | CSS "display" |
|--------------|------------------------|---------------|---------------------|---------------|
| `container`    | No                     | No            | No | `block` |
| `fill`         | No                     | Yes, parent's size. | No | `block` |
| `fixed`        | Yes                    | Yes, specified by `width` and `height`. | No | `inline-block` |
| `fixed-height` | `height` only; `width` can be `auto` | Yes, specified by the parent container and `height`. | No | `block` |
| `flex-item`   | No                     | No            | Yes, based on parent container. | `block` |
| `nodisplay`    | No                     | No | No | `none` |
| `responsive`   | Yes                    | Yes, based on parent container and aspect ratio of `width:height`. | Yes, `i-amphtml-sizer`. | `block` |