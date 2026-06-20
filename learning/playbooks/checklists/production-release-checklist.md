[⬅️ Back to Playbooks](../README.md)

# Production Release Checklist

An operational checklist for executing production deployments, managing database migrations, verifying system health, and executing rollback procedures.

---

## Why It Matters

Deploying updates to production is a critical operational event. Without a structured validation checklist, deployments are prone to mistakes: environment configurations are missed, database migrations are run out of sequence, or rollback plans are missing. This can lead to service downtime and customer friction.

Implementing a production release checklist establishes standard safeguards for your deployment workflows. Enforcing pre-deployment checks, post-deployment verification (smoke testing), and pre-configured rollback steps ensures that releases are executed smoothly, minimizing downtime.

---

## Core Concepts

### 1. Database Migration Sequence: Expand & Contract

To prevent downtime when modifying database schemas during a deployment, follow the **Expand & Contract** pattern:

1. **Expand (Pre-Deployment)**: Add the new database column or table. The database now supports both the old and new application versions.
1. **Deploy**: Update the application containers to write to both the old and new columns, and read from the old column.
1. **Migrate**: Run a script to copy historical data from the old column to the new column.
1. **Update**: Update the application containers to read and write exclusively from the new column.
1. **Contract (Post-Deployment)**: Drop the old database column once the old container version is no longer active.

### 2. Post-Deployment Verification (Smoke Testing)

A "smoke test" is a suite of automated or manual checks that verify the application's core functions (e.g., user login, checkout, data display) immediately after deployment. If the smoke tests fail, the deployment is rolled back.

### 3. Rollback Playbooks

A rollback is not a failure; it is a standard operational safeguard. Every deployment must have a pre-configured rollback playbook, listing:

- **Rollback Thresholds**: The error rate or latency targets that trigger an automatic rollback (e.g., error rate >1% for 5 minutes).
- **Rollback Commands**: Pre-written command-line scripts to restore the previous container version and revert database migrations if necessary.

---

## Real-World Production Learnings

We operated a customer management API, deploying updates to a Kubernetes cluster.

**The Failure**:
During a release, a developer ran a database migration that dropped a column. The deployment pipeline began updating the containers sequentially (rolling update). Immediately, the running containers threw database exceptions, taking the authentication system offline for 25 minutes.

Furthermore, because there was no documented rollback script, developers had to manually search for Kubernetes commands during the outage, delaying recovery.

**The Diagnostic**:

1. **Dropped Column Outage**: The database column was dropped while the old container version was still running, violating the Expand & Contract pattern.
2. **Missing Rollback Script**: The team lacked pre-configured rollback commands, delaying recovery.
3. **No Automatic Rollback**: The deployment system did not roll back automatically when error rates spiked.

**The Refactor**:
We adopted the Expand & Contract database migration pattern, implemented a mandatory release checklist, and documented rollback playbooks for all deployment scripts:

1. **Enforced Expand & Contract**: Mandated that column deletions be performed in separate sprints.
2. **Setup Rollback Playbooks**: Included pre-written rollback commands in our release template.
3. **Configured Auto-Rollbacks**: Set up deployment pipelines to roll back automatically if container health checks fail.

Here is the operational checklist we implemented:

````markdown
# Production Release Checklist

## 1. Pre-Deployment Checks

- [ ] Confirm all tests (unit, integration, lint) pass in the build pipeline.
- [ ] Verify that database migrations follow the Expand & Contract pattern.
- [ ] Confirm that all required environment variables are set in the production environment.

## 2. Deployment Execution

- [ ] Apply database migrations (Expand phase).
- [ ] Execute rolling update to deploy the new container version.
- [ ] Monitor container startup logs for initialization errors.

## 3. Post-Deployment Verification (Smoke Tests)

- [ ] Verify that the application health check endpoint returns `200 OK`.
- [ ] Execute the automated smoke test suite (log in, query data, log out).
- [ ] Monitor Datadog dashboards for 15 minutes post-release.

## 4. Rollback Playbook (Execute if smoke tests fail or error rates spike >1%)

- **Container Rollback Command**:
  ```bash
  # Revert to the previous deployment version in Kubernetes
  kubectl rollout undo deployment/auth-service -n production
  ```
````

- **Database Rollback Command**:
  ```bash
  # Revert the last applied database migration step if necessary
  prisma migrate resolve --rolled-back-to-last-stable-version
  ```

```

By introducing this checklist:
* Outages caused by database migration conflicts were eliminated.
* Rollbacks are executed in under **2 minutes** using the pre-configured playbook commands, minimizing downtime.
* Release coordination became repeatable, allowing any engineer to manage deployments safely.

---

## Related Reading

* [Checklist Basics](./basics.md)
* [Frontend Performance Checklist](./frontend-performance-checklist.md)
* [Security Audit Checklist](./security-audit-checklist.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.playbooks.checklists.production-release-checklist.md)
```
