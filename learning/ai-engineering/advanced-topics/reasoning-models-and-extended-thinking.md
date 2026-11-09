[⬅️ Back to AI Engineering](../README.md)

# Reasoning Models & Extended Thinking

A technical guide to frontier reasoning models (O1, O3 style), chain-of-thought prompting strategies, structured reasoning patterns, and when to apply reasoning-focused models versus speed-optimized models in production systems.

---

## Why It Matters

Traditional LLMs generate responses through fast, single-pass token generation. They excel at retrieval and synthesis but struggle with multi-step logic, verification, and complex problem decomposition. **Reasoning-focused models** (like OpenAI's O1, Anthropic's extended thinking features) allocate compute during a hidden "thinking" phase, working through problems step-by-step before responding. This trades latency for accuracy, making them valuable for high-stakes tasks. However, applying reasoning models indiscriminately burns API tokens and causes timeout failures. Production systems must intelligently route queries to reasoning models only when complexity warrants the cost.

---

## Core Concepts

### 1. Reasoning vs. Speed Trade-Off

Traditional and reasoning models occupy different efficiency frontiers:

```
                  CAPABILITY vs. LATENCY FRONTIER

   Accuracy
     ▲
   95%│        ┌─ O1 (reasoning model)
     │        │ (slow, thorough, expensive)
     │        │
   90%│     ┌──┐ GPT-4 (balanced)
     │    │    └──┐
     │    │        └─ GPT-3.5 (fast, shallow)
   85%│
     │
   80%└────────────────────────────────────────► Latency
        100ms    1s      5s     10s    30s

   Traditional Pipeline:
   Fast LLM response → Verify output in downstream system →
   If invalid, re-query → Risk of loops and cascading delays

   Reasoning Pipeline:
   Reasoning model → Guaranteed high-quality output → Single pass
   (Higher initial latency, but lower overall system latency)
```

**Reasoning Models** (O1, O3):

- Hidden thinking phase (not visible to user)
- Verify reasoning before responding
- 80-95% longer latency than standard models
- 2-3x higher token consumption (thinking tokens not billed but count toward limits)
- Superior performance on: math, coding, logic puzzles, scientific reasoning

**Speed-Optimized Models** (GPT-3.5, Llama 3.1):

- Single-pass generation
- 100-500ms latency
- Best for: retrieval, summarization, classification, content generation

### 2. Chain-of-Thought (CoT) Prompting

Reasoning can be elicited from standard models using structured prompting:

```
                    CHAIN-OF-THOUGHT PATTERN

   Basic Prompt (No CoT):
   "Q: If there are 3 apples and you add 2 more, how many are there?"
   A: 5
   [No reasoning shown; error-prone for complex problems]

                          │
                          ▼

   Chain-of-Thought Prompt (Explicit Reasoning):
   "Q: If there are 3 apples and you add 2 more, how many are there?
    Let's think step by step:
    1. Start with 3 apples
    2. Add 2 more apples
    3. Count: 3 + 2 = 5
    A: 5"

   [Model shows reasoning, enabling verification and error correction]

                          │
                          ▼

   Self-Verification (CoT + Reflection):
   "Q: Solve this: 15 * 4 + 8 - 2
    Let me calculate step by step:
    1. Multiply: 15 * 4 = 60
    2. Add: 60 + 8 = 68
    3. Subtract: 68 - 2 = 66

    Let me verify: 15 * 4 = 60 ✓, 60 + 8 = 68 ✓, 68 - 2 = 66 ✓
    A: 66"
```

**Structured CoT Formats**:

- **Step-by-Step**: Break problem into numbered steps.
- **Tree-of-Thought**: Explore multiple reasoning paths, prune incorrect branches.
- **Retrospective**: Solution first, then verification against criteria.

### 3. Routing: When to Use Reasoning Models

Reasoning models are expensive. Intelligent routing applies them selectively:

```
                    QUERY ROUTING LOGIC

   [ Incoming Query ]
         │
         ▼
   ┌──────────────────────────────────┐
   │ Complexity Detector              │
   │ - Query length > 500 chars?      │
   │ - Contains math/logic?           │
   │ - Multi-step reasoning needed?   │
   │ - High-stakes decision?          │
   └──────────┬───────────────────────┘
         │
    ┌────┴─────┐
    ▼          ▼
[HIGH]      [LOW]
    │          │
    ▼          ▼
  O1        GPT-4
(thorough) (balanced)
    │          │
    └────┬─────┘
         ▼
    [ Response ]
```

**Routing Criteria for Reasoning Models**:

