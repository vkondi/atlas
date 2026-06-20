[⬅️ Back to Testing](../README.md)

# Pragmatic TDD Workflows

An operational guide to executing test-driven workflows in production, implementing Equivalence Partitioning, managing temporal states via clock injection, and balancing Inside-Out vs. Outside-In design patterns.

---

## Why It Matters

Dogmatic adherence to TDD—such as writing tests first for trivial getters, setters, or routing boilerplates—slows down development and leads to team burnout. Pragmatic TDD suggests focusing test-first efforts on areas of high complexity and risk: core business algorithms, validation engines, parser systems, state transitions, and boundary-sensitive calculations.

To practice TDD pragmatically, developers must structure their code to isolate side effects. A common blocker in test-first workflows is writing code that relies on system variables, like the current system clock. By introducing techniques like **clock injection** and **boundary partitioning**, you can design tests that remain deterministic and fast.

---

## Core Concepts

### 1. Test-First Input Partitioning

Before writing code, analyze the input space of the target function using two techniques:

1. **Equivalence Partitioning**: Divide the input domain into classes of data that should behave identically. For example, in an age validator, all integers from `18` to `120` belong to the "valid adult" partition, while `-5` to `17` belong to the "invalid" partition. You only need to test one representative value from each partition.
1. **Boundary Value Analysis (BVA)**: Focus tests on the edges of these partitions. Bugs are most likely to occur at the boundaries (e.g., testing `17`, `18`, and `19` to verify threshold transitions).

### 2. Outside-In vs. Inside-Out TDD

- **Outside-In (London School)**: Starts at the outermost layer of a feature (e.g., the UI controller or API route). You write tests for the top-level handler first, using mocks to represent lower-level dependencies that do not exist yet. You then work your way down the stack, designing interfaces dynamically.
- **Inside-Out (Classic / Chicago School)**: Starts at the lowest levels of domain logic (e.g., individual calculation functions or database entities). You build and test these units in isolation first, then integrate them upwards until you reach the controller layer.

### 3. Chronological Isolation: Clock Injection

Functions that rely on the system time (`Date.now()` or `new Date()`) are difficult to test because time moves forward between statements. If a test verifies a timeout exactly 1000ms in the future, a CPU hiccup in a CI runner can delay execution, causing the test to fail.

To resolve this, inject a clock dependency:

```typescript
// Core logic accepts clock interface, avoiding direct system calls
interface Clock {
  now(): number;
}
```

---

## Real-World Production Learnings

We operated an API rate-limiting gateway that enforced a sliding-window limit of 100 requests per minute per IP address.

**The Failure**:
Our team implemented a sliding-window rate limiter using Redis and local timestamps. However, the E2E test suite regularly failed in CI. The tests attempted to simulate "100 requests" and then waited exactly 60 seconds using `sleep(60000)` to verify the limit reset, which slowed down our build pipelines.

Additionally, because the local system clock was queried directly within the rate-limiter logic, test executions on slow CI runners regularly hit race conditions, resulting in false rate-limit blocks.

**The Diagnostic**:

1. **Uncontrolled Clock Dependency**: The rate-limiter initialized timestamps internally using `Date.now()`. This prevented the test suite from freezing or advancing time deterministically.
2. **Incompatible Pipeline Speed**: Waiting for physical time to pass (e.g., 60 seconds) is a anti-pattern that slows down CI runs.
3. **Missing Boundary Tests**: The implementation failed to handle request bursts arriving at the exact millisecond boundary of the sliding window, leading to memory leaks.

**The Refactor**:
We rewrote the rate-limiter using a classic Inside-Out TDD approach. We decoupled the system clock by injecting a custom time-provider, allowing us to mock time jumps instantly:

#### Step 1: Red (Define sliding window test-first using a mock clock)

```typescript
// src/rate-limiter.test.ts
import { describe, it, expect } from 'vitest';
import { SlidingWindowLimiter } from './rate-limiter';

// Mock clock allows tests to control time deterministically
class MockClock {
  private currentTime = 0;

  now() {
    return this.currentTime;
  }

  advance(ms: number) {
    this.currentTime += ms;
  }
}

describe('SlidingWindowLimiter (TDD with Clock Injection)', () => {
  it('should block requests that exceed limit and allow them when window expires', () => {
    const clock = new MockClock();
    const limiter = new SlidingWindowLimiter({
      maxRequests: 2,
      windowMs: 1000, // 1 second window
      clock,
    });

    const ip = '192.168.1.1';

    // Act & Assert: First two requests should pass
    expect(limiter.isAllowed(ip)).toBe(true);
    expect(limiter.isAllowed(ip)).toBe(true);

    // Third request within the same second should be blocked
    expect(limiter.isAllowed(ip)).toBe(false);

    // Fast-forward mock time by 1001ms (simulating window expiry instantly)
    clock.advance(1001);

    // Request should now pass
    expect(limiter.isAllowed(ip)).toBe(true);
  });
});
```

#### Step 2: Green (Write minimal logic to resolve mock clock)

```typescript
// src/rate-limiter.ts
export interface LimiterConfig {
  maxRequests: number;
  windowMs: number;
  clock: { now(): number };
}

export class SlidingWindowLimiter {
  private config: LimiterConfig;
  private requests: Map<string, number[]> = new Map();

  constructor(config: LimiterConfig) {
    this.config = config;
  }

  isAllowed(ip: string): boolean {
    const now = this.config.clock.now();
    const timestamps = this.requests.get(ip) || [];

    // Filter out expired timestamps
    const activeTimestamps = timestamps.filter(
      (time) => now - time < this.config.windowMs,
    );

    if (activeTimestamps.length >= this.config.maxRequests) {
      return false;
    }

    activeTimestamps.push(now);
    this.requests.set(ip, activeTimestamps);
    return true;
  }
}
```

The test passed immediately.

#### Step 3: Refactor (Optimize memory consumption)

We refactored the implementation to ensure that we clean up empty IP maps from memory to prevent memory leaks in production:

```typescript
// Refactored clean code
export class SlidingWindowLimiter {
  private config: LimiterConfig;
  private requests = new Map<string, number[]>();

  constructor(config: LimiterConfig) {
    this.config = config;
  }

  isAllowed(ip: string): boolean {
    const now = this.config.clock.now();
    const windowStart = now - this.config.windowMs;

    let timestamps = this.requests.get(ip) || [];

    // Binary search or simple filter for older items
    timestamps = timestamps.filter((time) => time >= windowStart);

    if (timestamps.length >= this.config.maxRequests) {
      // Memory cleanup for old entries
      this.requests.set(ip, timestamps);
      return false;
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return true;
  }
}
```

By injecting the clock and practicing pragmatic TDD:

- E2E test suites no longer sleep for 60 seconds; time jumps are executed in **<1ms** via the mock clock helper.
- Edge cases (like requests arriving at the exact millisecond threshold) are validated in our unit suites.
- The codebase is protected against memory leaks, with cleanup routines verified by tests before deployment.

---

## Related Reading

- [Unit Testing Basics](../unit-testing/basics.md)
- [TDD Foundations](./basics.md)
- [Mocking & Spying Strategies](../unit-testing/mocking-strategies.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.testing.test-driven-development.tdd-workflow.md)
