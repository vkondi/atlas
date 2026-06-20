[⬅️ Back to Frontend Engineering](../README.md)

# React Fundamentals

React is a component-driven User Interface library built around declarative state mapping and functional composition. Instead of writing custom procedures to modify browser DOM structures manually, engineers define interfaces as direct mathematical mappings of application states:
$$f(\text{state}) = \text{UI}$$

---

## Why It Matters

In legacy imperative architectures (using raw JavaScript query selectors and manual DOM manipulation), keeping the UI synced with async server events, local variables, and user interactions becomes highly error-prone. React abstracts DOM mutations behind a predictable rendering loop, allowing teams to build complex, self-healing UIs.

---

## Core Concepts

### 1. Declarative vs. Imperative Programming

- **Imperative Programming**: Writing step-by-step instructions telling the browser _how_ to mutate layouts (e.g., locate element, add loading class, update text, show border).
- **Declarative Programming**: Describing _what_ the interface should look like under a given state. If `isLoading` is true, render a spinner; if false, render a profile card. React takes care of matching the DOM layout to this state target behind the scenes.

### 2. Unidirectional (One-Way) Data Flow

Data flows strictly downwards in a React application:

- Parents pass configurations or variables down to child components as read-only **Props**.
- Child components cannot modify their props. To notify parents of user events, children invoke **Callback Functions** passed down by parents.
- This strict downward flow makes data tracing and tracking simple to debug compared to bi-directional bindings.

### 3. Props vs. State

Managing data scopes is critical for component design:

- **Props**: Configuration options passed down from a parent element. They are immutable within the receiving component.
- **State**: Dynamic variables managed locally within the component instance. Changing state triggers a re-render cycle, updating the component's UI.

```
  +------------------+
  | Parent Component |
  | Manages: State   |
  +--------+---------+
           |
           | Passes down:
           | Props & Callbacks
           v
  +------------------+
  | Child Component  |
  | Receives: Props  |
  +------------------+
```

### 4. Pure Components & Purity Rules

React components must act as pure functions with respect to their inputs:

- **No Side Effects**: Rendering must not modify external variables, mutate global states, or trigger network calls.
- **Idempotency**: Given identical props and state, a component must return the exact same JSX output every single time.
- _Side effects belong strictly in event handlers (e.g., `onClick`) or lifecycle hooks (like `useEffect`)._

---

## The Reference Equality Trap (State Mutation)

A common mistake is mutating state variables directly:

```javascript
// Anti-Pattern: Mutates the existing state array in place
const [items, setItems] = useState(['a', 'b']);
items.push('c');
setItems(items); // React will NOT trigger a re-render!
```

_Why it fails_: React executes a shallow reference equality check (`Object.is`) on states to detect changes. Because the array reference remained identical (only the values inside changed), React assumed the state was unchanged and bypassed the re-render cycle.
_Solution_: Always treat state as immutable, creating new references when updating:

```javascript
setItems([...items, 'c']); // Correct: Allocates a new array reference
```

---

## Real-World Production Learnings

In an enterprise portfolio grid layout, we had a table component displaying account records. When users edited account rows, the table layout failed to update to reflect the edits. Analysis revealed that the grid was updating the active account object's properties inline (e.g., `account.balance = newBalance`) and triggering a state update with the same parent account array reference. Rewriting the update function to create a new array reference with updated account copies resolved the issue, prompting immediate layout updates.

---

## Related Reading

- [Core Rendering Mechanics](./fundamentals/basics.md)
- [Virtual DOM & Reconciliation](./fundamentals/virtual-dom-reconciliation.md)
- [React Hook: Effects & Data Fetching](./hooks/use-effect-data-fetching.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react.basics.md)
