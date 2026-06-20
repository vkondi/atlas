[⬅️ Back to Career & Leadership](../README.md)

# Architectural Decision Records

An operational guide to Architectural Decision Records (ADRs), defining document structures, managing ADR lifecycles in version control, and establishing technical alignment logs.

---

## Why It Matters

As software systems grow, teams make thousands of design choices: selecting databases, defining API formats, and setting caching strategies. Over time, the context behind these decisions is forgotten. When new engineers join, they may not understand why a system was designed a certain way, leading to repeated debates or migrations that re-introduce previously resolved bugs.

**Architectural Decision Records (ADRs)** solve this. They are lightweight, plain-text documents that capture the context, options, decision, and consequences of critical technical choices. By committing ADRs directly to your git repository, you create a historical log of your system's architecture, helping developers understand past design choices and align on future updates.

---

## Core Concepts

### 1. The Structure of an ADR

An ADR is short (typically 1-2 pages) and follows a structured template:

1. **Title**: Numbered sequentially to show timeline (e.g., `ADR-004: Select PostgreSQL for Session Storage`).
1. **Status**: The current state of the decision: `Proposed`, `Accepted`, `Deprecated` (if superceded by a later ADR), or `Rejected`.
1. **Context**: The problem being solved, the constraints (business and technical), and the alternatives considered along with their trade-offs.
1. **Decision**: The chosen path, the justification, and why the alternatives were rejected.
1. **Consequences**: The impact of the decision—both positive (e.g., simplified queries) and negative (e.g., operational overhead or technical debt).

### 2. The Git-Based ADR Workflow

To ensure ADRs remain active and useful:

- **Commit to Git**: Store ADRs in a dedicated folder (e.g., `/docs/adr/`) in the main repository.
- **Peer Review**: Submit new ADRs as Pull Requests, allowing the team to review and discuss the design before accepting it.
- **Maintain an Index**: Maintain a `README.md` file in the ADR directory that links to each record and lists its current status.

---

## Real-World Production Learnings

We operated a SaaS scheduling engine where team size grew from 5 to 25 developers, and system documentation began to deteriorate.

**The Failure**:
A senior engineer left the company. Six months later, a new developer proposed migrating our session storage from Redis to PostgreSQL, believing PostgreSQL would simplify the stack. The team spent three weeks starting a pilot migration, only to revert the changes. They discovered that database connection exhaustion and transaction locks on the user tables crashed the staging cluster under load—a lesson the team had already learned and resolved two years prior.

**The Diagnostic**:

1. **Oral History reliance**: Critical design decisions were stored in individual developers' minds, leaving the company when they left.
2. **Repeated Technical Debates**: Lacking documented decisions forced the team to repeat past evaluations.
3. **Slow Developer Onboarding**: New hires had no documentation detailing why specific database models were selected.

**The Refactor**:
We adopted a Git-based ADR process, backfilled records for past system design choices, and required PR reviews for all new architectural updates:

1. **Established ADR Folder**: Created `/docs/adr/` to store design records.
2. **Backfilled Historical Choices**: Documented why Redis was selected for sessions, preventing future relational migrations.
3. **PR Design Reviews**: Integrated ADR reviews into our standard design process.

Here is the markdown template we checked in for ADR-002:

```markdown
# ADR-002: Retain Redis for Session Cache Storage

## Status

Accepted (Supercedes oral design discussions from 2024)

## Context

Our user session cache handles up to 8,000 read/write operations per second. A proposal was made to migrate session storage to our primary PostgreSQL database to reduce operational complexity and remove Redis from the stack.

### Alternatives Evaluated

- **PostgreSQL JSONB**: Would simplify our infrastructure by removing Redis. However, our load tests showed that concurrent session writes caused transaction lock contention and database connection exhaustion.
- **Redis Key-Value**: Requires managing separate infrastructure, but operates completely in memory and handles the required scale with sub-millisecond latencies.

## Decision

We will retain Redis for session storage. The performance benefits of in-memory caching outweigh the operational cost of managing a separate database instance.

## Consequences

- **Infrastructure**: We must continue to maintain and monitor our Redis cluster.
- **Code Complexity**: Runtimes must manage separate database and cache connection pools.
- **Performance**: Session lookup latencies will remain under 2ms, protecting our API performance metrics.
```

By enforcing this process:

- The team stopped repeating old technical debates, saving weeks of development time.
- New developers onboarded faster, understanding the historical context behind system designs on their first week.
- The team aligned on technical decisions, improving architectural consistency across all services.

---

## Related Reading

- [Engineering Leadership Basics](./basics.md)
- [Mentoring Engineers](./mentoring-engineers.md)
- [Engineering Practices Foundations](../engineering-practices/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.leadership-skills.architectural-decision-records.md)
