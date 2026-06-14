---
title: "What I Learned Building a Local RAG Agent"
tags:
  - rag
  - ai-agents
  - local-ai
  - artificial-intelligence
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/what-i-learned-building-a-local-rag-agent
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/what-i-learned-building-a-local-rag-agent
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md)

![What_I_Learned_Building_a_Local_RAG_Agent](uploads/58bbfc96cbba850f6ee805b1ee204d32/What_I_Learned_Building_a_Local_RAG_Agent.png){width=900 height=503}

## A Quick Intro

I recently built a [local RAG agent](https://github.com/vkondi/knowledge-onboarding-agent) that reads a bunch of documents stored as markdown files and lets you ask questions about them in plain English. It goes through all the documents and figures out an answer based on what's actually in them.

## The Architecture

Here's a high-level look at the 5-stage pipeline it uses:

```
Your Markdown Files
       ↓
 [1. INGESTION]    — Reads files, splits into small pieces ("chunks")
       ↓
 [2. EMBEDDINGS]   — Converts each chunk into a list of numbers (a "vector")
                     that captures its *meaning*
       ↓
 [3. STORAGE]      — Saves those vectors to a local database (ChromaDB)
       ↓
 [4. RETRIEVAL]    — When you ask a question, finds the most relevant chunks
       ↓
 [5. ORCHESTRATION] — Feeds those chunks to a local AI model
                      which writes a full answer
```

## Key Concepts I Picked Up

### 1. Ingestion

This is the step where your files get read from disk and broken into small, meaningful pieces called **chunks**, so the AI can make sense of them.

It has 3 parts:

#### Part 1: The Watcher

This watches a folder and triggers an event whenever something changes. A library listens to the OS, and when it detects a file change at the specified path, it fires off an event like one of these:

```
FileEvent(path="notes/docker.md", event_type="created")
FileEvent(path="notes/docker.md", event_type="modified")
FileEvent(path="notes/docker.md", event_type="deleted")
```

#### Part 2: The Parser

This is the reader. It takes raw file content and turns it into clean, usable text.

It does a few useful things:
- Strips all markdown symbols (`**bold**` → bold, `# Heading` → Heading) so the AI gets plain text
- Pulls out any YAML front matter (the `---` metadata block at the top of some files)
- Splits the document into sections by heading level

#### Part 3: The Chunker

This takes each section and cuts it into chunks of roughly 512 words, with a 64-word overlap between consecutive chunks.

Why overlap? Imagine a sentence that falls right at the boundary between two chunks, without overlap, you'd lose that context. With overlap, both chunks carry a little bit of their neighbour's content, so nothing important gets cut off.

#### Ingestion in one line

A folder watcher detects file changes → the parser reads and cleans the text → the chunker slices it into overlapping bite-sized pieces, each tagged for change detection.

---

### 2. Embedding

**Goal:** Take the chunks from the Ingestion phase and attach a vector (a list of numbers) to each one, so it can be stored and searched by *meaning*.

Think of it like a translator, it takes human-readable text and converts it into a mathematical form that the database can actually compare.

It has 2 parts:

#### Part 1: The Embedder

This is the worker at the translation desk. Its one job: take a list of text strings, send them to a locally running embedding model, and get back a list of vectors.

#### Part 2: The Smart Manager

This sits above the Embedder and decides *which* chunks actually need embedding, because embedding is slow and costs compute.

This is what makes repeat runs fast, if you add one new file to a folder with 200 already-indexed files, only the new file's chunks get processed.

#### Embedding flow

```
List[Chunk]  (from Phase 1)
     ↓
ChunkEmbedder.embed_chunks()
     ├── check (content_hash, source_path) against known pairs
     ├── filter to only NEW chunks
     ├── call Embedder  ← in batches
     └── pair each chunk with its vector
     ↓
List[EmbeddedChunk]  (Chunk + vector, ready for storage)
```

#### Embedding in one line

The smart manager skips already-seen chunks and only sends the new ones to the embedder, which calls the local model to produce float vectors, outputting `EmbeddedChunk` objects ready for storage.

---

### 3. Storage

**Goal:** Save the `EmbeddedChunk` objects (text + vectors) to a database so they stick around between sessions and can be searched later.

A special kind of database called a **vector database** is used for this.

Here's what a stored record looks like:

```
| Field         | Example                          |
|---------------|----------------------------------|
| id            | "docker-guide:3"                 |
| vector        | [0.21, -0.83, 0.44, ...]         |
| metadata      | {content, source, hash, index…}  |
```

#### What's in the metadata?

Every stored chunk carries this info alongside its vector:

```json
{
  "content":      "Docker is a platform for running containers...",
  "content_hash": "a3f9c2...",
  "source_path":  "/notes/docker.md",
  "chunk_index":  3,
  "heading":      "What is Docker?",
  "word_count":   87
}
```

#### Storage in one line

The vector database saves each chunk as a (vector + metadata) record on disk, supports fast similarity lookups, and on startup returns a list of already-indexed hashes so nothing gets re-embedded unnecessarily.

---

### 4. Retrieval

**Goal:** When you ask a question, find the most relevant chunks from the database, before handing anything to the AI.

#### How semantic search works

It's a simple two-step process:

**Step 1: Embed the question**

Your question is just text. To compare it against stored vectors, it first needs to be turned into a vector too:

```
"What is Docker?"  →  embed(["What is Docker?"])  →  [0.18, -0.71, ...]
```

**Step 2: Find the closest matches**

That query vector is compared against all stored vectors using cosine similarity to find the top-K closest ones:

```
"These 5 chunks are most similar to your question:"
  → chunk from docker-guide.md    (score: 0.91)
  → chunk from docker-guide.md    (score: 0.87)
  → chunk from rest-api-design.md (score: 0.62)
  ...
```

Each result comes back with a relevance score:

```
RetrievedChunk:
    chunk: Chunk    # full text, source path, metadata
    score: float    # 0.0 → 1.0 — higher = more relevant
```

#### Retrieval in one line

The retriever embeds the user's question into a vector, asks the database for the top-K closest stored chunks by cosine similarity, and returns them scored and sorted, ready for the AI.

---

### 5. Orchestration

**Goal:** Take the relevant chunks from Retrieval and use the LLM to write a real, human-readable answer.

This is the brain of the whole system, where raw retrieved text becomes an intelligent response.

The top-K chunks from the Retrieval phase are passed as context to the language model, which uses them to construct an answer.

The big benefit here is that it reduces hallucination. By giving the AI a focused set of chunks as context, it's nudged to base its answer on your documents rather than making things up from its general training. That said, tuning the `top_k` value matters, too few chunks and the answer is thin, too many and the model can get confused. The sweet spot is somewhere in the middle.

#### Orchestration in one line

The query engine wraps retrieval + LLM together and processes your question into a grounded, context-aware answer.


---

### Wrapping Up

Building this agent taught me more than I expected, not just about RAG, but about how these systems actually *think*.

Each of the 5 stages has a very specific job, and they're all fairly simple on their own. The magic happens when you chain them together. A file changes → it gets chunked → embedded → stored → retrieved → answered.

A few things I'd highlight if you're building something similar:

- **Overlap in chunking matters more than you think.** Without it, you lose context at boundaries and the answers suffer.
- **Deduplication at the embedding stage is a must.** Re-embedding everything on every run is slow and wasteful. Track hashes.
- **Tune your `top_k`.** Too small and the AI doesn't have enough to work with. Too large and it overthinks. Test it with real questions.
- **Local models are surprisingly capable.** You don't always need a cloud API to get useful answers from your own documents.

If you're curious about RAG or local AI, this kind of project is a great starting point, it's small enough to understand fully, but complex enough to teach you the real fundamentals.

