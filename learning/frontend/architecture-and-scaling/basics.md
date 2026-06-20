[⬅️ Back to Frontend Engineering](../README.md)

# Frontend Scaling Fundamentals

Scaling a frontend application is primarily an organizational and build-performance challenge. As codebases grow and engineering teams expand, architectural systems must isolate domain boundaries to prevent developer collisions and maintain performance.

---

## Why It Matters

In a small project, any component can import any utility or state without immediate issue. However, in an enterprise application with dozens of engineers, a monolithic architecture runs into severe bottlenecks:

1. **Developer Collisions**: Merge conflicts in shared configurations, utility folders, and global state files.
2. **Cascading Re-renders**: A state update in a shared root store triggers expensive re-render loops across unrelated views.
3. **Build Degradation**: CI/CD pipelines taking upwards of 30 minutes to compile, test, and package the entire website for small CSS updates.

Effective frontend scaling requires partitioning code into independent, decoupled domains.

---

## Architectural Scaling Patterns

### 1. Domain Decoupling (Feature Directories)

Group code by business feature rather than technical type. Avoid folders like `components/`, `hooks/`, and `utils/` at the root. Instead, encapsulate them inside dedicated feature directories:

```
    /features
    ├── /billing
    │   ├── /components
    │   ├── /hooks
    │   ├── index.js      <-- Explicit Public API contract
    │   └── billing.test.js
    └── /catalog
        ├── /components
        └── index.js
```

- **The Public API Pattern**: Features must communicate _only_ through their `index.js` file. A feature is forbidden from reaching into the internal subfolders of another feature.
- **Enforcing Boundaries**: Use linting rules (like `eslint-plugin-import` or ESLint's `no-restricted-imports`) to block imports that cross domain boundaries.

---

### 2. Federated State Management

Monolithic applications often use a single, massive global state store (e.g., a single Redux store containing all UI states). This creates coupling where changes in one domain accidentally override states in another.

- **Pattern**: Keep the global store minimal (restricted to universal contexts like authentication or user locale). Offload all feature-specific state to local React contexts, Zustand slices, or state colocated within the specific feature directory.

---

### 3. Build Caching and Parallelization

Compile times degrade linearly as file counts grow. To maintain developer velocity:

- **Incremental Compilation**: Swap older compilers (Babel) with Rust-based engines (SWC, Turbopack, or esbuild).
- **Dependency Auditing**: Isolate third-party libraries. If only one feature uses a heavy charting library, dynamically import it within that feature to keep it out of the main landing bundle.

---

## Real-World Production Learnings

In an enterprise CRM application with over 12 sub-teams, our code lived in a single React repository. Any change to a shared utility file required testing the entire app, and the CI build pipeline took 32 minutes, stalling releases. Furthermore, teams faced constant merge conflicts in a central Redux store configuration.

We refactored the codebase by introducing domain boundaries:

1. We group-partitioned all views into self-contained directories under `/features`.
2. We created an explicit `index.js` in each feature folder, declaring exactly what was exported.
3. We configured the following ESLint configuration to block internal imports:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          "@/features/*/*/**" // Blocks reaching past the second level (index.js)
        ]
      }
    ]
  }
}
```

This structural boundary prevented developer collisions. If the Billing team updated their internal state logic, it was impossible for the Catalog team's views to be affected. The refactoring reduced merge conflict rates by 84%, and decoupled build setups allowed us to deploy features independently.

---

## Related Reading

- [Micro-Frontends](./micro-frontends.md)
- [Monorepos](./monorepos.md)
- [React Performance Fundamentals](../react/performance/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.architecture-and-scaling.basics.md)
