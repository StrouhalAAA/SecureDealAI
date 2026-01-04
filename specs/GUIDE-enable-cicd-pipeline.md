# Guide: Enable CI/CD Pipeline in GitHub

## Overview

This guide walks you through enabling the CI/CD pipeline for SecureDealAI. The pipeline will automatically:
- **On every push/PR**: Build the frontend, run TypeScript checks, and execute tests
- **On merge to main**: Deploy Edge Functions to Supabase

**Time required**: ~10 minutes
**Difficulty**: Beginner-friendly

---

## Prerequisites

Before starting, ensure you have:
- [ ] Access to the SecureDealAI GitHub repository (admin or write access)
- [ ] Access to the Supabase Dashboard for this project
- [ ] The code changes from FIX-004 pushed to GitHub (the `.github/workflows/` folder)

---

## Step 1: Get Your Supabase Project Reference

The **Project Reference** is a unique identifier for your Supabase project.

### How to find it:

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Click on the **SecureDealAI** project (or whatever your project is named)
4. In the left sidebar, click **Project Settings** (gear icon at the bottom)
5. Click **General** in the settings menu
6. Find **Reference ID** - it looks like: `abcdefghijklmnop`

### Copy this value - you'll need it in Step 3

```
Example: xyzabcdefghijk123
```

> **Note**: This is NOT a secret - it's just an identifier. But we store it as a secret for convenience.

---

## Step 2: Create a Supabase Access Token

The **Access Token** allows GitHub Actions to deploy functions on your behalf.

### How to create one:

