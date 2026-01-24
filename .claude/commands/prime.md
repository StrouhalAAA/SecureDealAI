# Prime Context

> Gather codebase context with optional mode for specific workflows.

## Variables

mode: $ARGUMENTS

## Instructions

- Parse mode argument (case-insensitive)
- If mode is "Bug" or "bug": execute Bug Mode
- Otherwise: execute General Mode
- Output structured YAML summary only - no prose, no explanations

## General Mode

Run:
```bash
git branch --show-current
git ls-files | head -100
```

Output Format:
```yaml
mode: general
branch: <branch-name>
file_count: <total files>
structure:
  - <top-level dirs and key files>
```

## Bug Mode

Use this when debugging work done by another agent on the current branch.

Run:
```bash
git branch --show-current
git log main..HEAD --oneline
git diff main --stat
git diff main --name-only
```

Output Format:
```yaml
mode: bug
branch: <branch-name>
base: main
commits:
  - hash: <short-hash>
    msg: <commit message>
files:
  modified:
    - <file-path>
  added:
    - <file-path>
  deleted:
    - <file-path>
stats:
  total_files: <n>
  insertions: <n>
  deletions: <n>
key_areas:
  - <summarize what parts of codebase were touched>
```

## Report

- Output ONLY the YAML block - nothing else
- Keep summaries terse (5 words max per item)
- This output feeds into `/bug` command for issue diagnosis
