[⬅️ Back to Frontend Engineering](../README.md)

# Accessibility Basics

Accessibility (often abbreviated as **a11y**) is the engineering practice of designing software interfaces that can be navigated, understood, and operated by all users, including those with visual, auditory, motor, or cognitive challenges.

---

## Why It Matters

Ensuring high accessibility is both a legal mandate (such as ADA Title III or the European Accessibility Act) and a standard engineering priority. Highly accessible sites naturally feature clean DOM outlines, robust keyboard navigation schemes, and highly structured page flows, which indirectly boosts search engine crawlers and improves usability for all users.

---

## Core Concepts

### 1. The Accessibility Tree

In parallel to DOM and CSSOM construction, browser engines compile the **Accessibility Tree**. This tree contains semantic information (roles, names, states) parsed by assistive technologies like screen readers. Native HTML elements automatically register roles and states in this tree, which is why semantic markup is the baseline of accessibility.

### 2. WCAG Principles (P.O.U.R.)

The Web Content Accessibility Guidelines are built around four core principles:

- **Perceivable**: Users must be able to comprehend page information (e.g., text alternatives for images, sufficient color contrast).
- **Operable**: Interface elements must be navigable and triggerable (e.g., full keyboard accessibility, logical focus flows, no fast flashing displays).
- **Understandable**: Page actions must be predictable and text contents readable (e.g., clear form validation errors).
- **Robust**: Code must remain compatible with diverse assistive software runtimes.

### 3. ARIA (Accessible Rich Internet Applications)

ARIA attributes extend HTML to describe complex dynamic components (like accordion toggles or custom comboboxes) that lack native HTML equivalents:

- **Roles**: Defines _what_ an element is (e.g., `<div role="dialog">`).
- **States**: Declares _dynamic conditions_ of an element (e.g., `aria-expanded="true"`, `aria-busy="false"`).
- **Properties**: Configures static characteristics (e.g., `aria-labelledby="heading-id"`, `aria-describedby="error-id"`).

> [!IMPORTANT]
> **The First Rule of ARIA**: If you can use a native HTML element instead of an ARIA attribute, do so. Native elements possess built-in keyboard controls and state bindings.

### 4. Focus Management & Tab Index

Focus represents which interface element currently accepts keyboard input.

- `tabindex="0"`: Inserts an element into the default keyboard tab sequence (useful for custom components like toggle sliders).
- `tabindex="-1"`: Removes an element from the keyboard flow but allows programmatic focus via JavaScript (`element.focus()`).
- **Avoid `tabindex > 0`**: Positive tab indices disrupt the natural document source order tab flow and quickly become unmaintainable.

---

## Real-World Production Learnings

In an enterprise dashboard release, we built a custom popup modal dialog. During QA testing, we realized that when the modal opened, keyboard focus remained on the background elements, allowing users to tab "through" the modal into hidden elements beneath the overlay. We resolved this by writing a **Focus Trap** utility that intercepts the `Tab` keydown event and wraps focus to the top/bottom boundary items of the modal. We also configured `role="dialog"`, `aria-modal="true"`, and set focus to the first active element upon modal activation.

---

## Best Practices

- **Color Contrast**: Ensure text contrast meets WCAG AA standards (minimum 4.5:1 ratio for normal text, 3.0:1 for large text).
- **Form Inputs**: Always associate `<label>` elements with their inputs using matching `for` and `id` attributes. Screen readers cannot infer unlabeled inputs.
- **Focus States**: Never disable default outline styling (`outline: none`) without replacing it with custom, highly visible focus ring styles.

---

## Related Reading

- [Semantic HTML](./semantic-html.md)
- [HTML Foundations](./basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.html.accessibility-basics.md)
