---
title: 'AI Fundamentals — Part 3: Giving AI Knowledge Beyond Its Training'
tags:
  - ai
  - fundamentals
  - tutorial
created: 2026-07-03
status: published
---

[⬅️ Back to Blogs](../README.md)

# AI Fundamentals — Part 3

## Giving AI Knowledge Beyond Its Training

In Part 2, we learned why AI sometimes hallucinates.

One of the biggest reasons is that an LLM can only answer based on:

- what it learned during training, and
- the information available in its context window.

We also introduced the idea of **grounding**—providing the model with reliable information at runtime instead of expecting it to know everything.

But that raises an important question.

> **Where does that information come from?**

Modern AI applications don't simply dump an entire database or a thousand-page PDF into the prompt. Instead, they first identify the _most relevant_ pieces of information and only send those to the model.

In this article, we'll learn how that works.

---

## Running Example

Let's continue building our **AI-powered Travel Planner**.

So far, it can answer general travel questions using the knowledge it learned during training.

Now we want to make it much smarter.

We upload several documents into our application:

- Lonely Planet's Japan travel guide
- A PDF containing train schedules
- A document listing recommended local restaurants
- Hotel information
- Internal travel policies for our company

Together, these documents contain hundreds of pages.

Now the user asks:

> _I'm staying near Tokyo Station. Which ramen restaurant from our travel guide is within walking distance and is known for vegetarian options?_

Somewhere in those hundreds of pages is the answer.

The challenge is no longer generating text.

It's **finding the right information first.**

---

# The Problem: An LLM Can't Read Your Entire Knowledge Base Every Time

A common misconception is that AI applications simply send all their documents to the model.

Imagine our travel guide contains:

- 450 pages
- thousands of restaurant listings
- hotel descriptions
- transportation details
- sightseeing recommendations

Now imagine sending all of that to the LLM every time someone asks:

> _Where should I eat tonight?_

That would create several problems.

First, many documents are simply too large to fit inside the model's context window.

Second, even if they did fit, we'd be making the model read hundreds of irrelevant pages just to answer a simple question.

That's expensive, slow, and inefficient.

Instead, we want to send **only the information that matters**.

The question becomes:

> **How do we find the right few paragraphs from hundreds of pages?**

Your first instinct might be...

> "Why not just search the documents?"

That's exactly what we'll explore next.

---

# Keyword Search: The Traditional Approach

Before AI became popular, most applications relied on **keyword search**.

The idea is simple.

The user searches for a word.

The application finds documents containing that word.

For example:

**Travel Guide**

```
Tokyo has several excellent vegetarian ramen restaurants...

Mount Fuji is one of Japan's most iconic landmarks...

The Shinkansen connects Tokyo and Kyoto...
```

User searches:

> vegetarian ramen

The search engine finds the paragraph because it contains both words.

Simple.

Fast.

Easy to understand.

So what's the problem?

---

## When Keyword Search Falls Short

Let's look at a few examples.

### Example 1

User asks:

> _Where can I eat meat-free ramen?_

Our document says:

> Vegetarian ramen is available near Tokyo Station.

A traditional keyword search may completely miss this result because it searches for **exact words**, not meaning.

It doesn't know that:

- meat-free
- vegetarian
- vegan-friendly (sometimes)
- plant-based

are closely related concepts.

---

### Example 2

User asks:

> _Suggest a place near Fujisan._

The document says:

> A day trip to Mount Fuji is highly recommended.

Again, a keyword search might fail.

Humans immediately understand that **Fujisan** and **Mount Fuji** refer to the same place.

A keyword search often doesn't.

---

### Example 3

User asks:

> _Where can I find authentic local noodle shops?_

The guide says:

> Several ramen restaurants popular with residents...

A human easily connects:

- noodle shop
- ramen restaurant

A keyword search usually doesn't.

---

## The Real Limitation

Keyword search compares **text**.

