[⬅️ Back to AI Engineering](../README.md)

# AI Engineering Basics

An engineering guide to the shift from rule-based software development to probabilistic AI systems, detailing scaling laws, inference latency profiles, and token-level resource constraints.

---

## Why It Matters

Traditional software engineering is deterministic: written code compiles into clear, rule-bound execution paths where the same input consistently produces the same output. In contrast, AI engineering is probabilistic: we interface with large, neural-network-based models that output predictions based on probability distributions. If an engineer attempts to integrate Large Language Models (LLMs) with the assumption of perfect determinism, they will face prompt injection vulnerabilities, silent data parsing failures, out-of-memory context window crashes, and runaway API billing charges.

---

## Core Concepts

### 1. Deterministic vs. Probabilistic Paradigms

- **Deterministic Programming**: Inputs go through explicit logical rules (conditionals, loops, strict interfaces) to produce predictable outputs. Debugging is a trace of logic steps.
- **Probabilistic Programming**: Inputs (prompts and dynamic contexts) are processed by statistical models to sample the most likely next sequence of tokens. The same input can yield multiple valid outputs depending on variables like **temperature** or **seed**. Debugging shifts to evaluating probability distributions, schema validations, and output constraints.

### 2. Generative vs. Predictive Models

- **Predictive Models**: Engineered to classify, rank, or predict specific labels (e.g., fraud classification, user churn probability). They output structured probabilities or numeric matrices.
- **Generative Models**: Engineered to produce high-dimensional content (text, code, images, audio) by predicting the joint probability of data tokens. LLMs are autoregressive, meaning they predict the next token given all previous tokens in the sequence.

### 3. Scaling Laws & Resource Constraints

Modern model capabilities are governed by empirical **Scaling Laws** (such as Kaplan et al. and the Chinchilla scaling laws):

- Model performance (loss) scales as a power-law relationship with three factors: the number of model parameters ($N$), the size of the training dataset in tokens ($D$), and the total training compute budget ($C$).
- **Chinchilla Optimal Scaling**: For optimal training efficiency, parameters and tokens should scale in equal proportion. Training larger models requires an exponentially higher volume of high-quality data to prevent overfitting.

### 4. Inference Latency & Throughput Metrics

When serving LLMs in production, application performance is measured using specific token-level metrics:

```
                  INFERENCE TIMELINE

                  Request Sent
                       │
                       ▼
         ┌──────────────────────────┐
         │      Prefill Phase       │  <- Processes input tokens
         └──────────────────────────┘
                       │
                       ▼  Time-To-First-Token (TTFT)
         ┌──────────────────────────┐
         │     Decoding Phase       │  <- Generates tokens sequentially
         └──────────────────────────┘
                       │
                       ▼  Generation Completed
```

- **Time-to-First-Token (TTFT)**: The duration between sending a request and receiving the first generated token. This represents the **Prefill Phase**, where the model parallelizes the processing of the prompt tokens.
- **Inter-Token Latency (ITL)**: The average duration to generate each subsequent token during the **Decoding Phase**. This phase is highly memory-bandwidth bottlenecked, as weights are loaded sequentially for each token generated.
- **Tokens Per Second (TPS)**: The throughput metric representing the average speed of content generation, calculated as `Generated Tokens / (Total Request Duration - TTFT)`.

### 5. Token Lifecycle & Context Windows

LLMs do not process raw text; they operate on numeric IDs called **Tokens**:

1. **Tokenization**: Text is split into sub-word units using algorithms like Byte-Pair Encoding (BPE) or WordPiece. For example, common words represent a single token, while rare words are split (e.g., "deterministic" may be split into `["deter", "min", "istic"]`).
1. **Context Window**: The hard memory capacity limit of the model, representing the sum of both the input (prompt) and output (completion) tokens.
1. **Attention Complexity**: In native Transformer models, self-attention scales quadratically ($O(N^2)$) with context length. Modern optimizations (like FlashAttention and Grouped-Query Attention) reduce this overhead, enabling long-context windows (up to millions of tokens).

---

## Real-World Production Learnings

In our automated customer support pipeline, we implemented an LLM agent to summarize user chat histories and classify ticket urgency. The application utilized a Node.js server that loaded historical conversation logs, formatted them into a complex JSON structure, and queried a cloud-hosted frontier model.

