# SecureDealAI Implementation Workflow Guide

> **Purpose**: Team documentation explaining how each task was structured, executed, and tested
> **Created**: 2026-01-04
> **Audience**: Development Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Task Document Structure](#2-task-document-structure)
3. [Test-First Development Process](#3-test-first-development-process)
4. [Test Generation Patterns](#4-test-generation-patterns)
5. [Execution Workflow](#5-execution-workflow)
6. [Test Results Summary](#6-test-results-summary)
7. [Lessons Learned](#7-lessons-learned)

---

## 1. Overview

### Project Scope

- **Total Tasks**: 26 implementation tasks across 4 phases
- **Completed**: 22 tasks (84.6%)
- **Test Coverage**: 237 tests implemented

### Phase Distribution

| Phase | Tasks | Purpose |
|-------|-------|---------|
| Phase 1: Infrastructure | 5 | Database, storage, test setup |
| Phase 2: Backend API | 9 | Supabase Edge Functions |
| Phase 3: Frontend | 10 | Vue.js components and pages |
| Phase 4: Testing | 2 | E2E testing and polish |

---

## 2. Task Document Structure

Each task follows a **standardized document template** with these sections:

### 2.1 Header Metadata

```markdown
# Task X.X: Task Name

> **Phase**: X - Phase Name
> **Status**: [ ] Pending / [x] Implemented
> **Priority**: High/Medium/Low
> **Depends On**: List of prerequisite tasks
> **Estimated Effort**: Small/Medium/Large
```

**Purpose**: Quick reference for task tracking and dependency management.

### 2.2 Objective Section

One-paragraph description of what the task accomplishes.

```markdown
## Objective

Create a Supabase Edge Function for CRUD operations on the `buying_opportunities` table.
```

### 2.3 Prerequisites Checklist

```markdown
## Prerequisites

- [ ] Task 1.0 completed (test infrastructure setup)
- [ ] Task 1.1 completed (database schema applied)
- [ ] Task 1.4 completed (environment configured)
```

**Purpose**: Ensures dependencies are met before starting work.

### 2.4 Test-First Development Section

This is the **core TDD section** present in implementation-heavy tasks:

```markdown
## Test-First Development

### Required Tests (Write Before Implementation)

Create test file: `path/to/test-file.test.ts`

[Test code block with complete test implementations]

### Test-First Workflow

1. **RED**: Write tests above, run them - they should FAIL
2. **GREEN**: Implement the function until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

```bash
# Run tests (should fail before implementation)
cd MVPScope/supabase && deno task test -- --filter="task-name"
```
```

### 2.5 API/UI Specification

Detailed specification of what to build:

- **Backend tasks**: API endpoints, request/response schemas
- **Frontend tasks**: ASCII wireframes, component props

### 2.6 Implementation Steps

Step-by-step instructions with code samples:

```markdown
## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p MVPScope/supabase/functions/function-name
```

### Step 2: Implement index.ts

```typescript
// Complete implementation code provided
```

### Step 3: Deploy Function

```bash
supabase functions deploy function-name
```
```

### 2.7 Validation Criteria

Checklist of acceptance criteria:

```markdown
## Validation Criteria

- [ ] POST creates new record
- [ ] GET retrieves by ID
- [ ] Error handling implemented
- [ ] Tests pass
```

### 2.8 Completion Checklist

Final task checklist:

```markdown
## Completion Checklist

- [ ] Function created and deployed
- [ ] All operations working
- [ ] Tests pass
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
```

---

## 3. Test-First Development Process

### 3.1 The RED-GREEN-REFACTOR Cycle

The documentation prescribed a classic TDD workflow:

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD CYCLE                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────┐                                                │
│   │  RED    │  1. Write test for new feature                │
│   │         │  2. Run test → FAILS (no implementation)      │
│   └────┬────┘                                                │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────┐                                                │
│   │  GREEN  │  3. Write minimal code to pass test           │
│   │         │  4. Run test → PASSES                         │
│   └────┬────┘                                                │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────┐                                                │
│   │REFACTOR │  5. Clean up code                             │
│   │         │  6. Run test → Still PASSES                   │
│   └────┬────┘                                                │
│        │                                                     │
│        └──────────────────────────────────────→ Repeat      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Test Execution Commands

#### Backend Tests (Deno)

```bash
# Run all backend tests
cd supabase && deno task test

# Run specific module tests
deno task test -- --filter="buying-opportunity"
deno task test -- --filter="vehicle"
deno task test -- --filter="vendor"
```

#### Frontend Tests (Vitest)

```bash
# Run all frontend tests
cd apps/web && npm run test

# Run specific component tests
npm run test -- --filter="VehicleForm"
npm run test -- --filter="Dashboard"
```

#### E2E Tests (Playwright)

```bash
# Run all E2E tests
cd apps/web && npx playwright test

# Run with UI
npx playwright test --ui
```

---

## 4. Test Generation Patterns

### 4.1 Backend API Test Pattern

Tests for Edge Functions follow this pattern:

```typescript
import { assertEquals, assertExists } from "@std/assert";
import { getTestClient, cleanupTestData, generateTestSpz } from "./test-utils.ts";

const BASE_URL = "http://localhost:54321/functions/v1/endpoint-name";

// Helper functions for test setup
async function createTestOpportunity() {
  const spz = generateTestSpz();
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spz })
  });
  const { id } = await res.json();
  return { id, spz };
}

// Test: Happy path
Deno.test("POST creates resource with valid data", async () => {
  const { id, spz } = await createTestOpportunity();

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ /* valid data */ })
  });

  assertEquals(res.status, 201);
  const json = await res.json();
  assertExists(json.id);

  await cleanupTestData(spz);  // Always cleanup
});

