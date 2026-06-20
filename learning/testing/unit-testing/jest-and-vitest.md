[⬅️ Back to Testing](../README.md)

# Jest & Vitest Frameworks

An operational guide comparing Jest and Vitest runtimes, detailing parallel execution environments, test lifecycle hooks, and optimizing test runners for modern monorepos.

---

## Why It Matters

Traditional JavaScript testing frameworks like Jest require compiling TypeScript code down to CommonJS using heavy, multi-stage compilation pipelines (such as `ts-jest` or Babel). As codebases grow, the overhead of invoking these bundlers and transpilers for every test execution loop degrades development velocity, causing execution times to spiral.

Vitest solves this by using Vite's native dev server architecture. It leverages native ESM (ECMAScript Modules) transformation, performing on-demand compilation only for the files actually imported by active tests. Understanding how to configure, optimize, and leverage both runtimes is critical for maintaining rapid local feedback loops and cost-efficient CI pipelines.

---

## Core Concepts

### 1. Architectural Differences: Jest vs Vitest

Although Vitest mirrors Jest's API (e.g., `describe`, `test`, `expect`), their underlying engines operate differently:

```
+-----------------------------------------------------------------+
| JEST PIPELINE                                                   |
| Test File -> ts-jest/Babel -> CommonJS Bundling -> Worker VM    |
+-----------------------------------------------------------------+
                                VS
+-----------------------------------------------------------------+
| VITEST PIPELINE                                                 |
| Test File -> Vite Dev Server (ESM / On-Demand) -> Worker Thread |
+-----------------------------------------------------------------+
```

- **Compilation Overhead**: Jest transforms TypeScript code out-of-process for every test run, repeating transpilation work. Vitest intercepts module imports using Vite's module graph, caching transformed files to prevent redundant compilation.
- **Worker Execution**: Jest runs tests inside isolated `jsdom` or Node virtual machines (`vm` contexts), which can leak memory over long test runs. Vitest runs tests inside thread pools or process forks using `tinypool`, optimizing memory consumption.
- **HMR (Hot Module Replacement)**: Vitest features an extremely fast watch mode that updates tests instantly when a dependent source file changes, whereas Jest must scan the dependency tree and re-transpile multiple modules.

### 2. Configuration Runtimes

Configuring these frameworks requires defining global environments and module resolutions.

For Vitest (`vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Auto-inject describe, it, expect
    environment: 'node', // Use 'jsdom' or 'happy-dom' for browser emulation
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    pool: 'threads', // Run tests in parallel threads
    poolOptions: {
      threads: {
        singleThread: false, // Set to true if native addons or native DB clients leak memory
      },
    },
    coverage: {
      provider: 'v8', // Use native v8 or 'istanbul'
      reporter: ['text', 'json', 'html'],
      all: true,
    },
  },
});
```

For Jest (`jest.config.js`):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
};
```

### 3. Lifecycles and Shared Contexts

Lifecycle hooks run at specific stages of test suite execution:

1. **`beforeAll`**: Runs once before any tests in the current file/describe block start. Ideal for establishing global mock fixtures or mock databases.
1. **`beforeEach`**: Runs before every individual test block. Crucial for resetting mock functions (`vi.clearAllMocks()`) and reinstantiating test variables.
1. **`afterEach`**: Runs after every individual test block. Essential for restoring original behavior of mocked globals (`vi.restoreAllMocks()`) or cleaning transient files.
1. **`afterAll`**: Runs once after all tests in the file complete. Crucial for tearing down active connections or server listeners.

---

## Real-World Production Learnings

We operated a high-throughput microservices architecture with a shared core monorepo containing over 1,500 unit and integration tests.

**The Failure**:
Our CI builds began timing out, with the test stage regularly exceeding 25 minutes. During peak hours, GitHub Actions runners failed due to Out Of Memory (OOM) errors during the Jest test phase, terminating with exit code 137.

**The Diagnostic**:

1. **Compilation Overhead**: Each Jest worker was running `ts-jest` independently, causing CPU throttling.
2. **Worker Memory Leaks**: Node's standard `vm` module, which Jest uses to isolate context per test file, does not garbage-collect global scopes and large library imports (such as database client classes or AWS SDKs) properly between runs, leaking up to 200MB per test suite.
3. **Redundant Module Execution**: Database clients and connection managers were being re-initialized on every single test run because setup hooks were not isolating test boundaries.

**The Refactor**:
We migrated the entire suite to Vitest and optimized execution pools to prevent memory leakage:

1. **Configured ESM-based Vitest**: Allowed us to drop `ts-jest` completely.
2. **Tuned Parallel Pool Pools**: Configured isolated threads while using setup hooks to prevent cross-contamination.
3. **Explicit Mock & State Cleanups**: Handled state teardowns in `afterEach` and `afterAll`.

Here is our optimized Vitest configuration and a lifecycle-clean test suite:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Prevent OOM errors by limiting maximum workers and tuning thread isolation
    maxWorkers: 3,
    minWorkers: 1,
    poolOptions: {
      threads: {
        isolate: true, // Clear module cache between test files to prevent memory leaks
      },
    },
  },
});
```

Here is the clean test structure with lifecycle isolation:

```typescript
// src/services/user-activity.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserActivityTracker } from './user-activity';

// Mock dependencies
const mockAnalyticsEngine = {
  trackEvent: vi.fn().mockResolvedValue(true),
};

describe('UserActivityTracker Lifecycle and Isolation Tests', () => {
  let tracker: UserActivityTracker;

  beforeEach(() => {
    // ARRANGE: Fresh instance per test prevents state leakage
    tracker = new UserActivityTracker(mockAnalyticsEngine as any);
  });

  afterEach(() => {
    // ARRANGE: Clear calls and mock return values between tests
    vi.clearAllMocks();
  });

  it('should process login activity and emit analytics event', async () => {
    // ACT
    const result = await tracker.trackUserLogin('user-1002');

    // ASSERT
    expect(result).toBe(true);
    expect(mockAnalyticsEngine.trackEvent).toHaveBeenCalledTimes(1);
    expect(mockAnalyticsEngine.trackEvent).toHaveBeenCalledWith(
      'login',
      expect.any(Number),
    );
  });

  it('should fail silently and return false when logging fails', async () => {
    // ARRANGE: Override default mock behavior for this test only
    mockAnalyticsEngine.trackEvent.mockRejectedValueOnce(
      new Error('Network offline'),
    );

    // ACT
    const result = await tracker.trackUserLogin('user-1002');

    // ASSERT
    expect(result).toBe(false);
    expect(mockAnalyticsEngine.trackEvent).toHaveBeenCalledTimes(1);
  });
});
```

By switching to Vitest and strictly cleaning mocks and module scopes between runs:

- Test execution time dropped from **25 minutes** to **2.4 minutes** in CI.
- Peak memory usage dropped from **6.2GB** to **1.1GB**, completely eliminating OOM failures.
- Developers were able to run tests in watch mode locally with updates rendering in **<150ms** on save.

---

## Related Reading

- [Unit Testing Basics](./basics.md)
- [Mocking & Spying Strategies](./mocking-strategies.md)
- [Component Integration Testing](../integration-testing/component-testing.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.testing.unit-testing.jest-and-vitest.md)