Humans compare **meaning**.

That's a huge difference.

Imagine asking two people:

> "Which restaurant serves meat-free ramen?"

One person understands that you're looking for vegetarian options.

A traditional search engine simply looks for matching words.

This is why search systems often return dozens of irrelevant results—or miss the best result entirely.

As developers, we've all experienced this.

You've searched documentation using one word...

...only to discover the answer used completely different terminology.

---

# Semantic Search: Searching by Meaning

This is where AI changes everything.

Instead of asking:

> **"Does this document contain the same words?"**

Semantic search asks:

> **"Does this document mean the same thing?"**

That's a subtle but incredibly important difference.

Let's revisit our example.

The user asks:

> _Where can I eat meat-free ramen near Tokyo Station?_

The travel guide says:

> Ichiran offers vegetarian ramen a short walk from Tokyo Station.

A semantic search understands that:

- meat-free
- vegetarian

express nearly the same idea.

Even though the exact words are different, it can still identify the correct passage.

This makes AI-powered search dramatically more useful than traditional keyword matching.

But this leads to another question.

Computers don't naturally understand _meaning_.

They understand numbers.

So how can a computer determine that _vegetarian_ and _meat-free_ are closely related?

That's where **embeddings** come in.

---

# Embeddings: Turning Meaning into Numbers

An **embedding** is a numerical representation of text that captures its meaning.

Think of it as a fingerprint—not of the exact words, but of what those words represent.

For example, these three phrases:

- Vegetarian ramen
- Meat-free noodles
- Plant-based ramen

all have different wording.

But because they express similar ideas, their embeddings end up being very similar.

On the other hand:

- Mount Fuji
- Flight booking
- Currency exchange

would produce embeddings that are quite different because they represent different concepts.

The important thing to remember is:

> **Embeddings represent meaning, not exact wording.**

---

## Why Not Compare the Original Text?

Let's go back to our Travel Planner.

Suppose our travel guide contains this sentence:

> _Ichiran offers vegetarian ramen near Tokyo Station._

Now imagine two different users.

**User A**

> Recommend vegetarian ramen.

**User B**

> Where can I find meat-free noodle restaurants?

As humans, we immediately understand that both users are looking for almost the same thing.

A computer comparing plain text sees something very different.

```text
Vegetarian ramen

vs

Meat-free noodle restaurants
```

Very few words match.

A keyword search might decide they're unrelated.

Embeddings solve this problem by converting both pieces of text into numerical representations where similar meanings end up close together.

---

# Semantic Similarity: Measuring Meaning Instead of Words

Once everything has been converted into embeddings, comparing two sentences becomes much easier.

Instead of asking:

> **Do these sentences contain the same words?**

we ask:

> **How similar are their embeddings?**

If two embeddings are close together, they're likely talking about similar ideas.

If they're far apart, they're probably unrelated.

You don't need to understand the underlying mathematics to use this concept effectively.

A useful mental model is to imagine every sentence placed on a giant map.

Similar ideas appear close together.

Different ideas are placed farther apart.

For example:

```text
                  Travel

                      ●
                Visit Japan

           ●                   ●
  Vegetarian Ramen      Tokyo Station

                ●
         Meat-free Noodles


--------------------------------------------


                      ●
              JavaScript Closures

                                ●
            Docker Networking
```

Notice how the travel-related concepts naturally cluster together, while completely unrelated software concepts appear elsewhere.

This is exactly what embeddings help achieve.

---

# Cosine Similarity: Finding the Closest Match

Now that every sentence has an embedding, we need a way to compare them.

One of the most common techniques is **cosine similarity**.

Despite the intimidating name, the idea is surprisingly simple.

Imagine asking someone:

> Which of these restaurants best matches what the user is looking for?

Instead of comparing words, we compare embeddings.

Suppose our Travel Planner has these restaurant descriptions stored.

