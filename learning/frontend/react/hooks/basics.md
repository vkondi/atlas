[⬅️ Back to Frontend Engineering](../../README.md)

# React Hooks Mechanics

React Hooks are functional entry points that allow developers to use state and other React features inside functional components. To write stable components, engineers must look beyond functional patterns and master how React preserves state indexes internally inside its memory tree.

---

## Why It Matters

JavaScript functions are ephemeral; they allocate variables on their stack during execution and discard them upon return. Because React components are plain JavaScript functions, they possess no native instance state memory. React solves this by binding hook variables directly to the internal **Fiber Tree**. Violating Hook execution constraints breaks this mapping, causing React to bind state to the wrong variables or throw runtime exceptions.

---

## Core Concepts

### 1. The Fiber Linked List (`memoizedState`)

For every component instance rendered in the DOM, React maintains a corresponding **Fiber Node** in its memory graph. This Fiber node contains a property named `memoizedState`, which is configured as a singly linked list of hook records:

```
  Fiber Node
  [ memoizedState ] -------> [ Hook 1 (useState) ]
                             [ state: 0          ]
                             [ next ] ----------------> [ Hook 2 (useEffect) ]
                                                        [ effect: fn, deps   ]
                                                        [ next ] -------------> null
```

- **First Render**: React processes the component function. Every time it encounters a hook, it appends a new hook record object to the end of this linked list.
- **Subsequent Renders**: React runs the function again. It resets an internal pointer to the head of the linked list. Every time a hook runs, React returns the state from the current hook record and advances the pointer to the next hook in the list.

### 2. The Rules of Hooks

Because React matches hooks by traversing a linked list sequentially, the **execution order of hooks must remain identical across every single render**. This leads to the two core rules of hooks:

1. **Call Hooks at the Top Level**: Never call hooks inside loops, conditions, nested functions, or try/catch blocks.
2. **Only Call Hooks from React Functions**: Call hooks solely from React functional components or custom hooks.

---

## The Conditional Hook Pitfall

A common mistake is placing a hook inside a conditional check:

```javascript
// Anti-Pattern: Conditional execution shifts the hook list index!
function UserProfile({ userId }) {
  if (!userId) {
    return <div>No user selected</div>;
  }

  // Hook is only called if userId is present
  useEffect(() => {
    fetchProfile(userId);
  }, [userId]);

  return <div>Profile Details</div>;
}
```

- **Why it fails**:
  - If `userId` is missing on Render 1, the component returns early. The hook list is not created.
  - If `userId` is provided on Render 2, the `useEffect` hook runs. React attempts to match the call to the first hook record in the linked list, finds nothing, shifts the pointer, and throws: _Rendered more hooks than during the previous render._
- **Solution**: Always call the hook unconditionally, and place the conditional logic _inside_ the hook's callback:

```javascript
useEffect(() => {
  if (!userId) return; // Correct: Condition is inside the effect
  fetchProfile(userId);
}, [userId]);
```

---

## Real-World Production Learnings

In a check-scanning validation workflow, form fields were generated dynamically from an API array using a loop. An engineer placed a custom state hook (`useFieldValidation`) inside the loop mapping function. When fields were updated, the validation states shifted from one input to its neighbor, validating wrong inputs. Tracing the bug revealed that because the field list size changed dynamically, the hook linked list index shifted. We resolved this by refactoring the hook logic out of the loop and grouping all validation states into a single unified parent state array.

---

## Related Reading

- [React Fundamentals](../basics.md)
- [Core Rendering Mechanics](../fundamentals/basics.md)
- [Standard React Hooks](./standard-hooks.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/hooks.basics.md)
