[⬅️ Back to Frontend Engineering](../../README.md)

# React Context API

The React Context API is a dependency injection system that allows values to be passed down the component tree without having to thread props manually through intermediate components. While Context solves the "prop drilling" problem, using it incorrectly can introduce severe rendering performance issues.

---

## Why It Matters

Context is **not** a state management library; it is a transport mechanism. When a value passed to a `<Context.Provider>` changes, **every component that consumes that context (via `useContext`) is forced to re-render**. React's reconciliation engine bypasses `React.memo` checks for context consumers. If you wrap your entire application state in a single unoptimized Context Provider, every minor update will trigger a global rendering cascade.

---

## Core Concepts & Optimizations

### 1. The Reference Allocation Pitfall

A common mistake is passing an inline object literal directly to the provider:

```javascript
// Anti-Pattern: Allocates a new object reference on every single render pass
<SettingsContext.Provider value={{ theme, isSidebarOpen }}>
  <App />
</SettingsContext.Provider>
```

_Why it fails_: Every time the parent component renders, it instantiates a new object reference for `value`. Even if `theme` and `isSidebarOpen` did not change, the reference inequality forces all consumers of `SettingsContext` to re-render.
_Solution_: Memoize the provider value:

```javascript
const value = useMemo(() => ({ theme, isSidebarOpen }), [theme, isSidebarOpen]);

return (
  <SettingsContext.Provider value={value}>
    <App />
  </SettingsContext.Provider>
);
```

### 2. The Split-Context Pattern (State & Dispatch)

To prevent components that only trigger actions (like buttons) from re-rendering when state values change, split the state and dispatcher callbacks into separate contexts:

```typescript
import { createContext, useContext, useReducer, useMemo } from 'react';

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch | undefined>(undefined);

export function CounterProvider({ children }) {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  // Dispatch never changes references across rendering cycles; no memoization needed
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}
```

_Optimization outcome_:

- Components that read count (`useContext(StateContext)`) will render when count changes.
- Components that only increment/decrement (`useContext(DispatchContext)`) will **never** re-render when count changes.

---

## Best Practices

- **Do Not Use for High-Frequency Updates**: Avoid using Context to manage values that update frequently (e.g., text inputs, mouse movement tracking, real-time web socket tickers). Use local states or external atomic state managers instead.
- **Keep Providers Specialized**: Create focused, small Providers (e.g., `ThemeProvider`, `UserAuthProvider`) rather than one giant global `AppContextProvider`.

---

## Real-World Production Learnings

In a complex data grid displaying transaction records, users reported scroll lag. Profiling showed that scrolling triggered style adjustments, which updated a context-based grid layout state. Because the context provider passed the grid config and column-resize callbacks in a single unmemoized object, every minor scroll offset recalculation forced all 500 visible table cells to re-render. We refactored the provider using the **Split-Context Pattern** and wrapped layout calculations in `useMemo`. This eliminated all redundant cell renders during scrolling, restoring a smooth 60fps experience.

---

## Related Reading

- [React State Management Architecture](./basics.md)
- [Component Optimization](../performance/react-optimization.md)
- [React Memoization Optimization](../performance/memoization.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/state-management.context-api.md)
