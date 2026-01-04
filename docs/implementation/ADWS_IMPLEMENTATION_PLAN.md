# ADWS Implementation Plan for SecureDealAI

> **Version**: 1.0
> **Created**: 2026-01-03
> **Status**: DRAFT

---

## 1. Executive Summary

This document outlines the plan to implement an AI Developer Workflow System (ADWS) for SecureDealAI, adapted from the AgenticCoding ADW framework. The goal is to automate execution of the 24 pending MVP implementation tasks using Claude Code CLI.

### Key Objectives

1. **Automated Task Execution**: Run implementation plans using `/implement` command
2. **Progress Tracking**: Centralized tracking via `00_IMPLEMENTATION_TRACKER.md`
3. **State Persistence**: Resume interrupted workflows
4. **Validation**: Automated validation command execution
5. **GitHub Integration** (Optional): Issue-based progress tracking

---

## 2. Current State Analysis

### MVPScope Implementation Plans (24 Pending)

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Infrastructure | 4 | All pending |
| Phase 2: Backend API | 8 | 1 complete (2.8), 8 pending |
| Phase 3: Frontend | 10 | All pending |
| Phase 4: Testing | 2 | All pending |

### Key Insight: Pre-Written Plans

Unlike AgenticCoding ADW which generates plans from GitHub issues, SecureDealAI already has detailed implementation plans with:
- Step-by-step instructions
- Code samples
- Validation commands
- Completion checklists

This simplifies the workflow to: **Plan (exists) → Build → Validate**

---

## 3. ADWS Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER / CI                                │
│            uv run run_task.py 02_06 --issue 5                    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RUN_TASK.PY                                 │
│  1. Parse task ID (02_06)                                        │
│  2. Find plan file (MVPScope/ImplementationPlan/02_06_*.md)     │
│  3. Check dependencies (must be complete)                        │
│  4. Generate ADW ID (a1b2c3d4)                                   │
│  5. Initialize state                                             │
│  6. Call Claude /implement                                       │
│  7. Run validation commands                                      │
│  8. Update tracker                                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE CLI                             │
│       claude -p "/implement MVPScope/ImplementationPlan/..."     │
│                     --model opus                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IMPLEMENTATION                               │
│  - Reads plan file                                               │
│  - Executes steps using Read/Write/Bash tools                   │
│  - Creates/modifies files per plan                              │
│  - Runs validation commands                                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STATE & TRACKING                              │
│  - agents/{adw_id}/adw_state.json                               │
│  - 00_IMPLEMENTATION_TRACKER.md (status update)                  │
│  - GitHub issue comment (optional)                              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| `run_task.py` | `adws/` | Main orchestrator |
| `run_phase.py` | `adws/` | Phase runner (batch) |
| `adw_modules/` | `adws/adw_modules/` | Shared modules |
| `/implement` | `.claude/commands/implement.md` | Claude command |
| `/validate` | `.claude/commands/validate.md` | Validation runner |
| State files | `agents/{adw_id}/` | Workflow state |

---

## 4. Components to Copy from AgenticCoding

### 4.1 Core Modules (Required)

| File | Purpose | Modifications |
|------|---------|---------------|
| `agent.py` | Claude CLI wrapper | None (use as-is) |
| `state.py` | State persistence | Add task-specific fields |
| `data_types.py` | Type definitions | Add SecureDealAI types |
| `utils.py` | Utilities | None (use as-is) |

### 4.2 Optional Modules

| File | Purpose | When Needed |
|------|---------|-------------|
| `github.py` | GitHub API | If tracking via issues |
| `git_ops.py` | Git operations | If auto-committing |

### 4.3 Slash Commands to Create

| Command | Purpose | Based On |
|---------|---------|----------|
| `/implement` | Execute plan steps | AgenticCoding version |
| `/validate` | Run validation commands | New |
| `/prime` | Codebase primer | Existing |
| `/bug-plan` | Bug planning | Existing |

### 4.4 Hooks to Add

