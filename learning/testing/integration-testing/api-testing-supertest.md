[⬅️ Back to Testing](../README.md)

# API Integration Testing

An operational guide to verifying backend interfaces using Supertest, testing authentication middleware pipelines, validating payload schemas, and managing test data states.

---

## Why It Matters

Unit testing individual request handlers is useful, but it bypasses the actual HTTP delivery framework. Many backend bugs occur in the routing and middleware pipelines—such as broken authorization token validation, misconfigured CORS or security headers, JSON parser exceptions, or incorrect type coercion of query parameters.

API integration testing validates the entire request/response lifecycle. Using tools like **Supertest** allows you to execute real HTTP calls directly against your framework's router (e.g., Express, Koa, or Fastify) in memory. This eliminates the need to bind to a physical TCP port, providing rapid feedback on endpoint routing, middleware sequences, database interactions, and response payloads.

---

## Core Concepts

### 1. The Supertest Runtime

Supertest takes an application server instance and starts an ephemeral HTTP server in the background. Because it does not bind to a fixed port (e.g., `:3000`), multiple test suites can run in parallel without port conflict errors.

```
+------------------+         +-------------------------+         +---------------------+
|    SUPERTEST     |  ---->  |    EPHEMERAL HTTP PORT  |  ---->  |    EXPRESS APP      |
| (Client request) |  <----  |   (Auto-allocated TCP)  |  <----  | (Middlewares/Route) |
+------------------+         +-------------------------+         +---------------------+
```

- **No Port Conflicts**: Port assignment is dynamically automated.
- **Stream-Based Testing**: Responses can be asserted as full streams, which is useful for verifying file downloads or chunked payloads.
- **Framework Agnostic**: Integrates with any node HTTP server object.

### 2. Middleware & Authentication Chains

API integration tests must verify the correct execution order of middlewares:

1. **CORS & Security Headers**: Checking that security headers (like `Helmet`) are set.
1. **Authentication Handshake**: Confirming that requests containing missing, expired, or malformed `Authorization` tokens are intercepted before reaching business controllers.
1. **Request Validation**: Verifying that query schemas (e.g., validating strings convert to numbers, checking UUID formats) correctly reject bad payloads with a `400 Bad Request` before invoking database pools.

---

## Real-World Production Learnings

We operated a core reporting endpoint (`GET /api/v1/reports`) that extracted financial analytics. The endpoint required a valid JWT authorization token, accepted query filters (`limit`, `startDate`), and fetched records from a database.

**The Failure**:
During a refactor of our API routing structure, we upgraded our HTTP parsing middleware. In production, mobile clients started receiving persistent `500 Internal Server Error` responses when accessing the reports page. However, our local unit tests for the controller returned `200 OK` and passed successfully.

**The Diagnostic**:

1. **Middleware Header Case Sensitivity**: The upgraded parsing middleware expected header attributes to be lowercase (`authorization`). Mobile clients were transmitting `Authorization: Bearer <token>` with capitalized headers. The router failed to parse the token, throwing a null reference exception in our auth middleware.
2. **Type Coercion Failure**: Query parameters are transmitted as strings. The reports query received `?limit=10`. The database controller expected a number. In production, this mismatch threw a SQL query validation error, which unit tests (using mocked inputs) did not detect.

**The Refactor**:
We created an API integration test suite using Supertest to validate the full Express router chain, ensuring correct header normalization, input schema validation, and database queries:

```typescript
// src/integration-tests/reports.test.ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// 1. Recreate production router and schema validations
const app = express();
app.use(express.json());

// Token validator middleware
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // Normalize authorization header lookup
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, 'test_secret_key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Request validation schema
const QuerySchema = z.object({
  limit: z.preprocess((val) => Number(val), z.number().int().positive()),
});

// Endpoint
app.get('/api/v1/reports', authenticateToken, (req: Request, res: Response) => {
  const parseResult = QuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: parseResult.error.format(),
    });
  }

  // Success response
  res.status(200).json({
    status: 'success',
    data: [{ id: 101, total: 540.5 }],
    limit: parseResult.data.limit,
  });
});

// 2. Integration Test Suite
describe('GET /api/v1/reports - API Integration Tests', () => {
  const validToken = jwt.sign({ userId: 'user-1002' }, 'test_secret_key');

  it('should successfully return data when request contains valid token and limits', async () => {
    // ACT: Dispatch request to Express app using Supertest
    const response = await request(app)
      .get('/api/v1/reports')
      .query({ limit: '15' }) // Query parameter passed as string
      .set('Authorization', `Bearer ${validToken}`); // Test capitalized header

    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.limit).toBe(15); // Assert correct type coercion
    expect(response.headers['content-type']).toContain('application/json');
  });

  it('should return 401 Unauthorized if Authorization header is missing', async () => {
    // ACT
    const response = await request(app)
      .get('/api/v1/reports')
      .query({ limit: '15' });

    // ASSERT
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing token');
  });

  it('should return 400 Bad Request if limit is not a number', async () => {
    // ACT
    const response = await request(app)
      .get('/api/v1/reports')
      .query({ limit: 'invalid_limit_string' })
      .set('authorization', `Bearer ${validToken}`); // Test lowercase header

    // ASSERT
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid query parameters');
  });
});
```

By switching to Supertest integration testing:

- Capitalization variations in client headers are verified and normalized.
- Query string type conversion and schema validations (like Zod checks) are executed under real HTTP conditions.
- Middleware execution sequencing (Auth -> Validate -> Execute) is locked down, preventing security bypass regressions.

---

## Related Reading

- [Unit Testing Basics](../unit-testing/basics.md)
- [Integration Testing Foundations](./basics.md)
- [Playwright E2E Fundamentals](../e2e-testing/playwright-fundamentals.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.testing.integration-testing.api-testing-supertest.md)
