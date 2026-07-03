---
title: 'AI Fundamentals — Part 1: From Prompt to Response'
tags:
  - ai
  - fundamentals
  - tutorial
created: 2026-07-03
status: published
---

[⬅️ Back to Blogs](../README.md)

# AI Fundamentals — Part 1

## From Prompt to Response: How an LLM Generates Text

AI is becoming a regular part of software development. Whether you're building chatbots, code assistants, search experiences, or internal tools, you'll come across terms like _tokens_, _context window_, _attention_, and _temperature_.

You don't need to understand the mathematics behind AI models to build AI-powered applications. But understanding these fundamentals will help you make better design decisions, debug unexpected behavior, and follow AI discussions with confidence.

In this series, we'll build that foundation one concept at a time.

---

## Running Example

Throughout this series, we'll use the same application to explain every concept.

Imagine we're building an **AI-powered Travel Planner**.

A user enters the following prompt:

> _I'm visiting Japan for 7 days in October. Create an itinerary with sightseeing, local food, and a day trip to Mount Fuji._

It looks simple enough, but a surprising amount happens before the model generates the first word of its response.

Here's the journey we'll follow in this article.

```text
User Prompt
      │
      ▼
 Tokenization
      │
      ▼
 Context Window
      │
      ▼
 Transformer
      │
      ▼
  Attention
      │
      ▼
Next-token Prediction
      │
      ▼
 Response
```

Let's start from the very beginning.

---

# What Is an LLM?

An **LLM (Large Language Model)** is a machine learning model trained on enormous amounts of text to recognize patterns in language.

Despite the impressive conversations they can have, LLMs aren't databases or search engines. They don't look up answers when you ask a question.

Instead, they generate text by predicting what should come next based on everything they've seen so far.

That single idea is the foundation for understanding modern AI.

> **Mental Model**
>
> An LLM is a very sophisticated **next-word predictor**. Technically, it predicts the next **token**, not the next word—but we'll get to that shortly.

**💡 Developer's Takeaway**

When your AI application responds, it's generating new text—not retrieving a predefined answer.

---

# Prompt: Where Every Conversation Begins

Everything starts with a **prompt**.

A prompt is simply the input you provide to the model.

For our travel planner, the prompt is:

> _I'm visiting Japan for 7 days in October. Create an itinerary with sightseeing, local food, and a day trip to Mount Fuji._

As developers, we usually think of this as a string.

The model doesn't.

Before it can process the prompt, it first converts the text into something it understands.

---

# Tokens: The Language an LLM Understands

Humans read words and sentences.

LLMs read **tokens**.

A token is a small piece of text. Depending on the tokenizer, it could be:

- a complete word
- part of a word
- punctuation
- numbers
- symbols

For example, our prompt might be broken into pieces like this:

```text
I'm | visiting | Japan | for | 7 | days | in | October | ...
```

Or, depending on the model:

```text
I | 'm | visit | ing | Japan | ...
```

The exact split varies between models, but the important point is this:

> **Models never see your original sentence. They only see tokens.**

This is why API pricing, context limits, and usage are almost always measured in **tokens**, not words.

**💡 Developer's Takeaway**

If a provider says your model supports 128K tokens, that doesn't mean 128,000 words. Tokens are usually smaller than words, so the actual amount of text varies.

---

# Tokenization: Breaking Text into Tokens

The process of converting text into tokens is called **tokenization**.

You can think of it as translating human language into the model's native language.

```
User Prompt

"I'm visiting Japan..."

        │

        ▼

Tokenizer

        │

        ▼

[5012, 382, 9182, 71, ...]
```

Internally, models work with numbers, not strings.

Each token maps to a numeric identifier, which is what the model actually processes.

Fortunately, tokenization happens automatically. As developers, we rarely need to perform it ourselves—but understanding that it exists helps explain many AI concepts later in this series.

**💡 Developer's Takeaway**

Tokenization is one reason two models can behave differently even when given the exact same prompt.

---

# Context Window: The Model's Working Memory

Once the prompt has been tokenized, those tokens are placed inside the model's **context window**.

The context window is the amount of information the model can consider while generating its response.

Think of it as the model's working memory for the current conversation.

For our travel planner, the context might include:

- the user's current request
- previous messages
- system instructions
- uploaded travel documents (if any)

Everything inside the context window is available to the model.

Everything outside it effectively doesn't exist.

This explains why long conversations sometimes feel like the AI has forgotten something you mentioned much earlier.

It's often not forgetting.

Those earlier tokens may simply no longer fit within the available context.

**💡 Developer's Takeaway**

Many "memory" issues are actually context window limitations. Managing context efficiently is one of the most important parts of building AI applications.

---

# Transformer Architecture: The Engine Behind Modern LLMs

You've probably heard that modern language models are based on the **Transformer architecture**.

