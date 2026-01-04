# Generate Git Commit

Create a git commit with a properly formatted message.

## Variables

context: $ARGUMENTS

## Instructions

- Generate a concise commit message following conventional commits format
- Format: `<type>(<scope>): <description>`
- Types:
  - `feat` - New feature
  - `fix` - Bug fix
  - `refactor` - Code refactoring
  - `docs` - Documentation changes
  - `test` - Adding or updating tests
  - `chore` - Maintenance tasks
- The description should be:
  - Present tense (e.g., "add", "fix", "update")
  - 50 characters or less
  - Descriptive of the actual changes
  - No period at the end
- Examples:
  - `feat(validation): add vendor verification rule`
  - `fix(ocr): resolve timeout on large documents`
  - `refactor(engine): simplify transform pipeline`
  - `docs(api): update rule management endpoints`

## Execution

1. Run `git status` to see what files changed
2. Run `git diff HEAD` to understand the changes
3. Run `git add -A` to stage all changes
4. Generate appropriate commit message based on changes
5. Run `git commit -m "<generated_commit_message>"`

## Context
$ARGUMENTS

## Report

- Return the commit message used.
- Show the commit hash.
