# Execute with GitHub Issue Tracking

Run an implementation plan while tracking progress on a GitHub issue.

## Variables

raw_args: $ARGUMENTS

## Arguments

Parse `$ARGUMENTS` to extract TWO arguments:
1. `github_issue_url` - Full GitHub issue URL (must start with `https://github.com/`)
2. `plan_file` - Path to implementation plan (.md file)

**Format**: `/issue <github_issue_url> <plan_file_path>`

**Example**: `/issue https://github.com/owner/repo/issues/4 docs/implementation/02_06_OCR.md`

## Instructions

### Step 1: Parse Arguments

From `$ARGUMENTS`, extract:
- The GitHub issue URL (first argument, starts with `https://github.com/`)
- The plan file path (second argument)

If arguments are missing or invalid, show usage and stop:
```
Usage: /issue <github_issue_url> <plan_file_path>

Example:
  /issue https://github.com/owner/repo/issues/4 docs/implementation/plan.md
```

### Step 2: Validate Plan File

Check that the plan file exists. If not, report error and stop.

### Step 3: Parse Issue URL

Extract from the GitHub URL:
- Repository path (owner/repo)
- Issue number

URL format: `https://github.com/{owner}/{repo}/issues/{number}`

### Step 4: Fetch Issue Details

Use `gh` CLI to fetch issue information:
```bash
gh issue view <issue_number> -R <owner/repo> --json number,title,body,state
```

Display:
- Issue number and title
- Issue state (open/closed)
- Issue URL

### Step 5: Post Start Comment

Post a comment indicating work has started:
```bash
gh issue comment <issue_number> -R <owner/repo> --body "[ADWS-BOT]

## ADWS Started

Working on this issue using plan: \`<plan_file>\`

| Field | Value |
|-------|-------|
| **Status** | In Progress |

_Updates will be posted when complete._"
```

Also add the "in-progress" label if it exists:
```bash
gh issue edit <issue_number> -R <owner/repo> --add-label "in-progress"
```

### Step 6: Execute Implementation

Read the plan file and execute each implementation step:

1. Read the plan file completely
2. Understand the full scope
3. Execute each step in the "Step by Step Tasks" or "Implementation Steps" section
4. Track progress as you go
5. Run all "Validation Commands" at the end

During implementation, keep in mind:
- The GitHub issue requirements from Step 4
- Ensure the implementation addresses the issue
- Follow existing codebase patterns

### Step 7: Post Completion Comment

On **success**, post summary comment:
```bash
gh issue comment <issue_number> -R <owner/repo> --body "[ADWS-BOT]

## ADWS Completed

Implementation complete for: \`<plan_file>\`

### Summary
| Field | Value |
|-------|-------|
| **Files Changed** | <count> |
| **Validation** | :white_check_mark: Passed |

### Changed Files
<list from git diff --stat>

_Ready for review._"
```

On **failure**, post error comment:
```bash
gh issue comment <issue_number> -R <owner/repo> --body "[ADWS-BOT]

## ADWS Failed

Implementation failed for: \`<plan_file>\`

### Error
\`\`\`
<error details>
\`\`\`"
```

### Step 8: Update Labels

On success:
```bash
gh issue edit <issue_number> -R <owner/repo> --remove-label "in-progress" --add-label "ready-for-review"
```

## Issue Context

The issue details fetched in Step 4 should inform your implementation:
- **Issue Title**: Summarizes what needs to be done
- **Issue Body**: Contains requirements, acceptance criteria, context
- **Issue State**: Should be "open" for work to proceed

Use this context to ensure your implementation fully addresses the issue.

## Plan

The second argument from `$ARGUMENTS` - the path to the implementation plan file.

## Report

After execution, provide:
- Issue number and title
- Summary of work completed (bullet points)
- Files changed with `git diff --stat`
- Validation command results
- Confirmation that issue comments were posted
- Any errors encountered
