---
title: 'Hello World to GitHub Actions: Your First Automated Workflow'
tags:
  - github-actions
  - ci-cd
  - automation
  - devops
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/hello-world-to-github-actions-your-first-automated-workflow
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/hello-world-to-github-actions-your-first-automated-workflow
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md) ![Hits](https://hits.secureri.style/v1/github/vkondi/atlas/blogs/Hello_World_to_GitHub_Actions_Your_First_Automated_Workflow.md)

![hello_world_github_actions](uploads/1794352577190ed4553a6e2f83d5bd1b/hello_world_github_actions.png){width=900 height=394}

Hey there! So you're building a React app with TypeScript and Vite, and you keep hearing people talk about CI/CD and GitHub Actions. What's all the fuss about? Let me break it down for you in plain English.

## What's GitHub Actions Anyway?

Think of GitHub Actions as your automation buddy that lives in your GitHub repo. You tell it "hey, whenever I push code, run my tests and make sure nothing broke," and it just... does it. Automatically. While you grab coffee(or chai) or work on something else.

Pretty cool, right? Here's what makes it awesome:

**It's automatic** - No more remembering to run tests before you push. Your automation buddy handles it.

**It's consistent** - Everyone's code gets tested the same way, every single time. No more "but it works on my machine!"

**It's free** - GitHub gives you a generous amount of free minutes every month. For most personal projects, you won't pay a dime.

**It's built-in** - Everything happens right in GitHub. No need to sign up for yet another service.

## The Basics (Don't Worry, It's Simple!)

Before we jump into code, let's get familiar with a few terms:

**Workflows** are like recipes. They're files that tell GitHub Actions what to do. You write them in a language called YAML (it's just a fancy text format, nothing scary).

**Events** are triggers. "When someone pushes code" or "when someone opens a pull request" - these are events that kick off your workflow.

**Jobs** are the big tasks in your recipe. Like "build the app" or "run tests." Each job runs on its own fresh computer in the cloud.

**Steps** are the small tasks inside a job. Things like "install dependencies" or "run the linter."

**Actions** are pre-made shortcuts. Instead of writing commands to set up Node.js from scratch, you can use an action someone else already made. It's like using a package from npm, but for your workflows.

## Let's Build Your First Workflow!

Alright, enough theory. Let's make something real. We're going to create a workflow that checks your code every time you push or open a pull request.

### Creating the File

First, make a new folder in your project: `.github/workflows/`. Yes, it starts with a dot - that's on purpose!

Inside that folder, create a file called `ci.yml`. Here's what goes in it:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Build project
        run: npm run build

      - name: Run tests
        run: npm test
```

### What's All This Mean?

Let me walk you through it:

**name: CI Pipeline** - Just a friendly name for your workflow. You'll see it in the GitHub interface.

**on:** - This is where you say "run this when..." In our case, we're saying "run when someone pushes to main or develop, OR when someone opens a pull request."

**permissions:** - This is important! We're telling GitHub "hey, this workflow only needs permission to read our code, nothing else." It's like giving someone a library card instead of the keys to the building. Good security practice!

**jobs:** - Here's where the actual work happens. We've got one job called "build-and-test."

**runs-on: ubuntu-latest** - This means "run on a computer with Ubuntu Linux." GitHub provides this for free!

**steps:** - These are the actual commands that run, one after another:

- First, we grab the code
- Then we install Node.js
- Install our dependencies
- Run the linter to check code style
- Check for TypeScript errors
- Build the project
- Run our tests

### Setting Up Your package.json

Your `package.json` needs to have these scripts for the workflow to work:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "preview": "vite preview"
  }
}
```

Don't have ESLint or Vitest set up yet? No worries - you can skip those steps in your workflow for now and add them later.

## Want to Deploy Automatically Too?

Once your tests pass, you might want to deploy your app. Here's a workflow that deploys to GitHub Pages:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

This one's a bit different - it has TWO jobs. The second job (deploy) waits for the first one (build) to finish successfully. That `needs: build` line is what makes that happen.

