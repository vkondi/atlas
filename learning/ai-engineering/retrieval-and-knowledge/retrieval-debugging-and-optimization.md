[⬅️ Back to AI Engineering](../README.md)

# Retrieval Debugging & Optimization

A hands-on guide to diagnosing failing RAG queries, measuring retrieval quality, optimizing ranking algorithms, implementing relevance feedback loops, and debugging common retrieval failure modes that cause hallucination and low-precision results.

---

## Why It Matters

RAG systems often fail silently: the retriever returns irrelevant documents, the LLM hallucinates using that bad context, and users never know the underlying retrieval was poor. A top-1 retrieval accuracy of 85% sounds reasonable but in practice means 1 in 7 queries operate on wrong context. Production RAG systems require rigorous debugging and evaluation of the retrieval layer itself, separate from LLM quality. Without retrieval debugging, you optimize the wrong component and waste engineering cycles.

---

## Core Concepts

### 1. Retrieval Failure Modes

Common reasons retrievers fail:

```
                    RETRIEVAL FAILURE MODES

Mode 1: Semantic Mismatch
   Query: "How do I troubleshoot network issues?"
   Retrieved: Documents about "networking hardware" (off-topic)
   Root Cause: Query and documents use different vocabulary
   Solution: Synonym expansion, query rewriting

Mode 2: Rank Inversion
   Relevant document at rank #47, irrelevant at rank #1
   Root Cause: Embedding model biased toward certain keywords
   Solution: Re-ranking with a more capable model

Mode 3: Missing Context
   Query needs multi-document synthesis
   Retriever returns only 1 relevant document
   Root Cause: Query too specific; retriever lacks recall
   Solution: Expand query, retrieve more candidates

Mode 4: Stale Data
   Knowledge base updated but embeddings not re-indexed
   Retriever returns outdated information
   Root Cause: Embedding index out-of-sync with source data
   Solution: Incremental index updates, versioning

Mode 5: Metadata Filtering Errors
   Query: "Show me articles from 2024" (date filter)
   Retriever misses documents due to metadata parsing
   Root Cause: Inconsistent date formats in metadata
   Solution: Normalize metadata during indexing
```

### 2. Retrieval Evaluation Metrics

Measuring retrieval quality independently of LLM:

```
                    RETRIEVAL METRICS

Metric: Recall@K
   "Did the top-K results include at least one relevant doc?"
   Formula: (Relevant docs in top-K) / (Total relevant docs)
   Target: >0.85 for Recall@5

Metric: Precision@K
   "Of the top-K results, how many were relevant?"
   Formula: (Relevant docs in top-K) / K
   Target: >0.80 for Precision@5

Metric: MRR (Mean Reciprocal Rank)
   "On average, how high is the first relevant result?"
   Formula: Average of (1 / rank of first relevant doc)
   Target: >0.70 (first relevant at position 2-3 on average)

Metric: NDCG (Normalized Discounted Cumulative Gain)
   "Are highly relevant docs ranked higher than slightly relevant?"
   Accounts for: relevance grades (perfect/good/fair/bad)
   Target: >0.75

Metric: Mean Average Precision (MAP)
   "Across all queries, what's the average precision?"
   Formula: Average of precision@k for each relevant document
   Target: >0.65
```

### 3. Debugging Workflow

Systematic approach to diagnosing retrieval issues:

```
                    DEBUGGING WORKFLOW

Step 1: Collect Failing Queries
   [ Production logs ]
   ├─ Find queries with low LLM output quality
   ├─ Extract 50-100 examples
   └─ Build ground truth: annotate relevant documents

Step 2: Evaluate Retriever
   [ Run retriever on test queries ]
   ├─ Measure Recall@5, Precision@5, MRR
   ├─ Identify systematic failures
   └─ Compare with baseline (random retrieval)

Step 3: Root Cause Analysis
   [ For queries with low Recall@5 ]
   ├─ Check: Are relevant docs in index?
   ├─ Check: Do they rank in top-100?
   ├─ Check: Embedding quality (using UMAP visualization)
   └─ Hypothesis: Retriever fundamentally missing docs

Step 4: Implement Fix
   [ Address root cause ]
   ├─ Semantic mismatch: Query rewriting
   ├─ Rank inversion: Add re-ranking model
   ├─ Missing docs: Expand retrieval from top-5 to top-20
   └─ Stale data: Re-index documents

Step 5: Measure Impact
   [ Compare before/after ]
   ├─ Recall@5 improvement
   ├─ Precision@5 improvement
   ├─ Latency impact
   └─ LLM output quality (human evaluation)
```

### 4. Optimization Techniques

**Technique 1: Query Expansion**

```python
# Original query: "password reset"
# Problem: Too specific, misses general auth docs

# Query expansion adds synonyms
expanded = [
    "password reset",
    "account access",
    "authentication",
    "login help",
    "credentials",
]

# Retrieve for each, deduplicate results
# Higher recall, similar latency
```

**Technique 2: Re-Ranking**

```
                    RE-RANKING PIPELINE

Retriever (Fast, Recall-Optimized):
   BM25 or lightweight embedding model
   ├─ Retrieve top-100 candidates
   └─ Fast: 10-50ms

Re-Ranker (Accurate, Precision-Optimized):
   Powerful model (e.g., mmarco-mMiniLMv2-L12)
   ├─ Re-score top-100
   ├─ Return top-5 re-ranked
   └─ Accurate: 50-100ms additional

Total latency: 100-150ms vs. 1000ms for expensive retriever
Quality: Recall of top-100 retriever + Precision of re-ranker
```

**Technique 3: Hybrid Search**

```
Retrieve via Two Paths:
1. Dense (Embedding Similarity): Top-20
2. Sparse (BM25): Top-20

Merge Results:
- Ensemble ranking (RRF: Reciprocal Rank Fusion)
- Return Top-10 merged
- Captures: Semantic + keyword relevance
```

### 5. Debugging Tools & Queries

**Tool 1: UMAP Visualization**

```python
import umap
import numpy as np

# Visualize embeddings to spot clusters
embeddings = np.array([...])  # All document embeddings
query_embedding = np.array([...])  # Query embedding

# Reduce to 2D for visualization
reducer = umap.UMAP(n_components=2)
embedding_2d = reducer.fit_transform(embeddings)

# Plot: query position vs. retrieved documents
# Visual inspection reveals semantic structure
```

**Tool 2: Error Analysis Queries**

```sql
-- Find retrieval failures
SELECT query, retrieved_docs, actual_relevant_docs
FROM retrieval_logs
WHERE recall_at_5 < 0.5
ORDER BY query_count DESC
LIMIT 20;
```

---

## Real-World Production Learnings

We built a product FAQ bot. RAG quality was initially 60% (user satisfaction).

**The Failure**:

1. **Rank Inversion**: Irrelevant docs ranked high (keyword matching)
2. **Missing Context**: Single-doc retrieval misses multi-faceted answers
3. **Stale Data**: FAQ updated but embeddings not refreshed

**The Refactor**:

1. **Re-Ranking**: Added mmarco re-ranker (50ms overhead, 15% accuracy gain)
2. **Hybrid Search**: BM25 + embeddings combined
3. **Retrieval Expansion**: Top-10 instead of top-5
4. **Embedding Refresh**: Daily re-indexing

Results: Recall improved from 0.60 to 0.92; user satisfaction 60% → 87%

---

## Related Reading

- [RAG Architecture Fundamentals](./basics.md)
- [Embeddings & Vector Databases](./embeddings-and-vector-databases.md)
- [Evals & Benchmarks](../fundamentals/evals-and-benchmarks.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.retrieval-and-knowledge.retrieval-debugging-and-optimization.md)
