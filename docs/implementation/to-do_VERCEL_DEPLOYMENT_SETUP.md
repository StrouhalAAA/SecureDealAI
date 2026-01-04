# ✅ COMPLETED: Vercel Frontend Deployment Setup

**Status**: Completed
**Priority**: High
**Estimated Time**: 30-45 minutes
**Created**: 2026-01-04
**Completed**: 2026-01-04

---

## Overview

This guide walks you through setting up automatic frontend deployment to Vercel when code is merged to the `main` branch on GitHub.

### Current State
- Frontend: Vue 3 + Vite app located in `apps/web/`
- Build system: npm workspaces
- Existing CI/CD: GitHub Actions for tests and Supabase Edge Functions
- `vercel.json` already exists with SPA routing configuration

### Target State
- Automatic production deployment on merge to `main`
- Preview deployments for every pull request
- Environment variables properly configured
- Custom domain (optional)

---

## Option A: Direct Vercel-GitHub Integration (Recommended)

This is the simplest and most maintainable approach.

### Prerequisites Checklist

- [x] GitHub account with access to the SecureDealAI repository
- [x] Vercel account (free tier is sufficient)
- [x] Repository pushed to GitHub

---

### Step 1: Create Vercel Account

**Time**: 2 minutes

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Select **"Continue with GitHub"** (recommended for seamless integration)
4. Authorize Vercel to access your GitHub account
5. Complete the account setup wizard

**Verification**: You should see the Vercel dashboard with "Add New Project" option

---

### Step 2: Import GitHub Repository

**Time**: 3 minutes

1. From Vercel dashboard, click **"Add New..."** → **"Project"**
2. You'll see "Import Git Repository" section
3. Find **SecureDealAI** in the repository list
   - If not visible, click **"Adjust GitHub App Permissions"**
   - Grant Vercel access to the SecureDealAI repository
4. Click **"Import"** next to SecureDealAI

**Verification**: You should see the "Configure Project" screen

---

### Step 3: Configure Project Settings

**Time**: 5 minutes

This is the **most critical step** for monorepo setups.

#### 3.1 Set Root Directory

1. Click **"Edit"** next to Root Directory (or expand settings)
2. Enter: `apps/web`
3. Click **"Continue"** or confirm

> **Why?** Your frontend is in a subdirectory. Without this, Vercel would try to build from the repository root and fail.

#### 3.2 Verify Framework Detection

Vercel should auto-detect:
- **Framework Preset**: Vite
- **Build Command**: `npm run build` (or `vite build`)
- **Output Directory**: `dist`
- **Install Command**: `npm install`

If not auto-detected, set manually:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

#### 3.3 Node.js Version

1. Expand **"Build & Development Settings"** if not visible
2. Set Node.js version to **20.x** (matches your `package.json` engines)

**Verification**: Settings should match the table above

---

### Step 4: Configure Environment Variables

**Time**: 5 minutes

Your frontend needs Supabase connection details.

1. In the project configuration screen, expand **"Environment Variables"**
2. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://bdmygmbxtdgujkytpxha.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `[Your anon key from .env]` | Production, Preview, Development |

**To find your keys:**
```bash
# From local .env file
cat apps/web/.env
# Or from Supabase dashboard → Settings → API
```

> **Security Note**: Only add the `anon` key (public), never the `service_role` key to frontend environment variables.

#### Adding Variables:

1. Enter variable name (e.g., `VITE_SUPABASE_URL`)
2. Enter value
3. Select environments: ✅ Production, ✅ Preview, ✅ Development
4. Click **"Add"**
5. Repeat for each variable

**Verification**: Both environment variables should appear in the list

---

### Step 5: Deploy

**Time**: 2-5 minutes

1. Click **"Deploy"**
2. Vercel will:
   - Clone your repository
   - Install dependencies (`npm install` in `apps/web`)
   - Run build (`npm run build`)
   - Deploy to edge network

3. Watch the build logs for any errors

**Common Build Issues:**

| Error | Solution |
|-------|----------|
| `vue-tsc` type errors | Fix TypeScript errors locally first |
| Missing dependencies | Ensure `package-lock.json` is committed |
| Environment variable undefined | Check variable names match code exactly |

**Verification**:
- Build completes successfully (green checkmark)
- You get a deployment URL like `securedealai-xxx.vercel.app`

---

### Step 6: Configure Production Domain (Optional)

**Time**: 10 minutes

#### 6.1 Using Vercel's Free Subdomain

Your project automatically gets: `your-project.vercel.app`

