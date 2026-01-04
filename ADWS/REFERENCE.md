# ADWS Reference Guide

This document provides guidance for starting new implementations in the SecureDealAI project. Use this as a reference when working with features, bugs, and the ADWS workflow system.

---

## Current Setup Overview

### Your `.claude/` Folder

| Component | Description |
|-----------|-------------|
| `agents/implementation-planner.md` | Creates detailed implementation plans (Opus model) |
| `agents/supabase-expert.md` | Supabase/PostgreSQL expert (Opus model) |
| **No commands/** | No slash commands currently defined |

### AgenticCoding Reference (copied from external project)

| Component | Count | Purpose |
|-----------|-------|---------|
| Commands | 23 files | Full developer workflow automation |
| ADWS Python scripts | 14 files | GitHub issue to PR automation |
| E2E test templates | 5 files | Browser automation tests |

---

## AgenticCoding Command Reference

### Planning Commands

| Command | File | Purpose |
|---------|------|---------|
| `/feature` | `feature.md` | Create structured plan for new features |
| `/bug` | `bug.md` | Root cause analysis + fix plan for bugs |
| `/chore` | `chore.md` | Maintenance/refactoring tasks |
| `/patch` | `patch.md` | Quick targeted patches |

### Classification Commands

| Command | File | Purpose |
|---------|------|---------|
| `/classify_adw` | `classify_adw.md` | Extract ADW workflow from text |
| `/classify_issue` | `classify_issue.md` | Classify issue type (feature/bug/chore) |

### Implementation Commands

| Command | File | Purpose |
|---------|------|---------|
| `/implement` | `implement.md` | Execute a plan file |

### Testing Commands

| Command | File | Purpose |
|---------|------|---------|
| `/test` | `test.md` | Run comprehensive test suite |
| `/test_e2e` | `test_e2e.md` | Run E2E browser tests |
| `/resolve_failed_test` | `resolve_failed_test.md` | Auto-fix failing tests |
| `/resolve_failed_e2e_test` | `resolve_failed_e2e_test.md` | Auto-fix failing E2E tests |

### Quality Commands

| Command | File | Purpose |
|---------|------|---------|
| `/review` | `review.md` | Review implementation against spec with screenshots |

### Documentation Commands

| Command | File | Purpose |
|---------|------|---------|
| `/document` | `document.md` | Generate comprehensive documentation |
| `/conditional_docs` | `conditional_docs.md` | Check if additional docs are needed |

### Git Operations

| Command | File | Purpose |
|---------|------|---------|
| `/commit` | `commit.md` | Create formatted commit |
| `/pull_request` | `pull_request.md` | Create pull request |
| `/generate_branch_name` | `generate_branch_name.md` | Generate semantic branch name |

### Utilities

| Command | File | Purpose |
|---------|------|---------|
| `/start` | `start.md` | Start the application |
| `/prepare_app` | `prepare_app.md` | Prepare app for testing/review |
| `/prime` | `prime.md` | Prime context |
| `/install` | `install.md` | Install dependencies |
| `/tools` | `tools.md` | List available tools |

---

## ADWS Python Scripts

The ADW (AI Developer Workflow) system automates the full software development lifecycle.

### Workflow Pipeline

```
GitHub Issue → Plan → Build → Test → Review → Document → PR
```

### Individual Phase Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `adw_plan.py` | Generate implementation plan | `uv run adw_plan.py <issue-number>` |
| `adw_build.py` | Implement the plan | `uv run adw_build.py <issue-number> <adw-id>` |
| `adw_test.py` | Run and auto-fix tests | `uv run adw_test.py <issue-number> <adw-id>` |
| `adw_review.py` | Review implementation vs spec | `uv run adw_review.py <issue-number> <adw-id>` |
| `adw_document.py` | Generate documentation | `uv run adw_document.py <issue-number> <adw-id>` |
| `adw_patch.py` | Quick targeted patches | `uv run adw_patch.py <issue-number>` |

### Orchestrator Scripts

| Script | Phases Included | Usage |
|--------|-----------------|-------|
| `adw_plan_build.py` | Plan + Build | `uv run adw_plan_build.py <issue-number>` |
| `adw_plan_build_test.py` | Plan + Build + Test | `uv run adw_plan_build_test.py <issue-number>` |
| `adw_plan_build_review.py` | Plan + Build + Review | `uv run adw_plan_build_review.py <issue-number>` |
| `adw_plan_build_test_review.py` | Plan + Build + Test + Review | `uv run adw_plan_build_test_review.py <issue-number>` |
| `adw_plan_build_document.py` | Plan + Build + Document | `uv run adw_plan_build_document.py <issue-number>` |
| `adw_sdlc.py` | Complete SDLC (all phases) | `uv run adw_sdlc.py <issue-number>` |

### ADW Concepts

**ADW ID**: Unique 8-character identifier for each workflow run (e.g., `a1b2c3d4`)
- Tracks all phases of a workflow
- Creates isolated workspace at `agents/{adw_id}/`
- Appears in commits, PRs, and GitHub comments

**State Management**: Persistent state in `agents/{adw_id}/adw_state.json`
- Enables workflow chaining via pipes
- Tracks: `adw_id`, `issue_number`, `branch_name`, `plan_file`, `issue_class`

---

## Decision Guide: When to Use What

### Starting a New Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Is it Supabase-related?                                    │
│  → Use supabase-expert agent                                │
│    (RLS policies, Edge Functions, migrations, queries)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Is it complex architecture/planning?                       │
│  → Use implementation-planner agent                         │
│    (Multi-component features, OCR integration, discovery)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Is it a standard feature or bug?                           │
│  → Use /feature or /bug command (when adapted)              │
│    (Structured plan with spec file output)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Execute the plan                                            │
│  → Use /implement <plan-file>                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Validate and commit                                         │
│  → /test → /commit → /pull_request                          │
└─────────────────────────────────────────────────────────────┘
```

### Agent vs Command Comparison

| Aspect | Agents | Commands |
|--------|--------|----------|
| **Style** | Conversational, interactive | Templated, structured |
| **Output** | `MVPScope/ImplementationPlan/` | `specs/` directory |
| **Best for** | Complex discovery, architecture | Standard features, GitHub integration |
| **Model** | Opus (configured) | Inherits from session |

### When to Use Each Agent

**supabase-expert**:
- Database schema design
- RLS policy creation/debugging
- Edge Function development
- Migration creation
- Query optimization
- Real-time subscription setup

**implementation-planner**:
- New feature architecture
- Multi-component implementation plans
- OCR/Mistral integration
- Discovery phases
- Cross-cutting concerns

---

## SecureDealAI-Specific Adaptations

### Test Commands Adaptation

The AgenticCoding commands use `uv run pytest` and `bun`. For SecureDealAI:

| Original | SecureDealAI Equivalent |
|----------|------------------------|
| `cd app/server && uv run pytest` | `npm run test:db` |
| `cd app/client && bun tsc --noEmit` | `cd apps/web && npm run build` |
| `cd app/client && bun run build` | `cd apps/web && npm run build` |

### Validation Commands for SecureDealAI

```bash
# Database connection test
npm run test:db

# Local Supabase
supabase start
supabase functions serve validation-run --env-file supabase/.env.local

# Edge Function deployment
supabase functions deploy validation-run

# Frontend
cd apps/web && npm run build
```

### Project Structure Mapping

| AgenticCoding | SecureDealAI |
|---------------|--------------|
| `app/server/` | `supabase/functions/` |
| `app/client/` | `apps/web/` |
| `specs/` | `MVPScope/ImplementationPlan/` or `specs/` |
| `adws/` | `ADWS/` or `AgenticCoding/adws/` |

---

## Quick Start Checklist

### For New Features

1. [ ] Identify if it's Supabase-heavy → consider `supabase-expert` agent
2. [ ] Identify if it needs architecture → use `implementation-planner` agent
3. [ ] Create implementation plan (agent or `/feature` command)
4. [ ] Execute plan with `/implement` or manual implementation
5. [ ] Run tests: `npm run test:db`
6. [ ] Create commit with semantic message
7. [ ] Create PR

### For Bug Fixes

1. [ ] Reproduce the bug
2. [ ] Use `/bug` command or analyze root cause manually
3. [ ] Create minimal fix plan
4. [ ] Implement fix
5. [ ] Verify fix with tests
6. [ ] Commit and PR

### Environment Variables Required

For ADWS automation:
```bash
export GITHUB_REPO_URL="https://github.com/owner/SecureDealAI"
export ANTHROPIC_API_KEY="sk-ant-..."
export CLAUDE_CODE_PATH="claude"  # Optional
export GITHUB_PAT="ghp_..."       # Optional, if different from gh auth
```

For SecureDealAI:
```bash
# See .env file
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

---

## File Locations

| Resource | Location |
|----------|----------|
| This reference | `ADWS/REFERENCE.md` |
| Your agents | `.claude/agents/` |
| AgenticCoding commands | `AgenticCoding/.claude/commands/` |
| ADWS Python scripts | `AgenticCoding/adws/` |
| Implementation plans | `MVPScope/ImplementationPlan/` |
| Architecture docs | `docs/architecture/` |
| Project instructions | `CLAUDE.md` |
