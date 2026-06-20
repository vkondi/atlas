[⬅️ Back to Frontend Engineering](../README.md)

# Semantic HTML

Semantic HTML is the practice of using HTML tags that accurately describe the meaning, hierarchy, and purpose of the content they contain. Using semantic markup ensures that document structures are self-describing, readable, and machine-interpretable.

---

## Why It Matters

Using semantic tags is not an aesthetic preference; it is a foundational requirement for two primary systems:

1. **Assistive Technologies (Screen Readers)**: Screen readers use semantic elements as layout landmarks, allowing visually impaired users to jump directly to primary navigation, headers, or articles.
2. **Search Engine Optimization (SEO)**: Search crawlers rely on the document hierarchy to parse the core subjects of a page. Proper tags (like `<h1>` and `<article>`) directly influence how search engines catalog and rank contents.

---

## Core Concepts

### 1. Document Landmarks

Landmark elements define major structural boundaries of a layout, replacing generic wrapping blocks:

- `<header>`: Introduces a site banner, logo, or page title.
- `<nav>`: Identifies navigation sections containing links.
- `<main>`: Wraps the unique, primary content of the document (should only appear once per page).
- `<article>`: Represents self-contained content blocks that could be syndicated independently (e.g., blog posts, cards, news articles).
- `<section>`: Groups related content, typically under a specific heading.
- `<aside>`: Outlines content tangentially related to the main content (e.g., sidebars, callouts).
- `<footer>`: Contains metadata, copyright statements, or related links.

### 2. Document Outlining & Headings

Headings (`<h1>` through `<h6>`) establish the hierarchical structure of a page.

- **The One-H1 Rule**: Maintain exactly one `<h1>` per page representing the main subject.
- **Strict Nesting**: Never skip levels (e.g., moving directly from `<h2>` to `<h4>` breaks accessibility tab structures).

### 3. Interactive Semantics: `<button>` vs. `<a>`

Choosing correct interactive tags is one of the most critical structural decisions in frontend layouts:

| Element        | Primary Purpose      | Default Behaviors                                                                                                   |
| :------------- | :------------------- | :------------------------------------------------------------------------------------------------------------------ |
| `<a>` (Anchor) | Navigation           | Redirects to a new URL or scroll point; focusable; triggerable via `Enter` key.                                     |
| `<button>`     | Operations / Actions | Triggers JavaScript client functions, modal toggles, or forms; focusable; triggerable via `Enter` and `Space` keys. |

---

## The Danger of Div-based Interactions

A common anti-pattern is replacing buttons with `<div>` or `<span>` tags styled to look clickable. Doing this strips away built-in browser interactions:

```html
<!-- Accessibility Anti-Pattern (Requires manual handlers) -->
<div class="btn" onclick="submitData()">Submit</div>

<!-- Native Semantic Standard (Works out-of-the-box) -->
<button type="button" onclick="submitData()">Submit</button>
```

To make a `<div>` match the accessibility of a native `<button>`, you must manually inject `tabindex="0"`, configure ARIA roles (`role="button"`), and program manual handlers to catch `Space` and `Enter` keydown events.

---

## Real-World Production Learnings

During an accessibility audit of a financial transfer app, we discovered that row items in a transaction list used custom styled `<div>` blocks with `onclick` event listeners. Users navigating solely with keyboards or screen readers were completely locked out because the browser did not expose these elements in its focus hierarchy. Changing the row wrappers to `<button>` elements automatically restored keyboard focus and allowed screen readers to announce the transaction items properly.

---

## Related Reading

- [HTML Foundations](./basics.md)
- [Accessibility Basics](./accessibility-basics.md)
- [SEO Fundamentals](./seo-fundamentals.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.html.semantic-html.md)
