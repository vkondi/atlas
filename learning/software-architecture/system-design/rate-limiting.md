[⬅️ Back to Software Architecture](../README.md)

# Rate Limiting

A technical analysis of rate-limiting algorithms, distributed synchronization using Redis, deployment topologies (CDN vs. Gateway vs. Application), and DDoS/scraper mitigation patterns.

---

## Why It Matters

Rate limiting is a critical stability and security pattern. It bounds the resource consumption of clients, protecting APIs from traffic spikes, scraping bots, credential-stuffing attacks, and Denial of Service (DoS) exploits. Implementing rate limiting incorrectly—such as using local in-memory limiters across horizontally scaled server clusters or selecting the wrong algorithm—allows clients to bypass limits, triggers race conditions, and leads to downstream database CPU saturation.

---

## Core Concepts

### 1. Rate Limiting Algorithms

Systems enforce request thresholds using different logical algorithms:

#### Token Bucket

- **Mechanism**: A bucket holds a maximum capacity of tokens. Tokens are added to the bucket at a constant rate (refill rate). Each incoming request consumes one token. If the bucket is empty, the request is rejected.
- **Pros**: Supports bursts. If a client is idle, they can execute a burst of requests equal to the bucket capacity without delay.
- **Cons**: Tricky to configure refill parameters and burst limits.

#### Leaky Bucket

- **Mechanism**: Requests enter a queue (bucket) and are processed (leaked) at a constant, steady rate. If the queue is full, incoming requests overflow and are discarded.
- **Pros**: Smooths out traffic spikes, presenting a steady, predictable load to downstream databases and microservices.
- **Cons**: Delays bursty traffic, since requests are queued up rather than processed immediately.

#### Fixed Window Counter

- **Mechanism**: Divides time into fixed windows (e.g., 1 minute). A simple counter tracks requests. If the counter exceeds the limit, requests are rejected until the window resets at the next boundary.
- **Pros**: Low memory footprint.
- **Cons**: **Boundary Bursting**. If a client sends all their allowed requests at the end of window A, and another batch at the start of window B, they double the limit in a short time frame.

#### Sliding Window Counter

- **Mechanism**: Combines a fixed window counter with data from the previous window. It estimates request counts dynamically across a sliding timeframe.
- **Pros**: Prevents boundary bursting without the high memory overhead of storing individual request timestamps.

### 2. Distributed Rate Limiting (Redis)

Local memory rate limiters (e.g., storing IP counters in a local JavaScript object) fail when applications scale horizontally:

```
                  DISTRIBUTED LIMITING COLLAPSE

                    +===> [ API Server 1 (Local Limit: 10) ] -> Accepts 10
   [ Malicious ] ===|
     Client         +===> [ API Server 2 (Local Limit: 10) ] -> Accepts 10
                    +===> [ API Server 3 (Local Limit: 10) ] -> Accepts 10

   Total Requests Bypassed: 30 (Limit was 10)
```

To solve this, applications use a central **Redis** instance to store counters:

- The rate-limiting middleware queries Redis using atomic operations (`INCR` or sorted sets).
- For a sliding window implementation, the middleware uses Redis pipelines containing `ZREMRANGEBYSCORE`, `ZADD`, and `ZCARD` to execute checks in a single network round-trip.
- _Ref_: Review the concrete Redis implementation code in [Redis Internals & Data Types](../../databases/non-relational/redis-caching-data-structures.md#real-world-production-learnings).

### 3. Deployment Topologies

A robust rate-limiting strategy enforces limits at multiple boundaries:

1. **Edge Proxies / CDNs (e.g., Cloudflare, CloudFront)**: Blocks high-volume DDoS attacks and malicious bots before they ever reach your servers, saving cloud bandwidth.
2. **API Gateways (e.g., Kong, AWS API Gateway)**: Manages cross-cutting rate limits globally across all internal microservices.
3. **Application Middleware**: Handles custom, tenant-specific limits (e.g., limiting based on a client's subscription tier retrieved from database metadata).

---

## Real-World Production Learnings

In our catalog search API, a scraper bot began scraping product datasets, generating over 450 requests per second. Our database CPU pinned at 100% due to complex text search queries, causing API timeouts for checkout operations.

We initially attempted to block this by adding a standard fixed-window rate limiter middleware to our Express.js servers. However, because we ran 8 replica pods, the scraper bypassed our limits: it rotated requests across the pods, resulting in 8 times the allowed traffic.

**The Refactor**:
We implemented a **Multi-Tiered Rate Limiting Architecture**:

- **Tier 1 (Edge)**: We configured Cloudflare WAF rules to challenge IPs exceeding 200 requests per minute with a CAPTCHA.
- **Tier 2 (Gateway)**: We set up Kong API Gateway rate limiting, restricting anonymous traffic to 30 requests per minute based on IP address.
- **Tier 3 (Application)**: We integrated a Redis-backed sliding window counter inside our API middleware using **TypeBox** schema definitions to validate client JWT scopes:

```javascript
// Rate Limiting Tier Middleware
const { redis } = require('./infrastructure');

async function rateLimitMiddleware(req, res, next) {
  const clientKey = req.user ? req.user.id : req.ip;
  const limit = req.user && req.user.tier === 'premium' ? 1000 : 60; // 1000/min for premium, 60/min for free
  const windowMs = 60000;

  const now = Date.now();
  const clearBefore = now - windowMs;

  const pipeline = redis.multi();
  pipeline.zremrangebyscore(clientKey, 0, clearBefore);
  pipeline.zadd(clientKey, now, `req_${now}`);
  pipeline.zcard(clientKey);
  pipeline.expire(clientKey, windowMs / 1000);

  const results = await pipeline.exec();
  const requestCount = results[2][1];

  if (requestCount > limit) {
    res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
    return res
      .status(429)
      .json({ error: 'Too Many Requests', code: 'RATE_LIMIT_EXCEEDED' });
  }
  next();
}
```

This multi-tier approach blocked the scrapers at the edge, shielded our application servers, and maintained stable checkout responsiveness while preserving high limits for premium API integrations.

---

## Related Reading

- [System Design Basics](./basics.md)
- [Caching Strategies](./caching-strategies.md)
- [Redis Internals & Data Types](../../databases/non-relational/redis-caching-data-structures.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.system-design.rate-limiting.md)
