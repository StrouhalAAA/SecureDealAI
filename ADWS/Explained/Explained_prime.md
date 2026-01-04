# Explained: prime.md

**Source File:** `AgenticCoding/.claude/commands/prime.md`
**File Type:** Slash Command
**Generated:** 2026-01-04

---

## What Does It Do

The `prime.md` slash command is a **context-loading utility** designed to rapidly familiarize an AI agent with a codebase at the start of a coding session. It serves as a "warm-up" mechanism that ensures the agent has foundational knowledge before tackling any implementation work.

The command works in three sequential phases:
1. **Run**: Executes `git ls-files` to get a complete inventory of all tracked files in the repository
2. **Read**: Loads critical documentation files (README.md, project-specific READMEs) into context
3. **Conditional Reading**: References a `conditional_docs.md` guide that helps the agent determine which additional documentation to read based on the upcoming task

The command produces no output file—instead, it loads information directly into the agent's context window, preparing it for subsequent tasks. Think of it as "priming the pump" before the real work begins.

---

## How Does It Help Me as a Developer

When working with AI agents on a codebase, one of the biggest friction points is the "cold start" problem: the agent knows nothing about your project structure, conventions, or architecture. This leads to:
- Agents making assumptions that don't match your codebase
- Time wasted explaining project structure repeatedly
- Inconsistent code that doesn't follow existing patterns

The `/prime` command eliminates this friction by establishing a shared understanding before any implementation begins. In the SecureDealAI context, this means the agent will understand:
- The Supabase Edge Functions architecture
- The validation rules system
- Frontend Vue.js patterns
- Database schema relationships

### Key Benefits
- **Faster onboarding**: No need to manually explain project structure each session
- **Consistent context**: Every session starts with the same foundational knowledge
- **Task-aware loading**: The conditional docs system prevents context bloat by only loading relevant documentation
- **Reduced errors**: Agent understands existing patterns before writing new code

---

## How to Integrate with ADWS

For SecureDealAI's ADWS, this command should be placed at `.claude/commands/prime.md`. The Read section needs adjustment to reference SecureDealAI's actual documentation structure.

### Integration Steps
1. Create the file at `.claude/commands/prime.md`
2. Update the Read section to reference SecureDealAI documentation:
   - `CLAUDE.md` (already exists, contains project overview)
   - `ADWS/REFERENCE.md` (workflow documentation)
   - `.claude/commands/conditional_docs.md` (create this for task-specific loading)
3. Optionally create a `conditional_docs.md` that lists when to read specific docs

### Example Usage
```bash
# In Claude Code, start any session with:
/prime

# The agent will then have context about:
# - All project files (via git ls-files)
# - Core project documentation
# - Guidance on what else to read for specific tasks
```

---

## Effect on ADWS Workflow and Agent Outputs

The `/prime` command is a **pre-workflow utility**—it should be run before `/implement`, `/issue`, `/feature`, or `/bug` commands. It doesn't directly affect workflow execution but significantly improves the quality of outputs from subsequent commands.

### Workflow Changes
- **Recommended usage pattern**: Run `/prime` at the start of each Claude Code session
- **Reduced context confusion**: Agents start with accurate mental model of the codebase
- **Better code generation**: Implementations follow existing patterns and conventions

### Output Changes
- Code generated after priming is more consistent with existing codebase style
- Fewer questions from the agent about project structure
- More accurate file placement decisions

---

## Why Should I Learn This Concept

Understanding the prime command teaches you a fundamental principle of agentic coding: **context management is critical to output quality**. AI agents don't have persistent memory between sessions—each conversation starts fresh. The prime command is a pattern for solving this "amnesia" problem.

This concept also demonstrates the value of **progressive disclosure**—rather than dumping all documentation at once (which wastes context window), the conditional_docs system loads information just-in-time based on the task at hand.

### Key Learnings
- **Context window is precious**: Only load what's needed for the current task
- **Structured priming beats ad-hoc explanation**: A repeatable priming process ensures consistency
- **Conditional loading scales**: As projects grow, conditional_docs prevents context bloat

---

## When Is It Overkill / Not Valuable

### Skip This When
- **Single-file changes**: If you're just fixing a typo or updating one constant, priming adds unnecessary overhead
- **You've already given context**: If you've been working in the same session and already explained the project
- **Exploratory conversations**: If you're just asking questions rather than implementing code

### Use Simpler Alternative When
- For quick tasks, simply reference the specific file: "Look at `CLAUDE.md` for project context"
- For repeated similar tasks, the agent may retain sufficient context from previous exchanges in the same session

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| Complexity | Low |
| Setup Time | 10-15 minutes |
| Best For | Starting new Claude Code sessions before implementation |
| Prerequisites | `CLAUDE.md` or equivalent project documentation |
