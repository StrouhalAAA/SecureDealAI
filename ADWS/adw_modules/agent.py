"""Claude Code agent module for executing prompts programmatically."""

import subprocess
import sys
import os
import json
import re
import logging
from typing import Optional, List, Dict, Any, Tuple, Final
from dotenv import load_dotenv
from .data_types import (
    AgentPromptRequest,
    AgentPromptResponse,
    AgentTemplateRequest,
    SlashCommand,
)

# Load environment variables
load_dotenv()

# Get Claude Code CLI path from environment
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")

# Model selection mapping for slash commands
SLASH_COMMAND_MODEL_MAP: Final[Dict[str, str]] = {
    "/implement": "opus",
    "/validate": "sonnet",
    "/commit": "sonnet",
    "/pull_request": "sonnet",
    "/bug": "opus",
    "/feature": "opus",
}


def get_model_for_slash_command(slash_command: str, default: str = "sonnet") -> str:
    """Get the recommended model for a slash command."""
    return SLASH_COMMAND_MODEL_MAP.get(slash_command, default)


def check_claude_installed() -> Optional[str]:
    """Check if Claude Code CLI is installed. Return error message if not."""
    try:
        result = subprocess.run(
            [CLAUDE_PATH, "--version"], capture_output=True, text=True
        )
        if result.returncode != 0:
            return f"Error: Claude Code CLI is not installed. Expected at: {CLAUDE_PATH}"
    except FileNotFoundError:
        return f"Error: Claude Code CLI is not installed. Expected at: {CLAUDE_PATH}"
    return None


def parse_jsonl_output(output_file: str) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Parse JSONL output file and return all messages and the result message."""
    try:
        with open(output_file, "r") as f:
            messages = [json.loads(line) for line in f if line.strip()]

            result_message = None
            for message in reversed(messages):
                if message.get("type") == "result":
                    result_message = message
                    break

            return messages, result_message
    except Exception as e:
        print(f"Error parsing JSONL file: {e}", file=sys.stderr)
        return [], None


def convert_jsonl_to_json(jsonl_file: str) -> str:
    """Convert JSONL file to JSON array file."""
    json_file = jsonl_file.replace(".jsonl", ".json")
    messages, _ = parse_jsonl_output(jsonl_file)

    with open(json_file, "w") as f:
        json.dump(messages, f, indent=2)

    print(f"Created JSON file: {json_file}")
    return json_file


def get_claude_env() -> Dict[str, str]:
    """Get only the required environment variables for Claude Code execution."""
    from .utils import get_safe_subprocess_env
    return get_safe_subprocess_env()


def save_prompt(prompt: str, adw_id: str, agent_name: str = "implementor") -> None:
    """Save a prompt to the appropriate logging directory."""
    match = re.match(r"^(/\w+)", prompt)
    if not match:
        return

    slash_command = match.group(1)
    command_name = slash_command[1:]

    from .utils import get_project_root
    project_root = get_project_root()
    prompt_dir = os.path.join(project_root, "agents", adw_id, agent_name, "prompts")
    os.makedirs(prompt_dir, exist_ok=True)

    prompt_file = os.path.join(prompt_dir, f"{command_name}.txt")
    with open(prompt_file, "w") as f:
        f.write(prompt)

    print(f"Saved prompt to: {prompt_file}")


def prompt_claude_code(request: AgentPromptRequest) -> AgentPromptResponse:
    """Execute Claude Code with the given prompt configuration."""

    error_msg = check_claude_installed()
    if error_msg:
        return AgentPromptResponse(output=error_msg, success=False, session_id=None)

    save_prompt(request.prompt, request.adw_id, request.agent_name)

    output_dir = os.path.dirname(request.output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Build command
    cmd = [CLAUDE_PATH, "-p", request.prompt]
    cmd.extend(["--model", request.model])
    cmd.extend(["--output-format", "stream-json"])
    cmd.append("--verbose")

    if request.dangerously_skip_permissions:
        cmd.append("--dangerously-skip-permissions")

    env = get_claude_env()

    try:
        with open(request.output_file, "w") as f:
            result = subprocess.run(
                cmd, stdout=f, stderr=subprocess.PIPE, text=True, env=env
            )

        if result.returncode == 0:
            print(f"Output saved to: {request.output_file}")

            messages, result_message = parse_jsonl_output(request.output_file)
            json_file = convert_jsonl_to_json(request.output_file)

            if result_message:
                session_id = result_message.get("session_id")
                is_error = result_message.get("is_error", False)
                subtype = result_message.get("subtype", "")

                if subtype == "error_during_execution":
                    error_msg = "Error during execution: Agent encountered an error"
                    return AgentPromptResponse(
                        output=error_msg, success=False, session_id=session_id
                    )

                result_text = result_message.get("result", "")
                return AgentPromptResponse(
                    output=result_text, success=not is_error, session_id=session_id
                )
            else:
                with open(request.output_file, "r") as f:
                    raw_output = f.read()
                return AgentPromptResponse(
                    output=raw_output, success=True, session_id=None
                )
        else:
            error_msg = f"Claude Code error: {result.stderr}"
            print(error_msg, file=sys.stderr)
            return AgentPromptResponse(output=error_msg, success=False, session_id=None)

    except subprocess.TimeoutExpired:
        error_msg = "Error: Claude Code command timed out after 5 minutes"
        print(error_msg, file=sys.stderr)
        return AgentPromptResponse(output=error_msg, success=False, session_id=None)
    except Exception as e:
        error_msg = f"Error executing Claude Code: {e}"
        print(error_msg, file=sys.stderr)
        return AgentPromptResponse(output=error_msg, success=False, session_id=None)


def execute_template(request: AgentTemplateRequest) -> AgentPromptResponse:
    """Execute a Claude Code template with slash command and arguments."""
    # Override model based on slash command mapping
    if request.slash_command in SLASH_COMMAND_MODEL_MAP:
        mapped_model = SLASH_COMMAND_MODEL_MAP[request.slash_command]
        request = request.model_copy(update={"model": mapped_model})
    else:
        request = request.model_copy(update={"model": "sonnet"})

    # Construct prompt from slash command and args
    prompt = f"{request.slash_command} {' '.join(request.args)}"

    from .utils import get_project_root
    project_root = get_project_root()
    output_dir = os.path.join(
        project_root, "agents", request.adw_id, request.agent_name
    )
    os.makedirs(output_dir, exist_ok=True)

    output_file = os.path.join(output_dir, "raw_output.jsonl")

    prompt_request = AgentPromptRequest(
        prompt=prompt,
        adw_id=request.adw_id,
        agent_name=request.agent_name,
        model=request.model,
        dangerously_skip_permissions=True,
        output_file=output_file,
    )

    return prompt_claude_code(prompt_request)
