---
title: 'AI Fundamentals — Part 2: Why AI Gets Things Right... and Wrong'
tags:
  - ai
  - fundamentals
  - tutorial
created: 2026-07-03
status: published
---

[⬅️ Back to Blogs](../README.md)

![AI_Fundamentals__Part_2_Why_AI_Gets_Things_Right_and_Wrong](../../assets/blogs/AI_Fundamentals__Part_2_Why_AI_Gets_Things_Right_and_Wrong.png)

# AI Fundamentals — Part 2: Why AI Gets Things Right... and Wrong

In Part 1, we learned how an LLM turns your prompt into a response. It all comes down to predicting one token at a time using the information available in its context window. But that raises another question: if AI is capable of writing code, planning trips, and explaining complex topics, why does it sometimes confidently give completely wrong answers?

To answer that, let's continue building our AI-powered Travel Planner.

---

## Running Example

Our Travel Planner is now live, and a user asks:

> _I'm visiting Tokyo next week. Recommend a famous ramen restaurant that's popular with locals._

The AI replies:

> **Tokyo Dragon Ramen** is one of the city's most popular local restaurants.

The response sounds convincing and highly professional. The only problem? The restaurant does not exist. Why did this happen? Let's find out.

---

# Pretraining: Where the Model Learns Its Knowledge

Before an LLM can answer questions, it goes through a phase called **pretraining**. During pretraining, the model learns patterns from an enormous collection of books, websites, articles, and other publicly available text. It isn't memorizing every sentence; instead, it learns the relationships between words, ideas, facts, and writing styles—similar to a student spending years reading library books before taking an exam. Once this learning phase is complete, the model's knowledge is static and fixed. It does not automatically learn new information every day.

**💡 Developer's Takeaway**

An LLM only knows what it learned during training. It doesn't browse the internet every time you ask a question.

