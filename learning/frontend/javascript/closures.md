[⬅️ Back to Frontend Engineering](../README.md)

# Closures

A closure is the combination of a function bundled together with references to its surrounding state—its **lexical environment**. In JavaScript, closures are created automatically every time a function is declared, allowing the function to retain access to variables in its parent scope even after the parent function has finished executing.

---

## Why It Matters

Closures are the structural basis for many JavaScript programming patterns, including private scope encapsulation (the module pattern), functional currying, callback handlers, and React custom hooks. However, because closures keep parent variable scopes alive in memory, they can trigger silent memory leaks if references are not managed properly.

---

## Core Concepts

### 1. Lexical Scoping

JavaScript uses static (or lexical) scoping. This means variable access and resolution are determined by the location of the variable and function declarations within the written source code structure, rather than the path of execution.

### 2. The Scope Chain & Internal Working

When a function executes, the runtime engine looks up variables through a sequential **Scope Chain**:

1. **Local Scope**: Variables declared directly inside the active function.
2. **Outer Lexical Environments**: Variables declared inside parent functions. The inner function maintains an internal `[[Environment]]` reference slot pointing to the parent's environment frame.
3. **Global Scope**: Variables declared in the topmost environment context.

```javascript
function outerFunction() {
  const outerVar = 'I am outer';

  return function innerFunction() {
    console.log(outerVar); // Accesses outerVar via the scope chain
  };
}

const myClosure = outerFunction();
myClosure(); // Logs: "I am outer"
```

Even though `outerFunction` has returned and its execution frame is popped off the Call Stack, the lexical environment containing `outerVar` remains in **Heap Memory** because `innerFunction`'s internal `[[Environment]]` slot still holds a reference to it.

### 3. State Encapsulation (Private Variables)

Closures allow engineers to hide state from the global scope, exposing it only through specific interfaces:

```javascript
function createCounter() {
  let count = 0; // Private state

  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
}

const counter = createCounter();
console.log(counter.getCount()); // 0
counter.increment();
console.log(counter.getCount()); // 1
// console.log(count); // ReferenceError: count is not defined
```

---

## The Loop & Closure Trap

A classic JavaScript interview and debugging pitfall involves closures inside loops using the `var` keyword:

```javascript
// Pitfall: Logs "3" three times
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}

// Solution: Logs 0, 1, 2
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
```

- **Why it fails**: `var` is function-scoped. The loop shares a single variable binding `i`. When the timers execute, `i` has already mutated to `3`.
- **Why it works**: `let` is block-scoped. Each loop iteration creates a new lexical scope and variable binding for `i`, which the timeout closure captures.

---

## Real-World Production Learnings

In a custom React hook managing data charts (`useDataChart`), we stored a large history object containing thousands of rows. The hook returned a closure function to update the layout. The parent component passed this closure function to a third-party global event emitter. When the parent component unmounted, the event emitter was not cleared. Because the emitter retained a reference to the closure, the entire parent lexical scope—including the huge history data object—remained in memory. Unbinding the event listener on unmount resolved the leak.

---

## Related Reading

- [JavaScript Basics](./basics.md)
- [React Hooks Basics](../react/hooks/basics.md)
- [Unit Testing Mocking Strategies](../../testing/unit-testing/mocking-strategies.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.javascript.closures.md)
