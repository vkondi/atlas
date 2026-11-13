[⬅️ Back to AI Engineering](../README.md)

# Monitoring & Observability

A comprehensive guide to production AI system observability, implementing dashboards for latency/accuracy/cost, detecting quality drift, alerting on failures, and building instrumentation that enables rapid incident response.

---

## Why It Matters

You cannot manage what you don't measure. Production AI systems require visibility into multiple dimensions simultaneously: inference latency, accuracy degradation, cost anomalies, and user-facing failures. Without observability, issues remain hidden until they cascade: silent accuracy drops go unnoticed for weeks, cost spikes surprise finance teams, and latency regressions affect users before teams react. Observable systems enable proactive incident response, cost optimization, and continuous improvement.

---

## Core Concepts

### 1. Observability Dimensions

```
                    OBSERVABILITY STACK

Dimension       Metric                  Target      Alert
──────────────────────────────────────────────────────────
Latency         p95 response time       < 2s        > 3s
                TTFT                    < 500ms     > 800ms

Accuracy        Eval score              > 0.90      < 0.85
                Hallucination rate      < 2%        > 5%

Cost            $/query                 < $0.10     > $0.20
                Daily spend             < $1000     > $1200

Quality         User satisfaction       > 4/5       < 3/5
                Error rate              < 1%        > 2%

Availability    Uptime                  > 99.9%     < 99%
                Error 5xx rate          < 0.1%      > 0.5%
```

### 2. Instrumentation Pattern

```
                    INSTRUMENTATION FLOW

Query Received
    │
    ├─→ [ Log: Query ID, user, timestamp ]
    │
    ├─→ [ Measure: Retrieval latency, K results ]
    │
    ├─→ [ Measure: LLM latency, input/output tokens, cost ]
    │
    ├─→ [ Log: Response, quality metrics ]
    │
    └─→ [ Async: Emit to observability backend ]
        ├─ Prometheus (metrics)
        ├─ Loki (logs)
        └─ Jaeger (traces)
```

### 3. Alerts & Thresholds

Strategic alerting prevents alert fatigue:

```
                    ALERT HIERARCHY

🔴 CRITICAL (Page on-call immediately)
   - Error rate > 10%
   - Latency p95 > 10 seconds
   - Accuracy score drops > 20%
   - Daily cost > 2x baseline
   - Service unavailable > 5 minutes

🟠 HIGH (Alert but not page)
   - Error rate > 5%
   - Latency p95 > 5 seconds
   - Accuracy drops > 10%
   - Daily cost > 1.5x baseline

🟡 MEDIUM (Log, trigger investigation)
   - Error rate > 2%
   - Latency p95 > 3 seconds
   - Accuracy drops > 5%
```

---

## Real-World Production Learnings

We initially had zero observability. When users reported issues, we had no data to debug.

**The Failure**:

1. Silent accuracy drop (90% → 75% over 2 weeks, undetected)
2. Cost spike ($500 → $5000/day, discovered via billing alert)
3. Latency degradation (invisible to users, only on backend)

**The Refactor**:

Built comprehensive observability:

1. Daily accuracy eval (RAGAS metrics)
2. Real-time cost tracking (per-query, per-feature)
3. Latency dashboards with p50/p95/p99 percentiles

Results: Incident detection time from days to minutes

---

## Related Reading

- [Evals & Benchmarks](../fundamentals/evals-and-benchmarks.md)
- [Cost Optimization & Token Budgets](../fundamentals/cost-optimization-and-token-budgets.md)
- [Harness Engineering & MLOps](../production-infrastructure/harness-engineering-and-mlops.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.operations-and-observability.monitoring-and-observability.md)
