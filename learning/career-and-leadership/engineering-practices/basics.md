[⬅️ Back to Career & Leadership](../README.md)

# Engineering Practices Foundations

An operational guide to engineering standards, automating coding styles and quality checks, implementing design patterns, and establishing linting gates in development workflows.

---

## Why It Matters

High-performing software teams are built on consistent, shared engineering practices. In the absence of automated styling and linting standards, codebases quickly degenerate. Developers waste valuable time arguing over code formatting in pull requests, and debugging becomes difficult because different parts of the application follow inconsistent design patterns.

Enforcing automated quality gates and architectural standards creates a shared baseline. This reduces cognitive load during development, minimizes merge conflicts, and ensures the codebase remains maintainable as the team scales.

---

## Core Concepts

### 1. Style Automation: Linters & Formatters

Do not waste developer time reviewing formatting manually. Automate checks at key workflow stages:

1. **Local IDE Save**: Format code automatically on file save using editor extensions (e.g., Biome, Prettier, ESLint).
1. **Pre-Commit Hook**: Use tools like `husky` and `lint-staged` to scan staged files, blocking git commits if formatting or linting rules are violated.
1. **CI Pipeline Gate**: Enforce rules in the remote build pipeline, blocking pull request merges if style or validation checks fail.

### 2. Standardizing Architectural Design Patterns

Align the team on a set of core software patterns to ensure consistent implementation:

- **Separation of Concerns**: Keep request-handling logic (Controllers) decoupled from business logic (Services) and database access patterns (Repositories).
- **Repository Pattern**: Abstract database operations behind a standard repository interface, allowing the database engine to change without impacting business logic.
- **Factory Pattern**: Standardize object creation, keeping object construction separate from business operations.

---

## Real-World Production Learnings

We operated a billing dashboard with a growing team of 15 engineers.

**The Failure**:
We struggled with frequent merge conflicts. Because developers used different editor formatters (Prettier vs. built-in IDE formatters), a single line change often resulted in pull requests containing thousands of lines of whitespace diffs.

Additionally, the code was inconsistent: some modules used raw SQL queries, others used Prisma ORM, and others used dynamic query builders, making it difficult for developers to work outside their primary modules.

**The Diagnostic**:

1. **No Shared Style Standard**: The team had no automated formatters configured in the project root.
2. **Missing Architectural Guidelines**: The lack of established design patterns led to duplicate database connections and inconsistent layouts.
3. **No Commit Validation Hook**: Staged files were committed without style validation.

**The Refactor**:
We configured Biome to automate formatting and linting, implemented git hooks via Husky, and standardized our database query patterns using a Repository framework:

1. **Implemented Biome**: Configured a single formatting rule configuration in the repository root.
2. **Setup Pre-Commit Hooks**: Configured `husky` to check staged code before commits.
3. **Standardized Repository Layout**: Abstracted database access behind a clean Repository interface.

Here is the secure pre-commit validation configuration (`.husky/pre-commit` and `package.json`):

```json
// package.json
{
  "name": "billing-dashboard",
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "@biomejs/biome": "^1.8.0"
  },
  "scripts": {
    "prepare": "husky",
    "lint": "biome lint src",
    "format": "biome format src --write"
  },
  "lint-staged": {
    "src/**/*.{js,ts}": ["biome check --write --no-errors-on-unmatched"]
  }
}
```

Here is the standardized, decoupled Repository pattern implementation:

```typescript
// src/repositories/user-repository.interface.ts
export interface User {
  id: string;
  email: string;
  isActive: boolean;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// src/repositories/prisma-user-repository.ts
import { PrismaClient } from '@prisma/client';
import { IUserRepository, User } from './user-repository.interface';

export class PrismaUserRepository implements IUserRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async save(user: User): Promise<User> {
    return this.prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email, isActive: user.isActive },
      create: { id: user.id, email: user.email, isActive: user.isActive },
    });
  }
}
```

By enforcing these practices:

- Code styling disputes in PRs were completely resolved. Diffs are now limited strictly to functional changes.
- Swapping database access adapters (e.g., from Prisma to a mock client for testing) requires changing only the repository implementation, keeping business logic untouched.
- Invalid, unformatted commits are blocked locally, improving code quality before commits reach CI.

---

## Related Reading

- [Code Review Guidelines](./code-review-guidelines.md)
- [Incident Retrospective Framework](./incident-retrospective-framework.md)
- [Technical Debt Management](./technical-debt-management.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.engineering-practices.basics.md)
