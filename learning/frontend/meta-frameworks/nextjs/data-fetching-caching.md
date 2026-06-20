[⬅️ Back to Frontend Engineering](../../README.md)

# Data Fetching & Caching

Next.js provides a sophisticated caching architecture to minimize network latency, reduce database load, and optimize Server-Side Rendering (SSR) costs.

---

## Why It Matters

Next.js is designed to cache as much as possible by default to provide high-speed responses. However, this aggressive default caching can lead to severe bugs (like showing stale data to users or failing to update dashboards after writes) if you do not understand how Next.js coordinates its caching layers.

---

## The Four Cache Levels

Next.js operates four distinct caching mechanisms at different points in the request-response lifecycle:

```
    [ Server-Side Request Lifecycle ]
    1. Request Memoization (React) -> Deduplicates fetches in a single render pass.
    2. Data Cache (Next.js)        -> Persists data across request ticks and deployments.
    3. Full Route Cache (Next.js)  -> Stores static HTML and RSC payload on the server.

    [ Client-Side Lifecycle ]
    4. Router Cache (Next.js)      -> Stores navigated pages in browser memory.
```

### 1. Request Memoization

- **Mechanism**: A React rendering feature. It intercepts identical `fetch` requests (same URL and config options) within a single server-render pass.
- **Benefit**: You can call `fetch('/api/user')` in multiple components (e.g., Header, Sidebar, and Page Body) without passing props. React executes only one actual HTTP call; the others return the memoized response.
- **Duration**: Persists only for the duration of a single render request.

### 2. Data Cache

- **Mechanism**: Next.js extends the native browser `fetch` API to persist request data across server requests and builds.
- **Opt-out**: Disable caching by setting cache policies:

```javascript
// Exclude this fetch from the persistent Data Cache
fetch('https://api.example.com/data', { cache: 'no-store' });
```

- **Duration**: Persistent across requests and deployments until revalidated.

### 3. Full Route Cache

- **Mechanism**: Next.js automatically detects if a page is static (no dynamic headers, cookies, or search parameters). It compiles the page's HTML and RSC payload and stores it on the server disk.
- **Benefit**: Bypasses rendering computations entirely on subsequent requests, serving the compiled static assets directly.
- **Duration**: Invalidated on redeployment or when dependent Data Caches are revalidated.

### 4. Router Cache

- **Mechanism**: A client-side browser cache. As users navigate between pages, Next.js caches the page segments in the browser's temporary memory.
- **Benefit**: Navigating back and forth between visited routes is instantaneous, requiring zero server round-trips.
- **Duration**: Cleared on hard refresh. Automatically expires after 5 minutes for dynamic pages, or 30 seconds for static pages.

---

## Revalidation Strategies

To update cached data, you must trigger a revalidation:

### 1. Time-Based Revalidation (ISR)

Automatically regenerate cache segments at regular intervals. Configured via the `next.revalidate` option in fetch:

```javascript
// Revalidate this data at most once every 60 seconds
fetch('https://api.example.com/items', { next: { revalidate: 60 } });
```

### 2. On-Demand Revalidation

Purge cached data programmatically when a database write occurs. You can tag requests and purge them:

```javascript
// Tag the fetch request
fetch('https://api.example.com/posts', { next: { tags: ['posts'] } });

// Inside a Server Action or API Handler, purge the cache:
import { revalidateTag, revalidatePath } from 'next/cache';

async function updatePost() {
  'use server';
  await saveToDatabase();
  revalidateTag('posts'); // Immediately purges the Data Cache for this tag
  revalidatePath('/blog'); // Purges Full Route Cache for the blog page
}
```

---

## Real-World Production Learnings

In an administrative inventory management tool, clients complained that after updating an item's price, the data grid on the catalog dashboard still showed the old price until they manually hard-refreshed the browser.

We audited the routing tree and realized that:

1. The catalog dashboard was rendered statically, causing Next.js to store it in the **Full Route Cache**.
2. When the user submitted the price update form, we ran a REST API call. Although the database updated successfully, Next.js had no way of knowing the cache was stale. The user's browser kept reading from the **Router Cache** and the server kept serving the cached page from the **Full Route Cache**.

We resolved this by migrating the update form to use a **Server Action**:

```javascript
// /app/actions.js
'use server';

import { revalidatePath } from 'next/cache';

export async function updateProductPrice(productId, newPrice) {
  await db.updatePrice(productId, newPrice);

  // Solution: Clear the static route cache and client router cache
  revalidatePath('/dashboard/catalog');
}
```

Calling `revalidatePath` told Next.js to immediately purge the server's **Full Route Cache** for the catalog, and informed the client browser to refresh its **Router Cache** on the next transition. The UI updated instantly, removing the stale data bug without any complex local state sync.

---

## Related Reading

- [Next.js Fundamentals](./basics.md)
- [App Router Architecture](./routing-app-router.md)
- [React Server Components vs Client Components](./server-components-vs-client-components.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.meta-frameworks/nextjs.data-fetching-caching.md)
