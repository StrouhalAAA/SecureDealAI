# ADWS Reference Guide

> **AI Developer Workflow System** for SecureDealAI
>
> This document describes all available methods for running agentic workflows in the SecureDealAI project.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Workflow Options Overview](#workflow-options-overview)
3. [Python Scripts (Terminal)](#python-scripts-terminal)
   - [run_issue.py](#1-run_issuepy---github-issue-driven-execution)
   - [run_task.py](#2-run_taskpy---task-id-based-execution)
   - [run_phase.py](#3-run_phasepy---batch-phase-execution)
4. [Slash Commands (Claude Code)](#slash-commands-claude-code)
   - [/issue](#1-issue---issue-driven-workflow)
   - [/implement](#2-implement---plan-execution)
   - [/feature](#3-feature---feature-planning)
   - [/bug](#4-bug---bug-fix-planning)
   - [/commit](#5-commit---git-commit)
   - [/pull_request](#6-pull_request---create-pr)
5. [When to Use What](#when-to-use-what)
6. [State & Logging](#state--logging)
7. [Environment Setup](#environment-setup)
8. [Changelog](#changelog)

---

## Quick Start

```bash
# Most common: Execute a plan with GitHub issue tracking
uv run ADWS/run_issue.py https://github.com/StrouhalAAA/SecureDealAI/issues/4 docs/implementation/plan.md

# Preview what would happen (dry run)
uv run ADWS/run_issue.py --dry-run https://github.com/.../issues/4 docs/plan.md

# Inside Claude Code: Use slash commands
/issue https://github.com/StrouhalAAA/SecureDealAI/issues/4 docs/implementation/plan.md
/implement docs/implementation/plan.md --issue https://github.com/.../issues/4
```

---

## Workflow Options Overview

| Method | Entry Point | Best For | GitHub Integration |
|--------|-------------|----------|-------------------|
| `run_issue.py` | Terminal | **Recommended**: Full automation with issue tracking | Full (comments, labels) |
| `run_task.py` | Terminal | Implementation tracker tasks (01_01, 02_06, etc.) | Optional (--issue N) |
| `run_phase.py` | Terminal | Batch execution of entire phases | None |
| `/issue` | Claude Code | Interactive issue-driven workflow | Full (comments, labels) |
| `/implement` | Claude Code | Execute any plan file | Optional (--issue flag) |
| `/feature` | Claude Code | Create new feature plans | None |
| `/bug` | Claude Code | Create bug fix plans | None |

---

## Python Scripts (Terminal)

### 1. `run_issue.py` - GitHub Issue-Driven Execution

**Purpose**: Execute an implementation plan while tracking progress on a GitHub issue. Posts comments at start and completion, updates labels, and provides full audit trail.

**When to Use**:
- You have a GitHub issue that describes the work
- You want automated progress tracking
- You need an audit trail of what was implemented
- Working on features, bugs, or tasks linked to issues

**Usage**:
```bash
uv run ADWS/run_issue.py <github_issue_url> <plan_file_path> [options]
```

**Options**:
| Option | Description |
|--------|-------------|
| `--dry-run` | Preview what would happen without executing |
| `--no-comment` | Execute without posting GitHub comments |
| `--resume <ADW_ID>` | Resume a previous workflow by its ADW ID |

**Examples**:
```bash
# Standard execution with full GitHub integration
uv run ADWS/run_issue.py https://github.com/StrouhalAAA/SecureDealAI/issues/4 docs/implementation/Completed/01_00_TEST_INFRASTRUCTURE.md

# Preview without executing
uv run ADWS/run_issue.py --dry-run https://github.com/StrouhalAAA/SecureDealAI/issues/4 docs/implementation/plan.md

# Execute without posting comments (useful for testing)
uv run ADWS/run_issue.py --no-comment https://github.com/.../issues/4 docs/plan.md

# Resume a failed workflow
uv run ADWS/run_issue.py --resume a1b2c3d4 https://github.com/.../issues/4 docs/plan.md
```

**What Happens**:
1. Parses issue URL and validates plan file exists
2. Fetches issue details from GitHub
3. Posts "[ADWS-BOT] Started" comment
4. Adds "in-progress" label
5. Executes `/implement` with the plan
6. Posts completion/failure comment
7. Updates labels (removes "in-progress", adds "ready-for-review")

---

### 2. `run_task.py` - Task ID-Based Execution

**Purpose**: Execute a task from the implementation tracker using its task ID (e.g., `02_06`). Handles dependency checking and tracker updates.

**When to Use**:
- Following the structured implementation tracker
- Tasks have defined dependencies
- You want automatic tracker updates
- Working through MVP phases systematically

**Usage**:
```bash
uv run ADWS/run_task.py <task_id> [options]
```

**Task ID Format**: `XX_YY` where `XX` is phase, `YY` is task number
- `01_01` = Phase 1, Task 1 (Database Schema)
- `02_06` = Phase 2, Task 6 (OCR Extract Mistral)
- `03_09` = Phase 3, Task 9 (Detail Page)

**Options**:
| Option | Description |
|--------|-------------|
| `--dry-run` | Preview what would happen |
| `--resume` | Resume from last saved state |
| `--skip-deps` | Skip dependency checking |
| `--issue N` | Link to GitHub issue number |

**Examples**:
```bash
# Run OCR Extract task
uv run ADWS/run_task.py 02_06

# Preview with dependency info
uv run ADWS/run_task.py 02_06 --dry-run

# Skip dependencies (use with caution)
uv run ADWS/run_task.py 02_06 --skip-deps

# Link to GitHub issue
uv run ADWS/run_task.py 02_06 --issue 5

# Resume interrupted task
uv run ADWS/run_task.py 02_06 --resume
```

**What Happens**:
1. Finds plan file for task ID (e.g., `docs/implementation/02_06_OCR_EXTRACT_MISTRAL.md`)
2. Checks if dependencies are met
3. Initializes workflow state with unique ADW ID
4. Executes `/implement` with the plan
5. Updates implementation tracker on completion

---

### 3. `run_phase.py` - Batch Phase Execution

**Purpose**: Run all tasks in a phase with automatic dependency ordering (topological sort).

**When to Use**:
- Starting a new MVP phase
- Batch implementation of related tasks
- Ensuring correct execution order

**Usage**:
```bash
uv run ADWS/run_phase.py <phase_number> [options]
```

**Options**:
| Option | Description |
|--------|-------------|
| `--dry-run` | Preview task order without executing |
| `--skip-completed` | Skip already completed tasks |
| `--continue` | Continue after task failure |
| `--skip-deps` | Skip dependency validation |

**Examples**:
```bash
# Run all Phase 1 tasks
uv run ADWS/run_phase.py 1

# Preview Phase 2 execution order
uv run ADWS/run_phase.py 2 --dry-run

# Run Phase 2, skipping completed tasks
uv run ADWS/run_phase.py 2 --skip-completed

# Continue even if a task fails
uv run ADWS/run_phase.py 3 --continue
```

**Phase Reference**:
| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 01_00 - 01_04 | Infrastructure (DB, Storage, Config) |
| 2 | 02_01 - 02_09 | Backend (Edge Functions, APIs) |
| 3 | 03_01 - 03_10 | Frontend (Vue Components, Pages) |
| 4 | 04_01 - 04_02 | Testing & Polish |

---

## Slash Commands (Claude Code)

### 1. `/issue` - Issue-Driven Workflow

**Purpose**: Execute an implementation plan while tracking progress on a GitHub issue. The Claude Code equivalent of `run_issue.py`.

**When to Use**:
- Working interactively in Claude Code
- Want to see Claude's reasoning during execution
- Need to intervene or adjust during implementation

**Format**:
```
/issue <github_issue_url> <plan_file_path>
```

**Examples**:
```
/issue https://github.com/StrouhalAAA/SecureDealAI/issues/4 docs/implementation/Completed/01_00_TEST_INFRASTRUCTURE.md

/issue https://github.com/owner/repo/issues/123 specs/feature-auth.md
```

**What Happens**:
1. Parses arguments (issue URL + plan path)
2. Fetches issue via `gh issue view`
3. Posts start comment to issue
4. Reads and executes implementation plan
5. Runs validation commands
6. Posts completion comment
7. Updates issue labels

---

### 2. `/implement` - Plan Execution

**Purpose**: Execute any implementation plan file, optionally with GitHub issue tracking.

**When to Use**:
- You have a plan file and want to execute it
- Don't need (or want optional) GitHub integration
- Quick implementation without full ceremony

**Format**:
```
/implement <plan_file> [--issue <github_issue_url>]
```

**Examples**:
```
# Execute without issue tracking
/implement docs/implementation/Completed/01_00_TEST_INFRASTRUCTURE.md

# Execute with issue tracking
/implement docs/implementation/plan.md --issue https://github.com/owner/repo/issues/4
```

**What Happens**:
1. Reads plan file
2. If `--issue` provided: fetches issue, posts start comment
3. Executes each step in the plan
4. Runs validation commands
5. If `--issue` provided: posts completion comment
6. Reports results

---

### 3. `/feature` - Feature Planning

**Purpose**: Create a structured implementation plan for a new feature.

**When to Use**:
- Starting a new feature from scratch
- Need a spec file before implementation
- Want structured planning output

**Format**:
```
/feature <feature_description>
```

**Example**:
```
/feature Add user authentication with email/password login
```

**Output**: Creates plan file in `specs/` directory

---

### 4. `/bug` - Bug Fix Planning

**Purpose**: Analyze a bug and create a fix plan with root cause analysis.

**When to Use**:
- Investigating a reported bug
- Need systematic analysis before fixing
- Want documented fix approach

**Format**:
```
/bug <bug_description>
```

**Example**:
```
/bug Validation results not showing correct status for vendor ICO mismatch
```

**Output**: Creates plan file in `specs/` directory

---

### 5. `/commit` - Git Commit

**Purpose**: Create a well-formatted git commit with conventional commit format.

**When to Use**:
- After implementing changes
- Want consistent commit messages
- Following conventional commits spec

**Format**:
```
/commit [context]
```

**Example**:
```
/commit Added GitHub integration to ADWS
```

---

### 6. `/pull_request` - Create PR

**Purpose**: Create a GitHub pull request with structured description.

**When to Use**:
- After completing a feature/fix
- Ready for code review
- Want structured PR description

**Format**:
```
/pull_request [context]
```

---

## When to Use What

### Decision Tree

```
Start Here
    │
    ▼
Do you have a GitHub issue?
    │
    ├─ YES ──► Is it interactive (Claude Code)?
    │              │
    │              ├─ YES ──► /issue <url> <plan>
    │              │
    │              └─ NO  ──► uv run run_issue.py <url> <plan>
    │
    └─ NO  ──► Do you have a task ID (01_01, 02_06)?
                   │
                   ├─ YES ──► uv run run_task.py <task_id>
                   │
                   └─ NO  ──► Do you have a plan file?
                                  │
                                  ├─ YES ──► /implement <plan>
                                  │
                                  └─ NO  ──► /feature or /bug to create one
```

### Use Case Summary

| Scenario | Recommended Method |
|----------|-------------------|
| **New feature with GitHub issue** | `run_issue.py` or `/issue` |
| **Bug fix with GitHub issue** | `run_issue.py` or `/issue` |
| **Following MVP implementation tracker** | `run_task.py` with task ID |
| **Batch executing entire phase** | `run_phase.py` |
| **Quick implementation without issue** | `/implement` |
| **Need to create a plan first** | `/feature` or `/bug` |
| **Interactive debugging/development** | `/issue` or `/implement` in Claude Code |
| **Automated CI/CD pipeline** | `run_issue.py` with `--no-comment` |

---

## State & Logging

### ADW ID

Every workflow run gets a unique 8-character identifier (e.g., `a1b2c3d4`).

**Used for**:
- Tracking workflow state
- Log organization
- GitHub comment identification
- Resume capability

### State File

Located at `agents/{adw_id}/adw_state.json`:

```json
{
  "adw_id": "a1b2c3d4",
  "task_id": "02_06",
  "plan_file": "docs/implementation/02_06_OCR.md",
  "status": "in_progress",
  "issue_number": 4,
  "issue_url": "https://github.com/.../issues/4",
  "repo_path": "StrouhalAAA/SecureDealAI",
  "started_at": "2026-01-04T10:00:00",
  "validation_results": []
}
```

### Log Files

```
agents/
└── a1b2c3d4/                    # Unique ADW ID
    ├── adw_state.json           # Workflow state
    ├── run_issue/
    │   └── execution.log        # Detailed log for run_issue.py
    ├── run_task/
    │   └── execution.log        # Detailed log for run_task.py
    └── implementor/
        └── raw_output.jsonl     # Claude Code session output
```

---

## Environment Setup

### Required for GitHub Integration

```bash
# Option 1: Use gh CLI authentication (recommended)
gh auth login

# Option 2: Set personal access token
export GITHUB_PAT="ghp_xxxxxxxxxxxx"
```

### Required for Claude Code

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Optional

```bash
# Custom Claude Code path
export CLAUDE_CODE_PATH="claude"

# Repository URL (auto-detected from git remote)
export GITHUB_REPO_URL="https://github.com/StrouhalAAA/SecureDealAI"
```

### SecureDealAI-Specific

See `.env` file:
```bash
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

---

## File Structure

```
ADWS/
├── run_issue.py          # GitHub issue-driven execution
├── run_task.py           # Task ID-based execution
├── run_phase.py          # Batch phase execution
├── REFERENCE.md          # This file
├── ADWS_IMPLEMENTATION_PLAN.md  # System architecture
└── adw_modules/
    ├── __init__.py
    ├── agent.py          # Claude CLI wrapper
    ├── data_types.py     # Type definitions (incl. GitHub types)
    ├── github.py         # GitHub operations (fetch, comment, labels)
    ├── state.py          # Workflow state management
    ├── task_parser.py    # Implementation plan parser
    └── utils.py          # Utility functions

.claude/commands/
├── issue.md              # /issue slash command
├── implement.md          # /implement slash command (with --issue)
├── feature.md            # /feature planning command
├── bug.md                # /bug planning command
├── commit.md             # /commit git command
├── pull_request.md       # /pull_request command
└── learn.md              # /learn documentation command
```

---

## Changelog

### 2026-01-04 - GitHub Integration Release

**Added**:
- `run_issue.py` - New entry point for GitHub issue-driven execution
- `adw_modules/github.py` - GitHub operations module (fetch, comment, labels)
- `/issue` slash command - Claude Code equivalent of run_issue.py
- `--issue` flag for `/implement` command - Optional GitHub tracking
- GitHub types in `data_types.py` (GitHubIssue, GitHubUser, GitHubComment, etc.)
- `issue_url` and `repo_path` fields in ADWStateData

**Modified**:
- `implement.md` - Complete rewrite with `--issue` flag support
- `state.py` - Added issue_url and repo_path to valid_fields
- `data_types.py` - Made task_id and phase optional for issue-based runs

**Features**:
- Automatic start/completion comments on GitHub issues
- Label management (in-progress → ready-for-review)
- Bot identifier `[ADWS-BOT]` to prevent webhook loops
- Graceful degradation when `gh` CLI unavailable
- Dry-run mode for all scripts

### 2025-12-XX - Initial ADWS Setup

**Added**:
- `run_task.py` - Task ID-based execution
- `run_phase.py` - Batch phase execution
- Core modules: agent.py, state.py, task_parser.py, utils.py
- Basic slash commands: implement, feature, bug, commit, pull_request

---

## Troubleshooting

### "GitHub CLI (gh) not installed"

```bash
# macOS
brew install gh

# Then authenticate
gh auth login
```

### "Could not fetch issue"

1. Check the issue URL format: `https://github.com/owner/repo/issues/NUMBER`
2. Verify you're authenticated: `gh auth status`
3. Check repository access permissions

### "Plan file not found"

- Use relative path from project root: `docs/implementation/plan.md`
- Or use absolute path: `/Users/.../SecureDealAI/docs/implementation/plan.md`

### "Dependencies not met"

Use `--skip-deps` to bypass, or run the required tasks first:
```bash
uv run ADWS/run_task.py 02_06 --skip-deps
```

---

> **Note**: This reference covers the SecureDealAI-specific ADWS implementation. For the original AgenticCoding reference, see `AgenticCoding/adws/README.md`.
