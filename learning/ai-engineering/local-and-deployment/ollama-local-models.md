[⬅️ Back to AI Engineering](../README.md)

# Ollama & Local Execution

An operational guide to managing, customizing, and scaling local LLM workloads using the Ollama engine, covering Modelfile syntax, API integration, and concurrent queue tuning.

---

## Why It Matters

Local model deployment can be challenging to manage, requiring complex compiling of C++ wrappers (like llama.cpp), configuring CUDA libraries, and managing raw model file formats. Ollama resolves this by packaging llama.cpp and wrapping it in a Go service that provides automated hardware detection, dynamic VRAM layer allocation, model caching, and an OpenAI-compatible REST API. However, deploying Ollama with its default configuration in a team environment causes performance bottlenecks: concurrent user requests get queued sequentially, and multiple models compete for GPU space, triggering frequent, high-latency weight reloads.

---

## Core Concepts

### 1. What is Ollama?

Ollama is an open-source model orchestrator that runs as a background service. It automates:

- **Asset Management**: Pulling, caching, and running model weights from its registry (similar to Docker Hub).
- **Layer Allocation**: Auto-detecting host graphics cards (NVIDIA CUDA, Apple Metal, AMD ROCm) and offloading model layers to VRAM, falling back to CPU cores only when memory is saturated.
- **Standardized Interfaces**: Exposing a local REST API that supports both native endpoints (`/api/generate`) and OpenAI-compatible specifications (`/v1/chat/completions`).

### 2. Modelfile Customization

Like a Dockerfile, an Ollama **Modelfile** lets developers customize base model behaviors, parameters, and system prompts:

````dockerfile
# Custom SQL Developer Assistant Modelfile
FROM llama3:8b

# Set model execution parameters
PARAMETER temperature 0.2
PARAMETER stop "<|eot_id|>"
PARAMETER stop "```"

# Set the system instruction block
SYSTEM """
You are a Staff Database Engineer specializing in PostgreSQL.
You only output clean, syntactically correct SQL code.
Do not wrap your SQL in markdown text. Return ONLY the raw SQL string.
"""
````

To build and compile this model, execute:
`ollama create sql-coder -f ./Modelfile`

### 3. API Integration Models

Ollama provides a local HTTP server listening on port `11434` by default:

```typescript
// OpenAI-Compatible Local Inference Client
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:11434/v1', // Maps directly to Ollama's OpenAI router
  apiKey: 'ollama-local-placeholder',
});

async function runLocalCompletion() {
  const completion = await openai.chat.completions.create({
    model: 'sql-coder',
    messages: [
      {
        role: 'user',
        content: 'Select all users who signed up in the last 30 days.',
      },
    ],
    temperature: 0.1,
  });

  console.log(completion.choices[0].message.content);
}
```

---

## Real-World Production Learnings

We deployed a team-wide development server hosting Ollama, serving two models: `llama3:8b` for general summarization, and `codellama:7b` for code autocomplete suggestions.

**The Failure**:
When multiple developers query the server simultaneously, response times spike dramatically. autocomplete queries that usually take 200ms suddenly took **over 35 seconds to resolve**.

System monitoring logs showed that the GPU VRAM was constantly thrashing, with the GPU unloading `codellama:7b`, loading `llama3:8b`, and then immediately reversing the swap on the next developer's keypress.

**The Diagnostic**:

1. **Model Cache Contention**: By default, Ollama only loads a single model into memory at a time. When a request for a different model arrives, the active model is evicted, triggering a full 4.8 GB weight read from host disk into GPU VRAM.
2. **Sequential Queue Limits**: Ollama's default server settings process incoming requests sequentially (`OLLAMA_NUM_PARALLEL=1`). Concurrent autocomplete requests were queued up, multiplying the latency overhead.

**The Refactor**:
We optimized our server deployment by editing the system service configurations (usually at `/etc/systemd/system/ollama.service.d/override.conf` on Linux or via environment variables):

1. **Enable Model Multi-Hosting**: We set `OLLAMA_MAX_LOADED_MODELS=2`. This allows keeping both models pinned in memory simultaneously, provided their combined size fits in VRAM.
2. **Activate Concurrent Processing**: We set `OLLAMA_NUM_PARALLEL=4`. This allows Ollama to parallelize up to 4 concurrent streams by allocating separate KV cache buffers across the shared model weights.
3. **Set Keep-Alive Memory Pinning**: We set `OLLAMA_KEEP_ALIVE=-1` (or set a high value like `24h`) to prevent idle models from automatically unloading after the default 5-minute timeout.

Here is the system service environment config file we deployed to enforce these settings:

```ini
# /etc/systemd/system/ollama.service.d/override.conf
[Service]
# Allow up to 4 concurrent inference streams on the same model weights
Environment="OLLAMA_NUM_PARALLEL=4"

# Allow up to 2 different models to reside in VRAM simultaneously
Environment="OLLAMA_MAX_LOADED_MODELS=2"

# Prevent model eviction by keeping models loaded in memory indefinitely
Environment="OLLAMA_KEEP_ALIVE=-1"

# Force Ollama to run on port 11434 and bind to all local network interfaces
Environment="OLLAMA_HOST=0.0.0.0:11434"
```

By applying these concurrency and cache override properties, we eliminated model thrashing. Both Llama-3-8B and CodeLlama-7B remained permanently loaded in VRAM. Autocomplete response latencies under concurrent load stabilized at **180ms**, providing our developers with immediate, lag-free suggestions throughout the workday.

---

## Related Reading

- [Local AI Basics](./basics.md)
- [Open WebUI Integration](./open-webui-integration.md)
- [Application Security & Secrets Management](../../security/infrastructure-security/secrets-management.md)

---

### 📖 Related Blog Posts

- [Ref: Ollama OpenWebUI Your Local AI Setup Guide](../../../blogs/Ollama__OpenWebUI_Your_Local_AI_Setup_Guide.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.local-ai-setup.ollama-local-models.md)
