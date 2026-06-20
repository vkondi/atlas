[⬅️ Back to Databases & Data Modeling](../README.md)

# Advanced PostgreSQL

An exploration of PostgreSQL's enterprise capabilities, covering JSONB document modeling, GIN indexing, Window Functions, declarative partitioning, and high-performance connection pooling.

---

## Why It Matters

PostgreSQL is a hybrid object-relational database. While many developers limit its use to standard relational columns, Postgres natively supports semi-structured JSON document storage, complex analytical window functions, and physical table partitioning. Failing to utilize these features often leads to unnecessary architectural complexity, such as spinning up and maintaining separate document databases (like MongoDB) or search servers (like Elasticsearch) when Postgres could handle the workload natively at lower cost and latency.

---

## Core Concepts

### 1. JSON vs. JSONB (Semi-Structured Data)

Postgres provides two data types for storing JSON documents:

- **`JSON`**: Stores the payload as an exact copy of the input text.
  - _Writes_: Fast, since no parsing occurs.
  - _Reads_: Slow. Every extraction query requires parsing the raw JSON string on the fly.
- **`JSONB`**: Parses and stores the document in a decomposed binary format.
  - _Writes_: Slower, due to structural analysis and conversion overhead at write-time.
  - _Reads_: Fast. Properties are looked up in binary format without reprocessing text.
  - _Indexing_: Highly optimizable. Supports **GIN (Generalized Inverted Indexes)** to index nested keys and array values.

#### GIN Indexing Example

If a table has a `JSONB` column named `metadata`, we can query it using containment operators (`@>`):

```sql
-- Query checking if metadata JSON contains a specific role
SELECT * FROM users WHERE metadata @> '{"role": "admin"}';

-- Create a GIN Index to make this query execute in milliseconds
CREATE INDEX idx_users_metadata ON users USING gin (metadata);
```

### 2. Window Functions

Window Functions perform calculations across a set of table rows related to the current row, but unlike standard aggregates (like `SUM` or `COUNT`), they do not collapse the rows into a single summary output. Individual row details are preserved:

```sql
SELECT
  employee_id,
  department_id,
  salary,
  -- Calculate average salary of the employee's department
  AVG(salary) OVER(PARTITION BY department_id) as dept_avg_salary,
  -- Rank employees by salary within their department
  RANK() OVER(PARTITION BY department_id ORDER BY salary DESC) as salary_rank
FROM employees;
```

- `PARTITION BY`: Divides the rows into groups (windows) to apply the calculation.
- `ORDER BY`: Defines the sorting order within the window.

### 3. Declarative Table Partitioning

As tables grow to hundreds of millions of rows, index lookup speeds degrade, and operations like `VACUUM` create heavy disk write pressure. Table Partitioning splits a logically large table into smaller physical tables (partitions) based on a partition key:

- **Range Partitioning**: Divides rows based on a range (e.g., partitioning an audit log by date ranges: monthly or yearly).
- **List Partitioning**: Divides rows by a list of explicit values (e.g., partitioning users by country code).
- **Hash Partitioning**: Divides rows by a modulus and remainder of a hash function.

```sql
-- Create the parent partitioning table
CREATE TABLE logs (
    id bigint NOT NULL,
    log_date date NOT NULL,
    message text
) PARTITION BY RANGE (log_date);

-- Create a physical partition for June 2026
CREATE TABLE logs_y2026m06 PARTITION OF logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

> [!TIP]
> The query planner executes **Query Pruning** when querying partitioned tables. If a query requests data for `log_date = '2026-06-15'`, the planner ignores all other partition tables, scanning only `logs_y2026m06`. This keeps memory and index search space extremely small.

### 4. Connection Pooling: PgBouncer Modes

For high-throughput systems, using a lightweight connection pooler like **PgBouncer** is standard practice. PgBouncer supports three pooling modes:

1. **Session Pooling (Default)**: Keeps the server connection open for the duration of the client's socket connection. Low efficiency for microservices.
2. **Transaction Pooling (Recommended for APIs)**: PgBouncer assigns a physical connection to the client _only_ for the duration of a database transaction. Once the transaction completes, the connection is returned to the pool to be shared by another client.
3. **Statement Pooling**: Allocates connections per SQL query. _Caution_: Prevents using multi-statement transactions.

---

## Real-World Production Learnings

In our user activity logging system, we stored JSON event payloads from our client apps. Within a year, the `activity_logs` table had reached 150 million rows. Simple search queries checking for specific event types (e.g., searching JSON payload for key `{"event": "checkout"}`) took over 12 seconds to return, stalling our admin panels.

**The Diagnostic**:

1. The JSON column was configured as type `JSON` (not `JSONB`), meaning PostgreSQL had to scan and parse 150 million raw text strings sequentially.
2. The table was unpartitioned, so every query scanned the entire historical table index.

**The Refactor**:

1. We migrated the column type from `JSON` to `JSONB`.
2. We set up range partitioning on the `created_at` column monthly.
3. We created a GIN index on the `payload` JSONB column:
   ```sql
   CREATE INDEX idx_activity_logs_payload ON activity_logs USING gin (payload);
   ```
4. We set up a cron job to automatically create the physical partition table for the next month (`activity_logs_y2026m07`) and drop historical partitions older than 12 months.

**The Result**:
Search query latency plummeted from **12 seconds to 8 milliseconds**. Because the query planner executed query pruning, queries filtered by date ranges only scanned the active month's partition. Furthermore, archiving expired logs became a simple metadata command (`DROP TABLE activity_logs_y2025m06`) rather than running slow, locking `DELETE` statements that overloaded Postgres's autovacuum process.

---

## Related Reading

- [Relational Database Basics](./basics.md)
- [SQL Indexing & Performance](./sql-indexing-performance.md)
- [Transactions & ACID Guarantees](./transactions-acid.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.relational.postgresql-features.md)
