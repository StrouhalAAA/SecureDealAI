"""
GitHub Operations Module for SecureDealAI ADWS.

Provides GitHub issue integration via gh CLI with graceful degradation
when the CLI is unavailable or not authenticated.
"""

import subprocess
import sys
import os
import json
import re
from typing import Optional, List, Tuple

from .data_types import GitHubIssue, GitHubComment, GitHubLabel, GitHubUser

# Bot identifier to filter out own comments and prevent loops
ADWS_BOT_IDENTIFIER = "[ADWS-BOT]"


def get_github_env() -> Optional[dict]:
    """Get environment with GitHub token set up.

    Returns None if no GITHUB_PAT is set, which means
    the gh CLI will use its own authentication.
    """
    github_pat = os.getenv("GITHUB_PAT")
    if not github_pat:
        return None

    # Create minimal env with GitHub token
    return {
        "GH_TOKEN": github_pat,
        "PATH": os.environ.get("PATH", ""),
    }


def check_gh_installed() -> bool:
    """Check if GitHub CLI is installed."""
    try:
        subprocess.run(
            ["gh", "--version"],
            capture_output=True,
            text=True,
            check=True
        )
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def check_gh_authenticated() -> bool:
    """Check if GitHub CLI is authenticated."""
    try:
        env = get_github_env()
        result = subprocess.run(
            ["gh", "auth", "status"],
            capture_output=True,
            text=True,
            env=env
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def parse_issue_url(url: str) -> Tuple[str, int]:
    """Parse GitHub issue URL to extract repo path and issue number.

    Args:
        url: Full GitHub issue URL (e.g., https://github.com/owner/repo/issues/4)

    Returns:
        Tuple of (repo_path, issue_number)

    Raises:
        ValueError: If URL format is invalid
    """
    # Pattern: https://github.com/{owner}/{repo}/issues/{number}
    pattern = r"https?://github\.com/([^/]+/[^/]+)/issues/(\d+)"
    match = re.match(pattern, url)
    if not match:
        raise ValueError(
            f"Invalid GitHub issue URL: {url}\n"
            f"Expected format: https://github.com/owner/repo/issues/NUMBER"
        )
    return match.group(1), int(match.group(2))


def get_repo_url() -> Optional[str]:
    """Get GitHub repository URL from git remote."""
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def extract_repo_path(github_url: str) -> str:
    """Extract owner/repo from GitHub URL."""
    return github_url.replace("https://github.com/", "").replace(".git", "")


def fetch_issue(issue_number: int, repo_path: str) -> Optional[GitHubIssue]:
    """Fetch GitHub issue details via gh CLI.

    Args:
        issue_number: The issue number
        repo_path: Repository path (owner/repo)

    Returns:
        GitHubIssue model or None if fetch fails
    """
    if not check_gh_installed():
        print("Warning: GitHub CLI (gh) not installed. Issue tracking disabled.",
              file=sys.stderr)
        return None

    cmd = [
        "gh", "issue", "view", str(issue_number),
        "-R", repo_path,
        "--json", "number,title,body,state,author,assignees,labels,comments,createdAt,updatedAt,url"
    ]

    env = get_github_env()

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            check=True
        )
        issue_data = json.loads(result.stdout)
        return GitHubIssue(**issue_data)
    except subprocess.CalledProcessError as e:
        print(f"Warning: Could not fetch issue #{issue_number}: {e.stderr}",
              file=sys.stderr)
        return None
    except (json.JSONDecodeError, Exception) as e:
        print(f"Warning: Error parsing issue data: {e}", file=sys.stderr)
        return None


def post_issue_comment(issue_number: int, repo_path: str, comment: str) -> bool:
    """Post a comment to a GitHub issue.

    Args:
        issue_number: The issue number
        repo_path: Repository path (owner/repo)
        comment: Comment body (bot identifier will be prepended)

    Returns:
        True if successful, False otherwise
    """
    if not check_gh_installed():
        print("Warning: GitHub CLI not available. Skipping comment.",
              file=sys.stderr)
        return False

    # Prepend bot identifier
    full_comment = f"{ADWS_BOT_IDENTIFIER}\n\n{comment}"

    cmd = [
        "gh", "issue", "comment", str(issue_number),
        "-R", repo_path,
        "--body", full_comment
    ]

    env = get_github_env()

    try:
        subprocess.run(cmd, capture_output=True, text=True, env=env, check=True)
        print(f"Posted comment to issue #{issue_number}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Warning: Could not post comment: {e.stderr}", file=sys.stderr)
        return False


def mark_issue_in_progress(issue_number: int, repo_path: str) -> bool:
    """Mark issue as in-progress by adding label and assigning to self.

    Args:
        issue_number: The issue number
        repo_path: Repository path (owner/repo)

    Returns:
        True if at least one operation succeeded
    """
    if not check_gh_installed():
        return False

    env = get_github_env()
    success = False

    # Add "in-progress" label
    label_cmd = [
        "gh", "issue", "edit", str(issue_number),
        "-R", repo_path,
        "--add-label", "in-progress"
    ]
    result = subprocess.run(label_cmd, capture_output=True, text=True, env=env)
    if result.returncode == 0:
        print(f"Added 'in-progress' label to issue #{issue_number}")
        success = True
    else:
        print(f"Note: Could not add 'in-progress' label (may not exist)",
              file=sys.stderr)

    # Assign to self
    assign_cmd = [
        "gh", "issue", "edit", str(issue_number),
        "-R", repo_path,
        "--add-assignee", "@me"
    ]
    result = subprocess.run(assign_cmd, capture_output=True, text=True, env=env)
    if result.returncode == 0:
        print(f"Assigned issue #{issue_number} to self")
        success = True

    return success


