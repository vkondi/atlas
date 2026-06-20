[⬅️ Back to Tooling & Workflows](../README.md)

# Local Development Foundations

An operational guide to local development environments, orchestrating services with Docker Compose, securing localhost with mkcert TLS, and configuring reverse proxies.

---

## Why It Matters

A developer's velocity is directly constrained by the speed and reliability of their local development loop. A fragile setup—where engineers must manually clone, install, and start multiple repositories on their host machine—wastes hours of engineering time. Furthermore, if the local environment does not match production security policies (e.g., running HTTP locally while production forces HTTPS), developers will miss bugs like blocked cookies or mixed-content exceptions.

Establishing a containerized, HTTPS-enabled local environment ensures consistency. Declarative service orchestration and local SSL certificates help developers build, test, and debug features under production-like conditions.

---

## Core Concepts

### 1. Local Service Orchestration (Docker Compose)

Do not install databases, caches, or message brokers directly on your host operating system. This leads to version conflicts and is difficult to share with team members. Instead, use a declarative configuration file (`docker-compose.yml`) to manage services inside isolated container subnets:

```
                          DEVELOPER MACHINE (Host)
                                     |
                       +-----------------------------+
                       |    DOCKER COMPOSE NETWORK   |
                       +-----------------------------+
                        /            |              \
           +-----------------+  +-----------------+  +-----------------+
           |  APP CONTAINER  |  | POSTGRES CONTAINER| | REDIS CONTAINER |
           | (Node.js App)   |  |   (Port 5432)   |  |   (Port 6379)   |
           +-----------------+  +-----------------+  +-----------------+
```

### 2. Local SSL / TLS Hardening (`mkcert`)

If your production site uses HTTPS, your local environment should too. Modern browsers restrict cookies containing security flags (like `Secure` or `SameSite=None`) when transmitted over unencrypted HTTP.

Use **`mkcert`** to install a local Certificate Authority (CA) in your system trust store, allowing you to generate valid, locally-trusted SSL certificates for `localhost` without certificate warnings:

```bash
# Setup local Certificate Authority
mkcert -install

# Generate certificates for localhost
mkcert localhost 127.0.0.1 ::1
```

---

## Real-World Production Learnings

We operated a microservice-based checkout portal where developers struggled to reproduce issues locally.

**The Failure**:
Developers spent their first week manually installing PostgreSQL, Redis, and various backend services on their host machines. Minor differences in local database versions led to frequent "works on my machine" bugs.

Additionally, because we developed locally over unencrypted HTTP, we missed a critical bug: our checkout authentication cookie (marked `Secure`) was silently blocked by browsers during local runs. When deployed to production HTTPS, the cookie was transmitted, but client CORS rules blocked it, crashing checkout.

**The Diagnostic**:

1. **Manual Host Installations**: Bypassing container boundaries created environmental drift between developer setups.
2. **HTTP vs. HTTPS Mismatch**: Developing over HTTP hid security-flag browser policies.
3. **No Centralized Routing**: Bypassed proxy routing led to hardcoded port numbers (e.g., `:3000`, `:5432`) in application code.

**The Refactor**:
We moved all local dependencies to Docker Compose, configured local SSL using `mkcert`, and setup Nginx as a local reverse proxy to route traffic:

1. **Declarative Service Launch**: Created a single `docker-compose.yml` to spin up dependencies.
2. **Forced Local HTTPS**: Configured Nginx to accept SSL connections using `mkcert` certificates.
3. **Unified Local API Mappings**: Routed all API requests through port `:443` dynamically.

Here is the declarative `docker-compose.yml` configuration:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Primary Database Store
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app_development
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Session Cache Store
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

Here is the secure local Node.js server setup loading HTTPS credentials:

```typescript
// src/server.ts
import https from 'https';
import fs from 'fs';
import path from 'path';
import express from 'express';

const app = express();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', secure: req.secure });
});

// Load mkcert certificates from local keys folder
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certs/localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../certs/localhost.pem')),
};

// Start server on HTTPS
https.createServer(sslOptions, app).listen(3000, () => {
  console.log('Secure local server running on https://localhost:3000');
});
```

By containerizing our local dependencies and forcing SSL:

- Onboarding time fell from **3 days** to **10 minutes**; new hires run `docker-compose up` to start all dependencies.
- Cookie and security header bugs are caught locally because development matches production HTTPS constraints.
- Hardcoded ports were eliminated by routing all local services through a reverse proxy.

---

## Related Reading

- [Git Advanced Workflows](./git-advanced-workflows.md)
- [Terminal Productivity with Zsh](./terminal-productivity-zsh.md)
- [dependency-management/basics.md](../dependency-management/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.tooling-and-workflows.local-development.basics.md)
