[⬅️ Back to Security](../README.md)

# GitHub Repo Hardening

An operational guide to securing source code repositories, configuring branch protection rules, defining CODEOWNERS review gates, and hardening GitHub Actions workflow token permissions.

---

## Why It Matters

Source code repositories are prime targets for supply chain attacks. If an attacker gains access to a developer's GitHub account or compromises an automated repository script, they can push malicious commits directly to the `main` branch. This triggers CI/CD pipelines to build and deploy the compromised software to production automatically.

Hardening a GitHub repository locks down the path to production. By implementing branch protection rules, forcing multi-factor authentication (MFA), enforcing peer code reviews, and configuring least-privilege token permissions for automated workflows, you ensure that no single account compromise can push changes to production.

---

## Core Concepts

### 1. Branch Protection Rules

Branch protection rules enforce quality and security gates before code is merged:

1. **Require Pull Request Reviews**: Block direct pushes to default branches. Require at least one (ideally two) independent peer approvals on a pull request before merge.
1. **Require Status Checks**: Force all CI/CD pipelines (unit tests, formatting, security scanning) to complete successfully before a merge is permitted.
1. **Require Signed Commits**: Force developers to sign commits using GPG or SSH keys, validating that the commit author matches the authenticated git user.
1. **Include Administrators**: Enforce protection rules on repository owners and administrators, preventing bypasses.

### 2. Code Owners (`CODEOWNERS`)

The `CODEOWNERS` configuration file resides in the root `.github/` folder. It automatically assigns pull request reviewers based on the file paths modified. This prevents unauthorized changes to critical files (like workflow definitions or security modules):

```
# Example CODEOWNERS targets
.github/workflows/      @devops-security-team
learning/security/      @appsec-lead
```

### 3. Least-Privilege Workflow Permissions

By default, GitHub Actions workflows run with a temporary `GITHUB_TOKEN` that often possesses full read and write access to the repository. If an attacker compromises a third-party action in your pipeline, they can use this token to overwrite repository code, push tags, or hijack release pages.

Workflows must explicitly define permission scopes, starting from a baseline of `contents: read` or `none`.

---

## Real-World Production Learnings

We operated a cloud-native microservices platform with automated GitOps deployments.

**The Failure**:
An attacker compromised a developer's credentials that lacked multi-factor authentication. Because the repository allowed direct pushes to the default `main` branch, the attacker pushed a commit modifying our payment handler logic. This push triggered a production build, deploying the compromised code.

Additionally, because our build workflow ran with default write privileges, the build container was abused to delete tags and push malicious release binaries back to our GitHub releases page.

**The Diagnostic**:

1. **Unprotected Branch**: Bypassing PR structures allowed unreviewed code to merge directly into the deployment branch.
2. **Missing MFA Enforcement**: Allowing organization access without forcing MFA left the company vulnerable to credential leaks.
3. **Over-Permissioned GITHUB_TOKEN**: The workflow lacked explicit permission blocks, granting full write privileges to third-party scripts.

**The Refactor**:
We locked down our organization and repository configurations:

1. **Forced Organization MFA**: Requiring MFA for all members.
2. **Enabled Branch Protection**: Blocked direct commits, requiring signed commits and peer reviews.
3. **Configured CODEOWNERS**: Assigned file-path reviews for deployment workflows and security folders.
4. **Hardened Action Permissions**: Defined strict, read-only permissions inside our GitHub Actions workflows.

Here is the secure `.github/CODEOWNERS` definition:

```
# .github/CODEOWNERS
# Automatically request reviews for critical files

# Security configurations require SecOps approval
.github/workflows/                    @org/secops-team
learning/security/                    @org/secops-team

# Infrastructure configuration changes require DevOps approval
terraform/                            @org/devops-team

# General fallback rule
*                                     @org/core-developers
```

Here is a hardened GitHub Actions workflow showing least-privilege token permissions:

```yaml
# .github/workflows/deploy.yml
name: Hardened Deploy Pipeline

on:
  push:
    branches: [main]

# 1. DEFINE LEAST PRIVILEGE WORKFLOW PERMISSIONS
# Block all permissions by default at the workflow level
permissions: {}

jobs:
  deploy:
    runs-on: ubuntu-latest

    # Define granular permissions per job
    permissions:
      contents: read # Permit read access to pull code
      id-token: write # Required for OIDC connection to AWS (OpenID Connect)
      statuses: read # Read status checks

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials (OIDC)
        # Uses JWT-based identity tokens instead of static access keys
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy-role
          aws-region: us-east-1

      - name: Deploy Application
        run: |
          echo "Deploying to production ECS cluster..."
          # Deployment commands
```

By enforcing these boundaries:

- Direct pushes to `main` are blocked, ensuring all production changes are reviewed by at least one other developer.
- Third-party scripts in the CI pipeline cannot write back to our repository or delete code tags because the `GITHUB_TOKEN` is set to read-only.
- Critical deployment templates and security files cannot be modified without the SecOps team being automatically assigned as reviewers.

---

### 📖 Related Blog Posts

- [Ref: GitHub Repo Security Your Easy Go To Checklist](../../../blogs/GitHub_Repo_Security_Your_Easy_Go_To_Checklist.md)

---

## Related Reading

- [Application Security Basics](../application-security/basics.md)
- [Infrastructure Hardening Foundations](./basics.md)
- [secrets-management.md](./secrets-management.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.security.infrastructure-security.github-repo-hardening.md)
