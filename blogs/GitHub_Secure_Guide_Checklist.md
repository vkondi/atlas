---
title: 'GitHub Secure Guide Checklist'
tags:
  - github
  - security
  - devops
  - checklist
created: 2026-06-14
status: published
publications:
  - platform: coderlegion
    url: https://vishwajeetkondi.vercel.app/blog/github-secure-guide-checklist
    published_at: 2026-06-14
  - platform: devto
    url: https://dev.to/vishwajeet/github-secure-guide-checklist
    published_at: 2026-06-14
---

[⬅️ Back to Blogs](README.md)

# GitHub Secure Guide Checklist

## A. General Settings

- Repository Visibility: Ensure it's set to Public (if intended).
- Repository name: Keep it clear and descriptive.
- Description: Add a brief description.
- Topics: Add relevant topics for better discoverability.
- Default Branch: Set to main (or another preferred default).
- Archiving: Disable if the repo is active.

## B. Branch Protection Rules

Go to:

`Settings → Branches → Branch protection rules → Add rule`

Configure for main (or default branch):

- ☑ Require a pull request before merging
- ☑ Require approvals (at least 1-2)
- ☑ Dismiss stale pull request approvals
- ☑ Require review from Code Owners
- ☑ Require status checks to pass before merging (e.g., CI/CD checks)
- ☑ Require conversation resolution before merging
- ☑ Require signed commits (optional but recommended)
- ☑ Require linear history (prevents merge commits)
- ☑ Do not allow bypassing the above settings (even for admins)

## C. Actions & Workflows Permissions

Go to:

`Settings → Actions → General`

Actions permissions:

- ☑ Allow all actions (or restrict to only verified actions if security is critical).

Workflow permissions:

- ☑ Read repository contents and packages permissions (least privilege).

## D. Collaborators & Teams

Go to:

`Settings → Collaborators & Teams`

- Only grant Write/Admin access to trusted contributors.
- Prefer Pull Requests (PRs) over direct commits.

## E. Security & Moderation

Go to:

`Settings → Code security & analysis`

- ☑ Enable vulnerability alerts (Dependabot).
- ☑ Enable Dependabot security updates.
- ☑ Enable secret scanning (GitHub Advanced Security, if available).
- ☑ Enable push protection (blocks commits with exposed secrets).

## F. Merge Button Behavior

Go to:

`Settings → General → Pull Requests`

- ☑ Allow merge commits / Squash merging / Rebase merging (choose as needed).
- ☑ Always suggest updating pull request branches.
- ☑ Allow auto-merge.

## G. Issue & Discussion Settings

Go to:

`Settings → Features`

- ☑ Enable Issues (if needed).
- ☑ Enable Discussions (optional).
  ☑ Enable Projects (optional).

---

![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat-square&logo=github&logoColor=white) ![Security](https://img.shields.io/badge/Security-🔒-red?style=flat-square) ![DevOps](https://img.shields.io/badge/DevOps-🛠️-blueviolet?style=flat-square) ![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.blogs/GitHub_Secure_Guide_Checklist.md)
