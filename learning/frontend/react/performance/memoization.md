[⬅️ Back to Frontend Engineering](../../README.md)

# React Memoization

Memoization in React acts as a performance guardrail to bypass redundant render phases. It involves caching component instances, computation outputs, and callback references in memory to stabilize dependency references across rendering ticks.

---

## Why It Matters

React compares props using **shallow comparison** (`Object.is`). If a component receives a prop whose memory reference changes on every render (such as an inline object, array, or function), the component will execute a full render cycle even if its physical content is identical. Properly using memoization avoids this overhead, but improper usage adds dependency-tracking costs without any performance gain.

---

## Core Memoization Tools

### 1. `React.memo` (Component Caching)

`React.memo` is a higher-order component that wraps a functional component. It performs a shallow comparison of the component's previous and new props. If they are equal, React completely skips the render phase and reuses the last rendered output.

```javascript
import React from 'react';

const DataRow = React.memo(function DataRow({ label, value }) {
  // Only renders if label or value changes
  return (
    <tr>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  );
});
```

- **Custom Comparison**: You can pass a custom comparator function as a second argument if shallow comparison is insufficient:

```javascript
const DataRow = React.memo(MyComponent, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id; // Return true to SKIP render
});
```

---

### 2. `useMemo` (Value Caching)

`useMemo` caches the calculated result of an expensive function between renders. It executes the calculation _only_ when one of the specified dependencies change.

```javascript
const sortedItems = useMemo(() => {
  return items.sort((a, b) => b.score - a.score);
}, [items]); // Re-runs sorting only if the items reference changes
```

> [!TIP]
> Avoid wrapping basic variables or quick assignments in `useMemo`. The overhead of memory allocation and dependency diffing for simple tasks (like `useMemo(() => a + b, [a, b])`) is higher than the execution cost itself.

---

### 3. `useCallback` (Function Reference Caching)

`useCallback` caches the callback function definition itself between renders. It returns the exact same function reference unless its dependencies change.

```javascript
const handleSelect = useCallback((id) => {
  setSelectedId(id);
}, []); // Reference is stable forever
```

---

## The Reference Chain Pitfall

A common trap in React performance tuning is breaking the reference chain. **`React.memo` will not work if parent components pass unmemoized references as props.**

#### Broken Pattern (Broken Memoization Chain)

```jsx
const ChildComponent = React.memo(({ onClick, config }) => {
  return <button onClick={onClick}>{config.title}</button>;
});

function ParentComponent() {
  const [count, setCount] = useState(0);

  // BUG: Inline object & function recreate new references on every render!
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <ChildComponent
        onClick={() => console.log('Clicked')}
        config={{ title: 'Submit' }}
      />
    </div>
  );
}
```

#### Corrected Pattern (Intact Memoization Chain)

```jsx
function ParentComponent() {
  const [count, setCount] = useState(0);

  // Solution: Stabilize props using useCallback and useMemo
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  const config = useMemo(() => ({ title: 'Submit' }), []);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <ChildComponent onClick={handleClick} config={config} />
    </div>
  );
}
```

---

## Real-World Production Learnings

In an interactive charting system displaying live log streams, the application suffered from constant frame drops during stream surges. The profile timeline showed that a custom `TimelineMarker` child component (which was wrapped in `React.memo`) was re-rendering 40 times per second even when its active position did not shift.

We traced the issue to a parent layout setting:
`<TimelineMarker position={pos} formatOptions={{ locale: 'en-US' }} />`

The inline object literal `{ locale: 'en-US' }` was instantiated as a fresh memory address on every frame render, causing `React.memo`'s shallow comparison to fail every single time.

We refactored this by extracting the configuration object to a static module-level constant outside the component:

```javascript
const FORMAT_OPTIONS = { locale: 'en-US' }; // Immutable reference

function Parent() {
  // ...
  return <TimelineMarker position={pos} formatOptions={FORMAT_OPTIONS} />;
}
```

This single reference fix prevented all redundant renders, dropping the average render cycle time for the timeline from 16.4ms to 0.2ms, restoring a smooth 60 FPS user experience.

---

## Related Reading

- [React Performance Fundamentals](./basics.md)
- [Component Optimization](./react-optimization.md)
- [Standard React Hooks](../hooks/standard-hooks.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/performance.memoization.md)
