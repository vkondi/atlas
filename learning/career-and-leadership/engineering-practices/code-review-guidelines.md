[⬅️ Back to Career & Leadership](../README.md)

# Code Review Guidelines

An operational guide to code reviews, defining pull request size limits, utilizing Conventional Comments, and establishing escalation protocols to prevent review deadlocks.

---

## Why It Matters

Code reviews are a vital tool for maintaining code quality, sharing technical knowledge, and preventing production regressions. However, without clear guidelines, code reviews can quickly become a development bottleneck. Teams often spend days debating formatting style, reviewing bloated 1,500-line pull requests, or debating design preferences. This slows down delivery velocity and creates friction within the team.

Establishing clear, automated code review guidelines ensures that reviews focus on logical correctness, test coverage, and security risks. Standardizing communication templates and setting pull request constraints helps teams maintain high quality while keeping delivery pipelines moving quickly.

---

## Core Concepts

### 1. Conventional Comments

To prevent misunderstandings, use explicit prefix tags in code review comments to indicate importance:

- **`[blocking]`**: A critical issue that must be addressed before merging (e.g., a security vulnerability, a logical bug, or missing test coverage).
- **`[suggestion]`**: An alternative approach that could improve performance or readability. Non-blocking.
- **`[nit]`**: A minor styling or naming improvement. Non-blocking; the author can choose to ignore it.
- **`[question]`**: Seeking clarification on the implementation details. Non-blocking.

### 2. Pull Request Size Budgets

Review quality decreases as pull request size increases:

```
                      REVIEW QUALITY VS. PR SIZE

    Review Quality
        ^
        |     * (50 lines: Deep inspection, catches bugs)
        |       *
        |         * (200 lines: Moderate review)
        |           *
        |             *
        |               * (1000 lines: Looks good to me!)
        +--------------------------------------------------> PR Size
```

- Limit pull requests to **<300 lines of functional code changes** (excluding auto-generated lockfiles or test assets).
- Break large features down into smaller, sequential PRs behind feature flags.

### 3. Automated Style Separation

Never use peer reviews to correct code formatting, indentation, or imports. Offload these checks to automated linters and formatters in the CI/CD pipeline. If a pull request passes CI, its style is considered valid.

---

## Real-World Production Learnings

We operated a core transaction service where the average pull request cycle time reached 4.8 days, slowing down weekly releases.

**The Failure**:
Pull requests were regularly delayed by lengthy debates. Reviewers argued over variable names, ternary statements, and whitespace choices. Furthermore, two senior engineers got into an architectural debate on a pull request about using relational vs. non-relational query design. The PR sat unmerged for two weeks, delaying a critical payment feature.

**The Diagnostic**:

1. **Style disputes**: Wasting time reviewing items that should be automated by formatters.
2. **Review exhaustion**: PR sizes regularly exceeded 1,000 lines, causing reviewers to skim the code and miss major logic bugs.
3. **No escalation path**: Lacking a structured process for resolving technical disagreements.

**The Refactor**:
We automated style validations, capped PR sizes, implemented Conventional Comments, and established a 3-comment escalation rule:

1. **Enforced Formatting in CI**: Added automated Biome validations to block builds with style errors.
2. **Capped PR Size**: Limited pull request scopes to 250 functional lines of code.
3. **Implemented Conventional Comments**: Aligned the team on using standard prefix tags.
4. **Defined the 3-Comment Resolution Rule**: If a technical discussion cannot be resolved within 3 comments, the engineers must sync in a 5-minute call or defer to the Tech Lead.

Here is the pull request template we added to automate descriptions and checklist reviews:

```markdown
# Pull Request Description

## Proposed Changes

- Brief summary of what was changed.
- Decoupled billing logic from database transaction states.

## Size Checklist

- [x] PR contains less than 300 lines of functional code changes.

## Quality Checklist

- [x] All unit and integration tests pass locally.
- [x] Formatting and linting checks pass.
- [x] Security inputs are sanitized and parameterized.

## Critical Areas (Non-blocking / Blocking)

- **`[blocking]`**: Reviewers, please verify the transaction isolation level in `billing-service.ts`.
```

By implementing these guidelines:

- Average pull request review time dropped from **4.8 days** to **1.1 days**.
- Cognitive fatigue during reviews decreased, leading to a **30% increase** in bugs identified before merging.
- Interpersonal friction was resolved by automating style enforcement and establishing clear escalation paths.

---

## Related Reading

- [Engineering Practices Foundations](./basics.md)
- [Incident Retrospective Framework](./incident-retrospective-framework.md)
- [Technical Debt Management](./technical-debt-management.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.engineering-practices.code-review-guidelines.md)
