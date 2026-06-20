[⬅️ Back to Software Architecture](../README.md)

# Distributed System Primitives

A technical analysis of distributed system primitives, covering replication topologies, sharding strategies, CAP theorem trade-offs, high availability models, and shared-nothing architectures.

---

## Why It Matters

In a centralized system, managing state is straightforward. However, to handle high traffic and ensure fault tolerance, we must distribute state across multiple physical machines. The moment state is distributed across a network, we introduce the complexities of partial failures, network partitions, message loss, and concurrency. Understanding distributed system primitives is the difference between building a system that is robust, consistent, and highly available, and one that suffers from data corruption, split-brain scenarios, and cascading cluster failures.

---

## Core Concepts

### 1. The CAP Theorem

Proposed by Eric Brewer, the CAP theorem states that any distributed data store can simultaneously provide at most two of the following three guarantees:

- **Consistency (C)**: Every read receives the most recent write or an error. In database theory, this refers to **Linearizability** (strong consistency), where all transactions appear to execute atomically on a single virtual copy of the data.
- **Availability (A)**: Every non-failing node returns a non-error response for every request, without guaranteeing that it contains the most recent write.
- **Partition Tolerance (P)**: The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.

Because physical networks are inherently unreliable and network partitions (cable cuts, switch failures, routing errors) are inevitable, **Partition Tolerance (P) is non-negotiable**. Therefore, a distributed system must choose between:

- **CP (Consistency/Partition Tolerance)**: If a partition occurs, the system rejects writes or blocks reads on isolated nodes to prevent serving stale or conflicting data, prioritizing correctness over uptime.
- **AP (Availability/Partition Tolerance)**: If a partition occurs, all nodes remain open to reads and writes, but the data will diverge. The system prioritizes uptime, resolving conflicts later using eventual consistency.

### 2. High Availability & Failover Models

High Availability (HA) measures the percentage of time a system is operational. To avoid single points of failure, systems deploy redundant nodes managed by active failover topologies:

- **Active-Passive (Primary-Replica)**: One active node (Primary) handles all writes (and optionally reads). One or more standby nodes (Replicas) mirror the primary's state. If the primary crashes, a replica is promoted.
  - **RTO (Recovery Time Objective)**: The target duration of time within which a business process must be restored after a disaster.
  - **RPO (Recovery Point Objective)**: The maximum targeted period in which data might be lost from an IT service due to a major incident.
- **Active-Active (Multi-Primary)**: All nodes are active, handling reads and writes simultaneously. This offers maximum throughput but introduces complex conflict resolution mechanisms (e.g., Last-Write-Wins, CRDTs).
- **The Split-Brain Problem**: When a network partition divides a cluster, nodes on both sides of the divide may believe the other side is dead. If both sides attempt to elect a primary, two primary nodes will accept writes independently, causing irrecoverable data corruption.
- **Quorum & Consensus**: To prevent split-brain scenarios, distributed databases require a **Quorum** (typically a simple majority: $Q > N/2$) to elect a leader or commit transactions. Consensus algorithms like Raft and Paxos formalize this by ensuring a single leader is elected and log replication is agreed upon by a majority of nodes.

### 3. Scaling Databases: Replication vs. Sharding

- **Replication**: Copying the same data across multiple nodes.
  - **Synchronous**: The primary waits for all replicas to acknowledge a write before returning success to the client. This guarantees zero RPO (no data loss) but increases write latency and compromises availability (if one replica fails, the write blocks).
  - **Asynchronous**: The primary writes locally and immediately returns success. Replicas catch up in the background. This minimizes latency but introduces **Replication Lag**, meaning read requests sent to replicas may return stale data.
- **Partitioning vs. Sharding**:
  - **Partitioning**: Splitting a database table into smaller subsets (partitions) within the _same_ database instance (e.g., PostgreSQL table partitioning).
  - **Sharding**: Distributing partitions across _separate_ database servers.
  - **Sharding Schemes**:
    - _Range-Based_: Data is split based on a range of values (e.g., IDs 1–10000 on Node A, 10001–20000 on Node B). This is simple but leads to hotspots if new entries are sequential.
    - _Hash-Based_: A hash function is applied to a sharding key (e.g., `hash(user_id) % number_of_shards`) to distribute data evenly. This minimizes hotspotting but makes adding/removing database nodes complex.
    - _Directory-Based_: A lookup service maps keys to their respective shards. This provides maximum flexibility but introduces a lookup latency penalty and a single point of failure.