| Criterion                | Route to Reasoning? | Example                                                        |
| ------------------------ | ------------------- | -------------------------------------------------------------- |
| Mathematical reasoning   | Yes                 | "Calculate compound interest over 20 years with varying rates" |
| Algorithm correctness    | Yes                 | "Debug this recursive sorting algorithm"                       |
| Verification requirement | Yes                 | "Is this code vulnerable to SQL injection?"                    |
| Multi-step logical proof | Yes                 | "Prove the sum of angles in a triangle equals 180°"            |
| Creative generation      | No                  | "Write a haiku about autumn"                                   |
| Information retrieval    | No                  | "What's the capital of France?"                                |
| Classification           | Depends             | Yes if ambiguous (nuanced hate speech detection)               |
| Summarization            | No                  | "Summarize this article"                                       |

### 4. Structured Reasoning Patterns

Reasoning models support multiple reasoning architectures:

**Pattern 1: Divide-and-Conquer**

```
Problem: "Optimize a data pipeline processing 100M records daily"

Reasoning:
1. Identify bottlenecks (sequential I/O, no partitioning)
2. Propose solutions (parallelization, batch processing, caching)
3. Evaluate trade-offs (speed vs. complexity vs. cost)
4. Recommend hybrid approach with reasoning for each trade-off
```

**Pattern 2: Hypothesis-Driven Investigation**

```
Problem: "System latency increased 3x after deployment"

Reasoning:
1. Form hypotheses (memory leak, query performance, network)
2. Gather evidence (logs, metrics, traces)
3. Evaluate each hypothesis against evidence
4. Rank by likelihood, propose diagnostics for top hypothesis
```

**Pattern 3: Adversarial Validation**

```
Problem: "Verify this contract is legally sound"

Reasoning:
1. Identify key clauses and obligations
2. Ask: "What could go wrong here?"
3. Challenge each clause with edge cases
4. Synthesize overall risk assessment
```

### 5. Cost & Latency Optimization

Reasoning models are powerful but expensive. Production systems optimize aggressively:

```
                    COST OPTIMIZATION STRATEGIES

Strategy 1: Cascade (Try fast first, escalate if needed)
   ┌─ Query ─→ GPT-4 (fast, cheap)
   │           ├─ Success? → Return
   │           └─ Failed/Uncertain? ↓
   └─────────→ O1 (slow, expensive, thorough)

Strategy 2: Hybrid Reasoning (Use O1 for planning, GPT-4 for execution)
   ┌─ O1 generates detailed step-by-step plan
   └─ GPT-4 executes each step
   (Leverages O1 reasoning without full task using O1)

Strategy 3: Cached Reasoning (Store reasoning results, reuse for similar queries)
   Previous Query + Reasoning → Vector DB
   New Query → Check for similar cached reasoning
   (Avoid recomputing same reasoning patterns)

Strategy 4: Partial Reasoning (Use reasoning only for critical sections)
   Complex math section: Use O1
   Retrieval/summarization sections: Use GPT-4
```

---

## Real-World Production Learnings

We built an internal contract review agent for procurement. It extracted key obligations, identified risks, and recommended approval/rejection. Initial implementation used GPT-4 for all reviews.

**The Failure**:

Contract reviews were inaccurate:

1. **Logic Errors**: The model failed to identify inconsistent clauses. For example, a contract stated "Vendor must deliver within 30 days" but also "delivery window is 45-90 days." The model didn't catch this contradiction.
2. **Edge Case Misses**: Subtle corner cases ("if either party defaults, all payments revert, but [exception clause]") were frequently missed, leading to legal exposure.
3. **False Confidence**: GPT-4 often expressed certainty on ambiguous clauses, missing actual risks.

**The Diagnostic**:

- Contract review requires logical verification and hypothesis testing—exactly what reasoning models excel at.
- GPT-4's single-pass generation was insufficient for complex contractual logic.
- The cost of legal errors (missed risks, failed disputes) exceeded the cost of using expensive models.

**The Refactor**:

We implemented a hybrid reasoning + verification pipeline:

1. **Query Classifier**: Analyze contract complexity (number of parties, clauses, risk level).
2. **Routing Decision**:
   - Simple contracts (low risk, <500 words) → GPT-4
   - Complex contracts (high risk, >2000 words, multi-party) → O1 with reasoning
3. **Structured Output**: Use JSON schema to enforce clause extraction and risk tagging.
4. **Cascade Fallback**: If GPT-4 returns low confidence, escalate to O1.

Here's a simplified implementation:

```python
import anthropic
import json
from enum import Enum

class ContractRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ContractReviewEngine:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.gpt4_model = "gpt-4"  # Placeholder for cost-effective model
        self.reasoning_model = "claude-3-7-sonnet"  # Extended thinking

    def classify_contract_complexity(self, contract_text: str) -> dict:
        """Classify contract complexity based on heuristics."""
        word_count = len(contract_text.split())
        clause_count = contract_text.count("Section") + contract_text.count("Article")
        party_count = contract_text.count("Party") + contract_text.count("Parties")

        risk_score = 0
        if word_count > 2000:
            risk_score += 2
        if clause_count > 15:
            risk_score += 2
        if party_count > 2:
            risk_score += 1

        if risk_score >= 4:
            risk_level = ContractRiskLevel.HIGH
        elif risk_score >= 2:
            risk_level = ContractRiskLevel.MEDIUM
        else:
            risk_level = ContractRiskLevel.LOW

        return {
            "risk_level": risk_level,
            "word_count": word_count,
            "clause_count": clause_count,
            "risk_score": risk_score,
        }

    def review_with_reasoning(self, contract_text: str) -> dict:
        """Use extended thinking for thorough contract analysis."""
        analysis_prompt = f"""
        Analyze this contract for risks and inconsistencies.

        CONTRACT:
        {contract_text}

        Your task:
        1. Extract all key obligations and deadlines
        2. Identify any contradictions or inconsistencies
        3. Highlight edge cases and corner cases
        4. Assess overall risk level
        5. Recommend approval/rejection with rationale

        Return a JSON object with keys:
        - obligations: list of key obligations
        - contradictions: list of identified contradictions
        - edge_cases: list of concerning edge cases
        - risk_level: "low", "medium", or "high"
        - recommendation: "approve" or "reject"
        - reasoning: detailed explanation
        """

        # Use extended thinking for thorough analysis
        response = self.client.messages.create(
            model=self.reasoning_model,
            max_tokens=16000,
            thinking={
                "type": "enabled",
                "budget_tokens": 10000,  # Allocate 10K tokens for thinking
            },
            messages=[
                {
                    "role": "user",
                    "content": analysis_prompt,
                }
            ],
        )

        # Extract reasoning and response
        thinking_content = ""
        response_content = ""

        for block in response.content:
            if block.type == "thinking":
                thinking_content = block.thinking
            elif block.type == "text":
                response_content = block.text

        # Parse JSON response
        try:
            analysis = json.loads(response_content)
        except json.JSONDecodeError:
            analysis = {"error": "Failed to parse response", "raw": response_content}

        return {
            "model": self.reasoning_model,
            "analysis": analysis,
            "thinking_process": thinking_content,
            "confidence": "high",
        }

    def review_with_fast_model(self, contract_text: str) -> dict:
        """Use fast model for simple contracts."""
        analysis_prompt = f"""
        Analyze this contract for risks.

        CONTRACT:
        {contract_text}

        Return a JSON object with:
        - risk_level: "low", "medium", or "high"
        - recommendation: "approve" or "reject"
        - summary: brief explanation
        """

        # Placeholder for fast model call
        # In practice, this would use GPT-4 or equivalent
        return {
            "model": self.gpt4_model,
            "analysis": {
                "risk_level": ContractRiskLevel.LOW,
                "recommendation": "approve",
                "summary": "Standard contract with typical terms",
            },
            "confidence": "medium",
        }

    def review(self, contract_text: str) -> dict:
        """Main review pipeline with intelligent routing."""
        # Classify complexity
        complexity = self.classify_contract_complexity(contract_text)

        print(
            f"Contract complexity: {complexity['risk_level']} "
            f"(score: {complexity['risk_score']})"
        )

        # Route based on complexity
        if complexity["risk_level"] == ContractRiskLevel.HIGH:
            print("Routing to reasoning model for thorough analysis...")
            result = self.review_with_reasoning(contract_text)
        else:
            print("Routing to fast model...")
            result = self.review_with_fast_model(contract_text)

        return {
            "complexity": complexity,
            "review": result,
        }

# Usage
engine = ContractReviewEngine()

contract = """
Agreement between Company A and Company B.

Section 1: Delivery Obligations
- Vendor must deliver within 30 days of purchase order
- Delivery window is 45-90 days per standard terms

Section 2: Payment
- Buyer pays 50% upfront, 50% on delivery
- All payments revert to Buyer if Vendor defaults, except for
  materials already received (Section 3.4 carve-out)
"""

result = engine.review(contract)
print(json.dumps(result, indent=2, default=str))
```

By implementing intelligent routing to reasoning models, we:

- Improved contract risk detection accuracy from 78% to 95%.
- Reduced false negatives (missed risks) from 12% to 2%.
- Kept costs reasonable by using fast models for 60% of contracts and reasoning models only for complex/high-risk cases.
- Average review time: 8 seconds (including API latency).

---

## Related Reading

- [AI Engineering Basics](../fundamentals/basics.md)
- [Prompt Engineering](../fundamentals/prompt-engineering.md)
- [Agent Architectures](../agentic-ai/agent-architectures.md)
- [MCP & Tool Standards](../agentic-ai/mcp-and-tool-standards.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.advanced-topics.reasoning-models-and-extended-thinking.md)
