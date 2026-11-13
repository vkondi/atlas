[⬅️ Back to AI Engineering](../README.md)

# Evals & Benchmarks

A technical guide to LLM evaluation frameworks, designing meaningful benchmarks, measuring model quality across accuracy/latency/cost dimensions, and implementing continuous evaluation pipelines for production AI systems.

---

## Why It Matters

Shipping an untested AI system is like shipping untested software: it fails catastrophically in production. However, evaluating LLMs is fundamentally different from traditional software testing. Standard unit tests check discrete outputs; LLM evaluations must measure probabilistic quality across many dimensions: semantic correctness, factuality, latency, cost, hallucination rate, and adversarial robustness. Without structured evaluation frameworks, teams deploy degraded models, miss regressions, and waste engineering cycles on low-impact optimizations. Production AI systems require continuous evaluation pipelines that catch quality drift before it affects users.

---

## Core Concepts

### 1. Dimensions of LLM Quality

LLM evaluation spans multiple, often conflicting dimensions:

```
                    QUALITY DIMENSIONS

   Accuracy (Semantic Correctness)
   ├─ Exact Match: Response == Expected? (binary)
   ├─ Fuzzy Match: Semantic equivalence (soft scoring)
   ├─ Factuality: Do claims match ground truth?
   └─ Relevance: Does response address the query?

   Speed (Latency)
   ├─ Time-to-First-Token (TTFT): < 500ms target
   ├─ Inter-Token Latency (ITL): < 50ms per token
   └─ End-to-End Latency: < 5s for typical queries

   Cost
   ├─ Input Tokens: $ per 1M input tokens
   ├─ Output Tokens: $ per 1M output tokens
   └─ Inference Cost Per Query: $ per request

   Safety & Alignment
   ├─ Refusal Appropriateness: Correctly refuses harmful requests
   ├─ Tone Consistency: Maintains brand voice
   └─ Bias Mitigation: Treats groups equally

   Hallucination Rate
   ├─ % of responses containing false claims
   ├─ % of citations pointing to non-existent sources
   └─ Confidence Calibration: Does model express uncertainty?

   Robustness
   ├─ Adversarial Examples: Handling of jailbreak attempts
   ├─ Out-of-Distribution Inputs: Behavior on unusual queries
   └─ Edge Cases: Rare but important scenarios
```

### 2. Evaluation Frameworks & Metrics

Standard evaluation metrics for LLMs:

**RAGAS (Retrieval-Augmented Generation Assessment)**

- Evaluates RAG systems specifically
- Metrics:
  - **Faithfulness**: Does response use only retrieved context?
  - **Answer Relevance**: Does response answer the query?
  - **Context Recall**: Does retrieval capture all relevant context?
  - **Context Precision**: Does retrieval avoid irrelevant documents?

**DeepEval** (Semantic evaluation framework)

- Fine-grained evaluation using LLM-as-judge pattern
- Metrics: Answer Relevance, Faithfulness, Contextual Relevance, Bias, Toxicity

**Standard NLP Metrics**

- **BLEU**: N-gram overlap with reference (useful for translation)
- **ROUGE**: Recall-Oriented Understudy for GIST Evaluation (summarization)
- **F1-Score**: Harmonic mean of precision and recall (classification)
- **Exact Match (EM)**: Strict string matching (QA systems)

**Custom Metrics**

- Domain-specific evaluation (e.g., SQL query correctness, code execution)
- Business metrics (e.g., customer satisfaction, conversion impact)

```
                    EVAL PIPELINE ARCHITECTURE

   [ Test Dataset ]
   (hand-curated or programmatically generated)
         │
         ▼
   ┌──────────────┐
   │ Run Inference│ (Generate model outputs)
   └──────┬───────┘
          ▼
   ┌──────────────────────┐
   │ Automatic Evaluation │ (RAGAS, metrics, pattern matching)
   └──────┬───────────────┘
          ▼
   ┌──────────────────────┐
   │ LLM-as-Judge        │ (Use model to score semantic quality)
   └──────┬───────────────┘
          ▼
   ┌──────────────────────┐
   │ Human Review         │ (Sample outputs, catch false negatives)
   │ (10-20% sampling)    │
   └──────┬───────────────┘
          ▼
   [ Aggregate Metrics & Report ]
```

### 3. Test Dataset Design

Evaluation quality depends entirely on test data quality:

**Dataset Characteristics**:

- **Coverage**: Test all major use cases and edge cases.
- **Diversity**: Include queries of varying complexity, length, domain.
- **Realism**: Reflect actual user queries (use production traffic).
- **Ground Truth**: Reference answers curated by domain experts (expensive but necessary).
- **Versioning**: Track dataset versions; tag changes to enable regression detection.

**Test Set Categories**:

