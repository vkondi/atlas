[⬅️ Back to Frontend Engineering](../../README.md)

# Server vs Client Components

React Server Components (RSC) introduce a hybrid architecture that splits application rendering between the server and the browser, optimizing load performance and JavaScript footprint.

---

## Why It Matters

In traditional React, every component imported is bundled and sent to the client browser. This means that styling libraries, utility parsers (like `marked` for markdown or `date-fns` for dates), and data formatting logic are loaded into client memory, leading to bloated bundles.

RSC allows components to execute _exclusively on the server_. The server outputs raw, static HTML nodes and virtual structure descriptors (RSC payload) to the browser, requiring **zero bytes of client-side JavaScript** for that component.

---

## Core Differences

| Capabilities / Characteristics | React Server Components (RSC)                                                | Client Components                                                                  |
| :----------------------------- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| **Execution Environment**      | Executes _only_ on the server. Never runs in the browser.                    | Runs on the server during pre-render (SSR), then hydrates and runs in the browser. |
| **Opt-in Marker**              | Default behavior. No directive needed.                                       | Declared using the `'use client'` directive at the top of the file.                |
| **React Hooks**                | Cannot use state or lifecycle hooks (`useState`, `useEffect`, `useContext`). | Full access to state, effects, and custom hooks.                                   |
| **Browser APIs**               | No access to browser APIs (`window`, `document`, `localStorage`).            | Full access to browser APIs.                                                       |
| **Backend Integration**        | Can query databases, call file systems, and run Node.js code directly.       | Must communicate with the backend via HTTP API endpoints.                          |
| **Component Definition**       | Can be defined as `async` functions (using standard `async/await`).          | Cannot be defined as `async` components.                                           |

---

## Component Nesting & The Serialization Boundary

A Next.js application is a nested tree of components. To manage the interaction between server and client rendering, you must follow specific composition guidelines:

```
                  Component Tree Composition

                   [ Server Layout (RSC) ]
                           /      \
             [ RSC Sidebar ]      [ Client SearchBar ('use client') ]
                                       |
                                  {children}  <-- Rendered by RSC Parent
                                       |
                              [ RSC DataGrid ]
```

### 1. Composition Rules

- **Server to Client**: A Server Component can directly import and render a Client Component.
- **Client to Server**: A Client Component **cannot** import a Server Component. If a Client Component needs to render a Server Component, pass the Server Component as a `children` prop from a Server Component parent:

```jsx
// CORRECT COMPOSITION PATTERN:
// ClientWrapper is a Client Component ('use client')
// ServerData is a Server Component.

// /app/page.js (Server Component)
import ClientWrapper from './ClientWrapper';
import ServerData from './ServerData';

export default function Page() {
  return (
    <ClientWrapper>
      <ServerData /> {/* Passed as a prop reference, rendering on the server */}
    </ClientWrapper>
  );
}
```

### 2. The Serialization Boundary

When passing props from a Server Component to a Client Component, the data must cross the network/process boundary. **Props must be serializable.**

- **Allowed**: Objects, arrays, strings, numbers, booleans, nulls.
- **Not Allowed**: Functions, classes, class instances, symbols, complex custom iterators.

---

## Real-World Production Learnings

In an administrative inventory management page, we built a product selector dropdown that dynamically highlighted selected items. The list of 500 products was fetched from a database. An engineer marked the product list component with `'use client'`, using `useState` and a `useEffect` fetch hook to query an API router handler for the product rows.

This resulted in a page load delay: the browser loaded the page shell, triggered the JS execution, fired an HTTP request back to the server, waited for the SQL query to run, and finally rendered the dropdown items.

We refactored this layout by converting the parent view into a Server Component:

1. We fetched the product data from the database directly in the Server Component using `async/await`.
2. We kept the selector dropdown as an interactive Client Component, but passed the pre-fetched products array down as a prop: `<ProductDropdown products={products} />`.

This optimization eliminated the client-side API fetch entirely. The page rendered the full product dropdown instantly on initial load, reducing the Time to Interactive (TTI) for our operations team from 1.8 seconds to 0.15 seconds.

---

## Related Reading

- [Next.js Fundamentals](./basics.md)
- [App Router Architecture](./routing-app-router.md)
- [Next.js Data Fetching and Caching](./data-fetching-caching.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.meta-frameworks/nextjs.server-components-vs-client-components.md)
