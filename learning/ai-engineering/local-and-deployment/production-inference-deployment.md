[⬅️ Back to AI Engineering](../README.md)

# Production Inference Serving

A technical guide to deploying LLMs at scale, comparing serving frameworks (vLLM, TensorRT-LLM, BentoML, TGI), optimization techniques for throughput and latency, load balancing, and building reliable inference infrastructure for production traffic.

---

## Why It Matters

Running LLMs in production requires more than downloading a model. You need infrastructure that handles thousands of concurrent requests, batches queries efficiently, applies optimizations (quantization, paging, speculative decoding), and scales elastically. An unoptimized serving setup can run 10x slower and consume 10x more GPU memory than an optimized one. Production inference serving separates hobbyist experimentation from enterprise-grade systems.

---

## Core Concepts

### 1. Serving Framework Comparison

```
                    SERVING FRAMEWORKS

Framework        Language  Optimization   Scaling  Community
─────────────────────────────────────────────────────────
vLLM             Python    PagedAttn,Spec Easy     Large
TensorRT-LLM     C++/CUDA  FP8,TensorRT   Medium   NVIDIA
BentoML          Python    Flexible       Good     Growing
TGI              Rust      Flash Attn     Easy     HF
Ollama           Go        Local          Single   Large
─────────────────────────────────────────────────────────

Best For:
  vLLM:      High throughput, multi-GPU, cloud deployments
  TensorRT:  Maximum performance, latency-critical
  BentoML:   Multi-model serving, custom logic
  TGI:       Container-based, edge deployments
  Ollama:    Local development, single machine
```

### 2. Optimization Techniques

**Technique 1: Paged Attention (vLLM)**

```
Traditional Attention: Allocates full KV cache upfront
├─ Wastes memory on padding
└─ Example: Reserve 4GB per request even if only using 1GB

Paged Attention: Dynamic memory allocation
├─ Allocate pages on-demand (like OS virtual memory)
└─ Example: 4GB available, serve 4x more requests

Impact: 4-10x higher throughput with same GPU memory
```

**Technique 2: Speculative Decoding**

```
Without Speculation:
  Generate token 1 → Compute attention → Generate token 2 → ...
  [Sequential: N tokens = N attention computations]

With Speculation:
  Small model predicts next 4 tokens → Verify with large model
  [Parallel: 4 tokens predicted, then verified in 1 step]

Impact: 2-3x faster generation with minimal accuracy loss
```

**Technique 3: Quantization**

```
FP32 (Full Precision): 13B model = 52GB memory
FP16 (Half Precision): 13B model = 26GB memory (2x reduction)
INT8 (8-bit Quantized): 13B model = 13GB memory (4x reduction)
INT4 (4-bit Quantized): 13B model = 6.5GB memory (8x reduction)

Trade-off: Accuracy slightly reduced, but acceptable for most use cases
Cost: Quantization (one-time), then inference is cheaper
```

### 3. Production Deployment Architecture

```
                    PRODUCTION SETUP

[ Load Balancer ]
   (Nginx, HAProxy)
        │
        ├─→ [ API Gateway ]
        │   (Rate limiting, auth)
        │
        ├─→ [ Inference Cluster ]
        │   ├─ Replica 1 (vLLM on GPU 0-1)
        │   ├─ Replica 2 (vLLM on GPU 2-3)
        │   └─ Replica 3 (vLLM on GPU 4-5)
        │
        ├─→ [ Monitoring & Logging ]
        │   (Prometheus, Loki)
        │
        └─→ [ Auto-scaling Controller ]
            (Kubernetes HPA: scale replicas on latency/queue)
```

### 4. Latency Optimization

```
                    LATENCY BREAKDOWN

TTFT (Time-to-First-Token):
  Prefill (process input): 200ms
  + Attention calculation: 100ms
  = TTFT: ~300ms target

ITL (Inter-Token Latency):
  Per-token generation: 50ms target
  With 20-token output: 1 second decode time

Total: 300ms + (20 × 50ms) = 1.3 seconds

Optimization:
  - Paged Attention: Reduce prefill to 100ms
  - Speculative decoding: Reduce per-token to 25ms
  - Optimized CUDA kernels: Shave 20%
  - Result: 0.5s → 0.8s latency (35% improvement)
```

---

## Real-World Production Learnings

We deployed a chatbot on unoptimized vLLM. Initial performance: unacceptable.

**The Failure**:

1. **Memory Issues**: Ran out of VRAM after 50 concurrent users
2. **Latency**: TTFT averaged 2.5 seconds (user timeout)
3. **Throughput**: Only 5 requests/second on 8x GPU cluster

**The Refactor**:

1. **Paged Attention**: Enabled by default in vLLM (+3x throughput)
2. **Quantization**: FP16 quantization (halved memory)
3. **Batch Sizing**: Tuned batch size and max tokens
4. **Speculative Decoding**: Enabled (20% latency improvement)

Results:

- Throughput: 5 req/s → 40 req/s (8x improvement)
- Latency TTFT: 2.5s → 0.8s
- Memory usage: Enabled 300+ concurrent users

---

## Related Reading

- [Local & Deployment Basics](./basics.md)
- [Harness Engineering & MLOps](../production-infrastructure/harness-engineering-and-mlops.md)
- [Monitoring & Observability](../operations-and-observability/monitoring-and-observability.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.local-and-deployment.production-inference-deployment.md)