| Hook | Purpose |
|------|---------|
| `pre_tool_use.py` | Security gate (prevent dangerous ops) |
| `notification.py` | Desktop notifications on completion |

---

## 5. State Schema for SecureDealAI

```json
{
  "adw_id": "a1b2c3d4",
  "task_id": "02_06",
  "task_name": "OCR_EXTRACT_MISTRAL",
  "phase": 2,
  "plan_file": "MVPScope/ImplementationPlan/02_06_OCR_EXTRACT_MISTRAL.md",
  "status": "in_progress",
  "current_step": 3,
  "total_steps": 7,
  "started_at": "2026-01-03T10:00:00Z",
  "completed_at": null,
  "issue_number": 5,
  "validation_results": [
    {"command": "npm run test:db", "passed": true},
    {"command": "supabase functions serve", "passed": false, "error": "..."}
  ],
  "dependencies": ["01_01", "01_04"],
  "dependencies_met": true
}
```

---

## 6. Implementation Steps

### Phase A: Core Infrastructure (Day 1)

#### A.1 Create ADWS Directory Structure

```
adws/
├── README.md              # Already created
├── run_task.py            # Main task runner
├── run_phase.py           # Phase runner
├── update_tracker.py      # Tracker updater
├── check_dependencies.py  # Dependency checker
└── adw_modules/
    ├── __init__.py
    ├── agent.py           # Copy from AgenticCoding
    ├── state.py           # Copy and modify
    ├── data_types.py      # Copy and modify
    ├── utils.py           # Copy from AgenticCoding
    ├── github.py          # Copy (optional)
    └── task_parser.py     # New: parse implementation plans
```

#### A.2 Create Core Slash Commands

**`.claude/commands/implement.md`**:
```markdown
# Implement the following plan

Execute all steps in the plan file provided. After each step, verify the
change was successful before proceeding to the next step.

## Instructions
- Read the plan file carefully
- Execute each "Implementation Step" in order
- If a step fails, stop and report the error
- After completing all steps, run the "Validation Commands"

## Plan
$ARGUMENTS

## Report
- Summarize what was implemented
- List files created/modified
- Report validation command results
```

**`.claude/commands/validate.md`**:
```markdown
# Validate implementation

Run the validation commands from the plan and report results.

## Plan File
$ARGUMENTS

## Instructions
1. Read the plan file
2. Find the "Validation Commands" section
3. Run each command
4. Report pass/fail for each
5. If any fail, describe the failure

## Report Format
- Command: `...`
  - Status: PASS/FAIL
  - Output: ...
```

#### A.3 Create Settings and Hooks

**`.claude/settings.json`** (update existing):
```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(supabase:*)",
      "Bash(uv:*)",
      "Bash(deno:*)",
      "Bash(git:*)",
      "Write"
    ],
    "deny": [
      "Bash(git push --force:*)",
      "Bash(rm -rf:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "uv run $CLAUDE_PROJECT_DIR/.claude/hooks/pre_tool_use.py || true"
          }
        ]
      }
    ]
  }
}
```

### Phase B: Python Modules (Day 1-2)

#### B.1 Copy and Adapt Modules

1. Copy `agent.py` from AgenticCoding (no modifications)
2. Copy `state.py` and add task-specific fields
3. Copy `data_types.py` and add:
   - `TaskState` model for implementation tasks
   - `ValidationResult` model
   - `DependencyStatus` model
4. Copy `utils.py` (no modifications)
5. Create `task_parser.py` to extract metadata from plan files

#### B.2 Create `run_task.py`

