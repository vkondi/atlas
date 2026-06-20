[⬅️ Back to Software Architecture](../README.md)

# Load Balancing

A technical analysis of Layer 4 vs. Layer 7 load balancing, traffic distribution algorithms, active health check configurations, and geographic DNS-level routing.

---

## Why It Matters

Horizontal scaling requires an ingress traffic distributor. A load balancer acts as a central coordinator, distributing client requests across a pool of backend servers. This prevents single-server congestion, isolates node failures, and ensures high system availability. However, choosing the wrong OSI routing layer or balancing algorithm causes severe traffic imbalances (server hotspotting), socket starvation, and cascading outages during traffic spikes.

---

## Core Concepts

### 1. Layer 4 vs. Layer 7 Load Balancing

Load balancers operate at different layers of the Open Systems Interconnection (OSI) network model:

```
        LAYER 4 LOAD BALANCING (Transport)

        Client IP:Port ===> [ L4 Balancer ] ===> Server Pool IP:Port
        - Fast routing (TCP/UDP packet level)
        - Does not inspect or decrypt HTTP payload

        LAYER 7 LOAD BALANCING (Application)

        Client Request ===> [ L7 Balancer ] ===> /api/v1  => Billing Pool
                            (Decrypts TLS)  ===> /static  => CDN/S3
        - Smart routing (Inspects Headers, Cookies, URI paths)
        - Higher CPU overhead (TLS termination)
```

#### Layer 4 (Transport Layer - TCP/UDP)

- **Mechanism**: Routes packets based on IP addresses and port numbers. It does not inspect the contents of the TCP/UDP payload.
- **Pros**: Extremely fast. Low CPU overhead. Secure: it does not need to decrypt SSL/TLS certificates.
- **Cons**: Cannot perform content-based routing (e.g., routing based on URL path or headers). Cannot cache content or handle cookies.

#### Layer 7 (Application Layer - HTTP/HTTPS)

- **Mechanism**: Terminates the client's SSL/TLS connection, decrypts the request, and inspects the HTTP headers, cookies, URL path, and query parameters.
- **Pros**: Enables smart routing (e.g., routing `/api/v1/checkout` to checkout servers, and `/static/*` to object storage). Supports cookie-based **Sticky Sessions** (session affinity) and compression.
- **Cons**: High CPU overhead due to crypto decryption and packet parsing. Requires security certificate management on the load balancer.

### 2. Traffic Distribution Algorithms

The choice of algorithm dictates how incoming requests are allocated:

- **Round Robin**: Distributes requests sequentially down the list of servers. Best when backend nodes have identical hardware capacities and requests require uniform processing times.
- **Least Connections**: Directs new requests to the server with the lowest number of active client connections. Best for SQL database pools or services handling tasks with highly variable execution times.
- **IP Hash**: Hashes the client's IP address to map them consistently to the same backend node. Essential for stateful applications requiring local caching or session persistence.

### 3. Health Checks & Failover

To isolate crashed nodes, load balancers run periodic **Health Checks**:

- **Active Checks**: The load balancer sends a request to a `/health` endpoint every $X$ seconds. If the node fails to return a `200 OK` within a timeout window for $Y$ consecutive attempts, the balancer flags it as unhealthy and stops routing traffic to it.
- **Passive Checks**: The balancer monitors real-time connection failures. If a node rejects connection requests, it is dynamically quarantined.

### 4. DNS-Level Balancing (GeoDNS)

Before traffic hits a physical load balancer, **DNS-Level Balancing** distributes traffic globally. When a client requests a domain IP, the GeoDNS provider (e.g., AWS Route 53) returns the IP of the closest physical load balancer based on the client's geographic location, reducing global round-trip latency.

---

## Real-World Production Learnings

In our real-time messaging application, we handled both short-lived HTTP REST requests (user profiles) and long-lived, persistent **WebSocket connections** (chat streams) on a shared server pool behind an Nginx load balancer configured with standard **Round Robin** routing.

Under peak usage, our monitoring showed:

1. Some backend instances were pinned at 99% CPU and dropped connections.
2. Sibling instances in the same pool remained idle at 12% CPU.
3. Users experienced disconnected chat loops and slow page loads.

**The Diagnostic**:

- WebSocket connections are long-lived TCP sockets that remain open for hours. REST API calls are short-lived transactions resolving in 20ms.
- Round Robin distributed connections equally (e.g., 100 requests to Server A and 100 to Server B). However, Server A received 100 persistent WebSockets (consuming RAM and CPU), while Server B received 100 REST calls that finished immediately. This created a severe load imbalance.

**The Refactor**:
We partitioned our load-balancing topology:

1. We migrated our Nginx routing algorithm to **Least Connections (`least_conn`)**, ensuring new WebSocket connections were routed to nodes with the lowest connection count.
2. We configured a Layer 7 path-based routing rule, splitting REST and WebSocket traffic into separate backend pools:

```nginx
# nginx.conf Layer 7 Routing
upstream rest_backend {
    least_conn; # Route based on lowest active connections
    server rest-srv-1.internal:8080;
    server rest-srv-2.internal:8080;
}

upstream ws_backend {
    ip_hash; # Ensure user sticks to same websocket node
    server ws-srv-1.internal:8090;
    server ws-srv-2.internal:8090;
}

server {
    listen 443 ssl;

    # WebSocket endpoint routing
    location /socket.io/ {
        proxy_pass http://ws_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }

    # REST endpoint routing
    location /api/ {
        proxy_pass http://rest_backend;
    }
}
```

This routing split fully resolved the load imbalances. WebSocket connections were balanced smoothly across the dedicated socket pool, and our REST endpoints remained highly responsive at less than 15ms p99 latency.

---

## Related Reading

- [System Design Basics](./basics.md)
- [Caching Strategies](./caching-strategies.md)
- [Rate Limiting](./rate-limiting.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.system-design.load-balancing.md)
