[⬅️ Back to Frontend Engineering](../../README.md)

# Code Splitting

Code splitting is an optimization technique that breaks down a single, monolithic JavaScript bundle into smaller, on-demand chunks. This reduces the initial load time of the application by downloading only the code necessary for the current view.

---

## Why It Matters

In modern Single Page Applications (SPAs), bundle size grows exponentially as features are added. A large JavaScript bundle delays the **Time to Interactive (TTI)**, as browsers must download, parse, and execute the entire script before the page becomes responsive. Code splitting shifts this paradigm from "load everything upfront" to "load what you need, when you need it."

---

## Core Implementations

### 1. Dynamic Imports (`import()`)

At the core of JavaScript code splitting is the ES dynamic `import()` statement. Unlike static imports, dynamic imports are evaluated at runtime and return a Promise that resolves to the module.

```javascript
// Static Import (Bundled upfront)
// import { calculateTax } from './utils';

// Dynamic Import (Split into a separate chunk, loaded on call)
button.addEventListener('click', () => {
  import('./utils')
    .then((module) => {
      const tax = module.calculateTax(100);
      console.log(tax);
    })
    .catch((err) => {
      console.error('Failed to load chunk', err);
    });
});
```

---

### 2. React.lazy & Suspense

React provides the `React.lazy` API to declare dynamic component imports, which are then rendered inside a `<Suspense>` boundary to handle loading fallbacks gracefully.

```jsx
import React, { lazy, Suspense } from 'react';

// Dynamically import the heavy Chart component
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Dashboard() {
  return (
    <div>
      <h1>User Dashboard</h1>
      <Suspense fallback={<div>Loading chart component...</div>}>
        <HeavyChart />
      </Suspense>
    </div>
  );
}
```

---

## Architectural Splitting Strategies

### Route-Level Splitting

The most common and effective splitting pattern is to split bundles by page routes. Since users only visit one page at a time, there is no need to load code for other routes.

```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

const Home = lazy(() => import('./routes/Home'));
const Profile = lazy(() => import('./routes/Profile'));
const Settings = lazy(() => import('./routes/Settings'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="spinner">Navigating...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### Component & Library-Level Splitting

For modules or overlays that are not visible immediately (e.g., modals, slide-overs, export templates, or heavy utility libraries like `lodash` or `moment`), load them only when triggered by user interaction.

```jsx
function ExportButton() {
  const handleExport = async () => {
    // Dynamic import of the utility library AND component code
    const { saveAs } = await import('file-saver');
    const { generatePDF } = await import('../../utils/pdf-generator');

    const blob = await generatePDF();
    saveAs(blob, 'report.pdf');
  };

  return <button onClick={handleExport}>Export PDF</button>;
}
```

---

## Production Resiliency

### 1. Handling Chunk Loading Failures (Error Boundaries)

In production, network fluctuations can cause dynamic import chunks to fail to load, resulting in a blank page or a crash. **Always wrap lazy-loaded components in an Error Boundary.**

```jsx
import React from 'react';

class SafeSuspense extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-card">
          <p>Failed to load this section due to a connection issue.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage:
// <SafeSuspense><Suspense fallback={...}><LazyComponent /></Suspense></SafeSuspense>
```

### 2. Preloading Chunks on Hover

Waiting for a chunk to download _after_ clicking a link can feel sluggish. We can preload the chunk when the user hovers over the navigation link, achieving zero latency upon click.

```jsx
const link = document.querySelector('#settings-link');

const preloadSettings = () => {
  // Pre-fetch settings code into browser cache
  import('./routes/Settings');
};

link.addEventListener('mouseenter', preloadSettings, { once: true });
```

---

## Real-World Production Learnings

In a legacy analytics platform, the initial entry bundle reached a massive **3.8MB**, causing the application to take 7.2 seconds to display a loading screen on mobile grids.

We audit-mapped the bundle and discovered that the PDF invoice generation library (`pdfmake`) and the rich-text comments editor (`quill`) were bundled directly into the main entry bundle, even though less than 5% of users generated invoices or edited text.

We implemented three refactoring changes:

1. Converted all sub-routes to lazy components using `React.lazy`.
2. Extracted the rich-text editor into an interactive load gate: the editor module only starts downloading when the user actually focuses the simple input comment box.
3. Extracted `pdfmake` to a dynamic dynamic import inside the action handler.

These optimizations successfully reduced the main bundle size from **3.8MB to 290KB**. Time to Interactive (TTI) plummeted from 7.2 seconds to 1.3 seconds, resolving long-standing user complaints about load lag.

---

## Related Reading

- [React Performance Fundamentals](./basics.md)
- [Component Optimization](./react-optimization.md)
- [Next.js Routing & Bundling](../../meta-frameworks/nextjs/routing-app-router.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.react/performance.code-splitting.md)