```python
#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
Run a single implementation task.

Usage:
  uv run run_task.py 02_06
  uv run run_task.py 02_06 --issue 5
  uv run run_task.py 02_06 --resume
"""

import sys
import argparse
from dotenv import load_dotenv
from adw_modules.agent import execute_template
from adw_modules.state import ADWState
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.utils import make_adw_id, setup_logger
from task_parser import find_plan_file, parse_plan_metadata, check_dependencies


def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Run implementation task")
    parser.add_argument("task_id", help="Task ID (e.g., 02_06)")
    parser.add_argument("--issue", type=int, help="GitHub issue number")
    parser.add_argument("--resume", action="store_true", help="Resume from last state")
    args = parser.parse_args()

    # Find plan file
    plan_file = find_plan_file(args.task_id)
    if not plan_file:
        print(f"Error: Plan file not found for task {args.task_id}")
        sys.exit(1)

    # Parse metadata
    metadata = parse_plan_metadata(plan_file)

    # Check dependencies
    if not check_dependencies(metadata.get("depends_on", [])):
        print(f"Error: Dependencies not met: {metadata['depends_on']}")
        sys.exit(1)

    # Initialize or resume state
    adw_id = make_adw_id()
    logger = setup_logger(adw_id, "run_task")

    if args.resume:
        # Try to find existing state
        # ...implementation
        pass

    state = ADWState(adw_id)
    state.update(
        task_id=args.task_id,
        plan_file=plan_file,
        issue_number=args.issue,
    )
    state.save("init")

    logger.info(f"Starting task: {args.task_id}")
    logger.info(f"ADW ID: {adw_id}")
    logger.info(f"Plan file: {plan_file}")

    # Execute implementation
    request = AgentTemplateRequest(
        agent_name="implementor",
        slash_command="/implement",
        args=[plan_file],
        adw_id=adw_id,
    )

    response = execute_template(request)

    if not response.success:
        logger.error(f"Implementation failed: {response.output}")
        state.update(status="failed")
        state.save("failed")
        sys.exit(1)

    logger.info("Implementation completed successfully")

    # Run validation
    # ...

    # Update tracker
    # ...

    state.update(status="completed")
    state.save("completed")


if __name__ == "__main__":
    main()
```

### Phase C: Integration (Day 2)

#### C.1 GitHub Issue Integration (Optional)

If enabled via `--issue` flag:
1. Create issue if not exists
2. Post progress comments
3. Close issue on completion

#### C.2 Tracker Update

After successful task completion:
1. Parse `00_IMPLEMENTATION_TRACKER.md`
2. Update task status to "Implemented"
3. Update completion percentage

---

## 7. Task Dependency Map

```
Phase 1 (Infrastructure) - No dependencies
├── 01_01 DATABASE_SCHEMA (None)
├── 01_02 SEED_VALIDATION_RULES (01_01)
├── 01_03 STORAGE_BUCKET (None)
└── 01_04 ENVIRONMENT_CONFIG (None)

Phase 2 (Backend) - Depends on Phase 1
├── 02_01 BUYING_OPPORTUNITY_CRUD (01_01)
├── 02_02 VEHICLE_CRUD (01_01)
├── 02_03 VENDOR_CRUD (01_01)
├── 02_04 ARES_LOOKUP (01_04)
├── 02_05 DOCUMENT_UPLOAD (01_03)
├── 02_06 OCR_EXTRACT_MISTRAL (01_04, 02_05)
├── 02_07 ARES_VALIDATE (02_04)
├── 02_08 VALIDATION_RUN_DEPLOY ✅ (COMPLETE)
└── 02_09 VALIDATION_PREVIEW (02_08)

Phase 3 (Frontend) - Depends on Phase 2
├── 03_01 VUEJS_PROJECT_SETUP (None)
├── 03_02 DASHBOARD_PAGE (03_01, 02_01)
├── 03_03 VEHICLE_FORM (03_01)
├── 03_04 VENDOR_FORM (03_01)
├── 03_05 ARES_STATUS (03_01, 02_04)
├── 03_06 DOCUMENT_UPLOAD (03_01, 02_05)
├── 03_07 OCR_STATUS (03_01, 02_06)
├── 03_08 VALIDATION_RESULT (03_01, 02_08)
├── 03_09 DETAIL_PAGE (03_02, 03_03, 03_04)
└── 03_10 VALIDATION_SIDEBAR (03_01, 02_09)

Phase 4 (Testing) - Depends on Phase 3
├── 04_01 E2E_TESTING (all Phase 3)
└── 04_02 ERROR_HANDLING_UX (04_01)
```

