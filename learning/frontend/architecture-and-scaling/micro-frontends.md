[⬅️ Back to Frontend Engineering](../README.md)

# Micro-Frontends

Micro-frontends represent an architectural pattern where a single, monolithic web application is divided into independent, self-contained sub-applications that are composed together in the browser at runtime.

---

## Why It Matters

In a massive enterprise frontend codebase, a monolithic architecture forces all sub-teams to share a single release pipeline. If one team breaks a component, it blocks the deployments of all other teams. Micro-frontends solve this bottleneck by decomposing the UI into domain-oriented, independently deployable client modules, enabling teams to ship updates on their own schedules without coordinating deployments.

---

## Integration Strategies

There are three primary methodologies for composing micro-frontends:

```
                          Integration Styles
                        /         |        \
            [ Build-Time ]   [ Run-Time ]   [ Native Sandbox ]
            - npm packages   - Module Fed.  - Iframes
            - Strong types   - Dynamic JS   - Total isolation
            - Lock-step depl - Indep. depl  - Perf overhead
```

| Strategy                   | Implementation                                                                                | Pros                                                                 | Cons                                                                                         |
| :------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Build-Time Integration** | Micro-frontends are packaged as NPM libraries and compiled into the container shell app.      | Compile-time type checking, simple versioning.                       | Releasing any micro-frontend requires rebuilding and redeploying the entire container shell. |
| **Run-Time Integration**   | Code is fetched dynamically via Webpack/Rspack **Module Federation** or system-level loaders. | Independent deployments, instant updates without container rebuilds. | Risk of dependency conflicts and shared scope runtime crashes.                               |
| **Native Sandbox**         | Nested HTML `<iframe>` containers.                                                            | absolute isolation of CSS, JavaScript scope, and memory.             | High resource consumption, difficult layout responsiveness, and poor route sync.             |

---

## Technical Coordination Challenges

To build a stable micro-frontend system, developers must address three core engineering concerns:

### 1. Style Pollution and Isolation

Because CSS styles are globally scoped in browser documents, classes in one micro-frontend can pollute another.

- **Solutions**: Enforce CSS Modules, scope-compiled classes, or embed components inside the browser **Shadow DOM** to leverage native style scoping.

### 2. State and Event Communication

Micro-frontends must not share a direct synchronous global store (e.g., Redux). Sharing a store creates tight coupling, breaking independent deployability.

- **Solution**: Use asynchronous messaging. Dispatch standard browser **Custom Events** on a shared window-level event bus:

```javascript
// Dispatch event from micro-app A
window.dispatchEvent(
  new CustomEvent('cart:item-added', {
    detail: { itemId: '102', price: 29.99 },
  }),
);

// Listen inside micro-app B
window.addEventListener('cart:item-added', (event) => {
  console.log('Cart updated:', event.detail);
});
```

### 3. Shared Dependency Scopes

If every micro-frontend bundles its own React or lodash library, the client will download multiple instances of the same package, leading to huge load times.

- **Solution**: Use Module Federation shared scope configurations to load singletons.

---

## Real-World Production Learnings

In an enterprise dashboard using Webpack Module Federation, we integrated a shell container with three independent micro-applications (Billing, User Profile, Catalog). Soon after deployment, we experienced severe browser runtime crashes: whenever a user navigated to the Billing screen, React threw: _"Hooks can only be called inside the body of a function component."_

We investigated the runtime stack and found that because the Billing app was built with a slightly different bundler configuration, it downloaded its own instance of `react` and `react-dom` into browser memory instead of using the host container's instances. Having two active React runtimes on the same DOM broke React's internal hooks context.

We resolved this by modifying our `webpack.config.js` to configure React as a strict **singleton** with semantic range alignments:

```javascript
// webpack.config.js in both Host and Remote apps
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'billing',
      filename: 'remoteEntry.js',
      exposes: {
        './BillingView': './src/BillingView',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      },
    }),
  ],
};
```

This configuration forced the browser to resolve a single React singleton instance across the container and all loaded remote micro-frontends, eliminating the duplicate runtime crash completely.

---

## Related Reading

- [Frontend Scaling Fundamentals](./basics.md)
- [Monorepos](./monorepos.md)
- [API Versioning Strategies](../../backend/api-design/api-versioning-strategies.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.architecture-and-scaling.micro-frontends.md)
