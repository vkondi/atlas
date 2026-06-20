[⬅️ Back to Playbooks](../README.md)

# Checklist Basics

An operational guide to engineering checklists, comparing Read-Do vs. Do-Confirm execution models, and integrating checklist validation checks into software operations.

---

## Why It Matters

Software engineering operations involve complex, multi-stage procedures: running database migrations, executing production releases, hardening system repositories, and triaging production outages. Relying solely on human memory during high-pressure events (like an emergency hotfix or a major system launch) leads to critical mistakes, skipped validations, and operational downtime.

Standardized checklists transform complex operations into repeatable, reliable processes. By organizing tasks into linear execution steps, teams reduce human error, ensure consistency across developers, and establish a clear record of operational checks.

---

## Core Concepts

### 1. Operational Checklist Models

Adapted from aviation safety standards (detailed in Atul Gawande's _The Checklist Manifesto_), checklists operate in two primary modes:

- **Read-Do**: The operator reads each item sequentially, executes the task, and checks it off before moving to the next item. This model is ideal for complex, high-risk, or unfamiliar processes (e.g., conducting a security audit).
- **Do-Confirm**: The operator executes tasks from memory or standard habits, then stops at a designated checkpoint to review the checklist and confirm that every step was executed correctly. This model is best for experienced developers running routine tasks (e.g., standard code reviews).

### 2. The Checklist Lifecycle

Checklists are not static documents:

1. **Authoring**: Define clear, concise, and actionable checks, avoiding vague instructions (e.g., replace "check server" with "verify server health endpoint returns 200 OK").
1. **Execution**: Require checklist runs during active processes, confirming completion.
1. **Continuous Iteration**: When an incident occurs due to a skipped step or unforeseen edge case, the post-incident retrospective must update the checklist immediately.

---

## Real-World Production Learnings

We operated a high-volume financial transaction service, executing bi-weekly production releases.

**The Failure**:
During a standard release, a senior engineer ran database schema migrations and deployed a new container version. The deployment completed successfully, but the checkout endpoint began throwing database exceptions, halting checkout for 45 minutes and costing $15,000 in lost transactions. The column rename had broken the ORM mapping, and the engineer had skipped verifying the endpoint manually.

**The Diagnostic**:

1. **Unstandardized Release Procedures**: The release was executed from memory without a documented verification process.
2. **Implicit Trust in Code**: The engineer assumed that because the build passed, the database migration and container runtime were synchronized.
3. **No Checkout Verification**: The team had no post-deployment check requiring a functional smoke test of the billing path.

**The Refactor**:
We created a mandatory Release Checklist, adopting a Do-Confirm model that requires developers to verify migrations, monitor database replication lag, and execute a checkout smoke test before finalizing the deployment:

1. **Created Checklist**: Documented Pre-Flight, Flight, and Post-Flight checks.
2. **Enforced Verification**: Made checklist approval a prerequisite for closing release tickets.
3. **Automated Smoke Tests**: Integrated basic API checks into the post-deployment step.

Here is the standardized release checklist template we deployed:

```markdown
# Production Release Checklist: Do-Confirm Template

## 1. Pre-Flight Check (Before Deployment)

- [ ] Verify that all CI status checks (unit tests, lints) are passing.
- [ ] Confirm database backup was completed successfully.
- [ ] Verify that the database migrations have been dry-run in staging.

## 2. Flight Check (During Deployment)

- [ ] Apply database schema migrations.
- [ ] Deploy the new container build to the staging slot.
- [ ] Check database replication lag metrics (must be <1 second).

## 3. Post-Flight Check (After Deployment)

- [ ] Verify that the application container health check endpoint returns `200 OK`.
- [ ] Execute checkout smoke test (simulate a $1 transaction).
- [ ] Monitor Datadog error rates for 15 minutes post-deployment (must remain <0.1%).
```

By introducing this operational gate:

- Outages caused by missed verification steps were eliminated.
- Release steps are consistent across all engineers, reducing reliance on specific team members.
- Outage retrospectives are directly tied to checklist updates, preventing the recurrence of past release issues.

---

## Related Reading

- [Frontend Performance Checklist](./frontend-performance-checklist.md)
- [Production Release Checklist](./production-release-checklist.md)
- [Security Audit Checklist](./security-audit-checklist.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.playbooks.checklists.basics.md)