---

## 8. Usage Examples

### Run Single Task

```bash
cd adws/

# Run task 01_01 (Database Schema)
uv run run_task.py 01_01

# Run with GitHub issue tracking
uv run run_task.py 01_01 --issue 1

# Resume interrupted task
uv run run_task.py 01_01 --resume
```

### Run Phase

```bash
# Run all Phase 1 tasks in dependency order
uv run run_phase.py 1

# Run all Phase 2 tasks (skips already complete)
uv run run_phase.py 2
```

### Manual GitHub Issue Creation

```bash
# Create issues for all pending tasks
for task in 01_01 01_02 01_03 01_04; do
  gh issue create --title "Task $task" --body "..."
done

# Run all with issue tracking
uv run run_phase.py 1 --create-issues
```

---

## 9. Success Criteria

| Metric | Target |
|--------|--------|
| Task execution success rate | > 80% first attempt |
| Validation pass rate | 100% for completed tasks |
| State recovery | 100% resume capability |
| Dependency enforcement | 100% (never run with unmet deps) |

---

## 10. Implementation Timeline

| Day | Deliverable |
|-----|-------------|
| Day 1 AM | A.1: Directory structure, README |
| Day 1 PM | A.2-A.3: Commands, settings, hooks |
| Day 2 AM | B.1-B.2: Python modules, run_task.py |
| Day 2 PM | C.1-C.2: GitHub integration, tracker updates |
| Day 3 | Testing with Phase 1 tasks |

---

## 11. Files to Create

### New Files

```
SecureDealAI/
├── adws/
│   ├── README.md ✅ (created)
│   ├── run_task.py
│   ├── run_phase.py
│   ├── update_tracker.py
│   ├── check_dependencies.py
│   └── adw_modules/
│       ├── __init__.py
│       ├── agent.py (copy from AgenticCoding)
│       ├── state.py (copy + modify)
│       ├── data_types.py (copy + modify)
│       ├── utils.py (copy)
│       ├── github.py (copy, optional)
│       └── task_parser.py (new)
│
├── .claude/
│   ├── commands/
│   │   ├── implement.md (new)
│   │   ├── validate.md (new)
│   │   ├── prime.md ✅ (exists)
│   │   └── bug-plan.md ✅ (exists)
│   ├── hooks/
│   │   └── pre_tool_use.py (new)
│   └── settings.json (update)
│
└── agents/  (auto-created at runtime)
    └── {adw_id}/
        ├── adw_state.json
        └── implementor/
            └── raw_output.jsonl
```

---

## 12. Next Steps

1. **Approve this plan**
2. Execute Phase A (Core Infrastructure)
3. Execute Phase B (Python Modules)
4. Execute Phase C (Integration)
5. Test with Phase 1 tasks (01_01 through 01_04)
6. Roll out to remaining 20 tasks

---

## Appendix A: Comparison with AgenticCoding ADW

| Aspect | AgenticCoding | SecureDealAI ADWS |
|--------|---------------|-------------------|
| Plan Source | GitHub issues | Pre-written MD files |
| Classification | `/feature`, `/bug`, `/chore` | Not needed (pre-classified) |
| Branch Strategy | New branch per issue | Main branch (or feature branches) |
| PR Creation | Automatic per issue | Optional (single project) |
| Testing Phase | Automatic with retries | Manual (Phase 4) |
| Review Phase | Screenshot + spec comparison | Manual validation |
| Documentation | Auto-generated | Not in MVP scope |

---

## Appendix B: Model Selection

| Task | Model | Rationale |
|------|-------|-----------|
| `/implement` | Opus | Complex multi-file changes |
| `/validate` | Sonnet | Simple command execution |
| `/prime` | Sonnet | Fast codebase exploration |
