[⬅️ Back to AI Engineering](../README.md)

# Knowledge Graph Layer for RAG Systems

## Overview

Traditional Retrieval-Augmented Generation (RAG) systems primarily rely on vector embeddings and semantic similarity search to retrieve relevant information from a knowledge base.

While this approach works well for document retrieval and question answering, it has limitations when reasoning about relationships between concepts, technologies, projects, or entities spread across multiple documents.

A Knowledge Graph layer complements vector retrieval by introducing structured relationships between entities, enabling more contextual and relationship-aware retrieval.

The result is often referred to as **Graph-RAG** or **Hybrid Retrieval**, where both vector search and graph traversal contribute to the final context supplied to the Large Language Model (LLM).

---

# Traditional RAG Architecture

A typical RAG system follows the workflow below:

```text
Documents
    ↓
Chunking
    ↓
Embeddings
    ↓
Vector Database
    ↓
Similarity Search
    ↓
LLM
    ↓
Response
```

In this model:

- Documents are split into chunks.
- Chunks are converted into embeddings.
- Embeddings are stored in a vector database.
- User queries are converted into embeddings.
- Similar chunks are retrieved based on semantic similarity.
- Retrieved context is passed to the LLM.

This approach answers:

> "Which documents are most similar to the user's question?"

---

# Limitations of Pure Vector Search

Vector search excels at semantic retrieval but has limited understanding of explicit relationships.

Consider the following information:

```text
React is used in Project A.

Project A implements a RAG system.

The RAG system uses ChromaDB.
```

A vector database stores these as text fragments and embeddings.

It does not inherently understand:

```text
React
    ↓
Project A
    ↓
RAG
    ↓
ChromaDB
```

As a result, answering multi-hop or relationship-oriented questions can become difficult.

Examples:

- Which projects use React and AI?
- How is Graph-RAG related to vector search?
- Which technologies are commonly used together?
- What concepts are connected across multiple documents?

---

# Introducing the Knowledge Graph Layer

A knowledge graph represents information as:

- Nodes (entities)
- Relationships (connections between entities)

Example:

```text
React
   │
UsedIn
   │
Project A
   │
Implements
   │
RAG
   │
Uses
   │
ChromaDB
```

Instead of retrieving only text chunks, the system can now reason over connected knowledge.

---

# Knowledge Graph Components

## Entities

Entities represent meaningful concepts extracted from documents.

Examples:

### Technologies

```text
React
Next.js
TypeScript
Node.js
Python
ChromaDB
```

### Concepts

```text
RAG
Graph-RAG
Embeddings
Vector Search
Authentication
```

### Projects

```text
Knowledge Onboarding Agent
GitHub Toolkit
Local RAG Agent
```

### Organizations

```text
UBS
EPAM
Atlassian
```

---

## Relationships

Relationships describe how entities are connected.

Examples:

```text
React
    └─ UsedIn ─► Project A

Project A
    └─ Implements ─► RAG

RAG
    └─ Uses ─► ChromaDB

Graph-RAG
    └─ Extends ─► RAG
```

Common relationship types include:

```text
Uses
Implements
DependsOn
Extends
RelatedTo
BelongsTo
IntroducedIn
```

---

# Hybrid Architecture

A Graph-RAG system typically maintains both vector and graph storage.

```text
                    ┌──────────────┐
                    │ Markdown Docs│
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼

        Vector Pipeline       Graph Pipeline

        Chunking              Entity Extraction
            │                 Relationship Extraction
            ▼                     │
       Embeddings                 ▼
            │               Knowledge Graph
            ▼
       Vector Store

                └──────────┬──────────┘
                           ▼

                    Hybrid Retrieval

                           ▼

                          LLM

                           ▼

                        Response
```

---

# Ingestion Workflow

During document ingestion:

## Vector Pipeline

```text
Markdown Document
        ↓
Chunking
        ↓
Embeddings
        ↓
Vector Database
```

## Graph Pipeline

```text
Markdown Document
        ↓
Entity Extraction
        ↓
Relationship Extraction
        ↓
Graph Database
```

Both pipelines operate on the same source content.

---

# Query Processing

When a user submits a question, the retrieval layer determines the most appropriate retrieval strategy.

## Semantic Search Queries

Example:

> What is Graph-RAG?

Preferred retrieval:

```text
Vector Search
```

---

## Relationship Queries

Example:

> How is Graph-RAG related to vector search?

Preferred retrieval:

```text
Graph Traversal
```

---

## Complex Reasoning Queries

Example:

> Which projects combine React, AI, and RAG concepts?

Preferred retrieval:

```text
Vector Search
+
Graph Traversal
```

This is commonly referred to as Hybrid Retrieval.

---

# Benefits of Knowledge Graph Retrieval

## Relationship Awareness

The system understands how concepts are connected.

Example:

```text
React
   ↓
Project A
   ↓
RAG
   ↓
ChromaDB
```

rather than treating them as isolated text fragments.

---

## Multi-Hop Reasoning

The graph enables traversal across multiple connected entities.

Example:

```text
Technology
    ↓
Project
    ↓
Concept
    ↓
Organization
```

This allows richer contextual retrieval.

---

## Improved Context Assembly

Instead of returning only nearby chunks, the system can retrieve:

- Related technologies
- Associated projects
- Connected concepts
- Supporting documents

before generating a response.

---

## Knowledge Discovery

Graph traversal can uncover relationships that may not be obvious through semantic search alone.

Example:

```text
React
    ↓
Project A

Project A
    ↓
AI

AI
    ↓
Graph-RAG
```

The system can identify connections across documents even when no single document explicitly contains the complete answer.

---

# Explainability

One advantage of graph-based retrieval is improved traceability.

Example response metadata:

```text
Sources:
- graph-rag.md
- vector-search.md

Graph Path:
Graph-RAG
    ↓ Extends
RAG
    ↓ Uses
Embeddings
```

This provides visibility into how the answer was derived.

---

# When to Use a Knowledge Graph Layer

A graph layer is particularly valuable when the knowledge base contains:

- Technical documentation
- Learning repositories
- Architecture documents
- Research notes
- Long-term personal knowledge collections

and when users frequently ask:

- Relationship-oriented questions
- Cross-document questions
- Multi-hop reasoning questions
- Knowledge discovery questions

---

# Summary

Traditional RAG systems answer questions by retrieving semantically similar content from a vector database.

A Knowledge Graph layer enhances this approach by storing entities and relationships extracted from documents.

The resulting Graph-RAG architecture combines:

- Vector retrieval for semantic relevance
- Graph traversal for relationship awareness

This hybrid approach enables more accurate retrieval, improved reasoning, richer context generation, and deeper exploration of interconnected knowledge.

---

## Related Reading

- [RAG Systems Basics](./basics.md)
- [Embeddings & Vector Databases](./embeddings-and-vector-databases.md)
- [JSON Schema validation configs](../../databases/data-modeling/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.rag-systems.knowledge-graph-layer.md)
