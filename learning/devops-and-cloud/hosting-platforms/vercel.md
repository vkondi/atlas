[⬅️ Back to DevOps & Cloud](../README.md)

# Vercel Architecture

An operational guide to Vercel's deployment topology, comparing Serverless Node.js functions with V8 Edge Middleware, and optimizing database round-trip latencies in global runtime environments.

---

## Why It Matters

Vercel has revolutionized frontend deployments by integrating directly with Git workflows and pioneering edge-rendering meta-frameworks (like Next.js). However, deploying complex applications on Vercel without understanding serverless execution boundaries leads to severe performance problems: routing database queries through globally-scattered edge functions creates high WAN network round-trip latency, and unoptimized serverless setups run up massive billing costs due to excessive runtime execution limits. Engineers must carefully partition edge-routing logic from regional database operations.

---

## Core Concepts

### 1. Vercel Deployment Lifecycle

Vercel integrates directly with Git providers (GitHub, GitLab) to automate staging and production environments:

- **Preview Deployments**: For every branch commit, Vercel automatically compiles the code, provisions isolated serverless endpoints, and generates a unique, immutable URL. This allows teams to review and test UI changes independently before merging.
- **Production Promotion**: When code is merged to the main branch, Vercel routes production DNS domains to the compiled build using atomic routing switches, guaranteeing zero-downtime updates.

### 2. Serverless Functions vs. Edge Runtimes

Vercel provides two distinct execution environments for API and SSR routes:

- **Serverless Functions (Regional Node.js/Go)**:
  - _Execution_: Code runs in standard containers in a designated cloud region (e.g., `us-east-1`).
  - _Cold Starts_: 100ms–300ms latency on boot.
  - _API Access_: Complete access to Node.js APIs (e.g., standard database pool clients, filesystem access).
  - _Use Case_: Complex backend data processing, SQL database queries, and third-party integrations.
- **Edge Functions (Global V8 Isolates)**:
  - _Execution_: Runs inside lightweight Google V8 Isolates distributed across a global Anycast network.
  - _Cold Starts_: Sub-10ms startup latency (practically zero).
  - _API Access_: Limited Web API subset (no native filesystem or TCP socket modules; requires HTTP/WebSockets database clients).
  - _Use Case_: Geolocated middleware, header injections, redirects, A/B testing routers, and lightweight REST proxies.

```
                    VERCEL GLOBAL RUNTIME OVERVIEW

                  Client (Paris)             Client (Virginia)
                       │                           │
                       ▼                           ▼
                 [ Edge Node ]               [ Edge Node ]
                   (Paris)                    (Virginia)
                       │                           │
                 Runs: Middleware            Runs: Middleware
                 - Fast redirects            - Fast redirects
                 - Geolocation Check         - Geolocation Check
                       │                           │
                       └─────────────┬─────────────┘
                                     ▼
                          [ Serverless Function ]
                                (us-east-1)
                       - Regional Node.js execution
                       - Direct SQL database access
```

### 3. Edge Config

A low-latency, read-only key-value store replicated to all Vercel edge nodes globally. Edge Config allows middleware functions to read configuration settings, feature flags, or redirects in less than 5ms, avoiding slow network database lookups at runtime.

---

## Real-World Production Learnings

We deployed a global Next.js application on Vercel. The application queried a PostgreSQL database hosted on AWS RDS inside the `us-east-1` (N. Virginia) region.

**The Failure**:
Users in Europe complained of extreme loading lag, with dashboard page loads taking **over 1.8 seconds to render**.

Meanwhile, users in Virginia experienced snappy performance, with page loads completing in under 80ms. Our API metrics confirmed that the API endpoints itself was the source of the latency for international users.

**The Diagnostic**:

1. **Misconfigured Edge Routing**: We had configured our Next.js API routes to run on the **Edge Runtime** globally:
   `export const config = { runtime: 'edge' };`
2. **WAN Database Round-trips**: A user in Europe was routed to a Vercel edge node in Frankfurt. The edge function executed, opening an HTTP database database client connection. To render the dashboard, the code executed 6 sequential SQL queries over the WAN to our database in Virginia.
3. **Accumulated Network Latency**: The physical network round-trip time between Frankfurt and Virginia is ~90ms. 6 sequential database queries generated $6 \times 90 = 540\text{ ms}$ of raw network transit time, plus SSL handshake handshakes, adding nearly 1.5 seconds of overhead.

**The Refactor**:
We re-engineered our API architecture:

1. **Regional Serverless Pinning**: We removed the global edge runtime configuration from our database-heavy API routes, forcing them to run as Node.js Serverless Functions pinned strictly to the `us-east-1` region (co-located with our database RDS instance).
2. **Edge Config Feature Flags**: We migrated our site redirect tables and feature flags to Vercel Edge Config, allowing the Edge Middleware to process redirects locally in Frankfurt without querying the N. Virginia database.

Here is the Next.js API route configuration we deployed to enforce regional execution:

```typescript
// pages/api/dashboard-summary.ts
// Targets: Regional co-location for database routing safety

import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Establish a database connection pool co-located in us-east-1
const dbPool = new Pool({
  host: process.env.DB_HOST, // RDS Virginia endpoint
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Force Vercel to execute this function strictly in N. Virginia
export const config = {
  regions: ['iad1'], // 'iad1' represents the AWS us-east-1 region group
};

export default async function handler(req: NextApiRequest, res: Response) {
  try {
    // Queries execute locally with <1ms network latency to the database
    const client = await dbPool.connect();
    const result = await client.query(
      'SELECT * FROM dashboard_metrics WHERE user_id = $1',
      [req.query.userId],
    );
    client.release();

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
```

By pinning database-querying APIs to the Virginia region, we eliminated international WAN round-trips. When a European user queried their dashboard, their browser made a single round-trip to the Virginia serverless function, which executed the SQL queries locally in less than 2ms. The total page load latency for European users fell from 1.8 seconds to **110ms**, restoring a fast, consistent global experience.

---

## Related Reading

- [Hosting Platforms Basics](./basics.md)
- [Serverless Computing & Lambdas](../cloud-providers/serverless-computing.md)
- [Next.js App Router & Server Components](../../frontend/meta-frameworks/nextjs/routing-app-router.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.hosting-platforms.vercel.md)
