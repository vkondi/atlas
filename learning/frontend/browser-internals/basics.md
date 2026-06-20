[⬅️ Back to Frontend Engineering](../README.md)

# Browser Architecture

Web applications execute inside a highly optimized, sandboxed runtime environment: the web browser. Understanding how browsers organize operating system (OS) processes and storage boundaries is crucial for writing secure, performant applications.

---

## Why It Matters

Websites run untrusted code downloaded directly from the internet. If the browser executed all scripts in a single operating system process, a single malicious website could exploit a security vulnerability to access the user's local operating system files. Furthermore, a single infinite loop or heavy script on one tab would crash the entire browser. Modern browser architecture uses process isolation to prevent these failures.

---

## Multi-Process Architecture

Modern browsers (such as Google Chrome and Microsoft Edge) utilize a multi-process architecture. Tasks are split across dedicated OS-level processes:

```
                          [ Browser Process ] (UI, Nav, Files)
                               /       \
       [ GPU Process ] (Compositing)   [ Network Process ] (HTTP, Cache)
             |                                 |
       [ Renderer Process Tab 1 ]       [ Renderer Process Tab 2 ]
       (HTML/CSS parsing, JS Engine)    (HTML/CSS parsing, JS Engine)
```

### 1. Browser Process

The primary coordinator process. It runs the browser's chrome (address bar, back/forward buttons, bookmarks bar), handles utility file permissions, and coordinates all other child processes.

### 2. Renderer Process

Responsible for translating HTML, CSS, and JavaScript into an interactive visual page.

- **Sandbox Security**: Renderer processes run in a heavily restricted sandbox. They cannot make system calls to the operating system directly; they must request the Browser Process to perform network requests or write to disk.
- **Site Isolation**: Chrome assigns a separate Renderer Process to each website origin (e.g. `https://bank.com` vs `https://ads.com`). If one tab crashes or runs an infinite loop, other tabs remain unaffected.

### 3. GPU Process

Handles graphical calculations, layers compositing, and rendering pixels onto the screen. Separating this process allows the browser to utilize hardware acceleration safely without exposing GPU drivers to untrusted web content.

### 4. Network Process

Manages HTTP network requests, TCP/UDP sockets, security certifications, cookie synchronization, and local HTTP cache storage.

---

## Browser Storage Sandboxing

Browsers restrict scripts from accessing local disk storage directly. Instead, they provide sandboxed storage APIs limited by the **Same-Origin Policy (SOP)** (matching Protocol, Domain, and Port):

| Storage API        | Access Mode  | Size Limit             | Best For                                                             |
| :----------------- | :----------- | :--------------------- | :------------------------------------------------------------------- |
| **LocalStorage**   | Synchronous  | ~5MB                   | Basic, non-sensitive settings. Blocks the main thread on read/write. |
| **SessionStorage** | Synchronous  | ~5MB                   | Temporary page state. Clears automatically when the tab is closed.   |
| **IndexedDB**      | Asynchronous | Unlimited (disk-based) | Structured offline data, large JSON caches, or binary assets.        |
| **Cache Storage**  | Asynchronous | Unlimited (disk-based) | Network response caching for offline Service Worker support.         |

---

## Real-World Production Learnings

In a data-rich auditing portal, our team used `localStorage` to cache a user's query history. As auditors ran reports, the history object grew to 4.5MB.

Soon, users reported that typing filter text inside our tables was lagging. We profiled the rendering process using Chrome DevTools and found that parsing and stringifying the 4.5MB JSON payload on every key press was blocking the Renderer's **Main Thread** for up to 96ms per keystroke (producing visible UI jank). Because `localStorage` is synchronous, the thread had to pause all layout updates and JS executions while waiting for disk I/O.

We resolved this by migrating the query cache to **IndexedDB**. Because IndexedDB is asynchronous and transactional, reading and writing large datasets was offloaded from the main rendering loop, reducing keystroke execution times back to less than 1ms.

---

## Related Reading

- [The Rendering Pipeline](./rendering-pipeline.md)
- [Web Performance Metrics](./performance-metrics.md)
- [JavaScript Event Loop Internals](../javascript/event-loop.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.browser-internals.basics.md)
