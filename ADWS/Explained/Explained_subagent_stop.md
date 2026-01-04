# Explained: subagent_stop.py

**Source File:** `AgenticCoding/.claude/hooks/subagent_stop.py`
**File Type:** Hook Script
**Generated:** 2026-01-04

---

## What Does It Do

The `subagent_stop.py` script is a **Claude Code hook** that fires whenever a **subagent** (spawned via the `Task` tool) completes its execution. Unlike the main `stop.py` hook which handles the primary conversation session, this hook specifically targets the completion events of autonomous subagents that were launched during the main session.

When Claude Code spawns a subagent using the Task tool (e.g., `subagent_type='Explore'`, `subagent_type='Plan'`, or custom agents), that subagent runs independently with its own context. When it finishes—whether successfully or due to an error—the `SubagentStop` hook fires, and this script captures and logs the completion metadata.

The script receives JSON data via stdin containing fields like `session_id`, `stop_hook_active`, and optionally `transcript_path`. It appends this completion event to a session-specific log file (`logs/{session_id}/subagent_stop.json`), building up a complete history of all subagent completions within a session. When invoked with the `--chat` flag, it can also convert the subagent's JSONL transcript to a more readable `chat.json` format.

The key outputs are:
- **`logs/{session_id}/subagent_stop.json`**: Array of all subagent completion events
- **`logs/{session_id}/chat.json`** (optional): Human-readable transcript when `--chat` is used

---

## How Does It Help Me as a Developer

In complex agentic workflows, you often spawn multiple subagents to handle parallel tasks, research, exploration, or specialized implementations. Without proper logging, you lose visibility into:
- **Which subagents actually completed** vs. timed out or failed silently
- **What each subagent discovered** before passing back a summary
- **The execution order** and timing of parallel agents

This hook provides automatic observability for your multi-agent orchestration. Every time a subagent finishes, you get a timestamped record in a structured JSON file. This is invaluable for debugging workflows where subagents might complete in unexpected order or return incomplete results.

### Key Benefits
- **Automatic audit trail**: No manual logging needed—every subagent completion is captured
- **Session isolation**: Logs are organized by session ID, making it easy to review specific workflow runs
- **Transcript preservation**: The `--chat` option converts raw JSONL transcripts to readable JSON arrays for post-mortem analysis
- **Graceful error handling**: The script never crashes or blocks—all exceptions exit cleanly with code 0

---

## How to Integrate with ADWS

The SecureDealAI ADWS (Agentic Development Workflow System) can benefit from subagent logging to track implementation plan progress. Since ADWS uses multi-step task automation with potential subagent spawning, integrating this hook provides visibility into agent behavior.

### Integration Steps
1. **Copy the hook script** to `/ADWS/.claude/hooks/subagent_stop.py`
2. **Copy the utility module** to `/ADWS/.claude/hooks/utils/constants.py`
3. **Register the hook** in `/ADWS/.claude/settings.json` under the `SubagentStop` event
4. **Optionally add `--chat`** flag if you want full transcript conversion

### Example Configuration in settings.json
```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "uv run $CLAUDE_PROJECT_DIR/.claude/hooks/subagent_stop.py || true"
          }
        ]
      }
    ]
  }
}
```

### Example Usage
After running an ADWS task that spawns exploration agents:
```bash
# View all subagent completions from a session
cat logs/{session_id}/subagent_stop.json | jq '.'

# Count how many subagents completed
cat logs/{session_id}/subagent_stop.json | jq 'length'
```

---

## Effect on ADWS Workflow and Agent Outputs

This hook is **purely observational**—it logs data but never blocks or modifies agent behavior. It uses `sys.exit(0)` in all code paths, meaning it always allows the workflow to continue unimpeded.

### Workflow Changes
- None—this is a passive logging hook that doesn't alter execution flow

### Output Changes
- **New log file**: `logs/{session_id}/subagent_stop.json` is created/appended
- **Optional transcript**: `logs/{session_id}/chat.json` created when `--chat` flag is used
- **No blocking**: Errors are caught and suppressed, ensuring workflow continuity

---

## Why Should I Learn This Concept

Understanding this hook teaches you about Claude Code's **hook lifecycle** and the **subagent execution model**. This is foundational knowledge for building sophisticated agentic workflows.

The `SubagentStop` hook is distinct from the regular `Stop` hook because it fires for each **Task tool invocation** (subagent), not just the main conversation. This distinction is critical when you're orchestrating multiple parallel agents—you need to understand that each subagent has its own lifecycle events.

### Key Learnings
- **Hook event types**: `SubagentStop` vs `Stop` distinguish main session from spawned agents
- **Graceful hook design**: Always exit 0, catch exceptions, fail silently—hooks should never block the AI
- **Session-based logging**: The pattern of `logs/{session_id}/` creates natural isolation for concurrent sessions
- **JSONL to JSON conversion**: The transcript format (`.jsonl`) differs from readable JSON arrays
- **uv script inline dependencies**: The `# /// script` syntax enables self-contained Python scripts with pip dependencies

---

## When Is It Overkill / Not Valuable

### Skip This When
- You're running simple single-turn interactions without subagents
- Your workflow doesn't use the `Task` tool to spawn subagents
- You have external monitoring (like Datadog or custom telemetry) that already captures agent events
- Disk space is constrained and you don't need historical logs

### Use Simpler Alternative When
- You only care about final results, not intermediate subagent completions—the main `Stop` hook suffices
- You need real-time streaming visibility—consider the `PostToolUse` hook instead
- You want alerts on subagent failure—add notification logic to this hook or use the `Notification` hook

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| Complexity | Low |
| Setup Time | 5-10 minutes |
| Best For | Multi-agent orchestration debugging and audit trails |
| Prerequisites | Claude Code hooks enabled, `uv` package manager available |
