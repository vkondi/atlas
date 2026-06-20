[⬅️ Back to Software Architecture](../README.md)

# Architectural Pattern Foundations

An analysis of high-level software component arrangements, strategic coupling and cohesion rules, Conway's Law alignment, and domain boundary definitions.

---

## Why It Matters

Software architecture represents the strategic, high-level decisions of a system that are difficult and expensive to change later. While design patterns govern localized code structures (e.g., class inheritances or interface types), architectural patterns dictate how subsystems are partitioned, how they communicate, and how they scale. Neglecting architectural foundations—such as designing highly coupled modules or failing to align software boundaries with team structures—directly leads to monolithic blockers, slow release velocities, and fragile codebases.

---

## Core Concepts

### 1. Software Architecture vs. Software Design

Architectural decisions and design patterns operate at different scales of detail:

- **Software Architecture**: The strategic structure of a system. Focuses on non-functional requirements (security, scalability, resilience) and system decomposition (e.g., choosing microservices, adopting a database, or enforcing clean boundaries).
  - _Cost of change_: High. Modifying architecture mid-project often requires rewriting entire modules or migrating databases.
- **Software Design**: The tactical organization of code. Focuses on implementation details within a boundary (e.g., writing classes, organizing functions, using design patterns like Factory or Adapter).
  - _Cost of change_: Low. Changes are localized and easily managed using standard refactoring tools and tests.

### 2. High Cohesion and Loose Coupling

The primary objective of software architecture is to balance two structural characteristics:

```
    HIGH COHESION (Within Module)              LOOSE COUPLING (Between Modules)

     +---------------------------+              +----------+        +----------+
     |       Module A            |              | Module A |<======>| Module B |
     |  [Task 1] [Task 2] [Task3]|              +----------+ (API)  +----------+
     |  (Related responsibilities)|              - Independent, contract-driven
     +---------------------------+              - Changes in A do not break B
```

- **Cohesion (Internal Focus)**: Refers to how closely related the responsibilities within a single module are.
  - _Target_: **High Cohesion**. A module should perform one logical task. For example, a `PaymentGateway` module should only process transactions; it should not handle invoice PDF generation or send confirmation emails.
- **Coupling (External Focus)**: Refers to the degree of interdependence between different modules.
  - _Target_: **Loose Coupling**. Modules should interact through thin, well-defined contracts (APIs or interfaces) without exposing their internal states. If Module A has tight coupling to Module B, modifying A's internal database schema will break B, creating a cascade of failures.

### 3. Conway's Law and The Inverse Conway Maneuver

Melvin Conway observed that:

> "Organizations which design systems are constrained to produce designs which are copies of the communication structures of these organizations."

- **The Problem**: If an organization has three siloed teams—a Frontend Team, a Backend Team, and a Database DBA Team—the resulting software architecture will almost certainly feature a tightly coupled three-tier architecture, where every feature deployment requires synchronous coordination across all three teams.
- **The Inverse Conway Maneuver**: Restructuring the organization's teams to match the desired software architecture. If you want a modular microservice architecture, organize cross-functional teams around distinct business domains (e.g., "Billing Team" containing frontend, backend, and DB engineers).

### 4. Domain Boundary Modeling

Before writing code, engineers map system boundaries using Domain-Driven Design (DDD) principles:

- **Bounded Context**: A clear boundary within which a domain model (and its terms) applies. In the "Shipping" context, a `Product` represents dimensions and weight; in the "Billing" context, a `Product` represents a price and tax code.
- **Ubiquitous Language**: Enforcing a common vocabulary shared between developers, product managers, and business stakeholders to eliminate translation errors.

---

## Real-World Production Learnings

In our early SaaS platform, our engineering organization grew from 5 to 60 developers. We had a single large monolithic codebase. The organization was divided into three horizontal teams: Frontend, Backend, and Database (DBAs).

We experienced severe deployment blocks:

1. To deploy a simple user rating feature, the Backend Team had to negotiate the schema modifications with the Database Team.
2. Once the table was updated, the Backend Team wrote the API, and finally, the Frontend Team built the UI.
3. Every feature required a synchronous weekly deployment sync, and a single bug in a payment script could block deployments for the catalog and registration teams, halting our release velocity.

**The Refactor**:
We executed an **Inverse Conway Maneuver** to reorganize our teams and architecture:

- We divided our 60 developers into cross-functional, domain-driven teams: "Billing", "Search & Catalog", and "User Accounts".
- Each team was granted full ownership of its domain, including its frontend interface, backend service, and database tables.
- We modularized the monolith codebase into separate packages, forcing teams to communicate exclusively through defined API endpoints.
- The DBA team transitioned from writing schemas to building self-service database provisioning platforms.

Following this organizational and architectural boundary alignment, our deployment cycles dropped from a weekly blocked deployment to **over 15 independent production updates per day**, drastically reducing coordination bottlenecks.

---

## Related Reading

- [Clean Architecture Principles](./clean-architecture-principles.md)
- [Monolith vs Microservices](./monolith-vs-microservices.md)
- [Event-Driven Architecture](./event-driven-architecture.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.architectural-patterns.basics.md)
