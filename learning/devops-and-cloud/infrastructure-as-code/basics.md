[⬅️ Back to DevOps & Cloud](../README.md)

# Infrastructure as Code Basics

An engineering guide to Infrastructure as Code (IaC) principles, comparing declarative vs. imperative models, state tracking lifecycle parameters, and mitigating manual infrastructure drift.

---

## Why It Matters

In modern cloud environments, infrastructure changes occur constantly. Manually configuring servers, load balancers, database instances, and network subnets through cloud web consoles is slow, error-prone, and leaves no auditable history. **Infrastructure as Code (IaC)** solves this by treating cloud resources as software source code. IaC files are version-controlled, code-reviewed, and deployed using automated pipelines. However, running IaC without establishing strict permission scopes or managing state files safely leads to race conditions, security credential leaks, and accidental destruction of active production databases.

---

## Core Concepts

### 1. Declarative vs. Imperative Models

Infrastructure is provisioned using two distinct logical models:

- **Declarative (Desired State)**: You define **what** the final infrastructure should look like (e.g., "I need a PostgreSQL RDS instance running version 15 with 100 GB storage"). The IaC engine (like Terraform or AWS CloudFormation) evaluates the active state, calculates the delta, and executes only the necessary API calls to match your declaration. This is the industry standard for cloud resource provisioning.
- **Imperative (Procedural steps)**: You define **how** to construct the infrastructure step-by-step using scripts or commands (e.g., "Run AWS EC2 create-instance, wait 30 seconds, run attach-volume, run format-disk"). If a step fails mid-run, recovery is complex because the script lacks built-in state memory. Commonly used for configuration management (like Ansible or bash scripting).

### 2. Core Principles of Production IaC

- **Idempotence**: A property where running the exact same configuration code multiple times against the cloud provider yields the identical end-state, without creating duplicate resources or triggering errors.
- **State Management**: The IaC engine maintains a **State File** mapping the logical names inside your code files to the actual unique resource IDs (ARN, IP addresses) in the physical cloud. The state file functions as a cache to speed up planning phases.
- **Drift Detection**: The process of comparing the declared state file configurations with the live state of physical cloud resources. **Drift** occurs when an administrator manually modifies a cloud setting (e.g., editing a firewall rule in the console) without updating the IaC source code.

```
                    DRIFT DETECTION PROCESS

   [ Code Manifest ]                   [ State File ]
   (Firewall Port 80) <─── Match ───>  (Firewall Port 80)
                                              │
                                           Compare
                                              │
                                              ▼
                                      (Query Cloud API)
                                              │
                                              ▼
                                    [ Live Infrastructure ]
                                    (Firewall Port 80 & 22) <- Manual edit!

                     Outcome: Drift Detected (Port 22 is out-of-band)
```

---

## Real-World Production Learnings

We managed our staging server pools using Terraform, deploying resources via an automated GitHub Actions CI pipeline.

**The Failure**:
During a performance crash in our staging environment, a system administrator logged into the AWS Web Console manually and upgraded our staging EC2 instances from `t3.medium` to `m5.large` instances to absorb the CPU spike.

Two days later, a developer pushed a minor firewall port update via git. The GitHub Actions pipeline triggered. Terraform ran, detected a resource mismatch, and immediately **downsized the active staging instances back to `t3.medium`**, killing active load tests and bringing down the staging service.

**The Diagnostic**:

1. **Console-IaC Divergence**: The administrator modified live infrastructure out-of-band without committing the changes to the version-controlled Terraform repository.
2. **Strict Desired State Enforcement**: Terraform is designed to enforce the declared state. It assumed the larger instance size was unauthorized drift and corrected it to match the code specification.

**The Refactor**:
We re-architected our cloud administration permissions and pipeline safety policies:

1. **Revoke Console Write Permissions**: We updated AWS IAM policies to restrict administrator roles to read-only access in the web console. All write actions (creation, deletion, modification) must be executed by the CI/CD deployment runner role.
2. **Automated Drift Detection**: We configured a nightly scheduled Cron workflow in GitHub Actions that runs `terraform plan -detailed-exitcode` to detect and alert us on Slack of any infrastructure drift before applying changes.

Here is our daily drift detection workflow configuration:

```yaml
# Nightly Drift Detection Workflow
name: Daily Infrastructure Drift Check

on:
  schedule:
    - cron: '0 5 * * *' # Run at 05:00 UTC daily
  workflow_dispatch: # Allow manual trigger

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Install Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Initialize Terraform Working Directory
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Check for Configuration Drift
        id: plan
        run: |
          # -detailed-exitcode returns:
          # 0: Succeeded, no changes
          # 1: Error
          # 2: Succeeded, drift/changes detected
          terraform plan -detailed-exitcode -no-color || exit_code=$?
          echo "exit_code=$exit_code" >> $GITHUB_OUTPUT
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Send Slack Alert if Drift is Found
        if: steps.plan.outputs.exit_code == '2'
        run: |
          curl -X POST -H 'Content-type: application/json' \
          --data '{"text":"⚠️ ALERT: Infrastructure drift detected in staging environment! Manual modifications may have occurred. Please review git commit changes."}' \
          ${{ secrets.SLACK_WEBHOOK_URL }}
```

By revoking console write permissions and enforcing drift checks, we aligned our operational procedures. Any infrastructure upgrades must pass through peer-reviewed git commits, ensuring our documentation is always accurate and preventing sudden downtime during routine deployments.

---

## Related Reading

- [Terraform Basics](./terraform-basics.md)
- [GitHub Actions Workflows](../ci-cd-pipelines/github-actions-workflows.md)
- [PostgreSQL Features & Scaling](../../databases/relational/postgresql-features.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.infrastructure-as-code.basics.md)
