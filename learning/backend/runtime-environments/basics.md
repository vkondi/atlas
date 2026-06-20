[⬅️ Back to Backend Engineering](../README.md)

# Backend Runtime Foundations

An overview of process architectures, execution models, memory management, and containerization boundaries governing modern backend runtimes.

---

## Why It Matters

The choice and configuration of a backend runtime dictate how applications handle concurrency, manage memory, and scale under load. Misunderstanding how a runtime interacts with the operating system—such as executing blocking synchronous operations on a single-threaded event loop, or failing to align runtime heap limits with container boundaries—directly leads to thread starvation, high latency, and unexpected Out-Of-Memory (OOM) crashes in production.

---

## Core Concepts

### 1. Process vs. Threads

Runtimes schedule execution units differently depending on their core architecture:

- **Process**: An isolated execution space allocated by the operating system, containing its own virtual memory address space (heap, stack), file descriptors, and security contexts.
  - _Isolation_: High. If a process crashes, it does not affect neighboring processes.
  - _Overhead_: High. Creating, managing, and context-switching between processes is resource-intensive.
- **Thread**: A lightweight unit of execution within a parent process. Multiple threads share the same heap memory and file descriptors of their parent process.
  - _Isolation_: Low. An unhandled exception or memory corruption in one thread can crash the entire process.
  - _Concurrency_: Cheaper context switching, but developers must manage thread synchronization (mutexes, locks) to prevent data race conditions.

### 2. Concurrency Models: Thread-per-Connection vs. Event Loop

How runtimes handle network I/O determines their scalability bounds:

#### Thread-per-Connection (Traditional Blocking I/O)

- **How it works**: Runtimes (e.g., traditional Apache/Tomcat setups) spawn or pull a dedicated thread from a thread pool to handle each incoming client connection.
- **Trade-off**: Highly efficient for CPU-bound computations because execution is synchronous. However, it scales poorly for I/O-bound workloads (like waiting for database queries) because idle threads consume system memory (often 1MB to 8MB stack allocation per thread).

#### Event-Driven Non-Blocking I/O

- **How it works**: A single main execution thread continuously loops, polling an event queue. When asynchronous tasks (file reads, network calls) are initiated, the runtime delegates them to the OS kernel (via `epoll`, `kqueue`, or system worker pools) and immediately continues executing other code. Once complete, the task invokes a callback scheduled on the event loop.
- **Trade-off**: Extremely low memory footprint and high scalability for I/O-heavy applications. However, long-running CPU-bound calculations (e.g., cryptography, image parsing) will block the single execution thread, freezing the entire server for all users.

### 3. Garbage Collection & Memory Management

Modern runtimes (like V8 in Node.js, or JVM) feature managed memory where a **Garbage Collector (GC)** periodically runs to free memory allocated to objects that are no longer referenced in the application's execution graph.

- **Reachability Analysis**: The GC starts from root references (global variables, active execution stacks) and traverses the object tree. Unreachable nodes are flagged for deletion.
- **Stop-the-World (STW) Pauses**: During compaction phases, the GC must temporarily halt application execution to safely relocate objects in memory. Large heap sizes or complex reference chains increase the duration of these freezes, causing latency spikes.
- **Memory Leaks**: A leak occurs when unused objects remain reachable in the reference tree. Common causes include:
  - Accidental global variables.
  - Forgotten timers or intervals holding references to variables.
  - Closures retaining large parent scope contexts.

### 4. Container Resource Alignment & The OOM Killer

In containerized environments (like Docker or Kubernetes), resources are restricted using Linux **cgroups** (control groups).

If a container's memory usage exceeds its hard limit (e.g., `1GiB`), the Linux kernel triggers the **Out-Of-Memory (OOM) Killer** to immediately terminate the process (`Exit Code 137`), preventing it from destabilizing the host system.

```
       [ Kubernetes Container Limit: 1 GiB ]
+---------------------------------------------+
|                                             |
|   [ Node.js/V8 Default Heap: 1.4 GiB ]      |
|   +-------------------------------------+   |
|   |  Allocating memory...               |   |
|   |  Memory hits 1.05 GiB               |   |
|   +-------------------------------------+   |
|                      |                      |
+----------------------|----------------------+
                       v
             [ KERNEL OOM KILLER ]
         Memory Limit Exceeded: CRASH!
```

> [!WARNING]
> Managed runtimes do not automatically read container resource limits by default. For example, if a Node.js process is run in a container capped at 512MB RAM, V8 may still default to a maximum heap size of 1.4GB. The runtime will continue allocating heap space past 512MB, expecting to trigger GC later, causing the kernel to kill the container before V8 ever runs its garbage collector.

---

## Real-World Production Learnings

In our microservices deployment on Kubernetes, a CPU-intensive report aggregation service written in Node.js kept crashing with exit code 137 (OOMKilled) under peak load.

By analyzing the application metrics, we noticed:

1. The Kubernetes container memory limit was set to `1GiB`.
2. The Node.js process was launched without any explicit memory flags, defaulting its maximum V8 heap size limit to approximately `1.4GiB`.
3. When processing large CSV reports, Node's memory footprint climbed above `1GiB`. V8 did not trigger garbage collection because it believed it still had room to grow within its `1.4GiB` limit. Consequently, the OS kernel stepped in and killed the container.

To solve this, we updated our container startup script to explicitly pass the old space heap limit to the Node process:

```bash
# Allocate 75% of the container memory to V8 Old Space, leaving the rest for stack, buffers, and overhead
exec node --max-old-space-size=768 dist/index.js
```

We also configured Kubernetes memory limits and requests accurately:

```yaml
resources:
  requests:
    memory: '768Mi'
    cpu: '500m'
  limits:
    memory: '1Gi'
    cpu: '1000m'
```

After deploying this change, the V8 garbage collector began executing compaction passes proactively as memory usage approached 768MB, successfully keeping the process memory footprint below the container boundary and eliminating the OOM crashes.

---

## Related Reading

- [Node.js Internals](./nodejs-architecture.md)
- [Bun & Deno](./bun-and-deno.md)
- [Web Framework Fundamentals](../web-frameworks/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.runtime-environments.basics.md)
