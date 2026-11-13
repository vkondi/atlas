[⬅️ Back to AI Engineering](../README.md)

# Local AI Basics

An operational engineering guide to offline local model execution, covering hardware dimensioning, memory bandwidth bottlenecks, and local hosting architecture trade-offs.

---

## Why It Matters

Using cloud LLM APIs (like OpenAI or Claude) is straightforward, but introduces three critical issues: high variable costs at scale, compliance/privacy violations when handling proprietary source code or sensitive user databases, and dependency on external network latency. Hosting models locally resolves these problems, enabling secure, offline, and cost-controlled intelligence. However, running local models requires a firm understanding of system architecture. Attempting to run large models on underpowered hardware leads to workstation crashes, low token-generation rates, and project abandonment.

---

## Core Concepts

### 1. Rationale for Local AI

- **Data Sovereignty & Compliance**: Avoids transmitting proprietary source code, credentials, or PII (Personally Identifiable Information) to external servers, complying with strict GDPR, HIPAA, or SOC2 standards.
- **Cost Predictability**: Replaces variable per-token API billing with fixed, upfront hardware amortization. Ideal for high-throughput batch workloads (e.g., classifying millions of historical log lines).
- **Network Independence & Latency Control**: Removes internet round-trip times and eliminates outages due to cloud provider downtime.

### 2. Hardware Dimensioning & Bottlenecks

LLM execution is split into two phases with distinct hardware bottlenecks:

- **Prefill Phase (Input Processing)**: The model processes all prompt tokens at once. This is highly **compute-bound**, meaning performance is determined by the raw floating-point operations per second (FLOPS) of the GPU Tensor cores.
- **Decoding Phase (Token Generation)**: The model generates tokens one by one. For each token, the GPU must load the entire model's weights from memory into the processor cores. This is highly **memory-bandwidth bound**. Performance is determined by how fast weights can be read from memory:

```
               INFERENCE SYSTEM MEMORY SPEED COMPARE

  Hardware Platform       Memory System     Theoretical Bandwidth
  ───────────────────────────────────────────────────────────────
  Standard Xeon Server    DDR5 (System)     ~80 GB/sec
  Apple Mac Studio M3     Unified Memory    ~800 GB/sec
  NVIDIA RTX 4090 GPU     GDDR6X (VRAM)     ~1,008 GB/sec
  NVIDIA H100 GPU         HBM3 (VRAM)       ~3,350 GB/sec
```

- **System RAM vs. VRAM**: Standard CPU system memory is too slow to achieve interactive token generation speeds for large models. High-speed Video RAM (VRAM) on a dedicated GPU is essential.
- **Unified Memory**: Apple Silicon architectures utilize a unified memory system where CPU and GPU share the same RAM pool. This allows developers to load massive models (e.g., 70B parameters) into memory at a fraction of the cost of server-grade GPUs, albeit at slightly lower memory bandwidth speeds than enterprise-grade hardware.

### 3. Model Formats for Local Deployment

- **GGUF (GPT-Generated Unified Format)**: Designed for CPU-based inference engines (like llama.cpp). GGUF allows **layer-offloading**, where a portion of the model's layers are loaded into VRAM, and the remainder run on system RAM and CPU cores. This allows running models that exceed a single GPU's memory capacity.
- **AWQ / GPTQ**: Formats optimized strictly for GPU-only execution engines (like vLLM or HuggingFace TGI). They do not support partial CPU offloading and require all weights to fit within VRAM.

---

## Real-World Production Learnings

Our engineering organization set out to implement a local, offline AI coding assistant to help developers refactor proprietary codebase files without transmitting code to public cloud endpoints.

**The Failure**:
We downloaded a Llama-3-70B model. Our initial setup attempted to run the model on a standard office workstation equipped with an Intel Core i7 CPU, 32 GB of system RAM, and an integrated graphics card (no dedicated GPU).

When we ran the model, the system RAM saturated immediately, forcing the OS to write to disk swap space. The system froze, and the model generated text at a rate of **0.12 tokens per second** (about 1 word every 10 seconds), rendering the tool completely unusable.

**The Diagnostic**:

1. **No VRAM Allocation**: Because the workstation had no dedicated GPU, 100% of the model weights had to load into slow DDR4 system RAM.
2. **Bandwidth Saturation**: Reading the 70B parameter model weights (~140 GB in FP16 format, or ~38 GB in quantized format) through the CPU's DDR4 bus (bandwidth ~40 GB/s) for every single token took nearly 1 second, creating an extreme bottleneck.

**The Refactor**:
We re-architected our local hosting setup:

1. **Hardware Migration**: We deployed a dedicated local inference server equipped with an NVIDIA RTX 4090 GPU (24 GB VRAM) and 64 GB of system RAM.
2. **Model Downsizing & Quantization**: We replaced the 70B model with a 4-bit GGUF quantized version of Llama-3-8B. The model's weights shranked to approximately 4.8 GB.
3. **100% VRAM Offloading**: We configured Ollama to load all 32 layers of the 8B model directly into the 24 GB VRAM of the GPU.

Here is the setup script we wrote to verify and monitor VRAM allocation on our local server:

```bash
#!/bin/bash
# Local AI Hardware Profiler and Run Guard

echo "=== Profiling GPU and Memory Resources ==="

# 1. Check GPU VRAM capacity using nvidia-smi
if ! command -v nvidia-smi &> /dev/null; then
    echo "WARNING: NVIDIA GPU drivers not found. Running in CPU-only mode will yield slow inference."
    exit 1
fi

VRAM_FREE=$(nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits | head -n 1)
echo "Detected Free VRAM: ${VRAM_FREE} MB"

# 2. Check model size bounds
MODEL_SIZE_MB=4800 # Approximate size of 8B Q4 GGUF model
BUFFER_MB=1000     # Buffer for KV Cache and runtime allocation

REQUIRED_VRAM=$((MODEL_SIZE_MB + BUFFER_MB))

if [ "$VRAM_FREE" -lt "$REQUIRED_VRAM" ]; then
    echo "WARNING: Free VRAM (${VRAM_FREE}MB) is less than required (${REQUIRED_VRAM}MB)."
    echo "Ollama will automatically split layers to CPU, reducing tokens-per-second."
else
    echo "SUCCESS: GPU VRAM is sufficient to load 100% of the model weights into memory."
fi

# 3. Launch Ollama service with GPU pinning
export OLLAMA_NUM_PARALLEL=4
export OLLAMA_MAX_LOADED_MODELS=1

echo "Launching Ollama Service..."
ollama serve
```

By switching to the 8B quantized model and loading all layers into the RTX 4090's high-speed VRAM (1,008 GB/s bandwidth), generation speeds jumped from 0.12 tokens/sec to **68.2 tokens per second**. This provided our developers with instantaneous autocomplete suggestions within their IDEs, while maintaining 100% local network isolation.

---

## Related Reading

- [LLM Foundations](../fundamentals/llm-foundations.md)
- [Ollama Local Models](./ollama-local-models.md)
- [ESLint & Prettier Tooling Configs](../../tooling-and-workflows/linters-and-formatters/eslint-and-prettier.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.local-ai-setup.basics.md)
