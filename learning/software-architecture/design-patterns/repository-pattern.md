[⬅️ Back to Software Architecture](../README.md)

# Repository Pattern

A detailed analysis of the Repository pattern, abstracting database drivers, isolating query specifications, mapping domain models to database schemas, and enabling high-performance test mockability.

---

## Why It Matters

Writing database queries directly inside business services couples application logic to specific storage technologies, schemas, and driver SDKs. This forces developers to setup and spin up active databases during unit testing, slowing down feedback loops. The **Repository Pattern** addresses this by introducing a collection-like abstraction interface between the business logic and the data mapping layer. The core application interacts with the database as if it were a simple in-memory array, allowing engineers to refactor SQL tables, implement caching layers, or mock databases without modifying core business rules.

---

## Core Concepts

### 1. The Repository Abstraction Layer

The Repository acts as a mediator between the domain model layer and the data mapping infrastructure:

```
                  REPOSITORY LAYER SEGREGATION

   +-----------------------+
   |   Application Core    |
   | (Domain & Use Cases)  |
   +-----------------------+
               ||
               v (Calls standard collection interfaces)
   +-----------------------+
   |   UserRepository      |  <==== Domain Port (Interface)
   +-----------------------+
               ||
               +===================+
               || (Implements)     || (Implements)
               v                   v
   +-----------------------+   +-----------------------+
   | PostgresUserRepository|   | InMemoryUserRepository| <== For Unit
   | (Infrastructure SQL)  |   | (In-Memory Array Map) |     Testing
   +-----------------------+   +-----------------------+
```

- **Domain Model vs. DB Entity**: Databases represent data optimized for storage (normalizations, table indices). Domain models represent data optimized for business operations (rules, encapsulation, invariants). The Repository maps table records to domain models during reads, and decomposes domain models back to table schemas during writes.
- **Encapsulating Query Logic**: Placing raw SQL (e.g., complex SQL inner joins, knex statements) inside a repository class prevents database detail leakage into application controllers.

### 2. Mocking and Testability

Unit testing should be fast and run in isolation.

- By using a repository interface, developers can create an `InMemoryUserRepository` that implements the interface using a basic JavaScript `Map`:

```typescript
class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}
```

Tests can instantiate this memory repository and pass it to use case constructors, executing tests in microseconds without Docker databases or network overhead.

---

## Real-World Production Learnings

In our financial ledger application, we originally wrote SQL queries (using `knex`) directly inside our Express route controllers:

```javascript
// Legacy controller with inline Knex queries
app.post('/transactions', async (req, res) => {
  const { amount, sourceAccount } = req.body;
  // Tight coupling to database client and table structures
  const account = await knex('accounts').where({ id: sourceAccount }).first();
  if (account.balance >= amount) {
    await knex('transactions').insert({ amount, sourceAccount });
    await knex('accounts')
      .where({ id: sourceAccount })
      .decrement('balance', amount);
    return res.status(200).json({ status: 'success' });
  }
});
```

This layout created multiple operational challenges:

1. To run our 75 validation unit tests, our CI/CD pipeline had to spin up a PostgreSQL Docker container, execute migrations, and seed mock data on every run. Our tests took **over 2 minutes** to execute.
2. When we decided to add a **Redis Caching Layer** to query user balances rapidly, we had to modify our SQL query code inside 12 different controllers, making it difficult to test for race conditions.

**The Refactor**:
We decoupled our database queries by implementing the Repository Pattern:

1. We defined a clean `TransactionRepository` port interface.
2. We moved all Knex SQL statements into a `SqlTransactionRepository` class.
3. We wrote a **Cached Repository Decorator** to handle Redis caching:

```javascript
class CachedTransactionRepository implements TransactionRepository {
  constructor(private sqlRepo: TransactionRepository, private redis: RedisClient) {}

  async findBalance(accountId) {
    const cached = await this.redis.get(`balance:${accountId}`);
    if (cached) return parseFloat(cached);

    // Fallback to SQL database if cache misses
    const balance = await this.sqlRepo.findBalance(accountId);
    await this.redis.set(`balance:${accountId}`, balance, 'EX', 300);
    return balance;
  }

  async saveTransaction(transaction) {
    // Write-through to database first
    await this.sqlRepo.saveTransaction(transaction);
    // Invalidate cached balance to prevent dirty reads
    await this.redis.del(`balance:${transaction.sourceAccount}`);
  }
}
```

We updated our Express controllers to only call `TransactionRepository`.

This refactor enabled us to integrate Redis caching in a single class without modifying any controller code. Additionally, we replaced our database connections in our unit tests with a mock `InMemoryTransactionRepository`, dropping our test run times from **2 minutes to 15 milliseconds** in our CI pipeline.

---

## Related Reading

- [Design Pattern Basics](./basics.md)
- [Clean Architecture Principles](../architectural-patterns/clean-architecture-principles.md)
- [Relational Database Basics](../../databases/relational/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.design-patterns.repository-pattern.md)
