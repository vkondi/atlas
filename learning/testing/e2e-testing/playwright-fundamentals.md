[⬅️ Back to Testing](../README.md)

# Playwright E2E Automation

An operational guide to building scalable, resilient end-to-end browser automation suites using Playwright, managing isolated browser contexts, and utilizing the Trace Viewer to debug CI failures.

---

## Why It Matters

Legacy automation frameworks like Selenium require managing driver binaries (e.g., ChromeDriver) and dispatching HTTP commands over slow WebDriver protocols. Cypress, while modern, executes test scripts inside the browser's execution thread, which prevents it from automating multiple tabs, crossing domain boundaries (such as handling third-party Auth0 redirects), or running multiple browser instances concurrently in a single test.

Playwright overcomes these limits by communicating directly with browser engine protocols (like the Chrome DevTools Protocol) out-of-process. This enables sub-millisecond command execution, native multi-browser support (Chromium, Firefox, WebKit), and **Browser Contexts**—which simulate separate incognito sessions in milliseconds, allowing developers to test complex real-time applications without configuration overhead.

---

## Core Concepts

### 1. Browser Context Isolation

In Playwright, a `Browser` instance is launched once. Instead of opening a new browser window for each test (which is slow and CPU-heavy), Playwright provisions an isolated `BrowserContext` for every test case.

```
                  +-----------------------------------+
                  |         PLAYWRIGHT BROWSER        |
                  +-----------------------------------+
                   /                 |               \
   +--------------------+  +--------------------+  +--------------------+
   |   BROWSER CONTEXT  |  |   BROWSER CONTEXT  |  |   BROWSER CONTEXT  |
   | (User A Session)   |  | (User B Session)   |  | (Admin Session)    |
   +--------------------+  +--------------------+  +--------------------+
```

- **Zero Cross-Contamination**: Each context has its own cookies, localStorage, cache, and session variables, ensuring tests remain isolated.
- **Rapid Creation**: Instantiating a new context takes less than 15ms, making parallelized E2E runs highly performant.

### 2. The Locator Model and Auto-Waiting

Unlike older selector tools that run query selectors once, Playwright's `Locator` model is dynamic. It does not select elements immediately; instead, it retains a reference to the query and resolves the actual DOM node at the moment of interaction.

Before executing actions (e.g., `click()`, `fill()`), Playwright performs **actionability checks** automatically, verifying that the target element is:

1. **Attached** to the DOM.
1. **Visible** (non-zero size, not hidden).
1. **Stable** (not currently animating or shifting coordinates).
1. **Enabled** (not marked disabled).
1. **Receiving Events** (not obscured behind modals or backdrops).

### 3. Trace Viewer Diagnostics

The Trace Viewer records execution tracks of headless CI test failures. It captures:

- **Timeline**: Visual screencasts of the browser during execution.
- **Console Logs**: Client-side warnings and errors.
- **Network Logs**: All HTTP headers, payload sizes, and response status codes.
- **DOM Snapshots**: A fully interactive DOM inspector for every step, allowing developers to hover over actions to see exactly what lay in the viewport.

---

## Real-World Production Learnings

We operated a collaborative real-time Kanban dashboard where multiple team members could edit columns and assign tasks concurrently.

**The Failure**:
Our E2E test suites struggled to validate real-time synchronization. To verify that User A dragging a task card into "Done" updated User B's screen instantly, we ran two separate browser processes. This setup consumed extreme CI runner resources, regularly failing due to memory timeouts.

Furthermore, checking out with Stripe redirected users to a separate domain (`checkout.stripe.com`), which crashed our Cypress-based tests due to cross-origin execution limits.

**The Diagnostic**:

1. **Monolithic Browser Limitation**: Cypress could not coordinate actions between two active browser windows. Testing real-time WebSockets required simulating users in sequence rather than parallel.
2. **Cross-Origin Security Limits**: Running test code inside the client application frame blocks navigation to external checkout gateways.
3. **CI Debugging Blindness**: When headless tests failed on high-concurrency checks, inspecting raw screenshots failed to reveal if WebSocket connections were dropping or if the UI was simply slow.

**The Refactor**:
We migrated to Playwright, using multiple browser contexts within a single test file to simulate User A and User B concurrently, and configured Trace generation for failing tests in CI:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true, // Execute test files in parallel using worker processes
  workers: '50%', // Tune concurrency based on available host CPUs
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'https://staging.kanban-app.com',
    trace: 'retain-on-failure', // Record traces only when tests fail
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
});
```

Here is the multi-context synchronization E2E test:

```typescript
// e2e/kanban-sync.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Kanban Real-Time Synchronization', () => {
  test('should synchronize board updates across multiple user sessions', async ({
    browser,
  }) => {
    // 1. Establish isolated session for User A
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/boards/project-alpha');

    // Login User A
    await pageA.getByLabel(/username/i).fill('usera');
    await pageA.getByLabel(/password/i).fill('password123');
    await pageA.getByRole('button', { name: /log in/i }).click();

    // 2. Establish isolated session for User B (Simulated concurrent client)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto('/boards/project-alpha');

    // Login User B
    await pageB.getByLabel(/username/i).fill('userb');
    await pageB.getByLabel(/password/i).fill('password123');
    await pageB.getByRole('button', { name: /log in/i }).click();

    // 3. User A: Create a task card
    const newTaskInput = pageA.getByPlaceholder(/enter task title/i);
    await newTaskInput.fill('E2E Sync Task');
    await newTaskInput.press('Enter');

    // Assert User A sees the new card
    const cardA = pageA.getByText('E2E Sync Task');
    await expect(cardA).toBeVisible();

    // 4. Assert User B receives the new card via WebSockets (Auto-waits)
    const cardB = pageB.getByText('E2E Sync Task');
    await expect(cardB).toBeVisible();

    // 5. User A: Move task card to "Completed" column
    // Drag-and-drop handles locator resolution, scrolling, and cursor movement
    const sourceCard = pageA
      .getByTestId('kanban-card-title')
      .filter({ hasText: 'E2E Sync Task' });
    const targetColumn = pageA.getByTestId('kanban-column-completed');
    await sourceCard.dragTo(targetColumn);

    // Assert User A Completed Column contains card
    await expect(targetColumn.getByText('E2E Sync Task')).toBeVisible();

    // 6. Assert User B Completed Column synchronizes updates automatically
    const targetColumnB = pageB.getByTestId('kanban-column-completed');
    await expect(targetColumnB.getByText('E2E Sync Task')).toBeVisible();

    // Cleanup resources
    await contextA.close();
    await contextB.close();
  });
});
```

By switching to Playwright:

- Collaborative real-time synchronization is validated in a single test block.
- Stripe and Auth0 redirects are handled natively without proxy hacks or test crashes.
- CI debugging times dropped by **70%** because developers download failing traces and step back in time through network requests and DOM layouts.

---

## Related Reading

- [Unit Testing Basics](../unit-testing/basics.md)
- [Integration Testing Foundations](../integration-testing/basics.md)
- [E2E Testing Foundations](./basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.testing.e2e-testing.playwright-fundamentals.md)
