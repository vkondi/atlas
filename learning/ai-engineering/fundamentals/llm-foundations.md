[⬅️ Back to AI Engineering](../README.md)

# LLM Foundations

A technical deep dive into Transformer architectures, multi-head attention, parameters, pre-training, fine-tuning methodologies (LoRA/QLoRA), and runtime quantization strategies.

---

## Why It Matters

Deploying Large Language Models in production requires a solid understanding of model architecture and computer hardware constraints. Because LLMs run millions of matrix multiplications across thousands of layers, they are highly bound by GPU memory capacity and memory bandwidth. An engineer who does not understand model size calculations, parameter weights, or quantization layouts will encounter constant CUDA out-of-memory (OOM) errors, select expensive and unnecessary cloud GPU clusters, or suffer from unacceptably slow inference speeds.

---

## Core Concepts

### 1. The Transformer Architecture

Modern LLMs are primarily based on the **Transformer** model architecture introduced by Vaswani et al., utilizing three main styles:

- **Encoder-Only (e.g., BERT)**: Focuses on understanding text by looking at context bidirectionally. Ideal for classification, search, and entity extraction.
- **Decoder-Only (e.g., GPT, Llama, Claude)**: Focuses on generating text by looking only at previous tokens (causal attention). This is the dominant architecture for generative chat and agentic reasoning.
- **Encoder-Decoder (e.g., T5, BART)**: Maps an input sequence to an intermediate representation, then decodes it. Ideal for translation and summarization.

#### Self-Attention Mechanism

At the core of the Transformer is the **Scaled Dot-Product Attention** mechanism:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

- **Queries ($Q$)**: What the current token is looking for.
- **Keys ($K$)**: What other tokens offer.
- **Values ($V$)**: The actual content represented by the tokens.
- **Scale Factor ($\sqrt{d_k}$)**: Prevents dot products from growing excessively large, which would cause the softmax gradients to vanish.
- **Multi-Head Attention (MHA)**: Allows the model to jointly attend to information from different representation subspaces at different positions. Modern variants like **Grouped-Query Attention (GQA)** share keys/values across multiple query heads to reduce memory overhead during inference.

### 2. Model Training Phases & Lifecycle

Building and deploying a specialized model follows a three-step progression:

1. **Pre-Training (Unsupervised)**: The model is trained on raw text datasets (trillions of tokens) to predict the next token. This phase builds general language capabilities and encapsulates **parametric knowledge** (factual information stored within the weights).
1. **Supervised Fine-Tuning (SFT)**: The pre-trained model is trained on curated instruction-response pairs (tens of thousands of examples) to learn how to follow prompts and behave as an assistant.
1. **Alignment (RLHF / DPO)**: The model is aligned with human preferences using Reinforcement Learning from Human Feedback (RLHF) or Direct Preference Optimization (DPO) to reduce harmful behaviors and improve helpfulness.

### 3. Parameter-Efficient Fine-Tuning (PEFT)

Full fine-tuning (updating all weights) is computationally expensive. Engineers utilize **PEFT** to adapt models efficiently:

- **LoRA (Low-Rank Adaptation)**: Freezes the pre-trained model weights and injects trainable rank-decomposition matrices into the self-attention layers. This reduces the number of trainable parameters by up to 99% while maintaining performance.
- **QLoRA (Quantized LoRA)**: Enhances LoRA by quantizing the base model weights to a specialized 4-bit NormalFloat (NF4) data type, allowing fine-tuning of large models on consumer-grade hardware.

```
                      LoRA INJECTION LAYER

                      Input Vector ($X$)
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
          [ Frozen Base ]     [ Down-Projection ($A$) ] <- Trainable
             Weights             (Reduces dimension to Rank $r$)
             ($W_0$)                 │
                 │                   ▼
                 │            [ Up-Projection ($B$) ]   <- Trainable
                 │                   │
                 ▼                   ▼
               $W_0 X$   +        $\Delta W X$  (where $\Delta W = B \times A$)
                 │                   │
                 └─────────┬─────────┘
                           ▼
                        Output
```

### 4. GPU Memory & Size Calculations

A model's memory footprint at rest and during run-time depends on parameter precision:

