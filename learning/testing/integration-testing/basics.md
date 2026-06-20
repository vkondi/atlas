[⬅️ Back to Testing](../README.md)

# Integration Testing Foundations

An operational guide to verifying structural interfaces, integrating database and filesystem adapters, utilizing Testcontainers, and managing database state isolation.

---

## Why It Matters

While unit tests validate isolated logic, they cannot confirm that your system functions correctly when modules interact. Bugs often hide in the integration boundaries—such as mismatches between ORM configurations and database constraints, incompatible parameters passed between services, or unhandled exceptions thrown by real filesystem drivers.

Integration testing addresses this by validating interactions across boundary interfaces. However, traditional approaches often use in-memory databases (e.g., SQLite fakes for PostgreSQL backends) or mock network layers, which hide structural and dialect incompatibilities. Transitioning to containerized, high-fidelity integration testing is necessary to catch environmental bugs before they reach production.

---

## Core Concepts

### 1. Defining Integration Boundaries

Unlike unit tests, integration tests require external runtime resources. Setting up these resources requires defining the scope of integration:

```
+------------------+     +--------------------+     +-------------------+
|  SERVICE LAYER   | --> |     ORM / QUERY    | --> | DOCKER CONTAINER  |
| (Business logic) |     | (Prisma/Sequelize) |     |  (Postgres/Redis) |
+------------------+     +--------------------+     +-------------------+
```

- **Database Integrations**: Validates schema migrations, transactional constraints, unique index conflicts, and dialect-specific queries.
- **Filesystem Integrations**: Verifies file reads/writes, directory permissions, and disk space exhaustion handling.
- **External Caches (Redis)**: Confirms cache-invalidation logic, TTL enforcement, and connection retry states.

### 2. Testcontainers vs. In-Memory Fakes

Using in-memory mocks or fakes (like SQLite or `redis-mock`) is common because they are fast and do not require external software. However, they lack compatibility:

1. **SQL Dialects**: PostgreSQL features like `JSONB`, `uuid-ossp`, and window functions do not exist or behave differently in SQLite.
1. **Concurrency and Locks**: SQLite locks the entire database file during writes, making it impossible to test production isolation locks (e.g., `SELECT ... FOR UPDATE`).
1. **API Parity**: Mock Redis adapters lack support for complex structures like Streams, Pub/Sub, or script executions.

**Testcontainers** is a library that allows Node.js, Go, or Java runtimes to provision actual Docker containers (such as PostgreSQL, Redis, or Kafka) programmatically from within the test code.

### 3. Database State Management

For integration tests to remain reliable, they must start from a known database state. There are two primary strategies for managing this state:

1. **Transaction Rollbacks**: Wrapping each test case inside a transaction and executing a rollback during `afterEach`. This is fast, but it prevents testing explicit transaction code or concurrent connection pools.
1. **Truncation / Wiping**: Truncating all tables between test executions. This is highly realistic and compatible with multi-connection scenarios, but requires executing database commands (e.g., `TRUNCATE TABLE`) before every test case.

---

## Real-World Production Learnings

We operated a high-throughput booking engine that allocated unique seat numbers for concurrent airline bookings, using a PostgreSQL database with row-level locking (`SELECT ... FOR UPDATE`).

**The Failure**:
Our test suite was configured to use SQLite in-memory during testing. All integration tests passed locally and in CI. However, immediately after deploying a new feature to staging, **multiple customers checked out with the exact same seat allocations**, resulting in double-bookings and corrupted reservation states.

**The Diagnostic**:

1. **Syntactic and Semantic Discrepancy**: The booking logic relied on transaction locks to prevent race conditions:
   ```sql
   SELECT * FROM seats WHERE id = $1 FOR UPDATE;
   ```
2. **Silent Failure in Test Environment**: In SQLite, the query parser ignored the `FOR UPDATE` clause because it is not supported. As a result, the integration tests executed successfully without actually validating the lock behavior.
3. **Flawed Concurrency Assumptions**: The testing runner was unable to simulate concurrent connections competing for the same row locks.

**The Refactor**:
We discarded SQLite-based mocking and implemented a PostgreSQL Testcontainer within our Vitest suite, forcing tests to validate true database locking:

```typescript
// src/integration-tests/booking.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import { reserveSeat } from './booking-service';

describe('Booking Service Concurrent Locks Integration', () => {
  let container: StartedPostgreSqlContainer;
  let dbClient: Client;

  beforeAll(async () => {
    // 1. Provision an actual PostgreSQL instance in Docker
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('booking_test')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    // 2. Initialize connection client
    dbClient = new Client({
      connectionString: container.getConnectionString(),
    });
    await dbClient.connect();

    // 3. Apply schema migrations
    await dbClient.query(`
      CREATE TABLE seats (
        id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(20) NOT NULL,
        reserved_by VARCHAR(50)
      );
    `);
  }, 30000); // 30s timeout to allow Docker image pull

  afterAll(async () => {
    await dbClient.end();
    await container.stop();
  });

  beforeEach(async () => {
    // 4. Reset database state before each test case
    await dbClient.query('TRUNCATE TABLE seats;');
    await dbClient.query(`
      INSERT INTO seats (id, status) VALUES 
      ('seat-1A', 'available'),
      ('seat-1B', 'available');
    `);
  });

  it('should prevent double booking using row-level locks', async () => {
    // ARRANGE: Establish two separate concurrent connection clients
    const clientA = new Client({
      connectionString: container.getConnectionString(),
    });
    const clientB = new Client({
      connectionString: container.getConnectionString(),
    });
    await clientA.connect();
    await clientB.connect();

    // ACT: Run concurrent seat reservation attempts for the same seat
    const reservationA = reserveSeat(clientA, 'seat-1A', 'user-alpha');
    const reservationB = reserveSeat(clientB, 'seat-1A', 'user-beta');

    // Both clients try to reserve. One must win, the other must throw lock/concurrency failure.
    const results = await Promise.allSettled([reservationA, reservationB]);

    // ASSERT: Verify one succeeded and the other failed
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Verify database persists correct state
    const res = await dbClient.query(
      'SELECT status, reserved_by FROM seats WHERE id = $1',
      ['seat-1A'],
    );
    expect(res.rows[0].status).toBe('reserved');
    expect(['user-alpha', 'user-beta']).toContain(res.rows[0].reserved_by);

    await clientA.end();
    await clientB.end();
  });
});
```

By switching to Testcontainers:

- Real transactional row locks were executed and verified, preventing double-bookings.
- Schema compatibility was guaranteed since the tests used the same database engine version as production.
- Developers can run the exact same integration test suite locally without needing a pre-configured database server.

---

## Related Reading

- [Unit Testing Basics](../unit-testing/basics.md)
- [Component Integration Testing](./component-testing.md)
- [API Testing via Supertest](./api-testing-supertest.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.testing.integration-testing.basics.md)
