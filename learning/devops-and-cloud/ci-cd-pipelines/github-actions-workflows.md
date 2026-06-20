[⬅️ Back to DevOps & Cloud](../README.md)

# GitHub Actions Workflows

An operational engineering guide to GitHub Actions CI/CD workflows, covering event triggers, matrix builds, runner dependency caching, and environment secret injections.

---

## Why It Matters

GitHub Actions has become the standard tool for automating developer workflows directly within the source control lifecycle. However, writing basic, unoptimized YAML manifests leads to slow, redundant execution pipelines: dependencies are re-downloaded on every single run, matrix environments are configured sequentially, and database keys or cloud credentials are hardcoded directly into the repository, exposing the company to major supply chain security risks. To build production-grade workflows, engineers must leverage caching strategies, secure environment injection patterns, and parallelized matrix execution models.

---

## Core Concepts

### 1. Workflow Architecture & Hierarchy

GitHub Actions configurations are declared in YAML files inside the `.github/workflows/` directory:

- **Workflow**: A high-level, automated procedure composed of one or more jobs.
- **Events (`on`)**: Trigger points that activate the workflow (e.g., `push` to main, `pull_request` target branches, CRON schedules, or manual `workflow_dispatch`).
- **Jobs**: A collection of sequential steps executed on the **same virtual machine runner**. Jobs run in parallel by default.
- **Steps**: Individual operations (commands, scripts, or community actions) run within a job.
- **Runners**: Virtual machines hosted by GitHub (Ubuntu, Windows, macOS) or self-hosted inside private networks.

```
                      GitHub Actions Hierarchy

                       [ Trigger Event: Push ]
                                  │
                                  ▼
                        ┌───────────────────┐
                        │     WORKFLOW      │
                        └─────────┬─────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌──────────────────┐                              ┌──────────────────┐
│      JOB A       │ (Runs on Ubuntu-latest)       │      JOB B       │ (Runs on MacOS)
│  - Step 1: Checkout                             │  - Step 1: Init  │
│  - Step 2: Build                                │  - Step 2: test  │
└──────────────────┘                              └──────────────────┘
```

### 2. Advanced Workflow Patterns

- **Matrix Strategy**: Runs multiple variations of a single job concurrently by defining key-value parameter lists (e.g., building a Node.js project across Node versions `18`, `20`, and `22` concurrently).
- **Job Dependencies (`needs`)**: Chains jobs together sequentially (e.g., job `deploy` runs only if job `test` and job `build` complete successfully).
- **Encrypted Secrets**: Custom variables encrypted at the repository or environment level. Injected into steps at runtime via `secrets.SECRET_NAME` and masked in logs to prevent exposure.

### 3. Dependency Caching

To prevent pipelines from re-downloading files (like node modules or maven artifacts), workflows store dependencies using a hash of the lock file:

1. **Cache Look-Up**: The step checks if a cached directory matching `runner.os-dependencies-[lockfile-hash]` exists.
1. **Restore / Fallback**: If it exists, the runner restores the directory immediately, skipping download cycles.
1. **Cache Save**: If missing, dependencies are downloaded, and a post-job script saves the directory state to the cache registry for future runs.

---

## Real-World Production Learnings

We managed a production Monorepo with multiple Node.js applications, building and running test suites on every pull request.

**The Failure**:
Our test pipelines suffered from extreme latency, averaging **over 8.5 minutes per PR execution**.

Furthermore, during a transient outage of the npm registry registry, all developer PR check workflows failed simultaneously because the runners couldn't download dependency trees, freezing all merges and deployments for the day.

**The Diagnostic**:

1. **Fresh Download Overhead**: Our YAML file did not use caching. Every job execution ran a clean virtual machine spin-up, downloading all `node_modules` folders from the public registry.
2. **Sequential Execution**: We ran compilation, linting, unit testing, and integration testing as sequential steps inside a single job on one runner, failing to leverage containerized parallelism.

**The Refactor**:
We re-architected our workflow pipeline:

1. **Setup Node Caching**: We enabled native npm caching within the `actions/setup-node` action, which automatically hashes our `package-lock.json` and manages directory caching.
2. **Parallelize Jobs**: We split our pipeline into parallel jobs (`lint`, `unit-test`, `build`), adding a dependency gate so the `deploy` job only runs if all parallel checks pass.

Here is our optimized, secure GitHub Actions workflow manifest:

```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x] # Concurrently test on multiple runtimes
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm' # Automatically caches npm directories based on package-lock.json hash

      - name: Install Dependencies
        run: npm ci

      - name: Run Linters & Formatters
        run: npm run lint

      - name: Run Unit Tests
        run: npm test

  deploy:
    name: Production Deployment
    needs: validate # Wait for validation matrix to pass successfully
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install Production Dependencies
        run: npm ci --only=production

      - name: Deploy to Production
        env:
          # Securely inject database credentials and tokens
          DB_CONNECTION_STRING: ${{ secrets.PROD_DB_CONNECTION }}
          DEPLOYMENT_API_KEY: ${{ secrets.PROD_DEPLOY_KEY }}
        run: |
          echo "Deploying application to host cluster..."
          # Execution script commands run here...
```

By introducing matrix configurations and caching our npm dependencies, we isolated test execution runs. The next run read the cache directly, bypassing network download phases and cutting total build pipeline times from 8.5 minutes to **54 seconds**. During registry outages, the runner successfully fetched the cached `node_modules` locally, maintaining full deployment reliability.

---

## Related Reading

- [CI/CD Basics](./basics.md)
- [Automated Testing in Pipelines](./automated-testing-in-pipelines.md)
- [secrets Management & Environment Hardening](../../security/infrastructure-security/secrets-management.md)

---

### 📖 Related Blog Posts

- [Ref: Hello World to GitHub Actions Your First Automated Workflow](../../../blogs/Hello_World_to_GitHub_Actions_Your_First_Automated_Workflow.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.ci-cd-pipelines.github-actions-workflows.md)
