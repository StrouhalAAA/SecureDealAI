# Bug Planning

Create a new plan to resolve the bug using the exact specified markdown Plan Format.

## Variables

bug_description: $ARGUMENTS

## Instructions

- You're writing a plan to resolve a bug. Be thorough and precise to fix the root cause and prevent regressions.
- Create the plan in the `specs/` directory with filename: `bug-{descriptive-name}.md`
  - Replace `{descriptive-name}` with a short, descriptive name (e.g., "fix-validation-mismatch", "resolve-rls-policy", "patch-ocr-timeout")
- Research the codebase to understand the bug, reproduce it, and create a fix plan.
- Replace every `<placeholder>` in the Plan Format with the requested value.
- Think hard about the bug, its root cause, and the steps to fix it properly.
- Be surgical with your bug fix - solve the bug at hand and don't go off track.
- We want the minimal number of changes that will fix the bug.
- Reference existing patterns:
  - Validation logic in `supabase/functions/validation-run/`
  - Database schema in `docs/architecture/DB_SCHEMA_DYNAMIC_RULES.sql`
  - Validation rules in `docs/architecture/VALIDATION_RULES_SCHEMA.json`
- Start your research by reading `CLAUDE.md`.

## Relevant Files

Focus on the following files:
- `CLAUDE.md` - Project instructions and conventions
- `supabase/functions/validation-run/` - Core validation engine
- `apps/web/` - Frontend application
- `docs/architecture/` - Architecture documentation
- `supabase/migrations/` - Database migrations

## Plan Format

```md
# Bug: <bug name>

## Bug Description
<describe the bug in detail, including symptoms and expected vs actual behavior>

## Problem Statement
<clearly define the specific problem that needs to be solved>

## Solution Statement
<describe the proposed solution approach to fix the bug>

## Steps to Reproduce
<list exact steps to reproduce the bug>

## Root Cause Analysis
<analyze and explain the root cause of the bug>

## Relevant Files
Use these files to fix the bug:

<find and list the files that are relevant to the bug, describe why they are relevant in bullet points>

### New Files
<list any new files that need to be created, if any>

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

<list step by step tasks as h3 headers plus bullet points. Order matters - start with investigation, then fix, then test.>

<Your last step should be running the Validation Commands.>

## Database Changes
<if applicable, describe any schema changes or data fixes needed>

## Testing Strategy

### Regression Tests
<describe tests to ensure the bug is fixed>

### Edge Cases
<list edge cases that need to be tested>

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## Notes
<optionally list any additional notes or context relevant to the bug>
```

## Bug
$ARGUMENTS

## Report

- Return the path to the plan file created.
- Summarize the root cause and fix approach.
