[⬅️ Back to AI Engineering](../README.md)

# Chunking & Context Retrieval

An engineering guide to document preprocessing, chunking strategies (fixed, recursive, semantic), chunk overlap optimization, and parent-document retrieval methods.

---

## Why It Matters

Embedding models have finite context windows (typically 512 to 8192 tokens) and calculate a single mathematical vector representing an entire block of text. If you attempt to embed a 50-page technical manual as a single document, the embedding vector's resolution is diluted, causing retrieval queries to miss granular details. To prevent this, we must segment documents into smaller "chunks." However, choosing an incorrect chunking strategy—such as raw character splits without overlap—cuts sentences in half, separates critical qualifiers from their context, and feeds fragmented, misleading data to the LLM.

---

## Core Concepts

### 1. Common Chunking Strategies

Selecting the right chunking strategy depends on document structure and query granularity:

- **Fixed-Size Chunking**: Splits text at a strict character or token count (e.g., exactly 1000 characters).
  - _Pros_: Simple to implement and computationally fast.
  - _Cons_: Frequently cuts sentences or code blocks in half, severing semantic context.
- **Recursive Character Chunking**: Iteratively splits text using a hierarchical list of delimiters (typically `\n\n` for paragraphs, `\n` for lines, `" "` for words, and `""` for characters). It attempts to keep paragraphs and sentences intact, only splitting when a block exceeds the target chunk size.
- **Document-Structure Chunking**: Parses files based on native layout boundaries (e.g., splitting by Markdown headers `H1`/`H2`, HTML tags, or JSON array structures). Best for codebases and technical documentation.
- **Semantic Chunking**: Analyzes consecutive sentences, calculates embedding vectors for each, measures the cosine distance between neighboring vectors, and triggers a split point only when semantic variance exceeds a dynamic percentile threshold (e.g., 95th percentile). This guarantees that each chunk contains a single coherent topic.

### 2. Chunk Overlap Optimization

To prevent loss of context at split boundaries, chunks must include an **Overlap** (typically 10% to 20% of the chunk size):

```
                   DOCUMENT CHUNKING WITH OVERLAP

   Raw Text:  [ The database client connects to port 5432. The password is encrypted. ]
              └────────────────────────┬────────────────────────────────────────┘
                                       ▼
   Chunk 1:   [ The database client connects to port 5432. ]  <- Chunk Size: 45 chars

   Overlap:                            [ to port 5432. The password is ] <- Overlap

   Chunk 2:                            [ to port 5432. The password is encrypted. ]
```

Without overlap, a query for "encrypted password" might fail to retrieve either chunk because the query terms are split across the boundary.

### 3. Advanced Context Retrieval: Parent-Child Fetching

Instead of passing the exact retrieved chunk to the LLM, modern pipelines use **Parent-Child Retrieval**:

1. **Child Chunks (Small)**: Documents are split into small chunks (e.g., 100-200 tokens) optimized for clean, precise vector search retrieval.
1. **Parent Chunks (Large)**: Each child chunk stores a reference key (`parent_id`) pointing to the larger section or paragraph (e.g., 1000-2000 tokens) it originated from.
1. **Context Expansion**: When a child chunk matches during a search, the system retrieves the parent document and injects the wider context into the LLM prompt. This optimizes both retrieval accuracy and generation reasoning.

---

## Real-World Production Learnings

We developed a legal document search engine designed to index long corporate contracts and partnership agreements.

**The Failure**:
When users queried "What are our termination rights under payment default?", the assistant returned a chunk stating:
`Either party may terminate this agreement upon 30 days written notice.`

Users acted on this advice, assuming a 30-day notice was required. However, the contract actually contained a critical exception on the very next sentence:
`However, in case of a payment default, termination is immediate.`

Because this second sentence fell past our character chunk boundary, it was omitted from the retrieved context, leading to a major business misinterpretation.

**The Diagnostic**:

1. **No Chunk Overlap**: We had configured our ingestion pipeline to use fixed-size character chunking of 200 characters with **0 overlap**. The boundary split precisely between the two sentences.
2. **Grammatical Disconnection**: The qualifying clause ("However, in case of...") was isolated from its core rule ("Either party may terminate...").

**The Refactor**:
We re-architected our ingestion processor:

1. **Recursive Splitter**: We replaced the fixed character splitter with a Recursive Character Splitter, targeting a chunk size of 500 characters with a 100-character overlap.
2. **Parent Document Routing**: We implemented a Parent-Child retriever mapping. The search index queries the small child chunks but resolves to the parent paragraph blocks before generating prompts.

Here is our pipeline class implementing this recursive parent-child mapping:

```typescript
// Recursive Document Preprocessor and Parent-Child Mapper
import { v4 as uuidv4 } from 'uuid';

interface RawDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

interface ProcessedChunk {
  id: string;
  parentId: string;
  text: string;
  metadata: Record<string, any>;
}

export class DocumentIngestionProcessor {
  private targetChunkSize = 300; // Characters
  private chunkOverlap = 60; // Characters

  // Split a parent document into child chunks with overlap
  public processDocument(doc: RawDocument): {
    parent: RawDocument;
    children: ProcessedChunk[];
  } {
    const children: ProcessedChunk[] = [];
    const text = doc.content;
    let startIdx = 0;

    while (startIdx < text.length) {
      let endIdx = startIdx + this.targetChunkSize;

      // If we are not at the end of the text, try to split at a word boundary
      if (endIdx < text.length) {
        const nextSpace = text.indexOf(' ', endIdx);
        if (nextSpace !== -1 && nextSpace - endIdx < 15) {
          endIdx = nextSpace;
        }
      } else {
        endIdx = text.length;
      }

      const chunkText = text.substring(startIdx, endIdx).trim();

      children.push({
        id: uuidv4(),
        parentId: doc.id,
        text: chunkText,
        metadata: {
          ...doc.metadata,
          startIndex: startIdx,
          endIndex: endIdx,
        },
      });

      // Calculate next step index subtracting the overlap
      startIdx = endIdx - this.chunkOverlap;

      // Safety check to prevent infinite loops on extremely short docs
      if (startIdx >= text.length || endIdx === text.length) {
        break;
      }
    }

    return {
      parent: doc,
      children,
    };
  }
}
```

By transitioning to recursive chunking with 60-character overlaps and linking child vectors back to their parent document contexts, we eliminated split-sentence context loss. Queries regarding contract termination correctly returned both the general 30-day notice rule and the immediate default exception, ensuring legal accuracy.

---

## Related Reading

- [RAG Systems Basics](./basics.md)
- [Embeddings & Vector Databases](./embeddings-and-vector-databases.md)
- [JSON Schema validation configs](../../databases/data-modeling/basics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.ai-engineering.rag-systems.context-retrieval-chunking.md)
