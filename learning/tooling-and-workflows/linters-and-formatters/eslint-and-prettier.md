[⬅️ Back to Tooling & Workflows](../README.md)

# ESLint & Prettier Integration

An operational guide to configuring ESLint and Prettier, resolving rule conflicts using eslint-config-prettier, separating styling from quality checks, and setting up IDE save hooks.

---

## Why It Matters

ESLint and Prettier are the most common linting and formatting tools in the JavaScript ecosystem. However, configuring them together frequently leads to conflicts. Because both tools possess opinions on style (such as quotes, semi-colons, and trailing commas), a default setup can create formatting loops: Prettier formats a file, only for ESLint to flag formatting errors immediately after.

Resolving these conflicts requires establishing a clear separation of concerns. ESLint should focus exclusively on code quality (detecting unused variables, logical bugs, and unhandled promises), while Prettier manages stylistic formatting (indentation, line wraps, and quotes).

---

## Core Concepts

### 1. Separation of Responsibilities

To prevent execution conflicts, align the tools with their core competencies:

- **Prettier (Code Formatting)**: Manages style rules (quotes, spaces, line width, brackets). It runs AST parses to rewrite files consistently.
- **ESLint (Code Quality)**: Analyzes logical bugs, variables scope, type compliance, and security warnings.

### 2. Resolving Conflicts: `eslint-config-prettier`

Never run Prettier as an ESLint plugin (`eslint-plugin-prettier`). This approach is slow, degrades editor performance, and clogs lint output with formatting warnings.

Instead, run the tools independently. Use **`eslint-config-prettier`** to disable all ESLint rules that conflict with Prettier's formatting decisions:

```
+------------------+         +----------------------------+
|  ESLint Config   |  ---->  |    eslint-config-prettier  |
| (Quality Rules)  |         | (Disables style conflicts) |
+------------------+         +----------------------------+
```

### 3. Integrated Editor Workflows

Configure your development environment to execute checks in sequence on file save:

1. Prettier runs to format the code layout.
1. ESLint runs to parse logical syntax errors.

---

## Real-World Production Learnings

We operated an enterprise ecommerce portal with 20 developers, where development was slowed down by formatting loops.

**The Failure**:
Developers faced constant editor conflicts. When saving a React file, Prettier auto-fixed quotes to single quotes. Immediately after, ESLint rewrote the file to use double quotes, resulting in Git commits containing mixed style modifications.

Additionally, running linting checks took over 3 minutes in CI, delaying feedback loops.

**The Diagnostic**:

1. **Conflicting Configuration Files**: ESLint had stylistic rules enabled (e.g. `quotes: ["error", "double"]`) that conflicted with Prettier's configuration (`singleQuote: true`).
2. **ESLint Plugin Prettier Overhead**: The codebase executed Prettier inside ESLint as a plugin rule, which duplicated processing cycles.
3. **No Automated Conflict Checks**: The project lacked verification validation checking for configuration conflicts.

**The Refactor**:
We uninstalled `eslint-plugin-prettier`, applied `eslint-config-prettier` to disable stylistic ESLint checks, and configured VS Code to format and lint in a clean sequence:

1. **Uninstalled Plugin**: Removed `eslint-plugin-prettier` from `package.json`.
2. **Applied Config**: Added `eslint-config-prettier` to the `extends` block in `.eslintrc.json`.
3. **Configured IDE Saves**: Configured VS Code settings to separate formatting and linting saves.

Here is the clean, non-conflicting `.eslintrc.json` configuration:

```json
// .eslintrc.json
{
  "root": true,
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    // Must be the last configuration in the array.
    // Disables all formatting rules that conflict with Prettier.
    "prettier"
  ],
  "rules": {
    // Quality rules remain active
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": "warn"
  }
}
```

Here is the corresponding `.prettierrc` configuration:

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Here is the VS Code setup (`.vscode/settings.json`) enforcing the sequence on save:

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

By separating execution paths:

- Formatting loops were completely resolved; Prettier handles the layout, and ESLint verifies code logic.
- CI pipeline execution times fell by **40%** due to the removal of the ESLint Prettier plugin overhead.
- Developers experienced a smoother workflow, with formatting issues resolved silently on save.

---

## Related Reading

- [Static Analysis Basics](./basics.md)
- [Biome Toolchain Setup](./biome-setup.md)
- [rust-based-js-tooling.md](./rust-based-js-tooling.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.tooling-and-workflows.linters-and-formatters.eslint-and-prettier.md)
