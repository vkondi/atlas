---
title: 'Part 2'
tags:
  - career
  - development
  - industry-trends
created: 2026-07-03
status: published
---

[⬅️ Back to Blogs](../README.md)

# AI Fundamentals — Part 2

## Why AI Gets Things Right... and Wrong

In Part 1, we learned how an LLM turns your prompt into a response. It all comes down to predicting one token at a time using the information available in its context window.

But that raises another question.

If AI is capable of writing code, planning trips, and explaining complex topics, why does it sometimes confidently give completely wrong answers?

To answer that, let's continue building our AI-powered Travel Planner.

---

## Running Example

Our Travel Planner is now live, and a user asks:

> _I'm visiting Tokyo next week. Recommend a famous ramen restaurant that's popular with locals._

The AI replies:

> **Tokyo Dragon Ramen** is one of the city's most popular local restaurants.

The response sounds convincing.

The only problem?

The restaurant doesn't exist.

Why did that happen?

Let's find out.

---

# Pretraining: Where the Model Learns Its Knowledge

Before an LLM can answer questions, it goes through a phase called **pretraining**.

During pretraining, the model learns patterns from an enormous collection of books, websites, articles, and other publicly available text.

It isn't memorizing every sentence.

Instead, it learns relationships between words, ideas, facts, and writing styles.

You can think of pretraining as a student spending years reading books before taking an exam.

Once that learning phase is complete, the model's knowledge is largely fixed.

It doesn't automatically learn new information every day.

**💡 Developer's Takeaway**

An LLM only knows what it learned during training. It doesn't browse the internet every time you ask a question.

---

# Knowledge Cutoff: Why Models Don't Know Everything

Imagine a new observation deck opens in Tokyo tomorrow.

If your model was trained before that date, it won't know the place exists.

This is called the **knowledge cutoff**.

A knowledge cutoff is simply the point in time up to which the model has learned information.

Anything that happened after that may be missing.

This is why questions like:

- "Who won yesterday's match?"
- "What's today's weather?"
- "Has this restaurant recently closed?"

can't always be answered accurately by the model alone.

**💡 Developer's Takeaway**

If your application depends on current or frequently changing information, you'll need to provide that information from an external source rather than relying solely on the model.

---

# Hallucinations: When AI Makes Things Up

Let's return to our travel planner.

Instead of saying:

> "I don't know."

the model confidently invented **Tokyo Dragon Ramen**.

This is known as a **hallucination**.

A hallucination occurs when the model generates information that sounds believable but is incorrect, misleading, or entirely fabricated.

Hallucinations don't happen because the model is trying to deceive you.

Remember what we learned in Part 1.

The model's job is to predict the next token.

Sometimes, the most statistically likely sequence of tokens forms a statement that simply isn't true.

That's why hallucinations often sound convincing.

The writing is fluent.

The confidence is high.

The facts may be wrong.

**💡 Developer's Takeaway**

Never assume an LLM's response is factually correct just because it sounds confident. Always validate important information.

---

# Grounding: Giving the Model Reliable Information

How do we stop our travel planner from inventing restaurants?

Instead of relying only on what the model learned during training, we can provide trusted information at runtime.

For example, before asking the model to respond, our application retrieves a list of verified restaurants from a travel database.

Now the prompt effectively becomes:

> Here are verified ramen restaurants in Tokyo:
>
> - Ichiran Shibuya
> - Ramen Street (Tokyo Station)
> - Menya Itto
>
> Recommend one that's popular with locals.

Now the model isn't guessing.

It's generating an answer based on reliable information we've supplied.

This process is called **grounding**.

Grounding means giving the model relevant information so it can generate responses based on facts instead of assumptions.

We'll explore how applications retrieve this information in Part 3.

**💡 Developer's Takeaway**

Grounding is one of the most effective ways to reduce hallucinations in production AI applications.

---

# Prompt Engineering: Helping the Model Help You

Not every poor response is caused by the model.

Sometimes the prompt simply isn't clear enough.

Consider these two prompts.

