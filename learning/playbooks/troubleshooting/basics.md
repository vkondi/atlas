[⬅️ Back to Playbooks](../README.md)

# Troubleshooting Basics

An operational guide to software troubleshooting, structuring triage workflows, leveraging distributed tracing, injecting correlation identifiers, and isolating system variables.

---

## Why It Matters

Software developers spend a significant portion of their time debugging system errors. However, without a structured troubleshooting methodology, developers often resort to guessing: changing code randomly, deploying speculative patches, and treating symptoms rather than addressing root causes. This approach wastes time and can introduce new bugs.

Standardizing troubleshooting workflows ensures evidence-based bug resolution. By teaching engineers how to isolate variables, inspect logs systematically, and trace requests across microservice boundaries, teams resolve incidents faster and maintain system reliability under pressure.

---

## Core Concepts

### 1. The Troubleshooting Lifecycle

Resolve issues systematically by following a structured four-stage cycle:

| Phase            | Core Objective                                    | Key Actions                                                                           |
| :--------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------ |
| **1. Triage**    | Define the severity and isolate the blast radius. | Verify if the issue impacts all users or a specific group. Gather error metrics.      |
| **2. Reproduce** | Create a minimal reproducible case.               | Isolate input variables. Replicate the failure in a local environment using tests.    |
| **3. Resolve**   | Design and verify a targeted fix.                 | Patch the root cause. Run integration tests to confirm no regressions are introduced. |
| **4. Document**  | Prevent future occurrences.                       | Update checklists, write regression tests, and compile retrospect reports.            |

### 2. Distributed Tracing: Correlation IDs

In modern microservice architectures, a single user request can traverse dozens of independent services. If a database timeout occurs, locating the source error across scattered server logs is nearly impossible.

**Correlation IDs** (or Trace IDs) solve this. A unique UUID is generated at the system entry point (e.g., the API Gateway) and injected into the request headers. Every downstream service propagates this header in subsequent API and database requests. If an error occurs, you search the log aggregator for the Correlation ID to view the full request lifecycle.

---

## Real-World Production Learnings

We operated a microservices booking engine where checkout requests intermittently failed under peak load.

**The Failure**:
During marketing campaigns, users experienced random `500 Internal Server Error` checkout crashes. Developers spent two days speculative patching our checkout code, guessing that the issue was due to memory limits, but the crashes continued.

**The Diagnostic**:

1. **Ad-Hoc Investigations**: Developers were editing code without structured diagnostics, relying on gut feeling.
2. **Disconnected Logs**: The checkout logs, user auth logs, and database logs were not correlated, making it impossible to trace failures across services.
3. **Bypassed Replication**: The team did not attempt to replicate load parameters locally before writing patches.

**The Refactor**:
We implemented a structured troubleshooting workflow, configured Express middleware to inject Correlation IDs, and traced the failure path systematically:

1. **Injected Correlation IDs**: Configured the API Gateway to append `X-Correlation-ID` to all request headers.
2. **Correlated Logs**: Configured Winston logger to output the Correlation ID in every log entry.
3. **Identified the Root Cause**: Traced a failing request to the billing service, identifying that connection pool limits were exhausted because database connections were not released during network timeouts.
4. **Resolved Systemically**: Wrapped database operations in `try/finally` blocks to ensure connection release.

Here is the Correlation ID middleware and logger configuration we implemented:

```typescript
// src/middleware/correlation.ts
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

// Setup AsyncLocalStorage to carry correlation context across call stacks
export const correlationContext = new AsyncLocalStorage<string>();

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Use client-provided ID or generate a new UUID
  const correlationId =
    (req.headers['x-correlation-id'] as string) || crypto.randomUUID();

  // Set response header for client-side tracking
  res.setHeader('X-Correlation-ID', correlationId);

  // Bind execution stack to the correlation ID context
  correlationContext.run(correlationId, () => {
    next();
  });
}

// src/utils/logger.ts
export const logger = {
  error: (message: string, meta: any = {}) => {
    const correlationId = correlationContext.getStore() || 'no-context';
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        correlationId,
        message,
        ...meta,
      }),
    );
  },
};
```

By enforcing this system:

- The connection pool exhaustion bug was identified in under **5 minutes** of log inspection using the Correlation ID.
- Intermittent checkout crashes fell to **0%** once database connection release boundaries were locked down.
- Speculative codebase modifications were eliminated, preserving architectural consistency.

---

## Related Reading

- [Debugging React Applications](./debugging-react-applications.md)
- [Memory Leak Investigation](./memory-leak-investigation.md)
- [Checklist Basics](../checklists/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.playbooks.troubleshooting.basics.md)
