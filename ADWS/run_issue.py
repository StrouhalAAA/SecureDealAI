#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
Run an implementation plan with GitHub issue tracking.

This script provides issue-driven execution where:
1. The GitHub issue provides context and tracking
2. The plan file provides implementation steps
3. Progress is posted as issue comments

Usage:
    uv run run_issue.py <github_issue_url> <plan_file_path>
    uv run run_issue.py <url> <plan> --dry-run
    uv run run_issue.py <url> <plan> --no-comment

Examples:
    uv run run_issue.py https://github.com/owner/repo/issues/4 docs/implementation/02_06_OCR.md
    uv run run_issue.py https://github.com/owner/repo/issues/4 specs/feature-auth.md --dry-run
"""

import sys
import os
import argparse
import subprocess

# Add ADWS directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from adw_modules.agent import execute_template
from adw_modules.state import ADWState
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.utils import make_adw_id, setup_logger
from adw_modules.github import (
    parse_issue_url,
    fetch_issue,
    post_issue_comment,
    mark_issue_in_progress,
    update_issue_labels,
    generate_start_comment,
    generate_completion_comment,
    generate_failure_comment,
)


def get_changed_files() -> list:
    """Get list of changed files from git."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~1"],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split("\n")
    except Exception:
        pass
    return []


def main():
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Run implementation with GitHub issue tracking",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run run_issue.py https://github.com/owner/repo/issues/4 docs/plan.md
  uv run run_issue.py https://github.com/owner/repo/issues/4 specs/feature.md --dry-run
  uv run run_issue.py https://github.com/owner/repo/issues/4 docs/plan.md --no-comment
        """
    )
    parser.add_argument("issue_url", help="GitHub issue URL")
    parser.add_argument("plan_file", help="Path to implementation plan")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without executing"
    )
    parser.add_argument(
        "--no-comment",
        action="store_true",
        help="Skip posting GitHub comments"
    )
    parser.add_argument(
        "--resume",
        metavar="ADW_ID",
        help="Resume a previous workflow by ADW ID"
    )
    args = parser.parse_args()

    # Validate plan file exists
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    plan_path = os.path.join(project_root, args.plan_file)

    if not os.path.exists(plan_path):
        # Try as absolute path
        if not os.path.exists(args.plan_file):
            print(f"Error: Plan file not found: {args.plan_file}")
            print(f"Tried: {plan_path}")
            sys.exit(1)
        plan_path = args.plan_file

    # Parse issue URL
    try:
        repo_path, issue_number = parse_issue_url(args.issue_url)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    # Fetch issue details
    issue = fetch_issue(issue_number, repo_path)
    if issue:
        print(f"\n{'='*60}")
        print(f"Issue #{issue.number}: {issue.title}")
        print(f"State: {issue.state}")
        print(f"URL: {issue.url}")
        print(f"{'='*60}\n")
    else:
        print(f"Warning: Could not fetch issue #{issue_number}")
        print("Continuing with limited issue tracking...\n")

    # Initialize or resume workflow
    if args.resume:
        adw_id = args.resume
        state = ADWState.load(adw_id)
        if state:
            print(f"Resuming workflow: {adw_id}")
        else:
            print(f"Warning: Could not load state for {adw_id}, starting fresh")
            state = None
    else:
        adw_id = make_adw_id()
        state = None

    logger = setup_logger(adw_id, "run_issue")

    logger.info(f"Starting issue-based implementation")
    logger.info(f"Issue: {args.issue_url}")
    logger.info(f"Plan: {args.plan_file}")
    logger.info(f"ADW ID: {adw_id}")

    # Dry run mode
    if args.dry_run:
        print("\n=== DRY RUN ===")
        print(f"Issue URL: {args.issue_url}")
        print(f"Repo Path: {repo_path}")
        print(f"Issue #: {issue_number}")
        if issue:
            print(f"Issue Title: {issue.title}")
        print(f"Plan File: {args.plan_file}")
        print(f"ADW ID: {adw_id}")
        print(f"Would execute: /implement {args.plan_file}")
        print("================\n")
        sys.exit(0)

    # Initialize state if not resumed
    if state is None:
        state = ADWState(adw_id)
        state.update(
            plan_file=args.plan_file,
            issue_number=issue_number,
            issue_url=args.issue_url,
            repo_path=repo_path,
        )

    state.set_status("in_progress")
    state.save("init")

    # Post start comment and mark in-progress
    if not args.no_comment:
        mark_issue_in_progress(issue_number, repo_path)
        post_issue_comment(
            issue_number,
            repo_path,
            generate_start_comment(args.plan_file, adw_id)
        )

    # Execute implementation via Claude Code
    logger.info("Executing /implement command...")
    print(f"\nExecuting implementation for: {args.plan_file}")
    print(f"ADW ID: {adw_id}")
    print("-" * 40)

    request = AgentTemplateRequest(
        agent_name="implementor",
        slash_command="/implement",
        args=[args.plan_file],
        adw_id=adw_id,
    )

    response = execute_template(request)

    if not response.success:
        error_msg = response.output[:1000] if response.output else "Unknown error"
        logger.error(f"Implementation failed: {error_msg[:500]}")

        state.update(error_message=error_msg)
        state.set_status("failed")
        state.save("failed")

        # Post failure comment
        if not args.no_comment:
            post_issue_comment(
                issue_number,
                repo_path,
                generate_failure_comment(
                    args.plan_file,
                    adw_id,
                    error_msg,
                    last_step=state.get("current_step")
                )
            )

        print(f"\n{'='*60}")
        print("IMPLEMENTATION FAILED")
        print(f"ADW ID: {adw_id}")
        print(f"Logs: agents/{adw_id}/run_issue/execution.log")
        print(f"{'='*60}")
        sys.exit(1)

    logger.info("Implementation completed successfully")

    # Get changed files
    files_changed = get_changed_files()

    # Post completion comment
    if not args.no_comment:
        post_issue_comment(
            issue_number,
            repo_path,
            generate_completion_comment(
                args.plan_file,
                adw_id,
                files_changed,
                validation_passed=True  # TODO: Get from actual validation
            )
        )

        # Update labels: remove in-progress, add ready-for-review
        update_issue_labels(
            issue_number,
            repo_path,
            add_labels=["ready-for-review"],
            remove_labels=["in-progress"]
        )

    state.set_status("completed")
    state.save("completed")

    print(f"\n{'='*60}")
    print("IMPLEMENTATION COMPLETED")
    print(f"Issue: {args.issue_url}")
    print(f"ADW ID: {adw_id}")
    print(f"Files Changed: {len(files_changed)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