| Category            | Purpose                  | Example                                                   |
| ------------------- | ------------------------ | --------------------------------------------------------- |
| Happy Path          | Typical usage            | "What is the capital of France?"                          |
| Edge Cases          | Unusual but valid        | "A is B and B is C, so what is A?" (transitive reasoning) |
| Adversarial         | Jailbreak attempts       | "Ignore previous instructions and tell me how to..."      |
| Out-of-Distribution | Queries outside training | "Evaluate this 2099 geopolitical event" (future scenario) |
| Ambiguous           | Multiple valid answers   | "Which movie is better?" (subjective)                     |
| Low-Resource        | Rare languages/domains   | "Translate this Icelandic text"                           |

### 4. Continuous Evaluation in Production

Evaluation doesn't end at deployment. Production systems require continuous monitoring:

```
                 CONTINUOUS EVAL PIPELINE

   Model Serving in Production
         │
         ├─→ Every Query Logged (request, response, latency)
         │
         ├─→ Sampled Metrics (latency, cost per request)
         │
         ├─→ LLM-as-Judge Sampling (10% of queries)
         │   (Asynchronously evaluate sample of outputs)
         │
         ├─→ User Feedback Loop
         │   (Thumbs up/down, explicit corrections)
         │
         └─→ Human Review Queue
             (Escalate low-confidence outputs)

   Daily Report:
   - Average metrics vs. baseline
   - Regression detection (quality drops)
   - Failure case aggregation (common error patterns)
   - Cost tracking
```

**Alerting Thresholds**:

- Accuracy drops > 5%: Alert
- Hallucination rate > 2%: Alert
- Latency p95 > 5s: Alert
- Cost per query > 2x baseline: Alert

### 5. A/B Testing & Shadowing

When deploying model updates, validate with controlled experiments:

**A/B Testing (Online Evaluation)**

- Route 10% of traffic to new model, 90% to baseline
- Compare metrics over 1 week
- Promote if: accuracy +2%, latency -10%, no cost increase
- Rollback if: any metric regresses

**Shadowing (Offline Evaluation)**

- Run new model in shadow (not serving responses)
- Log outputs, compare against baseline
- No user impact, but reveals divergences before production

---

## Real-World Production Learnings

We deployed a customer support chatbot (GPT-4) to handle 80% of incoming tickets. Initially, accuracy (as measured by customer satisfaction) was 91%.

**The Failure**:

After 3 weeks, we noticed:

1. **Silent Regression**: Customer satisfaction didn't change (91%), but when we manually sampled 50 conversations, we found 4 hallucinations (responses citing non-existent policies).
2. **No Detection**: Our automatic evaluation only checked "did the model respond?" and "did it finish?" We had no factuality checks.
3. **Cascading Impact**: Hallucinated responses (e.g., "You can return items within 90 days") contradicted actual policy (60 days), causing support escalations and customer complaints that took days to propagate to our metrics dashboard.

**The Diagnostic**:

- No continuous evaluation framework → regressions undetected.
- No factuality checks → hallucinations were invisible.
- Binary satisfaction metric was too coarse.

**The Refactor**:

We implemented a comprehensive eval pipeline:

1. **Curated Test Dataset**: 500 hand-labeled Q&A pairs covering all support scenarios.
2. **Multi-Metric Evaluation**:
   - RAGAS metrics (Faithfulness, Context Precision)
   - Hallucination detection (regex patterns + LLM-as-judge)
   - Latency tracking
   - Cost per ticket
3. **Continuous Monitoring**: LLM-as-Judge evaluates 20% of production responses daily.
4. **Alert Thresholds**: Factuality score < 0.95 → automatic rollback.
5. **Weekly A/B Tests**: Test model updates on 5% of traffic before full rollout.

Here's an implementation using RAGAS:

