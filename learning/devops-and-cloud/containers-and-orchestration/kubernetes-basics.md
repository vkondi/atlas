[⬅️ Back to DevOps & Cloud](../README.md)

# Kubernetes Basics

An engineering blueprint of the Kubernetes architecture, control plane operations, service networking models, and database connection limits during autoscaling cycles.

---

## Why It Matters

Moving from running containers on a single host (via Docker Compose) to running container clusters across multiple servers requires a dedicated orchestrator. **Kubernetes (K8s)** coordinates container allocation, service discovery, load balancing, and self-healing. However, treating Kubernetes as a simple hosting environment without understanding cluster resource scheduling, service routing types, or autoscaling limits will trigger cascading database connection outages, CPU throttling, and cluster resource exhaustion.

---

## Core Concepts

### 1. Control Plane vs. Worker Nodes

A Kubernetes cluster is divided into two primary logical areas:

- **Control Plane (The Brain)**: Manages cluster-wide scheduling, health checking, and API state:
  - `kube-apiserver`: The central hub that exposes the Kubernetes API. All command inputs (`kubectl`) and node requests communicate through the API server.
  - `etcd`: A highly available, distributed key-value store that functions as the cluster's single source of truth, storing all configuration and state records.
  - `kube-scheduler`: Analyzes resource requests (CPU, RAM) of unassigned pods and schedules them to the most optimal worker nodes.
  - `kube-controller-manager`: Runs background controller loops (e.g., checking if the active Pod count matches the declared target replica count).
- **Worker Nodes (The Muscle)**: Physical or virtual machines configured to execute containerized workloads:
  - `kubelet`: An agent running on each worker node that communicates with the control plane and interacts with the container runtime (e.g., containerd) to ensure Pod containers are healthy and running.
  - `kube-proxy`: A network proxy that maintains network rules on host nodes, enabling Pod network communications across the cluster.

```
                      KUBERNETES CLUSTER LAYOUT

                     ┌──────────────────────────┐
                     │      CONTROL PLANE       │
                     │  [API Server] <=> [etcd] │
                     │  [Scheduler]   [Manager] │
                     └────────────┬─────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌──────────────────┐                              ┌──────────────────┐
│   WORKER NODE    │                              │   WORKER NODE    │
│  [kubelet]       │                              │  [kubelet]       │
│  [kube-proxy]    │                              │  [kube-proxy]    │
│  [Pod] [Pod]     │                              │  [Pod] [Pod]     │
└──────────────────┘                              └──────────────────┘
```

### 2. Core Declarative Abstractions

Kubernetes operates on a declarative configuration model (defined in YAML files):

- **Pods**: The smallest deployable unit. A Pod wraps one or more tightly coupled containers that share the same network namespace (loopback address), IPC resources, and storage volumes.
- **Deployments**: Manages a **ReplicaSet** (declaring the target count of identical Pods). It automates rolling updates, rollbacks, and pod recreation if a node fails.
- **Services**: Exposes Pods as a network resource:
  - `ClusterIP`: Exposes the service on a cluster-internal IP. Accessible only within the cluster.
  - `NodePort`: Exposes the service on each Node's IP at a static port (typically 30000–32767).
  - `LoadBalancer`: Provisions a physical load balancer at the cloud provider level, routing external traffic directly to NodePort/ClusterIP targets.

### 3. Horizontal Pod Autoscaling (HPA)

The HPA automatically adjusts the number of Pods in a Deployment based on observed resource utilization (e.g., CPU, memory) or custom Prometheus metrics, scaling Pod counts up during traffic spikes and scaling them down during idle periods.

---

## Real-World Production Learnings

We deployed a Node.js REST API microservice on an AWS EKS (Elastic Kubernetes Service) cluster, configuring a Horizontal Pod Autoscaler (HPA) to scale our replicas between 3 and 30 Pods based on target CPU utilization exceeding 70%.

**The Failure**:
During a morning traffic surge, the HPA triggered, scaling our Pod count from 3 to 28 Pods to handle the request volume.

Within 30 seconds of scaling, our entire application fell offline. The API returned HTTP 500 errors to all users, and database logs showed that our PostgreSQL database was saturated with connection limits errors (`FATAL: remaining connection slots are reserved for non-replication superuser connections`), bringing down the checkout checkout funnel.

**The Diagnostic**:

1. **Unbounded Connection Scaling**: Each Node.js Pod was configured with an internal database connection pool limit (`DB_POOL_MAX=25`).
2. **Database Limit Breach**: When Kubernetes ran 3 Pods, total database connections peaked at $3 \times 25 = 75$ connections. However, when the cluster autoscaled to 28 Pods, the connection pool attempted to open $28 \times 25 = 700$ concurrent connections. This immediately breached our PostgreSQL maximum connection ceiling (`max_connections = 500`), locking the database.

**The Refactor**:
We re-architected our K8s-to-database connection topology:

1. **Reduce Pod Pool Size**: We downsized the local pool size in our container environment configs to `DB_POOL_MAX=10`.
2. **Deploy PgBouncer Proxy**: We deployed a PgBouncer connection pool proxy between our Kubernetes cluster and the database, configuring it to run in **Transaction Pooling Mode**. This allows hundreds of stateless application Pods to share a small, pre-established pool of 50 physical connections to the PostgreSQL instance.

Here is the environment and resources configuration block we deployed to our K8s Deployment file:

```yaml
# Environment Configs for Aggregator Deployment
# Targets: Connection Pooling and strict resource requests

spec:
  containers:
    - name: api-container
      image: company/api-service:v2.1.0
      env:
        - name: DB_HOST
          value: 'pgbouncer.database.svc.cluster.local' # Route through PgBouncer Service
        - name: DB_PORT
          value: '6432' # PgBouncer port
        - name: DB_POOL_MAX
          value: '10' # Safe downsized limit per pod container
      resources:
        requests:
          memory: '256Mi'
          cpu: '200m'
        limits:
          memory: '512Mi'
          cpu: '500m'
```

By routing K8s API traffic through PgBouncer and reducing local container database pool configurations, the autoscaling engine worked smoothly. When the HPA scaled the API deployment to 30 Pods, the actual PostgreSQL connection count remained constant at less than 50 connections, protecting database stability while maintaining low latency response rates.

---

## Related Reading

- [Containerization Basics](./basics.md)
- [Docker Fundamentals](./docker-fundamentals.md)
- [PostgreSQL Connection Pools](../../databases/relational/postgresql-features.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.devops-and-cloud.containers-and-orchestration.kubernetes-basics.md)