// Test: Validation error
Deno.test("POST rejects invalid data", async () => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ /* invalid data */ })
  });

  assertEquals(res.status, 400);
});

// Test: Not found
Deno.test("GET returns 404 for non-existent ID", async () => {
  const res = await fetch(`${BASE_URL}?id=00000000-0000-0000-0000-000000000000`);
  assertEquals(res.status, 404);
});
```

### 4.2 Frontend Component Test Pattern

Vue component tests follow this pattern:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ComponentName from '../ComponentName.vue'

// Mock external dependencies
vi.mock('@/composables/useSupabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      // Mock chain
    }))
  }
}))

describe('ComponentName', () => {
  const defaultProps = {
    // Default test props
  }

  // Test: Renders correctly
  it('renders all required fields', () => {
    const wrapper = mount(ComponentName, { props: defaultProps })
    expect(wrapper.text()).toContain('Expected text')
  })

  // Test: User interaction
  it('validates input on change', async () => {
    const wrapper = mount(ComponentName, { props: defaultProps })
    const input = wrapper.find('input')
    await input.setValue('invalid')
    expect(wrapper.text()).toContain('error message')
  })

  // Test: Form submission
  it('emits event on valid submit', async () => {
    const wrapper = mount(ComponentName, { props: defaultProps })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('saved')).toBeTruthy()
  })
})
```

### 4.3 E2E Test Pattern

