---
title: 'Part 3 Section 1'
tags:
  - blog
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

## Coming Up Next

So far, we've identified the problem:

- Sending every document to an LLM isn't practical.
- Keyword search only matches words.
- Modern AI applications need to search by **meaning**, not just text.

In the next section, we'll answer one of the most important questions in modern AI:

> **What exactly is an embedding, and how does it allow computers to compare the meaning of two pieces of text?**

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/ai-fundamentals/part_3_section_1.md)
