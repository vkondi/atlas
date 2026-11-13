[⬅️ Back to AI Engineering](../README.md)

# Cost Optimization & Token Budgets

A practical guide to managing LLM token consumption, implementing cost controls, optimizing API spending, caching strategies, and building systems that predict and limit token footprints before they incur charges.

---

## Why It Matters

LLM API costs scale linearly with token consumption. A single unoptimized query can cost $0.01; multiply by millions of daily requests and optimization becomes a multi-million-dollar problem. Teams that lack token budgeting often face surprise billing spikes: a poorly written prompt that includes verbose context, no caching of static data, or inefficient retry logic can cause 10-100x cost increase overnight. Production systems must establish hard token budgets, measure consumption per feature, and optimize aggressively. The difference between an efficient system and an inefficient one is often 5-10x cost multiplier.

---

## Core Concepts

### 1. Token Economics & Pricing Models

LLM pricing varies dramatically by provider and model:

```
                    PRICING COMPARISON (Per 1M tokens)

   Model              Input Cost    Output Cost   Ratio
   ──────────────────────────────────────────────────
   GPT-3.5 Turbo      $0.50         $1.50         1:3
   GPT-4              $30.00        $60.00        1:2
   Claude 3.5 Sonnet  $3.00         $15.00        1:5
   Llama 3.1 (Meta)   $0.40         $1.20         1:3
   Local (Self-hosted) $0.00        $0.00         Free (infra cost)

   Example: 1M input + 100K output tokens
   ──────────────────────────────────────────
   GPT-3.5: $0.50 + $0.15 = $0.65
   GPT-4:   $30.00 + $6.00 = $36.00
   Claude:  $3.00 + $0.75 = $3.75
   Local:   Electricity only (~$0.10)
```

**Key Insights**:

- **Input vs. Output**: Most models charge 3-5x more for output tokens. Prompt engineering saves more than code optimization.
- **Model Selection**: 50x cost difference between models. Smaller models often sufficient for retrieval/classification.
- **Scale Factor**: Costs scale linearly. 1B daily requests = $1M/day at $1 per 1K tokens.

### 2. Token Budgeting & Accounting

Professional systems enforce strict token budgets:

```
                    TOKEN BUDGET FRAMEWORK

   [ Daily Budget ]
   e.g., $10,000/day budget
         │
         ├─→ [ Feature Allocation ]
         │   - Search: $3,000
         │   - Chat: $4,000
         │   - Analysis: $2,000
         │   - Overhead/testing: $1,000
         │
         ├─→ [ Per-Query Limits ]
         │   - Search query: max 2,000 tokens input
         │   - Chat turn: max 1,000 tokens input, 500 output
         │   - Analysis: max 5,000 input, 2,000 output
         │
         ├─→ [ Real-Time Monitoring ]
         │   - Log every query's token count
         │   - Track cumulative spend per feature
         │   - Alert at 80% budget consumption
         │   - Hard block at 100% budget
         │
         └─→ [ End-of-Day Report ]
             - Actual spend vs. budget
             - Cost per feature/user
             - Optimization opportunities
```

**Budgeting Formula**:

```
Max Queries Per Day = Daily Budget / (Avg Input Tokens × Input Rate + Avg Output Tokens × Output Rate)

Example:
Daily Budget: $1,000
Avg Input: 500 tokens
Avg Output: 100 tokens
Input Rate (GPT-4): $30 / 1M
Output Rate (GPT-4): $60 / 1M

Max Queries = $1,000 / (500 × 30/1M + 100 × 60/1M)
            = $1,000 / ($0.015 + $0.006)
            = $1,000 / $0.021
            = ~47,600 queries/day
```

### 3. Prompt Optimization Techniques

The highest ROI optimization: reduce input tokens.

