#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
Run all tasks in a phase using Claude Code CLI.

Usage:
    uv run run_phase.py 1              # Run all Phase 1 tasks
    uv run run_phase.py 2 --dry-run    # Show what would be done
    uv run run_phase.py 2 --continue   # Continue from last failed task
    uv run run_phase.py 3 --skip-completed  # Skip already completed tasks
    uv run run_phase.py 5 --issue 42   # Run Phase 5, report to GitHub issue #42

Examples:
    # Run Phase 1 (Infrastructure) tasks
    uv run run_phase.py 1

    # Run Phase 2 (Backend) tasks, skipping completed ones
    uv run run_phase.py 2 --skip-completed

    # Run Phase 5 with GitHub issue tracking
    uv run run_phase.py 5 --issue 42
"""

import sys
import os
import argparse
from datetime import datetime
import subprocess

# Add ADWS directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from adw_modules.utils import make_adw_id, setup_logger, get_project_root
from adw_modules.task_parser import (
    get_tasks_for_phase,
    get_completed_tasks_from_tracker,
    check_dependencies,
    get_dependency_map,
)
from adw_modules.github import (
    get_repo_url,
    extract_repo_path,
    post_issue_comment,
    mark_issue_in_progress,
    update_issue_labels,
)


def topological_sort(tasks: list, dep_map: dict) -> list:
    """Sort tasks by dependencies (tasks with fewer deps first)."""
    # Build a set of task IDs we're working with
    task_ids = {t["task_id"] for t in tasks}

    # Filter dependencies to only include tasks in our set
    filtered_deps = {}
    for task in tasks:
        tid = task["task_id"]
        deps = dep_map.get(tid, [])
        # Only include deps that are in our task list
        filtered_deps[tid] = [d for d in deps if d in task_ids]

    # Kahn's algorithm for topological sort
    in_degree = {tid: len(filtered_deps.get(tid, [])) for tid in task_ids}
    queue = [tid for tid in task_ids if in_degree[tid] == 0]
    result = []

    while queue:
        # Sort queue to get consistent ordering
        queue.sort()
        tid = queue.pop(0)
        result.append(tid)

        # Reduce in-degree for dependent tasks
        for other_tid in task_ids:
            if tid in filtered_deps.get(other_tid, []):
                in_degree[other_tid] -= 1
                if in_degree[other_tid] == 0:
                    queue.append(other_tid)

    # Return tasks in sorted order
    task_map = {t["task_id"]: t for t in tasks}
    return [task_map[tid] for tid in result if tid in task_map]


def run_task(task_id: str, dry_run: bool = False, skip_deps: bool = False, issue: int = None) -> bool:
    """Run a single task using run_task.py.

    Args:
        task_id: Task identifier (e.g., "05_01")
        dry_run: If True, only print what would be done
        skip_deps: If True, skip dependency checks
        issue: GitHub issue number for progress reporting

    Returns True if successful.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    run_task_script = os.path.join(script_dir, "run_task.py")

    cmd = ["uv", "run", run_task_script, task_id]
    if skip_deps:
        cmd.append("--skip-deps")
    if issue:
        cmd.extend(["--issue", str(issue)])

    if dry_run:
        print(f"  Would run: {' '.join(cmd)}")
        return True

    print(f"\n{'='*60}")
    print(f"Running task: {task_id}")
    print(f"{'='*60}")

    result = subprocess.run(cmd, cwd=get_project_root())
    return result.returncode == 0


def main():
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Run all tasks in a phase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run run_phase.py 1               Run all Phase 1 tasks
  uv run run_phase.py 2 --dry-run     Show what would be done
  uv run run_phase.py 2 --skip-completed  Skip completed tasks
  uv run run_phase.py 3 --continue    Continue after failure
  uv run run_phase.py 5 --issue 42    Run with GitHub issue tracking
        """
    )
    parser.add_argument("phase", type=int, choices=[1, 2, 3, 4, 5],
                        help="Phase number (1-5)")
    parser.add_argument("--issue", type=int,
                        help="GitHub issue number for progress reporting")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be done")
    parser.add_argument("--skip-completed", action="store_true",
                        help="Skip already completed tasks")
    parser.add_argument("--continue", dest="continue_on_error", action="store_true",
                        help="Continue running tasks after a failure")
    parser.add_argument("--skip-deps", action="store_true",
                        help="Skip dependency checks")
    args = parser.parse_args()

    phase = args.phase
    issue_number = args.issue

    # Setup GitHub integration if --issue provided
    repo_path = None
    if issue_number:
        repo_url = get_repo_url()
        if repo_url:
            repo_path = extract_repo_path(repo_url)
            print(f"GitHub issue tracking enabled: Issue #{issue_number}")
        else:
            print("Warning: Could not determine repository. GitHub comments disabled.")
            issue_number = None

    # Get all tasks for this phase
    tasks = get_tasks_for_phase(phase)
    if not tasks:
        print(f"No tasks found for Phase {phase}")
        sys.exit(1)

    # Sort by dependencies
    dep_map = get_dependency_map()
    tasks = topological_sort(tasks, dep_map)

    # Get completed tasks
    completed = get_completed_tasks_from_tracker()

    # Filter if skip-completed
    if args.skip_completed:
        original_count = len(tasks)
        tasks = [t for t in tasks if t["task_id"] not in completed]
        skipped = original_count - len(tasks)
        if skipped > 0:
            print(f"Skipping {skipped} already completed tasks")

    if not tasks:
        print(f"All tasks in Phase {phase} are already completed!")
        sys.exit(0)

    # Generate phase ADW ID for logging
    phase_adw_id = make_adw_id()
    logger = setup_logger(phase_adw_id, f"run_phase_{phase}")

    logger.info(f"Starting Phase {phase}")
    logger.info(f"Tasks to run: {len(tasks)}")
    logger.info(f"Phase ADW ID: {phase_adw_id}")

    # Print summary
    print(f"\n{'='*60}")
    print(f"Phase {phase} - {len(tasks)} tasks to run")
    print(f"{'='*60}")

    phase_names = {
        1: "Infrastructure Setup",
        2: "Backend API (Edge Functions)",
        3: "Frontend (Vue.js)",
        4: "Testing & Polish",
        5: "Access Code Authentication"
    }
    print(f"Phase: {phase_names.get(phase, 'Unknown')}")
    print(f"\nTasks in execution order:")

    for i, task in enumerate(tasks, 1):
        status = "COMPLETED" if task["task_id"] in completed else "PENDING"
        deps = dep_map.get(task["task_id"], [])
        deps_str = f" (deps: {', '.join(deps)})" if deps else ""
        print(f"  {i}. {task['task_id']} - {task['task_name']} [{status}]{deps_str}")

    if args.dry_run:
        print(f"\n{'='*60}")
        print("DRY RUN - No tasks will be executed")
        print(f"{'='*60}")
        for task in tasks:
            if task["task_id"] not in completed:
                run_task(task["task_id"], dry_run=True, skip_deps=args.skip_deps)
        sys.exit(0)

    # Confirm before running
    print(f"\nThis will run {len(tasks)} tasks.")
    response = input("Continue? [y/N] ")
    if response.lower() != 'y':
        print("Aborted.")
        sys.exit(0)

    # Post start comment to GitHub issue
    if issue_number and repo_path:
        task_list = "\n".join(f"- [ ] `{t['task_id']}` - {t['task_name']}" for t in tasks)
        start_comment = f"""## 🚀 ADWS Phase {phase} Started

