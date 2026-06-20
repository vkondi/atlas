[⬅️ Back to Tooling & Workflows](../README.md)

# Biome Toolchain Setup

An operational guide to configuring Biome, unifying linting, formatting, and import sorting into a single Rust-based toolchain, and migrating from ESLint and Prettier.

---

## Why It Matters

Traditional JavaScript toolchains are highly fragmented. Developers must install, configure, and maintain separate packages for code linting (ESLint), formatting (Prettier), import organization, and TypeScript syntax checks. This fragmentation leads to rule conflicts between linters and formatters, slow execution times, and complex configuration setups.

**Biome** solves this by unifying formatting, linting, and import sorting into a single toolchain written in Rust. By parsing files once and applying rules across a shared Abstract Syntax Tree (AST), Biome executes up to 30x faster than traditional Node-based tools, improving development loops and accelerating CI pipelines.

---

## Core Concepts

### 1. Unification Benefits

Biome replaces multiple configurations with a single `biome.json` file in the project root:

```
FRAGMENTED TOOLCHAIN                 UNIFIED BIOME TOOLCHAIN
├── .eslintrc.json
├── .eslintignore
├── .prettierrc                       └── biome.json (Format + Lint + Imports)
├── .prettierignore
└── tsconfig.json
```

- **No Conflicts**: Formatting rules and lint guidelines cannot conflict because they are managed by the same tool.
- **Single Dependency**: Reduces project weight by replacing dozens of ESLint plugins and Prettier adapters with one native binary.

### 2. High-Performance Benchmarks

Because Biome is compiled natively in Rust and leverages multithreading, it processes codebases at scale in milliseconds:

- **ESLint + Prettier**: Generates the AST twice using Node.js processes, consuming significant CPU resources.
- **Biome**: Parses the file once, formatting and linting it in a single pass. A task that takes 1 minute in ESLint completes in less than 2 seconds in Biome.

---

## Real-World Production Learnings

We operated a React/TypeScript monorepo containing over 4,000 files, where linting and formatting gates slowed down developer commits.

**The Failure**:
Our linting and formatting steps in CI took over 5 minutes to run, delaying pull request checks. Furthermore, developers frequently encountered conflicts: Prettier would format a file locally, but ESLint would flag spacing warnings on commit, forcing developers to manually adjust code or bypass hook validations.

**The Diagnostic**:

1. **Redundant AST Parsing**: Running ESLint and Prettier separately meant the codebase was parsed twice.
2. **Rule Conflicts**: Conflicting configuration files led to loop warnings.
3. **Node.js CPU Overhead**: Single-core CI runners throttled under heavy Node execution tasks.

**The Refactor**:
We migrated our monorepo to Biome, removed ESLint and Prettier configurations, and integrated Biome validations into our CI workflows:

1. **Removed Legacy Tools**: Uninstalled `eslint`, `prettier`, and their corresponding plugins.
2. **Configured Biome**: Created a single `biome.json` file.
3. **Integrated CI Validation**: Replaced the linting pipeline steps with `biome ci`.

Here is the production-ready `biome.json` configuration we deployed:

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "quoteStyle": "single"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "noVar": "error",
        "useConst": "error"
      },
      "suspicious": {
        "noDoubleEquals": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteProperties": "asNeeded",
      "trailingCommas": "es5"
    }
  }
}
```

By switching to Biome:

- Our CI lint and format pipeline step time fell from **5.2 minutes** to **2.8 seconds**.
- Pre-commit hooks execute instantly, ensuring clean code before commits reach CI.
- Package dependency counts were reduced, simplifying library upgrades.

---

### 📖 Related Blog Posts

- [Ref: Biome Replace ESLint Prettier With One Tool](../../../blogs/Biome_Replace_ESLint__Prettier_With_One_Tool.md)

---

## Related Reading

- [Static Analysis Basics](./basics.md)
- [ESLint & Prettier Integrations](./eslint-and-prettier.md)
- [rust-based-js-tooling.md](./rust-based-js-tooling.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.tooling-and-workflows.linters-and-formatters.biome-setup.md)
