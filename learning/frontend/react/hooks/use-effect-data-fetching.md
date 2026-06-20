[⬅️ Back to Frontend Engineering](../../README.md)

# Effects & Data Fetching

The `useEffect` hook synchronizes component state with external systems (such as direct DOM manipulations, socket connections, or API endpoints). Using raw effects to manage network operations is a common source of bugs, requiring careful handling of cleanup lifecycles, race conditions, and caching parameters.

---

## Why It Matters

Using `useEffect` for data fetching without cleanup handlers frequently introduces severe production bugs:

1. **Network Race Conditions**: Slow network requests returning out-of-order overwrite newer user search configurations.
2. **Memory Leaks**: Attempting to update state on a component instance that has already unmounted.
3. **Double-Fetching**: React 18's Strict Mode mounts, unmounts, and remounts components in development to surface missing cleanup handlers, triggering redundant network fetches.

---

## Core Concepts

### 1. The Cleanup Lifecycle

When a component's dependencies update or the component unmounts, React runs the hook's **Cleanup Function** (if returned) _before_ executing the effect block again:

```javascript
useEffect(() => {
  console.log('Effect executed');

  return () => {
    console.log('Cleanup executed');
  };
}, [dependency]);
```

### 2. Eliminating Race Conditions via AbortController

To prevent out-of-order fetches from writing stale data to the UI, you must abort active network calls when dependencies change:

```typescript
import { useState, useEffect } from 'react';

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadProfile() {
      try {
        const res = await fetch(`/api/users/${userId}`, { signal });
        const data = await res.json();
        setUser(data);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      }
    }

    loadProfile();

    // Cleanup: Aborts the fetch immediately if userId changes or component unmounts
    return () => {
      controller.abort();
    };
  }, [userId]);

  return user ? <div>{user.name}</div> : <div>Loading...</div>;
}
```

### 3. Transitioning to Cache-Driven Fetching

Writing manual `useEffect` wrappers for every API route is difficult to maintain. Production systems should move fetching logic to specialized client query cache libraries (e.g., TanStack Query / React Query, SWR) or meta-framework loaders (like Next.js Server Components):

```typescript
// Optimized Architecture using TanStack Query
import { useQuery } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then((res) => res.json()),
  });
  // Handles caching, deduplication, loading states, and automatic refetches out-of-the-box
}
```

---

## Real-World Production Learnings

In our ledger portal search screen, users reported that typing rapidly resulted in search lists displaying incorrect data. If Request 1 (triggered by the first letter) finished _after_ Request 2 (triggered by the complete query), the older results overwrote the fresh data. Adding an `AbortController` to the `useEffect` cleanup function instantly solved the race condition. It also deduplicated the double-mount fetches triggered by React 18 development checks, reducing server load.

---

## Related Reading

- [Asynchronous JavaScript](../../javascript/async-programming.md)
- [React Hooks Mechanics](./basics.md)

---

### 📖 Related Blog Posts

- [Ref: I think we can finally stop writing useEffect for data fetching](../../../../blogs/I_think_we_can_finally_stop_writing_useEffect_for_data_fetching.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/hooks.use-effect-data-fetching.md)
