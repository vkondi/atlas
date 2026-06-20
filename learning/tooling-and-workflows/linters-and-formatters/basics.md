[⬅️ Back to Tooling & Workflows](../README.md)

# Static Analysis Basics

An operational guide to static code analysis, deconstructing Abstract Syntax Trees (AST), differentiating syntactic vs. semantic rules, and integrating automated linting gates.

---

## Why It Matters

Code quality is difficult to maintain manually as teams scale. Human code reviewers miss logic flaws, unused variables, and security risks. Static analysis tools parse source code files without executing them, identifying syntax bugs, type safety violations, and code smells before the application is compiled or deployed.

Enforcing static analysis ensures consistency across the codebase. By analyzing code structures automatically during development, you prevent common runtime exceptions and free up developer time to focus on complex business logic.

---

## Core Concepts

### 1. Abstract Syntax Trees (AST)

Static analysis tools do not read code as plain text. Instead, they compile source code into a structured tree layout known as an **Abstract Syntax Tree (AST)**:

```
                            SOURCE CODE
                  const message = "Hello World";
                                 |
                                 v
                        AST PARSER (ESTree)
                                 |
         +-----------------------+-----------------------+
         |                                               |
  [ VariableDeclaration ]                       [ Literal ]
   kind: "const"                              value: "Hello World"
         |
  [ VariableDeclarator ]
   id: "message"
```

Linters traverse the AST node-by-step, applying rules to specific structures (e.g., verifying that all `VariableDeclaration` nodes use `const` instead of `var`).

### 2. Syntactic vs. Semantic Analysis

- **Syntactic Analysis**: Focuses on code layout and syntax patterns (e.g., identifying trailing commas, enforcing formatting, detecting unused variables). These checks are fast and do not require type resolution.
- **Semantic Analysis**: Inspects scope relationships, type assignments, and logical flows (e.g., verifying that an asynchronous function call uses `await`, or confirming that variable types match their interface declarations).

### 3. Automated Verification Gates

Static analysis must be integrated at multiple points in the developer workflow:

1. **IDE Integration**: Real-time feedback and auto-fixes as the developer types.
1. **Pre-Commit Gate**: Scanning staged files before commits are finalized.
1. **CI Pipeline Gate**: Blocking pull request merges if linting or formatting checks fail.

---

## Real-World Production Learnings

We operated a data processing engine that updated customer profile metrics asynchronously.

**The Failure**:
An outage occurred where customer updates were silently dropped, leading to inconsistent user profile states. The backend server returned successful `200 OK` responses, but the database updates failed to execute. The issue went undetected through local testing and peer code reviews.

**The Diagnostic**:

1. **Floating Promises**: An engineer forgot to write the `await` keyword before a critical database write operation:
   ```javascript
   // Vulnerable Pattern: Floating Promise (unhandled database write)
   db.user.update(userId, data);
   ```
2. **Silent Failure**: The database write executed asynchronously in the background. If the Node process was busy or restarted, the database write was aborted silently, without throwing an exception to the active HTTP request context.
3. **No Automated Scans**: The project did not use static analysis checks to detect unhandled or floating promises.

**The Refactor**:
We configured automated static linting rules to enforce promise resolution checks across our backend codebase, blocking builds if any floating promises are identified:

1. **Configured Static Checks**: Enabled strict promise validation rules.
2. **Integrated CI Gates**: Configured the build pipeline to run lint checks, blocking deployment if errors exist.

Here is the configuration checking for floating promises:

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        // Enforce using await when returning promise results
        "noUnusedVariables": "error",
        "useAwait": "error"
      },
      "suspicious": {
        // Prevent console logs from reaching production builds
        "noConsoleLog": "warn"
      }
    }
  }
}
```

By introducing this validation gate:

- Forgotten `await` statements are identified instantly in the IDE, preventing unhandled background processes.
- Code reviews are streamlined, as style issues are resolved automatically by static tooling.
- Outages caused by unhandled asynchronous operations were eliminated.

---

## Related Reading

- [Biome Configuration Guide](./biome-setup.md)
- [ESLint & Prettier Integrations](./eslint-and-prettier.md)
- [rust-based-js-tooling.md](./rust-based-js-tooling.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.tooling-and-workflows.linters-and-formatters.basics.md)
