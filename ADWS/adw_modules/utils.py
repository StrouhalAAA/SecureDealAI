"""Utility functions for SecureDealAI ADW system."""

import json
import logging
import os
import re
import sys
import uuid
from typing import Any, TypeVar, Type, Union, Dict

T = TypeVar('T')


def make_adw_id() -> str:
    """Generate a short 8-character UUID for ADW tracking."""
    return str(uuid.uuid4())[:8]


def get_project_root() -> str:
    """Get the project root directory (SecureDealAI)."""
    # __file__ is in ADWS/adw_modules/, so go up 2 levels
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def setup_logger(adw_id: str, trigger_type: str = "run_task") -> logging.Logger:
    """Set up logger that writes to both console and file using adw_id.

    Args:
        adw_id: The ADW workflow ID
        trigger_type: Type of trigger (run_task, run_phase, etc.)

    Returns:
        Configured logger instance
    """
    project_root = get_project_root()
    log_dir = os.path.join(project_root, "agents", adw_id, trigger_type)
    os.makedirs(log_dir, exist_ok=True)

    log_file = os.path.join(log_dir, "execution.log")

    logger = logging.getLogger(f"adw_{adw_id}")
    logger.setLevel(logging.DEBUG)

    # Clear any existing handlers to avoid duplicates
    logger.handlers.clear()

    # File handler - captures everything
    file_handler = logging.FileHandler(log_file, mode='a')
    file_handler.setLevel(logging.DEBUG)

    # Console handler - INFO and above
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)

    # Format with timestamp for file
    file_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Simpler format for console
    console_formatter = logging.Formatter('%(message)s')

    file_handler.setFormatter(file_formatter)
    console_handler.setFormatter(console_formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    logger.info(f"ADW Logger initialized - ID: {adw_id}")
    logger.debug(f"Log file: {log_file}")

    return logger


def get_logger(adw_id: str) -> logging.Logger:
    """Get existing logger by ADW ID."""
    return logging.getLogger(f"adw_{adw_id}")


def parse_json(text: str, target_type: Type[T] = None) -> Union[T, Any]:
    """Parse JSON that may be wrapped in markdown code blocks."""
    # Try to extract JSON from markdown code blocks
    code_block_pattern = r'```(?:json)?\s*\n(.*?)\n```'
    match = re.search(code_block_pattern, text, re.DOTALL)

    if match:
        json_str = match.group(1).strip()
    else:
        json_str = text.strip()

    # Try to find JSON array or object boundaries
    if not (json_str.startswith('[') or json_str.startswith('{')):
        array_start = json_str.find('[')
        array_end = json_str.rfind(']')
        obj_start = json_str.find('{')
        obj_end = json_str.rfind('}')

        if array_start != -1 and (obj_start == -1 or array_start < obj_start):
            if array_end != -1:
                json_str = json_str[array_start:array_end + 1]
        elif obj_start != -1:
            if obj_end != -1:
                json_str = json_str[obj_start:obj_end + 1]

    try:
        result = json.loads(json_str)

        # Handle Pydantic model validation
        if target_type and hasattr(target_type, '__origin__'):
            if target_type.__origin__ == list:
                item_type = target_type.__args__[0]
                if hasattr(item_type, 'model_validate'):
                    result = [item_type.model_validate(item) for item in result]
        elif target_type:
            if hasattr(target_type, 'model_validate'):
                result = target_type.model_validate(result)

        return result
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON: {e}. Text was: {json_str[:200]}...")


def get_safe_subprocess_env() -> Dict[str, str]:
    """Get filtered environment variables safe for subprocess execution."""
    safe_env_vars = {
        # Anthropic Configuration
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),

        # GitHub Configuration (optional)
        "GITHUB_PAT": os.getenv("GITHUB_PAT"),

        # Claude Code Configuration
        "CLAUDE_CODE_PATH": os.getenv("CLAUDE_CODE_PATH", "claude"),
        "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR": os.getenv(
            "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR", "true"
        ),

        # Essential system environment variables
        "HOME": os.getenv("HOME"),
        "USER": os.getenv("USER"),
        "PATH": os.getenv("PATH"),
        "SHELL": os.getenv("SHELL"),
        "TERM": os.getenv("TERM"),
        "LANG": os.getenv("LANG"),
        "LC_ALL": os.getenv("LC_ALL"),

        # Python-specific
        "PYTHONPATH": os.getenv("PYTHONPATH"),
        "PYTHONUNBUFFERED": "1",

        # Working directory
        "PWD": os.getcwd(),
    }

    # Add GH_TOKEN as alias for GITHUB_PAT if it exists
    github_pat = os.getenv("GITHUB_PAT")
    if github_pat:
        safe_env_vars["GH_TOKEN"] = github_pat

    # Filter out None values
    return {k: v for k, v in safe_env_vars.items() if v is not None}
