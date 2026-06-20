[⬅️ Back to Software Architecture](../README.md)

# Monoliths vs. Microservices

An architectural analysis of monolithic simplicity, modular monolith strategies, distributed microservice topologies, database-per-service rules, and operational trade-offs.

---

## Why It Matters

Moving prematurely to a microservices architecture is one of the most common system design failures. While microservices allow scaling team structures and feature deployments independently, they introduce significant distributed systems complexities: network partition boundaries, latency overhead, distributed logs, and split transactional states. Deciding between a monolith and microservices requires balancing organizational size, deployment speeds, and database consistency requirements.

---

## Core Concepts

### 1. Architectural Trade-offs

| Feature / Metric         | Monolithic Architecture                                            | Microservices Architecture                                                         |
| :----------------------- | :----------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| **Deployment**           | Single deployable unit. Simple "all-or-nothing" pipeline.          | Multiple independent binaries. Complex CI/CD pipelines.                            |
| **Data Management**      | Single shared database. Enables atomic transactions and SQL Joins. | **Database-per-Service**: Services own their tables and communicate only via APIs. |
| **Network Latency**      | Sub-microsecond (in-memory function calls on the stack).           | Millisecond scale (HTTP/gRPC network hops).                                        |
| **Operational Overhead** | Low. Minimal infrastructure monitoring required.                   | High. Requires service discovery, API gateways, and tracing.                       |
| **Fault Isolation**      | Low. A memory leak or crash in one module can crash the server.    | High. A crash in the coupon service does not take down checkouts.                  |

### 2. The Modular Monolith (A Middle Ground)

To scale codebases without distributed system overhead, teams build a **Modular Monolith**:

- The application deploys as a single, consolidated process.
- Inside the codebase, domain packages are strictly separated, communicating exclusively via interface contracts rather than importing internal classes.
- Database tables are divided logically (e.g., prefixing tables with `billing_` or `catalog_`), and cross-domain SQL joins are prohibited.
- This model allows easy migration to independent microservices later if load demands it, simply by extracting a package into a separate service boundary.

### 3. Database-per-Service Pattern

In a true microservices architecture, services must never share a database:

```
    UNCOUPLED DATABASE-PER-SERVICE PATTERN

   [ Order Service ]       [ Inventory Service ]
           |                         |
           v                         v
   [ Postgres OrderDB ]     [ Postgres InventoryDB ]
```

- **The Problem**: If the Order Service reads or writes directly to the Inventory Service tables, the services become tightly coupled at the database schema level. Any database migration in the inventory schema will break the order service.
- **The Rule**: Each service owns its database. If a service needs data owned by another, it must fetch it via an API call or listen for asynchronous database replica event changes.

### 4. Distributed Coordination Realities

Microservices communicate across network nodes. Because networks are unreliable:

- **Service Discovery**: Services dynamically register their IPs in a directory (like Consul or Kubernetes CoreDNS) so clients can locate them.
- **Circuit Breakers**: If a downstream service fails repeatedly, client services trip the circuit breaker, returning a cached or fallback payload immediately rather than waiting for timeouts and exhausting resources.

---

## Real-World Production Learnings

In our user account platform, we migrated our monolithic Node.js application into 25 independent microservices because "microservices are modern and scale better".

This premature migration created a **Distributed Monolith** anti-pattern:

1. Because our domain boundaries were poorly mapped, a single user checkout query required synchronous HTTP REST requests across 8 different services: User, Address, Promo, Catalog, Inventory, Shipping, Tax, and Billing.
2. Our p99 checkout response times rose from **60ms to 1250ms** due to network hop accumulation.
3. If one non-critical service (like the Promo service) experienced a minor delay or crash, checkout failed completely because we lacked fallback error boundaries.
4. Developers spent hours debugging log fragments across 25 servers.

**The Refactor**:
We consolidated our distributed microservices down to a **Macro-Service** structure (4 core services) and implemented defensive network patterns:

- We merged related microservices back into consolidated domain processes: Billing, User Management, and Product Catalog.
- We implemented **Circuit Breakers** using `opossum` on our REST calls:

  ```javascript
  const circuitBreaker = new Opossum(fetchPromoCodes, {
    timeout: 1000, // If Promo Service takes > 1s, fail fast
    errorThresholdPercentage: 50, // Trip if 50% of requests fail
    resetTimeout: 10000, // Retry after 10s
  });

  circuitBreaker.fallback(() => []); // Return empty promos if service is down
  ```

- We set up a **CQRS (Command Query Responsibility Segregation)** read model. When catalog items changed, we updated a consolidated cache document in Redis, allowing checkout to load item profiles in 1ms without querying catalog services.

Consolidating our microservices and implementing circuit fallbacks dropped checkout latency back to **85ms**, stabilized system availability, and simplified local development testing.

---

## Related Reading

- [Architectural Pattern Foundations](./basics.md)
- [Event-Driven Architecture](./event-driven-architecture.md)
- [Clean Architecture Principles](./clean-architecture-principles.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.architectural-patterns.monolith-vs-microservices.md)
