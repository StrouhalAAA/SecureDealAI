#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
Run a single implementation task using Claude Code CLI.

Usage:
    uv run run_task.py 02_06              # Run task 02_06
    uv run run_task.py 02_06 --issue 5    # Run with GitHub issue tracking
    uv run run_task.py 02_06 --resume     # Resume from last state
    uv run run_task.py 02_06 --dry-run    # Show what would be done

Examples:
    # Run the OCR Extract task
    uv run run_task.py 02_06

    # Run all Phase 1 tasks (use run_phase.py instead)
    uv run run_phase.py 1
"""

import sys
import os
import argparse
from datetime import datetime

# Add ADWS directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from adw_modules.agent import execute_template
from adw_modules.state import ADWState
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.utils import make_adw_id, setup_logger
from adw_modules.task_parser import (
    find_plan_file,
    parse_plan_metadata,
    check_dependencies,
    get_completed_tasks_from_tracker,
)


def get_tracker_path_for_task(task_id: str) -> str:
    """Get the appropriate tracker file path for a given task ID.

    Phase 5 and 6 use their own trackers, others use 00_IMPLEMENTATION_TRACKER.md.
    """
    from adw_modules.utils import get_project_root
    project_root = get_project_root()
    impl_dir = os.path.join(project_root, "docs", "implementation")

    phase = int(task_id.split("_")[0])

    if phase == 5:
        return os.path.join(impl_dir, "PHASE5_IMPLEMENTATION_TRACKER.md")
    elif phase == 6:
        return os.path.join(impl_dir, "PHASE6_IMPLEMENTATION_TRACKER.md")
    else:
        return os.path.join(impl_dir, "00_IMPLEMENTATION_TRACKER.md")


def update_tracker(task_id: str, status: str = "completed") -> bool:
    """Update the implementation tracker with task status.

    Returns True if successful.
    Supports both main tracker (00_IMPLEMENTATION_TRACKER.md) and phase-specific trackers.
    """
    import re
    tracker_path = get_tracker_path_for_task(task_id)

    if not os.path.exists(tracker_path):
        return False

    with open(tracker_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Convert task_id format (02_06 -> 2.6)
    phase, task = task_id.split("_")
    display_id = f"{int(phase)}.{int(task)}"

    # Find and update the task line - support both formats:
    # Main tracker: | 2.6 | Task Name | [Doc] | [ ] Pending | Date |
    # Phase tracker: | 5.1 | Task Name | [Doc] | [ ] Pending | Depends | Time |

    # Pattern for main tracker (Phases 1-4): matches "[ ] Pending |" or "[ ] Implemented |"
    pattern_main = rf"(\|\s*{re.escape(display_id)}\s*\|[^|]+\|[^|]+\|)\s*\[\s*\]\s*Pending\s*\|"

    # Pattern for Phase 5 tracker: matches "[ ] Pending |" in different column structure
    pattern_phase5 = rf"(\|\s*{re.escape(display_id)}\s*\|[^|]+\|[^|]+\|)\s*\[\s*\]\s*Pending\s*\|"

    if status == "completed":
        today = datetime.now().strftime("%Y-%m-%d")
        if int(phase) in (5, 6):
            # Phase 5 and 6 trackers use "Complete" not "Implemented"
            replacement = rf"\1 [x] Complete |"
        else:
            replacement = rf"\1 [x] Implemented | {today} |"
    else:
        replacement = rf"\1 [ ] {status.title()} |"

    new_content, count = re.subn(pattern_main, replacement, content)

    if count > 0:
        with open(tracker_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        return True

    return False


def main():
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Run a single implementation task",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run run_task.py 02_06           Run the OCR Extract task
  uv run run_task.py 01_01 --issue 1 Run with GitHub issue tracking
  uv run run_task.py 02_06 --resume  Resume an interrupted task
  uv run run_task.py 02_06 --dry-run Show what would be done
        """
    )
    parser.add_argument("task_id", help="Task ID (e.g., 02_06, 1.1)")
    parser.add_argument("--issue", type=int, help="GitHub issue number")
    parser.add_argument("--resume", action="store_true", help="Resume from last state")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done")
    parser.add_argument("--skip-deps", action="store_true", help="Skip dependency check")
    args = parser.parse_args()

    # Normalize task_id format
    task_id = args.task_id.replace(".", "_")
    if len(task_id.split("_")[0]) == 1:
        parts = task_id.split("_")
        task_id = f"{parts[0].zfill(2)}_{parts[1].zfill(2)}"

    # Find plan file
    plan_file = find_plan_file(task_id)
    if not plan_file:
        print(f"Error: Plan file not found for task {task_id}")
        print(f"Expected: docs/implementation/{task_id}_*.md")
        sys.exit(1)

    # Parse metadata
    metadata = parse_plan_metadata(plan_file)

    # Check dependencies
    if not args.skip_deps:
        completed = get_completed_tasks_from_tracker()
        dep_check = check_dependencies(task_id, completed)

        if not dep_check["met"]:
            print(f"Error: Dependencies not met for task {task_id}")
            print(f"Missing: {', '.join(dep_check['missing'])}")
            print("\nRun the missing tasks first, or use --skip-deps to bypass.")
            sys.exit(1)

    # Check if already completed
    completed = get_completed_tasks_from_tracker()
    if task_id in completed and not args.resume:
        print(f"Task {task_id} is already completed.")
        print("Use --resume to run it again.")
        sys.exit(0)

    # Initialize or resume state
    if args.resume:
        state = ADWState.find_by_task_id(task_id)
        if state:
            adw_id = state.adw_id
            print(f"Resuming task {task_id} with ADW ID: {adw_id}")
        else:
            print(f"No previous state found for task {task_id}, starting fresh.")
            adw_id = make_adw_id()
            state = None
    else:
        adw_id = make_adw_id()
        state = None

    logger = setup_logger(adw_id, "run_task")

    if state is None:
        state = ADWState(adw_id)
        state.update(
            task_id=task_id,
            task_name=metadata["task_name"],
            phase=metadata["phase"],
            plan_file=plan_file,
            issue_number=args.issue,
            total_steps=metadata["total_steps"],
            dependencies=metadata["depends_on"],
            dependencies_met=True,
        )

    # Dry run mode
    if args.dry_run:
        print("\n=== DRY RUN ===")
        print(f"Task ID: {task_id}")
        print(f"Task Name: {metadata['task_name']}")
        print(f"Phase: {metadata['phase']}")
        print(f"Plan File: {plan_file}")
        print(f"Dependencies: {metadata['depends_on']}")
        print(f"ADW ID: {adw_id}")
        print("\nWould execute: /implement {plan_file}")
        print("===============")
        sys.exit(0)

    # Log start
    logger.info(f"Starting task: {task_id} ({metadata['task_name']})")
    logger.info(f"ADW ID: {adw_id}")
    logger.info(f"Plan file: {plan_file}")

    # Update state
    state.set_status("in_progress")
    state.save("init")

    # Execute implementation
    logger.info("Executing /implement command...")

    request = AgentTemplateRequest(
        agent_name="implementor",
        slash_command="/implement",
        args=[plan_file],
        adw_id=adw_id,
    )

    response = execute_template(request)

    if not response.success:
        logger.error(f"Implementation failed: {response.output[:500]}")
        state.update(error_message=response.output[:1000])
        state.set_status("failed")
        state.save("failed")
        print(f"\nTask {task_id} failed. See logs at: agents/{adw_id}/run_task/execution.log")
        sys.exit(1)

    logger.info("Implementation completed successfully")

    # Update tracker
    if update_tracker(task_id, "completed"):
        logger.info(f"Updated tracker: {task_id} marked as Implemented")
    else:
        logger.warning(f"Could not update tracker for task {task_id}")

    # Mark complete
    state.set_status("completed")
    state.save("completed")

    print(f"\nTask {task_id} completed successfully!")
    print(f"ADW ID: {adw_id}")
    print(f"Logs: agents/{adw_id}/run_task/execution.log")


if __name__ == "__main__":
    main()
