[⬅️ Back to Tooling & Workflows](../README.md)

# Package Managers: Yarn & pnpm

An operational comparison of npm, Yarn, and pnpm architectures, detailing content-addressable storage, resolving phantom dependencies, and configuring monorepo workspaces.

---

## Why It Matters

Traditional npm and Yarn v1 package managers use a flat installation strategy that hoists all packages to the root `node_modules` directory. This approach has major drawbacks: it consumes gigabytes of redundant disk space by duplicating packages across projects, and it allows **phantom dependencies**—where code imports transient libraries that are not explicitly defined in `package.json` but happen to be hoisted to the root folder.

In production, if the parent dependency that imported the transient library is updated or removed, the phantom dependency vanishes, crashing your application. Migrating to strict package managers like **pnpm** or modern Yarn resolves this by isolating dependencies, optimizing disk usage, and enforcing lockfile structures.

---

## Core Concepts

### 1. Storage Models: Hoisted vs. Hard-Linked

Different package managers resolve and store dependencies using distinct structures:

- **Hoisted (npm / Yarn v1)**: flattens the dependency graph. Every package, including nested dependencies, is moved to the root `node_modules` folder. This layout permits code to import libraries not listed in `package.json`.
- **Content-Addressable Store (pnpm)**: Saves all packages once in a single global store (`~/.pnpm-store`). Within a project's `node_modules`, pnpm creates a nested directory structure and uses hard-links to target the global store. Only explicitly defined dependencies are visible to the application, eliminating phantom imports.

```
+-----------------------------------------------------------------+
| HOISTED (npm/Yarn v1)                                           |
| node_modules/                                                   |
|   ├── express/                                                  |
|   └── lodash/  <-- Hoisted, visible even if not in package.json |
+-----------------------------------------------------------------+
                               VS
+-----------------------------------------------------------------+
| LINKED (pnpm)                                                   |
| node_modules/                                                   |
|   ├── .pnpm/ (Global Store Symlinks)                            |
|   └── express/ <-- Only explicitly defined packages visible     |
+-----------------------------------------------------------------+
```

### 2. Workspace Topologies

Monorepo workspaces allow you to link local packages together as symlinks:

1. **Local Linking**: Code updates in a shared UI library are reflected in the consumer application instantly without publishing.
1. **Shared Lockfile**: Workspaces share a single lockfile in the repository root, ensuring all packages resolve compatible dependency versions.

---

## Real-World Production Learnings

We operated a monorepo containing 15 microservices and shared utility libraries.

**The Failure**:
Our build pipeline took over 12 minutes to install dependencies in CI, exhausting runner memory limits. Additionally, one of our microservices crashed on startup in production with the error `Error: Cannot find module 'minimist'`, even though it passed all local developer tests and linting runs.

**The Diagnostic**:

1. **Phantom Dependency Leak**: The microservice imported `minimist` directly. It was not defined in the service's `package.json`, but the import worked locally because another dependency had brought it in, and Yarn v1 hoisted it to the root. In the production container build, the parent library was excluded, leaving `minimist` missing.
2. **Duplicate Storage Overhead**: The CI runner had to download and copy identical versions of heavy libraries (e.g. React, Lodash) across all 15 workspaces, slowing down the build pipeline.

**The Refactor**:
We migrated our monorepo from Yarn v1 to pnpm. We defined workspaces, configured strict symlink enforcement, and reduced installation overhead:

1. **Configured Workspaces**: Created `pnpm-workspace.yaml` in the root to define package paths.
2. **Strict Ingress Enforcement**: Enforced pnpm's strict symlink layout, which blocks phantom imports immediately during local development.
3. **Optimized CI Caching**: Configured GitHub Actions to cache the pnpm global store path, accelerating installation.

Here is our monorepo workspace configuration:

```yaml
# pnpm-workspace.yaml
packages:
  # Include all packages and applications inside subdirectories
  - 'apps/*'
  - 'packages/*'
```

Here is a sample package definition for a consumer app using local workspaces:

```json
// apps/admin-portal/package.json
{
  "name": "admin-portal",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.19.2",
    // Import shared package from workspace using workspace protocol
    "@org/ui-library": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.2"
  }
}
```

By switching to pnpm:

- The missing package bug (`minimist`) was caught locally during the migration phase, as pnpm's strict layout blocked the phantom import immediately.
- Installation times in CI dropped from **12 minutes** to **1.4 minutes**, as packages are hard-linked from the global cache instead of copied.
- Disk space usage on developer laptops dropped by **70%**, as duplicate packages are stored once globally.

---

## Related Reading

- [Dependency Management Basics](./basics.md)
- [NPM Package Publishing](./npm-package-publishing.md)
- [eslint-and-prettier.md](../linters-and-formatters/eslint-and-prettier.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.tooling-and-workflows.dependency-management.package-managers-yarn-pnpm.md)