**Phase**: {phase_names.get(phase, 'Unknown')}
**ADW ID**: `{phase_adw_id}`
**Tasks to execute**: {len(tasks)}

### Task Checklist
{task_list}

_Progress will be reported as each task completes._"""
        post_issue_comment(issue_number, repo_path, start_comment)
        mark_issue_in_progress(issue_number, repo_path)

    # Run tasks
    failed_tasks = []
    successful_tasks = []

    for i, task in enumerate(tasks, 1):
        task_id = task["task_id"]
        logger.info(f"Running task {i}/{len(tasks)}: {task_id}")

        # Check dependencies (cross-phase)
        if not args.skip_deps:
            current_completed = get_completed_tasks_from_tracker()
            dep_check = check_dependencies(task_id, current_completed)

            if not dep_check["met"]:
                msg = f"Dependencies not met for {task_id}: {dep_check['missing']}"
                logger.warning(msg)
                print(f"\nSkipping {task_id} - dependencies not met: {dep_check['missing']}")
                failed_tasks.append((task_id, "Dependencies not met"))
                if not args.continue_on_error:
                    break
                continue

        success = run_task(task_id, skip_deps=True, issue=issue_number)  # Skip deps since we checked above

        if success:
            successful_tasks.append(task_id)
            logger.info(f"Task {task_id} completed successfully")
        else:
            failed_tasks.append((task_id, "Execution failed"))
            logger.error(f"Task {task_id} failed")

            if not args.continue_on_error:
                print(f"\nTask {task_id} failed. Stopping phase execution.")
                print("Use --continue to continue running remaining tasks.")
                break

    # Summary
    print(f"\n{'='*60}")
    print(f"Phase {phase} Summary")
    print(f"{'='*60}")
    print(f"Successful: {len(successful_tasks)}")
    print(f"Failed: {len(failed_tasks)}")

    if successful_tasks:
        print(f"\nCompleted tasks:")
        for tid in successful_tasks:
            print(f"  - {tid}")

    if failed_tasks:
        print(f"\nFailed tasks:")
        for tid, reason in failed_tasks:
            print(f"  - {tid}: {reason}")

    # Post completion comment to GitHub issue
    if issue_number and repo_path:
        success_list = "\n".join(f"- [x] `{tid}` ✅" for tid in successful_tasks)
        failed_list = "\n".join(f"- [ ] `{tid}` ❌ {reason}" for tid, reason in failed_tasks)

        if failed_tasks:
            status_emoji = "⚠️"
            status_text = "Completed with Failures"
            update_issue_labels(issue_number, repo_path,
                              add_labels=["needs-attention"],
                              remove_labels=["in-progress"])
        else:
            status_emoji = "✅"
            status_text = "Completed Successfully"
            update_issue_labels(issue_number, repo_path,
                              add_labels=["ready-for-review"],
                              remove_labels=["in-progress"])

        completion_comment = f"""## {status_emoji} ADWS Phase {phase} {status_text}

**Phase**: {phase_names.get(phase, 'Unknown')}
**ADW ID**: `{phase_adw_id}`

### Results
| Metric | Count |
|--------|-------|
| Successful | {len(successful_tasks)} |
| Failed | {len(failed_tasks)} |

### Task Results
{success_list if success_list else "_None_"}
{failed_list if failed_list else ""}

_Phase execution complete._"""
        post_issue_comment(issue_number, repo_path, completion_comment)

    logger.info(f"Phase {phase} complete: {len(successful_tasks)} successful, {len(failed_tasks)} failed")

    # Exit with error if any failures
    if failed_tasks:
        sys.exit(1)


if __name__ == "__main__":
    main()
