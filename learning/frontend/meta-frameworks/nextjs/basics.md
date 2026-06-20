[⬅️ Back to Frontend Engineering](../../README.md)

# Next.js Fundamentals

Next.js is a production-ready React meta-framework that provides structural conventions, server utilities, and automated build optimizations out of the box.

---

## Why It Matters

Configuring a modern React codebase from scratch requires assembling bundlers (like Webpack or Vite), compilers (like Babel or SWC), routing libraries, and server configurations for SSR. Next.js handles this setup natively, managing file compression, code splitting, routing, image optimization, and server side compilation under a single unified API.

---

## Pages Router vs. App Router

Next.js has two co-existing routing models. While legacy codebases utilize the Pages Router, modern projects are built on the App Router:

```
               Next.js Routing Paradigms
             /                           \
    [ Pages Router ]               [ App Router ]
    - Location: /pages             - Location: /app
    - File-based routing           - Folder-based nested routing
    - Client-rendered by default   - Server-rendered by default (RSC)
    - Page-level data fetching     - Component-level async fetching
```

### 1. Pages Router (`/pages`)

- **Routing**: Maps 1-to-1 with file names. For example, `pages/about.js` maps to `/about`, and `pages/blog/[id].js` maps to `/blog/:id`.
- **Rendering**: Components are client-side components by default. Data fetching is configured using page-level lifecycle hooks:
  - `getStaticProps`: Fetches data at build time (Static Site Generation).
  - `getServerSideProps`: Fetches data on every request (Server-Side Rendering).
  - `getStaticPaths`: Defines dynamic routes to pre-render statically.

### 2. App Router (`/app`)

- **Routing**: Uses folder-based routing. Folders define the path segments (e.g. `app/dashboard/settings/`), and specific files inside those folders define the page UI (e.g., `page.js` or `layout.js`).
- **Rendering**: Built on React Server Components (RSC) architecture. Components are rendered on the server by default. Client-side interactivity is opt-in via the `'use client'` directive.

---

## Core Configuration & Build Engine

### 1. The Configuration (`next.config.js`)

The `next.config.js` file is the central control hub for customizing behavior:

- **Rewrites & Redirects**: Proxy requests to separate API servers or redirect legacy URLs.
- **Image Optimization**: Specify allowed domains for dynamic image optimization via the `<Image />` component.
- **Headers**: Configure custom HTTP response headers (e.g., Cache-Control, Security Headers).

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'assets.example.com' }],
  },
  async redirects() {
    return [{ source: '/old-path', destination: '/new-path', permanent: true }];
  },
};
module.exports = nextConfig;
```

### 2. Rust Compilation (SWC & Turbopack)

Next.js utilizes **SWC** (Speedy Web Compiler), a Rust-based platform, replacing Babel for javascript compilation.

- **Turbopack**: A Rust-based successor to Webpack, integrated into the Next.js development server (`next dev --turbo`). It processes compilation and hot module reloading (HMR) up to 700x faster than Webpack in large applications.

---

## Real-World Production Learnings

During a major migration of an enterprise SaaS portal from Next.js 12 (Pages Router) to Next.js 14 (App Router), our engineering team reported that the local development server took up to 12 seconds to compile page updates during Hot Module Replacement (HMR).

We audited our configuration and discovered a legacy `.babelrc` file left in the root directory. Because the `.babelrc` file was present, Next.js disabled SWC compilation and fell back to the older Babel JavaScript parser, completely bypassing the Rust compilation engine.

Once we deleted the `.babelrc` file and moved our custom compilation configurations (such as CSS-in-JS compiler settings) directly into the `compiler` block of `next.config.js`, the SWC compiler took over. HMR compilation times dropped from 12 seconds to 120 milliseconds, drastically increasing developer productivity.

---

### 📖 Related Blog Posts & Reading

- [Ref: Frontend 2025 Make It Fast Keep It Simple](../../../../blogs/Frontend_2025_Make_It_Fast_Keep_It_Simple.md)
- [Next.js App Router Routing](./routing-app-router.md)
- [React Server Components vs Client Components](./server-components-vs-client-components.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.meta-frameworks/nextjs.basics.md)