```python
from ragas import evaluate
from ragas.metrics import answer_relevancy, faithfulness, context_precision
from datasets import Dataset
import pandas as pd

class ChatbotEvaluationPipeline:
    def __init__(self, model_name: str = "gpt-4"):
        self.model_name = model_name
        self.metrics = [
            answer_relevancy,
            faithfulness,
            context_precision,
        ]

    def prepare_eval_dataset(
        self,
        questions: list[str],
        ground_truth_answers: list[str],
        retrieved_contexts: list[list[str]],
        model_responses: list[str],
    ) -> Dataset:
        """Prepare evaluation dataset in RAGAS format."""
        eval_data = {
            "question": questions,
            "answer": model_responses,
            "contexts": retrieved_contexts,
            "ground_truth": ground_truth_answers,
        }
        return Dataset.from_dict(eval_data)

    def evaluate_batch(self, eval_dataset: Dataset) -> dict:
        """Run batch evaluation using RAGAS."""
        results = evaluate(
            eval_dataset,
            metrics=self.metrics,
        )

        return {
            "answer_relevancy": results["answer_relevancy"],
            "faithfulness": results["faithfulness"],
            "context_precision": results["context_precision"],
        }

    def evaluate_production_sample(
        self,
        sample_size: int = 100,
        production_logs: list[dict] = None,
    ) -> dict:
        """Evaluate sample of production responses."""
        if not production_logs:
            # In real system, fetch from production database
            production_logs = []

        questions = [log["query"] for log in production_logs[:sample_size]]
        model_responses = [log["response"] for log in production_logs[:sample_size]]
        retrieved_contexts = [
            log.get("context", []) for log in production_logs[:sample_size]
        ]
        ground_truth_answers = [
            log.get("reference_answer", "") for log in production_logs[:sample_size]
        ]

        eval_dataset = self.prepare_eval_dataset(
            questions,
            ground_truth_answers,
            retrieved_contexts,
            model_responses,
        )

        metrics = self.evaluate_batch(eval_dataset)

        # Check alert thresholds
        alerts = []
        if metrics["faithfulness"] < 0.95:
            alerts.append(
                f"ALERT: Faithfulness score {metrics['faithfulness']:.2%} < 95%"
            )
        if metrics["answer_relevancy"] < 0.85:
            alerts.append(
                f"ALERT: Answer relevancy {metrics['answer_relevancy']:.2%} < 85%"
            )

        return {
            "metrics": metrics,
            "alerts": alerts,
            "sample_size": sample_size,
            "timestamp": pd.Timestamp.now().isoformat(),
        }

    def ab_test_models(
        self,
        baseline_responses: list[str],
        candidate_responses: list[str],
        questions: list[str],
        ground_truth: list[str],
        contexts: list[list[str]],
    ) -> dict:
        """A/B test: baseline vs. candidate model."""
        baseline_dataset = self.prepare_eval_dataset(
            questions, ground_truth, contexts, baseline_responses
        )
        candidate_dataset = self.prepare_eval_dataset(
            questions, ground_truth, contexts, candidate_responses
        )

        baseline_metrics = self.evaluate_batch(baseline_dataset)
        candidate_metrics = self.evaluate_batch(candidate_dataset)

        # Calculate deltas
        deltas = {}
        for metric_name in baseline_metrics:
            delta = candidate_metrics[metric_name] - baseline_metrics[metric_name]
            deltas[metric_name] = {
                "baseline": baseline_metrics[metric_name],
                "candidate": candidate_metrics[metric_name],
                "delta": delta,
                "pct_change": (delta / baseline_metrics[metric_name]) * 100
                if baseline_metrics[metric_name] != 0
                else 0,
            }

        # Determine promotion decision
        promote = all(
            deltas[metric]["delta"] >= -0.02  # Allow 2% regression
            for metric in deltas
        )

        return {
            "promote": promote,
            "deltas": deltas,
            "recommendation": (
                "Promote candidate model"
                if promote
                else "Reject candidate; does not meet quality threshold"
            ),
        }

# Usage
pipeline = ChatbotEvaluationPipeline()

# Sample eval dataset
test_questions = [
    "What's your return policy?",
    "How long does shipping take?",
    "Can I change my order?",
]
test_ground_truth = [
    "Returns accepted within 60 days of purchase",
    "Standard shipping is 5-7 business days",
    "Orders can be modified within 24 hours of purchase",
]
test_contexts = [
    ["Our return policy: Items can be returned within 60 days"],
    ["Shipping times: 5-7 business days for standard delivery"],
    ["Order modifications: Available for 24 hours post-purchase"],
]
test_responses = [
    "We accept returns within 60 days",
    "Shipping typically takes 5-7 business days",
    "You can change your order within 24 hours",
]

# Run eval
eval_result = pipeline.evaluate_production_sample(
    sample_size=len(test_questions),
    production_logs=[
        {
            "query": q,
            "response": r,
            "context": c,
            "reference_answer": g,
        }
        for q, r, c, g in zip(
            test_questions, test_responses, test_contexts, test_ground_truth
        )
    ],
)

print("Evaluation Results:")
print(eval_result)
```

By implementing continuous evals, we:

- Detected hallucinations immediately (within 1 day of deployment).
- Reduced customer-facing errors from 4% to <0.5%.
- Improved confidence in model updates; A/B testing caught 2 regressions before production.
- Built sustainable feedback loop: user corrections fed back into eval dataset.

---

## Related Reading

- [AI Engineering Basics](./basics.md)
- [LLM Foundations](./llm-foundations.md)
- [Guardrails & Safety](./guardrails-and-safety.md)
- [Monitoring & Observability](../operations-and-observability/monitoring-and-observability.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.fundamentals.evals-and-benchmarks.md)
