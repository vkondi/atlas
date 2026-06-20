[⬅️ Back to Databases & Data Modeling](../README.md)

# NoSQL Databases Overview

An exploration of non-relational database architectures, the CAP Theorem, BASE properties, and horizontal scaling patterns across distributed topologies.

---

## Why It Matters

Relational databases scale vertically (adding more CPU, RAM, or storage to a single server). Scaling them horizontally across a distributed network introduces severe performance penalties due to the coordination overhead required to guarantee strict ACID consistency. **NoSQL (Not Only SQL)** engines resolve this constraint by relaxing rigid schema designs and transactional bounds. Adopting the correct NoSQL category is critical to achieving horizontal scalability, handling high-volume write throughput, and designing partition-tolerant microservices.

---

## Core Concepts

### 1. The Four NoSQL Topologies

NoSQL engines are divided into four main categories based on how they organize and store data:

| Category              | Storage Architecture                                                     | Primary Strengths                                              | Best Use Cases                                            | Example Technologies |
| :-------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------- | :-------------------------------------------------------- | :------------------- |
| **Document Store**    | Semi-structured formats (JSON, BSON). Records are independent documents. | Flexible dynamic schemas, nested hierarchical objects.         | Content management, user profiles, product catalogs.      | MongoDB, CouchDB     |
| **Key-Value Store**   | Hash map dictionary. Unique keys map to opaque binary/string values.     | Sub-millisecond lookup speeds, low memory foot-print.          | Session caching, leaderboards, shopping carts.            | Redis, Memcached     |
| **Wide-Column Store** | Dynamic columns grouped into column families.                            | High write throughput, highly compressible data.               | Timeseries metrics, IoT sensor data, event logs.          | Cassandra, ScyllaDB  |
| **Graph Store**       | Graph structures of Nodes (entities) and Edges (relationships).          | Ultra-fast relational traversals independent of database size. | Social networks, fraud detection, recommendation engines. | Neo4j, Neptune       |

### 2. Distributed Trade-offs: The CAP Theorem

In a distributed network, servers communicate across physical switches and lines. The **CAP Theorem** states that a distributed data store can guarantee at most two of the following three features:

```
                            CAP THEOREM

                       [ Consistency (C) ]
                              /\
                             /  \
                            /    \
                           /  P   \
                          /        \
       [ Availability (A) ]----------[ Partition Tolerance (P) ]
```

- **Consistency (C)**: Every read operation returns the most recent write or an error. All nodes see identical data at the same millisecond.
- **Availability (A)**: Every non-failing node returns a non-error response, but without guarantee that it contains the most recent write.
- **Partition Tolerance (P)**: The system continues to operate despite physical network cuts, delayed packets, or dropped node communication.

> [!IMPORTANT]
> Because physical network partitions are unavoidable in cloud environments, **Partition Tolerance (P) is mandatory**. Distributed systems cannot choose "CA". Therefore, when a network split occurs, a system must choose between:
>
> 1. **CP (Consistency / Partition Tolerance)**: Rejecting or delaying reads/writes on partitioned nodes to prevent dirty updates.
> 2. **AP (Availability / Partition Tolerance)**: Allowing nodes to accept writes locally, causing data to temporarily drift across partitions.

### 3. BASE Properties: The AP Scaling Model

To scale horizontally, AP databases discard ACID transactional models in favor of the **BASE** consistency model:

- **Basically Available**: The system remains functional during node failures, though sub-networks may experience degraded response rates.
- **Soft State**: Data values can change dynamically over time without user interaction because of background replication pipelines.
- **Eventual Consistency**: Replicas will synchronize in the background. Once updates cease, all nodes will eventually converge to display the identical value.

---

## Real-World Production Learnings

In our smart-grid monitoring system, we deployed 500,000 IoT sensors that reported voltage fluctuations every 5 seconds. Initially, we wrote every telemetry data point to a relational PostgreSQL database.

Within six months, write volume escalated to 100,000 database inserts per second. The PostgreSQL server CPU pinned at 100%, and write queries blocked because of WAL write lock contention and index updates, causing the ingestion servers to drop telemetry packets.

**The Diagnostic**:

- PostgreSQL is designed as a **CP system**; it coordinates transactions through write-ahead logs and updates multiple indexing structures synchronously for every insert, creating a physical bottleneck for write-intensive IoT streams.

**The Refactor**:
We partitioned our database architecture:

1. We kept the core configuration settings, client metadata, and billing accounts in PostgreSQL, where relational constraints and transaction integrity were mandatory.
2. We migrated our telemetry storage layer to **Cassandra (an AP, wide-column database)**. Cassandra utilizes a **Log-Structured Merge-Tree (LSM)** write model:
   - Incoming data writes are appended sequentially to an in-memory buffer (**MemTable**) and written to an append-only commit log on disk (fast sequential I/O).
   - This bypassed the overhead of in-place B-Tree modifications, letting the database ingest high-throughput writes in microseconds.
   - We configured the write consistency level to `LOCAL_QUORUM`, guaranteeing partition tolerance and write safety.

This split-database architecture dropped write latency from **380ms under PostgreSQL to 4ms under Cassandra**, successfully scaling the system to handle peak sensor activity without data drops.

---

## Related Reading

- [MongoDB Document Modeling](./mongodb-document-modeling.md)
- [Redis Caching & Data Structures](./redis-caching-data-structures.md)
- [Relational Database Basics](../relational/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.non-relational.basics.md)
