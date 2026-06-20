[⬅️ Back to Databases & Data Modeling](../README.md)

# Schema Evolution & Migrations

A comprehensive guide on zero-downtime database migrations, backward and forward compatibility, the Expand and Contract pattern, and database lock management.

---

## Why It Matters

Software updates require database structures to evolve over time. However, unlike API application instances, databases cannot be rebooted or taken offline easily. Running locking DDL (Data Definition Language) commands—such as renaming an active column or changing a column's data type directly—forces exclusive tables locks, queuing incoming queries and causing system-wide timeouts. To achieve **Zero-Downtime Deployments**, backend engineers must decouple database migrations from code releases, executing schema changes in backward- and forward-compatible phases.

---

## Core Concepts

### 1. Schema Compatibility Bounds

During rolling or canary deployments, old and new application versions run concurrently, sharing the same database. Migrations must maintain compatibility boundaries:

- **Backward Compatibility**: New code can successfully read data written by old schemas.
- **Forward Compatibility**: Old code can successfully read data written by new schemas. This prevents active client nodes from crashing when a database schema updates _before_ those nodes are upgraded.

### 2. The Expand and Contract Pattern

To execute breaking schema changes (e.g., renaming a column, changing a data type, or splitting tables) without offline events, engineers utilize the **Expand and Contract** pattern.

#### Example: Renaming `phone` to `mobile_number`

```
Phase 1: EXPAND ----------> Add nullable column "mobile_number".
                            (Both columns exist simultaneously)

Phase 2: DOUBLE-WRITE ----> Deploy code: writes to "phone" AND "mobile_number";
                            reads from "phone".

Phase 3: BACKFILL --------> Run background script: copy historical data
                            from "phone" to "mobile_number" in batches.

Phase 4: READ-SWITCH -----> Deploy code: read and write exclusively
                            from/to "mobile_number".

Phase 5: CONTRACT --------> Drop legacy column "phone" from database.
```

1. **Expand (Database)**: Add the new column `mobile_number` (must be nullable or have a default value).
2. **Transition Write (Code)**: Deploy code that writes to _both_ columns (`phone` and `mobile_number`) but continues reading from the old column `phone`.
3. **Backfill (Data)**: Run a background batch worker to copy historical values from `phone` to `mobile_number` for existing rows.
4. **Switch Read (Code)**: Deploy code that reads and writes exclusively to `mobile_number`.
5. **Contract (Database)**: Drop the old column `phone` from the database.

### 3. Database Lock Management

DDL commands in relational databases require access locks. To prevent migrations from blocking active API queries:

- **Set Lock Timeout**: By default, migrations will wait indefinitely to acquire a lock. If a migration waits behind a long-running read query, all subsequent SELECT/INSERT queries block behind the migration, crashing the API. Always configure a lock timeout:
  ```sql
  -- Postgres: abort migration if lock is not acquired in 2 seconds
  SET lock_timeout = '2s';
  ALTER TABLE customers ADD COLUMN age INTEGER;
  ```
- **Avoid Default Value Pitfalls**: Prior to PostgreSQL v11, adding a column with a default value (`DEFAULT 'active'`) locked and rewrote the entire table heap. In modern versions, this is a metadata-only operation and takes milliseconds.
- **Add Indexes Concurrently**: Standard index creation locks the table for writes. Use the `CONCURRENTLY` keyword to build indexes in the background:
  ```sql
  CREATE INDEX CONCURRENTLY idx_users_status ON users (status);
  ```

---

## Real-World Production Learnings

In our e-commerce platform, we needed to rename the `phone` column to `mobile_number` on our `customers` table (30 million rows). A developer wrote a migration script containing:

```sql
-- Legacy Locking Rename Migration
ALTER TABLE customers RENAME COLUMN phone TO mobile_number;
```

When this migration executed in production during peak hours:

1. The `RENAME` operation requested an exclusive `AccessExclusiveLock` on the `customers` table.
2. A long-running analytics query was active, forcing the migration to wait.
3. All incoming checkout API requests trying to read or insert into `customers` queued behind the migration lock.
4. The database connection pool exhausted within seconds, taking our checkout service offline for 25 minutes.

**The Correction**:
We adopted the **Expand and Contract pattern** as our engineering standard:

- We added `mobile_number` as a nullable field in a metadata-only migration.
- We deployed code that updated both columns on writes.
- We ran a batch backfill script:
  ```sql
  -- Batched non-blocking backfill script
  UPDATE customers
  SET mobile_number = phone
  WHERE id >= $1 AND id < $2 AND mobile_number IS NULL;
  ```
  We updated rows in batches of 5,000, sleeping for 1 second between queries to yield locks to concurrent checkout transactions.
- Once synchronized, we modified our API queries to read only from `mobile_number`.
- We dropped the old `phone` column during off-hours, ensuring zero downtime.
- We also integrated a global migration lock guard in our database migration system:
  ```javascript
  // Enforce lock timeout in migration runner config
  await db.query("SET lock_timeout = '2000'");
  ```

---

## Related Reading

- [Data Modeling Fundamentals](./basics.md)
- [JSON Schema Validation](./json-schema-validation.md)
- [Relational Database Basics](../relational/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.data-modeling.schema-evolution-migrations.md)
