---
title: 'Biome: Replace ESLint & Prettier With One Tool'
tags:
  - biome
  - eslint
  - prettier
  - linter
  - formatter
  - tooling
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/biome-replace-eslint-prettier-with-one-tool
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/biome-replace-eslint-prettier-with-one-tool
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md)

![bionme-blog-header](uploads/3fb4cff0b9995a8bd2bea4fa04e94dd4/bionme-blog-header.png){width=768 height=432}

If you've spent any time in the JavaScript ecosystem, you know the drill: install ESLint, configure it, install Prettier, configure it, make them play nice together, figure out why they're fighting, and then do it all over again every new project. It's exhausting.

Biome is an attempt to fix that.

---

## What Is Biome?

[Biome](https://biomejs.dev/) is a fast, all-in-one toolchain for web projects. It handles formatting and linting — the two things most JS/TS devs reach for ESLint and Prettier to do — in a single tool, written in Rust.

The short pitch: run one command, get your code formatted _and_ linted, no plugin wrangling required.

It supports JavaScript, TypeScript, JSX, TSX, JSON, CSS, GraphQL, and HTML out of the box. No extra packages needed for any of those.

Biome started as a fork of Rome (which is now archived), but it's been actively developed since and has diverged quite a bit. More on that in a moment.

---

## How Does It Compare?

### vs. Prettier

Prettier is the go-to formatter for most JS projects. It works well, but it's slow on large codebases and offers almost no configuration by design (which can be a plus or a minus depending on who you ask).

Biome's formatter is **~35x faster than Prettier** when formatting large codebases. It also scores 97% compatibility with Prettier's output, so switching is mostly painless. The small differences are mostly edge cases you probably won't hit day-to-day.

One practical win: Biome can format malformed or incomplete code too. Prettier will just bail out. That matters if you want format-on-save to work mid-edit.

### vs. ESLint

ESLint is incredibly powerful and flexible — and that's also its biggest downside. Configuring ESLint from scratch, especially with TypeScript support, plugins like `eslint-plugin-react` or `@typescript-eslint`, and making it all play together, takes time and breaks silently.

Biome ships with 434 lint rules covering JavaScript, TypeScript, JSX, CSS, and GraphQL. A meaningful chunk of those come from ESLint and typescript-eslint directly. You don't need to install separate plugins to get them.

That said, ESLint's plugin ecosystem is massive. If you rely on niche plugins (custom framework rules, accessibility plugins, etc.), Biome might not cover all of them yet.

### vs. Rome

Rome was the original vision for a unified JS toolchain. Development stalled, the project was archived, and Biome was forked from it in 2023 by former contributors. Biome is actively maintained, has a growing community, and is used in production by companies like Cloudflare, Vercel, Canonical, and Discord.

If you were waiting on Rome, Biome is essentially what that promised to be.

---

## Getting Started

Install it:

```bash
npm install --save-dev --save-exact @biomejs/biome
```

Initialize a config file:

```bash
npx @biomejs/biome init
```

This creates a `biome.json` in your project root. The defaults are sensible — you don't _have_ to touch it.

### Format your code

```bash
npx @biomejs/biome format --write ./src
```

### Lint your code

```bash
npx @biomejs/biome lint --write ./src
```

### Or do both at once

```bash
npx @biomejs/biome check --write ./src
```

That's it. No plugins, no peer dependency conflicts, no `.eslintignore` + `.prettierignore` duplication.

### What the config looks like

A minimal `biome.json` might look like this:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

Compare that to a typical ESLint + Prettier + TypeScript setup with separate config files, `.prettierrc`, `eslint.config.js`, and a handful of `devDependencies`. The difference in cognitive overhead is real.

### Error output is actually readable

One thing worth calling out: Biome's diagnostics are genuinely good. Here's an example of what a lint error looks like:

```js
// ✖ Biome lint warning: lint/complexity/useFlatMap
// The call chain .map().flat() can be replaced with .flatMap()

// Before
array.map((sentence) => sentence.split(' ')).flat();

// After (safe fix)
array.flatMap((sentence) => sentence.split(' '));
```

It tells you what's wrong, where it is, why it matters, and shows you the fix. Most ESLint errors don't do that — you often end up Googling the rule name to understand what it actually wants.

---

## Editor Integration

Biome has first-party extensions for VS Code, Zed, IntelliJ, Neovim, and Helix. Format-on-save works out of the box after installing the extension and pointing it to your project's `biome.json`.

If your team uses VS Code, you can commit a `.vscode/settings.json` that sets Biome as the default formatter, so everyone's on the same setup automatically.

---

## When Should You Use Biome?

Biome is a great fit if:

- You're starting a new JS/TS project and want formatting + linting without a bunch of config overhead
- Your team spends more time configuring tools than writing code
- You work with large codebases where Prettier's speed is noticeable in CI
- You want consistent tooling without bikeshedding over ESLint plugin choices

It's probably _not_ the right fit yet if:

- You rely heavily on niche ESLint plugins (think `eslint-plugin-jsx-a11y`, framework-specific rules, etc.) that Biome doesn't have equivalents for
- Your team has a deeply customized ESLint config that took months to get right and works well

---

## Bottom Line

Biome isn't trying to replace ESLint for every use case. But for a lot of standard JS/TS projects, it covers 90%+ of what you actually need from ESLint and Prettier combined — and it does it faster, with less config, and with better error output.

If you find yourself re-doing the ESLint + Prettier setup dance on every new project, it's worth giving Biome a shot. Run `npx @biomejs/biome init` in your next project and see how far the defaults get you.

Chances are, pretty far.

---

![Biome](https://img.shields.io/badge/Biome-E85D44?style=flat-square&logo=biome&logoColor=white) ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white) ![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=flat-square&logo=prettier&logoColor=black) ![Tooling](https://img.shields.io/badge/Tooling-🔧-grey?style=flat-square) ![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/Biome_Replace_ESLint__Prettier_With_One_Tool.md)
