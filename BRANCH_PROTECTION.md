# Branch Protection & CI/CD Governance Guide

This document outlines the branch protection rules, code review policies, environment secrets management, and deployment guidelines for the Harikson platform.

---

## 🛡️ Branch Protection Rules

### 1. `main` Branch (Production)

> [!CAUTION]
> **No direct pushes allowed under any circumstances.**
> All changes must land via Pull Requests originating from `develop` or release branches.

- **Require Pull Request before merging:** Enabled
- **Require approvals:** Minimum **1 review approval** (Recommend 2 approvals for security-sensitive modules)
- **Dismiss stale pull request approvals on new commits:** Enabled
- **Require status checks to pass before merging:**
  - `CI / lint-typecheck-test-build`
  - `Security Audit & Token Scan / token-scan`
- **Require branches to be up to date before merging:** Enabled
- **Include administrators:** Enabled

### 2. `develop` Branch (Staging)

- **Require Pull Request before merging:** Enabled
- **Require status checks to pass before merging:**
  - `CI / lint-typecheck-test-build`
  - `Security Audit & Token Scan / token-scan`
- **Allow force pushes:** Disabled
- **Allow deletions:** Disabled

---

## 🔑 GitHub Secrets & Environment Configuration

Configure the following secrets in GitHub Repository Settings → **Secrets and variables** → **Actions**:

### Staging Environment Secrets (`develop` branch deployments)

| Secret Name | Description | Example / Format |
|---|---|---|
| `STAGING_HOST` | IP Address or Domain of Staging VPS | `154.201.127.68` |
| `STAGING_USER` | SSH Username | `ubuntu` |
| `STAGING_SSH_KEY` | Private OpenSSH key for staging server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL for alert notifications | `https://hooks.slack.com/services/...` |

### Production Environment Secrets (`production` GitHub Environment)

| Secret Name | Description | Example / Format |
|---|---|---|
| `PROD_HOST` | IP Address or Domain of Production VPS | `api.neuravolt.cloud` |
| `PROD_USER` | SSH Username | `ubuntu` |
| `PROD_SSH_KEY` | Private OpenSSH key for production server | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `JWT_SECRET` | 256-bit cryptographically random signing key | `openssl rand -hex 32` |
| `TENANT_MASTER_KEY` | AES-256 master document encryption key | `openssl rand -hex 32` |
| `PAYMENT_ENCRYPTION_KEY` | Master key for payment merchant credentials | `openssl rand -hex 32` |

---

## 🚀 Deployment Pipeline Summary

```mermaid
graph TD
    PR[Developer Pull Request] -->|Triggers| CI[CI Pipeline: Lint, Typecheck, Test, Build]
    CI -->|Passes| Merge[PR Merged to develop]
    Merge -->|Triggers| CD_Staging[CD Staging: Build ghcr.io images & SSH deploy]
    CD_Staging -->|Success| Test_Staging[Staging Smoke Tests]
    Test_Staging -->|PR to main| Prod_Approve[GitHub Environment Approval: 2 Reviewers]
    Prod_Approve -->|Approved| CD_Prod[CD Prod: Blue-Green Deploy & Health Probes]
    CD_Prod -->|Health Check Fail| Rollback[Automatic Rollback to Previous Version]
    CD_Prod -->|Health Check Pass| Complete[Traffic Swapped & Old Instance Drained]
```

### Deployment Triggers

- **Pull Request to `develop` or `main`:** Runs `CI` pipeline (`lint`, `typecheck`, `test:coverage`, `build`, `token-scan`).
- **Push to `develop`:** Triggers `CD Staging` workflow to build Docker images, publish to `ghcr.io`, deploy to Staging VM, and run smoke tests.
- **Push to `main` or Manual `workflow_dispatch`:** Triggers `CD Production` workflow with GitHub Environment approval gates and automated Blue-Green traffic switching with health check rollback.
