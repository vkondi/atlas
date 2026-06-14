---
title: "Oxlint: JS Linter That's Actually Fast Enough to Matter"
tags:
  - oxlint
  - linter
  - eslint
  - rust
  - tooling
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/oxlint-js-linter-thats-actually-fast-enough-to-matter
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/oxlint-js-linter-thats-actually-fast-enough-to-matter
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md)

![oxlint_jslinter_blog_header](uploads/51962836fd0ff6e4acfbb359f7b3ef51/oxlint_jslinter_blog_header.png){width=900 height=507}

So here's the thing about my last Biome blog post, the comments section(on Reddit) turned into a mini war zone. Not the angry kind, thankfully. More like the curious kind. Everyone wanted to know about Oxlint and how it stacks up against Biome.

Fair enough. Let's talk about it.

## What Even Is Oxlint?

Oxlint is a JavaScript/TypeScript linter written in Rust. It's part of this bigger thing called Oxc (Oxidation Compiler) that Evan You's company VoidZero is building. You know Evan, the guy who made Vue and Vite.

[Reached v1.0 stable in June 2025](https://oxc.rs/blog/2025-06-10-oxlint-stable.html) after about 18 months of development and help from 200+ contributors. It's not some side project anymore, companies like Shopify, Airbnb, Mercedes-Benz, Linear, and Framer are using it in production.

The pitch is simple: ESLint, but way faster. Like, ridiculously faster.

## The Performance Numbers (With Receipts)

Okay, let's get into the benchmarks. I'm pulling these from [Oxc's official benchmark repository](https://github.com/oxc-project/bench-linter) so you can verify this yourself.

### Oxlint vs ESLint vs Biome

**Vue Core codebase (~900 files):**

```
oxlint:     138ms
Biome:      377ms (2.7x slower than Oxlint)
ESLint:     28.6s (207x slower than Oxlint)
```

Yeah, you read that right. ESLint took almost 30 seconds. Oxlint? Under 140 milliseconds.

**Outline repository (larger project):**

```
oxlint:     150ms
Biome:      498ms (3.3x slower than Oxlint)
ESLint:     [They didn't even bother timing it]
```

[According to their official benchmarks page](https://oxc.rs/docs/guide/benchmarks), Oxlint is 50-100x faster than ESLint depending on how many CPU cores you have. The record? **264,925 files linted in 22.5 seconds**, roughly 10,000 files per second.

## Why Is It So Fast?

I know what you're thinking. "Rust is faster than JavaScript", yeah, we get it. But there's more to it.

**Multi-threading:** ESLint runs on a single thread. Oxlint uses all your CPU cores by default. 8-core machine? That's 8x parallelism, no configuration needed.

**Shared parser:** Oxlint and other Oxc tools share the same parser. Your code gets parsed once, then all tools work on the same AST. Compare that to ESLint + Prettier parsing your code twice.

**No plugin overhead:** ESLint loads each plugin separately. Oxlint has all rules built-in. No dependency hell, no initialization overhead.

## Feature Comparison: Oxlint vs Biome

| Feature                  | Oxlint 1.0             | Biome 2.0          |
| ------------------------ | ---------------------- | ------------------ |
| **Speed**                | ~10,000 files/sec      | ~5,000 files/sec   |
| **Built-in rules**       | 670+                   | 250+               |
| **ESLint plugin compat** | Preview (experimental) | None               |
| **Type-aware linting**   | Alpha via tsgolint     | Stable via Biotype |
| **Formatting**           | Yes (oxfmt, alpha)     | Yes (stable)       |
| **Single binary**        | No (separate tools)    | Yes                |
| **Memory efficiency**    | Higher usage           | Lower usage        |

Oxlint is roughly 2x faster than Biome at linting, has way more rules available, and supports some ESLint plugins (experimental). But Biome wins on memory usage and the "one tool does everything" philosophy.

### The Type-Aware Linting Difference

**Biome's approach:** Custom type synthesizer (Biotype) reimplementing TypeScript's type checker in Rust. Single binary, no external dependencies, but every TS edge case must be reimplemented.

**Oxlint's approach:** Uses tsgo (Microsoft's Go port of TypeScript) via tsgolint. 100% TypeScript compatibility, all 40+ typescript-eslint rules, but requires two binaries and is still alpha.

Evan You [said it best](https://oxc.rs/blog/2025-12-08-type-aware-alpha): _"Biome's type-aware linting cannot guarantee full coverage or behavior alignment with official TS."_

Biome's approach is more mature right now. Oxlint's tsgolint is still alpha. Pick your tradeoff.

## Migration: How Hard Is It Really?

### Option 1: Full Replace

**Best for:** Small to medium projects, greenfield codebases

```bash
npm install -D oxlint
npx @oxlint/migrate  # Auto-migrate ESLint config
npx oxlint
```

**Trade-offs:** 50-100x faster, simple config, but you might lose niche ESLint rules and custom plugins won't work yet.

### Option 2: Parallel Approach (Recommended)

**Best for:** Large codebases, teams with heavy ESLint customization

This is what Mercedes-Benz did.

```bash
npm install -D oxlint eslint-plugin-oxlint
```

```javascript
// eslint.config.js
import oxlint from 'eslint-plugin-oxlint';

export default [
  ...yourExistingConfig,
  oxlint.configs['flat/recommended'], // Prevents duplicate errors
];
```

```json
"lint": "oxlint && eslint ."
```

Oxlint runs first (fast feedback <1s), ESLint catches what Oxlint missed. You get speed AND comprehensive coverage.

**Note on type-aware linting:** Oxlint's `--type-aware` flag (via `oxlint-tsgolint`) is still alpha. Unless you're okay with experimental software, keep typescript-eslint for now.

## Common Pitfalls

**Missing rules aren't obvious:** Oxlint silently skips unsupported rules. Run both linters in parallel initially to catch gaps.

**Custom ESLint plugins:** JavaScript plugin support is [in preview](https://oxc.rs/blog/2025-10-09-oxlint-js-plugins.html) but not production-ready. Keep ESLint for custom rules.

**Type-aware linting is alpha:** Memory usage can spike, bugs exist. Stick with ESLint for type-aware rules until tsgolint stabilizes.

## When Should You Actually Use Oxlint?

**Choose Oxlint if:**

- You need maximum speed (2x faster than Biome, 50-100x faster than ESLint)
- You want gradual migration (run alongside ESLint)
- You need broad rule coverage (670+ rules)
- You're in the Vite/Vue ecosystem (same team, shared tooling)

**Don't choose Oxlint if:**

- You need stable type-aware linting today (use Biome or ESLint)
- You rely heavily on custom ESLint plugins (experimental support)
- You want one unified tool (Biome does linting + formatting)
- You're risk-averse about tooling changes (ESLint is 13 years old, battle-tested)

## The Honest Take

ESLint and Prettier have been amazing. They've served us well for over a decade. But they're built on JavaScript running in a single thread, and there's only so fast you can make that.

Biome proved that Rust-based tooling could work. Oxlint is pushing even harder on speed and ESLint compatibility.

**Should you switch today?**

If you're starting a new project and want to live on the edge, go full Oxlint. Just know you're an early adopter.

The best tool is the one that solves your actual problem. Run the benchmarks on your codebase. Check if it covers your rules. Then decide.

---

**Next up:** [Part 2 where we'll dig into Oxfmt](./Oxfmt_The_Prettier_Compatible_Formatter_Thats_30x_Faster.md) (the formatter) and how it compares to Prettier and Biome. Spoiler: it's fast. Really fast.

**Try it yourself:**

- [Oxlint docs](https://oxc.rs/docs/guide/usage/linter)
- [Official benchmarks](https://github.com/oxc-project/bench-linter)

**Got questions? Benchmarks from your codebase?** Drop them in the comments. I actually read them (clearly, since that's why this post exists).

---

![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white) ![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white) ![Tooling](https://img.shields.io/badge/Tooling-🔧-grey?style=flat-square) ![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/Oxlint_JS_Linter_Thats_Actually_Fast_Enough_to_Matter.md)
