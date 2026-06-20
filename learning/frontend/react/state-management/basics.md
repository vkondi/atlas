[⬅️ Back to Frontend Engineering](../../README.md)

# React State Management Architecture

State Management Architecture is the set of guidelines and structures engineers use to place, mutate, and distribute data across a React application. Designing a clean state topology is key to keeping components modular, predictable, and performant.

---

## Why It Matters

Locating state incorrectly is a primary driver of performance bottlenecks and spaghetti code in React. Storing state too high in the tree triggers unnecessary re-renders of unrelated components. Conversely, storing it too low forces "prop drilling"—manually passing data through multiple intermediate components that have no interest in the values—making refactoring difficult.

---

## The State Hierarchy Spectrum

State should be classified and located depending on its operational scope:

```
  LOCAL STATE  =========>  LIFTED STATE  =========>  GLOBAL STATE
  (useState)               (Prop Drilling)           (Context/Zustand)
  - Scope: Component       - Scope: Subtree          - Scope: Application
  - Lifecycle: Short       - Lifecycle: Moderate     - Lifecycle: Persistent
```

### 1. Local State

State that is only used by a single component and its immediate children. Managed using `useState` or `useReducer`.

- **Cleanest Scope**: Local state is self-contained. When the component unmounts, its state is cleaned up automatically, releasing memory.

### 2. Lifted (Shared) State

State shared between sibling components.

- **Lifting State Up**: When two components need to reflect the same changing data, locate the state in their nearest common parent ancestor and pass it down as props.

### 3. Global State

State accessed by distant, unrelated components across the application (e.g., user authentication data, theme selections, multi-step checkout caches).

- **Decoupled from DOM Tree**: Global state is stored outside the standard parent-child rendering cascade.

---

## The Rule of State Colocation

**Colocation** is the design pattern of keeping state as close to where it is used as possible.

Before moving state to a global context or parent container, ask:

1. _Which components actually read this data?_
2. _Which components write/mutate this data?_

If only one component subtree needs the state, keep it local to that subtree. Do not place layout state (like `isDropdownOpen` or `formValidation`) in global stores.

---

## Real-World Production Learnings

In a complex search interface, typing inside a search text field felt laggy. Performance profiling showed that on every single character keystroke, the entire page layout tree—including navigation sidebars, unrelated cards, and footers—re-rendered. The search text state had been placed in a global Redux store. We refactored the text state, moving it to a local `useState` hook inside the search input component, and only dispatched the query to Redux after debouncing the input for 300ms. This reduced re-render triggers from 15 per keystroke sequence to exactly 1, completely resolving the input lag.

---

## Related Reading

- [React Fundamentals](../basics.md)
- [React Context API](./context-api.md)
- [External State Libraries](./external-state-managers.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/state-management.basics.md)