### 4. Shared-Nothing Architecture (SNA)

A design pattern where each node is fully independent and self-sufficient. There is no single central point of contention, such as shared memory, shared disk storage, or centralized coordination:

- **Stateless Application Servers**: Compute nodes store no local state (like sessions or file uploads). State is offloaded to highly available database and caching tiers.
- **Benefits**:
  1. **Horizontal Scalability**: Adding capacity is as simple as launching more identical virtual machines or containers.
  1. **Fault Isolation**: A hardware crash or memory leak on Node A has zero physical impact on Node B, since they share no state.

---

## Real-World Production Learnings

In our user analytics platform, we utilized an Active-Passive database topology with one primary database handling writes and three read-replicas handling analytical dashboard queries.

During peak marketing campaigns, our replica dashboards began displaying stale data, and users complained that their updates were not reflecting. Our monitoring system revealed that **Replication Lag** had spiked to over 10 minutes. The primary cause was a series of heavy analytical queries running on the replicas, which saturated the single-threaded replica execution threads, preventing them from applying the write ahead logs (WAL) coming from the primary.

When users noticed their dashboard stats were stale, they repeatedly clicked submit buttons, causing a write storm of duplicate entries on the primary node.

**The Refactor**:
To address this, we executed a two-phased migration:

1. **Application-Level Routing (Read-Your-Own-Writes)**: We updated our application routing layer. If a user performed a write action, we set a temporary cookie/session flag (`session:write_lock:userId`) in Redis with a TTL of 15 seconds. If this flag was present, subsequent read requests from that user were routed to the **Primary** database instead of the replica. This ensured the user immediately saw their own changes, eliminating duplicate actions while letting 95% of passive traffic read from replicas.
1. **Hash-Based Database Sharding**: We partitioned our heavy analytical datasets by `tenant_id` using Citus for PostgreSQL, transforming our database tier into a Shared-Nothing Architecture.

Here is the implementation of our database router class handling this logic:

```typescript
// Database Router with Write-Recovery Read Pinning
import { Client } from 'pg';
import { Redis } from 'ioredis';

class DistributedDatabaseRouter {
  private primaryDb: Client;
  private replicaDbs: Client[];
  private redis: Redis;

  constructor(primary: Client, replicas: Client[], redisClient: Redis) {
    this.primaryDb = primary;
    this.replicaDbs = replicas;
    this.redis = redisClient;
  }

  // Determine if we must read from Primary to prevent replication lag visibility
  private async shouldPinToPrimary(userId: string): Promise<boolean> {
    const pinKey = `write_pin:${userId}`;
    const exists = await this.redis.exists(pinKey);
    return exists === 1;
  }

  // Register a write event, pinning the user's reads to primary for 10 seconds
  public async registerWriteEvent(userId: string): Promise<void> {
    const pinKey = `write_pin:${userId}`;
    await this.redis.set(pinKey, 'active', 'EX', 10);
  }

  // Route read queries dynamically
  public async routeReadQuery(
    userId: string,
    queryStr: string,
    params: any[],
  ): Promise<any> {
    const usePrimary = await this.shouldPinToPrimary(userId);
    const dbClient = usePrimary ? this.primaryDb : this.getRandomReplica();

    try {
      return await dbClient.query(queryStr, params);
    } catch (error) {
      // Fallback to primary if a replica times out or goes offline
      if (!usePrimary) {
        return await this.primaryDb.query(queryStr, params);
      }
      throw error;
    }
  }

  private getRandomReplica(): Client {
    const index = Math.floor(Math.random() * this.replicaDbs.length);
    return this.replicaDbs[index];
  }
}
```

By introducing session-based write-pinning and sharding the analytical workload, we decoupled our write/read dependencies. Replication lag dropped back to less than 50ms, and we achieved a highly horizontal database scaling model without compromising user experience.

---

## Related Reading

- [System Design Basics](./basics.md)
- [Caching Strategies](./caching-strategies.md)
- [Load Balancing](./load-balancing.md)
- [Rate Limiting](./rate-limiting.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.system-design.scalability-concepts.md)
