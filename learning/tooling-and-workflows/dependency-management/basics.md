[⬅️ Back to Tooling & Workflows](../README.md)

# Dependency Management Basics

An operational guide to module resolution, deconstructing Semantic Versioning (SemVer) ranges, and enforcing lockfile compliance in team environments.

---

## Why It Matters

JavaScript applications run on deep networks of third-party libraries. Without a clear understanding of version resolution, local environments diverge from CI pipelines and production environments, leading to bugs like missing package errors or unexpected runtime failures.

Dependency management ensures builds are reliable and reproducible. Enforcing exact lockfile resolutions and organizing run-time vs. compile-time dependencies ensures that what you test locally matches exactly what is deployed to production.

---

## Core Concepts

### 1. Node.js Module Resolution

Node.js resolves module imports differently based on module style:

- **CommonJS (`require`)**: Resolves dependencies synchronously. It scans the calling file's local `node_modules` folder, traversing up the directory tree until it finds the package or reaches the root directory.
- **ES Modules (`import`)**: Resolves imports asynchronously, enforcing strict path specifications (including file extensions in native environments).

### 2. Semantic Versioning (SemVer)

SemVer structures package versions as `Major.Minor.Patch` (e.g., `2.1.4`):

| Operator        | Version Range | Allowed Updates | Resolution Rule                                               |
| :-------------- | :------------ | :-------------- | :------------------------------------------------------------ |
| **Caret (`^`)** | `^2.1.4`      | Minor and Patch | Permitted to update up to `<3.0.0`. Default operator for npm. |
| **Tilde (`~`)** | `~2.1.4`      | Patch only      | Permitted to update up to `<2.2.0`.                           |
| **Exact**       | `2.1.4`       | None            | Locked strictly to version `2.1.4`.                           |

### 3. The Lockfile Constraint

A lockfile (`package-lock.json` or `yarn.lock`) records the exact dependency tree resolved during installation, including nested, transient dependencies.

1. **Local Dev**: Running `npm install` updates package definitions and lockfiles to match semver ranges.
1. **Production CI**: Run `npm ci` (or `yarn install --frozen-lockfile`). This installer ignores the semver ranges in `package.json` and downloads the exact versions in the lockfile. If the lockfile is missing or modified, the build halts.

---

## Real-World Production Learnings

We operated a server-side rendering (SSR) application, deploying updates to an automated container cluster.

**The Failure**:
A developer deployed a hotfix that passed all local tests. Immediately after deployment, the server began throwing uncaught start-up errors: `Error: Cannot find module 'lodash-es'`. The check-out and pricing flows crashed for all users.

**The Diagnostic**:

1. **Incorrect Dependency Scoping**: The developer had imported `lodash-es` in core production billing logic, but saved the library under `devDependencies` in `package.json`.
2. **Production Container Pruning**: Our production Docker container build was optimized to prune compile-time dependencies:
   ```bash
   npm install --production
   ```
   This command omitted all `devDependencies`, leaving the runtime without the required `lodash-es` package.
3. **Out of Sync Lockfiles**: The developer committed the `package.json` updates but did not commit the updated `package-lock.json`, hiding the dependency mismatch in CI.

**The Refactor**:
We moved run-time utilities to production dependency blocks, configured our pipelines to enforce lockfile validation, and added Git hooks to prevent uncommitted lockfiles:

1. **Scoped Correctly**: Moved `lodash-es` from `devDependencies` to `dependencies`.
2. **Hardened CI build**: Replaced standard installations with `npm ci`.
3. **Commit Hooks**: Configured lint hooks to check that lockfiles are updated whenever `package.json` changes.

Here is the corrected `package.json` configuration:

```json
// package.json
{
  "name": "ssr-billing-app",
  "version": "1.2.1",
  "dependencies": {
    "express": "^4.19.2",
    "lodash-es": "^4.17.21" // Correctly saved under production dependencies
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "typescript": "^5.4.5" // Development/compilation tooling only
  }
}
```

By enforcing these practices:

- Pruned production container builds executed without missing runtime modules.
- The CI pipeline stops execution immediately if a developer commits `package.json` updates without committing the corresponding `package-lock.json` changes.
- Deployments became fully deterministic, ensuring that production runtimes match tested code packages exactly.

---

## Related Reading

- [NPM Package Publishing](./npm-package-publishing.md)
- [Yarn and PNPM Workspaces](./package-managers-yarn-pnpm.md)
- [eslint-and-prettier.md](../linters-and-formatters/eslint-and-prettier.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.tooling-and-workflows.dependency-management.basics.md)
