[⬅️ Back to Playbooks](../README.md)

# Memory Leak Investigation

An operational guide to investigating memory leaks in Node.js, capturing heap snapshots using inspect flags, analyzing memory metrics, and resolving closure and event listener leaks.

---

## Why It Matters

Memory leaks in backend runtimes are severe operational hazards. A memory leak causes the application's memory usage to grow continually over time. Eventually, the process hits host or container boundaries, triggering Out Of Memory (OOM) crashes and killing the server container in production (frequently terminating with exit code 137).

Triaging leaks requires moving beyond guesswork. Because memory allocations are abstract, developers must learn how to generate heap snapshots, trace retention paths, and monitor memory indicators under load to identify and patch leaks before they disrupt system availability.

---

## Core Concepts

### 1. Common Memory Leak Vectors

Node.js manages memory using garbage collection (GC). However, GC cannot reclaim memory that is still referenced by active scopes:

- **Unintentional Globals**: Assigning variables without scoping declarations (e.g., `const` or `let`), attaching them to the `global` object permanently.
- **Uncleared Timers**: Creating loops using `setInterval` or `setTimeout` without clearing them when they are no longer needed. The callbacks remain active in the event loop, pinning all referenced variables in memory.
- **Event Listener Accumulation**: Registering event listeners on persistent singletons (e.g., `process` or database pools) inside short-lived request handlers without removing them.
- **Closure Retention**: Functions nested inside other functions retain references to outer scopes, keeping large variables alive in memory.

### 2. Node.js Memory Indicators

Monitor these metrics to detect memory anomalies:

1. **Resident Set Size (RSS)**: Total memory allocated for the Node.js process, including code segments, the execution stack, the heap, and dependency libraries.
1. **Heap Total**: Memory allocated by V8 for JavaScript objects.
1. **Heap Used**: Memory actually occupied by active JavaScript objects. If this metric rises continually after multiple GC runs, a leak is present.

### 3. Capturing Heap Snapshots

1. **Start with Inspect Flags**: Run Node.js with the debugging inspector active:
   ```bash
   node --inspect server.js
   ```
1. **Connect DevTools**: Open Chrome and navigate to `chrome://inspect`, connecting to the active Node process.
1. **Compare Snapshots**: Capture a baseline snapshot. Trigger simulated load using tools like `autocannon`, run garbage collection manually, then capture a second snapshot to compare object counts.

---

## Real-World Production Learnings

We operated a high-throughput telemetry analytics service that crashed regularly under heavy traffic.

**The Failure**:
Our telemetry service crashed every 4 hours in production, terminating with exit code 137 (OOM crash). Upgrading our AWS ECS container instances from 1GB to 4GB RAM only delayed the crash from 4 hours to 16 hours, without resolving the underlying memory growth.

**The Diagnostic**:

1. **Continuous Memory Rise**: Metrics showed that `heapUsed` grew continually, never returning to baseline after garbage collection.
2. **Heap Comparison Analysis**: We ran the service locally with `--inspect`, connected Chrome DevTools, and compared heap snapshots before and after running a load test of 5,000 requests.
3. **Identified Leak Vector**: The snapshot comparison showed that the number of `Closure` and `EventEmitter` instances grew by exactly 5,000. We traced the retention path to a database event listener registered inside our API request handler.

**The Refactor**:
We relocated the event listener configuration out of the request handler loop to the application startup phase and wrapped one-time operations in single-execution hooks:

1. **Decoupled Listener Registration**: Moved `process.on` listeners outside the route handler.
2. **Enforced Single Execution**: Used `once` instead of `on` for transient event hooks.

Here is the vulnerable implementation compared to the hardened refactor:

```typescript
// Vulnerable Pattern: Event Listener Leak
import express from 'express';
const app = express();

app.post('/api/v1/telemetry', (req, res) => {
  const payload = req.body;

  // LEAK: Registers a new listener on the persistent 'process' singleton
  // on every incoming request. These listeners are never removed,
  // pinning the payload closure in memory indefinitely.
  process.on('message', (msg) => {
    if (msg === 'flush') {
      sendTelemetryToDatabase(payload);
    }
  });

  res.status(202).send('Accepted');
});
```

Here is the secure, leak-free implementation:

```typescript
// Hardened Pattern: Decoupled Listener
import express from 'express';
const app = express();

// 1. Move the listener out of the request lifecycle to the global initialization scope
let telemetryBuffer: any[] = [];

process.on('message', (msg) => {
  if (msg === 'flush' && telemetryBuffer.length > 0) {
    flushTelemetryToDatabase(telemetryBuffer);
    telemetryBuffer = []; // Clear reference to allow garbage collection
  }
});

app.post('/api/v1/telemetry', (req, res) => {
  const payload = req.body;

  // Save payload to global buffer without registering new listeners
  telemetryBuffer.push(payload);

  res.status(202).send('Accepted');
});
```

By refactoring our event listeners:

- The telemetry service memory usage stabilized at **120MB** under continuous load, completely resolving the OOM crashes.
- Container costs were reduced by **75%**, as we reverted the container memory settings from 4GB back to the baseline 1GB allocation.
- Staging builds now include automated memory budget tests, verifying that heap sizes remain stable during build checks.

---

## Related Reading

- [Troubleshooting Basics](./basics.md)
- [Debugging React Applications](./debugging-react-applications.md)
- [memory-leak-investigation.md](../../playbooks/troubleshooting/memory-leak-investigation.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.playbooks.troubleshooting.memory-leak-investigation.md)
