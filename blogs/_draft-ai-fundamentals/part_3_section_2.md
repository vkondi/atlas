---
title: 'Part 3 Section 2'
tags:
  - blog
created: 2026-07-03
status: published
---

[⬅️ Back to Blogs](../README.md)

# (Continued)

# Embeddings: Turning Meaning into Numbers

We ended the previous section with an important question.

Computers don't understand language the way humans do.

So how can they tell that these two sentences are talking about almost the same thing?

> **Find vegetarian ramen near Tokyo Station.**

and

> **Recommend meat-free noodle restaurants close to Tokyo Station.**

The wording is different.

But most people would agree that they're asking for nearly the same thing.

To make that comparison possible, AI first converts text into something computers can work with.

Those numerical representations are called **embeddings**.

---

## What Is an Embedding?

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

That's the real power of semantic search.

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

# Bringing It Back to Our Travel Planner

Let's revisit the journey so far.

The user asks:

> _Where can I find meat-free noodles near Tokyo Station?_

Here's what happens behind the scenes.

```text
User Question
        │
        ▼
Generate Embedding
        │
        ▼
Compare against stored document embeddings
        │
        ▼
Find the most semantically similar passages
```

We're getting much closer to solving our original problem.

But we're still missing two important pieces.

First...

How do we generate embeddings for an entire 500-page travel guide?

And second...

Where do we store thousands—or even millions—of those embeddings so they can be searched efficiently?

We'll answer both questions in the next section, where we'll introduce **chunking** and **vector databases**.

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/ai-fundamentals/part_3_section_2.md)
