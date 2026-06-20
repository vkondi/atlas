[⬅️ Back to Frontend Engineering](../README.md)

# Asynchronous JavaScript

Asynchronous programming is the collection of structures and APIs JavaScript uses to manage operations that complete in the future—such as network fetches, filesystem access, or timer-deferred computations—without stalling the synchronous execution main thread.

---

## Why It Matters

Virtually all modern web integrations are asynchronous. Failing to manage async operations correctly causes race conditions, memory leaks from dangling handles, unhandled promise rejections, and stale UI states where slow network updates overwrite newer user requests.

---

## Core Concepts

### 1. Promises

A `Promise` is a proxy representing the eventual completion (or failure) of an asynchronous action. A Promise exists in one of three mutually exclusive states:

- `pending`: Initial state; the operation has not finished.
- `fulfilled`: Operation completed successfully, yielding a result value.
- `rejected`: Operation failed, yielding an error/reason.

Once a Promise is settled (either resolved or rejected), its state is **immutable** and cannot transition again.

> [!NOTE]
> The executor function body of a Promise constructor runs **synchronously** immediately upon creation. Only the `.then()`, `.catch()`, or `.finally()` callbacks are deferred and placed in the Microtask queue.

### 2. Async/Await

Introduced in ES2017, `async/await` is syntactic sugar built over Promises:

- An `async` function always wraps its return value in a resolved Promise.
- The `await` keyword pauses the execution of the surrounding `async` function. The thread yields control back to the Event Loop, allowing other tasks to execute. Once the awaited Promise settles, the remainder of the function resumes as a microtask.

```javascript
// Chained Promises
fetchUser()
  .then((user) => fetchSettings(user.id))
  .then((settings) => applySettings(settings))
  .catch((err) => handle(err));

// Imperative Async/Await
async function init() {
  try {
    const user = await fetchUser();
    const settings = await fetchSettings(user.id);
    await applySettings(settings);
  } catch (err) {
    handle(err);
  }
}
```

### 3. Concurrency Utilities

When managing multiple concurrent asynchronous requests, choose the correct coordination utility:

| Method                 | Resolution Rule                                                          | Rejection Rule                                     | Primary Use Case                                                               |
| :--------------------- | :----------------------------------------------------------------------- | :------------------------------------------------- | :----------------------------------------------------------------------------- |
| `Promise.all()`        | Resolves when **all** settle successfully.                               | Rejects immediately if **any** reject (fail-fast). | Fetching dependent configuration parameters.                                   |
| `Promise.allSettled()` | Resolves when **all** resolve or reject, returning an array of outcomes. | **Never rejects**.                                 | Running independent tracking updates where individual failures are acceptable. |
| `Promise.race()`       | Settles as soon as the **first** promise resolves or rejects.            | Rejects if the first settler rejects.              | Setting up timeout wrappers on network calls.                                  |
| `Promise.any()`        | Resolves as soon as the **first** promise resolves.                      | Rejects only if **all** reject.                    | Fetching identical assets from mirrored CDNs.                                  |

---

## Preventing UI Race Conditions with AbortController

A common bug in search fields occurs when a user types rapidly. Multiple network requests are sent. If Request 1 takes longer to return than Request 2, Request 1's stale response will overwrite Request 2's fresh data. Use `AbortController` to cancel obsolete fetches:

```javascript
let activeController = null;

async function performSearch(query) {
  // Cancel the previous fetch if it's still running
  if (activeController) {
    activeController.abort();
  }

  activeController = new AbortController();
  const { signal } = activeController;

  try {
    const response = await fetch(`/api/search?q=${query}`, { signal });
    const data = await response.json();
    updateUI(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Search request aborted.'); // Safe, ignored exception
    } else {
      handleError(err);
    }
  }
}
```

---

## Real-World Production Learnings

In an enterprise banking dashboard, users navigating through rapid account switches were seeing incorrect transactions. If a user switched from Account A to Account B, and the fetch request for Account A returned late, the UI rendered Account A's transactions under Account B's header. Implementing an `AbortController` token inside our network service layer to cancel the previous fetch on every account transition resolved the data discrepancy.

---

## Related Reading

- [The Event Loop](./event-loop.md)
- [React Hook: Effects & Data Fetching](../react/hooks/use-effect-data-fetching.md)
- [Unit Testing Mocking Strategies](../../testing/unit-testing/mocking-strategies.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.javascript.async-programming.md)