_(Note: While consumer chat applications like Google Gemini or ChatGPT can browse the web, they do so by using an external application wrapper that runs a search engine query behind the scenes, retrieves the results, and feeds that fresh information into the model's prompt. The core LLM itself remains static.)_

---

# Knowledge Cutoff: Why Models Don't Know Everything

Imagine a new observation deck opens in Tokyo tomorrow. If your model was trained last month, it won't know the place exists. This is called the **knowledge cutoff**—the point in time up to which the model has learned information. Anything that happened after that date is entirely missing. This is why questions like "Who won yesterday's match?", "What's today's weather?", or "Has this restaurant recently closed?" cannot be answered accurately by the model alone.

**💡 Developer's Takeaway**

If your application depends on current or frequently changing information, you'll need to provide that information from an external source at runtime rather than relying solely on the model's internal memory.

---

# Hallucinations: When AI Makes Things Up

Instead of saying "I don't know," the model confidently invented **Tokyo Dragon Ramen**. This is known as a **hallucination**—when the model generates information that sounds believable but is incorrect, misleading, or entirely fabricated.

Hallucinations don't happen because the model is trying to deceive you. Remember from Part 1: the model's job is simply to predict the next token. Sometimes, the most statistically likely sequence of tokens forms a statement that simply isn't true. That's why hallucinations sound so convincing—the writing is fluent and the confidence is high, but the facts are completely wrong.

**💡 Developer's Takeaway**

Never assume an LLM's response is factually correct just because it sounds fluent and confident. Always validate important information.

---

# Grounding: Giving the Model Reliable Information

How do we stop our travel planner from inventing restaurants? Instead of relying only on what the model learned during training, we can provide trusted information at runtime. For example, before asking the model to respond, our application retrieves a list of verified restaurants from a travel database.

Now the prompt effectively becomes:

> Here are verified ramen restaurants in Tokyo:
>
> - Ichiran Shibuya
> - Ramen Street (Tokyo Station)
> - Menya Itto
>
> Recommend one that's popular with locals.

Now the model isn't guessing; it's generating an answer based on reliable facts we've supplied. This process is called **grounding**. Grounding means providing the model with relevant, verified information so it can generate responses based on facts instead of assumptions. We'll explore how applications retrieve this information in Part 3.

**💡 Developer's Takeaway**

Grounding is one of the most effective ways to reduce hallucinations in production AI applications.

---

# Prompt Engineering: Helping the Model Help You

Not every poor response is caused by the model itself; sometimes the prompt simply isn't clear enough. Consider these two prompts:

- **Prompt A:** _Recommend places to visit._
- **Prompt B:** _I'm visiting Tokyo for 7 days in October with my family. We enjoy history, local food, and walking tours. Recommend places to visit and explain why each is worth visiting._

The second prompt gives the model far more useful context to tailor its response. This is the essence of **prompt engineering**—the practice of writing prompts that help the model produce better results. It is less about finding "magic words" and more about providing enough context for the model to understand your exact intent.

**💡 Developer's Takeaway**

The quality of the output directly depends on the quality of the input. Clear prompts usually produce clearer, more relevant responses.

---

# System Prompt vs. User Prompt

Most AI applications don't send only the user's message to the model; they also include hidden instructions. For example, our Travel Planner might send:

- **System Prompt:** _You are an expert travel planner. Recommend only verified locations. If you don't know the answer, say so instead of guessing._
- **User Prompt:** _Recommend a ramen restaurant in Tokyo._

The **system prompt** defines the model's role, rules, and behavior, while the **user prompt** contains the user's specific request. The user usually sees only their own prompt, but both are combined in the context window the model receives.

**💡 Developer's Takeaway**

Think of the system prompt as your application's permanent rules and the user prompt as the conversation happening within those rules.

---

# Zero-shot, One-shot, and Few-shot Prompting

Sometimes telling the model what to do isn't enough; showing it an example works even better.

- **Zero-shot Prompting:** You simply ask the model to perform a task without examples (e.g., _"Summarize this itinerary."_).
- **One-shot Prompting:** You provide one example before the task (e.g., _"Input: Two-day trip to Kyoto... Output: Short summary... Now summarize this new itinerary."_).
- **Few-shot Prompting:** You provide several examples before asking the model to complete the task. This helps the model understand the exact format, style, and length you expect.

**💡 Developer's Takeaway**

If the model isn't producing the format you want, showing one or two examples in the prompt is often more effective than writing a longer set of text instructions.

---

# In-context Learning: Learning Without Retraining

Suppose we extend our prompt with three examples of great travel recommendations. The model starts producing responses that resemble those examples. Has it learned something permanently? No. It's simply using the information currently available in its context window.

This behavior is called **in-context learning**. The model adapts its responses based on the examples you provide during the conversation, without changing its underlying parameters. Once the conversation ends, those examples are gone, and the model hasn't been retrained.

**💡 Developer's Takeaway**

Providing examples can dramatically improve responses, but those examples only influence the active request or conversation context.

---

# Bringing It All Together

Let's look at the flow behind the scenes when a user asks our grounded Travel Planner for a ramen recommendation:

1. **User Request:** The user asks for a recommendation.
2. **Grounding:** The application queries a database for verified restaurants and embeds them in the prompt.
3. **Instructions:** The application appends the system prompt and few-shot examples.
4. **Pretraining & Context:** The model uses its pretrained knowledge combined with the runtime context to generate a factual, formatted, and safe response.

This flow explains why two AI applications built on the same model can produce very different results: the difference lies in the quality of the grounding data and instructions.

---

# Recap

In this article, we covered why AI behaves the way it does, detailing:

- Pretraining and the knowledge cutoff.
- Hallucinations and the power of grounding.
- Prompt engineering, system prompts, and few-shot examples.
- In-context learning.

In **Part 3**, we'll explore where this grounding information comes from, detailing embeddings, semantic search, vector databases, chunking, and how techniques like **RAG** and **CAG** help AI retrieve information.

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/ai-fundamentals/AI_Fundamentals__Part_2_Why_AI_Gets_Things_Right_and_Wrong.md)
