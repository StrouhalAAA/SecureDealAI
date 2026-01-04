"""State management for SecureDealAI ADW workflows.

Provides persistent state management via file storage.
"""

import json
import os
import sys
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from .data_types import ADWStateData, ValidationResult, TaskStatus


class ADWState:
    """Container for ADW workflow state with file persistence."""

    STATE_FILENAME = "adw_state.json"

    def __init__(self, adw_id: str):
        """Initialize ADWState with a required ADW ID."""
        if not adw_id:
            raise ValueError("adw_id is required for ADWState")

        self.adw_id = adw_id
        self.data: Dict[str, Any] = {"adw_id": self.adw_id}
        self.logger = logging.getLogger(__name__)

    def update(self, **kwargs):
        """Update state with new key-value pairs."""
        valid_fields = {
            "adw_id", "task_id", "task_name", "phase", "plan_file",
            "status", "current_step", "total_steps", "started_at",
            "completed_at", "issue_number", "validation_results",
            "dependencies", "dependencies_met", "error_message"
        }
        for key, value in kwargs.items():
            if key in valid_fields:
                self.data[key] = value

    def get(self, key: str, default=None):
        """Get value from state by key."""
        return self.data.get(key, default)

    def set_status(self, status: TaskStatus):
        """Update the task status."""
        self.data["status"] = status
        if status == "in_progress" and not self.data.get("started_at"):
            self.data["started_at"] = datetime.now().isoformat()
        elif status in ("completed", "failed"):
            self.data["completed_at"] = datetime.now().isoformat()

    def add_validation_result(self, command: str, passed: bool, output: str = None, error: str = None):
        """Add a validation result to the state."""
        results = self.data.get("validation_results", [])
        results.append({
            "command": command,
            "passed": passed,
            "output": output,
            "error": error
        })
        self.data["validation_results"] = results

    def get_state_path(self) -> str:
        """Get path to state file."""
        from .utils import get_project_root
        project_root = get_project_root()
        return os.path.join(project_root, "agents", self.adw_id, self.STATE_FILENAME)

    def save(self, workflow_step: Optional[str] = None) -> None:
        """Save state to file in agents/{adw_id}/adw_state.json."""
        state_path = self.get_state_path()
        os.makedirs(os.path.dirname(state_path), exist_ok=True)

        # Save as JSON
        with open(state_path, "w") as f:
            json.dump(self.data, f, indent=2, default=str)

        self.logger.info(f"Saved state to {state_path}")
        if workflow_step:
            self.logger.info(f"State updated by: {workflow_step}")

    @classmethod
    def load(cls, adw_id: str, logger: Optional[logging.Logger] = None) -> Optional["ADWState"]:
        """Load state from file if it exists."""
        from .utils import get_project_root
        project_root = get_project_root()
        state_path = os.path.join(project_root, "agents", adw_id, cls.STATE_FILENAME)

        if not os.path.exists(state_path):
            return None

        try:
            with open(state_path, "r") as f:
                data = json.load(f)

            state = cls(data.get("adw_id", adw_id))
            state.data = data

            if logger:
                logger.info(f"Found existing state from {state_path}")

            return state
        except Exception as e:
            if logger:
                logger.error(f"Failed to load state from {state_path}: {e}")
            return None

    @classmethod
    def find_by_task_id(cls, task_id: str, logger: Optional[logging.Logger] = None) -> Optional["ADWState"]:
        """Find the most recent state for a given task ID."""
        from .utils import get_project_root
        project_root = get_project_root()
        agents_dir = os.path.join(project_root, "agents")

        if not os.path.exists(agents_dir):
            return None

        # Find all states with matching task_id
        matching_states = []
        for adw_id in os.listdir(agents_dir):
            state_path = os.path.join(agents_dir, adw_id, cls.STATE_FILENAME)
            if os.path.exists(state_path):
                try:
                    with open(state_path, "r") as f:
                        data = json.load(f)
                    if data.get("task_id") == task_id:
                        matching_states.append((adw_id, data, os.path.getmtime(state_path)))
                except Exception:
                    continue

        if not matching_states:
            return None

        # Return most recent
        matching_states.sort(key=lambda x: x[2], reverse=True)
        adw_id, data, _ = matching_states[0]

        state = cls(adw_id)
        state.data = data
        if logger:
            logger.info(f"Found existing state for task {task_id}: {adw_id}")
        return state

    @classmethod
    def from_stdin(cls) -> Optional["ADWState"]:
        """Read state from stdin if available (for piped input)."""
        if sys.stdin.isatty():
            return None
        try:
            input_data = sys.stdin.read()
            if not input_data.strip():
                return None
            data = json.loads(input_data)
            adw_id = data.get("adw_id")
            if not adw_id:
                return None
            state = cls(adw_id)
            state.data = data
            return state
        except (json.JSONDecodeError, EOFError):
            return None

    def to_stdout(self):
        """Write state to stdout as JSON (for piping to next script)."""
        print(json.dumps(self.data, indent=2, default=str))

    def to_dict(self) -> Dict[str, Any]:
        """Return state as dictionary."""
        return self.data.copy()
