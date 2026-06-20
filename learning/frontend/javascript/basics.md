[⬅️ Back to Frontend Engineering](../README.md)

# JavaScript Basics

JavaScript is a single-threaded, dynamically typed, compiled-at-runtime language designed around an event-driven execution model. To build highly responsive and reliable client applications, engineers must look beyond high-level syntax and understand the runtime internals, memory constraints, and optimizing compilers.

---

## Why It Matters

Because JavaScript execution shares a single main thread with browser paint cycles, poorly written algorithms or memory leaks don't just slow down code execution—they completely freeze the user interface. Uncoordinated objects can cause garbage collection cascades that trigger dropped frames and tab crashes in long-running Single Page Applications (SPAs).

---

## Core Concepts

### 1. Typing Architecture (Dynamic & Weak)

JavaScript does not bind type constraints to variables; instead, types are associated with the runtime values themselves.

- **Dynamic Typing**: A single variable identifier can reference different data types (e.g., numbers, strings, objects) over its execution lifecycle.
- **Weak Typing (Coercion)**: The engine implicitly coerces types during operations (e.g., `5 + '5' === '55'`). Always use strict equality (`===`) to bypass implicit type coercion checks, which can lead to silent failures.

### 2. Runtime Engine Compilation (V8)

Modern JS engines (like Chrome's V8) do not compile code ahead of time; they use a Just-in-Time (JIT) compilation model:

1. **Ignition Interpreter**: Compiles raw JS source into bytecode for quick initial execution.
2. **TurboFan Optimizer**: Monitors runtime profiles. If a function is called repeatedly with identical argument shapes, TurboFan compiles the bytecode into highly optimized native machine code.
3. **Deoptimization**: If the shape of the arguments changes later (e.g., a function expecting integers receives strings), TurboFan must discard the optimized code and fall back to bytecode execution, creating a performance penalty.

### 3. Memory Architecture: Stack vs. Heap

- **Stack Memory**: Stores fixed-size primitives (numbers, booleans, undefined) and pointer references to objects. Memory allocation is fast and managed via standard execution stack frames.
- **Heap Memory**: Stores large, dynamically sized objects, arrays, and closures. Heap allocation is flexible but requires runtime Garbage Collection (GC) sweeps to reclaim unused memory.

### 4. Garbage Collection (Generational Mark-and-Sweep)

JavaScript engines reclaim unused heap memory using a **generational mark-and-sweep** strategy:

- **The Mark Phase**: The garbage collector starts at the "GC Roots" (the global object, active execution stack references) and recursively traverses all links. Every reachable object is marked as active.
- **The Sweep Phase**: Unmarked objects are unlinked and swept from the heap.
- **Generational Division**: The heap is split into:
  - **New Space (Nursery)**: Highly ephemeral objects. Collected frequently using a fast "Scavenger" copy-collection algorithm.
  - **Old Space**: Objects that survive multiple nursery collections. Swept less frequently via the primary Mark-and-Sweep-and-Compact cycle, which can trigger brief execution pauses (GC thrashing).

---

## Real-World Production Learnings

In a real-time portfolio tracking dashboard, users reported that the browser tab became progressively unresponsive and eventually crashed after 45 minutes of use. Using Chrome DevTools Performance and Memory tabs, we traced the bug to a `setInterval` hook that appended raw stock price updates to a global array. Because the global reference was never cleared, the garbage collector could never sweep the array, leading to a heap size of over 1.2GB. Limiting the array to the last 100 updates and clearing the interval on component destruction solved the leak.

---

## Best Practices

- **Instantiate Consistent Object Shapes**: Avoid adding or deleting properties dynamically after object creation. Keeping shapes stable allows V8 to utilize **Hidden Classes** and **Inline Caches** for fast property lookups.
- **Release Event Listeners**: Always clean up event bindings (`window.removeEventListener`) and timers when disposing of UI components.
- **Use Object.freeze()**: Freeze static data tables to prevent modifications and reduce engine monitoring overhead.

---

## Related Reading

- [The Event Loop](./event-loop.md)
- [Closures](./closures.md)
- [Advanced Types (TypeScript)](../typescript/advanced-types.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.javascript.basics.md)