**Prompt A**

> Recommend places to visit.

**Prompt B**

> I'm visiting Tokyo for 7 days in October with my family. We enjoy history, local food, and walking tours. Recommend places to visit and explain why each is worth visiting.

Which one gives the model more useful context?

Almost certainly the second.

This is the essence of **prompt engineering**.

Prompt engineering is the practice of writing prompts that help the model produce better results.

It's less about finding "magic words" and more about providing enough context for the model to understand your intent.

**💡 Developer's Takeaway**

The quality of the output often depends on the quality of the input. Clear prompts usually produce clearer responses.

---

# System Prompt vs. User Prompt

Most AI applications don't send only the user's message to the model.

They also include hidden instructions.

For example, our Travel Planner might always send:

**System Prompt**

> You are an expert travel planner. Recommend only verified locations. If you don't know the answer, say so instead of guessing.

Then it appends the user's request:

**User Prompt**

> Recommend a ramen restaurant in Tokyo.

The **system prompt** defines the model's role and behavior.

The **user prompt** contains the user's request.

The user usually sees only their own prompt, but both are part of the context the model receives.

**💡 Developer's Takeaway**

Think of the system prompt as your application's permanent instructions and the user prompt as the conversation happening within those rules.

---

# Zero-shot, One-shot, and Few-shot Prompting

Sometimes telling the model what to do isn't enough.

Showing it an example works even better.

### Zero-shot Prompting

You simply ask the model to perform a task.

> Summarize this itinerary.

No examples are provided.

---

### One-shot Prompting

You provide one example.

> Example:
>
> **Input:** Two-day trip to Kyoto...
>
> **Output:** Short summary...
>
> Now summarize this itinerary.

---

### Few-shot Prompting

You provide several examples before asking the model to complete a similar task.

This helps the model understand the format and style you're expecting.

**💡 Developer's Takeaway**

If the model isn't producing the format you want, showing one or two examples is often more effective than writing a longer prompt.

---

# In-context Learning: Learning Without Retraining

Suppose we extend our prompt like this:

> Here are three examples of great travel recommendations.
>
> _(Example 1...)_
>
> _(Example 2...)_
>
> _(Example 3...)_
>
> Now recommend an itinerary for Tokyo.

The model starts producing responses that resemble the examples.

Has it learned something permanently?

No.

It's simply using the information currently available in its context window.

This behavior is called **in-context learning**.

The model adapts its responses based on the examples you provide during the conversation, without changing its underlying parameters.

Once the conversation ends, those examples are gone.

The model hasn't been retrained.

**💡 Developer's Takeaway**

Providing examples can dramatically improve responses, but those examples only influence the current request or conversation.

---

# Bringing It All Together

Let's revisit our Travel Planner.

The user asks:

> Recommend a famous ramen restaurant in Tokyo.

Here's what can happen behind the scenes.

```text
User asks a question
          │
          ▼
Model uses knowledge from pretraining
          │
          ▼
If the information is outdated or missing...
          │
          ▼
It may hallucinate
          │
          ▼
Application provides trusted restaurant data
          │
          ▼
Grounded response is generated
          │
          ▼
Prompt examples and system instructions help improve quality
```

Understanding this flow explains why two AI applications built on the same model can produce very different results.

Often, the difference isn't the model itself.

It's the quality of the information and instructions provided to it.

---

# Recap

In this article, we explored why AI behaves the way it does.

We covered:

- Pretraining
- Knowledge Cutoff
- Hallucinations
- Grounding
- Prompt Engineering
- System Prompt vs. User Prompt
- Zero-shot, One-shot, and Few-shot Prompting
- In-context Learning

These concepts explain many of the strengths and limitations you'll encounter when working with modern AI applications.

In **Part 3**, we'll answer the next logical question:

> **If grounding makes AI more reliable, where does that information come from?**

We'll explore embeddings, semantic search, vector databases, chunking, and see how techniques like **RAG** and **CAG** help AI retrieve information it was never originally trained on.

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/ai-fundamentals/part_2.md)
