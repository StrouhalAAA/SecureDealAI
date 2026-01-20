# Create Branch

Create a new local and remote branch following conventional naming patterns.

## Variables

branch_description: $ARGUMENTS

## Instructions

Create a new git branch with a conventional name and push it to the remote repository.

### Branch Naming Convention

Format: `{type}/{date}-{description}`

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `chore` - Maintenance, refactoring, tooling
- `docs` - Documentation changes
- `test` - Adding or updating tests

**Date format:** `YYYYMMDD` (e.g., 20260120)

**Description:** Lowercase, hyphen-separated, concise (e.g., `add-vendor-validation`)

### Examples
- `feat/20260120-add-ocr-retry`
- `fix/20260120-validation-status-bug`
- `chore/20260120-update-dependencies`

## Execution Steps

1. **Determine branch type** from the description:
   - If description mentions "bug", "fix", "error", "issue" → use `fix`
   - If description mentions "docs", "documentation", "readme" → use `docs`
   - If description mentions "test", "testing" → use `test`
   - If description mentions "refactor", "cleanup", "chore", "update deps" → use `chore`
   - Otherwise → use `feat`

2. **Generate branch name:**
   - Get today's date in YYYYMMDD format
   - Convert description to lowercase, hyphen-separated slug
   - Combine: `{type}/{date}-{slug}`

3. **Create and push branch:**
   ```bash
   git checkout -b {branch-name}
   git push -u origin {branch-name}
   ```

4. **Verify success** and report the branch name.

## Branch Description

$ARGUMENTS

## Report

- Display the created branch name
- Confirm the branch was pushed to remote
- Show the current branch status
