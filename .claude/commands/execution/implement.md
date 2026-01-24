# Implement Plan

Execute the implementation plan step by step, optionally tracking progress on a GitHub issue.

## Variables

raw_args: $ARGUMENTS

## Argument Parsing

Parse `$ARGUMENTS` to extract:
- `plan_file`: First non-flag argument (required path to .md file)
- `issue_url`: Value after `--issue` flag (optional GitHub issue URL)

**Examples**:
- `/implement docs/plan.md` - Execute plan without issue tracking
- `/implement docs/plan.md --issue https://github.com/owner/repo/issues/4` - Execute with issue tracking

## Instructions

### Step 1: Parse Arguments

From `$ARGUMENTS`, extract:
1. The plan file path (first argument before any flags)
2. Optional `--issue <url>` flag and its value

If no plan file is provided, show usage:
```
Usage: /implement <plan_file> [--issue <github_issue_url>]

Examples:
  /implement docs/implementation/02_06_OCR.md
  /implement docs/plan.md --issue https://github.com/owner/repo/issues/4
```

### Step 2: Validate Plan File

Check that the plan file exists. Read it to understand the scope.

### Step 3: GitHub Issue Integration (if --issue provided)

If the `--issue` flag is present:

1. **Parse the URL** to extract repo (owner/repo) and issue number

2. **Fetch issue details**:
   ```bash
   gh issue view <number> -R <owner/repo> --json number,title,body,state
   ```

3. **Post start comment**:
   ```bash
   gh issue comment <number> -R <owner/repo> --body "[ADWS-BOT]

   ## ADWS Started

   Working on: \`<plan_file>\`
   Status: In Progress"
   ```

4. **Mark in-progress**:
   ```bash
   gh issue edit <number> -R <owner/repo> --add-label "in-progress"
   ```

5. **Store issue context** to reference during implementation

### Step 4: Execute Implementation

1. Read the plan file at the provided path
2. Understand the full scope before starting
3. If issue context is available, ensure implementation addresses issue requirements
4. Execute each step in the "Step by Step Tasks" or "Implementation Steps" section
5. Follow existing patterns and conventions in the codebase
6. Think carefully about each step before implementing

### Step 5: Deploy Modified Edge Functions

After implementing changes, check if any Supabase Edge Functions were modified:

1. **Detect modified functions**:
   ```bash
   git diff --name-only | grep '^supabase/functions/' | cut -d'/' -f3 | sort -u
   ```

2. **Deploy each modified function**:
   For each function name found:
   ```bash
   supabase functions deploy <function-name>
   ```

3. **Report deployment status**:
   - List functions deployed
   - Note any deployment failures

> **Note**: This step is skipped if no Edge Functions were modified.

### Step 6: Run Validation

Run all "Validation Commands" from the plan file at the end.
Track which commands pass and which fail.

### Step 7: Post Issue Update (if --issue provided)

If `--issue` flag was provided:

**On success**:
```bash
gh issue comment <number> -R <owner/repo> --body "[ADWS-BOT]

## ADWS Completed

Implementation complete for: \`<plan_file>\`

### Summary
- Files Changed: <count>
- Validation: Passed

### Changed Files
<git diff --stat output>

Ready for review."
```

Update labels:
```bash
gh issue edit <number> -R <owner/repo> --remove-label "in-progress" --add-label "ready-for-review"
```

**On failure**:
```bash
gh issue comment <number> -R <owner/repo> --body "[ADWS-BOT]

## ADWS Failed

Error details:
\`\`\`
<error message>
\`\`\`"
```

## GitHub Issue Context

If `--issue` flag is provided, the issue details will be fetched and displayed here.
Use this context to ensure the implementation addresses the issue requirements.

## Plan

The first argument from `$ARGUMENTS` - the path to the implementation plan file.

## Report

After execution, provide:
- Summary of work completed in a concise bullet point list
- Files and total lines changed with `git diff --stat`
- Edge Functions deployed (if any)
- Validation command results (pass/fail for each)
- If issue tracking was enabled:
  - Confirm comments were posted
  - Show issue URL for reference
- Any errors or warnings encountered
