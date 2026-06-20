[⬅️ Back to Databases & Data Modeling](../README.md)

# Relational Database Basics

An overview of relational engine architectures, schema constraints, query planners, connection pooling, and memory buffer management.

---

## Why It Matters

Relational Database Management Systems (RDBMS) are the industry standard for transactional data consistency. By enforcing mathematical relational algebra, static schemas, and foreign key constraints, they guarantee data integrity. However, poor database design—such as neglecting database connection pooling, ignoring query plan stages, or misconfiguring buffer allocations—causes connection pool exhaustion, high disk I/O, and server CPU spikes in production environments.

---

## Core Concepts

### 1. Relational Structure & Constraints

Relational databases organize data into two-dimensional grids called **Tables (Relations)** composed of **Columns (Attributes)** and **Rows (Tuples)**:

- **Primary Key (PK)**: A column (or set of columns) that uniquely identifies each row in a table. It must be unique and non-null. Typically backed by a unique index (usually a B-Tree).
- **Foreign Key (FK)**: A column that establishes a link between data in two tables, referencing the Primary Key of the target table. The database enforces **Referential Integrity**: it prevents inserting rows with a foreign key that does not exist in the parent table, and blocks deleting parent rows that are still referenced.
- **Declarative Joins**: How tables are dynamically combined based on relational keys:
  - _Inner Join_: Returns only the rows where there is a match in both tables.
  - _Left (Outer) Join_: Returns all rows from the left table, and matched rows from the right table. If no match is found, nulls are returned for right-side columns.
  - _Full Join_: Returns all rows when there is a match in either the left or right table.
  - _Cross Join (Cartesian Product)_: Returns every combination of rows from both tables. _Caution_: Scales at $O(M \times N)$ size and can cause memory exhaustion.

### 2. Connection Management: Single Connections vs. Pooling

Establishing a new TCP/IP connection to a database server for every SQL query is a major performance bottleneck:

- Each connection requires a TCP 3-way handshake, TLS negotiation (if secure), authentication checks, and database process/thread allocation.
- **Connection Pooling**: Solves this by establishing a persistent pool of active database connections when the application boots. When a query needs to execute, the application rents a connection from the pool, runs the SQL, and immediately returns it to the pool:

```
                  CONNECTION POOLING PATTERN

[ Server Inst 1 ] ---\        +--------------------+        +---------------+
                      --->   |  Connection Pool   |  ====>  |   Database    |
[ Server Inst 2 ] --->       |  [Active Conns]    |  (TCP)  |   Postgres /  |
                      --->   |  (e.g., Max: 50)   |         |   MySQL       |
[ Server Inst 3 ] ---/        +--------------------+        +---------------+
```

Key pool settings to tune:

- `minConnections`: The baseline number of idle connections kept open.
- `maxConnections`: The hard limit of concurrent connections.
- `idleTimeout`: Time after which unused connections above the minimum are closed.
- `connectionTimeout`: Max time a query waits for an available connection before failing.

### 3. The Query Planner & Optimizer

SQL is declarative; developers describe _what_ data they want, not _how_ to get it. The database engine's **Query Planner** translates SQL into an execution plan:

1. **Parser**: Checks SQL syntax and generates a parse tree.
2. **Rewriter**: Applies logical transformations (e.g., expanding views into base queries).
3. **Optimizer**: Evaluates multiple execution pathways (sequential scans, index scans, nested loops, hash joins) and calculates a cost estimate based on database table statistics.
4. **Executor**: Runs the lowest-cost physical execution plan against the data storage layer.

### 4. Memory Buffers & Shared Buffers

RDBMS engines are designed to minimize slow disk I/O:

- **Buffer Pool (MySQL) / Shared Buffers (PostgreSQL)**: An allocated block of system memory where the database caches active tables and index data pages.
- **Read Flow**: When a query requests a row, the engine checks if the target data page is in the buffer pool (Buffer Hit). If not (Buffer Miss), it reads the page from disk, loads it into the buffer pool, and returns the row.
- **Eviction**: When the buffer pool is full, pages are evicted, typically using a Least Recently Used (LRU) algorithm.

---

## Real-World Production Learnings

In our early Node.js API deployment, we observed that under traffic spikes (e.g., 500 concurrent requests/sec), our API endpoints suddenly returned HTTP 500 errors and timed out. The database server (PostgreSQL) CPU utilization was pinned at 98%.

Our application logs showed:
`Error: remaining connection slots are reserved for non-replication superuser connections`

**The Diagnostic**:

1. We were launching database connections dynamically on every HTTP request handlers using a basic driver instance without pooling.
2. PostgreSQL defaults to `max_connections = 100`. During spikes, Node.js opened connections beyond 100, causing Postgres to reject queries.
3. Establishing over 100 concurrent OS processes on the Postgres host caused high context-switching overhead, exhausting CPU capacity.

**The Refactor**:
We implemented a two-tiered pooling strategy:

1. We configured our client-side database libraries (`pg`) to use a bounded pool:
   ```javascript
   const { Pool } = require('pg');
   const dbPool = new Pool({
     max: 20, // Max 20 persistent connections per Node.js server instance
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```
2. We deployed **PgBouncer** (a lightweight middleware connection pooler for PostgreSQL) in front of our database, configured in **Transaction Mode**. PgBouncer multiplexed hundreds of client-side connections down to a pool of 30 physical PostgreSQL server connections.

After deploying PgBouncer and client pools, the database connection count dropped from a fluctuating peak of 700 connections down to a steady, flat line of 30. DB CPU utilization fell from 98% to 15% under identical load, and connection timeout errors were fully resolved.

---

## Related Reading

- [SQL Indexing & Performance](./sql-indexing-performance.md)
- [Transactions & ACID Guarantees](./transactions-acid.md)
- [PostgreSQL Advanced Features](./postgresql-features.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.relational.basics.md)
