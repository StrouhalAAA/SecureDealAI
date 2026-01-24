# Create Pull Request

Create a pull request with proper title and description.

## Variables

context: $ARGUMENTS

## Instructions

- Generate a PR title in format: `<type>: <description>`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- The PR body should include:
  - Summary section describing what was done
  - Link to any related spec/plan files
  - Key changes made
  - Testing performed
  - Checklist of completed items
- Examples of PR titles:
  - `feat: Add vendor ARES verification`
  - `fix: Resolve validation timeout for large batches`
  - `refactor: Simplify OCR extraction pipeline`

## Execution

1. Run `git branch` to confirm current branch
2. Run `git diff origin/main...HEAD --stat` to see changed files summary
3. Run `git log origin/main..HEAD --oneline` to see commits
4. Run `git push -u origin <current-branch>` to push the branch
5. Create PR using `gh pr create --title "<pr_title>" --body "<pr_body>" --base main`
6. Return the PR URL

## PR Body Template

```
## Summary
<2-3 sentences describing what this PR does>

## Changes
- <bullet list of key changes>

## Testing
- <how this was tested>

## Spec/Plan
<link to spec file if exists, or "N/A">

## Checklist
- [ ] Code follows project conventions
- [ ] Validation commands pass
- [ ] No new warnings or errors
```

## Context
$ARGUMENTS

## Report

- Return the PR URL.
- Show the PR title used.
