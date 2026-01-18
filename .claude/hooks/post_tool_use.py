#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

"""
Post-tool-use hook for SecureDealAI.

This hook runs AFTER tool execution completes and:
1. Plays attention sound when user input is required (AskUserQuestion)
2. Logs tool completion for audit trail

Exit codes:
- 0: Success (hook completed)
"""

import json
import sys

from utils.constants import ensure_session_log_dir
from utils.sounds import play_attention


# Tools that require user attention/input
ATTENTION_TOOLS = [
    "AskUserQuestion",
    "ExitPlanMode",
]


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        tool_name = input_data.get('tool_name', '')

        # Play attention sound for tools that require user input
        if tool_name in ATTENTION_TOOLS:
            play_attention()

        # Log tool completion
        session_id = input_data.get('session_id', 'unknown')
        log_dir = ensure_session_log_dir(session_id)
        log_path = log_dir / 'post_tool_use.json'

        # Read existing log data or initialize empty list
        if log_path.exists():
            with open(log_path, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []

        # Append new data
        log_data.append({
            "tool_name": tool_name,
            "attention_triggered": tool_name in ATTENTION_TOOLS,
        })

        # Write back to file with formatting
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2)

        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == '__main__':
    main()
