[⬅️ Back to Frontend Engineering](../../README.md)

# External State Libraries

External State Libraries store application data outside of React's component tree. By bypassing React's default top-down rendering propagation models, these libraries allow components to subscribe directly to specific slices of global state, optimizing performance in complex client applications.

---

## Why It Matters

As single-page applications scale, managing all shared data via React Context or deep prop drilling becomes unmaintainable. Context lacks granular subscription mechanisms—meaning a change to any property in a Context value forces all consuming components to re-render. External state managers solve this by decoupling state storage from the DOM tree, allowing targeted updates to target components.

---

## Core State Manager Paradigms

### 1. Centralized Flux Architecture (Redux & Redux Toolkit)

Built around a strict, unidirectional data flow pattern:

- **The Loop**: Action $\rightarrow$ Reducer $\rightarrow$ Store $\rightarrow$ View.
- **Redux Toolkit (RTK)**: The modern standard for Redux, simplifying configuration and reducing boilerplate.
- **Benefits**: Centralized state makes debugging and logging simple. Time-travel debugging and strict state mutation rules are ideal for complex business rules.
- **Drawbacks**: High boilerplate overhead; can feel overly complex for small to medium features.

### 2. Micro-Store Publish-Subscribe (Zustand)

A lightweight, hook-based state manager that simplifies store creation:

```typescript
import { create } from 'zustand';

interface UserStore {
  username: string;
  setUsername: (name: string) => void;
}

// Create a decoupled store outside of React
export const useUserStore = create<UserStore>((set) => ({
  username: 'guest',
  setUsername: (name) => set({ username: name }),
}));
```

- **Benefits**: Minimal boilerplate, no Context Providers required, and simple integration.

### 3. Atomic State (Jotai & Recoil)

Splits global state into isolated fragments called **atoms**:

- Components compose and subscribe to specific atoms directly.
- Updating one atom only triggers re-renders on components subscribed to that specific atom, completely avoiding global store evaluations.

---

## Performance Optimization: Selectors

The key to preventing redundant re-renders when using external stores is using **Selectors**:

```typescript
// Anti-Pattern: Subscribes to the ENTIRE store
// Component will re-render if ANY property in the store changes
const state = useUserStore();

// Best Practice: Subscribes ONLY to the username property
// Component will ONLY re-render when username changes
const username = useUserStore((state) => state.username);
```

Selectors run reference checks. If the selected value remains identical, the subscribing component completely bypasses the render phase.

---

## Real-World Production Learnings

In a complex trading platform, we used Redux to manage active asset tickers. Components subscribed to the store using a blanket `useSelector(state => state.tickers)` call. Every time _any_ asset updated (occurring multiple times per second), the entire dashboard—including header account metrics and navigation sidebars—re-rendered, causing severe thread blocking and input delay. We refactored the subscribers to use granular, memoized selectors (e.g., `useSelector(state => state.tickers[activeAssetId])`). This narrowed re-renders to only the active charts, dropping CPU utilization from $95\%$ to $12\%$.

---

## Related Reading

- [React State Management Architecture](./basics.md)
- [React Context API](./context-api.md)
- [Component Optimization](../performance/react-optimization.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/state-management.external-state-managers.md)
