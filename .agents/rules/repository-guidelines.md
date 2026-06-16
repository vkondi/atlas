# Repository Guidelines & Coding Standards

This is a personal knowledge repository containing blogs, notes, learning, and projects documentation.

---

## 1. Directory Structure

- `blogs/` - Blog articles, series, and tutorials (recursively organized).
- `learning/` - General learning notes and study materials.
- `projects/` - Personal project write-ups and documentation.
- `interview-prep/` - Software engineering interview prep guidelines.
- `scripts/` - Node.js validation and utility scripts.
- `assets/` - Images, graphics, and static media files for documents.

---

## 2. General Documentation Standards

- Always format Markdown files using Prettier.
- Check style rules using Markdownlint (`markdownlint **/*.md`).
- Ensure all hyperlinks (internal and external) are valid and working (`node scripts/link-check.js`).
- Always use relative paths to files or assets rather than absolute file system links.

---

## 3. Blogging Standards (Sub-Level Guidelines)

Every time you write or modify a Markdown blog post (located recursively in the `blogs/` directory, excluding `README.md` files), you must ensure it complies with the following sub-level guidelines:

### A. YAML Frontmatter Metadata

- `title`: The title of the post (enclosed in single quotes).
- `tags`: A list of lowercased tags/topics (at least one tag is required).
- `created`: The creation date of the file in `YYYY-MM-DD` format.
- `status`: Either `published` or `draft`.
- `publications` (Optional): platform cross-posts.

_Example YAML Frontmatter:_

```yaml
---
title: 'My Awesome Tech Blog'
tags:
  - web-development
  - javascript
created: 2026-06-14
status: published
---
```

### B. Relative Back Navigation Link

Directly after the frontmatter, insert a back link pointing to the main blogs README:

- For root blog posts: `[⬅️ Back to Blogs](README.md)`
- For nested posts: `[⬅️ Back to Blogs](../README.md)`

### C. Hits View Count Badge

At the very bottom of the Markdown file, insert a horizontal rule separator `---` followed by a visitor badge image:

- Alt text: `Hits`
- Source URL: `https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.<relative-path-from-repo-root>`
- Use forward slashes in the path.

_Example Badge Link:_
`![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/my-post.md)`

### D. Registration & Categorization in Blogs README

You must register and link any new blog post inside the main blogs README ([blogs/README.md](../../blogs/README.md)) in alphabetical order under the correct category section:

- **AI & Intelligent Agents** (`### 🤖 AI & Intelligent Agents`): for `ai`, `rag`, `agents`, `llm`, `copilot`, `artificial-intelligence`
- **Frontend Development & Frameworks** (`### 🌐 Frontend Development & Frameworks`): for `react`, `frontend`, `js`, `ts`, `css`, `html`, `webpack`, `vite`, `next`, `eslint`, `prettier`, `linter`, `formatter`, `useeffect`
- **Security & DevOps** (`### 🔒 Security & DevOps`): for `security`, `devops`, `git`, `docker`, `github`, `actions`, `jwt`, `auth`, `attack`, `hacked`, `axios`
- **Browser Internals** (`### 🖥️ Browser Internals`): for `browser`, `performance`, `dom`, `rendering`
- **Career & Personal Projects** (`### 🚀 Career & Personal Projects`): for `career`, `job`, `jobs`, `resume`, `cli`, `npm`, `project`
- **Other Articles** (`### 📁 Other Articles`): fallback if no categories match.
- Format: `- [Title](./relative-path-from-blogs-folder.md)`
