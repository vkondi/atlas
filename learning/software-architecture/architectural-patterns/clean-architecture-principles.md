[⬅️ Back to Software Architecture](../README.md)

# Clean & Hexagonal Architecture

An analysis of Onion and Hexagonal (Ports & Adapters) architectures, the Dependency Inversion Principle, and boundaries decoupling core business logic from external frameworks.

---

## Why It Matters

Core business logic (domain entities, transaction rules) represents the unique value of an application. Databases, web routers, message brokers, and third-party APIs are merely technical details. Directly coupling core business logic to external frameworks—such as writing SQL queries inside HTTP handlers or referencing web-router request objects inside service layers—makes code untestable in isolation. Clean and Hexagonal architectures solve this by isolating the application core behind interfaces, allowing developers to change frameworks, swap databases, or mock APIs without touching core business rules.

---

## Core Concepts

### 1. The Dependency Rule (Inward Direction)

Clean Architecture organizes code into concentric circles representing different levels of software abstraction:

```
               CLEAN ARCHITECTURE BOUNDARIES

      +-------------------------------------------------+
      |  Frameworks & Drivers (Postgres, Express, CLI)  |
      |   +-----------------------------------------+   |
      |   |  Interface Adapters (Controllers, Repos)|   |
      |   |   +---------------------------------+   |   |
      |   |   |  Use Cases (Application Rules)  |   |   |
      |   |   |   +-------------------------+   |   |   |
      |   |   |   | Entities (Domain Rules) |   |   |   |
      |   |   |   +-------------------------+   |   |   |
      |   |   +---------------------------------+   |   |
      |   +-----------------------------------------+   |
      +-------------------------------------------------+
                 DEPENDENCY DIRECTION: INWARD ONLY
```

- **The Rule**: Source code dependencies must only point **inward**. Code in an inner circle must never have references to elements of an outer circle.
- **The Core**: Use Cases and Entities represent the pure business logic. They are written in vanilla programming language syntax, completely free of references to external libraries like Knex, Express, or Axios.

### 2. Hexagonal Architecture: Ports & Adapters

Hexagonal Architecture partitions applications into an inner core and external infrastructure communicating via **Ports** and **Adapters**:

```
                       HEXAGONAL LAYOUT

   [ Primary Clients ] ===( Drive )===> [ Ports ]
   (HTTP Controller)                    (Interface)
                                             ||
                                             v
                                     +---------------+
                                     |  Application  |
                                     |     Core      |
                                     +---------------+
                                             ||
                                             v
   [ Driven Adapters ] <==( Implement )=[ Ports ]
   (Postgres Repo)                      (Interface)
```

- **Ports**: Outward-facing interface contracts defined by the Core:
  - _Driving Ports (Primary)_: Entry points to the core (e.g., Use Case interfaces called by HTTP Controllers or Queue Listeners).
  - _Driven Ports (Secondary)_: Exit points used by the core to fetch/send data (e.g., `UserRepository` interface, `SMSPort` interface).
- **Adapters**: Implementations that translate communications:
  - _Driving Adapters (Primary)_: Translate input payloads from external boundaries into core-compatible payloads (e.g., HTTP Controller extracting body parameters and calling a Use Case).
  - _Driven Adapters (Secondary)_: Implement the core's driven ports to talk to specific technologies (e.g., a `PostgresUserRepository` implementing `UserRepository`).

### 3. Dependency Inversion Principle (DIP)

To enforce the inward dependency rule while allowing the core to read/write to databases, we apply **Dependency Inversion**:

1. Instead of the Core Use Case importing the physical database file, the Core defines a Port (interface).
2. The database module resides in the outer circle and implements that interface.
3. At runtime, the database implementation is injected into the Core Use Case constructor via **Dependency Injection (DI)**.

---

## Real-World Production Learnings

In our subscription billing platform, we initially coupled our subscription renewal use cases directly to MongoDB and the Mongoose ORM:

```javascript
// Legacy tightly coupled use case
const MongooseUser = require('../models/MongooseUser');

async function renewSubscription(userId) {
  const user = await MongooseUser.findById(userId); // Tight coupling to Mongo ORM
  if (user.status === 'active') {
    await processPayment(user.paymentMethodToken);
    user.nextBillingDate = calculateNextDate();
    await user.save();
  }
}
```

When our finance department requested migrating our user accounts and transaction histories to PostgreSQL to enforce strict ACID compliance, we realized that Mongoose models, queries (`.find()`, `.aggregate()`), and MongoDB update functions were scattered across 250 service files. Migrating meant rewriting the entire application.

**The Refactor**:
We decoupled our core application layer using Hexagonal Architecture:

1. We defined a driven port `UserRepository` interface in the application core:
   ```javascript
   // core/ports/user-repository.ts (No database references)
   export interface UserRepository {
     findById(id: string): Promise<UserDomainModel>;
     save(user: UserDomainModel): Promise<void>;
   }
   ```
2. We rewrote our core use case to depend only on the port, passing it in the constructor:

   ```javascript
   // core/use-cases/renew-subscription.ts
   import { UserRepository } from '../ports/user-repository';

   export class RenewSubscription {
     constructor(private userRepo: UserRepository) {}

     async execute(userId: string): Promise<void> {
       const user = await this.userRepo.findById(userId);
       if (user.isActive()) {
         await this.userRepo.save(user);
       }
     }
   }
   ```

3. We wrote a `PostgresUserRepository` adapter in our infrastructure layer implementing the `UserRepository` interface.

By isolating the database details, we completed the database migration by writing the PostgreSQL adapter and changing our dependency injection bindings at startup. The migration required **zero modifications** to our core billing use cases, and we verified the use case in our test suite in milliseconds by passing an in-memory mock repository.

---

## Related Reading

- [Architectural Pattern Foundations](./basics.md)
- [Monolith vs Microservices](./monolith-vs-microservices.md)
- [Repository Pattern](../design-patterns/repository-pattern.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.architectural-patterns.clean-architecture-principles.md)
