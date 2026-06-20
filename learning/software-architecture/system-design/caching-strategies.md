[⬅️ Back to Software Architecture](../README.md)

# Caching Strategies

An in-depth analysis of caching patterns (Cache-Aside, Write-Through, Write-Back), cache key design, invalidation strategies, and operational consistency boundaries.

---

## Why It Matters

Caching is the primary mechanism used to accelerate application response speeds and protect database systems from read-heavy traffic. By placing copies of slow query results or heavy calculations in fast, in-memory RAM caches, systems reduce retrieval latencies from milliseconds to microseconds. However, caching introduces a major architectural challenge: data consistency. Failing to coordinate cache updates with database writes results in stale reads, cache key pollution, and synchronization errors.

---

## Core Concepts

### 1. Caching Execution Patterns

Architectures integrate memory caches (e.g., Redis, Memcached) into data access pipelines using three primary patterns:

```
   [ Cache-Aside (Lazy) ]               [ Write-Through ]             [ Write-Back (Behind) ]

   Application --> (Check) --> Cache    App -> Cache -> (Sync) -> DB   App -> Cache -> (Async Batch) -> DB
      || (Miss)
      v
   Query DB -> Update Cache
```

#### Cache-Aside (Lazy Loading)

- **How it works**: The application queries the cache first. If the key exists (Cache Hit), it returns the value. If not (Cache Miss), the application queries the database, writes the result to the cache with a Time-To-Live (TTL) expiration, and returns the data.
- **Pros**: Simple to write. Highly resilient: if the cache fails, the application falls back to querying the database directly.
- **Cons**: First-time queries suffer high latency (requires three network hops). Stale data occurs if the database is updated without invalidating the cached key.

#### Write-Through

- **How it works**: The application writes updates to the cache. The cache synchronously writes the update to the database. The write transaction completes only when both stores acknowledge the update.
- **Pros**: Stale data is eliminated. Reads are always fast and consistent.
- **Cons**: Write latency is high because it requires synchronous writes to both memory and disk. Cold data (seldom read) consumes valuable cache memory unless evicted.

#### Write-Back (Write-Behind)

- **How it works**: The application writes updates directly to the cache, which acknowledges the write immediately (sub-millisecond latency). The cache then asynchronously writes updates to the database in batches.
- **Pros**: Low write latency and high write throughput. Protects databases from traffic spikes by collapsing multiple updates into a single batch write.
- **Cons**: High risk of data loss. If the cache server crashes before flushing dirty updates to disk, data is permanently lost.

### 2. Cache Invalidation Strategies

Data changes in the database must be reflected in the cache:

- **Time-to-Live (TTL)**: Assigning an expiration duration to cached keys. Useful as a safety net, but introduces eventual consistency drift.
- **Active Invalidation**: The application code explicitly deletes the cache key when a write occurs:
  ```javascript
  // Update DB, then invalidate cache immediately
  await db.updateUser(userId, data);
  await redis.del(`user:${userId}:profile`);
  ```

### 3. Cache Key Namespacing

Cache keys share a single global keyspace. Keys must use structured namespaces to prevent collisions:
`[AppName]:[DomainContext]:[EntityID]:[SubField]`

- _Example_: `api:billing:user_1209:invoice_summary`

---

## Real-World Production Learnings

In our e-commerce checkout service, we stored product stock availability in Redis using the **Cache-Aside Pattern**. We configured a TTL of 24 hours on each product cache key to optimize read speeds.

During a flash sale event:

1. Multiple users purchased the same item, updating the PostgreSQL database stock.
2. The cached product key was not invalidated; it continued to show `stock: 12` to incoming buyers because the 24-hour TTL had not expired yet.
3. Customers bought items that were shown as "In Stock" but were actually sold out. This resulted in over-selling, payment refund disputes, and system errors.

**The Refactor**:
We updated our inventory management using **Active Invalidation** and fallback guards:

1. We refactored our order controller to synchronously delete the cache key when a purchase was finalized, ensuring the next buyer suffered a cache miss and read the fresh stock count from the database:

```javascript
const { db, redis } = require('./infrastructure');

async function processCheckout(userId, productId, quantity) {
  const transaction = await db.transaction();
  try {
    // 1. Update database stock atomically
    await transaction.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1',
      [quantity, productId],
    );
    await transaction.commit();

    // 2. Actively invalidate the stale cache key immediately
    const cacheKey = `catalog:product:${productId}:stock`;
    await redis.del(cacheKey);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
```

1. We wrapped our Redis client in a try/catch handler. If our Redis cache went down or timed out, the handler caught the error, logged the failure, and bypassed the cache to read from our PostgreSQL **Read-Replica** database.

This active invalidation approach prevented overselling and kept our checkout system online even during cache outages.

---

## Related Reading

- [System Design Basics](./basics.md)
- [Rate Limiting](./rate-limiting.md)
- [Redis Internals & Data Types](../../databases/non-relational/redis-caching-data-structures.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.system-design.caching-strategies.md)
