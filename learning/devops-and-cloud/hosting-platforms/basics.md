[⬅️ Back to DevOps & Cloud](../README.md)

# Hosting Platforms Basics

An operational comparison of cloud hosting paradigms, deconstructing Infrastructure-as-a-Service (IaaS), Platform-as-a-Service (PaaS), Serverless Edge platforms, and Anycast routing topologies.

---

## Why It Matters

Selecting the correct hosting platform directly influences application performance, scalability limits, and operational overhead. Hosting a lightweight web application on a raw cloud virtual machine (IaaS) requires manual operating system patching, SSL certificate renewal, and load balancer scaling, dragging down developer productivity. Conversely, hosting a high-resource stateful application on a serverless platform can trigger massive cold start latencies and budget-busting invocation fees. Engineers must align application architecture with the appropriate cloud hosting layer.

---

## Core Concepts

### 1. The Cloud Hosting Spectrum

Modern host environments are categorized into three primary architectures:

```
                         THE HOSTING SPECTRUM

   IaaS (Infrastructure)       PaaS (Platform)           Serverless / Edge
   [ AWS EC2 / VM ]            [ Heroku / Render ]       [ Vercel / Cloudflare ]
   - Full OS root control      - Auto OS management      - No servers managed
   - Manual scaling setups     - Git-push deployments    - Global Anycast CDN
   - High admin overhead       - Medium overhead         - Microsecond boot
```

- **Infrastructure-as-a-Service (IaaS)**: Direct access to raw compute resources (e.g., AWS EC2, GCP Compute Engine). You manage the operating system, runtime installation, security updates, firewall rules, and load balancers. High administrative overhead but total control over low-level resource limits.
- **Platform-as-a-Service (PaaS)**: Pre-configured runtimes (e.g., Render, Heroku, AWS Elastic Beanstalk). The provider manages the underlying OS and scaling frameworks. Developers deploy code directly via git-push integration, letting the platform compile binaries and route traffic.
- **Serverless Edge Platforms**: High-speed, event-driven environments (e.g., Vercel, Netlify, Cloudflare Workers). Applications are split into static files served from a global CDN and stateless, lightweight functions that execute on-demand at the CDN edge. No persistent servers are managed.

### 2. Edge Network Topologies & Anycast Routing

Modern web platforms leverage edge networks to locate assets close to clients:

- **Anycast Routing**: A network addressing method where multiple physical servers across the globe share the same single IP address. BGP routing tables automatically direct a user's request to the closest physical CDN point of presence (PoP).
- **Edge Compute Runtimes**: Running lightweight JavaScript runtimes (V8 isolates) on edge nodes. By bypassing standard server overhead, edge functions boot in microseconds and resolve database reads/writes near the client, cutting latency to <50ms globally.

---

## Real-World Production Learnings

We hosted our core marketing website and user registration portal on a standard IaaS virtual machine running Apache and a Node.js process.

**The Failure**:
During a viral product launch, the website experienced a massive traffic spike (rising from 20 to 1,800 requests per second). Within 20 seconds, the VM CPU pinned at 100%, Apache connections saturated, and the server began returning **HTTP 503 Service Unavailable** errors.

The registration form failed, causing us to lose thousands of potential signups.

**The Diagnostic**:

1. **Dynamic Static Delivery**: The server was generating and serving static assets (HTML pages, CSS, product images) dynamically from disk on every HTTP request.
2. **Resource Starvation**: Processing static files consumed the same Node.js runtime thread pools and Apache connections required to handle the transactional database write requests for the registration form.

**The Refactor**:
We migrated the entire application layout to a Static + Serverless Edge hosting platform:

1. **Global CDN Caching**: We configured the frontend build to compile to static HTML and assets, caching them permanently at the edge on the platform's global CDN network.
2. **Stateless API Isolation**: We moved the database registration submit handler to a serverless function.

Here is the routing configuration block we deployed:

```json
{
  "version": 2,
  "builds": [
    { "src": "public/**/*", "use": "@vercel/static" },
    { "src": "api/register.js", "use": "@vercel/node" }
  ],
  "routes": [
    {
      "src": "/api/register",
      "dest": "api/register.js",
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, max-age=0"
      }
    },
    {
      "src": "/(.*)",
      "dest": "public/$1",
      "headers": {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }
  ]
}
```

By caching static files at the edge with high-expiry (`immutable`) headers and isolating the registration API to serverless functions, the website achieved unlimited scalability. During our next marketing campaign, static asset delivery load was absorbed by the CDN edge without hitting our origin servers. Page load latencies stayed under **35ms**, and the database API handled registrations without a single timeout error.

---

## Related Reading

- [Vercel Edge Deployments](./vercel.md)
- [Serverless Computing & Lambdas](../cloud-providers/serverless-computing.md)
- [Next.js Meta-Frameworks](../../frontend/meta-frameworks/nextjs/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.hosting-platforms.basics.md)
