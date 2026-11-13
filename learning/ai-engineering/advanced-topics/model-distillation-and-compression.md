[⬅️ Back to AI Engineering](../README.md)

# Model Distillation & Compression

A technical guide to knowledge distillation for compressing large models into smaller versions, quantization strategies, pruning techniques, and deploying smaller models without sacrificing quality—enabling cost reduction and edge deployment.

---

## Why It Matters

Frontier models (GPT-4, Claude 3.5) are powerful but expensive and slow. **Model distillation** transfers knowledge from large teacher models to smaller student models, enabling deployment on resource-constrained environments (mobile, edge, cost-optimized clusters). A distilled 3B-parameter model can match a 70B model's performance on specific tasks at 1% of the cost. Production systems leverage distillation to reduce inference costs by 10-100x while maintaining quality.

---

## Core Concepts

### 1. Knowledge Distillation

Transfer knowledge from teacher → student model:

```
                    DISTILLATION PROCESS

Teacher Model (GPT-4)
  Input: "What is machine learning?"
  Output: {
    tokens: [101, 1045, 2572, ...],
    logits: [0.1, 0.8, 0.05, ...],
    probabilities: [0.02, 0.78, 0.15, ...]
  }
         │
         ├─→ Extract soft targets (probability distributions)
         │
         └─→ Student Model (Llama 3.1 8B)
             Train to match: teacher probabilities + task labels

             Loss = α * CrossEntropy(student, labels)
                  + (1-α) * KL_Divergence(student, teacher)
```

**Results**: Student model 8x smaller, 95% of teacher quality

### 2. Quantization

Reduce model size by representing weights with fewer bits:

```
                    QUANTIZATION IMPACT

Model Size & Latency by Bitwidth:
  FP32:  13B model = 52GB (baseline)
  FP16:  13B model = 26GB (2x reduction)
  INT8:  13B model = 13GB (4x reduction)
  INT4:  13B model = 6.5GB (8x reduction)

Quality Degradation:
  FP32:  100% accuracy (baseline)
  FP16:  99.8% accuracy (minimal loss)
  INT8:  99% accuracy (acceptable)
  INT4:  97% accuracy (noticeable but usable)

Cost Trade-Off:
  INT4 model costs 8x less to serve
  If accuracy acceptable for use case, ship it
```

### 3. Pruning

Remove less-important model weights:

```
Technique 1: Magnitude Pruning
  Remove weights with small absolute value
  Example: 20% of weights removed → 20% speed gain

Technique 2: Structured Pruning
  Remove entire neurons/layers
  Example: Reduce layers from 32 → 24
  Result: Significant speedup, more quality loss

Technique 3: Dynamic Pruning
  Prune differently per token during inference
  Result: Adaptive speedup based on input complexity
```

---

## Real-World Production Learnings

We used GPT-4 for classification ($0.05/query, slow).

**The Refactor**:

Distilled Llama 3.1 8B from GPT-4 using 5,000 labeled examples.

Results:

- Model size: 70B → 8B (10x reduction)
- Cost: $0.05 → $0.003/query (15x reduction)
- Speed: 2 seconds → 200ms
- Accuracy: 94% → 91% (acceptable 3% trade-off)

---

## Related Reading

- [LLM Foundations](../fundamentals/llm-foundations.md)
- [Production Inference Serving](../local-and-deployment/production-inference-deployment.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.advanced-topics.model-distillation-and-compression.md)
