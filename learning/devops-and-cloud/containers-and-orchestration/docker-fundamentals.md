[⬅️ Back to DevOps & Cloud](../README.md)

# Docker Fundamentals

An operational engineering guide to the Docker architecture, Union File Systems, cache-layer mechanics, networking modes, and storage volume configurations.

---

## Why It Matters

Docker is the industry standard tool for packaging applications. However, treating a Docker image as a standard virtual machine image leads to massive image sizes (often exceeding 2 GB), slow deployment times, and security vulnerabilities. Docker images are constructed using a read-only layered filesystem structure. An engineer who does not understand image layers, Copy-on-Write (CoW) behavior, or instruction cache caching logic will compile slow-building images, saturate container registries, and create bloated runtime environments.

---

## Core Concepts

### 1. Docker Engine Architecture

The Docker platform uses a client-server architecture:

- **Docker Client**: The CLI utility (`docker build`, `docker run`) that translates user commands into REST API payloads.
- **Docker Daemon (`dockerd`)**: A persistent background service listening on a Unix socket (`/var/run/docker.sock`) or TCP port. It processes API requests, manages containers, downloads images, and builds execution environments.
- **Docker Registry**: A centralized distribution store (e.g., Docker Hub, AWS ECR) where images are pushed, versioned, and pulled.

### 2. Image Layering & Union Filesystem (UnionFS)

Docker images are read-only templates composed of stacked filesystems:

- **Layering**: Every instruction in a `Dockerfile` (like `RUN`, `COPY`, or `ADD`) creates a new read-only layer. When a container runs, the engine mounts these layers sequentially and adds a thin, writeable **Container Layer** (Copy-on-Write) at the top of the stack.
- **Copy-on-Write (CoW)**: If a containerized process needs to modify a file stored in a lower read-only layer, the file is copied up to the top writable container layer before modification. The original file in the lower layer remains unmodified.
- **Layer Caching**: During a build, Docker checks if it has previously run the instruction on the exact same base layers. If a layer's dependencies haven't changed, Docker reuses the cached layer, bypassing execution steps.

### 3. Docker Storage Patterns

To persist data past a container's lifecycle, Docker provides three storage options:

```
                     DOCKER STORAGE TYPES

          [ Container Layer (Ephemeral / CoW) ]
                           │
      ┌────────────────────┼────────────────────┐
      ▼                    ▼                    ▼
  [ Volumes ]        [ Bind Mounts ]       [ Tmpfs Mounts ]
  - Managed by Docker- Maps host path      - Stored in host
  - In /var/lib/...  - Dependent on host     system memory
  - Safe for DBs     - Good for dev dev    - Secrets/Cache
```

- **Volumes**: Managed entirely by Docker and stored in `/var/lib/docker/volumes/` on the host. This is the recommended storage pattern for production databases, as it decouples data from the container lifecycle and does not depend on host directory paths.
- **Bind Mounts**: Maps a specific file or folder from the host machine directly into the container (e.g., mapping local source directories for active development).
- **Tmpfs Mounts**: Mounts a temporary storage volume directly in the host system's RAM. Useful for loading sensitive keys or credentials that should never be written to disk.

### 4. Docker Networking Drivers

- **Bridge (Default)**: Creates a private virtual network on the host. Containers connected to the default bridge can communicate via IP address. In user-defined bridges, containers gain built-in DNS lookup, resolving siblings by their container names.
- **Host**: Disables network isolation. The container shares the host's network namespace directly (e.g., a container running on port 80 maps directly to port 80 of the physical host).
- **None**: Disables all network access, isolating the process completely. Best for secure batch runs.
- **Overlay**: Connects multiple Docker daemons across separate physical hosts, enabling container-to-container communication in distributed swarm clusters.

---

## Real-World Production Learnings

We set up an automated CI/CD pipeline on GitHub Actions to build and push our core Node.js application image to AWS ECR on every pull request.

**The Failure**:
Our build pipeline took **over 11 minutes to complete** on every minor code change. A single-line modification to a Javascript helper file triggered a complete rebuild of the image, including downloading and compiling all 800+ npm dependencies from scratch.

This saturated our internet bandwidth, exhausted ECR storage quotas due to bloated image layers (1.8 GB per build), and blocked developer PR pipelines.

**The Diagnostic**:
We reviewed our legacy `Dockerfile`:

```dockerfile
# Bloated / Slow Caching Dockerfile
FROM node:18

WORKDIR /usr/src/app

# COPY ALL files first (Invalidates cache on any source edit)
COPY . .

# Run npm install (re-downloads everything on any change)
RUN npm ci --only=production

EXPOSE 3000
CMD ["node", "src/index.js"]
```

Because the `COPY . .` instruction was executed _before_ `RUN npm ci`, any minor change to a source file invalidated the cache for the copy layer. Consequently, Docker had to run a clean `npm ci` execution, rebuilding subsequent layers.

**The Refactor**:
We optimized the layering sequence to preserve the cached dependencies layer:

1. **Isolated Copy**: We copied only the dependency files (`package.json` and `package-lock.json`) first.
2. **Execute Install**: We ran `npm ci` on those isolated files. This layer is only rebuilt when packages change.
3. **Copy Code**: We copied the remaining source files afterward. Minor code changes now only invalidate the quick code-copy layer.

Here is the refactored, optimized `Dockerfile`:

```dockerfile
# Optimized / Cached Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# 1. Copy only dependency descriptors
COPY package*.json ./

# 2. Run clean install. Cache is preserved unless package.json is modified
RUN npm ci --only=production

# 3. Copy the rest of the application code
COPY . .

# Ensure non-root user execution for security
USER node

EXPOSE 3000
CMD ["node", "src/index.js"]
```

By reordering our Dockerfile instructions, we locked the dependency layer cache. Subsequent builds on minor file edits bypassed the `npm ci` download, dropping build times from 11 minutes to **4.5 seconds**. The use of the lightweight `alpine` base image also shranked our ECR footprint from 1.8 GB to **185 MB**, saving on registry costs and network transfer times.

---

## Related Reading

- [Containerization Basics](./basics.md)
- [Multi-Stage Build Optimizations](./multi-stage-builds.md)
- [Yarn and NPM Package Management](../../tooling-and-workflows/dependency-management/package-managers-yarn-pnpm.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.containers-and-orchestration.docker-fundamentals.md)
