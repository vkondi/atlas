[⬅️ Back to AI Engineering](../README.md)

# Embeddings & Vector Databases

A technical analysis of embedding models, mathematical vector similarity metrics, Approximate Nearest Neighbor (ANN) index structures (IVFFlat, HNSW), and pgvector query optimization.

---

## Why It Matters

Relational databases excel at matching exact strings and numbers using B-Tree indexes, but they cannot evaluate conceptual similarity: a search for "login issues" will not match "authentication problems" unless explicitly mapped. **Vector Embeddings** resolve this by representing the semantic meaning of text as multi-dimensional coordinate vectors. To query these vectors at scale, we require specialized **Vector Databases**. However, executing vector similarity queries without compiling specialized approximate nearest neighbor indexes forces the database to perform slow, full-table sequential scans, causing database CPU saturation and query timeouts as datasets grow.

---

## Core Concepts

### 1. Vector Embeddings

An embedding model is a neural network that maps raw text strings onto a high-dimensional continuous vector space (typically ranging from 384 dimensions for lightweight local models to 1536+ for cloud services):

- **Semantic Capture**: Words or paragraphs with similar conceptual meanings are mapped to neighboring coordinates within the vector space.
- **Dense Representation**: Unlike sparse representations (like TF-IDF or Bag-of-Words, which create massive, mostly-empty matrices), embeddings are dense arrays of floating-point numbers where every dimension represents a latent semantic feature.

### 2. Mathematical Similarity Metrics

When querying a vector database, similarity is calculated using distance metrics:

- **Cosine Similarity**: Measures the cosine of the angle between two vectors ($\mathbf{u}$ and $\mathbf{v}$), ignoring differences in text length (magnitude):

$$\text{Cosine Similarity}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|} = \frac{\sum_{i=1}^{n} u_i v_i}{\sqrt{\sum_{i=1}^{n} u_i^2} \sqrt{\sum_{i=1}^{n} v_i^2}}$$

- **Inner / Dot Product**: Measures both magnitude and direction. If vectors are unit-normalized (length of 1.0), the dot product calculation is mathematically equivalent to cosine similarity and is computationally faster to execute.
- **Euclidean Distance (L2)**: Measures the straight-line physical distance between two coordinate points in the vector space. Lower scores indicate higher similarity.

### 3. Approximate Nearest Neighbor (ANN) Indexes

Calculating exact similarity matches across millions of vectors requires comparing the query vector against every record in the table. This is computationally expensive ($O(N)$ complexity). To scale, vector databases use **ANN Indexes**:

- **IVFFlat (Inverted File Index)**: Divides the vector space into Voronoi cells using k-means clustering. During queries, the search is restricted only to vectors within the closest cluster centroids. This offers a low memory footprint but lower recall rates if clusters are unoptimized.
- **HNSW (Hierarchical Navigable Small World)**: Builds a multi-layer graph structure where layers represent different zoom scales of vector links. HNSW offers high recall and search speeds, but requires significant VRAM/RAM to keep the graph indices in memory:

```
                      HNSW LAYERED GRAPH STRUCTURE

   Layer 2 (Zoom Out):     o --------------------- o
                           │                       │
   Layer 1 (Medium):       o ------ o ------------ o ------ o
                           │        │              │        │
   Layer 0 (Zoom In):      o - o -- o - o - o ---- o - o -- o
                           (Evaluates dense local neighbors)
```

### 4. Vector Stores

- **PostgreSQL + pgvector**: An open-source extension enabling vector storage and indexing within a standard Postgres database. Highly recommended for keeping application data and vector indices in a single transactional system.
- **Managed Vector DBs (Pinecone, Qdrant, Milvus)**: Specialized distributed systems optimized strictly for high-throughput vector queries and dynamic scaling.

---

## Real-World Production Learnings

We integrated a vector-based document search tool into our customer wiki, storing 500,000 embedded document chunks in a PostgreSQL database using the `pgvector` extension.

**The Failure**:
Initially, search queries completed in less than 35ms. However, as the document volume grew from 10,000 to 500,000 chunks, query latency degraded exponentially, reaching **over 4.2 seconds under peak load**, pinning the database server CPU at 100% and causing API gateway timeout exceptions.

**The Diagnostic**:
We ran database query profiling (`EXPLAIN ANALYZE`) on our search query:

```sql
EXPLAIN ANALYZE SELECT chunk_id, text
FROM wiki_chunks
ORDER BY embedding <=> '[0.12, -0.43, ..., 0.05]' LIMIT 5;
```

The analysis showed that PostgreSQL was performing a **Sequential Scan** (represented by the `<=>` cosine distance operator) across all 500,000 rows. We had omitted the index construction step, forcing a full-table float comparison calculation on every query execution.

**The Refactor**:
We optimized our PostgreSQL vector store by compiling an HNSW index:

1. **Index Generation**: We created an HNSW index using cosine operations (`vector_cosine_ops`), configuring the graph construction variables: `m` (max connection links per node) set to 16, and `ef_construction` (search depth during index compile) set to 64.
2. **PostgreSQL Parameter Tuning**: We adjusted our `shared_buffers` memory settings in `postgresql.conf` to guarantee the HNSW graph pages fit entirely in RAM, preventing slow disk-read cycles.

Here is the SQL migration script we deployed to apply this fix:

```sql
-- PostgreSQL pgvector HNSW Index Migration
-- Targets: wiki_chunks table on a 1536-dimension embedding column

-- 1. Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Build the HNSW index using Cosine Distance
-- Note: HNSW index creation is memory-intensive. Adjust max_parallel_maintenance_workers if needed.
SET max_parallel_maintenance_workers = 4;
SET maintenance_work_mem = '2GB';

CREATE INDEX IF NOT EXISTS wiki_chunks_embedding_hnsw_idx
ON wiki_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 3. Verify the index is active
EXPLAIN ANALYZE
SELECT chunk_id, text, 1 - (embedding <=> '[0.12, -0.43, 0.89, -0.12, 0.05, 0.32, -0.01, 0.15, -0.05, 0.22, -0.14, 0.02, 0.12, -0.43, 0.89, -0.12]') AS similarity
FROM wiki_chunks
ORDER BY embedding <=> '[0.12, -0.43, 0.89, -0.12, 0.05, 0.32, -0.01, 0.15, -0.05, 0.22, -0.14, 0.02, 0.12, -0.43, 0.89, -0.12]'
LIMIT 5;
```

By compiling the HNSW index, PostgreSQL bypassed the sequential scan, shifting to an Index Scan matching the graph layers. Query latency dropped from 4.2 seconds back to **12ms**, restoring fast autocomplete capabilities and resolving our CPU bottleneck.

---

## Related Reading

- [RAG Systems Basics](./basics.md)
- [Context Retrieval & Chunking](./context-retrieval-chunking.md)
- [SQL Indexing & Performance](../../databases/relational/sql-indexing-performance.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.rag-systems.embeddings-and-vector-databases.md)