## Making It Faster with Caching

Want your workflows to run faster? Good news - the `actions/setup-node@v4` action we're using already caches your npm packages when you add `cache: 'npm'`. That means the second time your workflow runs, it won't have to download all your dependencies again. Pretty smart!

## Keeping Secrets... Secret

Sometimes you need API keys or passwords in your builds. DON'T put them directly in your workflow file - that's like posting your house keys on Instagram.

Instead, use GitHub's secrets feature:

1. Go to your repo's Settings
2. Click on "Secrets and variables" then "Actions"
3. Click "New repository secret"
4. Add your secret (like `VITE_API_KEY`)

Then use it in your workflow like this:

```yaml
- name: Build project
  run: npm run build
  env:
    VITE_API_KEY: ${{ secrets.VITE_API_KEY }}
```

GitHub will hide it in the logs automatically. Nice!

## Checking If It's Working

After you push your workflow file to GitHub:

1. Click the "Actions" tab in your repo
2. You'll see your workflow running (or done running)
3. Click on it to see all the details
4. If something breaks, click on the red X to see what went wrong

The logs tell you EXACTLY what happened at each step. It's super helpful for debugging.

## Understanding Workflow Permissions

Quick important thing - see that `permissions` block we added? That's like setting up proper door locks for your house.

By default, workflows might have way more permissions than they need. We're being explicit and saying "this workflow only needs to READ the code" with `contents: read`. If later you need to do something like comment on pull requests, you'd add `pull-requests: write`.

It's just a good habit to be clear about what your workflow can and can't do. Your future self (and your team) will thank you!

## Some Quick Tips

Here are a few things that'll make your life easier:

**Set permissions explicitly** - Like we just talked about, always add that `permissions` block. Start with `contents: read` and only add more when you need it.

**Use version tags** - Notice how we use `@v4` in our actions? That's better than using `@main` because it won't suddenly change on you. Your workflows stay stable.

**Use `npm ci` not `npm install`** - In automated environments, `npm ci` is faster and more reliable. It's designed specifically for CI/CD.

**Run jobs in parallel** - If you have multiple jobs that don't depend on each other, they'll run at the same time. Saves time!

**Add a badge to your README** - In the Actions tab, you can grab a badge that shows if your build is passing. It looks professional!

**Test different Node versions** - You can use something called a matrix to test on Node 18, 20, and 21 all at once. Here's how:

```yaml
strategy:
  matrix:
    node-version: [18, 20, 21]
```

**Protect your main branch** - In your repo settings, you can require that all checks pass before merging. No more broken builds!

**Separate your workflows** - Keep your testing workflow separate from your deployment workflow. Makes things easier to understand and manage.

## When Things Go Wrong

Don't panic! Here are common issues and fixes:

**Workflow not running?** - Check that your YAML file is in `.github/workflows/` and that you don't have any syntax errors. YAML is picky about spaces and indentation.

**Works on your computer but not in CI?** - Make sure all your dependencies are listed in `package.json`. Also check that you're not relying on environment variables that only exist on your machine.

**Running out of build minutes?** - Public repos get unlimited minutes! Private repos have limits. Check your usage in Settings → Billing.

## What's Next?

You now know the basics! Here are some cool things to explore when you're ready:

- Browse the GitHub Marketplace for actions other people have made
- Set up notifications to Slack or Discord when builds fail
- Add code coverage reporting
- Create custom actions for your specific needs
- Try matrix builds to test across multiple environments

The key is to start simple - get your basic testing pipeline working - then add more features as you need them. Don't try to do everything at once!

## Wrapping Up

GitHub Actions might seem a bit intimidating at first, but once you get the hang of it, you'll wonder how you lived without it. No more forgetting to run tests. No more "oops, I broke main." Just push your code and let your automation buddy do its thing.

Start with the simple CI workflow we built together, make sure it works, and then gradually add more automation as you get comfortable. Before you know it, you'll be the GitHub Actions expert on your team!

Happy automating! 🚀