At a beginner level, you don't need to understand the mathematics behind it.

Instead, remember this:

A Transformer is designed to process all tokens in a prompt in parallel, rather than reading them sequentially one-by-one (as older recurrent architectures like RNNs or LSTMs did).

This parallel processing allows the model to analyze the relationships between all parts of the prompt simultaneously and handle significantly larger context windows. It is the primary reason modern AI models are trained on massive datasets and feel dramatically more capable.

One of the key ideas inside the Transformer is **Attention**.

---

# Attention: Focusing on What Matters

Imagine the model is generating the next part of our itinerary.

Which parts of the prompt matter the most?

> _I'm visiting **Japan** for **7 days** in **October**. Create an itinerary with **sightseeing**, **local food**, and a **day trip to Mount Fuji**._

Clearly, some information is much more important than words like _I'm_, _for_, or _in_.

Attention helps the model identify which tokens are most relevant while generating the next token.

You can think of it like reading an email before replying.

You don't give equal importance to every word. Your eyes naturally focus on the important information.

The model does something similar—but mathematically and at a much larger scale.

Without attention, responses would quickly lose context and become far less relevant.

**💡 Developer's Takeaway**

The clearer and more focused your prompt is, the easier it is for the model to identify what's important.

---

# Next-token Prediction: Generating One Token at a Time

Now the model is finally ready to generate a response.

Contrary to how it feels, the model doesn't generate an entire paragraph in one go.

It predicts **one token at a time**.

For example:

```
User:
Create a 7-day itinerary.

↓

Model predicts:

Day

↓

1

↓

:

↓

Arrive

↓

in

↓

Tokyo
```

After generating one token, that new token becomes part of the context.

The model then predicts the next token.

This repeats hundreds or even thousands of times until the response is complete.

Everything—from code generation to poetry to travel plans—is produced this way.

**💡 Developer's Takeaway**

Every response is built incrementally. The model isn't planning the entire paragraph in advance like a human writer.

---

# Parameters: What Do 7B and 70B Mean?

If you've explored open-source models, you've probably seen names like:

- 7B
- 13B
- 70B

The **B** stands for **billion parameters**.

Parameters are internal values the model learns during training.

You can think of them as the knowledge and language patterns stored inside the model.

In general:

- larger models usually know more
- they often reason better
- they require significantly more memory and compute

However, parameter count isn't everything.

A well-trained 8B model can outperform a poorly trained 70B model for many practical tasks.

Model architecture, training data, and optimization all play an important role.

**💡 Developer's Takeaway**

Don't choose a model based only on parameter count. Evaluate it for your specific use case.

---

# Temperature: Controlling Creativity

Suppose our travel planner receives the same prompt twice.

Should it generate the exact same itinerary every time?

Sometimes yes.

Sometimes no.

That's where **temperature** comes in.

Temperature controls how predictable or creative the model's output should be.

With a **low temperature**, you might get:

> Day 1: Arrive in Tokyo and visit Senso-ji Temple.

With a **higher temperature**, you might get:

> Start your journey with an evening food tour through the narrow streets of Omoide Yokocho before exploring Tokyo's hidden jazz cafés.

Neither answer is necessarily better.

They're simply different.

As a general guideline:

- Use **lower temperatures** for coding, documentation, and structured tasks.
- Use **higher temperatures** for brainstorming, storytelling, and creative writing.

**💡 Developer's Takeaway**

Temperature doesn't make a model smarter. It changes how adventurous the generated output is.

---

# Bringing It All Together

Let's revisit our travel planner.

When the user submits this prompt:

> _I'm visiting Japan for 7 days in October. Create an itinerary with sightseeing, local food, and a day trip to Mount Fuji._

Here's what happens behind the scenes:

```
User enters a prompt
          │
          ▼
Text is tokenized
          │
          ▼
Tokens enter the context window
          │
          ▼
The Transformer processes them
          │
          ▼
Attention identifies what's important
          │
          ▼
The model predicts one token
          │
          ▼
Repeats until the response is complete
          │
          ▼
Temperature influences how creative the final response is
```

Every AI application you use today—whether it's a coding assistant, chatbot, or writing tool—follows this same high-level flow.

---

# Recap

In this article, we covered the journey from a user's prompt to the model's response.

We learned:

- What an LLM is
- What prompts are
- Tokens and tokenization
- Context windows
- Transformer architecture
- Attention
- Next-token prediction
- Parameters
- Temperature

These concepts form the foundation for everything else in modern AI.

In **Part 2**, we'll answer another important question:

> **If an LLM can generate such convincing responses, why does it sometimes confidently produce incorrect information?**

We'll explore concepts like **pretraining**, **knowledge cutoff**, **hallucinations**, **prompt engineering**, and **instruction tuning**, and learn why AI behaves the way it does.

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/ai-fundamentals/part_1.md)
