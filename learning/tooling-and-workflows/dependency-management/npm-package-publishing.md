[⬅️ Back to Tooling & Workflows](../README.md)

# NPM Package Publishing

An operational guide to publishing Node.js modules, configuring hybrid package exports (ESM & CommonJS), establishing private registry scopes, and whitelisting package exports.

---

## Why It Matters

Publishing shared utility libraries or CLI tools is a powerful way to reduce duplication across microservices. However, misconfigured package publishing can lead to serious incidents. Without a strict whitelist configuration, you risk publishing local `.env` files containing production secrets or uploading megabytes of test code and documentation to the registry.

Additionally, if a library is bundled exclusively in a single format, clients running different runtimes (such as legacy CommonJS backends vs. modern ESM frontends) will encounter compile-time or runtime errors. Securing and optimizing published packages requires structuring hybrid export maps and automating release workflows.

---

## Core Concepts

### 1. The Package Whitelist: `files` Array

By default, publishing an npm package uploads every file in the directory unless excluded by `.npmignore`. To prevent accidental leaks of secrets or local configurations, define a whitelist in `package.json`:

```json
{
  "files": ["dist", "bin"]
}
```

This forces npm to ignore all other source folders (e.g., `src`, `tests`), environment variables (`.env`), and tool configurations.

### 2. Dual-Format Packaging (Hybrid Modules)

To support both CommonJS (`require`) and ES Modules (`import`), configure a hybrid package export map inside `package.json`:

```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }
}
```

### 3. Private Registry Scopes

Organization packages should be published under a scope (e.g., `@org/logger`) to prevent namespace collisions. Configure authentication and scopes in `.npmrc`:

```ini
# .npmrc configuration for private registries
@org:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

---

## Real-World Production Learnings

We operated a shared database encryption helper utility used by five backend microservice teams.

**The Failure**:
During a routine security audit, we identified that a version of our encryption helper was published containing local developer `.env` files with database secrets. The package size had also ballooned to 48MB due to the inclusion of large local database test fixtures.

Furthermore, two teams were unable to upgrade because their older NestJS backends (running CommonJS) threw `SyntaxError: Cannot use import statement outside a module` when importing the library.

**The Diagnostic**:

1. **Missing Whitelist**: The library lacked a `files` array, causing npm to upload all directory contents.
2. **ESM-Only Bundling**: The library was compiled solely to ES Modules, breaking compatibility with older CommonJS applications.
3. **Manual Versioning Mistakes**: Developers bumped versions manually, resulting in incorrect tags and missed releases.

**The Refactor**:
We refactored the library configuration to use `tsup` for compiling dual-format outputs, whitelisted build assets, and automated the publishing process:

1. **Whitelisted Exports**: Configured the `files` array to target only the built `/dist` directory.
2. **Hybrid Module Compilation**: Configured `tsup` to build both `.js` (CJS) and `.mjs` (ESM) files.
3. **Automated Publish Workflows**: Configured GitHub Actions to handle semantic versioning and publishing automatically.

Here is the secure, hybrid `package.json` configuration:

```json
// package.json
{
  "name": "@org/encryption-helper",
  "version": "1.3.0",
  "description": "Shared database cryptographic utilities",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": [
    "dist" // Whitelist build directory only
  ],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "release": "release-it"
  },
  "publishConfig": {
    "access": "restricted",
    "registry": "https://npm.pkg.github.com"
  },
  "devDependencies": {
    "release-it": "^17.1.0",
    "tsup": "^8.0.2",
    "typescript": "^5.4.5"
  }
}
```

By refactoring our package settings:

- The package upload size dropped from **48MB** to **82KB**, as all tests, database mocks, and local files were excluded.
- Both CommonJS and ESM client applications were able to import the library cleanly.
- Git tag releases and version bumps are handled automatically in the CI pipeline, eliminating manual deployment errors.

---

### 📖 Related Blog Posts

- [Ref: I Published My First npm CLI Tool](../../../blogs/I_Published_My_First_npm_CLI_Tool.md)

---

## Related Reading

- [Dependency Management Basics](./basics.md)
- [Yarn and PNPM Workspaces](./package-managers-yarn-pnpm.md)
- [rust-based-js-tooling.md](../linters-and-formatters/rust-based-js-tooling.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.tooling-and-workflows.dependency-management.npm-package-publishing.md)
