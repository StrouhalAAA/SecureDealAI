"""Task parser for SecureDealAI implementation plans.

Parses implementation plan markdown files and extracts metadata.
"""

import os
import re
from typing import Optional, Dict, List, Any
from glob import glob


def get_project_root() -> str:
    """Get the project root directory (SecureDealAI)."""
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def find_plan_file(task_id: str) -> Optional[str]:
    """Find the implementation plan file for a given task ID.

    Args:
        task_id: Task ID in format "XX_XX" (e.g., "02_06")

    Returns:
        Full path to the plan file, or None if not found
    """
    project_root = get_project_root()
    impl_dir = os.path.join(project_root, "docs", "implementation")

    # Pattern: XX_XX_*.md
    pattern = os.path.join(impl_dir, f"{task_id}_*.md")
    matches = glob(pattern)

    if matches:
        return matches[0]
    return None


def parse_plan_metadata(plan_file: str) -> Dict[str, Any]:
    """Parse metadata from an implementation plan file.

    Extracts:
    - Task name
    - Phase number
    - Dependencies
    - Status
    - Validation commands

    Args:
        plan_file: Path to the implementation plan markdown file

    Returns:
        Dictionary with parsed metadata
    """
    metadata = {
        "task_id": None,
        "task_name": None,
        "phase": None,
        "status": "pending",
        "depends_on": [],
        "validation_commands": [],
        "total_steps": 0,
    }

    with open(plan_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract task ID and name from filename
    filename = os.path.basename(plan_file)
    match = re.match(r"(\d{2}_\d{2})_(.+)\.md", filename)
    if match:
        metadata["task_id"] = match.group(1)
        metadata["task_name"] = match.group(2)
        # Phase is first digit of task ID
        metadata["phase"] = int(match.group(1).split("_")[0])

    # Extract status from markdown
    status_match = re.search(r">\s*\*\*Status\*\*:\s*\[([ xX])\]\s*(\w+)", content)
    if status_match:
        checked = status_match.group(1).lower() == "x"
        status_text = status_match.group(2).lower()
        if checked or status_text in ("implemented", "completed", "complete"):
            metadata["status"] = "completed"
        elif status_text == "pending":
            metadata["status"] = "pending"

    # Extract dependencies
    depends_match = re.search(r">\s*\*\*Depends On\*\*:\s*(.+)", content)
    if depends_match:
        deps_text = depends_match.group(1)
        # Extract task IDs like "1.1", "01_01", etc.
        dep_ids = re.findall(r"(\d+)[._](\d+)", deps_text)
        metadata["depends_on"] = [f"{d[0].zfill(2)}_{d[1].zfill(2)}" for d in dep_ids]

    # Count implementation steps
    step_matches = re.findall(r"###\s*Step\s*\d+", content)
    metadata["total_steps"] = len(step_matches)

    # Extract validation commands from "Validation Criteria" or "Test Cases" section
    validation_section = re.search(
        r"##\s*(Validation Criteria|Test Cases|Completion Checklist)(.*?)(?=##|\Z)",
        content,
        re.DOTALL | re.IGNORECASE
    )
    if validation_section:
        section_content = validation_section.group(2)
        # Find bash commands
        commands = re.findall(r"```(?:bash|shell)?\s*\n([^`]+)\n```", section_content)
        for cmd_block in commands:
            for line in cmd_block.strip().split("\n"):
                line = line.strip()
                if line and not line.startswith("#"):
                    metadata["validation_commands"].append(line)

    return metadata


def get_dependency_map() -> Dict[str, List[str]]:
    """Get the full dependency map for all tasks.

    Returns:
        Dictionary mapping task_id to list of dependency task_ids
    """
    return {
        # Phase 1 (Infrastructure) - No dependencies except internal
        "01_00": [],
        "01_01": [],
        "01_02": ["01_01"],
        "01_03": [],
        "01_04": [],

        # Phase 2 (Backend) - Depends on Phase 1
        "02_01": ["01_01"],
        "02_02": ["01_01"],
        "02_03": ["01_01"],
        "02_04": ["01_04"],
        "02_05": ["01_03"],
        "02_06": ["01_04", "02_05"],
        "02_07": ["02_04"],
        "02_08": ["01_01", "01_02"],
        "02_09": ["02_08"],

        # Phase 3 (Frontend) - Depends on Phase 2
        "03_01": [],
        "03_02": ["03_01", "02_01"],
        "03_03": ["03_01"],
        "03_04": ["03_01"],
        "03_05": ["03_01", "02_04"],
        "03_06": ["03_01", "02_05"],
        "03_07": ["03_01", "02_06"],
        "03_08": ["03_01", "02_08"],
        "03_09": ["03_02", "03_03", "03_04"],
        "03_10": ["03_01", "02_09"],

        # Phase 4 (Testing) - Depends on Phase 3
        "04_01": ["03_09"],
        "04_02": ["04_01"],
    }


def check_dependencies(task_id: str, completed_tasks: List[str] = None) -> Dict[str, Any]:
    """Check if all dependencies for a task are met.

    Args:
        task_id: The task to check
        completed_tasks: List of completed task IDs (if None, reads from tracker)

    Returns:
        Dictionary with:
        - met: bool - True if all dependencies are satisfied
        - missing: List[str] - List of missing dependency task IDs
        - dependencies: List[str] - All dependencies for this task
    """
    dep_map = get_dependency_map()
    dependencies = dep_map.get(task_id, [])

    if completed_tasks is None:
        completed_tasks = get_completed_tasks_from_tracker()

    missing = [dep for dep in dependencies if dep not in completed_tasks]

    return {
        "met": len(missing) == 0,
        "missing": missing,
        "dependencies": dependencies
    }


def get_completed_tasks_from_tracker() -> List[str]:
    """Read the implementation tracker and return list of completed task IDs."""
    project_root = get_project_root()
    tracker_path = os.path.join(project_root, "docs", "implementation", "00_IMPLEMENTATION_TRACKER.md")

    completed = []
    if not os.path.exists(tracker_path):
        return completed

    with open(tracker_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find all completed tasks: | X.X | Task Name | [Doc] | [x] Implemented |
    matches = re.findall(r"\|\s*(\d+)\.(\d+)\s*\|[^|]+\|[^|]+\|\s*\[x\]\s*Implemented", content)
    for phase, task in matches:
        completed.append(f"{phase.zfill(2)}_{task.zfill(2)}")

    return completed


def get_tasks_for_phase(phase: int) -> List[Dict[str, Any]]:
    """Get all tasks for a given phase.

    Args:
        phase: Phase number (1, 2, 3, or 4)

    Returns:
        List of task metadata dictionaries
    """
    project_root = get_project_root()
    impl_dir = os.path.join(project_root, "docs", "implementation")

    # Pattern: XX_XX_*.md where XX is the phase number
    pattern = os.path.join(impl_dir, f"{str(phase).zfill(2)}_*.md")
    plan_files = sorted(glob(pattern))

    tasks = []
    for plan_file in plan_files:
        metadata = parse_plan_metadata(plan_file)
        metadata["plan_file"] = plan_file
        tasks.append(metadata)

    return tasks
