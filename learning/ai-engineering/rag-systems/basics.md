[⬅️ Back to AI Engineering](../README.md)

# RAG Basics

An operational guide to Retrieval-Augmented Generation (RAG) architectures, covering ingestion-retrieval workflows, RAG vs. fine-tuning decisions, and metadata-driven hybrid search.

---

## Why It Matters

Large Language Models suffer from two fundamental limitations: **knowledge cutoff** (they cannot recall events or updates that occurred after their training phase) and a lack of access to private, proprietary datasets. Attempting to solve this by fine-tuning models on corporate documents is slow, expensive, and cannot support user-level permission boundaries. **Retrieval-Augmented Generation (RAG)** solves this by searching an external database for documents relevant to the user's query and injecting those documents into the LLM's context window. However, building RAG systems without proper document preprocessing, hybrid search models, and evaluation checks leads to high latency, out-of-date answers, and hallucination loops.

---

## Core Concepts

### 1. The Ingestion-Retrieval-Generation Cycle

A production RAG pipeline operates across three distinct phases:

```
                            RAG PIPELINE FLOW

   [ INGESTION ]                                   [ RETRIEVAL ]
   Raw Documents                                     User Query
         │                                               │
         ▼                                               ▼
   ┌───────────┐                                   ┌───────────┐
   │ Chunking  │ (Split text into blocks)          │ Embedding │ (Convert query to vector)
   └─────┬─────┘                                   └─────┬─────┘
         ▼                                               ▼
   ┌───────────┐                                   ┌───────────┐
   │ Embedding │ (Convert blocks to vectors)       │ Query DB  │ (Vector similarity search)
   └─────┬─────┘                                   └─────┬─────┘
         ▼                                               │
   ┌───────────┐                                         ▼
   │ Vector DB │ (Store vectors & metadata) <─── [ Top K Chunks Retrieved ]
   └───────────┘                                         │
                                                         ▼
                                                [ GENERATION ]
                                            Assemble Prompt (Query + Context)
                                                         │
                                                         ▼
                                                   ┌───────────┐
                                                   │    LLM    │ -> Final Answer
                                                   └───────────┘
```

1. **Ingestion (Offline/Async)**: Parses files (PDFs, Markdown, Wikis), splits them into smaller text segments (chunks), converts those chunks into high-dimensional numerical vectors using an embedding model, and indexes them in a Vector Database alongside metadata (e.g., date, source URL).
1. **Retrieval (Online/Real-time)**: Converts the incoming user query into a vector using the same embedding model. The system executes a vector similarity search (nearest neighbor search) against the database to retrieve the top $K$ most similar chunks.
1. **Generation (Online/Real-time)**: Appends the retrieved text chunks to the user's prompt as context and sends the assembled payload to the LLM to generate the final response, referencing the injected sources.

### 2. RAG vs. Fine-Tuning

Engineers must choose the correct approach based on system goals:

- **Fine-Tuning**: Modifies the model's internal weights. Best for adjusting formatting style, tone, domain-specific terminology (e.g., medical jargon), or teaching the model to follow complex, multi-step instructions. Poor at learning dynamic facts.
- **RAG**: Leaves model weights frozen and injects facts dynamically into the prompt. Best for providing real-time data, connecting private data sources, maintaining clear document citation records, and implementing document-level access permissions.

### 3. Metadata Filtering & Hybrid Search

Semantic vector search alone is often insufficient. For example, a search query for "Q4 billing guidelines" may return semantically similar documents from 2021 instead of the current year. Production RAG pipelines utilize **Hybrid Search**:

- **Vector Search (Dense)**: Captures conceptual, semantic meaning across sentences.
- **Keyword Search (Sparse / BM25)**: Matches exact keyword strings, codes, and IDs (e.g., searching for product SKU `SKU-89201`).
- **Metadata Filters**: Restricts the search space before vector calculations occur (e.g., checking only documents where `metadata.year === 2026`).

---

## Real-World Production Learnings

We built an internal operations wiki search assistant to help team members find software installation guides and setup checklists.

**The Failure**:
When developers asked "How do I configure the databases client?", the RAG assistant generated an outdated guide from 2019 that instructed them to load an old database engine version.

Meanwhile, a newer, updated configuration guide written in 2025 was ignored. This caused developers to configure legacy environments, leading to database schema mismatches and downtime.

**The Diagnostic**:

1. **Recency Bias Deficit**: The vector search engine calculated similarity based purely on Cosine distance. The 2019 document was long and verbose, matching more embedded terms than the newer 2025 document, which was shorter and bulleted.
2. **Missing Metadata Context**: The ingestion pipeline did not tag documents with creation dates or update timestamps, making it impossible to filter or rank based on time.

**The Refactor**:
We re-architected our retrieval pipeline to incorporate metadata tagging and a **Time-Decay Scoring Factor**:

1. **Metadata Injection**: During ingestion, we parsed the file's Git commit date and stored it in the database as a UNIX timestamp parameter.
2. **Reciprocal Rank Fusion (RRF) with Time Decay**: We implemented a hybrid retrieval script. The query retrieves the top 20 chunks by semantic similarity, recalculates their scores using a time-decay function (exponential decay based on age in days), and re-ranks the list before extracting the top 5 chunks.

Here is the TypeScript implementation of our time-weighted RAG retriever:

```typescript
// Time-Decayed RAG Context Retriever
interface DocumentChunk {
  id: string;
  text: string;
  semanticScore: number; // Raw cosine similarity [0 to 1]
  commitTimestamp: number; // UNIX timestamp
}

export class TimeDecayedRAGRetriever {
  private decayConstant = 0.005; // Governs how quickly document scores drop over time

  public retrieveContext(
    queryResults: DocumentChunk[],
    nowTimestamp: number,
  ): DocumentChunk[] {
    const dayInMs = 24 * 60 * 60 * 1000;

    const rankedChunks = queryResults.map((chunk) => {
      // 1. Calculate age of document chunk in days
      const ageInDays = (nowTimestamp - chunk.commitTimestamp) / dayInMs;

      // 2. Exponential decay factor: e^(-lambda * age_in_days)
      // If document is brand new (0 days), decay factor is 1.0.
      // If document is 365 days old, decay factor drops exponentially.
      const timeDecayFactor = Math.exp(
        -this.decayConstant * Math.max(0, ageInDays),
      );

      // 3. Calculate final hybrid score
      const hybridScore = chunk.semanticScore * timeDecayFactor;

      console.log(
        `Chunk ${chunk.id}: Semantic=${chunk.semanticScore.toFixed(3)}, Age=${Math.round(ageInDays)} days, DecayFactor=${timeDecayFactor.toFixed(3)}, Final=${hybridScore.toFixed(3)}`,
      );

      return {
        ...chunk,
        hybridScore,
      };
    });

    // Sort descending based on our final time-decayed score
    return rankedChunks
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, 5); // Return top 5 optimized chunks
  }
}
```

By introducing Git-commit date metadata and applying an exponential time-decay decay constant to the retrieval scores, our RAG search successfully prioritized newer documentation. The 2025 setup guide was correctly ranked above the legacy 2019 document, preventing environment misconfiguration issues and improving developer trust in the search assistant.

---

## Related Reading

- [Context Retrieval & Chunking](./context-retrieval-chunking.md)
- [Embeddings & Vector Databases](./embeddings-and-vector-databases.md)
- [Git Advanced Workflows](../../tooling-and-workflows/local-development/git-advanced-workflows.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.rag-systems.basics.md)