To customize:
1. Go to **Project Settings** → **Domains**
2. Edit the default subdomain if desired

#### 6.2 Using Custom Domain

1. Go to **Project Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `app.securedeal.ai`)
4. Vercel will show DNS configuration:

**For root domain (securedeal.ai):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For subdomain (app.securedeal.ai):**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

5. Add these records in your DNS provider (Cloudflare, GoDaddy, etc.)
6. Wait for DNS propagation (5 minutes to 48 hours)
7. Vercel automatically provisions SSL certificate

**Verification**: Domain shows "Valid Configuration" in Vercel dashboard

---

### Step 7: Verify Automatic Deployments

**Time**: 5 minutes

Test that merges to `main` trigger deployments:

1. Create a test branch:
   ```bash
   git checkout -b test/vercel-deployment
   ```

2. Make a small change (e.g., update a comment in `apps/web/src/App.vue`)

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify Vercel deployment"
   git push -u origin test/vercel-deployment
   ```

4. Create a Pull Request on GitHub

5. **Check Vercel Preview**:
   - Vercel automatically comments on the PR with a preview URL
   - Click the preview link to verify the change

6. Merge the PR to `main`

7. **Check Production Deployment**:
   - Go to Vercel dashboard → Deployments
   - New deployment should appear and complete
   - Visit production URL to verify

**Verification**:
- PR has Vercel preview comment
- Production updates after merge

---

### Step 8: Configure Deployment Settings (Optional)

**Time**: 5 minutes

Fine-tune deployment behavior:

1. Go to **Project Settings** → **Git**

#### Ignored Build Step (Save Build Minutes)

Only rebuild when frontend files change:

1. Find **"Ignored Build Step"**
2. Set to **"Custom"**
3. Enter command:
   ```bash
   git diff --quiet HEAD^ HEAD -- .
   ```

This skips builds when only non-frontend files change (like docs).

#### Production Branch

1. Verify **Production Branch** is set to `main`

#### Preview Branches

1. Set which branches get preview deployments
2. Recommended: All branches (default)

---

## Option B: GitHub Actions Integration (Alternative)

Use this if you need deployments to go through your existing CI pipeline.

### Prerequisites

- [ ] Vercel account created
- [ ] Vercel CLI installed locally
- [ ] GitHub repository secrets access

---

### Step 1: Install and Configure Vercel CLI

**Time**: 5 minutes

```bash
# Install globally
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to frontend directory
cd apps/web

# Link to Vercel project
vercel link
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Select your account/team
- Link to existing project? **No** (or Yes if created via dashboard)
- Project name? `securedealai-frontend`
- Directory? `./` (current directory, which is apps/web)

**Verification**: `.vercel` folder created with `project.json`

---

### Step 2: Get Vercel Credentials

**Time**: 3 minutes

#### 2.1 Get API Token

1. Go to [https://vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **"Create"**
3. Name: `github-actions-deploy`
4. Scope: Full Account (or specific project)
5. Click **"Create Token"**
6. **Copy the token immediately** (shown only once)

#### 2.2 Get Project IDs

```bash
# From apps/web directory
cat .vercel/project.json
```

Output:
```json
{
  "orgId": "team_xxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxx"
}
```

Save both values.

---

### Step 3: Add GitHub Secrets

**Time**: 3 minutes

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | The API token from Step 2.1 |
| `VERCEL_ORG_ID` | The `orgId` from project.json |
| `VERCEL_PROJECT_ID` | The `projectId` from project.json |

**Verification**: All three secrets appear in the repository secrets list

---

### Step 4: Create GitHub Actions Workflow

**Time**: 5 minutes

Create file `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths:
      - 'apps/web/**'
      - '.github/workflows/deploy-frontend.yml'

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    name: Deploy to Vercel Production
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/web

      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/web

      - name: Deploy to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "deployment_url=$url" >> $GITHUB_OUTPUT
        working-directory: apps/web

      - name: Comment Deployment URL
        run: |
          echo "### 🚀 Deployed to Vercel" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Production URL:** ${{ steps.deploy.outputs.deployment_url }}" >> $GITHUB_STEP_SUMMARY
```

---

### Step 5: Create Preview Deployment Workflow (Optional)

**Time**: 5 minutes

For PR preview deployments, create `.github/workflows/preview-frontend.yml`:

```yaml
name: Preview Frontend on Vercel

on:
  pull_request:
    paths:
      - 'apps/web/**'

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  preview:
    name: Deploy Preview
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/web

      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: apps/web

      - name: Deploy Preview to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "preview_url=$url" >> $GITHUB_OUTPUT
        working-directory: apps/web

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `### 🔍 Preview Deployment Ready!\n\n**Preview URL:** ${{ steps.deploy.outputs.preview_url }}\n\nThis preview will be updated with each push to this PR.`
            })
