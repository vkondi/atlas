[⬅️ Back to Databases & Data Modeling](../README.md)

# Redis Internals & Data Types

An in-depth analysis of Redis memory structures, RDB and AOF persistence models, cache eviction policies, and cache failure mitigation patterns.

---

## Why It Matters

Redis achieves sub-millisecond read/write speeds by storing all data in memory and executing operations on a single-threaded event loop, avoiding OS thread locks and disk seek overhead. However, because memory is volatile and expensive, poor configurations can degrade performance. Choosing the wrong persistence model or eviction policy leads to data loss or out-of-memory crashes. Furthermore, failing to defend against cache failure patterns—like cache stampedes, penetration, and avalanches—can cause database overload and cascade system failures under load.

---

## Core Concepts

### 1. Redis Data Structures

Redis is a data structure server. Rather than storing flat strings, it supports optimized memory structures:

| Data Structure         | Internal Implementation                                     | Time Complexity  | Best Use Case                                                      |
| :--------------------- | :---------------------------------------------------------- | :--------------- | :----------------------------------------------------------------- |
| **Strings**            | Simple Dynamic Strings (SDS). Binary-safe.                  | $O(1)$           | Basic text caching, token storage, numeric counters.               |
| **Hashes**             | ZipLists (small sets) or Hash Tables.                       | $O(1)$           | Storing flat objects (e.g., user profiles with multiple fields).   |
| **Lists**              | Quicklists (linked lists of ziplists).                      | $O(1)$ push/pop  | Message queues, event streams, recent log tracking.                |
| **Sets**               | IntSets or Hash Tables. Unordered unique strings.           | $O(1)$ add/check | Tagging, tracking unique visitors, set operations (intersections). |
| **Sorted Sets (ZSET)** | SkipLists and Hash Tables. Unique members ordered by score. | $O(\log N)$      | Leaderboards, sliding-window rate limiters.                        |

### 2. Persistence Models: RDB vs. AOF

Redis supports two primary persistence options, which can be used separately or combined:

#### RDB (Redis Database Backup)

- **How it works**: Spawns a background worker process via `fork()` to write a point-in-time snapshot of the active dataset to a compressed binary file on disk.
- **Pros**: Highly compact single file. Fast server restart speeds.
- **Cons**: Risk of data loss. If Redis crashes between snapshot intervals (e.g., every 5 minutes), all writes within that window are lost. `fork()` can block the main thread briefly on massive datasets.

#### AOF (Append Only File)

- **How it works**: Appends every received write command to an execution log on disk.
- **Pros**: Highly durable. Typically configured to sync via `fsync` every second, limiting data loss to at most 1 second.
- **Cons**: Larger file size on disk. Slower server restart times because it must replay every log command. Requires periodic background **AOF Rewriting** to compress duplicate keys.

### 3. Cache Eviction Policies

When memory usage hits the `maxmemory` boundary, Redis evicts keys according to the configured policy:

- `allkeys-lru` (Least Recently Used): Evicts keys that haven't been read or written to for the longest time, regardless of whether they have a TTL.
- `allkeys-lfu` (Least Frequently Used): Evicts keys with the lowest access frequency counter.
- `volatile-lru` / `volatile-lfu`: Applies LRU or LFU eviction exclusively to keys that have a configured Time-To-Live (TTL) expiration.
- `noeviction` (Default): Returns Out-Of-Memory (OOM) errors for write commands, preserving existing data.

### 4. Cache Failure Mitigation Patterns

| Pattern               | Definition                                                                                                                                                                    | Defensive Mitigation                                                                                                                                |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cache Penetration** | Requests query keys that never exist in either cache or database (e.g., searching for user `-9999`), causing every request to hit the DB.                                     | Cache empty results with short TTLs (e.g., 5 minutes) or filter requests using a **Bloom Filter** at the gateway boundary.                          |
| **Cache Avalanche**   | A large set of cached keys expire at the exact same second, or the Redis cluster crashes, causing a massive traffic surge to hit the database.                                | Add a **random jitter** (e.g., adding 10-60 seconds of noise) to TTLs so expirations are staggered.                                                 |
| **Cache Stampede**    | A highly popular, high-cost hotspot key expires. A sudden flood of concurrent requests fails to find it in cache and hits the database simultaneously to calculate the value. | Implement **Locking (Mutexes)** using `SETNX`. The first request acquires a lock to rebuild the cache; subsequent requests wait or read stale data. |

---

## Real-World Production Learnings

In our user notification service, we implemented rate limiting using a basic Redis string key for each user, incrementing it on every request:

```javascript
// Legacy Rate Limiting Code
const count = await redis.incr(userId);
if (count === 1) {
  await redis.expire(userId, 60); // Set TTL to 60 seconds
}
if (count > 100) {
  throw new Error('Rate limit exceeded');
}
```

Under heavy load, we discovered a **Race Condition**: if a network delay occurred between the `INCR` and `EXPIRE` commands, the key was left without a TTL. Consequently, users became blocked permanently because the counter key never expired.

Furthermore, a marketing event triggered a **Cache Stampede**. The home page configuration JSON (which took 4 seconds of complex SQL queries to compute) expired. Within a single second, 8,000 concurrent requests tried to recalculate the same key, overload-crashing our database server.

**The Refactor**:

1. We resolved the rate limiter by migrating to a **Sliding Window Algorithm** using a **Redis Sorted Set (ZSET)**, running operations inside an atomic transaction block (Multi/Exec):

```javascript
async function rateLimitSlidingWindow(userId, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const clearBefore = now - windowMs;

  const pipeline = redis.multi();
  // Remove logs older than the active sliding window
  pipeline.zremrangebyscore(userId, 0, clearBefore);
  // Add the current request log timestamp
  pipeline.zadd(userId, now, `req_${now}`);
  // Fetch current request count in the window
  pipeline.zcard(userId);
  // Reset key idle TTL to prevent memory leaks
  pipeline.expire(userId, windowMs / 1000);

  const results = await pipeline.exec();
  const requestCount = results[2][1];

  return requestCount <= limit;
}
```

1. We protected our database against cache stampedes by implementing **Single-Flight Lock Rebuilding** via `SETNX` (Set if Not Exists):

```javascript
async function fetchConfigWithLock(configKey) {
  let cached = await redis.get(configKey);
  if (!cached) {
    // Attempt to acquire a distributed lock for 5 seconds
    const lockAcquired = await redis.set(
      `${configKey}:lock`,
      'true',
      'NX',
      'PX',
      5000,
    );
    if (lockAcquired) {
      const dbValue = await fetchConfigFromDatabase();
      await redis.set(configKey, dbValue, 'EX', 3600); // Cache for 1 hour
      await redis.del(`${configKey}:lock`);
      return dbValue;
    } else {
      // Wait 100ms and retry fetching the cached value
      await sleep(100);
      return fetchConfigWithLock(configKey);
    }
  }
  return cached;
}
```

Deploying these updates eliminated permanent rate-limiting lockouts, secured our cache consistency, and protected the database against connection spikes during marketing events.

---

## Related Reading

- [NoSQL Databases Overview](./basics.md)
- [MongoDB Document Modeling](./mongodb-document-modeling.md)
- [Caching Strategies](../../software-architecture/system-design/caching-strategies.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.non-relational.redis-caching-data-structures.md)
