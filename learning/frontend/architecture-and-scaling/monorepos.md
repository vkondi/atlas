[⬅️ Back to Frontend Engineering](../README.md)

# Frontend Monorepos

A monorepo (monolithic repository) is a software development strategy where code for multiple projects, libraries, and microservices is stored in a single unified repository.

---

## Why It Matters

In a multi-repository frontend setup, sharing a UI component library or TypeScript typing schema between a customer-facing portal and an admin dashboard requires publishing packages to an external NPM registry. Updating a shared component requires a slow lifecycle: publish a new package version, update references in the app, re-install dependencies, and redeploy.

A monorepo simplifies this cycle by linking packages locally, letting developer updates in shared libraries propagate instantly across all applications in the repository without network overhead.

---

## Workspaces vs. Build Orchestrators

A complete monorepo setup requires two separate toolclasses: a workspace manager and a build orchestrator.

```
                   Monorepo Tool Stack
                 /                      \
      [ Workspace Manager ]          [ Build Orchestrator ]
      - Examples: Yarn, PNPM, NPM    - Examples: Turborepo, Nx
      - Links local packages         - Schedules and parallelizes tasks
      - Deduplicates node_modules    - Caches outputs (Remote Caching)
```

### 1. Workspace Managers (Yarn, PNPM, NPM Workspaces)

Workspace managers handle dependency linking and hoisting:

- **Symlinking**: They automatically link local packages together. If package `@core/ui` is declared as a dependency in `@app/admin`, the workspace manager points the reference to the local file system directory rather than trying to download it from npm.
- **PNPM workspaces**: PNPM is the standard for monorepos due to its use of a content-addressable store. It hard-links files from a global store, saving gigabytes of disk space and preventing dependency hoisting issues.

### 2. Build Orchestrators (Turborepo, Nx)

Workspace managers only connect folders; they do not build them efficiently. Build orchestrators manage task executions:

- **Task Pipelines**: Define dependencies between tasks (e.g. "build the `@core/ui` library _before_ building `@app/admin`").
- **Remote Caching**: Computes hash values representing the inputs of a task (source files, environment configurations, dependencies). If the inputs have not changed, the build system skips running the compiler on the next commit and copies the cached output files (from disk or cloud storage) directly.

```json
// Example: turbo.json configuration
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"], // Build parent dependencies first
      "outputs": [".next/**", "dist/**"] // Cache these folder outputs
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

---

## Monorepo Pitfalls to Avoid

1. **Phantom Dependencies**: Occurs when a package imports a library that is not declared in its local `package.json` but is hoised to the root `node_modules` by Yarn or NPM. In production build stages, the build fails because the hoisting is resolved differently. **Solution**: Use PNPM, which creates non-hoisted, isolated symlinks in `node_modules`.
2. **Version Drift**: Allowing packages to use different versions of third-party dependencies. If `@app/admin` uses React 18 and `@core/ui` compiles using React 17, it leads to runtime crashes in the browser. **Solution**: Enforce single-version policies at the root workspace configuration.

---

## Real-World Production Learnings

In an enterprise dashboard project containing 4 client applications and 6 shared UI/TypeScript packages managed by Yarn Workspaces, our CI pipeline validation build took 22 minutes on every pull request. The runner compiled every package from scratch sequentially, even if the commit only changed a single CSS color in one app.

We migrated the build configuration to **Turborepo** and set up Remote Caching inside our GitHub Actions:

1. We defined our task graph dependencies inside a root `turbo.json`.
2. We configured our GitHub Actions to store the `.turbo/cache` directory across builds.

When a developer committed changes that only touched a sub-route in `@app/admin`, Turborepo detected that the inputs for the 6 shared packages and the other 3 apps were unchanged. It skipped compiling those modules entirely, retrieving the pre-compiled builds from the GitHub cache. The CI validation time plummeted from **22 minutes to 1.8 seconds**, drastically improving our deployment cycles and developer velocity.

---

## Related Reading

- [Frontend Scaling Fundamentals](./basics.md)
- [Micro-Frontends](./micro-frontends.md)
- [NPM Package Publishing](../../tooling-and-workflows/dependency-management/npm-package-publishing.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.architecture-and-scaling.monorepos.md)
