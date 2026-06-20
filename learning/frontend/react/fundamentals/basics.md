[⬅️ Back to Frontend Engineering](../../README.md)

# Core Rendering Mechanics

React's internal execution model governs how UI components translate into actual browser DOM structures. Understanding these rendering stages—separating JavaScript calculation from browser layouts—is crucial for predicting component behavior and optimizing performance.

---

## Why It Matters

A common misconception is that rendering directly mutates the browser DOM. In reality, React's render cycle is a two-step process: a pure JavaScript calculation phase followed by a selective DOM mutation phase. Confusing the two leads to styling layout shifts, infinite render cascades, and uncoordinated visual updates.

---

## The Rendering Lifecycle: Trigger, Render, Commit

React processes updates in three distinct sequential phases:

```
  1. TRIGGER  ==>  2. RENDER  ==>  3. COMMIT
  (State Change)   (JSX Diffing)   (DOM Mutation)
```

### Phase 1: Triggering a Render

A component render cycle is initiated by exactly two triggers:

1. **Initial Render**: The application mounts and bootstrap-renders its root node.
2. **State Updates**: An existing component's local state changes (via the state setter function) or parent props change, triggering a re-render request.

### Phase 2: The Render Phase (Pure Computation)

React calls your component function to determine the target UI.

- **Functional Invocation**: React executes the component function, capturing the returned JSX structure, which represents the Virtual DOM node structure.
- **Diffing**: For updates, React compares the new JSX structure with the previous virtual structure, identifying all node and attribute changes.
- **Purity Requirement**: This phase must be **completely pure**. The engine can pause, discard, or run rendering computations multiple times before committing. Writing side-effects (like modifying the DOM or triggering network calls) inside the component body will cause silent bugs.

### Phase 3: The Commit Phase (DOM Mutation)

React applies the calculated changes to the physical browser layout.

- **Selective Updates**: For updates, React only mutates the exact DOM nodes that changed (discovered during the Render phase). If rendering a component yields an identical Virtual DOM layout, React bypasses the Commit phase entirely.
- **Layout and Paint**: Once React finishes mutating the DOM, the browser executes its rendering pipeline (calculates layout geometries, paints pixels, and composites layers to the screen).

---

## State Update Batching

To prevent performance degradation from rendering cascades, React implements **Batching**. When multiple state updates occur within a single event handler, React groups them into a single render pass:

```javascript
function handleClick() {
  setCount((c) => c + 1);
  setFlag((f) => !f);
  // React batches these updates: the component renders EXACTLY ONCE
}
```

- **React 18 Automatic Batching**: Starting in React 18, batching is applied automatically across all context boundaries, including inside asynchronous callbacks (`fetch`), `setTimeout` handlers, and native browser event listeners.

---

## Infinite Render Loops

An infinite render loop occurs when a state update is triggered directly during the Render phase:

```javascript
function AntiPatternComponent() {
  const [data, setData] = useState([]);

  // Anti-Pattern: Triggers a state update during the Render Phase
  setData(['new data']);

  return <div>Data loaded</div>;
}
```

- **Why it fails**:
  1. React executes `AntiPatternComponent` (Render Phase).
  2. The function calls `setData()`, requesting a new render.
  3. React immediately schedules and executes a new render cycle.
  4. The function executes again, calling `setData()`, scheduling another render.
  5. The cycle repeats indefinitely, throwing: _Too many re-renders. React limits the number of renders to prevent an infinite loop._

---

## Related Reading

- [React Fundamentals](../basics.md)
- [Virtual DOM & Reconciliation](./virtual-dom-reconciliation.md)
- [Browser Rendering Pipeline](../../browser-internals/rendering-pipeline.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/fundamentals.basics.md)