def update_issue_labels(
    issue_number: int,
    repo_path: str,
    add_labels: Optional[List[str]] = None,
    remove_labels: Optional[List[str]] = None
) -> bool:
    """Update issue labels.

    Args:
        issue_number: The issue number
        repo_path: Repository path (owner/repo)
        add_labels: Labels to add
        remove_labels: Labels to remove

    Returns:
        True if successful
    """
    if not check_gh_installed():
        return False

    env = get_github_env()
    cmd = ["gh", "issue", "edit", str(issue_number), "-R", repo_path]

    if add_labels:
        for label in add_labels:
            cmd.extend(["--add-label", label])

    if remove_labels:
        for label in remove_labels:
            cmd.extend(["--remove-label", label])

    if len(cmd) == 5:  # No labels to change
        return True

    try:
        subprocess.run(cmd, capture_output=True, text=True, env=env, check=True)
        return True
    except subprocess.CalledProcessError:
        return False


def close_issue(issue_number: int, repo_path: str) -> bool:
    """Close a GitHub issue.

    Args:
        issue_number: The issue number
        repo_path: Repository path (owner/repo)

    Returns:
        True if successful
    """
    if not check_gh_installed():
        return False

    cmd = ["gh", "issue", "close", str(issue_number), "-R", repo_path]
    env = get_github_env()

    try:
        subprocess.run(cmd, capture_output=True, text=True, env=env, check=True)
        return True
    except subprocess.CalledProcessError:
        return False


# ============================================================================
# Comment Generation Helpers
# ============================================================================


def generate_start_comment(plan_file: str, adw_id: str) -> str:
    """Generate comment for when work starts.

    Args:
        plan_file: Path to the implementation plan
        adw_id: Workflow identifier

    Returns:
        Formatted markdown comment
    """
    return f"""## ADWS Started

Working on this issue using plan: `{plan_file}`

| Field | Value |
|-------|-------|
| **ADW ID** | `{adw_id}` |
| **Status** | In Progress |

_Updates will be posted when complete._"""


def generate_completion_comment(
    plan_file: str,
    adw_id: str,
    files_changed: List[str],
    validation_passed: bool
) -> str:
    """Generate comment for successful completion.

    Args:
        plan_file: Path to the implementation plan
        adw_id: Workflow identifier
        files_changed: List of changed file paths
        validation_passed: Whether validation commands passed

    Returns:
        Formatted markdown comment
    """
    files_list = "\n".join(f"- `{f}`" for f in files_changed[:10])
    if len(files_changed) > 10:
        files_list += f"\n- ... and {len(files_changed) - 10} more"

    status_emoji = ":white_check_mark:" if validation_passed else ":x:"
    status_text = "Passed" if validation_passed else "Failed"

    return f"""## ADWS Completed

Implementation complete for: `{plan_file}`

### Summary
| Field | Value |
|-------|-------|
| **ADW ID** | `{adw_id}` |
| **Files Changed** | {len(files_changed)} |
| **Validation** | {status_emoji} {status_text} |

### Changed Files
{files_list if files_list else "_No files changed_"}

_Ready for review._"""


def generate_failure_comment(
    plan_file: str,
    adw_id: str,
    error_message: str,
    last_step: Optional[int] = None
) -> str:
    """Generate comment for failure.

    Args:
        plan_file: Path to the implementation plan
        adw_id: Workflow identifier
        error_message: Error details
        last_step: Last completed step number

    Returns:
        Formatted markdown comment
    """
    # Truncate error message if too long
    error_display = error_message[:500]
    if len(error_message) > 500:
        error_display += "..."

    resume_cmd = f"uv run ADWS/run_issue.py --resume {adw_id}"

    return f"""## ADWS Failed

Implementation failed for: `{plan_file}`

### Details
| Field | Value |
|-------|-------|
| **ADW ID** | `{adw_id}` |
| **Last Step** | {last_step or "Unknown"} |

### Error
```
{error_display}
```

### To Resume
```bash
{resume_cmd}
```"""


def find_keyword_in_comments(keyword: str, issue: GitHubIssue) -> Optional[GitHubComment]:
    """Find the latest comment containing a specific keyword.

    Args:
        keyword: The keyword to search for
        issue: The GitHub issue with comments

    Returns:
        The latest matching comment, or None
    """
    # Sort comments by created_at (newest first)
    sorted_comments = sorted(
        issue.comments,
        key=lambda c: c.created_at,
        reverse=True
    )

    for comment in sorted_comments:
        # Skip bot comments to prevent loops
        if ADWS_BOT_IDENTIFIER in comment.body:
            continue

        if keyword in comment.body:
            return comment

    return None
