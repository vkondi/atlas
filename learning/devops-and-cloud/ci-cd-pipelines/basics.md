[⬅️ Back to DevOps & Cloud](../README.md)

# CI/CD Basics

An operational engineering guide to Continuous Integration, Continuous Delivery, and Continuous Deployment, detailing Blue-Green, Canary, and Rolling deployment topologies, and database migration safety patterns.

---

## Why It Matters

Manual software deployments are a major source of system downtime. When engineers manually build binaries, run tests, and copy files to production servers, the process is prone to human error, environment drift, and slow recoveries during outages. **CI/CD Pipelines** automate this workflow, converting software delivery into a repeatable, auditable, and self-healing process. However, building pipelines without safety gates, deployment strategies, or backward-compatible database migrations leads to catastrophic cluster-wide failures and impossible rollbacks.

---

## Core Concepts

### 1. Defining CI, CD, and CD

Although grouped together, the lifecycle consists of three distinct maturity stages:

1. **Continuous Integration (CI)**: The practice of merging developer code changes into a central repository mainline (usually multiple times per day). Every merge triggers an automated build and test runner suite, verifying code correctness before it integrates. This prevents "integration hell" where branching structures diverge.
1. **Continuous Delivery (CD)**: An extension of CI where the build artifact (e.g., Docker image) is automatically compiled, tested, and staged. The codebase is kept in a **deployable state** at all times. The actual push of the build artifact to production is triggered manually (a "one-click" manual release).
1. **Continuous Deployment (CD)**: The ultimate automation phase. Every commit that passes the automated pipeline gates is immediately and automatically deployed to production servers without human intervention.

### 2. High-Availability Deployment Strategies

To update systems without interrupting active users, organizations employ specific deployment topologies:

- **Blue-Green Deployment**: Maintains two identical physical server environments: Blue (active production traffic) and Green (new deployment stage).
  - The new build is deployed and verified in the idle Green environment.
  - Traffic is routed (via DNS or load balancer switches) from Blue to Green.
  - _Rollback_: If Green exhibits failures, traffic is immediately routed back to Blue.
- **Canary Deployment**: Gradually introduces the new software version to production:
  - A small percentage of traffic (e.g., 5%) is routed to a "canary" subset of nodes running the new version.
  - The pipeline monitors application error rates, latency, and system resource metrics.
  - If stable, the routing is incrementally scaled (5% -> 25% -> 50% -> 100%) across the main fleet.
- **Rolling Updates**: Replaces running instances of the application sequentially (e.g., terminating 1 old container and starting 1 new container). This requires no duplicate hardware resources, but means that both old and new code versions run side-by-side in the pool during the transition.

---

## Real-World Production Learnings

We operated a high-volume fintech transaction API, utilizing a Blue-Green deployment strategy to achieve zero-downtime releases.

**The Failure**:
We deployed a new version of the API to the Green environment. The deployment included a database schema migration script that dropped a column (`billing_address_street`) and consolidated data into a new JSONB column (`address_data`).

We ran our green tests, verified the API was healthy, and flipped the load balancer traffic to the Green environment. Immediately, transactions began failing. When we flipped the load balancer back to the Blue environment to execute a rollback, the Blue environment crashed on startup, bringing down the entire transactional pipeline.

**The Diagnostic**:

1. **Destructive Database Schema Migration**: The database migration ran synchronously during the Green deployment phase, dropping the database column.
2. **Backward-Incompatibility**: The Blue application code, which was still running on the host, expected the dropped column to exist in SQL query schemas. Flipped traffic could not run on Blue because the database schema had changed, making a clean rollback impossible.

**The Refactor**:
We banned destructive database migrations during deployments and implemented the **Expand and Contract (Parallel Run) Pattern**:

1. **Phase 1 (Expand)**: Add the new column (`address_data`) to the database, keeping the old column (`billing_address_street`) active.
2. **Phase 2 (Transition)**: Deploy a version of the code that writes to _both_ columns but reads from the old one, ensuring compatibility.
3. **Phase 3 (Data Migration)**: Run a background script to migrate historical data from the old column to the new one.
4. **Phase 4 (Contract)**: Deploy a new version of the code that reads/writes only to the new column, and run a final database schema migration to drop the old column.

Here is the database migration strategy flow we formalize for our schema scripts:

```sql
-- Safe / Multi-Phase Migration Step (Phase 1: Expand)
-- Goal: Introduce JSONB column without dropping the legacy VARCHAR column

-- 1. Create the new column with default parameters (must be nullable or have defaults)
ALTER TABLE customer_accounts
ADD COLUMN IF NOT EXISTS address_data JSONB DEFAULT '{}'::jsonb;

-- 2. Create a database trigger to mirror new writes to both columns
CREATE OR REPLACE FUNCTION sync_customer_address()
RETURNS TRIGGER AS $$
BEGIN
    NEW.address_data = jsonb_build_object(
        'street', NEW.billing_address_street,
        'city', NEW.billing_address_city
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mirror_address_write_trigger
BEFORE INSERT OR UPDATE ON customer_accounts
FOR EACH ROW
EXECUTE FUNCTION sync_customer_address();
```

By transitioning to the Expand and Contract pattern, we ensured that the database was compatible with both the old (Blue) and new (Green) codebases at all times. If a deployment fails, we can safely flip traffic back to the old environment without encountering schema mismatch crashes, ensuring transactional continuity.

---

## Related Reading

- [GitHub Actions Workflows](./github-actions-workflows.md)
- [Automated Testing in Pipelines](./automated-testing-in-pipelines.md)
- [Schema Evolution & Migrations](../../databases/data-modeling/schema-evolution-migrations.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.ci-cd-pipelines.basics.md)
