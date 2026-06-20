[⬅️ Back to Frontend Engineering](../../README.md)

# Virtual DOM & Reconciliation

Reconciliation is the process and algorithm React uses to update the browser DOM. By maintaining a lightweight, in-memory representation of the user interface—the **Virtual DOM**—React calculates layout differences and executes minimal target updates, avoiding heavy full-page browser repaints.

---

## Why It Matters

Directly mutating the browser DOM is computationally expensive. If React rebuilt the entire DOM tree on every state update, complex interfaces would quickly stall. The reconciliation algorithm identifies structural changes, allowing React to achieve high rendering performance.

---

## Core Concepts

### 1. The Virtual DOM

The Virtual DOM is a tree of plain JavaScript objects that mirrors the actual browser DOM. When a component renders, it returns a tree of Virtual DOM nodes (created via `React.createElement` or JSX):

```javascript
// JSX
const element = <h1 className="title">Hello</h1>;

// Compiled Virtual DOM Object representation
const virtualNode = {
  type: 'h1',
  props: {
    className: 'title',
    children: 'Hello',
  },
};
```

These objects are cheap to allocate, discard, and diff in memory compared to active browser DOM nodes.

### 2. The Heuristic Diffing Algorithm

Comparing two trees of size $N$ has a theoretical complexity of $O(N^3)$ using standard algorithms (meaning diffing 1,000 nodes would require 1 billion comparisons). React solves this by implementing a heuristic diffing algorithm with **$O(N)$ linear complexity**, built on two assumptions:

1. Two elements of different type structures will produce different trees.
2. Sibling elements can be matched across renders using a unique, stable `key` property.

### 3. Diffing Behaviors

#### Rule A: Different Element Types

If the element type changes (e.g., a `<div>` is replaced by a `<span>`, or a `<Card>` is replaced by a `<List>`), React tears down the entire old tree:

- All children DOM nodes are destroyed.
- Component instances in the subtree are unmounted, and their state is completely discarded.
- React builds and inserts the new DOM nodes from scratch.

#### Rule B: Same Element Types

If the element type matches, React retains the existing DOM node and only updates changed attributes or props:

```html
<!-- Render 1 -->
<div className="alert-active" title="Alert Dialog">Warning</div>

<!-- Render 2 -->
<div className="alert-inactive" title="Alert Dialog">Warning</div>
```

_Action_: React updates the `className` attribute on the underlying DOM node, leaving the rest of the node and its state untouched.

---

## The Critical Role of Keys

When diffing list arrays of child elements, React matches children by order index. If you insert an item at the beginning of a list, React aligns the first new item with the first old item, detects changes, and rebuilds the remaining list.

To prevent this, assign a unique `key` to list elements:

```html
<!-- Correct list mapping using unique database identifiers -->
<ul>
  {users.map(user => (
  <li key="{user.id}">{user.name}</li>
  ))}
</ul>
```

Keys serve as stable identifiers. They tell React that an element with `key="user-901"` in Render 1 matches `key="user-901"` in Render 2, enabling React to move the existing DOM node during updates rather than destroying and recreating it.

### The Index Key Anti-Pattern

Never use array indices (`key={index}`) as keys for dynamic arrays that can be sorted, filtered, or prepended:

- **Symptom**: If you delete Row 0, the remaining rows' index keys shift down by one. React assumes the data in Row 1 has mutated into Row 0's shape, updating element properties in place instead of removing the target node. This causes input values to stay in place, focus states to get lost, and validation flags to bind to wrong inputs.

---

## Real-World Production Learnings

In a dynamic forms editor portal, users complained that when they deleted a form row, the input fields beneath the deleted row lost focus, and validation states shifted incorrectly to neighboring fields. Investigation revealed that the forms array mapped inputs using the array index as the key. Changing the keys to use stable, auto-generated database row IDs (`key={field.uuid}`) resolved the focus loss, stabilized validation bindings, and reduced row deletion render latency by $65\%$.

---

## Related Reading

- [React Fundamentals](../basics.md)
- [Core Rendering Mechanics](./basics.md)
- [Debugging React Apps](../../../playbooks/troubleshooting/debugging-react-applications.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/fundamentals.virtual-dom-reconciliation.md)
