---
title: "I Published My First npm CLI Tool"
tags:
  - npm
  - cli
  - open-source
  - javascript
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/i-published-my-first-npm-cli-tool
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/i-published-my-first-npm-cli-tool
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md)

![my_first_npm_cli_tool](uploads/bab46387f3a939f7c78e3e5a1afb7412/my_first_npm_cli_tool.png){width=900 height=406}

Hey folks! 👋

Let me tell you about **[create-scaffold-kit](https://www.npmjs.com/package/create-scaffold-kit)** — what it does, and my experience shipping it for the first time.

---

### Why does this exist?

Every new project I start begins the same way:

ESLint. Prettier. Husky. Docker. CI.

An hour gone before I even write real code.



It’s tedious and honestly, it’s the same copy-paste every time.

So the question became, *why not just automate this?*

---

### What is create-scaffold-kit?

It's a simple CLI tool that scaffolds a **React** or **Next.js** project with all the good stuff already set up. Just run one command:

```bash
npx create-scaffold-kit my-app
```

It asks you a few questions — framework, TypeScript, linting, testing, Docker, CI/CD and generates a full project ready to go.

**Things it sets up for you:**
- ✅ TypeScript (strict mode)
- ✅ ESLint with flat config (strict or standard)
- ✅ Prettier / OXfmt formatting
- ✅ Husky + lint-staged git hooks
- ✅ Vitest + React Testing Library
- ✅ Tailwind CSS
- ✅ Docker with multi-stage builds
- ✅ GitHub Actions CI/CD

No more copy-pasting configs. Just answer the prompts and start coding.


This is especially useful if you:
- **Start projects frequently**
- **Care about consistent tooling**
- **Don’t want to reinvent setup every time**

---

### Things I Didn’t Know Before Building a CLI

Here are things that were genuinely surprising while going through the process of building a CLI package for the first time. Maybe it saves you some time!

#### 1. The `bin` field in package.json is the magic

Always wondered how `npx create-something` just... works. Turns out it's this little thing:

```json
"bin": {
  "create-scaffold-kit": "dist/index.js"
}
```

That maps the command name to your entry file. Simple, but easy to miss.

#### 2. Your entry file needs a shebang line

The first line of your CLI entry file must be:

```js
#!/usr/bin/env node
```

Without it, the command just won't run. With **tsup**, this can be injected cleanly via the `banner` option in the config, no manual step needed:

```ts
banner: {
  js: '#!/usr/bin/env node',
}
```

#### 3. Bundling for CLI is different

**tsup** handles the TypeScript compilation. But a few things stood out:
- Setting `"type": "module"` in package.json
- Making sure import paths use `.js` extensions, even in TypeScript source files
- The `files` field to control what actually gets published to npm

#### 4. The `files` field matters a lot

You can control which files get included when running `npm publish`:

```json
"files": ["dist"]
```

Without this, you'd accidentally publish test files, source maps, scripts, everything. Not great.

#### 5. `prepack` and `postpack` scripts are a thing

There are `prepack`/`postpack` lifecycle hooks that run before and after packaging. These weren’t on my radar before this project. Turns out they’re really handy for automating pre-publish steps.

#### 6. Testing a CLI is... interesting

**Vitest** handles the unit tests here. Testing something that writes to disk and executes shell commands is tricky. Mocking `fs`, child processes, and prompts is a different kind of challenge compared to typical frontend component tests.

#### 7. Publishing is both easy and scary at the same time

`npm publish`. Just two words. But right before running it:
- "Was everything tested?"
- "Is the version right?"
- "Is the dist clean?"

A `prepublishOnly` script that runs type checking, linting, tests, and build before every publish is a lifesaver. It catches things before they go out. 😄

---

### Final Thoughts

This isn’t a groundbreaking tool, but building it gave me a much deeper understanding of the Node.js ecosystem, npm publishing, and how CLI tools actually work under the hood.

If you're a frontend dev who has never shipped a CLI tool — try it once. Even something small. The learning is worth it.

And if you give **create-scaffold-kit** a try, I'd love to hear your thoughts! It’s still early, but it works and is actively evolving..

---

### Try it out

```bash
npx create-scaffold-kit my-app
```

Check out the [GitHub](https://github.com/vkondi/create-scaffold-kit)

Thanks for reading! 🙏