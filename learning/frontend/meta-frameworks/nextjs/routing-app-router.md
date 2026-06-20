[⬅️ Back to Frontend Engineering](../../README.md)

# App Router Architecture

The App Router is a folder-based routing system built on top of React's nesting capabilities and Server Components. It is designed to optimize bundle sizes and layout state preservation.

---

## Why It Matters

Traditional client routers completely unmount the old page and mount a new page on navigation, causing shared elements (like headers, navigation bars, and sidebar controls) to lose state (e.g., scroll positions or search inputs) and trigger layout shifts. The App Router handles routing as a tree of nested segments, only updating the subtrees that change during navigation, which maintains state and reduces DOM updates.

---

## Special File Conventions

Each directory path represents a route segment. The UI of a segment is defined using specific reserved filenames:

```
    /dashboard
    ├── layout.js     <-- Shared UI framework (preserves state)
    ├── template.js   <-- Shared UI (re-mounts on navigation)
    ├── loading.js    <-- Suspense fallback UI
    ├── error.js      <-- Segment-level Error Boundary
    ├── page.js       <-- Unique route page UI
    └── /settings
        └── page.js   <-- Nested settings page UI
```

| File              | React Mechanism | Purpose                                                                                               |
| :---------------- | :-------------- | :---------------------------------------------------------------------------------------------------- |
| **`page.js`**     | Component       | The unique UI of a route. Makes the route segment publicly accessible.                                |
| **`layout.js`**   | Subtree Wrapper | Shared UI wrapper that persists across sibling navigations. **Does not re-render or lose state.**     |
| **`template.js`** | Keyed Wrapper   | Identical to layout, but creates a new instance on navigation. **Forces re-mounts and runs effects.** |
| **`loading.js`**  | `<Suspense>`    | Renders a loading fallback automatically while dynamic data fetching resolves in the page.            |
| **`error.js`**    | Error Boundary  | Catch-all component for runtime UI errors. Must be marked with `'use client'`.                        |

---

## Advanced Routing Patterns

Next.js provides advanced folders to create complex layout relationships without altering the URL path:

### 1. Route Groups `(folderName)`

By wrapping a folder name in parentheses, you can group routes for organization or to share a layout, without adding that folder name to the URL path:

- `/app/(marketing)/about/page.js` -> resolves to `/about`
- `/app/(marketing)/blog/page.js` -> resolves to `/blog`
- This allows the marketing routes to share a header layout while `/app/(auth)/login/page.js` uses a separate login layout.

### 2. Parallel Routes `@folderName`

Parallel routes allow rendering multiple pages simultaneously or conditionally within the same parent layout.

- Useful for complex dashboards:

```jsx
// /app/dashboard/layout.js
export default function DashboardLayout({ children, analytics, team }) {
  return (
    <div className="dashboard-grid">
      <div className="main-feed">{children}</div>
      <div className="side-panel">{analytics}</div>
      <div className="team-panel">{team}</div>
    </div>
  );
}
```

### 3. Intercepting Routes `(.)folderName`

Intercepting routes allows you to load a route from another part of your application inside the current layout.

- **Modal Pattern**: When a user clicks a photo in a feed, the URL changes to `/photo/12` and loads a modal overlay containing the photo. However, if the page is shared or refreshed directly, Next.js renders the full-page photo view instead.
- Symbols match relative depth:
  - `(.)` matches segments at the _same_ level.
  - `(..)` matches segments one level _above_.
  - `(...)` matches segments from the _root_ `/app` directory.

---

## Real-World Production Learnings

In an analytics app, we designed a dashboard sidebar containing tabs and a main data view. We noticed that when switching between charts, the dashboard entrance animation was not running, making transitions feel blocky. We had placed our page transition animations (using Framer Motion) inside `layout.js` wrapping `{children}`:

```jsx
// BUG: layout.js persists across route changes; animation only runs once!
export default function DashboardLayout({ children }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {children}
    </motion.div>
  );
}
```

Because `layout.js` does not unmount or re-render when navigating between sub-pages (`/dashboard/revenue` to `/dashboard/users`), the animation container remained static.

To solve this, we moved the motion wrapper into a `template.js` file at the same level. Because templates mount a fresh DOM node and run a fresh component lifecycle for every transition, the entrance animations began triggering perfectly on every page switch.

---

## Related Reading

- [Next.js Fundamentals](./basics.md)
- [React Server Components vs Client Components](./server-components-vs-client-components.md)
- [Next.js Data Fetching and Caching](./data-fetching-caching.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.meta-frameworks/nextjs.routing-app-router.md)
