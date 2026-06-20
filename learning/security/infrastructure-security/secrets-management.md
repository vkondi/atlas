[⬅️ Back to Security](../README.md)

# Secrets Management

An operational guide to securely storing, injecting, and rotating system credentials, preventing repository credential leaks, and integrating cloud secret vaults with runtime environments.

---

## Why It Matters

Secrets—such as database passwords, API tokens, encryption keys, and SSL certificates—are highly targeted assets. Committing static credentials directly to source code repositories is one of the most common causes of data breaches. Once committed, credentials remain in the git history indefinitely, accessible to anyone with repository access.

Securing credentials requires decoupling application configurations from private access keys. Modern architectures manage secrets by using cloud-based secret vaults, injecting values dynamically at runtime, and automating rotations. This ensures that even if code repositories or host servers are compromised, the damage is minimized because keys are tightly scoped, short-lived, and easily rotated.

---

## Core Concepts

### 1. The Git Leak Hazard

Committing secret files (e.g., `.env` or `credentials.json`) is a critical vulnerability. Even if a subsequent commit deletes the file, the secret remains visible in the repository's git commit history. Recovering from a git leak requires:

1. **Immediate Revocation**: Revoking and rotating the leaked credential immediately.
1. **History Purging**: Using tools like `git-filter-repo` or BFG Repo-Cleaner to rewrite history, purging the file from all commits, branches, and tags.

### 2. Secret Injection Architectures

Applications can receive secrets in two primary ways:

```
+-------------------------------------------------------------------+
| 1. ENVIRONMENT INJECTION                                          |
| OS Environment variables (e.g. process.env) loaded by container   |
+-------------------------------------------------------------------+
                                 OR
+-------------------------------------------------------------------+
| 2. RUNTIME VAULT INJECTION                                        |
| App queries AWS Secrets Manager / Vault at startup via SDK        |
+-------------------------------------------------------------------+
```

- **Environment Injection**: Secrets are injected as environment variables (e.g., `process.env.DB_PASSWORD`) by container orchestrators (such as Kubernetes Secrets or ECS Task Definitions) at container startup.
- **Runtime Vault Injection**: The application queries a vault API directly using SDKs (such as HashiCorp Vault or AWS Secrets Manager). The credentials exist only in volatile server memory, reducing disk visibility.

### 3. Dynamic Secret Rotation

Static secrets that remain unchanged for years increase exploit vulnerability. Dynamic secret rotation automatically updates credentials (e.g., database passwords) at set intervals. The database engine and the vault sync the update, and the application fetches the fresh secret from the vault dynamically without requiring a server reboot.

---

## Real-World Production Learnings

We operated a core checkout backend that connected to PostgreSQL and processed payments via Stripe.

**The Failure**:
A developer accidentally committed a local `.env` file containing production Stripe API keys and database passwords to our GitHub repository. Within 180 seconds, automated crawler bots scraped the credentials, accessed our database server, and initiated fraudulent refund requests in Stripe, stealing over $40,000 before the key was revoked.

**The Diagnostic**:

1. **Committed Secrets**: The local configuration template `.env` was not excluded by git rules, allowing developers to commit private files.
2. **Static Credentials**: Stripe keys had infinite lifetimes, allowing immediate access without verification.
3. **No Commit Guardrails**: The developer pushed code without automated scanning checks to block keys.

**The Refactor**:
We revoked all leaked credentials, rewrote our repository history, and implemented a vault-centric architecture:

1. **Purged Git History**: Used `git-filter-repo` to delete the `.env` file from our historical trees.
2. **Added Gitignore Rules**: Locked `.gitignore` to block `.env` files.
3. **Implemented AWS Secrets Manager**: Refactored the backend to query database credentials dynamically from AWS Secrets Manager using IAM Role authentication.
4. **Configured Pre-Commit Scanning**: Added `gitleaks` checks to local Git hooks and CI pipelines.

Here is the secure Node.js secrets initialization module utilizing the AWS SDK to fetch credentials dynamically with local caching:

```typescript
// src/config/secrets-loader.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secretName = 'production/checkout-service/credentials';
const region = 'us-east-1';

// 1. Initialize the Secrets Manager Client
// Authentication is handled via IAM roles; no static access keys are needed.
const client = new SecretsManagerClient({ region });

interface Credentials {
  DB_PASS: string;
  STRIPE_API_KEY: string;
}

let cachedSecrets: Credentials | null = null;
let lastFetchedTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

export async function getCredentials(): Promise<Credentials> {
  const now = Date.now();

  // 2. Return cached secrets if within TTL to prevent API rate limits
  if (cachedSecrets && now - lastFetchedTime < CACHE_TTL_MS) {
    return cachedSecrets;
  }

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: 'AWSCURRENT', // Always fetch the active, rotated version
      }),
    );

    if (!response.SecretString) {
      throw new Error('SecretString is empty.');
    }

    // Parse and cache the credentials
    cachedSecrets = JSON.parse(response.SecretString) as Credentials;
    lastFetchedTime = now;

    return cachedSecrets;
  } catch (error) {
    console.error(
      'Failed to retrieve secrets from AWS Secrets Manager:',
      error,
    );

    // Fallback to cache during outage, or fail-safe if cache is empty
    if (cachedSecrets) {
      return cachedSecrets;
    }
    throw new Error(
      'Critical configuration failure: unable to retrieve system secrets.',
    );
  }
}
```

By switching to this configuration:

- No database passwords or Stripe keys are committed to Git, preventing leaks.
- Storing credentials in AWS Secrets Manager allows automatic weekly password rotations without requiring server redeployments or container restarts.
- The application requests secrets using IAM Instance Profiles, eliminating the need to manage static AWS Access Keys.

---

## Related Reading

- [Application Security Basics](../application-security/basics.md)
- [Infrastructure Hardening Foundations](./basics.md)
- [github-repo-hardening.md](./github-repo-hardening.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.infrastructure-security.secrets-management.md)
