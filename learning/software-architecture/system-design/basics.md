[⬅️ Back to Software Architecture](../README.md)

# System Design Foundations

An introduction to system design primitives, comparing horizontal vs. vertical scaling, defining latency percentiles and throughput metrics, and aligning SLA/SLO/SLI bounds.

---

## Why It Matters

System design is the practice of organizing system infrastructure and software components to satisfy scalability, reliability, and cost requirements. As platforms grow from a few users to millions, naive setups fail. Understanding the trade-offs of vertical vs. horizontal scaling, monitoring outlier performance metrics (percentiles), and structuring systems to satisfy Site Reliability Engineering (SRE) objectives are mandatory to prevent service degradation and manage infrastructure budgets.

---

## Core Concepts

### 1. Horizontal vs. Vertical Scaling

When resource demands increase, architectures scale using one of two primary pathways:

- **Vertical Scaling (Scale Up)**: Adding more power (CPU, RAM, SSD) to a single database or application server.
  - _Pros_: Simple. No changes to code structure or transaction models. No network latency overhead.
  - _Cons_: Hard physical limit (hardware ceilings). Expensive at high levels. Creates a Single Point of Failure (SPOF).
- **Horizontal Scaling (Scale Out)**: Adding more machine nodes to a cluster, distributing traffic across them.
  - _Pros_: Theoretically infinite scalability. High resilience (redundant nodes prevent SPOF).
  - _Cons_: Requires stateless application design, complex network routing (Load Balancers), and distributed consistency management.

### 2. Latency vs. Throughput

- **Throughput**: The volume of operations a system handles per second (e.g., Requests Per Second - RPS, Transactions Per Second - TPS).
- **Latency**: The time taken to complete a single transaction (typically measured in milliseconds).
  - _Averages are Misleading_: Averages hide outlier performance issues. If 99 requests take 10ms, but 1 request takes 5000ms, the average is 59ms, masking the timeout bug.
  - _Percentiles (p50, p90, p99)_: System design measures percentiles. **p99 = 200ms** means 99% of requests resolve within 200ms, and only 1% take longer. Optimization targets p99/p99.9 metrics.

### 3. Reliability Metrics: SLA, SLO, and SLI

System reliability is governed by SRE metrics:

```
                  SRE METRIC CARDINALITY

      [ SLA (Service Level Agreement) ]  <=== Business Commitment
                     || (Aggregates)          (e.g., "99.9% Uptime or Refund")
                     v
      [ SLO (Service Level Objective) ]  <=== Team Target
                     || (Compares to)         (e.g., "p99 Latency < 200ms")
                     v
      [ SLI (Service Level Indicator) ]  <=== Real-time Measurement
                                              (e.g., "Current p99 is 145ms")
```

- **SLI (Service Level Indicator)**: A quantitative measurement of service performance. E.g., `Uptime % = (Successful Requests / Total Requests) * 100`.
- **SLO (Service Level Objective)**: The target metric range agreed upon by the engineering team. E.g., `Uptime SLI must remain >= 99.9% over a 30-day window`.
- **SLA (Service Level Agreement)**: A legal contract specifying the service targets and financial penalties for breaching the SLO.

### 4. Transport Protocols: TCP vs. UDP

The transport layer dictates communication characteristics:

- **TCP (Transmission Control Protocol)**: Connection-oriented. Establishes session state via a 3-way handshake. Guarantees packet delivery, ordering, and congestion control.
  - _Used for_: HTTP/REST APIs, Database queries, Email, File transfers.
- **UDP (User Datagram Protocol)**: Connectionless. Sends packets ("datagrams") without verifying receipt. Lower latency, but permits packet loss.
  - _Used for_: Real-time audio/video streaming, gaming, DNS resolution, IoT telemetry.

---

## Real-World Production Learnings

In our early analytics platform, we hosted our monolithic Node.js processing server on a single massive AWS instance (vertical scaling: 64 cores, 256GB RAM) to avoid rewriting our local in-memory session code.

During a marketing event, traffic spiked from 200 to 5,000 requests per second. The single instance CPU hit 100% and crashed. Because Node.js is single-threaded, it could not utilize the extra 63 idle cores natively, and our entire service went offline.

**The Refactor**:
We transitioned to a stateless, horizontally scaled architecture:

1. We migrated user session variables out of Node.js local memory into a shared **Redis Cluster**.
2. We deployed our application inside Docker containers managed by an Auto Scaling Group behind an Application Load Balancer (ALB).
3. We defined a strict **SLO**: _99.9% of user requests must complete in < 300ms_. We configured Prometheus and Grafana alerts to trace our **SLI** at the ALB level.

```yaml
# AWS ALB Auto-scaling Trigger Example
ASGScaleOutPolicy:
  Type: AWS::AutoScaling::ScalingPolicy
  Properties:
    AutoScalingGroupName: !Ref ApiAutoScalingGroup
    PolicyType: TargetTrackingScaling
    TargetTrackingConfiguration:
      TargetValue: 60.0 # Target 60% average CPU across active instances
      PredefinedMetricSpecification:
        PredefinedMetricType: ASGAverageCPUUtilization
```

Following the refactor, when traffic spiked, the Auto Scaling Group dynamically added server nodes, keeping average CPU usage at 60%. Outliers (p99 latency) remained stable at 110ms, satisfying our SLO, and node failure was handled automatically by routing traffic to active nodes.

---

## Related Reading

- [Load Balancing](./load-balancing.md)
- [Caching Strategies](./caching-strategies.md)
- [Rate Limiting](./rate-limiting.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.software-architecture.system-design.basics.md)