1. While still in Supabase Dashboard, click your **profile icon** (top-right corner)
2. Click **Access Tokens** from the dropdown menu
   - Or go directly to: [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
3. Click **Generate new token**
4. Give it a descriptive name: `GitHub Actions - SecureDealAI`
5. Click **Generate token**
6. **IMPORTANT**: Copy the token immediately! It will only be shown once.

### Copy this value - you'll need it in Step 3

```
Example: sbp_1234567890abcdefghijklmnopqrstuvwxyz
```

> **Security Warning**: This token grants access to deploy functions. Never share it publicly or commit it to code.

---

## Step 3: Add Secrets to GitHub Repository

Now we'll store both values securely in GitHub.

### Navigate to repository secrets:

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/SecureDealAI`
2. Click the **Settings** tab (you need admin access)
3. In the left sidebar, scroll down to **Security** section
4. Click **Secrets and variables**
5. Click **Actions**

### Add the first secret (Project Reference):

1. Click the green **New repository secret** button
2. Fill in:
   - **Name**: `SUPABASE_PROJECT_REF`
   - **Secret**: Paste the Reference ID from Step 1
3. Click **Add secret**

### Add the second secret (Access Token):

1. Click **New repository secret** again
2. Fill in:
   - **Name**: `SUPABASE_ACCESS_TOKEN`
   - **Secret**: Paste the Access Token from Step 2
3. Click **Add secret**

### Verify both secrets are added:

You should now see both secrets listed:
```
SUPABASE_ACCESS_TOKEN    Updated just now
SUPABASE_PROJECT_REF     Updated just now
```

> **Note**: You can't view secret values after adding them - only update or delete them.

---

## Step 4: Push Code to Trigger the Pipeline

If you haven't already pushed the workflow files, do so now:

```bash
# From your project directory
git add .github/workflows/
git commit -m "feat: add CI/CD pipeline with GitHub Actions"
git push origin feature/mvp
```

---

## Step 5: Verify the CI Pipeline Works

### Check the Actions tab:

1. Go to your GitHub repository
2. Click the **Actions** tab
3. You should see workflow runs listed

### What to look for:

| Workflow | Trigger | Expected Result |
|----------|---------|-----------------|
| **CI** | Every push | Should run and show green checkmark |
| **PR Check** | On pull requests | Runs when you open a PR |
| **Deploy** | Push to main + function changes | Only runs after merge to main |

### If you see a green checkmark: Success!

### If you see a red X:
- Click on the failed workflow
- Click on the failed job
- Read the error logs to diagnose the issue
- See Troubleshooting section below

---

## Step 6: Test the Deploy Pipeline

The deploy pipeline only runs when:
1. Code is pushed to `main` branch
2. Changes are in `supabase/functions/**` folder

### To test it:

1. Create a Pull Request from `feature/mvp` to `main`
2. Ensure CI checks pass
3. Merge the PR
4. Go to Actions tab and watch the **Deploy** workflow run

### Successful deployment looks like:

```
Deploy Edge Functions
  ✓ Checkout code
  ✓ Setup Supabase CLI
  ✓ Deploy all Edge Functions
  ✓ Verify deployment
```

---

## Troubleshooting

### Problem: "Resource not accessible by integration"

**Cause**: Missing repository permissions
**Fix**:
1. Go to Settings > Actions > General
2. Under "Workflow permissions", select "Read and write permissions"
3. Click Save

### Problem: "Invalid access token"

**Cause**: Expired or incorrect Supabase token
**Fix**:
1. Generate a new token in Supabase Dashboard
2. Update the `SUPABASE_ACCESS_TOKEN` secret in GitHub

### Problem: "Project not found"

**Cause**: Incorrect project reference
**Fix**:
1. Double-check the Reference ID in Supabase Dashboard
2. Update the `SUPABASE_PROJECT_REF` secret in GitHub

### Problem: CI fails with "npm ci" error

**Cause**: Missing or corrupted package-lock.json
**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: regenerate package-lock.json"
git push
```

### Problem: Tests fail in CI but pass locally

**Cause**: Environment differences or timing issues
**Fix**:
- Check if tests depend on local environment variables
- Look for race conditions in async tests
- Ensure all test dependencies are in package.json (not globally installed)

---

## Understanding the Workflows

### ci.yml - Continuous Integration

```
Triggers: Push to main/feature/*, PRs to main
Jobs:
  1. build-and-test (Node.js)
     - Install dependencies
     - TypeScript check
     - Run unit tests
     - Build frontend

  2. test-edge-functions (Deno)
     - Type-check all Edge Functions
```

### deploy.yml - Continuous Deployment

```
Triggers: Push to main (only supabase/functions/** changes)
Jobs:
  1. deploy-edge-functions
     - Setup Supabase CLI
     - Deploy all functions
     - Verify deployment
```

### pr-check.yml - Pull Request Validation

```
Triggers: PR opened/updated
Jobs:
  1. pr-validation
     - Build check
     - Test check
     - Generate summary
```

---

## Optional: Add Status Badges to README

Show build status in your README:

```markdown
![CI](https://github.com/YOUR_USERNAME/SecureDealAI/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/SecureDealAI/actions/workflows/deploy.yml/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username or organization.

---

## Security Best Practices

1. **Never commit secrets to code** - Always use GitHub Secrets
2. **Use environment protection** - The deploy workflow uses `environment: production`
3. **Rotate tokens periodically** - Regenerate Supabase tokens every few months
4. **Review workflow changes** - Be cautious of PRs that modify `.github/workflows/`
5. **Limit secret access** - Only give repository access to trusted team members

---

## Next Steps

Once your CI/CD pipeline is working:

1. **Enable branch protection** (Settings > Branches > Add rule)
   - Require status checks to pass before merging
   - Select "CI / Build & Test" as required check

2. **Set up notifications** (optional)
   - GitHub can email you on workflow failures
   - Consider Slack integration for team visibility

3. **Add more checks** (future enhancements)
   - E2E tests with Playwright
   - Code coverage reports
   - Security vulnerability scanning

---

## Quick Reference

| What | Where |
|------|-------|
| Supabase Project Ref | Supabase Dashboard > Project Settings > General |
| Supabase Access Token | Supabase Dashboard > Profile > Access Tokens |
| GitHub Secrets | Repository > Settings > Secrets and variables > Actions |
| Workflow Runs | Repository > Actions tab |
| Workflow Files | `.github/workflows/*.yml` |

---

## Completed

- **Date**: 2026-01-04
- **Author**: Claude Code
- **Purpose**: Enable automated CI/CD for SecureDealAI project
