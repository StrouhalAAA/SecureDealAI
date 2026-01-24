# Learn AgenticCoding Concept

Analyze a file from the `AgenticCoding/` folder and generate a structured explanation document saved to `ADWS/Explained/`.

## Variables

file_path: $ARGUMENTS

## Instructions

### 1. Validate Input

If `file_path` is empty, respond with available learning targets:
```
Available learning targets in AgenticCoding/:

SLASH COMMANDS (.claude/commands/)
  implement.md   - Executes implementation plans (HIGH PRIORITY)
  feature.md     - Creates feature specifications (HIGH PRIORITY)
  prime.md       - Primes agent with codebase context (HIGH PRIORITY)
  test.md        - Runs test suites
  review.md      - Reviews implementations
  document.md    - Generates documentation
  commit.md      - Creates git commits

PYTHON MODULES (adws/adw_modules/)
  agent.py       - Claude Code CLI integration (HIGH PRIORITY)
  state.py       - Workflow state persistence (HIGH PRIORITY)
  data_types.py  - Pydantic data models
  utils.py       - Shared utilities
  workflow_ops.py - Core workflow operations

HOOK SCRIPTS (.claude/hooks/)
  pre_tool_use.py  - Security gate (HIGH PRIORITY)
  post_tool_use.py - Logs tool results

DOCUMENTATION (Learning/)
  ADW_REUSE_GUIDE.md - How to adapt ADW (HIGH PRIORITY)

Usage: /learn AgenticCoding/.claude/commands/implement.md
       /learn adws/adw_modules/agent.py
```

### 2. Resolve File Path

- If path doesn't start with `AgenticCoding/` and isn't absolute, prepend `AgenticCoding/`
- Validate the file exists
- If file not found, suggest similar files

### 3. Determine File Type

Categorize the file for tailored analysis:

| Extension/Location | Type | Analysis Focus |
|-------------------|------|----------------|
| `.claude/commands/*.md` | Slash Command | Variables ($ARGUMENTS), sections, workflow intent |
| `adw_modules/*.py` | Python Module | Classes, functions, imports, integration points |
| `.claude/hooks/*.py` | Hook Script | Trigger events, security patterns, block/log behavior |
| `Learning/*.md` | Documentation | Key concepts, actionable takeaways |

### 4. Read and Analyze the File

**For Slash Commands (.md):**
- Identify all variables: `$ARGUMENTS`, `$1`, `$2`, etc.
- Document the section structure (Instructions, Plan, Report)
- Explain the intended workflow and when to use it
- Note any output templates or formats

**For Python Modules (.py):**
- List main classes and their purposes
- Document key public functions with signatures
- Identify imports and dependencies on other modules
- Explain integration patterns with ADWS

**For Hook Scripts (.py):**
- Identify the hook type (pre_tool_use, post_tool_use, etc.)
- List what actions/tools trigger this hook
- Document what gets blocked (exit code 2) vs logged
- Explain security patterns demonstrated

**For Documentation (.md):**
- Extract main sections and their purposes
- Identify actionable instructions vs reference material
- Note code examples and their applicability to SecureDealAI ADWS

### 5. Generate Output Filename

Derive from input path:
- Extract base filename without extension
- Prepend `Explained_`
- Use `.md` extension

Examples:
- `implement.md` → `Explained_implement.md`
- `agent.py` → `Explained_agent.md`
- `pre_tool_use.py` → `Explained_pre_tool_use.md`
- `ADW_REUSE_GUIDE.md` → `Explained_ADW_REUSE_GUIDE.md`

### 6. Write Explanation Document

Create the file at `ADWS/Explained/{output_filename}` using this exact template:

```md
# Explained: {original_filename}

**Source File:** `{full_source_path}`
**File Type:** {Slash Command | Python Module | Hook Script | Documentation}
**Generated:** {YYYY-MM-DD}

---

## What Does It Do

<2-4 paragraphs explaining:
- Core functionality and purpose
- What problem it solves
- Inputs it accepts
- Outputs it produces
- For code: main classes/functions>

---

## How Does It Help Me as a Developer

<Explain practical benefits in the SecureDealAI context:
- Time savings and automation gains
- Consistency improvements
- Reduced cognitive load
- Concrete workflow examples>

### Key Benefits
- <benefit 1>
- <benefit 2>
- <benefit 3>

---

## How to Integrate with ADWS

<Specific guidance for SecureDealAI's ADWS in /ADWS/:
- Where this fits in the existing structure
- What changes needed to use it
- Compatibility with run_task.py, run_phase.py>

### Integration Steps
1. <step 1>
2. <step 2>
3. <step 3>

### Example Usage
```bash
<concrete example in ADWS context>
```

---

## Effect on ADWS Workflow and Agent Outputs

<If applicable:
- How workflow behavior changes
- Impact on agent outputs
- Changes to state management
- Effect on dependency tracking

If NOT applicable, state: "This is a standalone utility with no direct effect on ADWS workflow execution.">

### Workflow Changes
- <change 1 or "None">

### Output Changes
- <change 1 or "None">

---

## Why Should I Learn This Concept

<Explain learning value:
- What understanding this unlocks
- Patterns it demonstrates
- How it fits broader AgenticCoding philosophy
- Prerequisites for other concepts>

### Key Learnings
- <learning 1>
- <learning 2>
- <learning 3>

---

## When Is It Overkill / Not Valuable

<Honest assessment:
- Scenarios where simpler approaches work better
- When overhead exceeds benefit
- Project sizes where this adds unnecessary complexity>

### Skip This When
- <scenario 1>
- <scenario 2>

### Use Simpler Alternative When
- <alternative scenario>

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| Complexity | {Low / Medium / High} |
| Setup Time | {estimate: minutes or hours} |
| Best For | {primary use case} |
| Prerequisites | {what's needed first} |
```

## Feature

$ARGUMENTS

## Report

- Confirm the explanation file was created at `ADWS/Explained/{filename}`
- Return the full path to the generated file
- List the 3 most important takeaways from the analysis
