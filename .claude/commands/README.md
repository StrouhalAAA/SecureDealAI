# Claude Code Commands

Slash commands organized by category. Use `/category/command` format to invoke.

## Categories

### `/planning/` - Create specs before implementation
| Command | Usage | Description |
|---------|-------|-------------|
| `feature` | `/planning/feature <description>` | Plan a new feature |
| `bug` | `/planning/bug <description>` | Plan a bug fix with root cause analysis |
| `chore` | `/planning/chore <description>` | Plan maintenance/refactoring work |

### `/execution/` - Run implementation workflows
| Command | Usage | Description |
|---------|-------|-------------|
| `implement` | `/execution/implement <plan.md> [--issue <url>]` | Execute a plan file |
| `issue` | `/execution/issue <github_url> <plan.md>` | Execute with GitHub issue tracking |

### `/git/` - Version control operations
| Command | Usage | Description |
|---------|-------|-------------|
| `commit` | `/git/commit [context]` | Create a conventional commit |
| `new-branch` | `/git/new-branch <description>` | Create and push a new branch |
| `pull_request` | `/git/pull_request [context]` | Create a pull request |

### `/analysis/` - Codebase understanding
| Command | Usage | Description |
|---------|-------|-------------|
| `prime` | `/analysis/prime` | Prime context with codebase overview |
| `learn` | `/analysis/learn <file>` | Generate explanation for AgenticCoding concepts |

## Quick Reference

```bash
# Planning workflow
/planning/feature Add user authentication with OAuth
/planning/bug Validation fails when vendor ICO is empty
/planning/chore Cleanup unused imports across frontend

# Execution workflow
/execution/implement specs/feature-auth.md
/execution/issue https://github.com/owner/repo/issues/4 specs/feature-auth.md

# Git workflow
/git/new-branch Add OAuth authentication
/git/commit
/git/pull_request

# Analysis
/analysis/prime
/analysis/learn ADWS/adw_modules/state.py
```

## Output Locations

| Command Type | Output Location |
|--------------|-----------------|
| Planning commands | `specs/*.md` |
| Learn command | `ADWS/Explained/*.md` |
| Git commands | Git repository |