- **Half-Precision (FP16/BF16)**: Uses 2 bytes per parameter. A 70B parameter model requires $70 \times 2 = 140\text{ GB}$ of VRAM just to load weights into memory.
- **FP32**: Uses 4 bytes per parameter. A 70B model requires 280 GB of memory.

During inference, memory must also accommodate the **KV Cache** (storing key-value matrices for previous tokens in the context window to prevent re-computation). The KV Cache size scales linearly with context window length and batch size:

$$\text{KV Cache Memory (Bytes)} = 2 \times \text{Layers} \times \text{Heads}_{\text{KV}} \times \text{Dim}_{\text{Head}} \times \text{Sequence Length} \times \text{Batch Size} \times 2\text{ bytes}$$

### 5. Model Quantization

Quantization compresses model weights by converting floating-point numbers to lower-precision formats:

- **GGUF (GPT-Generated Unified Format)**: Optimized for CPU execution and partial GPU offloading. Commonly used for local deployments (e.g., Llama.cpp, Ollama).
- **AWQ / GPTQ (Activation-aware Weight Quantization)**: Advanced 4-bit GPU quantization algorithms. AWQ preserves activation patterns of salient weights, yielding high perplexity scores while shrinking a 70B model's footprint from 140 GB to under 40 GB.

---

## Real-World Production Learnings

We set out to host an in-house coding assistant service for our engineering team. We chose a 70B parameter open-weight model to ensure high-quality code generation and autocomplete suggestions.

**The Failure**:
We deployed the model on a cloud server equipped with 2 x NVIDIA A10G GPUs (24 GB VRAM each, total 48 GB). The application repeatedly failed with **CUDA Out of Memory (OOM) errors** during startup. When we successfully loaded a smaller 13B model in 16-bit float (requiring ~26 GB VRAM), the inference was painfully slow—generating code at less than **1.2 tokens per second**, causing developer tools to time out.

**The Diagnostic**:

1. **VRAM Insufficiency**: The 70B model in FP16 format required 140 GB of VRAM. Attempting to load this on a 48 GB GPU cluster triggered immediate hardware memory allocation failures.
2. **Memory Bandwidth Bottleneck**: The 13B model generated output sequentially. Since LLM generation is memory-bandwidth bound, reading weights from memory into the GPU cores for each token took over 800ms. We had also omitted KV-caching optimizations, which forced the GPU to recalculate the entire token history on every token generation.

**The Refactor**:
We redesigned our local hosting architecture to fit within a single, cost-effective GPU node:

1. **Downsized with Quantization**: We replaced the FP16 weights with a 4-bit AWQ quantized version of Llama-3-70B. This compressed the model weight footprint down to 38.5 GB, allowing it to load comfortably into our 48 GB VRAM budget.
2. **KV Cache Offloading**: We configured the vLLM engine, which uses **PagedAttention** (a memory management strategy inspired by virtual memory paging in operating systems) to dynamically allocate KV cache space, preventing VRAM fragmentation.
3. **FlashAttention Activation**: We compiled the runtime with FlashAttention-2 enabled, which uses GPU SRAM tiling to minimize memory reads/writes during self-attention computation.

Here is our production deployment script configurations for serving the model via vLLM:

```bash
# vLLM Server Deployment Script
# Targets: Llama-3-70B-Instruct AWQ on 2 x A10G (48GB combined VRAM)

python3 -m vllm.entrypoints.openai.api_server \
  --model casperhansen/llama-3-70b-instruct-awq \
  --quantization awq \
  --tensor-parallel-size 2 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90 \
  --max-num-seqs 256 \
  --trust-remote-code \
  --port 8000
```

By transitioning to the 4-bit AWQ model and utilizing vLLM's PagedAttention engine, the 70B model fit comfortably into our A10G cluster. Autocomplete generation speeds surged from 1.2 tokens/sec to **32.8 tokens per second**, reducing code completion response times under 200ms and cutting GPU hosting costs by 75%.

---

## Related Reading

- [AI Engineering Basics](./basics.md)
- [Prompt Engineering Principles](./prompt-engineering.md)
- [Kubernetes Basics](../../devops-and-cloud/containers-and-orchestration/kubernetes-basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.fundamentals.llm-foundations.md)