**The Failure**:
During a high-traffic incident, our API billing charges skyrocketed, accumulating over **$8,000 in API costs in 3 days**, while customer chat response times slowed down, with average latencies rising from 1.5 seconds to over 12 seconds. Many requests ultimately failed with HTTP 504 gateway timeouts.

**The Diagnostic**:
We analyzed our token distribution and discovered:

1. **Inefficient Payload Formatting**: The conversation logs were formatted as verbose, nested JSON strings inside the prompt. These JSON braces and indentation characters consumed 3 times more tokens than raw text.
1. **No Session Caching**: The server sent the _entire_ historical log to the model on every single user reply. In a 10-message thread, the earliest messages were sent 10 times, leading to quadratic token consumption.
1. **Unoptimized System Prompts**: Our system prompt contained a huge, redundant list of styling guidelines that the model processed during the prefill phase of every query.

**The Refactor**:
We optimized our token consumption and latency by implementing:

1. **Compact Serialization**: We converted the chat histories to a clean, markdown-like format (`User: ... \n Agent: ...`) instead of serialized JSON, reducing input tokens by 40%.
1. **Sliding Window Buffer**: We restricted the conversation history sent to the model to the last 5 messages, offloading older messages to a vector search database (RAG) which was only queried when historical context was missing.
1. **Prefix Caching & Prompt Optimization**: We leveraged API providers that supported prefix caching, ensuring the static system prompt was cached on the model server, bypassing the prefill compute cost for subsequent turns.

Here is the helper class we wrote to track and limit token footprints prior to making API calls:

```typescript
// Token Budget and Prompt Optimization Guard
import { encoding_for_model, Tiktoken } from 'tiktoken';

export class PromptOptimizationGuard {
  private tokenizer: Tiktoken;
  private maxInputLimit: number;

  constructor(
    modelName: 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-4',
    maxLimit: number = 4000,
  ) {
    this.tokenizer = encoding_for_model(modelName);
    this.maxInputLimit = maxLimit;
  }

  // Sanitize and serialize chat history into a compact layout
  public serializeHistoryCompact(
    messages: { role: string; content: string }[],
  ): string {
    return messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content.trim()}`)
      .join('\n');
  }

  // Count tokens in string
  public countTokens(text: string): number {
    const tokens = this.tokenizer.encode(text);
    return tokens.length;
  }

  // Ensure prompt fits within a safe token budget, pruning oldest messages if needed
  public enforceTokenBudget(
    systemPrompt: string,
    history: { role: string; content: string }[],
    newInput: string,
  ): string {
    const systemTokenCount = this.countTokens(systemPrompt);
    const inputTokenCount = this.countTokens(`USER: ${newInput}`);

    let allowedHistoryTokens =
      this.maxInputLimit - (systemTokenCount + inputTokenCount + 100); // 100 token buffer

    if (allowedHistoryTokens <= 0) {
      throw new Error(
        'Token budget exceeded by static system instructions and user input.',
      );
    }

    const compiledHistory: string[] = [];
    let currentHistoryTokens = 0;

    // Process history backwards (newest first) to preserve recent context
    for (let i = history.length - 1; i >= 0; i--) {
      const line = `${history[i].role.toUpperCase()}: ${history[i].content.trim()}`;
      const lineTokens = this.countTokens(line) + 1; // +1 for newline character

      if (currentHistoryTokens + lineTokens > allowedHistoryTokens) {
        break; // Stop adding history once budget is exhausted
      }

      compiledHistory.unshift(line);
      currentHistoryTokens += lineTokens;
    }

    const finalHistoryText = compiledHistory.join('\n');
    return `${systemPrompt}\n\n${finalHistoryText}\nUSER: ${newInput}`;
  }

  // Free memory allocated by Tiktoken rust bindings
  public dispose(): void {
    this.tokenizer.free();
  }
}
```

By applying token-budget guards and pruning redundant conversation loops, our average input payload fell from 9,000 tokens to 1,800 tokens. Our API billing dropped by **82%**, and the time-to-first-token stabilized under **350ms**, eliminating timeout failures entirely.

---

## Related Reading

- [LLM Foundations](./llm-foundations.md)
- [Prompt Engineering Principles](./prompt-engineering.md)
- [Redis Caching & Data Structures](../../databases/non-relational/redis-caching-data-structures.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.fundamentals.basics.md)
