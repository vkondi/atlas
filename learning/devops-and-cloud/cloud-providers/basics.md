[⬅️ Back to DevOps & Cloud](../README.md)

# Cloud Computing Basics

An operational guide to cloud infrastructure paradigms, covering multi-region high-availability configurations, virtual private networking, the Shared Responsibility Security Model, and storage access boundary enforcement.

---

## Why It Matters

Migrating applications to the cloud offers near-infinite elastic scale and eliminates the need to manage physical server hardware. However, public cloud providers operate under a strict **Shared Responsibility Model**. If an engineer assumes the cloud provider automatically secures their database, configures subnets safely, or manages data access boundaries, they will expose the company to critical data breaches, orphaned ghost resources, and runaway cloud hosting bills. Designing secure, scalable cloud systems requires a deep understanding of network isolation and access controls.

---

## Core Concepts

### 1. High-Availability Cloud Topologies

To protect applications from hardware failure or natural disasters, cloud providers organize infrastructure into regions and zones:

- **Availability Zones (AZs)**: Distinct physical data centers within a single geographic region. Each AZ has isolated power, cooling, and network links. Applications achieve high availability by distributing compute instances across multiple AZs (Multi-AZ).
- **Multi-Region Strategy**: Deploying applications across separate geographic regions (e.g., US-East and EU-West).
  - **Active-Passive (Disaster Recovery)**: One region handles active traffic; database transactions are replicated asynchronously to the passive region. If the primary region goes offline, a failover mechanism promotes the passive region.
  - **Active-Active**: Both regions handle active traffic concurrently, reducing latency for global users but requiring complex distributed database conflict resolution.

### 2. Virtual Private Cloud (VPC) Isolation

A **VPC** is a private, logically isolated virtual network slice within the public cloud:

- **Subnets**: Subdivisions of a VPC's IP address range:
  - `Public Subnet`: Connected to an **Internet Gateway (IGW)**, allowing resources (like load balancers) to bind public IP addresses and communicate directly with the internet.
  - `Private Subnet`: Has no direct route to the internet. Resources (like database instances) bind private IPs, communicating with the outside world only through a **NAT Gateway** located in the public subnet.
- **Security Groups vs. NACLs**:
  - `Security Groups`: Stateful firewalls operating at the instance/resource level, governing inbound and outbound traffic.
  - `Network Access Control Lists (NACLs)`: Stateless firewalls operating at the subnet boundary level.

### 3. The Shared Responsibility Model

Security is co-managed between the cloud provider and the customer:

```
                  SHARED RESPONSIBILITY MODEL

   ┌────────────────────────────────────────────────────────┐
   │                    CUSTOMER RESPONSIBILITY             │
   │ - Customer Data Access Controls                        │
   │ - IAM Configuration & Password Policies                │
   │ - Application Code & Security Patches                  │
   │ - Data Encryption (At Rest & In Transit)               │
   │ - Operating System Configuration (inside VMs)          │
   ├────────────────────────────────────────────────────────┤
   │                    PROVIDER RESPONSIBILITY             │
   │ - Physical Security of Data Centers                    │
   │ - Hypervisor and Virtualization Layers                 │
   │ - Global Fiber Network Cabling                         │
   │ - Server Hardware & Database Engine Operations         │
   └────────────────────────────────────────────────────────┘
```

---

## Real-World Production Learnings

We operated a SaaS dashboard application storing user profile pictures and database transaction backups in AWS S3 storage buckets.

**The Failure**:
An external security researcher notified our security team that our company's transactional backups containing client transaction histories, database dumps, and sensitive financial logs were downloadable by anyone on the internet.

A configuration check showed that our S3 bucket policy had been modified to allow public, anonymous read access.

**The Diagnostic**:

1. **Lack of Resource Partitioning**: The development team had used a single, globally shared S3 bucket to store both public-facing images (avatars, icons) and private administrative assets (database backups).
2. **Access Control Overwrite**: To fix a broken image loading bug on our website, a developer updated the S3 bucket policy to allow public read access (`s3:GetObject` with Principal `*`), inadvertently exposing all private backup files stored in the same bucket.
3. **Violating Shared Responsibility**: We assumed AWS secured the data by default, but we had explicitly overridden the default private bucket configurations.

**The Refactor**:
We re-engineered our storage topology and enforced strict access boundaries:

1. **Isolate Storage Buckets**: We split our assets into two separate buckets:
   - `company-public-assets`: Reserved strictly for public assets. Access is enabled at the bucket policy level only for specific image directory paths.
   - `company-private-backups`: Locked down with AWS **Block Public Access** settings enabled, KMS encryption-at-rest configured, and IAM policies restricted to database backup roles.
2. **Configure S3 Block Public Access**: We enforced account-level policies that reject any attempts to configure public policies on the private bucket.

Here is the Terraform configuration we deployed to secure our private storage:

```hcl
# Secure AWS Private S3 Bucket Configuration
resource "aws_s3_bucket" "private_backups" {
  bucket = "company-secure-private-backups"

  lifecycle {
    prevent_destroy = true # Protect backup data from accidental destruction
  }
}

# 1. Enforce KMS Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "private_backups_encrypt" {
  bucket = aws_s3_bucket.private_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# 2. Block all public access configurations at the bucket level
resource "aws_s3_bucket_public_access_block" "private_backups_block_public" {
  bucket = aws_s3_bucket.private_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

By separating our public and private storage domains and enforcing AWS Public Access Blocks, we secured our customer data. The private bucket remains completely inaccessible to the WAN, while public avatars are served securely, meeting SOC2 compliance requirements.

---

## Related Reading

- [AWS Core Services](./aws-core-services.md)
- [Serverless Computing & Lambdas](./serverless-computing.md)
- [Secrets Management & CI Hardening](../../security/infrastructure-security/secrets-management.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.cloud-providers.basics.md)
