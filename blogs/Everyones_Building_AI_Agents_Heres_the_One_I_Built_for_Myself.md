---
title: "Everyone's Building AI Agents: Here's the One I Built for Myself"
tags:
  - ai-agents
  - artificial-intelligence
  - automation
  - side-project
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/everyones-building-ai-agents-heres-the-one-i-built-for-myself
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/everyones-building-ai-agents-heres-the-one-i-built-for-myself
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md)

![ChatGPT_Image_May_24__2026__12_12_37_AM](uploads/aa9af89f55a317d866632f55303c21f3/ChatGPT_Image_May_24__2026__12_12_37_AM.png){width=900 height=494}

These days, everyone seems to be building AI agents.

So I figured I should probably build one too.

But instead of another generic demo, I wanted to solve a small problem I actually had.

Over time, I had collected a bunch of blog posts and technical notes in a folder. I wanted a quick way to understand them without opening every file one by one.

Questions like:

- What topics do I write about most?
- Do some posts contradict each other?
- Can I create a learning path from my own notes?

Uploading everything to ChatGPT did not feel right.

My content. My machine.

So I built a small local RAG agent.

## How it works

It reads markdown files, understands their meaning, and lets me query across all of them in plain English.

Under the hood, it looks something like this:

```txt id="owj1f9"
Markdown Files
      ↓
Chunking & Parsing
      ↓
nomic-embed-text (via Ollama)
      ↓
ChromaDB (local vector storage)
      ↓
Relevant Context Retrieval
      ↓
Mistral (via Ollama)
      ↓
Answer
```

Everything runs locally on my laptop.

No cloud. No external APIs. Just Python and a few focused tools.

## Where AI Actually Helped

The architecture was clear before I started coding. The “vibe coding” part was mostly using AI to speed up repetitive work like tests, boilerplate, and wiring pieces together.

Idea to working CLI in about a week.

I’ve open sourced the project if you want to take a look:

**Repo:** [Knowledge Onboarding Agent](https://github.com/vkondi/knowledge-onboarding-agent)

## What’s next

Next, I might add PDF support and a lightweight web UI.

Curious to know, have you built something similar recently? If yes, what problem did you solve?

Also curious, if you were building this, would you keep it fully local or use cloud APIs? What would you do differently?

---

![AI Agents](https://img.shields.io/badge/AI_Agents-🧠-purple?style=flat-square) ![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/Everyones_Building_AI_Agents_Heres_the_One_I_Built_for_Myself.md)
