[⬅️ Back to Databases & Data Modeling](../README.md)

# SQL Indexing & Performance

A technical guide on relational index types, table access patterns, query planner analysis using EXPLAIN ANALYZE, and index-friendly query optimization.

---

## Why It Matters

Relational databases remain highly responsive at scale only if they can target data pages efficiently. Without indexes, database engines must execute a **Sequential Scan**, reading every data page from disk. However, indexing is not a silver bullet. Indexes occupy storage space and slow down write operations (`INSERT`, `UPDATE`, `DELETE`) because index keys must be updated synchronously. Misconfiguring compound indexes or writing queries with mathematical manipulations on indexed columns forces the database planner to ignore indexes, causing sudden performance drops.

---

## Core Concepts

### 1. Index Types & Structures

Different indices organize search data differently to optimize target access patterns:

- **B-Tree (Balanced Tree)**: The default and most common index. Organizes data sorted in a self-balancing hierarchical tree (Root, Branch, and Leaf nodes).
  - _Best for_: Equality checks (`=`), range lookups (`<`, `<=`, `>`, `>=`), and sorting (`ORDER BY`).
  - _Time Complexity_: $O(\log N)$ search path.
- **Hash Index**: Maps index keys to flat hash slots.
  - _Best for_: Exact equality (`=`) checks.
  - _Drawback_: Cannot perform range lookups or sort scans.
- **GIN (Generalized Inverted Index)**: Maps element values to a list of row identifiers.
  - _Best for_: Columns storing composite arrays or `JSONB` documents.

### 2. Table Access Patterns

When evaluating a query, the planner chooses one of these primary strategies to extract rows:

- **Sequential Scan (Seq Scan)**: The database scans the entire table heap page-by-page. For small tables (< 10,000 rows) this is fast, but it scales poorly for large datasets.
- **Index Scan**: The engine traverses the B-Tree index to find matching keys, retrieves the physical row pointers (TIDs), and performs a secondary look up in the main table heap to fetch remaining column values.
- **Index Only Scan (Covering Index)**: If all columns requested in the `SELECT` clause are stored directly inside the index itself, the database bypasses reading the table heap entirely and returns data directly from the index nodes, saving substantial disk I/O.

```sql
-- Creating a covering index using the INCLUDE clause (PostgreSQL)
CREATE INDEX idx_users_covering ON users (email) INCLUDE (username, status);

-- This query executes as a high-performance Index Only Scan
SELECT username, status FROM users WHERE email = 'user@example.com';
```

### 3. Query Diagnostics via EXPLAIN ANALYZE

To diagnose why a query is slow, developers append `EXPLAIN ANALYZE` before the SQL statement:

- `EXPLAIN`: Outputs the planned execution tree, including cost estimates (represented in arbitrary units of page fetch reads) and estimated row sizes.
- `EXPLAIN ANALYZE`: Executes the query and returns the _actual_ duration (in milliseconds), actual row counts, and buffer hit metrics.

#### Warning Signs in Execution Plans

1. **Seq Scan on Large Tables**: Indicates a missing index or an index-defeating query.
2. **Discrepancy in Rows**: If the planner's _estimated_ rows differ significantly from the _actual_ rows, the database statistics are stale. Run `ANALYZE table_name` to update them.
3. **Filter nodes**: If an index scan is followed by a heavy `Filter` step, the index did not filter rows sufficiently. Consider a compound index.

### 4. Non-Sargable Queries (Index Killers)

A query is **SARGable** (Search Argument Able) when the database engine can traverse the sorted index directly to locate keys. Wrapping an indexed column in functions or using wildcards at the beginning of strings renders it **Non-SARGable**:

| Non-SARGable (Fails Index)                    | SARGable (Uses B-Tree Index)                  | Reason                                       |
| :-------------------------------------------- | :-------------------------------------------- | :------------------------------------------- |
| `WHERE LOWER(email) = 'admin@api.com'`        | `WHERE email = 'admin@api.com'`               | Functions prevent B-Tree traversing.         |
| `WHERE created_at + interval '1 day' > NOW()` | `WHERE created_at > NOW() - interval '1 day'` | Arithmetic isolation disables index lookups. |
| `WHERE username LIKE '%admin'`                | `WHERE username LIKE 'admin%'`                | Leading wildcards prevent index alignment.   |

---

## Real-World Production Learnings

In our e-commerce platform, our order search dashboard took over **3.5 seconds** to load order histories for active days.

The query executed was:

```sql
SELECT order_id, customer_id, total, status
FROM orders
WHERE DATE_TRUNC('day', order_date) = '2026-06-01' AND status = 'COMPLETED';
```

We ran `EXPLAIN ANALYZE` and got:

```text
Seq Scan on orders  (cost=0.00..51240.20 rows=380 width=24) (actual time=12.20..3422.10 rows=410 loops=1)
  Filter: ((date_trunc('day'::text, order_date) = '2026-06-01'::date) AND (status = 'COMPLETED'::text))
```

The execution plan confirmed a **Sequential Scan** was occurring on our 80-million-row `orders` table. Even though we had separate indexes on `order_date` and `status`, they were ignored because the `DATE_TRUNC()` function was applied to the column in the condition.

**The Refactor**:

1. We modified the query to isolate the column, converting the date filter into a range expression (SARGable):
   ```sql
   SELECT order_id, customer_id, total, status
   FROM orders
   WHERE order_date >= '2026-06-01 00:00:00'
     AND order_date < '2026-06-02 00:00:00'
     AND status = 'COMPLETED';
   ```
2. We generated a composite **Covering Index** that matched the equality check first, the range search second, and loaded the extra columns inside the index payload via the `INCLUDE` clause:
   ```sql
   CREATE INDEX idx_orders_performance
   ON orders (status, order_date)
   INCLUDE (order_id, customer_id, total);
   ```

We ran `EXPLAIN ANALYZE` again:

```text
Index Only Scan using idx_orders_performance on orders  (cost=0.42..15.30 rows=410 width=24) (actual time=0.05..1.80 rows=410 loops=1)
```

The plan transitioned to an **Index Only Scan**. Average execution times dropped from **3.5 seconds to 1.8 milliseconds**, resolving the dashboard timeouts and dramatically decreasing our database server disk read metrics.

---

## Related Reading

- [Relational Database Basics](./basics.md)
- [Advanced PostgreSQL](./postgresql-features.md)
- [Transactions & ACID Guarantees](./transactions-acid.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.relational.sql-indexing-performance.md)
