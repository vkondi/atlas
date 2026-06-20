[⬅️ Back to Security](../README.md)

# Infrastructure Hardening Foundations

An operational guide to securing cloud networks, configuring Virtual Private Clouds (VPC) with isolated subnets, implementing transit encryption (mTLS), and hardening server host environments.

---

## Why It Matters

A secure application running on unhardened infrastructure is highly vulnerable. If an attacker can access host operating systems, intercept unencrypted database traffic, or query backend servers directly via exposed internet ports, code-level access controls are rendered useless.

Infrastructure hardening creates a secure runtime boundary. By implementing strict network segmentation, encrypting internal communications, and disabling unused host ports, you contain potential compromises. Even if an attacker gains control of a single public-facing instance, network isolation rules prevent them from scanning internal subnets or accessing primary databases.

---

## Core Concepts

### 1. Cloud Network Segregation (VPC)

Hardening cloud topologies requires segregating infrastructure layers into distinct subnet boundaries:

```
                            INTERNET
                               |
                        [ 1. EDGE LAYER ]
                     Public Subnet (ALB / WAF)
                               |
                       [ 2. RUNTIME LAYER ]
                 Private Subnet (App Containers)
                               |
                      [ 3. DATABASE LAYER ]
                Isolated Subnet (RDS / Key Stores)
```

1. **Public Subnet**: Contains only public-facing load balancers, CDN distribution nodes, and Web Application Firewalls (WAF). No application or database runtimes should live here.
1. **Private Subnet**: Contains application servers. They communicate with the public load balancer but have no direct public IP addresses. Outbound internet connections (e.g., for downloading packages) go through NAT Gateways.
1. **Isolated Subnet**: Contains data stores (databases, caches). This subnet blocks all outbound internet routing, accepting ingress traffic exclusively from application servers inside the private subnet.

### 2. TLS Encryption and Traffic Security

Data must be encrypted both in transit and at rest:

- **Transit Encryption (TLS)**: Force HTTPS for all client connections. Disable deprecated encryption protocols (TLS 1.0 and 1.1) in favor of TLS 1.2 and TLS 1.3, specifying secure cipher suites that enforce Perfect Forward Secrecy (PFS).
- **Mutual TLS (mTLS)**: In microservice meshes, services must validate each other's certificates dynamically before exchanging data, preventing spoofing.
- **Database SSL Enforcement**: Force database connections to utilize SSL/TLS, rejecting raw, unencrypted TCP connections.

---

## Real-World Production Learnings

We operated a microservice backend on AWS, using an EC2 container runner connecting to a PostgreSQL RDS database instance.

**The Failure**:
During a routine security audit, we identified that our production database was targets of persistent connection scans from external IPs. A developer had provisioned the database in a public-facing subnet and opened ingress ports to `0.0.0.0/0` to query metrics from their local machine.

Furthermore, our application server connected to PostgreSQL without SSL verification, leaving data queries vulnerable to packet inspection within the cloud network.

**The Diagnostic**:

1. **Broken Network Isolation**: Placing databases in public subnets with zero ingress restrictions exposes database ports (e.g., `5432`) to brute-force scans.
2. **Permissive Firewalls**: Allowing connections from any IP instead of locking ingress down to the application's private security groups.
3. **Cleartext DB Communications**: Failing to force SSL encryption allowed database credentials and client records to traverse cloud subnets in cleartext.

**The Refactor**:
We restructured our AWS resources using Terraform to isolate database layers within private subnets, restricted security group ingress rules, and forced client-side SSL checks:

1. **VPC Restructuring**: Relocated the RDS database to an isolated database subnet with no internet gateways.
2. **Security Group Pinning**: Configured the database security group to accept traffic on port `5432` exclusively from the application runner security group ID.
3. **Forced SSL Database Connections**: Configured both PostgreSQL parameter groups and Node.js database adapters to reject non-SSL traffic.

Here is the Terraform configuration defining the secure network boundary:

```hcl
# main.tf - Hardened VPC and Security Group Topology
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
}

# 1. PRIVATE APPLICATION SUBNET
resource "aws_subnet" "app_private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

# 2. ISOLATED DATABASE SUBNET
resource "aws_subnet" "db_isolated" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"
}

# 3. APPLICATION SECURITY GROUP (Allows traffic from Load Balancer only)
resource "aws_security_group" "app_sg" {
  name        = "app-server-sg"
  description = "Allows ingress from ALB"
  vpc_id      = aws_vpc.main.id
}

# 4. DATABASE SECURITY GROUP (Permits ingress exclusively from App Security Group)
resource "aws_security_group" "db_sg" {
  name        = "db-server-sg"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Force ingress exclusively from App Server Security Group"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id] // Pin reference
  }

  egress {
    description = "Block all outbound requests from DB"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Here is the secure client connection configuration enforcing SSL:

```typescript
// src/database.ts
import { Pool } from 'pg';

export const dbPool = new Pool({
  host: process.env.DB_HOST, // Resolves to private VPC DNS (e.g., 10.0.2.x)
  port: 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Force SSL transmission and validate RDS certificate authority chain
  ssl: {
    rejectUnauthorized: true, // Rejects connection if certificate is self-signed/invalid
    ca: process.env.AWS_RDS_CA_CERT, // Inject Amazon RDS Root CA file
  },
});
```

By enforcing these boundaries:

- The database RDS instance is physically unreachable from the public internet, blocking scanning and brute-force attempts.
- Even if an attacker learns the database password, they cannot connect to port `5432` unless they have compromised a server inside the application security group.
- All application-to-database payloads are encrypted using verified TLS certificates, preventing data sniffing.

---

## Related Reading

- [Application Security Basics](../application-security/basics.md)
- [github-repo-hardening.md](./github-repo-hardening.md)
- [secrets-management.md](./secrets-management.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.infrastructure-security.basics.md)
