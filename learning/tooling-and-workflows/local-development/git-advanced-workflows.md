[⬅️ Back to Tooling & Workflows](../README.md)

# Git Advanced Workflows

An operational guide to advanced version control workflows, executing interactive rebasing, recovering lost commits using git reflog, and managing repository histories.

---

## Why It Matters

Git is the foundation of modern team collaboration. However, many engineers limit themselves to basic commands: `add`, `commit`, `pull`, and `push`. When complex merge conflicts occur or when a commit history needs to be cleaned up before merging, developers often struggle, leading to polluted commit histories or accidental code loss.

Mastering advanced Git workflows allows you to maintain a clean, readable project history. Knowing how to restructure commits, selectively apply changes across branches, and recover deleted branches ensures you can manage your code history securely and coordinate with team members without data loss.

---

## Core Concepts

### 1. Interactive Rebasing (`git rebase -i`)

Interactive rebasing allows you to rewrite your local git history before pushing it to a shared remote. You can reorder, edit, split, or combine commits to present a clean story for code review:

```bash
# Start an interactive rebase for the last 4 commits
git rebase -i HEAD~4
```

This opens a text editor listing your commits, prefixed with action commands:

- **`pick`**: Keep the commit as is.
- **`reword`**: Keep the commit but edit the commit message.
- **`edit`**: Pause the rebase to modify files or split the commit.
- **`squash`**: Combine the commit with the previous one, merging the commit messages.
- **`drop`**: Remove the commit entirely from the history.

### 2. The Safety Net: `git reflog`

If you accidentally delete a branch, execute a hard reset that deletes working files (`git reset --hard`), or make a mistake during a rebase, your work is not lost.

Git records all updates to the local `HEAD` pointer in the **Reference Log (Reflog)**. You can scan this log to find the commit hash of your lost files and restore them:

```bash
# View the local HEAD update history
git reflog
```

### 3. Cherry-Picking and Stashing

- **Cherry-Picking (`git cherry-pick <commit-hash>`)**: Selectively applies a single commit from another branch to your current branch, without executing a full merge.
- **Stashing (`git stash` / `git stash pop`)**: Shelves your current uncommitted changes to a temporary stack, returning your directory to a clean state. This is useful when you need to switch branches quickly without committing incomplete work.

---

## Real-World Production Learnings

We operated a payment gateway integrations repository with multiple concurrent developer feature branches.

**The Failure**:
An engineer committed database keys inside a local testing commit. They realized the mistake, deleted the credentials file, and committed the deletion. However, after the feature branch was merged to `main`, a security scanner flagged that the database credentials were still visible in the repository's git commit history. Automated bots scraped the historical commit, compromising our database server.

**The Diagnostic**:

1. **Plaintext Git History**: Deleting a file in a new commit does not remove it from the database objects of previous commits.
2. **Unconsolidated History**: Merging branches without squashing preserved all intermediate debug commits containing the exposed keys.
3. **No Hook Scanning**: The developer pushed commits without verifying changes against secrets scanning rules.

**The Refactor**:
We rotated the compromised database keys, purged our repository history, and implemented branch rules to prevent future leaks:

1. **Purged Leaked Secrets**: Used `git-filter-repo` to delete the secret from all historical commits across all branches.
2. **Enforced Squash Merging**: Configured GitHub branch protection rules to allow only "Squash and Merge," condensing pull request histories into a single commit.
3. **Integrated Pre-Commit Scans**: Enforced static secret scanning hooks to block commits containing key signatures.

Here is the terminal walk-through we documented to recover from a broken rebase using `git reflog`:

```bash
# Scenario: A rebase went wrong, and we lost 3 days of work.
# 1. View reflog to locate the commit hash before the rebase started
$ git reflog

e4a19b2 HEAD@{0}: rebase (abort): checkout HEAD~4
a9f24c1 HEAD@{1}: rebase (start): checkout HEAD~4
7b2c5d3 HEAD@{2}: commit: feat: Implement billing transaction retry rules
1a8d4c9 HEAD@{3}: commit: feat: Add checkout payload validation schemas

# 2. Identify the hash of our work before the rebase started (7b2c5d3)
# 3. Create a recovery branch pointing directly to that safe commit
$ git checkout -b recovery-branch 7b2c5d3

# 4. Verifies all features and files are restored successfully
```

By enforcing clean history practices:

- Leaked credentials were deleted from the repository history, securing database environments.
- The repository's commit history became clean and reviewable, with one descriptive commit per merged pull request.
- Developers can recover lost commits independently, reducing downtime during rebase conflicts.

---

## Related Reading

- [Local Development Foundations](./basics.md)
- [Terminal Productivity with Zsh](./terminal-productivity-zsh.md)
- [github-repo-hardening.md](../../security/infrastructure-security/github-repo-hardening.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.tooling-and-workflows.local-development.git-advanced-workflows.md)
