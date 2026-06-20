[⬅️ Back to Backend Engineering](../README.md)

# Middleware Architecture

A detailed guide on middleware pipeline patterns, execution models, asynchronous context propagation, and centralized error handling boundaries.

---

## Why It Matters

Middlewares manage cross-cutting concerns (authentication, rate-limiting, request tracing, global error handling) without polluting business logic. If a middleware pipeline is poorly designed—such as failing to catch asynchronous failures or losing request context across nested event loops—it causes server crashes due to unhandled promise rejections, security leaks from incomplete scopes, and broken telemetry trails in distributed tracing systems.

---

## Core Concepts

### 1. Middleware Models: Cascading List vs. The Onion Model

Frameworks process the stack of request-handling interceptors using different pipeline models:

#### Linear Cascading List (Express Model)

Express executes middleware functions in a sequential, array-like chain.

When a middleware executes, it performs its work and calls `next()`. Control passes forward to the next middleware in the list. However, because it is callback-based, it is difficult for a middleware to execute code _after_ the down-stream handler has resolved, especially when asynchronous operations are involved:

```
[ Request ] ---> [ Log Middleware ] ---> [ Auth Middleware ] ---> [ Route Handler ]
                                                                          |
                                                                   Response Sent
```

#### The Onion Model (Koa & Fastify Model)

Modern frameworks execute middleware wrapping around each other like layers of an onion.

A middleware runs its incoming phase, calls `await next()`, halts execution to let the inner layers run, and then resumes to run its outgoing phase when the stack unwinds:

```
                  THE ONION MODEL PIPELINE

       Request ---> [ Middleware A (In) ] ---> [ Middleware B (In) ]
                                                        |
                                                        v
                                                 [ Route Handler ]
                                                        |
                                                        v
      Response <--- [ Middleware A (Out) ] <--- [ Middleware B (Out) ]
```

This model is ideal for tasks like response timing loggers or transaction management, where you need to open a state _before_ the handler runs and close it _after_ it completes in a single code block.

```javascript
// Koa Onion Logger example
async function loggerMiddleware(ctx, next) {
  const start = Date.now(); // 1. Incoming phase
  await next(); // 2. Delegate to next layer
  const ms = Date.now() - start; // 3. Outgoing phase
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
}
```

### 2. Context Propagation & AsyncLocalStorage

A major challenge in asynchronous runtimes (like Node.js) is tracking request-scoped metadata (such as the authenticated user's ID or a unique request correlation ID) down nested asynchronous call graphs without explicitly passing a `context` variable through every single function.

Node.js solves this with **`AsyncLocalStorage`** (from the `async_hooks` module), which acts like Thread-Local Storage in multi-threaded languages. It allows storing data that propagates through asynchronous boundaries (promises, timers, I/O callbacks):

```javascript
const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

// Middleware: Set context
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || generateUuid();
  asyncLocalStorage.run({ correlationId }, () => {
    next(); // All code downstream inherits this context block
  });
});

// Downstream database helper file
function queryDatabase(sql) {
  const store = asyncLocalStorage.getStore();
  const correlationId = store ? store.correlationId : 'unknown';
  logger.info(`Executing query with trace [${correlationId}]`);
  return db.execute(sql);
}
```

### 3. Centralized Error Boundaries

Uncaught exceptions in asynchronous code will result in an `UnhandledPromiseRejection` or process crash. Robust middleware architectures enforce a centralized catch-all boundary:

- **Express Async Wrapper**: Express v4 does not catch errors thrown in asynchronous code natively. Developers must manually wrap asynchronous functions in a `try/catch` and pass errors to `next(err)`.
- **Fastify Error Handler**: Fastify natively catches rejected promises and routes them to a registered handler, ensuring the runtime process stays alive:

```javascript
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error); // Logs details safely
  reply
    .status(500)
    .send({ error: 'Internal Server Error', code: 'INTERNAL_ERR' });
});
```

---

## Real-World Production Learnings

In our distributed SaaS platform, our application logs were fragmented. When an API request failed, we could see the HTTP error log, but we could not correlate it with the database queries or external API HTTP logs that occurred within the same request lifecycle because hundreds of helper functions were printing logs concurrently.

Initially, we tried refactoring our service layer to pass a `context` object containing a `traceId` through every database class and client utility. This resulted in thousands of lines of boilerplate modifications and broke clean architecture principles.

**The Solution**:
We refactored our logger using Node.js's **`AsyncLocalStorage`**:

1. We created an execution store module `RequestContext`.
2. We registered a global middleware at the top of our Express router that initiated the context with a unique request ID.
3. We updated our Winston logger configuration to fetch the request ID dynamically from the store on every log output:

```javascript
// logger.js
const winston = require('winston');
const { getRequestContext } = require('./request-context');

const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  const context = getRequestContext();
  const traceId = context ? context.traceId : 'SYSTEM';
  return `${timestamp} [${traceId}] [${level}]: ${message}`;
});
```

This allowed us to correlate logs across databases, cache pools, and microservices in a centralized log indexer (Elasticsearch) by filtering on a single `traceId`, dropping debug verification times from hours to seconds, and preserving our clean API signatures.

---

## Related Reading

- [Web Framework Fundamentals](./basics.md)
- [Express vs Fastify](./express-vs-fastify.md)
- [Node.js Internals](../runtime-environments/nodejs-architecture.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.backend.web-frameworks.middleware-design.md)
