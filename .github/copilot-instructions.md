# GitHub Copilot Repository Instructions

This is a personal knowledge repository containing blogs, notes, learning, and projects documentation.

---

## 1. Repository Overview & Stack

- **Technologies**: Markdown for documentation, Vanilla JavaScript/Node.js for utility scripts.
- **Tooling**:
  - **Prettier** for automated formatting.
  - **Markdownlint** for markdown style checking.
  - **markdown-link-check** for verifying internal/external links.
  - **Custom Blog Validator** (`node scripts/validate-blog.js`) for verifying blogging standards.

---

## 2. Directory Structure

- `blogs/` - Blog articles, series, and tutorials (recursively organized).
- `learning/` - General learning notes and study materials.
- `projects/` - Personal project write-ups and documentation.
- `interview-prep/` - Software engineering interview prep guidelines.
- `scripts/` - Node.js validation and utility scripts.
- `assets/` - Images, graphics, and static media files for documents.

---

## 3. General Markdown & Documentation Standards

- Always format files using Prettier before committing.
- Avoid absolute file system links. Use relative paths for files and assets.
- Use standard GitHub Flavored Markdown (GFM).
- Ensure all links are alive and correct.

---

## 4. Blogging Standards (Sub-Level Guidelines)

When writing, modifying, or managing files specifically inside the `blogs/` directory (excluding `README.md` files), ensure they comply with the following sub-level guidelines:

### A. YAML Frontmatter Metadata

Every blog post must start with a YAML frontmatter block:

- `title`: Title of the post (enclosed in single quotes).
- `tags`: A list of lowercased tags/topics (at least one tag is required).
- `created`: The creation date of the file in `YYYY-MM-DD` format.
- `status`: Either `published` or `draft`.
- `publications` (Optional): A list of platform cross-posts (with `platform`, `url`, and `published_at`).

_Example:_

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

### B. Relative Back Navigation

Directly after the frontmatter, insert a relative back link pointing to the main blogs README:

- For root blog posts (e.g., `blogs/post.md`): `[⬅️ Back to Blogs](README.md)`
- For nested posts (e.g., `blogs/series/post.md`): `[⬅️ Back to Blogs](../README.md)`

### C. Hits View Count Badge

At the very bottom of the Markdown file, insert a horizontal rule separator `---` followed by a visitor badge image:

- Alt text: `Hits`
- Source URL: `https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.<relative-path-from-repo-root>`
- Use forward slashes in the path.

_Example Badge Link:_
`![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/my-post.md)`

### D. Main Blogs README Registration & Categorization

When adding a new blog, you must register its link in [blogs/README.md](../blogs/README.md).

- Categorize the link under the most appropriate H3 section based on the tags or content:
  - **AI & Intelligent Agents** (`### 🤖 AI & Intelligent Agents`): tags `ai`, `rag`, `agents`, `llm`, `copilot`, `artificial-intelligence`
  - **Frontend Development & Frameworks** (`### 🌐 Frontend Development & Frameworks`): tags `react`, `frontend`, `js`, `ts`, `css`, `html`, `webpack`, `vite`, `next`, `eslint`, `prettier`, `linter`, `formatter`, `useeffect`
  - **Security & DevOps** (`### 🔒 Security & DevOps`): tags `security`, `devops`, `git`, `docker`, `github`, `actions`, `jwt`, `auth`, `attack`, `hacked`, `axios`
  - **Browser Internals** (`### 🖥️ Browser Internals`): tags `browser`, `performance`, `dom`, `rendering`
  - **Career & Personal Projects** (`### 🚀 Career & Personal Projects`): tags `career`, `job`, `jobs`, `resume`, `cli`, `npm`, `project`
  - **Other Articles** (`### 📁 Other Articles`): fallback if no categories match.
- Insert the link under the target category in **alphabetical order** by display title.
- Format: `- [Title](./relative-path-from-blogs-folder.md)`
