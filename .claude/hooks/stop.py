#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

"""
Stop hook for SecureDealAI.

This hook runs when Claude Code stops/completes and:
1. Plays a completion sound to notify the user
2. Logs session completion

Exit codes:
- 0: Success (hook completed)
"""

import json
import sys

from utils.constants import ensure_session_log_dir
from utils.sounds import play_completion


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Play completion sound
        play_completion()

        # Log session stop
        session_id = input_data.get('session_id', 'unknown')
        stop_reason = input_data.get('stop_reason', 'unknown')

        log_dir = ensure_session_log_dir(session_id)
        log_path = log_dir / 'stop.json'

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
            "stop_reason": stop_reason,
            "completion_sound_played": True,
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
