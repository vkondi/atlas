[⬅️ Back to DevOps & Cloud](../README.md)

# Terraform Basics

An operational guide to HashiCorp Configuration Language (HCL), remote state backends, state locking using DynamoDB, and mitigating state file corruption in concurrent pipelines.

---

## Why It Matters

Terraform is the industry-standard tool for declarative cloud provisioning. However, treating Terraform as a simple scripting utility running on local workstations leads to catastrophic failures in team environments: concurrent executions can overwrite state changes, and credentials (like database passwords or API keys) can be committed in plain text inside local state files. To run Terraform in production, engineers must establish secure **Remote Backends**, enforce transaction **State Locking**, and restrict access to state data.

---

## Core Concepts

### 1. HashiCorp Configuration Language (HCL) Structure

Terraform uses HCL, a human-readable configuration language:

- **Providers**: Plugins that interface with external cloud APIs (e.g., AWS, Azure, GitHub, Cloudflare).
- **Resources**: Declared infrastructure elements to be created and managed (e.g., EC2 instances, S3 buckets).
- **Data Sources**: Queries to retrieve existing resource attributes from the live cloud (e.g., fetching a subnet ID created by another team).
- **Variables & Outputs**: Input variables parameterize configurations; output values display resource details (like public IP addresses) after execution.

```hcl
# Example AWS Provider & Resource Declaration
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "app_storage" {
  bucket = "company-production-app-assets"

  tags = {
    Environment = "production"
  }
}
```

### 2. The Execution Lifecycle

Working with Terraform follows a four-step lifecycle:

1. **`terraform init`**: Initializes the working directory, downloads the declared provider plugins, and configures the backend connection.
1. **`terraform plan`**: Analyzes the local configuration code, queries the active cloud environment, compares differences, and outputs a dry-run plan of changes (additions, modifications, destructions).
1. **`terraform apply`**: Executes the planned API calls to match the declared state, updates the state tracking file, and returns outputs.
1. **`terraform destroy`**: Aborts and deletes all resources defined in the configuration files.

### 3. Remote State & Locking Architecture

The **State File** (`terraform.tfstate`) is a JSON document containing the precise mapping of your code resources to live cloud IDs.

- **Local State**: By default, stored locally as a plaintext file. This is dangerous because it contains plain-text credentials and cannot support team collaboration.
- **Remote Backend**: Stores the state file in a secure, centralized bucket (e.g., AWS S3, HashiCorp Cloud).
- **State Locking**: A mechanism that locks the state file during execution. If Developer A runs `terraform apply`, the backend locks the file. If Developer B runs a concurrent execution, Terraform rejects it, preventing state corruption. On AWS, this is implemented using a **DynamoDB Table**.

---

## Real-World Production Learnings

We managed our core AWS infrastructure using Terraform, storing the state file in a shared AWS S3 bucket.

**The Failure**:
During a critical deployment, two developers concurrently executed `terraform apply` from their local workstations to adjust our ECS Task definition and database cluster parameters.

The executions conflicted. The S3 state file was overwritten mid-run, resulting in a **corrupted JSON state file**. Terraform lost track of our active ECS instances and database nodes.

During subsequent runs, it assumed these resources were missing, leading to orphaned cloud components that ran out-of-band, generating **$4,000 in ghost hosting costs** before being detected and terminated manually.

**The Diagnostic**:

1. **No Execution Lock**: While we stored the state in a shared S3 bucket, we had omitted configuring a state locking mechanism.
2. **Race Condition**: S3 does not have built-in file locking. Both workstations wrote updates to the same S3 object key concurrently, causing partial data overwrites and breaking JSON integrity.

**The Refactor**:
We re-engineered our backend architecture:

1. **Migrate to Secure Remote Backend**: We configured a central S3 bucket with versioning and KMS server-side encryption enabled to protect plaintext secrets inside the state files.
2. **Enforce DynamoDB State Locking**: We created a DynamoDB table with a primary key hash `LockID` and mapped it inside our backend configuration, preventing concurrent deployments.

Here is the secure, locked backend configuration block we deployed:

```hcl
# backend.tf - Centralized Remote Backend with DynamoDB State Locking
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "company-production-terraform-state"
    key            = "global/s3/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true # Enable Server-Side Encryption (SSE-S3/KMS)

    # Enable state locking and concurrency prevention via DynamoDB
    dynamodb_table = "terraform-state-lock-table"
  }
}
```

By introducing the DynamoDB state locking table, we secured our deployments. When a developer or CI pipeline triggers an execution, Terraform requests a lock. Any concurrent attempts are blocked with a `ResourceLocked` error, preserving state integrity and preventing resource duplication.

---

## Related Reading

- [Infrastructure as Code Basics](./basics.md)
- [AWS Core Services & Subnets](../cloud-providers/aws-core-services.md)
- [GitHub Actions Workflows](../ci-cd-pipelines/github-actions-workflows.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.infrastructure-as-code.terraform-basics.md)
