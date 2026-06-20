[⬅️ Back to Frontend Engineering](../README.md)

# CSS Fundamentals

Cascading Style Sheets (CSS) govern the presentation layer of DOM elements. To write maintainable and high-performance layouts, front-end engineers must look beyond simple aesthetics and master the mechanics of the browser rendering pipeline, specificity calculation algorithms, and box model rules.

---

## Why It Matters

When the browser parses HTML, it simultaneously builds the CSSOM (CSS Object Model). The rendering engine combines the DOM and CSSOM to create the **Render Tree**. Unlike HTML parsing, which is progressive, styling calculation is a blocking operation—the browser cannot paint any pixels to the viewport until the entire CSSOM is compiled. Optimizing selector specificity and box layout styles directly reduces FCP (First Contentful Paint) and prevents costly layout recalculation cascades.

---

## Core Concepts

### 1. The Specificity Algorithm

When conflicting style declarations target the same element, the browser engine determines priority by calculating a specificity weight score vector `(A, B, C, D)`:

- **A (Inline Styles)**: Declared directly in the HTML element style attribute (e.g., `style="color: red"`). Weight = `1, 0, 0, 0`.
- **B (IDs)**: ID selectors (e.g., `#header-nav`). Weight = `0, 1, 0, 0`.
- **C (Classes, Pseudo-classes, Attributes)**: Class selectors (`.btn`), pseudo-classes (`:hover`), and attribute matches (`[type="text"]`). Weight = `0, 0, 1, 0`.
- **D (Elements & Pseudo-elements)**: Tag elements (`div`, `p`) and pseudo-elements (`::before`). Weight = `0, 0, 0, 1`.

_The Universal Selector (`_`) and combinators (`+`, `>`, `~`) carry a weight of `0, 0, 0, 0`.\*

> [!CAUTION]
> The `!important` flag is not a specificity level. It acts as an override directive that interrupts the standard cascade sequence. Overusing `!important` makes stylesheets extremely brittle and is generally a sign of weak CSS architecture.

### 2. The CSS Box Model

Every element in a document is rendered as a rectangular container. The Box Model dictates how the dimensions of these containers are computed:

```
  +---------------------------------------+
  |               Margin                  |
  |   +-------------------------------+   |
  |   |           Border              |   |
  |   |   +-----------------------+   |   |
  |   |   |       Padding         |   |   |
  |   |   |   +---------------+   |   |   |
  |   |   |   |    Content    |   |   |   |
  |   |   |   +---------------+   |   |   |
  |   |   +-----------------------+   |   |
  |   +-------------------------------+   |
  +---------------------------------------+
```

There are two primary calculation modes controlled by the `box-sizing` property:

- **`content-box` (Default)**: Sizing properties (width/height) only apply to the **Content** area. If you add padding or borders, they extend _outside_ this width, expanding the actual box dimensions:
  $$\text{Actual Width} = \text{width} + \text{padding} + \text{border}$$
- **`border-box` (Recommended)**: Sizing properties apply to the outer boundary of the **Border**. Adding padding or borders shrinks the Content area, keeping the actual box dimensions constant:
  $$\text{Actual Width} = \text{width}$$

### 3. Vertical Margin Collapsing

When block elements sit on top of each other, their vertical margins do not add up. Instead, they collapse into a single margin equal to the largest of the two vertical values.

- _Margin collapsing does not occur on horizontal margins, floating elements, flex items, grid items, or elements with absolute positioning._

---

## Real-World Production Learnings

In an enterprise banking dashboard layout, our grid system was breaking on smaller screens. We had defined four columns with `width: 25%`. However, when we added a `1px` border to highlight column states, the fourth column wrapped onto the next line. This layout break was caused by the default browser setting `box-sizing: content-box` (which made the actual column width $25\% + 2\text{px}$). Applying a global box-sizing override solved the wrapping bug:

```css
*,
::before,
::after {
  box-sizing: border-box;
}
```

---

## Related Reading

- [HTML Foundations](../html/basics.md)
- [CSS Layouts](./css-layouts.md)
- [Browser Rendering Pipeline](../browser-internals/rendering-pipeline.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.css.basics.md)
