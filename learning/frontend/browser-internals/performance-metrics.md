[⬅️ Back to Frontend Engineering](../README.md)

# Performance & Web Vitals

Web performance metrics quantify the user-experience of page loading, visual stability, and interactive responsiveness. Google uses these metrics (Core Web Vitals) directly in search engine ranking algorithms.

---

## Why It Matters

A laggy interface directly hurts business metrics: slow page load times increase user bounce rates, and interactive typing lag reduces conversion rates. Relying strictly on synthetic tests (like running Lighthouse in a high-spec development laptop) is misleading. To build user-centric applications, engineers must analyze field metrics gathered from real users across different devices and network configurations (Real User Monitoring - RUM).

---

## Core Web Vitals (CWVs)

Google defines three core metrics to quantify the web user experience. Each has specific thresholds:

```
               Core Web Vitals Thresholds

       [ LCP ] Good < 2.5s  ------- Poor > 4.0s (Loading)
       [ INP ] Good < 200ms ------- Poor > 500ms (Responsiveness)
       [ CLS ] Good < 0.1   ------- Poor > 0.25  (Visual Stability)
```

### 1. Largest Contentful Paint (LCP)

- **What it measures**: Loading speed. The time it takes from when the user requests the URL to when the largest visible text block or image element is rendered within the viewport.
- **Optimization**: Preload hero images, compress media assets, and remove render-blocking scripts/CSS from the document head.

### 2. Interaction to Next Paint (INP)

- **What it measures**: Interface responsiveness. Replaced First Input Delay (FID) in March 2024. INP assesses the latency of all user clicks, taps, and keyboard inputs over the entire lifespan of the page visit, reporting the 98th percentile value.
- **Optimization**: Break up long JavaScript tasks (tasks taking > 50ms) using `requestIdleCallback` or yield controllers, and avoid executing heavy synchronous operations inside event handlers.

### 3. Cumulative Layout Shift (CLS)

- **What it measures**: Visual stability. Quantifies how much elements move unexpectedly while the page is loading (e.g. text shifting downwards because an image or advertisement loads late without reserved dimensions).
- **Optimization**: Always declare explicit `width` and `height` attributes on images and iframes, or reserve space using CSS `aspect-ratio`.

---

## Diagnostic Performance Metrics

Beyond the Core Web Vitals, several secondary metrics assist in diagnosing bottlenecks:

- **First Contentful Paint (FCP)**: The duration until the browser renders the _first_ DOM element (e.g., background colors, canvas drawings, or text).
- **Total Blocking Time (TBT)**: The sum of all time intervals between FCP and Time to Interactive (TTI) where the main thread is blocked by a single JavaScript task for more than 50ms. High TBT correlates with poor loading responsiveness.

---

## Programmatic Telemetry (`PerformanceObserver`)

Modern browsers expose the `PerformanceObserver` interface, allowing developers to collect real-world user metrics and send them to telemetry servers:

```javascript
// Telemetry observer for Largest Contentful Paint (LCP)
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1]; // Latest LCP element

  console.log(`LCP metric value: ${lastEntry.startTime}ms`);
  // Send data to analytics collector: sendToAnalytics({ lcp: lastEntry.startTime });
});

// Start observing LCP entries
observer.observe({ type: 'largest-contentful-paint', buffered: true });
```

---

## Real-World Production Learnings

In an e-commerce platform, our mobile LCP score rose to a poor 5.8 seconds, causing a ranking drop.

We audited the page structure and discovered that our hero promotion banner image (which was the LCP element) was being set using a CSS dynamic background-image rule within a React component:
`.hero-banner { background-image: url('banner.webp'); }`

Because the URL was hidden in a CSS file loaded by JavaScript, the browser's fast **HTML Preload Scanner** could not discover the image link during initial download. The browser had to download the HTML, fetch the JS bundle, parse the bundle, execute the React code, inject the CSS style block, and _only then_ begin downloading the banner image.

We resolved this by replacing the CSS background property with a standard HTML `<img>` tag and adding a `priority` attribute (or a `<link rel="preload" href="banner.webp" as="image" />` in the HTML document header). This allowed the preload scanner to parse the URL instantly in the raw HTML stream and download the image in parallel with the JavaScript. LCP decreased from 5.8 seconds to 1.9 seconds, restoring our "Good" ranking status.

---

## Related Reading

- [Browser Architecture](./basics.md)
- [The Rendering Pipeline](./rendering-pipeline.md)
- [SEO Fundamentals](../html/seo-fundamentals.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.browser-internals.performance-metrics.md)