Playwright tests for full user flows:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test('completes full workflow', async ({ page }) => {
    // Navigate to starting page
    await page.goto('/');

    // Interact with UI
    await page.click('button:has-text("Create")');
    await page.fill('input[name="spz"]', '5L94454');
    await page.click('button:has-text("Submit")');

    // Verify result
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

---

## 5. Execution Workflow

### 5.1 Task Execution Order

Tasks were executed following the dependency graph:

```
Phase 1 (Infrastructure) - Foundation Layer
├── 1.0 Test Infrastructure Setup    ← FIRST (enables TDD)
├── 1.1 Database Schema              ← SECOND
├── 1.2 Seed Validation Rules        ← Depends on 1.1
├── 1.3 Storage Bucket               ← Independent
└── 1.4 Environment Configuration    ← Independent

Phase 2 (Backend) - API Layer
├── 2.1-2.3 CRUD APIs               ← Depends on 1.1
├── 2.4 ARES Lookup                 ← Depends on 1.4
├── 2.5 Document Upload             ← Depends on 1.3
├── 2.6 OCR Extract                 ← Depends on 2.5
├── 2.7 ARES Validate               ← Depends on 2.4
├── 2.8 Validation Run              ← Already complete
└── 2.9 Validation Preview          ← Depends on 2.8

Phase 3 (Frontend) - UI Layer
├── 3.1 Vue.js Setup                ← Foundation
├── 3.2 Dashboard                   ← Depends on 3.1, 2.1
├── 3.3-3.4 Forms                   ← Depends on 3.1
├── 3.5-3.7 Status Components       ← Depends on 3.1 + APIs
├── 3.8 Validation Result           ← Depends on 3.1, 2.8
├── 3.9 Detail Page                 ← Depends on forms
└── 3.10 Validation Sidebar         ← Depends on 2.9

Phase 4 (Testing) - Quality Layer
├── 4.1 E2E Testing                 ← Depends on all above
└── 4.2 Error Handling              ← Final polish
```

### 5.2 Single Task Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  TASK EXECUTION FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. PREPARATION                                              │
│     ├── Read task document                                   │
│     ├── Verify prerequisites complete                        │
│     └── Set up development environment                       │
│                                                              │
│  2. TEST CREATION (TDD Red Phase)                            │
│     ├── Create test file from document template              │
│     ├── Run tests → Verify they FAIL                        │
│     └── Commit: "Add failing tests for Task X.X"            │
│                                                              │
│  3. IMPLEMENTATION (TDD Green Phase)                         │
│     ├── Follow "Implementation Steps" from document          │
│     ├── Write minimal code to pass tests                     │
│     ├── Run tests → Verify they PASS                        │
│     └── Commit: "Implement Task X.X"                        │
│                                                              │
│  4. REFACTOR (TDD Refactor Phase)                            │
│     ├── Clean up code                                        │
│     ├── Run tests → Verify still PASS                       │
│     └── Commit: "Refactor Task X.X"                         │
│                                                              │
│  5. VALIDATION                                               │
│     ├── Run validation commands from document                │
│     ├── Check all validation criteria                        │
│     └── Verify completion checklist                          │
│                                                              │
│  6. DOCUMENTATION                                            │
│     ├── Update task status to [x] Implemented                │
│     ├── Update 00_IMPLEMENTATION_TRACKER.md                  │
│     └── Move to Completed/ folder                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Automated Execution (ADWS)

For automated task execution, an AI Developer Workflow System (ADWS) was designed:

```bash
# Run single task
uv run run_task.py 02_06

# Run with GitHub issue tracking
uv run run_task.py 02_06 --issue 5

# Run entire phase
uv run run_phase.py 2
```

The ADWS uses Claude Code CLI with custom slash commands:

| Command | Purpose |
|---------|---------|
| `/implement` | Execute all steps from a plan file |
| `/validate` | Run validation commands from plan |

---

## 6. Test Results Summary

### 6.1 Test Counts by Category

| Category | Test Files | Test Count | Status |
|----------|------------|------------|--------|
| Backend Unit (Deno) | 7 | 90 | 32 passed, 58 ignored* |
| Frontend Unit (Vitest) | 8 | 137 | 137 passed |
| E2E (Playwright) | 3 | ~10 | Ready |
| **Total** | **18** | **237** | **169 verified** |

*58 backend tests are integration tests requiring running Supabase instance

### 6.2 Test Files Created

#### Backend Tests (`supabase/functions/tests/`)

| File | Tests | Coverage |
|------|-------|----------|
| `buying-opportunity.test.ts` | 16 | CRUD operations |
| `vehicle.test.ts` | 16 | CRUD + VIN validation |
| `vendor.test.ts` | 19 | FO/PO vendor types |
| `document-upload.test.ts` | 13 | File upload + validation |
| `ocr-extract.test.ts` | 14 | OCR processing |
| `ares-lookup.test.ts` | ~6 | ARES API integration |
| `smoke.test.ts` | 1 | Connection verification |

#### Frontend Tests (`apps/web/src/`)

| File | Tests | Coverage |
|------|-------|----------|
| `VehicleForm.test.ts` | 37 | Form validation + submission |
| `VendorForm.test.ts` | 40 | FO/PO forms + ARES |
| `StepIndicator.spec.ts` | ~5 | Navigation component |
| `useDetailData.spec.ts` | ~10 | Data loading composable |
| `useStepNavigation.spec.ts` | ~10 | Step logic |
| `Detail.spec.ts` | ~15 | Detail page integration |

#### E2E Tests (`apps/web/e2e/`)

| File | Scenarios | Coverage |
|------|-----------|----------|
| `dashboard.spec.ts` | 5 | List, create, search |
| `validation-flow.spec.ts` | 3 | GREEN, ORANGE, RED flows |
| `smoke.spec.ts` | 1 | App loads correctly |

---

## 7. Lessons Learned

### 7.1 What Worked Well

1. **Standardized Document Structure**
   - Consistent format made tasks predictable
   - Code samples reduced implementation ambiguity
   - Validation criteria provided clear acceptance tests

2. **Pre-defined Tests**
   - Tests in documents served as specification
   - Reduced decision fatigue during implementation
   - Ensured consistent test patterns across team

3. **Dependency Tracking**
   - Clear prerequisite lists prevented blocked work
   - Tracker file provided project visibility

### 7.2 Areas for Improvement

1. **TDD Execution**
   - Tests should be committed separately from implementation
   - Recommend: Enforce "failing tests first" commit pattern

2. **Test Coverage Documentation**
   - Only 34.6% of tasks had explicit TDD sections
   - Recommend: Add TDD section to all implementation tasks

3. **Integration Test Strategy**
   - 58 tests require running Supabase (ignored in CI)
   - Recommend: Add test database setup to CI pipeline

### 7.3 Recommended Improvements

```markdown
## Future Task Template Additions

1. Add TDD section to ALL implementation tasks
2. Include test run screenshot/output expectations
3. Add CI/CD validation step
4. Include rollback instructions for failed deploys
```

---

## Appendix A: Quick Reference

### Run All Tests

```bash
# Backend
cd supabase && deno task test

# Frontend
cd apps/web && npm run test

# E2E
cd apps/web && npx playwright test
```

### Update Tracker

After completing a task:
1. Change `[ ] Pending` to `[x] Implemented`
2. Add completion date
3. Update progress counts in tracker header
4. Move task document to `Completed/` folder

### Task Document Locations

| Location | Contents |
|----------|----------|
| `docs/implementation/` | Tracker + pending tasks |
| `docs/implementation/Completed/` | Completed task documents |

---

*This guide reflects the implementation workflow as designed. For TDD compliance analysis, see `TDD_COMPLIANCE_ANALYSIS.md`.*
