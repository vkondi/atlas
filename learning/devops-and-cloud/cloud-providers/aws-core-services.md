[⬅️ Back to DevOps & Cloud](../README.md)

# AWS Core Services

An operational guide to AWS infrastructure networking, compute scaling, database subnet layouts, Application Load Balancers, IAM security policies, and secure VPC routing topologies.

---

## Why It Matters

Amazon Web Services (AWS) provides the building blocks for modern cloud architectures. However, misconfiguring these core services leads to critical security vulnerabilities and system downtime. Placing databases in public subnets, using wildcards in IAM policies, or leaving security group ports open to the entire internet (`0.0.0.0/0`) invites immediate hacking attempts. Building a secure, enterprise-grade cloud environment requires isolating network paths, enforcing the Principle of Least Privilege in IAM, and implementing secure multi-tier subnets.

---

## Core Concepts

### 1. VPC Networking & Subnet Architecture

A secure AWS environment segregates resources into isolated network layers:

- **Internet Gateway (IGW)**: Enables resources inside public subnets to bind public IP addresses and communicate directly with the internet.
- **NAT Gateway (Network Address Translation)**: Provisioned inside a public subnet. Allows private subnet instances (like application servers) to connect outbound to the internet (e.g., to download package updates) while blocking any inbound connections from the internet.
- **Security Groups (Stateful)**: Act as firewalls at the instance level. If an inbound request is permitted (e.g., port 443), the return outbound traffic is automatically allowed, regardless of outbound rules.
- **Network ACLs (Stateless)**: Act as firewalls at the subnet boundary. Outbound return traffic must be explicitly allowed.

```
                    AWS SECURE MULTI-TIER VPC

                              [ Internet ]
                                   │
                                   ▼
                        [ Internet Gateway (IGW) ]
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
               ┌─────────────────┐   ┌─────────────────┐
               │  PUBLIC SUBNET  │   │  PUBLIC SUBNET  │ (AZ-1 & AZ-2)
               │  - Load Balancer│   │  - NAT Gateway  │
               └────────┬────────┘   └────────┬────────┘
                        │                     │
                        ▼                     ▼
               ┌─────────────────┐   ┌─────────────────┐
               │ PRIVATE SUBNET  │   │ PRIVATE SUBNET  │ (AZ-1 & AZ-2)
               │  - App Servers  │   │  - Databases    │
               └─────────────────┘   └─────────────────┘
```

### 2. Elastic Compute & Load Balancing

- **EC2 (Elastic Compute Cloud)**: Virtual machine instances. Managed via **Auto Scaling Groups (ASGs)** that scale instance counts dynamically based on CPU/memory limits or target tracking metrics.
- **Application Load Balancer (ALB)**: Operates at Layer 7 (Application). Resolves HTTP/HTTPS routing, terminates SSL certificates, inspects headers, and routes traffic dynamically to target groups (EC2, ECS, Lambda) based on path variables.
- **Network Load Balancer (NLB)**: Operates at Layer 4 (Transport). Routes raw TCP/UDP packets. Optimized for ultra-high throughput and microsecond latencies, returning static elastic IP addresses.

### 3. Database Subnet Layouts (RDS)

- **Multi-AZ Deployment**: RDS automatically provisions and maintains a synchronous standby replica in a different Availability Zone. Writes are mirrored synchronously. If the primary zone fails, AWS automatically flips the DNS record to the standby replica, achieving zero-downtime failover.
- **Read Replicas**: Asynchronously mirrors writes to separate instances. Used to offload heavy read traffic from the primary database, optimizing dashboard queries.

### 4. IAM & Least Privilege

- **IAM Policies**: JSON documents declaring allowed actions, resources, and conditions.
- **IAM Roles**: Identities that can be assumed by users, applications, or AWS services (e.g., an EC2 instance assuming an IAM role to read files from an S3 bucket without hardcoding AWS access keys on disk).
- **Least Privilege**: Granting only the minimum permissions necessary to execute a task (e.g., restricting an S3 policy to `s3:GetObject` on a single folder, instead of `s3:*` globally).

---

## Real-World Production Learnings

We hosted our production web application and PostgreSQL database inside AWS, utilizing a custom VPC layout.

**The Failure**:
During a security audit, we detected unauthorized connection attempts on port 5432 of our PostgreSQL database instance.

An inspection showed that our database staging database was exposed to the public internet. Brute-force credential stuffing bots had discovered the endpoint, eventually succeeding in gaining access and compromising staging customer records.

**The Diagnostic**:

1. **Public Subnet Allocation**: The database was deployed inside a public subnet (connected to the Internet Gateway) and assigned a public IP address.
2. **Open Security Group CIDR**: To allow developers to run diagnostics from their home offices, the database's Security Group had an inbound rule configured to allow port 5432 from `0.0.0.0/0` (any IP).

**The Refactor**:
We re-architected our network boundaries:

1. **Private Subnet Migration**: We migrated all RDS database instances to a dedicated Private Subnet Group (no internet gateway routing).
2. **Dynamic Security Group Referencing**: We revoked the open `0.0.0.0/0` CIDR rule. We configured the database Security Group to accept traffic on port 5432 _strictly_ from the Security Group ID of our application ECS servers, preventing out-of-band network access.

Here is the Terraform configuration we deployed to enforce this isolation:

```hcl
# Secure AWS RDS and Security Group Isolation
resource "aws_security_group" "db_sg" {
  name        = "production-database-security-group"
  description = "Restrict database access to ECS application servers only"
  vpc_id      = var.vpc_id

  # 1. Allow port 5432 STRICTLY from the application security group
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_ecs_security_group_id] # Dynamic reference
  }

  # 2. Block all outbound traffic from the database (database needs no external outbound access)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"] # Restrict to internal VPC IP CIDR only
  }
}

resource "aws_db_instance" "production_db" {
  identifier             = "production-postgresql-db"
  allocated_storage      = 100
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.medium"
  db_subnet_group_name   = var.private_subnet_group_name # Pinned to private subnet group
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  publicly_accessible    = false # Explicitly disable public IP allocation
  multi_az               = true  # Synchronous replica replication for high availability
  skip_final_snapshot    = false
}
```

By deploying the RDS instance inside a private subnet and configuring security groups using dynamic references rather than static IP CIDRs, we blocked external network traffic. The database port is completely invisible to WAN scanners, while our application containers query the database with sub-millisecond local latency inside the private network boundary.

---

## Related Reading

- [Cloud Computing Basics](./basics.md)
- [Serverless Computing & Lambdas](./serverless-computing.md)
- [Terraform Infrastructure Provisioning](../infrastructure-as-code/terraform-basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.cloud-providers.aws-core-services.md)