```

---

### Step 6: Commit and Test

**Time**: 5 minutes

```bash
# Add the workflow file(s)
git add .github/workflows/deploy-frontend.yml
git add .github/workflows/preview-frontend.yml  # if created

# Commit
git commit -m "ci: add Vercel deployment workflows"

# Push to trigger deployment
git push origin main
```

**Verification**:
- Go to GitHub → Actions tab
- See "Deploy Frontend to Vercel" workflow running
- Workflow completes successfully
- Deployment URL appears in workflow summary

---

## Post-Setup Checklist

After completing either option, verify everything works:

- [x] Production deployment accessible at Vercel URL
- [x] App loads without console errors
- [x] Supabase connection works (test a feature that uses the database)
- [x] Preview deployments work for PRs
- [ ] Custom domain configured (if applicable) - *Optional*
- [x] SSL certificate active (https works)

---

## Troubleshooting Guide

### Build Failures

**Error: `vue-tsc` fails with type errors**
```
Solution: Fix TypeScript errors locally before pushing
Run: cd apps/web && npm run build
```

**Error: `Cannot find module`**
```
Solution: Ensure package-lock.json is committed
Run: git add package-lock.json && git commit -m "fix: add lockfile"
```

**Error: Environment variable undefined**
```
Solution:
1. Check variable name matches exactly (case-sensitive)
2. Prefix with VITE_ for Vite projects
3. Redeploy after adding variables
```

### Deployment Issues

**Preview deployments not appearing on PRs**
```
Solution (Option A): Check Vercel GitHub App permissions
Solution (Option B): Verify VERCEL_TOKEN has correct scope
```

**Production not updating after merge**
```
Solution:
1. Check "Ignored Build Step" settings
2. Verify production branch is set to 'main'
3. Check Vercel dashboard for deployment errors
```

### Domain Issues

**DNS not resolving**
```
Solution:
1. Wait up to 48 hours for propagation
2. Verify DNS records match Vercel's instructions exactly
3. Use nslookup or dig to check propagation:
   dig app.securedeal.ai
```

**SSL certificate pending**
```
Solution:
1. DNS must resolve correctly first
2. Vercel auto-provisions after DNS is valid
3. Usually takes 5-15 minutes after DNS propagates
```

---

## Quick Reference

### Vercel Dashboard Links
- **Deployments**: `https://vercel.com/[username]/[project]/deployments`
- **Settings**: `https://vercel.com/[username]/[project]/settings`
- **Environment Variables**: `https://vercel.com/[username]/[project]/settings/environment-variables`
- **Domains**: `https://vercel.com/[username]/[project]/settings/domains`

### Useful Commands

```bash
# Check Vercel CLI version
vercel --version

# List deployments
vercel ls

# Get deployment logs
vercel logs [deployment-url]

# Rollback to previous deployment
vercel rollback

# Check current linked project
cat .vercel/project.json
```

---

## Related Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel + Vite Guide](https://vercel.com/guides/deploying-vite-to-vercel)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---

## Completion Sign-off

| Step | Completed | Date | Notes |
|------|-----------|------|-------|
| Option A or B chosen | ✅ | 2026-01-04 | Option A (Direct Vercel-GitHub Integration) |
| Vercel account created | ✅ | 2026-01-04 | jakubstrouhal's projects (Hobby tier) |
| Project imported/linked | ✅ | 2026-01-04 | StrouhalAAA/SecureDealAI → apps/web |
| Environment variables set | ✅ | 2026-01-04 | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| Initial deployment successful | ✅ | 2026-01-04 | Project: secure-deal-ai-web |
| Preview deployments working | ✅ | 2026-01-04 | Auto-enabled via Vercel GitHub integration |
| Custom domain configured | ☐ | | Optional - can be added later |
| Post-setup checklist complete | ✅ | 2026-01-04 | |

---

## Deployment Details

- **Vercel Project**: `secure-deal-ai-web`
- **Production URL**: `https://secure-deal-ai-web.vercel.app` (or assigned subdomain)
- **GitHub Repo**: `StrouhalAAA/SecureDealAI`
- **Root Directory**: `apps/web`
- **Framework**: Vite (Vue 3)
- **Branch**: `main` → Production

---

*Document created by Claude Code on 2026-01-04*
*Completed on 2026-01-04*
