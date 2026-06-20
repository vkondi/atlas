[⬅️ Back to Databases & Data Modeling](../README.md)

# Database Transactions & ACID

A technical analysis of ACID transaction guarantees, SQL isolation levels, Multi-Version Concurrency Control (MVCC) mechanics, and database lock contention mitigation.

---

## Why It Matters

In high-concurrency environments, multiple clients read and write to the same database rows simultaneously. Without transaction boundaries and concurrency control, systems suffer from race conditions: double-spending, negative inventory stock, lost updates, and corrupted data. Relational databases resolve this using the **ACID** transaction model. However, developers must understand the trade-offs of transaction isolation levels and lock designs: configuring isolation too strictly kills system concurrency, while configuring it too permissively introduces silent data anomalies.

---

## Core Concepts

### 1. ACID Transaction Guarantees

A database transaction is a logical unit of work that groups multiple SQL operations. To ensure reliability, RDBMS engines enforce four core properties:

- **Atomicity**: The "all-or-nothing" rule. Either all operations inside the transaction commit successfully, or the entire transaction is rolled back, leaving the database completely unchanged.
- **Consistency**: Enforces that a transaction can only transition the database from one valid state to another, satisfying all schema constraints (e.g., check constraints, unique constraints, foreign keys).
- **Isolation**: Controls how changes made by one transaction are visible to other concurrent transactions.
- **Durability**: Guarantees that once a transaction commits, its modifications are permanently recorded in non-volatile storage (typically via a **Write-Ahead Log - WAL**) and will survive system crashes or power losses.

### 2. Isolation Levels & Concurrency Anomalies

SQL defines four transaction isolation levels to balance concurrency against read anomalies. The levels are defined by which read phenomena they prevent:

| Isolation Level                       | Dirty Reads | Non-Repeatable Reads | Phantom Reads                   |
| :------------------------------------ | :---------- | :------------------- | :------------------------------ |
| **Read Uncommitted**                  | Allowed     | Allowed              | Allowed                         |
| **Read Committed** (Postgres default) | Prevented   | Allowed              | Allowed                         |
| **Repeatable Read**                   | Prevented   | Prevented            | Allowed (Prevented in Postgres) |
| **Serializable**                      | Prevented   | Prevented            | Prevented                       |

#### Read Anomalies Explained:

- **Dirty Read**: Transaction A reads data modified by Transaction B that has not committed yet. If Transaction B rolls back, Transaction A operated on invalid data.
- **Non-Repeatable Read**: Transaction A reads a row. Transaction B updates that same row and commits. Transaction A reads the row again and observes the modified values.
- **Phantom Read**: Transaction A queries a range of rows matching a condition. Transaction B inserts a new row that matches the condition and commits. Transaction A re-runs the range query and sees the "phantom" row.

### 3. Multi-Version Concurrency Control (MVCC)

Modern databases use **MVCC** to allow concurrent reads and writes without blocking each other ("readers don't block writers, writers don't block readers"):

- Instead of locking rows for every read operation, the database maintains multiple physical versions of each row.
- When Transaction A updates a row, the database does not overwrite the old row in-place. It marks the old row version as expired and inserts a new row version with active transaction bounds.
- **Garbage Collection / VACUUM**: Expired row versions are referred to as **Dead Tuples**. If left uncleaned, they inflate index sizes and trigger sequential scans. In PostgreSQL, the **Autovacuum** daemon runs in the background to reclaim space occupied by dead tuples.

### 4. Lock Contention & Deadlocks

When MVCC is insufficient, applications must enforce logical constraints using locks:

- **Shared Lock (`FOR SHARE`)**: Acquired when reading. Multiple transactions can hold shared locks on a row concurrently, but no transaction can write to it.
- **Exclusive Lock (`FOR UPDATE`)**: Acquired during updates. Prevents other transactions from acquiring shared or exclusive locks on the row.
- **Deadlock**: Occurs when two transactions hold locks on separate resources and wait for each other to release their locks:

```
Transaction 1: Holds Lock on Row A ----> Waits for Lock on Row B
                                            ^
                                            |
Transaction 2: Holds Lock on Row B ----> Waits for Lock on Row A
```

RDBMS engines feature deadlock detectors that automatically identify circular waits, abort one transaction (releasing its locks), and allow the other to proceed.

---

## Real-World Production Learnings

In our flash-sale ticket booking application, we observed that during high-traffic checkout events, our ticket inventory database suffered from duplicate ticket purchases (overselling) and negative inventory counts.

Our checkout code executed:

```javascript
// Node.js Express Handler
const ticket = await db.query('SELECT stock FROM tickets WHERE id = $1', [
  ticketId,
]);
if (ticket.stock > 0) {
  await db.query('UPDATE tickets SET stock = stock - 1 WHERE id = $1', [
    ticketId,
  ]);
  await bookTicket();
}
```

Under load, two requests read `stock = 1` concurrently. Both evaluated the `if (ticket.stock > 0)` check to `true`, and both executed the `UPDATE` statement, dropping the stock count to `-1` and selling the same physical ticket twice.

We initially attempted to resolve this by upgrading our database isolation level to **Serializable**:

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

This solved the overselling issue, but our checkout throughput plummeted because Postgres aborted up to 45% of concurrent checkout transactions with serialization failure errors (`code: 40001` - could not serialize access due to concurrent update). Users experienced failed checkouts and had to retry.

**The Solution**:
We returned the transaction isolation level to **Read Committed** and implemented pessimistic concurrency control using **Pessimistic Locking** (`SELECT FOR UPDATE`):

```javascript
// Transaction block with Row-Level Locking
await db.query('BEGIN');
try {
  // Acquires an exclusive lock on the row, forcing concurrent requests to wait
  const result = await db.query(
    'SELECT stock FROM tickets WHERE id = $1 FOR UPDATE',
    [ticketId],
  );

  if (result.rows[0].stock > 0) {
    await db.query('UPDATE tickets SET stock = stock - 1 WHERE id = $1', [
      ticketId,
    ]);
    await db.query('COMMIT');
    // Proceed with booking
  } else {
    await db.query('ROLLBACK');
    throw new Error('Tickets sold out');
  }
} catch (err) {
  await db.query('ROLLBACK');
  throw err;
}
```

By switching to pessimistic locking, concurrent checkout requests for the same ticket were queued sequentially at the database boundary. This eliminated duplicate bookings completely and eliminated the serialization failures, keeping our system checkout flow smooth and reliable.

---

## Related Reading

- [Relational Database Basics](./basics.md)
- [Advanced PostgreSQL](./postgresql-features.md)
- [SQL Indexing & Performance](./sql-indexing-performance.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.databases.relational.transactions-acid.md)
