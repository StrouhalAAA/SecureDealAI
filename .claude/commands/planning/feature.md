# Feature Planning

Create a new plan to implement the feature using the exact specified markdown Plan Format.

## Variables

feature_description: $ARGUMENTS

## Instructions

- You're writing a plan to implement a new feature that will add value to SecureDealAI.
- Create the plan in the `specs/` directory with filename: `feature-{descriptive-name}.md`
  - Replace `{descriptive-name}` with a short, descriptive name (e.g., "add-vendor-validation", "implement-ocr-retry", "create-dashboard")
- Research the codebase to understand existing patterns, architecture, and conventions before planning.
- Replace every `<placeholder>` in the Plan Format with the requested value.
- Think hard about the feature requirements, design, and implementation approach.
- Follow existing patterns in the codebase:
  - Validation rules stored as JSON in PostgreSQL (not hardcoded)
  - Use existing transforms and comparators where applicable
  - Follow the RED/ORANGE/GREEN validation status logic
  - Edge Functions follow the pattern in `supabase/functions/`
- Reference existing documentation in `docs/architecture/` for context.
- Start your research by reading `CLAUDE.md` and `README.md`.

## Sub-Agent Research (Conditional)

When the feature involves **significant database work**, invoke the `supabase-expert` agent to ensure high-quality database design. Use your judgment based on these criteria:

### When to Invoke `supabase-expert`

**DO invoke** when the feature requires:
- New database tables or significant schema changes
- Row Level Security (RLS) policies
- Complex PostgreSQL queries or functions
- Database migrations with data transformations
- Edge Function database interactions
- Performance-sensitive queries or indexing decisions

**DON'T invoke** for:
- Simple column additions to existing tables
- Frontend-only changes
- Minor Edge Function updates without DB changes
- Configuration or documentation changes

### How to Use Sub-Agent Research

1. **Invoke the agent** with a focused prompt describing the database requirements:
   ```
   Use Task tool with subagent_type="supabase-expert":
   "Analyze database requirements for [feature]. Need schema design for [tables],
   RLS policies for [access patterns], and migration strategy.
   Project uses: PostgreSQL, Supabase Edge Functions, existing tables: [list relevant tables]."
   ```

2. **Integrate findings** into your plan:
   - Add schema recommendations to the "Database Changes" section
   - Include RLS policy code in implementation steps
   - Note any performance considerations or indexing recommendations
   - Reference the agent's security suggestions

3. **Document the research** in the plan's Notes section:
   ```
   ## Notes
   - Database design reviewed by supabase-expert agent
   - Key recommendations: [summarize main points]
   ```

## Relevant Files

Focus on the following files:
- `CLAUDE.md` - Project instructions and conventions
- `README.md` - Project overview
- `supabase/functions/` - Edge Functions (backend)
- `apps/web/` - Frontend application
- `docs/architecture/` - Architecture documentation
- `supabase/migrations/` - Database migrations

## Plan Format

```md
# Feature: <feature name>

## Feature Description
<describe the feature in detail, including its purpose and value to users>

## User Story
As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement
<clearly define the specific problem or opportunity this feature addresses>

## Solution Statement
<describe the proposed solution approach and how it solves the problem>

## Relevant Files
Use these files to implement the feature:

<find and list the files that are relevant to the feature, describe why they are relevant in bullet points>

### New Files
<list any new files that need to be created>

## Implementation Plan

### Phase 1: Foundation
<describe the foundational work needed before implementing the main feature>

### Phase 2: Core Implementation
<describe the main implementation work for the feature>

### Phase 3: Integration
<describe how the feature will integrate with existing functionality>

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

<list step by step tasks as h3 headers plus bullet points. Order matters - start with foundational changes then move to specific implementation. Include tests throughout.>

<Your last step should be running the Validation Commands.>

## Database Changes
<if applicable, describe schema changes, migrations, RLS policies>
<if supabase-expert agent was consulted, include its recommendations here>

### Schema Changes
<list new tables, columns, or modifications>

### Migrations
<SQL migration code or reference to migration file>

### RLS Policies
<Row Level Security policies if needed>

### Indexes & Performance
<any indexing recommendations or performance considerations>

## Testing Strategy

### Unit Tests
<describe unit tests needed for the feature>

### Edge Cases
<list edge cases that need to be tested>

## Acceptance Criteria
<list specific, measurable criteria that must be met for the feature to be considered complete>

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:db` - Test Supabase connection
- `supabase functions serve validation-run --env-file supabase/.env.local` - Test Edge Function locally
- `cd apps/web && npm run build` - Build frontend

## Notes
<optionally list any additional notes, future considerations, or context>
```

## Feature
$ARGUMENTS

## Report

- Return the path to the plan file created.
- Summarize the key implementation phases.
