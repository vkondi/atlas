[⬅️ Back to Backend Engineering](../README.md)

# Express vs Fastify

A comparison of Node.js web frameworks, contrasting traditional middleware patterns with modern, schema-driven, high-throughput architectures.

---

## Why It Matters

For years, Express was the default choice for Node.js backends. However, its legacy design depends on synchronous middleware cascading, linear regular expression routing, and standard `JSON.stringify()` serialization. Fastify resolves these bottlenecks by combining Radix Tree routing, declarative schema validation, and compiled JSON serialization. Choosing the right framework directly impacts system throughput, API latency, and cloud infrastructure expenses.

---

## Core Concepts

### 1. Architectural Comparison

| Feature                 | Express                                                                       | Fastify                                                               |
| :---------------------- | :---------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Routing Algorithm**   | Linear RegExp (Iterates array sequentially)                                   | Radix Tree (Constant lookup speed via `find-my-way`)                  |
| **JSON Serialization**  | Dynamic `JSON.stringify()` (Slow runtime traversal)                           | Compiled `fast-json-stringify` (Predictive assembly)                  |
| **Schema Validation**   | Ad-hoc (Requires manually writing Joi/Zod middleware)                         | First-class integration (AJV compiled schemas)                        |
| **Async/Await Support** | Callback-based (Older versions require custom wrappers to catch async errors) | Native support (Handles promise resolutions and throws automatically) |
| **Plugin Isolation**    | None (Middlewares are globally registered or sequentially scoped)             | Strict (Encapsulated scopes via `fastify-plugin` tree)                |

### 2. Serialization Speed: Standard vs. Compiled

When responding to an API call, a backend must serialize JavaScript objects into JSON strings.

- **Standard dynamic serialization (`JSON.stringify`)**: Inspects every property of an object at runtime, checking its type and recursively building a string. This is CPU-intensive.
- **Compiled serialization (`fast-json-stringify`)**: Fastify compiles a highly specialized serialization function for each route based on a defined JSON schema at application startup. When a request completes, Fastify calls this pre-compiled function, avoiding dynamic type inspection:

```javascript
// Fastify pre-compiles this serialization structure at startup
const stringify = fastJson({
  type: 'object',
  properties: {
    id: { type: 'integer' },
    email: { type: 'string' },
  },
});

// Under the hood, the compiled code looks like:
function compiled(obj) {
  return `{"id":${obj.id},"email":"${obj.email}"}`;
}
```

This compilation step makes Fastify's JSON serialization up to **2x to 3x faster** than standard `JSON.stringify()`.

### 3. The Plugin Graph and Encapsulation

Express applications register middlewares globally. While simple, it becomes difficult to isolate dependencies in large monorepos, leading to name collisions and pollution of request objects.

Fastify solves this by utilizing **avvio**, a bootstrapper that models applications as a directed acyclic graph. Using `fastify-plugin`, developers can write encapsulated modules:

- A plugin can register decorators, hooks, and database clients.
- If a plugin is encapsulated, its decorators and hooks are only visible to sibling and child plugins, preventing leakages to the main application context.

---

## Real-World Production Learnings

In our high-throughput User Authentication service, the endpoint `/api/v1/sessions` handled up to 15,000 requests per second. Under peak load, our Express-based service suffered from high CPU usage (averaging 80%) and our p99 response times climbed to **95ms**, requiring us to run 12 Kubernetes replica pods to maintain stability.

We decided to migrate the service to **Fastify**:

1. We declared input and output schemas for all routes:

   ```javascript
   const loginSchema = {
     body: {
       type: 'object',
       required: ['username', 'password'],
       properties: {
         username: { type: 'string', format: 'email' },
         password: { type: 'string', minLength: 8 },
       },
     },
     response: {
       200: {
         type: 'object',
         properties: {
           token: { type: 'string' },
           expiresIn: { type: 'number' },
         },
       },
     },
   };

   fastify.post('/login', { schema: loginSchema }, async (req, reply) => {
     // Business logic here automatically benefits from pre-compiled serialization
     return { token: 'xyz', expiresIn: 3600 };
   });
   ```

2. Because Fastify natively manages async error boundaries, we removed our custom `express-async-handler` wrapper functions.
3. Fastify's `find-my-way` router matched paths in constant time, eliminating the CPU penalty of regex evaluations.

**The Results**:

- Our API p99 latency dropped from **95ms to 18ms**.
- CPU usage dropped from **80% to 28%** under identical request rates.
- We reduced our Kubernetes pod count from **12 to 4**, saving thousands of dollars in monthly cloud compute charges.

---

## Related Reading

- [Web Framework Fundamentals](./basics.md)
- [Middleware Design](./middleware-design.md)
- [Node.js Internals](../runtime-environments/nodejs-architecture.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.web-frameworks.express-vs-fastify.md)
