[⬅️ Back to Testing](../README.md)

# TDD Foundations

An operational guide to Test-Driven Development (TDD) principles, deconstructing the Red-Green-Refactor cycle, and leveraging test-first design to build decoupled, maintainable code architectures.

---

## Why It Matters

Writing tests after writing production code often leads to untestable designs. Developers naturally write code that is highly coupled, relies on global singletons, and lacks clear boundary isolation. When they attempt to write tests later, they find themselves fighting their own architecture, resorting to fragile mocking hacks to get the code under test.

**Test-Driven Development (TDD)** flips this lifecycle. By writing the test _before_ the production code, you act as the first consumer of your API. This forces you to design clean, decoupled interfaces that accept injected dependencies. TDD transforms testing from a late-stage validation chore into an active design tool, producing codebases that are inherently modular, documented, and resilient to regression.

---

## Core Concepts

### 1. The Red-Green-Refactor Cycle

The foundation of TDD is a rapid, iterative process known as the **Red-Green-Refactor** loop:

```
              +-------------------------+
              |           RED           |
              |   Write a failing test  |
              +-------------------------+
                           |
                           v
              +-------------------------+
              |          GREEN          |
              |  Write minimal code to  |
              |      make it pass       |
              +-------------------------+
                           |
                           v
              +-------------------------+
              |        REFACTOR         |
              | Clean up structure without|
              |    breaking behaviors   |
              +-------------------------+
```

1. **Red**: Write a test that asserts a specific, small requirement. Run the test suite and verify that the new test fails. This failure confirms that the test is executing, checking the correct condition, and is not a false positive.
1. **Green**: Write the minimum amount of production code necessary to make the test pass. Do not write extra features, handle future edge cases, or write elegant code at this step. Quick, simple code is acceptable.
1. **Refactor**: Clean up the code. Remove duplication, split bloated functions, improve variable names, and optimize performance. The test suite must remain green throughout this phase, providing instant feedback if a change breaks existing behavior.

### 2. Design Benefits of TDD

- **Prevents Bloat (YAGNI)**: By writing code only to pass active tests, you avoid building speculative features ("You Aren't Gonna Need It").
- **Forces Dependency Injection**: To test a class before its database exists, you must pass database interfaces rather than concrete connections, establishing natural boundary decouplings.
- **Executable Specifications**: The test suite documents exactly what the system does under various inputs, serving as reliable developer documentation.

---

## Real-World Production Learnings

We operated a promotional discount engine that applied stackable coupon codes, loyalty tier discounts, and caps to shopping cart values.

**The Failure**:
A developer spent two days writing a large, complex `calculateCartDiscount` function. When they attempted to write unit tests afterward, they found the code could not run in isolation because it directly queried a database configuration singleton and accessed the browser's global storage object.

When a QA engineer identified an edge case where stackable discounts exceeded the total cart value, modifying the function to fix this bug introduced three regressions in the loyalty tier logic, crashing checkout.

**The Diagnostic**:

1. **High Coupling**: The code was tightly bound to runtime databases and global states, preventing lightweight unit executions.
2. **Untestable Complexity**: Because logic was written all at once, there was no granular test safety net to protect against regressions during refactors.
3. **Over-engineered Patterns**: The developer wrote complex sorting structures to handle future coupon types that were not yet required.

**The Refactor**:
We threw away the coupled implementation and rewrote the discount engine using a strict TDD workflow, starting with the simplest case:

#### Step 1: Red (Simple Coupon case)

We wrote a test for a basic flat discount:

```typescript
// src/discount.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './discount';

describe('Discount Engine (TDD)', () => {
  it('should apply a basic flat discount to a cart', () => {
    const cartTotal = 100;
    const discountRule = { type: 'flat', value: 20 };

    // Act
    const result = calculateDiscount(cartTotal, discountRule);

    // Assert
    expect(result).toBe(80);
  });
});
```

This test failed because `calculateDiscount` did not exist.

#### Step 2: Green (Write minimal code)

We wrote the bare minimum to pass:

```typescript
// src/discount.ts
export function calculateDiscount(total: number, rule: any): number {
  return total - rule.value;
}
```

The test passed (Green).

#### Step 3: Red (Add percentage validation)

We wrote a test to support percentage discounts:

```typescript
it('should apply a percentage discount to a cart', () => {
  const cartTotal = 200;
  const discountRule = { type: 'percent', value: 0.15 }; // 15%
  const result = calculateDiscount(cartTotal, discountRule);
  expect(result).toBe(170);
});
```

This failed because our code assumed all discounts were flat.

#### Step 4: Green (Pass both tests)

We updated the code:

```typescript
export function calculateDiscount(total: number, rule: any): number {
  if (rule.type === 'percent') {
    return total - total * rule.value;
  }
  return total - rule.value;
}
```

Both tests passed (Green).

#### Step 5: Red (Zero boundary edge case)

We added a test to ensure discounts cannot reduce the cart total below zero:

```typescript
it('should never reduce the total below zero', () => {
  const cartTotal = 50;
  const discountRule = { type: 'flat', value: 100 };
  const result = calculateDiscount(cartTotal, discountRule);
  expect(result).toBe(0);
});
```

This failed because the output was `-50`.

#### Step 6: Green & Refactor (Clean up and resolve)

We modified the implementation:

```typescript
export function calculateDiscount(total: number, rule: any): number {
  let finalTotal = total;
  if (rule.type === 'percent') {
    finalTotal = total - total * rule.value;
  } else {
    finalTotal = total - rule.value;
  }
  return Math.max(0, finalTotal);
}
```

All tests passed. We then refactored the function signatures and types safely:

```typescript
// Final clean code after refactoring
export interface DiscountRule {
  type: 'flat' | 'percent';
  value: number;
}

export function calculateDiscount(total: number, rule: DiscountRule): number {
  const discountAmount =
    rule.type === 'percent' ? total * rule.value : rule.value;

  return Math.max(0, total - discountAmount);
}
```

Because of TDD, we arrived at an elegant, typed, zero-dependency function that handled boundary values safely and was protected by a suite of targeted unit tests.

---

## Related Reading

- [Unit Testing Basics](../unit-testing/basics.md)
- [TDD Workflow Guidelines](./tdd-workflow.md)
- [Mocking & Spying Strategies](../unit-testing/mocking-strategies.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.testing.test-driven-development.basics.md)