```text
A
Vegetarian ramen near Tokyo Station.

B
Traditional sushi restaurant.

C
Italian pizza in Osaka.
```

The user asks:

> Meat-free noodles near Tokyo Station.

The embeddings might compare like this:

| Restaurant                          | Similarity |
| ----------------------------------- | ---------: |
| Vegetarian ramen near Tokyo Station |   **0.96** |
| Traditional sushi restaurant        |       0.41 |
| Italian pizza in Osaka              |       0.09 |

The higher the score, the closer the meanings.

Notice something interesting.

The user never mentioned the word **vegetarian**.

Yet Restaurant A is still identified as the best match because the _meaning_ is similar.

---

## A Useful Mental Model

Imagine a library.

Traditional keyword search works like this:

> "Find every book containing the word _ramen_."

Semantic search works differently.

It asks:

> "Find books discussing the same idea, even if they use different words."

That's why semantic search often feels much more intelligent.

It's no longer matching text.

It's matching meaning.

---

# Where Do These Embeddings Come From?

At this point, you might be wondering:

> "Do I have to generate these numbers myself?"

Fortunately, no.

Just as LLMs specialize in generating text, there are **embedding models** that specialize in generating embeddings.

Instead of producing a paragraph, an embedding model produces a list of numbers representing the meaning of the input.

For example:

```text
Input

Vegetarian ramen near Tokyo Station

        │

        ▼

Embedding Model

        │

        ▼

[0.18, -0.42, 0.91, ...]
```

The actual embedding usually contains hundreds or even thousands of numbers.

You never need to interpret them yourself.

Their only purpose is to make semantic comparison possible.

Many modern AI platforms provide dedicated embedding models alongside their language models.

---

# Chunking: Breaking Large Documents into Pieces

How do we generate embeddings for a 500-page travel guide? We don't feed the entire book into the embedding model at once.

Embedding models have strict input limit constraints (typically measured in tokens), and comparing a whole book's meaning is too vague to be useful. If a user asks about a specific ramen restaurant, we want to retrieve the exact paragraph discussing it, not a 500-page book embedding.

So, we break the document down into smaller, logical pieces. This process is called **chunking**.

A chunk could be:

- A single paragraph
- A section of 100-200 words
- A sliding window of text (e.g., 200 words with a 20-word overlap to ensure context isn't cut off at boundaries)

> **Mental Model**
>
> Think of chunking like cutting a long movie reel into short, thematic scenes. If you want to find the scene with Mount Fuji, it is much easier to search and index short clips than searching the entire three-hour film.

**💡 Developer's Takeaway**

Choosing the right chunk size is a balancing act. If chunks are too small, they might lose context (e.g., a sentence saying _"It is delicious"_ without mentioning _what_ is delicious). If they're too large, the specific details get averaged out, and search accuracy drops.

---

# Vector Databases: Storing and Indexing Meanings

Once we have broken our travel guide into thousands of chunks and generated an embedding for each, we need a place to store them.

Traditional databases (like PostgreSQL or MySQL) are optimized for finding exact matches like numbers, dates, or strings. They aren't designed to compare thousands of high-dimensional lists of numbers to find which ones are "closest" in meaning.

That's where **Vector Databases** come in.

A vector database is designed specifically to store and index high-dimensional vectors (embeddings) and search through them based on mathematical similarity (like cosine similarity) extremely fast.

Common vector database setups include:

- Dedicated vector databases (Pinecone, Milvus, Qdrant, Chroma)
- Vector extensions for traditional databases (like `pgvector` for PostgreSQL)

**💡 Developer's Takeaway**

You don't need to write complex search algorithms yourself. A vector database handles the indexing and allows you to query it using an embedding, returning the most semantically similar chunks in milliseconds.

---

# Embedding Dimensions: Understanding the Scale

When you configure a vector database, it will ask you to specify the number of **dimensions**.

Dimensions refer to the size of the list of numbers generated by the embedding model. For example:

- A lightweight model might output vectors with **384** dimensions.
- A standard model (like OpenAI's `text-embedding-3-small`) outputs **1536** dimensions.
- Large models can output **3072** dimensions or more.

Each dimension represents a different abstract feature of meaning that the model learned during training. You don't need to know what each dimension represents—the database only cares that you are comparing vectors of the exact same size.

**💡 Developer's Takeaway**

An embedding model and a vector database must match: you cannot store a 1536-dimension embedding in a database index configured for 384 dimensions.

---

# RAG (Retrieval-Augmented Generation): Putting It Together

Now we have all the pieces to solve our Travel Planner's original challenge: answering questions using our travel guides without sending the entire book to the LLM.

We use a pattern called **RAG (Retrieval-Augmented Generation)**.

RAG combines **Retrieval** (finding relevant chunks from our vector database) and **Generation** (having the LLM write a response using those chunks).

Here is the step-by-step workflow:

1. **Ingestion (Happens once in advance):**
   - Break documents into chunks.
   - Generate embeddings for each chunk.
   - Store the chunks and their embeddings in a vector database.

2. **Querying (Happens at runtime):**
   - User asks: _"Recommend a vegetarian ramen shop near Tokyo Station."_
   - The application generates an embedding for the user's question.
   - The application queries the vector database using this question embedding.
   - The database returns the top 2 or 3 most similar text chunks.
   - The application merges the user's question and the retrieved chunks into a single prompt (grounding context).
   - The LLM reads the context and generates a correct, verified answer.

```text
               User Question
                     │
                     ▼
             Generate Embedding
                     │
                     ▼
    Query Vector DB ──► Stored Chunks
                     │
                     ▼
            Get Relevant Chunks
                     │
                     ▼
    Build Prompt (Question + Chunks)
                     │
                     ▼
             LLM Generates Text
                     │
                     ▼
             Grounded Response
```

**💡 Developer's Takeaway**

RAG is the most popular way to connect proprietary data to LLMs. It ensures the model's response is grounded in facts, reduces hallucinations, and works without needing to retrain the model.

---

# CAG (Cache-Augmented Generation): The New Alternative

While RAG is powerful, it requires setting up chunking pipelines, embedding models, and vector databases. This can be complex.

With modern LLMs having massive context windows (often supporting 1 million to 2 million tokens), another approach has emerged: **CAG (Cache-Augmented Generation)**.

Instead of retrieving matching chunks at runtime, CAG preloads the entire document set (e.g., our 500-page travel guide) directly into the model's context window.

How is this fast or affordable? It leverages **KV (Key-Value) Caching**.
The system precomputes and caches the mathematical states of the travel guide once. When a user asks a question, the LLM reads the cached documents instantly, bypasses the retrieval pipeline entirely, and generates a response.

- **RAG** is like looking up a topic in a library catalog, retrieving three specific books, and reading them to find the answer.
- **CAG** is like having the entire encyclopedia already open on your desk with the pages instantly readable.

**💡 Developer's Takeaway**

CAG simplifies the architecture by eliminating vector databases and chunking. However, it is limited by the size of the context window and is best suited for relatively static datasets that fit comfortably within the model's limit. RAG remains essential for massive or constantly changing data.

---

# Recap

In this article, we explored how to give AI knowledge beyond its training. We covered:

- Keyword Search vs. Semantic Search
- Embeddings
- Semantic Similarity and Cosine Similarity
- Chunking
- Vector Databases
- Embedding Dimensions
- RAG (Retrieval-Augmented Generation)
- CAG (Cache-Augmented Generation)

In **Part 4**, we will answer the next logical question:

> **How do we connect our model to the outside world so it can execute tasks, use external APIs, and remember users over time?**

We will explore tool calling, memory, Model Context Protocol (MCP), and AI agents.

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/ai-fundamentals/part_3.md)
