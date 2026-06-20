[⬅️ Back to Frontend Engineering](../../README.md)

# Standard React Hooks

React provides a suite of standard hooks designed to manage state, handle side effects, reference mutable values, and cache computations. Selecting and configuring these hooks correctly is essential for maintaining application stability and performance.

---

## Why It Matters

Using the wrong hook for a task degrades application performance. For example, storing a value that does not affect UI rendering in `useState` instead of `useRef` triggers unnecessary re-renders. Conversely, over-applying optimization hooks like `useCallback` and `useMemo` to simple operations adds execution and memory overhead that outweighs the benefits.

---

## Core Hooks

### 1. State Hooks: `useState` & `useReducer`

- **`useState`**: The baseline hook for storing component state.

```typescript
const [count, setCount] = useState<number>(0);
```

- **`useReducer`**: Preferred for components with complex state logic where updates depend on previous values, or when a single user action updates multiple state values:

```typescript
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; payload: number };

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'increment':
      return state + 1;
    case 'decrement':
      return state - 1;
    case 'set':
      return action.payload;
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, 0);
```

### 2. The Reference Pointer: `useRef`

`useRef` returns a mutable object whose `.current` property persists across the entire component lifecycle.

- **No Re-Renders**: Modifying the `.current` property of a ref is a synchronous operation that does **not** trigger a component re-render.
- **Common Use Cases**:
  - Referencing direct DOM nodes (e.g., calling `.focus()` on an input element).
  - Storing interval or timeout IDs to perform cleanups.
  - Tracking previous values or mounting states across rendering passes.

```typescript
const inputRef = useRef<HTMLInputElement>(null);

function focusInput() {
  inputRef.current?.focus(); // Direct DOM mutation
}
```

### 3. Memoization Hooks: `useMemo` & `useCallback`

Both hooks are designed to cache values between renders to prevent redundant calculations and unnecessary child component updates:

- **`useMemo`**: Caches the _result_ of a calculation:

```typescript
const sortedData = useMemo(() => {
  return rawData.sort((a, b) => b.value - a.value);
}, [rawData]); // Recalculates only when rawData changes
```

- **`useCallback`**: Caches the _function definition_ itself, stabilizing the function's reference:

```typescript
const handleToggle = useCallback(() => {
  setIsActive((prev) => !prev);
}, []); // Function reference remains identical across renders
```

---

## Caching Tradeoffs: When to Optimize

Every hook has execution overhead. Do not apply `useMemo` or `useCallback` to every variable and function.

```
                  Is the operation expensive?
                           /        \
                        Yes          No
                        /              \
         Use useMemo/useCallback     Is the value passed to a memoized child?
                                                /        \
                                             Yes          No
                                             /              \
                               Use useMemo/useCallback     Avoid Caching
```

- **Expensive Operations**: Calculations that block the main thread (like sorting huge arrays, filtering nested objects).
- **Reference Stability**: Caching handles passed as props to child components wrapped in `React.memo` prevents the child from executing unnecessary re-renders.

---

## Real-World Production Learnings

In a data grid displaying transaction balances, typing in a filter text input felt laggy. CPU profiling showed that the sorting logic for 10,000 rows was executing on _every character keystroke_. This occurred because the sorting function ran inline inside the component render body, which was triggered by the filter state update. Wrapping the sorting logic in `useMemo` and linking it to the transaction data and sort parameters resolved the lag, dropping keystroke calculation times from 75ms to less than 1ms.

---

## Related Reading

- [React Hooks Mechanics](./basics.md)
- [React Memoization Optimization](../performance/memoization.md)
- [Debugging React Apps](../../../playbooks/troubleshooting/debugging-react-applications.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/hooks.standard-hooks.md)
