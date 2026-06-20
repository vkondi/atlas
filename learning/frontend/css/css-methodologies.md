[⬅️ Back to Frontend Engineering](../README.md)

# CSS Methodologies

CSS Methodologies are structural strategies and tooling setups designed to manage styling scopes, organize class files, and scale style design tokens across large applications without encountering global scope collisions.

---

## Why It Matters

By default, vanilla CSS rules are globally scoped. A stylesheet loaded on one route can silently bleed and break layouts on other pages. Without a structured methodology, codebases devolve into specificity wars, where developers rely on nested rules and `!important` to force overrides, resulting in bloated, unmaintainable stylesheets.

---

## Core Styling Methodologies

Modern front-end architectures utilize tooling to isolate style namespaces:

### 1. CSS Modules

CSS Modules scope styles locally by automatically compiling class names into unique hashes during the build process:

- **How it works**: You write standard CSS rules inside a `.module.css` file. When imported into a JavaScript component, the compiler hashes the selector names:

```css
/* button.module.css */
.btn {
  background-color: blue;
}
```

- **Compiled output (emitted JS & CSS)**:

```javascript
// Imported as: import styles from './button.module.css';
// The compiler maps the keys to the hashed string:
styles.btn === 'button_btn__abc123';
```

- **Benefits**: Guarantees zero global namespace leaks. You can use simple class names like `.title` or `.wrapper` in every component without collision hazards.

### 2. Utility-First CSS (Tailwind CSS)

Tailwind CSS provides a collection of low-level, atomic utility classes that you apply directly to your HTML markup:

```html
<div class="flex p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
  <h2 class="text-xl font-semibold text-gray-800">Heading</h2>
</div>
```

- **Compilation & Purging**: Tailwind scans your source code files during compilation, identifies only the classes you actually used, and outputs a single minimized utility stylesheet.
- **Benefits**: Eliminates the need to write custom CSS classes, enforces design tokens (colors, spacings, borders), and limits styling footprint growth as your application scales.

---

## Tradeoffs: CSS Modules vs. Tailwind CSS

| Parameter                  | CSS Modules                                      | Tailwind CSS                                                   |
| :------------------------- | :----------------------------------------------- | :------------------------------------------------------------- |
| **Separation of Concerns** | High (Styles are decoupled from HTML markup).    | Low (Styling classes are tightly coupled with HTML markup).    |
| **Code Footprint**         | Grows linearly with the number of custom styles. | Remains stable because CSS classes are shared globally.        |
| **Custom Styling Control** | Unbounded (Full vanilla CSS capabilities).       | Restricted to Tailwind configuration values.                   |
| **Best Use Case**          | Bespoke UI components with complex design rules. | Fast prototyping, dashboards, and standardized design systems. |

---

## Real-World Production Learnings

During a payment portal checkout deployment, the application header collapsed. The error was traced to a global stylesheet added by a team working on a new reviews module. Both features used the generic class name `.header-nav`. Because the styles were bundled globally in the production chunk, the reviews module styles took precedence due to load order, breaking the checkout page. We resolved this by refactoring the styling rules to use **CSS Modules**, which dynamically hashed the class names and completely isolated the feature styles.

---

## Related Reading

- [CSS Fundamentals](./basics.md)
- [CSS Layouts](./css-layouts.md)
- [Biome Linter & Formatter Setup](../../tooling-and-workflows/linters-and-formatters/biome-setup.md)
  - [Ref: Biome Replace ESLint Prettier With One Tool](../../../blogs/Biome_Replace_ESLint__Prettier_With_One_Tool.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.css.css-methodologies.md)
