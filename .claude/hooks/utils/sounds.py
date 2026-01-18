#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

"""
Sound notification utilities for Claude Code Hooks.

Uses macOS system sounds for notifications.
"""

import subprocess
import sys


# macOS system sounds paths
SOUNDS = {
    "attention": "/System/Library/Sounds/Ping.aiff",      # User attention needed
    "completion": "/System/Library/Sounds/Glass.aiff",    # Task completed
    "error": "/System/Library/Sounds/Basso.aiff",         # Error occurred
    "success": "/System/Library/Sounds/Hero.aiff",        # Success/victory
}


def play_sound(sound_name: str = "attention") -> bool:
    """
    Play a system sound.

    Args:
        sound_name: Name of sound to play (attention, completion, error, success)

    Returns:
        True if sound played successfully, False otherwise
    """
    sound_path = SOUNDS.get(sound_name, SOUNDS["attention"])

    try:
        # Use afplay on macOS (non-blocking with &)
        subprocess.run(
            ["afplay", sound_path],
            check=False,
            capture_output=True,
            timeout=5
        )
        return True
    except Exception:
        return False


def play_attention():
    """Play attention/notification sound."""
    return play_sound("attention")


def play_completion():
    """Play completion sound."""
    return play_sound("completion")


def play_error():
    """Play error sound."""
    return play_sound("error")


def play_success():
    """Play success sound."""
    return play_sound("success")


if __name__ == "__main__":
    # Allow testing from command line: python sounds.py [sound_name]
    sound = sys.argv[1] if len(sys.argv) > 1 else "attention"
    play_sound(sound)
