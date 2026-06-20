[⬅️ Back to Software Architecture](../README.md)

# Event-Driven Architecture

A technical guide on asynchronous component communication, comparing message queue and event stream brokers, resolving idempotency and ordering challenges, and coordinating distributed transactions via Sagas.

---

## Why It Matters

Synchronous gRPC or REST calls between microservices create runtime dependencies (temporal coupling). If Service A calls Service B, which queries Service C, a failure or latency spike in C cascades up the chain, exhausting server threads and failing user requests. Event-Driven Architecture (EDA) decouples these systems by communicating asynchronously via event brokers. However, EDA introduces complex distributed systems problems: managing duplicate messages, resolving out-of-order event delivery, and executing multi-service transactions without traditional ACID database locks.

---

## Core Concepts

### 1. Message Queues vs. Log-Based Event Streams

Selecting the correct broker architecture depends on your data retention and ordering needs:

| Feature            | Message Queue (e.g., RabbitMQ, ActiveMQ)                                                                                              | Log-Based Event Stream (e.g., Apache Kafka, AWS Kinesis)                                                                                    |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **Model**          | **Smart Broker / Dumb Consumer**: Broker tracks which message has been read and deletes it immediately after consumer acknowledgment. | **Dumb Broker / Smart Consumer**: Broker appends messages to an immutable log partition on disk. Consumers maintain their own read offsets. |
| **Data Retention** | Transient. Messages are deleted once consumed.                                                                                        | Persistent. Messages are retained for a configured time (e.g., 7 days) or size limit, allowing replaying.                                   |
| **Ordering**       | Hard to guarantee when using multiple concurrent consumers on a single queue.                                                         | Guaranteed within a specific **Log Partition** by routing related messages using a partition key.                                           |
| **Scale Limits**   | Optimized for complex routing key patterns. Lower throughput bounds.                                                                  | Optimized for high-throughput, real-time log ingestion and data streaming pipelines.                                                        |

### 2. Idempotency & Out-of-Order Delivery

Because network connections drop and retry loops occur, distributed brokers guarantee **at-least-once delivery**. This means event consumers will eventually receive duplicate messages.

- **Idempotency**: A consumer is idempotent if receiving the identical message multiple times does not change the application state beyond the initial call.
  - _Idempotency Filter_: Enforced by saving the unique event ID in an atomic database table transaction. If a duplicate ID is received, the write fails, and the message is skipped:

```sql
-- Enforcing idempotency at the database boundary
INSERT INTO processed_events (event_id, processed_at)
VALUES ('evt_order_123', NOW());
-- Throws a unique constraint violation on duplicate events
```

- **Out-of-Order Delivery**: A network delay may cause an `OrderUpdated` event to arrive _before_ `OrderCreated`.
  - _Mitigation_: Include sequential version stamps or logical timestamps in event payloads. The consumer rejects incoming events if the event version is lower than the version stored in the database.

### 3. Distributed Transactions: The Saga Pattern

Since microservices maintain separate databases, locking tables across services using a Two-Phase Commit (2PC) is a major anti-pattern that causes latency and deadlocks. Instead, we implement the **Saga Pattern** (a sequence of local transactions). If a step fails, the system executes **Compensating Transactions** to undo the preceding steps in reverse order:

```
              SAGA CHOREOGRAPHY VS. ORCHESTRATION

   [ Choreography (Event-Driven) ]
   +-------------+       (OrderCreated)       +-------------------+
   |  Order Svc  | =========================> |   Inventory Svc   |
   +-------------+                            +-------------------+
   - Decentralized coordination. Services listen and react dynamically.

   [ Orchestration (Coordinator-Driven) ]
   +-------------+  ---( 1. Create Order )---> +------------------+
   |  Saga Mngr  |                             |    Order Svc     |
   +-------------+  <--( 2. Success Event )--- +------------------+
   - Centralized coordinator coordinates task sequences and rollbacks.
```

- **Choreography**: Each service listens to events and triggers its own local transaction. High decoupling, but difficult to monitor as the system scales.
- **Orchestration**: A central Saga Orchestrator coordinates the workflow, instructing services on what actions to run. Easier to track, but introduces a single point of coordinator failure.

---

## Real-World Production Learnings

In our fintech ledger system, our payment gateway processed transactions and published a `PaymentAuthorized` event to RabbitMQ. Our ledger consumer listened to this queue to record credit adjustments to user accounts.

During a routine cloud gateway migration, we experienced brief network timeouts. RabbitMQ redelivered unacknowledged events, causing our ledger service to receive duplicate payment events. Because our database handler ran a basic update query:

```sql
-- Legacy update query
UPDATE user_balances SET balance = balance + $1 WHERE user_id = $2;
```

The duplicate events ran sequentially, double-crediting user accounts and resulting in thousands of dollars in transaction mismatches.

**The Refactor**:
We implemented a **Pessimistic Idempotency Filter** using database constraints and unique event keys:

1. We updated our transaction event payload to include a unique event ID (`event_id: "evt_pay_8910"`).
2. We created a `processed_events` table in our ledger database.
3. We refactored our ledger handler to run both statements in a single SQL transaction block:

```javascript
const { Client } = require('pg');

async function processLedgerAdjustment(dbClient, userId, amount, eventId) {
  await dbClient.query('BEGIN');
  try {
    // Attempt to register the event ID. Will throw error if duplicate.
    await dbClient.query(
      'INSERT INTO processed_events (event_id, processed_at) VALUES ($1, NOW())',
      [eventId],
    );

    // Update user balance safely
    await dbClient.query(
      'UPDATE user_balances SET balance = balance + $1 WHERE user_id = $2',
      [amount, userId],
    );

    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK');
    if (err.code === '23505') {
      // Postgres Unique Violation code
      console.warn(`Duplicate event ignored: ${eventId}`);
      return; // Acknowledge and drop duplicate event safely
    }
    throw err; // Retry other transaction failures
  }
}
```

By enforcing this transaction filter, duplicate payment events were safely caught and discarded at the database boundary, ensuring ledger consistency during broker restarts.

---

## Related Reading

- [Architectural Pattern Foundations](./basics.md)
- [Monolith vs Microservices](./monolith-vs-microservices.md)
- [Clean Architecture Principles](./clean-architecture-principles.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.architectural-patterns.event-driven-architecture.md)
