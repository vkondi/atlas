[⬅️ Back to Testing](../README.md)

# Unit Testing Basics

An operational guide to unit testing principles, deconstructing the testing pyramid, the F.I.R.S.T. properties of clean tests, the AAA pattern, and maintaining isolation boundaries.

---

## Why It Matters

As codebases grow, refactoring becomes increasingly risky: a change in one module can trigger silent regressions elsewhere. Unit testing mitigates this risk by validating the behavior of isolated units of code (such as functions, algorithms, or utility classes) in response to specific inputs. However, writing unit tests that connect to live databases, rely on external APIs, or share state with other tests defeats the purpose. This creates a fragile test suite that fails due to environmental issues, runs too slowly to be executed locally, and slows down development velocity.

---

## Core Concepts

### 1. The Testing Pyramid

Automated software tests are distributed across three primary tiers to balance execution speed, coverage confidence, and maintenance costs:

```
                          THE TESTING PYRAMID

                            / \
                           /   \
                          / E2E \     <- Low count, slow, expensive (Playwright)
                         /───────\
                        / Integr. \   <- Medium count, mock boundaries (Supertest)
                       /───────────\
                      /   Unit      \ <- High count, ultra-fast, cheap (Vitest)
                     /───────────────\
```

- **Unit Tests (Base)**: Validate a single function or class in absolute isolation. They bypass network calls, database queries, and filesystems by mocking all external dependencies. They execute in milliseconds, allowing developers to run hundreds of tests on every code save.
- **Integration Tests (Middle)**: Verify the communication boundaries and data flows between multiple integrated modules, such as a router interface talking to a database controller.
- **End-to-End (E2E) Tests (Apex)**: Simulate real user journeys through a browser interface, testing the entire system from the frontend UI down to the backend databases. Highly realistic but slow and susceptible to transient network flakes.

### 2. Properties of Clean Tests (F.I.R.S.T.)

Production-grade unit tests adhere to the **F.I.R.S.T.** guidelines:

- **Fast**: Tests must run quickly (often <10ms per test). If the suite takes minutes to run, developers will stop executing it locally, defeating the continuous feedback loop.
- **Independent / Isolated**: Tests must not share state or depend on the execution order of other tests. Every test must establish its own clean environment from scratch.
- **Repeatable**: Tests must return the exact same outcome in any environment (e.g., local developer laptops, headless CI runners, or staging environments) without depending on external variables.
- **Self-Validating**: Every test must output a clear, binary Pass or Fail status. There should be no manual log inspection required to determine success.
- **Timely**: Written concurrently with or immediately after the corresponding production code (or prior to it in TDD workflows).

### 3. Test Anatomy: The AAA Pattern

Unit tests are structured using the **Arrange-Act-Assert (AAA)** pattern to maximize readability:

1. **Arrange**: Set up the test conditions, initialize variables, instantiate class units, and configure mock inputs or dependency adapters.
1. **Act**: Execute the specific function or method being tested.
1. **Assert**: Verify that the actual output matches the expected outcome (e.g., checking return values, verifying error throws, or inspecting spy calls).

---

## Real-World Production Learnings

We operated a core subscription billing engine, verifying pricing structures and prorated invoice calculations.

**The Failure**:
During a critical security patch deploy, our CI pipeline halted because **over 250 unit tests failed simultaneously**.

Upon review, the billing calculations code was completely untouched. However, the database staging credentials expired, blocking the test suite from establishing connections, freezing all emergency deployments.

**The Diagnostic**:

1. **Breached Isolation Boundaries**: The unit tests were not isolated. During the Arrange phase, the test code invoked a database adapter helper that queries active product rates tables directly from the staging PostgreSQL instance.
2. **Brittle Test Architecture**: When the database was unreachable, tests threw connection exceptions, violating the "I" (Independent) and "R" (Repeatable) properties of clean unit tests.

**The Refactor**:
We re-engineered our billing calculation code to decouple logic from infrastructure:

1. **Parameter Injection**: We refactored the calculator function (`calculateProratedBilling`) to accept price rules as a plain input parameter, moving the database query out of the core calculator module.
2. **Mocking Infrastructure**: In the test file's Arrange phase, we bypassed database connections entirely, passing mock pricing objects directly to the function.

Here is the decoupled, clean unit test implementation:

```typescript
// Core billing engine calculator test (AAA Pattern)
// Targets: Complete isolation from database connectivity

// 1. Decoupled production module (isolated pure logic)
interface PriceRules {
  baseAmount: number;
  taxRate: number;
}

export function calculateProratedBilling(
  daysUsed: number,
  totalDays: number,
  rules: PriceRules,
): number {
  if (totalDays <= 0 || daysUsed < 0) {
    throw new Error('Invalid billing duration parameters.');
  }
  const ratio = Math.min(1, daysUsed / totalDays);
  const rawProrated = rules.baseAmount * ratio;
  const total = rawProrated * (1 + rules.taxRate);
  return Math.round(total * 100) / 100; // Round to 2 decimal places
}

// 2. Unit Test Suite (Vitest syntax)
import { describe, it, expect } from 'vitest';

describe('calculateProratedBilling unit tests', () => {
  it('should calculate prorated billing correctly with tax', () => {
    // ARRANGE: Set up static mock inputs (No database connection required)
    const daysUsed = 15;
    const totalDays = 30;
    const mockRules: PriceRules = {
      baseAmount: 100.0,
      taxRate: 0.1, // 10% tax
    };

    // ACT: Call the pure logic function
    const result = calculateProratedBilling(daysUsed, totalDays, mockRules);

    // ASSERT: Verify outcome matches expected calculation
    // Prorated = 100 * (15/30) = 50. Tax = 50 * 0.10 = 5. Total = 55.00
    expect(result).toBe(55.0);
  });

  it('should throw an error if totalDays is zero', () => {
    // ARRANGE
    const daysUsed = 10;
    const totalDays = 0;
    const mockRules: PriceRules = { baseAmount: 50.0, taxRate: 0.05 };

    // ACT & ASSERT
    expect(() => {
      calculateProratedBilling(daysUsed, totalDays, mockRules);
    }).toThrow('Invalid billing duration parameters.');
  });
});
```

By separating pure mathematical calculation algorithms from database connection adaptors, our test suite was fully insulated. The billing unit tests execute in less than **1.2ms** locally, with zero network dependencies. This allowed the CI pipeline to run emergency patches safely, even when the database was offline.

---

## Related Reading

- [Jest & Vitest Runtimes](./jest-and-vitest.md)
- [Mocking & Spying Strategies](./mocking-strategies.md)
- [API Testing via Supertest](../integration-testing/api-testing-supertest.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.testing.unit-testing.basics.md)
