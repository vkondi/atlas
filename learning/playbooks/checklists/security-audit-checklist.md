[⬅️ Back to Playbooks](../README.md)

# Security Audit Checklist

An operational checklist for conducting application and infrastructure security audits, verifying dependency vulnerability gates, enforcing secrets isolation, and validating HTTP security configurations.

---

## Why It Matters

Security vulnerabilities can compromise your applications and database systems if left unchecked. A single unpatched dependency, committed API token, or exposed database port can lead to data breaches and compliance failures.

Implementing a security audit checklist ensures that your systems are hardened against common exploit vectors. Enforcing automated dependency scans, secrets scanning, network isolation rules, and secure header configurations creates a multi-layered defense that protects sensitive data.

---

## Core Concepts

### 1. Supply Chain & Code Security

Third-party libraries represent a significant risk. Securing code requires:

- **Continuous Auditing**: Scanning all production dependencies for CVEs during the CI process, blocking builds if high-severity vulnerabilities exist.
- **Lockfile Enforcement**: Enforcing deterministic installations (e.g., using `npm ci`) to prevent unvetted package updates from entering production.

### 2. Secrets & Credential Hardening

Static secrets must never exist in plain text inside repositories:

1. **Pre-Commit Checks**: Configure tools like `gitleaks` to scan staged files locally, blocking commits containing API keys or private keys.
1. **IAM Authorization**: Connect to cloud resources (e.g., databases, S3 buckets) using IAM roles and OpenID Connect (OIDC) rather than static access keys.

### 3. API & Middleware Security

Hardening HTTP delivery pipelines requires:

- **HTTP Security Headers**: Use middleware (like `Helmet`) to configure headers: Content Security Policy (CSP), HTTP Strict Transport Security (HSTS), and X-Content-Type-Options.
- **Secure Cookie Flags**: Force all session cookies to use `HttpOnly`, `Secure`, and `SameSite=Lax` attributes.

---

## Real-World Production Learnings

We operated a cloud-native SaaS backend and conducted a comprehensive external penetration test.

**The Failure**:
The penetration test identified several high-severity vulnerabilities: session cookies were transmitted over unencrypted HTTP (missing `Secure` flags), a legacy AWS Access Key was committed in an old Git commit history, and our PostgreSQL port `5432` was accessible from the public internet.

**The Diagnostic**:

1. **Ad-Hoc Configuration**: Security configurations were left to developer preference, without a centralized rubric.
2. **Plaintext Leaks**: Bypassing secrets manager allowed access keys to reside in the Git history.
3. **Broken Network Isolation**: Databases were placed in public subnets, exposing them to port scans.

**The Refactor**:
We relocated the database to an isolated subnet, revoked all static keys, forced SSL/HTTPS, and implemented a mandatory Security Audit Checklist:

1. **VPC Relocation**: Moved the database to a private subnet, restricting security groups.
2. **Forced Cookie Security**: Updated cookie settings to enforce `Secure` and `HttpOnly` flags.
3. **Static Scans**: Integrated `gitleaks` checks into our GitHub Actions workflows.

Here is the operational checklist we implemented:

```markdown
# Security Audit Checklist

## 1. Dependency & Code Security

- [ ] Run `npm audit --audit-level=high` to confirm zero high-severity CVEs exist in production.
- [ ] Verify that the CI pipeline enforces lockfile compliance (e.g., `npm ci`).
- [ ] Run `gitleaks` locally and in CI to verify that no secrets are committed in the git history.

## 2. API & Middleware Hardening

- [ ] Confirm that `Helmet` is configured to set Content Security Policy (CSP) headers.
- [ ] Verify that all session cookies use the `HttpOnly`, `Secure`, and `SameSite=Lax` attributes.
- [ ] Confirm that all input payloads are validated against strict schemas (e.g., Zod).

## 3. Network & Infrastructure Isolation

- [ ] Verify that databases and caches are hosted in private subnets with no public IP routes.
- [ ] Confirm that security groups permit database ingress exclusively from application runner security groups.
- [ ] Verify that all application-to-database connections enforce SSL/TLS encryption.
```

By introducing this checklist:

- Leaked credential risks were mitigated by enforcing automated `gitleaks` checks.
- Database exposure was resolved by locking security group rules and routing databases through private subnets.
- The application achieved compliance standards, ensuring session cookies are protected from cross-site scripts.

---

## Related Reading

- [Checklist Basics](./basics.md)
- [Frontend Performance Checklist](./frontend-performance-checklist.md)
- [Production Release Checklist](./production-release-checklist.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.playbooks.checklists.security-audit-checklist.md)
