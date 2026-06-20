[⬅️ Back to Testing](../README.md)

# Mocking Paradigms

An operational guide to leveraging test doubles, designing resilient isolation boundaries, implementing Mock Service Worker (MSW) network interception, and avoiding over-mocking pitfalls.

---

## Why It Matters

When writing unit and integration tests, code often interacts with external dependencies like file systems, third-party APIs, database connections, and system clocks. Directly executing these interactions makes test suites slow, flakey, and environment-dependent.

To solve this, developers use **test doubles** to simulate dependency behaviors. However, mock implementations are a double-edged sword. Over-mocking or mocking internal module details binds your test suite to the specific implementation details of the code under test. When you refactor the internal code structure without changing its external behavior, the tests break anyway. Establishing correct mocking strategies is critical to achieving high confidence without inducing maintenance fatigue.

---

## Core Concepts

### 1. The Test Double Taxonomy

Gerard Meszaros defined five distinct types of test doubles:

- **Dummy**: Objects that are passed to functions but never actually accessed or invoked. They are used purely as placeholder arguments to satisfy type compilers.
- **Stub**: Provides pre-configured, canned answers to calls made during the test. Stubs do not respond to inputs they are not programmed for, and they do not verify behavior.
- **Spy**: Wraps around real objects or functions to record execution metadata (such as call counts, invocation parameters, and return values) without modifying the underlying execution logic.
- **Mock**: Pre-programmed with specific assertions and expectations regarding the calls they should receive. Mocks verify that specific communication flows occurred.
- **Fake**: Contains a simplified, working implementation of a dependency (such as an in-memory SQLite database or an in-memory filesystem) that is lightweight but unsuitable for production.

### 2. Mocking Fetch vs. Network Interception (MSW)

Traditional tests mock fetch or Axios instances globally:

```typescript
// Fragile approach: Mocking HTTP Client internals
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ data: 'mocked' }),
});
```

Mocking the network client binds tests to a specific HTTP library. If you replace Axios with native `fetch` or a custom wrapper, you have to rewrite your entire test suite's mocks.

**Mock Service Worker (MSW)** intercepts requests at the network boundary using Service Workers (in browsers) or custom interception libraries (in Node.js). This allows tests to execute real HTTP calls, which are intercepted before they leave the environment.

---

## Real-World Production Learnings

We operated a core checkout handler that queried an external logistics provider's REST API to calculate real-time shipping costs and verify mailing addresses.

**The Failure**:
During an emergency library upgrade, we migrated our client from a deprecated Axios wrapper to native `fetch`. Although the checkout code worked perfectly, **our entire checkout unit test suite crashed**.

Additionally, a week later, we deployed an API payload update that modified a postal code query parameter from `zipCode` to `postal_code`. The tests continued to pass, but customers faced runtime errors during checkout because the shipping API received empty postal values.

**The Diagnostic**:

1. **Implementation Coupling**: The tests mocked `axios.post` directly. When the HTTP library changed to `fetch`, the mocked Axios methods were never called, breaking the tests.
2. **False Confidence (Over-Mocking)**: Because the HTTP client mock bypassed network formatting, the test suite verified only that a mock function was called. It failed to assert that the outgoing request payload matched the API specs, hiding the query parameter mismatch.

**The Refactor**:
We removed all library-level mocks and implemented Mock Service Worker (MSW) to validate checkout logic at the network protocol layer:

1. **Removed Client Mocks**: We allowed the code to use its standard HTTP client.
2. **Setup MSW Interceptors**: Intercepted outgoing HTTP queries, responding with realistic JSON payloads.
3. **Payload Verification**: Asserted that outgoing request bodies and headers matched logistics provider constraints.

Here is the production-grade refactored mock environment:

```typescript
// src/services/checkout.test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { calculateCheckoutTotal } from './checkout';

// 1. Define MSW request handlers (representing the external API)
const LOGISTICS_API_URL = 'https://api.logistics-provider.com/v1/rates';

const handlers = [
  http.post(LOGISTICS_API_URL, async ({ request }) => {
    const body: any = await request.json();

    // Validate the actual payload format required by production API
    if (!body.postal_code || !body.weight_kg) {
      return new HttpResponse(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Return canned response representing successful logistics calculation
    return HttpResponse.json({
      shipping_cost: body.weight_kg * 1.5,
      delivery_days: 3,
    });
  }),
];

// 2. Setup the mock server
const server = setupServer(...handlers);

beforeAll(() => {
  // Start interception before running test suites
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  // Reset handlers to clean up runtime overrides
  server.resetHandlers();
});

afterAll(() => {
  // Terminate interception
  server.close();
});

// 3. Test Cases
describe('Checkout Calculation using MSW Interception', () => {
  it('should calculate checkout rates successfully', async () => {
    // ARRANGE
    const cartItems = [
      { id: 'prod-1', weight: 2 },
      { id: 'prod-2', weight: 4 },
    ];
    const address = { postal_code: '90210', country: 'US' };

    // ACT: Function executes real network logic via fetch/axios
    const checkout = await calculateCheckoutTotal(cartItems, address);

    // ASSERT: Verified actual business calculations against MSW responses
    // Weight = 6kg. Shipping cost = 6 * 1.5 = 9.00
    expect(checkout.shippingCost).toBe(9.0);
    expect(checkout.status).toBe('ready_to_bill');
  });

  it('should throw an error when logistics provider returns 400 Bad Request', async () => {
    // ARRANGE: Override handler dynamically for a specific test scenario
    server.use(
      http.post(LOGISTICS_API_URL, () => {
        return new HttpResponse(null, { status: 400 });
      }),
    );

    const cartItems = [{ id: 'prod-1', weight: 2 }];
    const address = { postal_code: '', country: 'US' }; // Empty postal code

    // ACT & ASSERT
    await expect(calculateCheckoutTotal(cartItems, address)).rejects.toThrow(
      'Logistics calculation failed.',
    );
  });
});
```

By switching to MSW:

- Upgrading HTTP clients has **zero impact** on the test suite, as tests assert protocol contracts (URLs, request JSON structures, and headers) rather than code-level methods.
- Payload structural failures are caught immediately inside tests before deployment.
- Developers can mock offline API error conditions (like 502/504 errors) securely.

---

## Related Reading

- [Unit Testing Basics](./basics.md)
- [API Testing via Supertest](../integration-testing/api-testing-supertest.md)
- [TDD Workflow Guidelines](../test-driven-development/tdd-workflow.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.testing.unit-testing.mocking-strategies.md)
