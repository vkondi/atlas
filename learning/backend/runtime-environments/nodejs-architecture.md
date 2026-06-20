[⬅️ Back to Backend Engineering](../README.md)

# Node.js Internals

An in-depth analysis of the Node.js runtime architecture, detailing V8 execution, the libuv event loop, asynchronous scheduling, and multi-threaded scaling patterns.

---

## Why It Matters

Node.js executes JavaScript on a single execution thread, yet it handles thousands of concurrent network connections with low latency. It accomplishes this through a hybrid architecture combining the V8 engine with **libuv**, a multi-threaded system library. However, single-threaded execution is a double-edged sword. If developers block the event loop with synchronous CPU-intensive work, or starve the libuv background thread pool, the entire application freezes for all active connections.

---

## Core Concepts

The Node.js runtime is built as a layered architecture:

```
+-------------------------------------------------+
|               Application Code                  |
|          (JavaScript / TypeScript)              |
+-------------------------------------------------+
|             Node.js Core API                    |
|             (fs, path, crypto)                  |
+------------------------+------------------------+
|    V8 Engine (JS)      |     Node C++ Bind      |
+------------------------+------------------------+
|                     libuv                       |
|   (Event Loop, Thread Pool, OS Async I/O)       |
+-------------------------------------------------+
|                Operating System                 |
+-------------------------------------------------+
```

### 1. The V8 Engine

V8 compiles JavaScript directly into native machine code at runtime (Just-In-Time compilation).

- **Heap Memory Model**: Divided into spaces to optimize Garbage Collection:
  - _New Space (Young Generation)_: Temporary area where short-lived variables are allocated. Garbage collected frequently using a fast scavenger algorithm.
  - _Old Space (Old Generation)_: Holds objects that survived young generation collection passes. Scanned less frequently using Mark-Sweep-Compact algorithms.
  - _Code Space_: Allocated for executable code compiled by V8.
- **Call Stack**: A single LIFO (Last In, First Out) stack tracks active function executions. If the stack is busy, nothing else can run.

### 2. libuv & Asynchronous OS Abstractions

While JavaScript execution is single-threaded, libuv provides Node.js with multi-threaded capabilities:

- **System Asynchrony**: For network I/O, libuv offloads work directly to the OS kernel using highly efficient, non-blocking polling mechanisms (`epoll` on Linux, `kqueue` on macOS, `IOCP` on Windows).
- **Worker Thread Pool**: For tasks that cannot be handled natively by OS asynchronous APIs (like file system operations, cryptography, compression, or DNS lookups), libuv maintains an internal thread pool (default size = 4).

### 3. The Event Loop Phases

The libuv event loop executes in a continuous cycle composed of six key phases:

```
   +---------------------------------------+
   |              Incoming I/O             |
   +---------------------------------------+
                       |
                       v
            +---------------------+
            |      1. Timers      | <--- setTimeout / setInterval
            +---------------------+
                       |
                       v
            +---------------------+
            | 2. Pending Callbs   | <--- Deferred system I/O errors
            +---------------------+
                       |
                       v
            +---------------------+
            |  3. Idle, Prepare   | <--- Internal runtime tasks
            +---------------------+
                       |
                       v
            +---------------------+
            |      4. Poll        | <--- Execute I/O callbacks;
            +---------------------+      Wait for new I/O events
                       |
                       v
            +---------------------+
            |      5. Check       | <--- setImmediate
            +---------------------+
                       |
                       v
            +---------------------+
            |  6. Close Callbs    | <--- socket.on('close')
            +---------------------+
                       |
                       v
         (Repeat loop if active refs exist)
```

1. **Timers**: Executes callbacks scheduled by `setTimeout()` and `setInterval()`.
2. **Pending Callbacks**: Executes TCP errors, pipe warnings, or other deferred system callbacks.
3. **Idle, Prepare**: Internal configurations used by libuv.
4. **Poll**: Retrieves new I/O events. If the queue is empty, the loop will pause and wait here _unless_ there are pending `setImmediate` callbacks or timers.
5. **Check**: Executes callbacks scheduled by `setImmediate()`.
6. **Close Callbacks**: Handles socket or handle cleanup events (e.g., `socket.destroy()`).

#### Microtasks: The Immediate Queue

Microtasks are not part of the libuv event loop. They are handled by the V8 engine and consist of:

1. `process.nextTick()` callbacks.
2. Promise `.then()` / `.catch()` / `await` resolutions.

V8 drains the microtasks queue **immediately** after the currently executing JavaScript operation finishes, _before_ letting the event loop transition to the next phase. `process.nextTick` tasks execute before standard Promise microtasks.

### 4. Worker Threads Module

For heavy CPU calculations, Node.js provides the `worker_threads` module, which allows launching separate threads that execute JavaScript in parallel:

- Unlike spawned child processes, workers share memory by passing `SharedArrayBuffer` instances.
- Each worker has its own isolated V8 engine instance, heap, and libuv event loop.

---

## Real-World Production Learnings

In our image hosting service, users uploaded raw photos that were resized and watermarked. Initially, we processed these images using a popular C++ binding library in our main Express request handlers.

Under high traffic, we observed:

1. API endpoints that merely fetched user text profiles (pure database queries) slowed down from 15ms to over 8000ms.
2. The server CPU usage was at 100%, but memory remained flat.
3. Health check endpoints timed out, causing our Kubernetes ingress controllers to think the pods were dead and rebooting them.

**The Diagnostic**: Image resizing is CPU-bound. By running it on the main execution thread, we were blocking the Event Loop. New incoming connections could not be processed at the Poll phase because the single main thread was stuck executing the resizing calculations on the call stack.

**The Refactor**: We migrated the CPU-heavy tasks to a **Worker Pool** using the `worker_threads` module:

```javascript
// main-server.js
const { Worker } = require('worker_threads');

function resizeImageAsync(imageBuffer) {
  return new Promise((resolve, reject) => {
    // Spawn a worker to handle CPU-intensive operations in a separate OS thread
    const worker = new Worker('./image-worker.js', {
      workerData: imageBuffer,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}
```

```javascript
// image-worker.js
const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp'); // Runs processing in background thread

sharp(workerData)
  .resize(800, 600)
  .toBuffer()
  .then((processedBuffer) => {
    parentPort.postMessage(processedBuffer);
  });
```

By offloading the image processing code to workers, the main thread was freed to immediately handle routing, accept incoming sockets, and respond to health check calls, dropping API p99 latency back to under 20ms.

---

## Related Reading

- [Backend Runtime Foundations](./basics.md)
- [Bun & Deno](./bun-and-deno.md)
- [Middleware Architecture](../web-frameworks/middleware-design.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.runtime-environments.nodejs-architecture.md)
