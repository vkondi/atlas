[⬅️ Back to Frontend Engineering](../README.md)

# Modern CSS Features

Modern CSS has introduced powerful layout and logic capabilities directly to the browser rendering engine. Native properties like container queries, custom variables, nesting, and advanced selectors eliminate the need for heavy prepress compile steps (like SASS/Less) and layout JavaScript scripts.

---

## Why It Matters

Moving layout and selector logic from JavaScript libraries to native browser styling engines reduces JavaScript bundle sizes, decreases main-thread execution load, and avoids layout shifts. Browsers recalculate styles natively much faster than JavaScript can evaluate DOM mutations.

---

## Core Concepts

### 1. CSS Custom Properties (CSS Variables)

Unlike preprocessor variables (e.g., SASS `$variable`), native CSS custom variables exist in the DOM at runtime and are fully dynamic:

- **Syntax**: Declared with a double hyphen prefix (`--theme-color`) and accessed using the `var()` function.
- **Inheritance & Scope**: Custom properties follow the cascade. You can redefine a variable locally within a specific class context, overriding the global value for that element and its descendants.
- **Dynamic Modifiability**: You can alter variables dynamically using JavaScript (`element.style.setProperty('--color', 'blue')`) or media queries.

```css
:root {
  --primary-color: #007bff;
}

/* Override primary color in dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --primary-color: #0056b3;
  }
}
```

### 2. Container Queries (`@container`)

Container queries allow elements to adapt layout styles based on the dimensions of their parent wrapping container rather than the overall browser viewport window:

- **Container Declaration**: To query a parent element, you must first define it as a container context:

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card-container;
}
```

- **Querying**: Style child components based on this container size boundary:

```css
@container card-container (min-width: 400px) {
  .card-item {
    display: flex; /* Switch to horizontal layout when space allows */
  }
}
```

### 3. The Parent Selector Pseudo-Class (`:has()`)

The `:has()` selector matches elements depending on whether they contain descendants matching specific selectors. Historically, this was impossible in CSS and required JavaScript selector lookups:

```css
/* Style a card element differently if it contains an image */
.card:has(img) {
  padding: 0;
  background-color: #f8f9fa;
}

/* Style form labels when their corresponding input is invalid */
.form-group:has(input:invalid) label {
  color: #dc3545;
}
```

### 4. Native CSS Nesting

Native nesting allows grouping style selectors inside parent blocks without preprocessors, streamlining stylesheet formatting:

```css
.button {
  background-color: blue;
  color: white;

  &:hover {
    background-color: darkblue;
  }

  &.primary {
    padding: 1rem;
  }
}
```

---

## Real-World Production Learnings

We built a modular promotional widget card that had to be reused in two distinct page areas: a narrow sidebar column ($280\text{px}$ wide) and a wide main content body ($800\text{px}$ wide). Previously, this required creating separate modifier classes like `.promo-card--sidebar` and `.promo-card--hero` in the codebase. By refactoring the component using Container Queries, the widget automatically adapts its layout—rendering vertically in the narrow sidebar and switching to a horizontal card in the main section—solely based on its parent container container type, eliminating all manual JS resize checks.

---

## Related Reading

- [CSS Layouts](./css-layouts.md)
- [Responsive Web Design](./responsive-design.md)
- [Browser Rendering Pipeline](../browser-internals/rendering-pipeline.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.css.modern-css-features.md)