```
                    OPTIMIZATION TECHNIQUES

Technique 1: Compact Formatting
┌─────────────────────────────────────────────────────────┐
│ VERBOSE (900 tokens):                                   │
│ "Please review the following customer feedback message  │
│  and provide a detailed analysis of the sentiment and   │
│  any potential issues that should be escalated. Here    │
│  is the message: <message>"                             │
│                                                         │
│ OPTIMIZED (200 tokens):                                │
│ "Analyze sentiment and flag issues:\n<message>"       │
│ ~78% reduction                                          │
└─────────────────────────────────────────────────────────┘

Technique 2: Instruction Caching
┌─────────────────────────────────────────────────────────┐
│ System Prompt (cached, ~500 tokens):                    │
│ [Loaded once, reused across 1000 queries]             │
│                                                         │
│ Per-Query Addition (50 tokens):                        │
│ [User input + context only]                            │
│                                                         │
│ vs. Without Caching:                                    │
│ [System prompt repeated 1000x = 500K extra tokens]    │
└─────────────────────────────────────────────────────────┘

Technique 3: Retrieval Instead of Embedding
┌─────────────────────────────────────────────────────────┐
│ Without RAG (2,000 tokens):                             │
│ Full document embedded in prompt                        │
│                                                         │
│ With RAG (200 tokens):                                  │
│ Only relevant chunks retrieved                          │
│ 90% reduction                                           │
└─────────────────────────────────────────────────────────┘

Technique 4: Model Selection
┌─────────────────────────────────────────────────────────┐
│ Simple classification: GPT-3.5 (20x cheaper)           │
│ Complex reasoning: GPT-4 (necessary cost)              │
│ Local deployment: Llama 3.1 (free after infra)        │
│ Route intelligently to minimize expensive model use    │
└─────────────────────────────────────────────────────────┘
```

### 4. Caching Strategies

Caching is the single highest-impact optimization:

**Type 1: Prompt-Level Caching** (API-native)

- Supported by: Claude (prompt caching), GPT-4 (preview)
- Save: 90% cost on cached input tokens
- Use case: Static system prompts, knowledge bases

**Type 2: Response Caching**

- Cache model responses by query hash
- Return cached response if identical query seen before
- Challenge: Exact match requirement (typos break cache)

**Type 3: Semantic Caching**

- Hash query embeddings instead of text
- Return cached response for semantically similar queries
- Higher hit rate than exact matching

```
                    CACHING IMPACT

Query Type: Customer support ("How do I reset my password?")

Without Caching:
   Request 1: Send full prompt + system instructions = 1,000 tokens
   Request 2: Send full prompt + system instructions = 1,000 tokens
   ...
   Request 1000: Send full prompt = 1,000 tokens
   Total: 1M tokens = $30 (GPT-4)

With Prompt Caching:
   Request 1: Send full prompt (cached) = 1,000 tokens
   Request 2-1000: Reuse cache = 10 tokens × 999 = 9,990 tokens
   Total: ~11K tokens = $0.33 (90% savings)
```

### 5. Cost Monitoring & Alerting

Real-time cost controls prevent budget overruns:

```
                    COST MONITORING PIPELINE

   [ Every Query Execution ]
         │
         ├─→ [ Log Token Count ]
         │   Input tokens + Output tokens
         │
         ├─→ [ Calculate Cost ]
         │   Cost = (Input/1M × Input Rate) + (Output/1M × Output Rate)
         │
         ├─→ [ Update Feature Budget ]
         │   Feature's daily spend += query cost
         │
         ├─→ [ Check Thresholds ]
         │   80% budget → Warning log
         │   95% budget → Alert ops team
         │   100% budget → HARD BLOCK (reject queries)
         │
         └─→ [ Aggregation ]
             Daily report: spend per feature, anomalies
```

---

## Real-World Production Learnings

We deployed a customer insights platform that analyzed user behavior with daily LLM analysis. Initial MVP had no cost controls.

**The Failure**:

1. **Unbounded Prompts**: Each analysis sent 50KB+ of user history (context bloat).
2. **No Caching**: System prompts repeated for every query.
3. **Expensive Models**: Used GPT-4 for all analysis (unnecessary).

**Costs**:

- Day 1: $500 (100 analyses)
- Day 7: $8,000 (1000 analyses, compounding)
- Day 30: $250,000 (accumulation, 10M+ tokens)

**The Refactor**:

1. **Prompt Compression**: Reduced context from 50KB to 5KB (90% reduction).
2. **Caching**: Cached system prompt across all analyses.
3. **Model Routing**: GPT-3.5 for simple classification, GPT-4 only for complex reasoning.
4. **Token Budgets**: Hard limit of $5K/day with feature-level allocation.

