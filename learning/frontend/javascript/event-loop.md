[⬅️ Back to Frontend Engineering](../README.md)

# The Event Loop

The Event Loop is the runtime coordination mechanism that enables JavaScript to perform non-blocking, asynchronous operations. Although JavaScript code executes inside a single-threaded environment, the Event Loop orchestrates asynchronous background APIs to keep applications highly responsive.

---

## Why It Matters

Because JavaScript is single-threaded, it can only execute one stack frame at a time. If the main execution thread is blocked by a long-running computation, the browser cannot run style calculations, execute layouts, or paint pixels, causing the interface to freeze. Mastering the Event Loop is critical for managing scheduling, resolving execution races, and optimizing UI performance.

---

## Core Components of the Runtime

The JavaScript execution context consists of four primary blocks coordinate by the browser:

```
  +------------------+     +------------------+
  |    Call Stack    |     |     Web APIs     |
  |  (Synchronous)   |     |  (Background)    |
  +--------+---------+     +--------+---------+
           |                        |
           v                        v
  +------------------+     +------------------+
  |  Microtask Queue |     |  Macrotask Queue |
  | (Promise/queue)  |     | (setTimeout/I/O) |
  +--------+---------+     +--------+---------+
           |                        |
           +----------+  +----------+
                      |  |
                      v  v
             +------------------+
             |    Event Loop    |
             +------------------+
```

1. **The Call Stack**: A Last-In, First-Out (LIFO) stack tracking the active functions currently executing.
2. **Web APIs / Node APIs**: Multithreaded background container systems managed by the browser or runtime (e.g., HTTP fetches, DOM listeners, filesystem timers).
3. **The Microtask Queue**: A high-priority callback queue containing deferred tasks that must run immediately after the Call Stack clears and before the browser yields control back to the layout engine.
4. **The Macrotask Queue (Task Queue)**: A queue containing asynchronous actions that wait for execution ticks (e.g., timer callbacks, user input events, network responses).

---

## The Event Loop Cycle Steps

The runtime runs an infinite coordination loop following these exact steps:

1. **Clear the Call Stack**: Execute synchronous code frame until the Call Stack is empty.
2. **Flush the Microtask Queue**: Execute every callback in the Microtask queue. If a microtask schedules _another_ microtask, the engine immediately adds it to the queue and continues flushing. The loop will not exit this stage until the Microtask queue is entirely empty.
3. **Check for Rendering**: The browser determines if a paint cycle is required. If so, it processes style adjustments and layout updates.
4. **Process One Macrotask**: Dequeue and execute exactly **one** callback from the Macrotask queue.
5. **Repeat**: Return to Step 1.

### Macrotasks vs. Microtasks

| Task Category  | Scheduled By                                                       | Queue Flushing Rules                                                                                                        |
| :------------- | :----------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Microtasks** | `Promise.resolve().then()`, `queueMicrotask()`, `MutationObserver` | **Flushed completely** on every tick. Infinite recursive microtasks will block the main thread and freeze the browser.      |
| **Macrotasks** | `setTimeout()`, `setInterval()`, `setImmediate()`, I/O, DOM events | **Executed one at a time**. The browser yields control to other tasks or rendering frames between each macrotask execution. |

---

## Real-World Production Learnings

In an administrative data importing portal, parsing a 50,000-row CSV file synchronously took approximately 8.2 seconds. During this time, the Call Stack was fully occupied, blocking the Event Loop from processing click events or layout updates, causing the browser to show a "Page Unresponsive" dialog. We resolved this by batching the processing. We split the CSV into 1,000-row chunks and scheduled each chunk using `setTimeout(processChunk, 0)`. This allowed the Event Loop to process pending user input and paint updates between chunks, keeping the UI fully interactive.

---

## Code Example: Guess the Output

Understanding queue priorities is crucial for predicting execution logs:

```javascript
console.log('1'); // Synchronous

setTimeout(() => {
  console.log('2'); // Macrotask
}, 0);

Promise.resolve().then(() => {
  console.log('3'); // Microtask
});

queueMicrotask(() => {
  console.log('4'); // Microtask
});

console.log('5'); // Synchronous

// Expected Output: 1, 5, 3, 4, 2
```

---

## Related Reading

- [JavaScript Basics](./basics.md)
- [Asynchronous JavaScript](./async-programming.md)
- [Browser Rendering Pipeline](../browser-internals/rendering-pipeline.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.javascript.event-loop.md)
