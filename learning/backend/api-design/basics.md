[⬅️ Back to Backend Engineering](../README.md)

# API Design Fundamentals

Application Programming Interfaces (APIs) serve as the contracts connecting clients to backend data structures. Designing clean, secure, and resilient APIs is a foundational requirement for software architecture.

---

## Why It Matters

An API is a public interface that other developers rely on. Poorly designed APIs—with inconsistent route patterns, non-standard error structures, or loose type boundaries—lead to brittle client integrations. Once an API is deployed and consumed in production, introducing breaking changes is extremely difficult and expensive. Design-First API architecture mitigates these risks by establishing clear contracts before any code is written.

---

## Core API Design Concepts

### 1. API Contracts (Design-First API)

Instead of writing code and auto-generating documentation, the **Design-First** pattern requires writing the API contract first using schemas like **OpenAPI (Swagger)** or **GraphQL Schema Definition Language (SDL)**.

- **Benefits**: Frontend and backend teams can develop in parallel by stubbing out responses matching the OpenAPI spec. Automated linting scripts can check API conformity during CI pipeline validations.

---

### 2. Transport Protocols & Serialization

Choosing the right communication protocol depends on the use case:

| Protocol       | Transport          | Serialization             | Best For                                                                  |
| :------------- | :----------------- | :------------------------ | :------------------------------------------------------------------------ |
| **REST**       | HTTP/1.1 or HTTP/2 | JSON / XML                | General public APIs, standard CRUD web operations.                        |
| **GraphQL**    | HTTP (POST)        | JSON                      | Complex web dashboards requiring exact data selection.                    |
| **gRPC**       | HTTP/2 Streams     | Protocol Buffers (Binary) | High-performance, low-latency microservice-to-microservice communication. |
| **WebSockets** | TCP Persistent     | Text / Binary             | Real-time bi-directional streams (e.g. chat, live dashboards).            |

---

### 3. Traffic Protection (API Gateways & Rate Limiting)

Backend microservices must be protected from resource exhaustion:

- **API Gateway**: A single entry point that intercepts incoming client requests, executing authorization checks, request routing, header injection, and logging before proxying to backend services.
- **Rate Limiting**: Restricting the number of calls a user or IP can make in a given timeframe (e.g., using Token Bucket or Sliding Window Log algorithms in Redis) to prevent denial-of-service (DoS) attempts.

---

## Real-World Production Learnings

In a mobile wallet ledger system, we noticed occasional duplicate entries in our database. When users submitted a transaction in areas with poor cellular coverage, the request would occasionally timeout. The mobile client would automatically retry the request, resulting in charging the user twice for a single transaction.

To solve this, we refactored our API design to enforce **Idempotency Keys** on all state-mutating POST endpoints:

1. We required the client to generate a unique UUID and send it in a custom header: `Idempotency-Key: a1b2c3d4-...` for every transaction attempt.
2. Inside our API Gateway, we checked Redis to see if the key already existed:

```javascript
// Server Request Handler pseudocode
async function handlePayment(req, res) {
  const key = req.headers['idempotency-key'];
  if (!key) return res.status(400).send('Idempotency-Key header required');

  // Check cache for previous submission
  const cachedResponse = await redis.get(`idempotency:${key}`);
  if (cachedResponse) {
    // If it exists, return the cached result immediately without processing payment again
    return res.status(200).json(JSON.parse(cachedResponse));
  }

  // Set lock in Redis to prevent concurrent race conditions
  const locked = await redis.set(`lock:${key}`, 'processing', 'NX', 'EX', 10);
  if (!locked) return res.status(409).send('Request already in progress');

  // Process actual payment
  const result = await processCharge(req.body);

  // Store result in Redis with a 24-hour TTL and release lock
  await redis.set(`idempotency:${key}`, JSON.stringify(result), 'EX', 86400);
  await redis.del(`lock:${key}`);

  return res.status(200).json(result);
}
```

This defensive API design pattern eliminated 100% of double-charge incidents, proving that clients cannot be trusted to prevent duplicate actions without server-side validation.

---

## Related Reading

- [REST API Principles](./rest-api-principles.md)
- [GraphQL Fundamentals](./graphql-fundamentals.md)
- [gRPC & Protocol Buffers](./grpc-and-protocol-buffers.md)
- [API Versioning Strategies](./api-versioning-strategies.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.api-design.basics.md)