Here's the implementation:

```python
import hashlib
from typing import Optional

class CostController:
    """Production cost management for LLM queries."""

    def __init__(self, daily_budget: float = 1000.0):
        self.daily_budget = daily_budget
        self.feature_budgets = {
            "search": daily_budget * 0.3,
            "chat": daily_budget * 0.4,
            "analysis": daily_budget * 0.2,
            "testing": daily_budget * 0.1,
        }
        self.feature_spend = {feature: 0.0 for feature in self.feature_budgets}
        self.pricing = {
            "gpt-3.5": {"input": 0.0005, "output": 0.0015},
            "gpt-4": {"input": 0.03, "output": 0.06},
            "claude": {"input": 0.003, "output": 0.015},
        }

    def calculate_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> float:
        """Calculate cost for a query."""
        rates = self.pricing[model]
        cost = (
            (input_tokens / 1000000) * rates["input"]
            + (output_tokens / 1000000) * rates["output"]
        )
        return cost

    def can_afford_query(
        self,
        feature: str,
        estimated_input: int,
        estimated_output: int,
        model: str = "gpt-3.5",
    ) -> tuple[bool, float, str]:
        """Check if query is affordable within budget."""
        cost = self.calculate_cost(model, estimated_input, estimated_output)
        remaining_budget = self.feature_budgets[feature] - self.feature_spend[feature]

        if cost > remaining_budget:
            return (
                False,
                cost,
                f"Query cost ${cost:.2f} exceeds remaining budget ${remaining_budget:.2f}",
            )

        return True, cost, "Query approved"

    def log_query_cost(self, feature: str, cost: float):
        """Record query cost against feature budget."""
        self.feature_spend[feature] += cost

    def optimize_prompt(self, prompt: str) -> str:
        """Compress prompt to reduce tokens."""
        # Remove extra whitespace
        prompt = " ".join(prompt.split())

        # Remove unnecessary verbosity
        verbose_patterns = {
            "Please ": "",
            " detailed": "",
            " very": "",
            " thoroughly": "",
        }
        for pattern, replacement in verbose_patterns.items():
            prompt = prompt.replace(pattern, replacement)

        return prompt

    def select_model(
        self,
        task_complexity: str,
    ) -> str:
        """Route to appropriate model based on complexity."""
        routing = {
            "simple": "gpt-3.5",  # Classification, retrieval
            "medium": "gpt-3.5",  # Summarization, moderate reasoning
            "complex": "gpt-4",  # Deep reasoning, analysis
        }
        return routing.get(task_complexity, "gpt-3.5")

    def get_daily_report(self) -> dict:
        """Generate daily cost report."""
        total_spend = sum(self.feature_spend.values())
        return {
            "total_spend": total_spend,
            "daily_budget": self.daily_budget,
            "utilization": total_spend / self.daily_budget,
            "by_feature": self.feature_spend,
            "status": (
                "🟢 OK" if total_spend < self.daily_budget * 0.8
                else "🟡 WARNING" if total_spend < self.daily_budget
                else "🔴 OVER BUDGET"
            ),
        }

# Usage
controller = CostController(daily_budget=1000.0)

# Check if we can afford a query
task = "simple"
model = controller.select_model(task)
affordable, cost, message = controller.can_afford_query(
    feature="search",
    estimated_input=500,
    estimated_output=100,
    model=model,
)

print(f"{message} (Cost: ${cost:.4f})")

if affordable:
    # Execute query
    controller.log_query_cost("search", cost)

# Daily report
report = controller.get_daily_report()
print(f"Daily report: {report}")
```

**Results**:

- Reduced daily cost from $8,000 to $800 (90% savings).
- Implemented hard budget blocking at $5K/day.
- Achieved cost predictability; no surprise billing.

---

## Related Reading

- [AI Engineering Basics](./basics.md)
- [Evals & Benchmarks](./evals-and-benchmarks.md)
- [Monitoring & Observability](../operations-and-observability/monitoring-and-observability.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.fundamentals.cost-optimization-and-token-budgets.md)
