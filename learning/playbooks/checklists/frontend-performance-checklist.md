[⬅️ Back to Playbooks](../README.md)

# Frontend Performance Checklist

An operational checklist for optimizing web applications, targeting Core Web Vitals (LCP, INP, CLS), implementing asset compression, and structuring code-splitting boundaries.

---

## Why It Matters

User conversion rates are directly tied to frontend load speeds. Research shows that load delays exceeding 2.0 seconds cause bounce rates to double, directly impacting business revenue. Without a structured performance review process, frontend assets easily bloat with uncompressed images, blocking scripts, and un-optimized libraries, degrading user experience.

Implementing a frontend performance checklist establishes quality benchmarks for client-side assets. Enforcing Core Web Vitals checks, assets compression, and code-splitting rules ensures fast page loads and smooth interactions, even on low-bandwidth mobile networks.

---

## Core Concepts

### 1. Core Web Vitals (CWV) Targets

Google's CWV metrics define user experience benchmarks:

- **Largest Contentful Paint (LCP)**: Measures loading performance. Time to render the largest visible element (e.g., hero image or heading). Target: **<2.5s**.
- **Interaction to Next Paint (INP)**: Measures page responsiveness. Delay between a user interaction (click/tap) and the next frame update. Target: **<200ms**.
- **Cumulative Layout Shift (CLS)**: Measures visual stability. Explores unexpected layout movement of elements during load. Target: **<0.1**.

### 2. Asset Delivery Optimizations

1. **Modern Formats**: Convert standard PNG/JPG assets to WebP or AVIF, reducing file sizes by up to 80% without quality loss.
1. **Lazy Loading**: Configure off-screen images and iframe containers with `loading="lazy"` attributes, delaying network downloads until the user scrolls near the elements.
1. **Layout Dimensions**: Always declare explicit `width` and `height` attributes on image tags to allow the browser to reserve space before assets load, preventing layout shifts.

### 3. Code Optimization and Bundling

- **Tree Shaking**: Ensure compilation tools strip unused exports. Import ESM modules directly (e.g., import `lodash-es` instead of CommonJS `lodash`).
- **Dynamic Imports (Code Splitting)**: Divide application bundles into smaller files, loading page-specific bundles on demand (e.g., using `React.lazy()` for router paths).

---

## Real-World Production Learnings

We operated a customer landing page that suffered from high bounce rates and low mobile search rankings.

**The Failure**:
Our mobile conversion rates dropped by 22% because the home page took 5.8 seconds to load on mobile connections. Users complained that page elements shifted during load, causing them to click wrong buttons.

**The Diagnostic**:

1. **Uncompressed Assets**: The page loaded a 3.8MB uncompressed PNG hero image as the main LCP element.
2. **Bloated Bundles**: We imported the entire `lodash` library to use a single helper, loading unnecessary scripts.
3. **Missing Image Dimensions**: Image tags lacked height and width attributes. When images loaded, text blocks shifted, causing a high CLS score of 0.28.

**The Refactor**:
We converted images to AVIF format, set explicit size parameters, enabled tree-shaking, and lazy-loaded off-screen components:

1. **Hardened Asset Formats**: Converted all static images to AVIF.
2. **Prevented Shifts**: Added width and height parameters to all image tags, reducing CLS.
3. **Optimized Imports**: Switched to `lodash-es` and configured code-splitting.

Here is the operational checklist we implemented:

```markdown
# Frontend Performance Audit Checklist

## 1. Image & Asset Optimization

- [ ] Convert all images to AVIF or WebP formats.
- [ ] Add explicit `width` and `height` attributes to all image elements.
- [ ] Configure `loading="lazy"` on all off-screen images and iframes.
- [ ] Enforce Gzip or Brotli compression for JS, CSS, and HTML files at the server/CDN boundary.

## 2. Bundling & JavaScript Performance

- [ ] Verify that unused code is stripped using Tree Shaking (e.g., using ESM library imports).
- [ ] Implement code-splitting on routing boundaries (e.g., dynamic imports).
- [ ] Move non-critical scripts (e.g., analytics trackers) to run using `defer` or `async` tags.

## 3. Core Web Vitals Verification

- [ ] Verify that LCP is under 2.5 seconds on simulated 4G throttling.
- [ ] Confirm CLS is under 0.1 by verifying that no layout shifts occur during load.
- [ ] Verify that INP remains under 200ms during simulated user input tests.
```

By enforcing these optimizations:

- Mobile page load times dropped from **5.8 seconds** to **1.8 seconds**.
- Cumulative Layout Shift (CLS) fell from **0.28** to **0.01**, resolving user interaction errors.
- Total JavaScript bundle size fell by **60%**, reducing client compilation overhead.

---

## Related Reading

- [Checklist Basics](./basics.md)
- [Production Release Checklist](./production-release-checklist.md)
- [Security Audit Checklist](./security-audit-checklist.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.playbooks.checklists.frontend-performance-checklist.md)
