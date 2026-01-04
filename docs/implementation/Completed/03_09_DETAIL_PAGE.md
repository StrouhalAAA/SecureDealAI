# Task 3.9: Detail Page (Multi-step Workflow)

> **Phase**: 3 - Frontend
> **Status**: Overview (see sub-tasks 3.9a, 3.9b, 3.9c)
> **Priority**: High
> **Depends On**: 3.3-3.8 All Components
> **Estimated Effort**: Medium (split into 3 sub-tasks)

---

## Overview

This task creates the main detail page that orchestrates the 4-step validation workflow. Due to its complexity, this task has been **split into 3 focused sub-tasks** to:
- Reduce complexity per implementation unit
- Enable parallel development of independent concerns
- Isolate testable concerns
- Reduce risk of integration failures

---

## Sub-Tasks

| Sub-Task | Description | Depends On | Status |
|----------|-------------|------------|--------|
| [3.9a Step Orchestration](./03_09a_STEP_ORCHESTRATION.md) | Step navigation logic & StepIndicator component | 3.1 | [ ] Pending |
| [3.9b Data Loading](./03_09b_DATA_LOADING.md) | useDetailData composable for Supabase queries | 3.1 | [ ] Pending |
| [3.9c Page Integration](./03_09c_PAGE_INTEGRATION.md) | Final Detail.vue assembly | 3.9a, 3.9b, 3.3-3.8 | [ ] Pending |

---

## Implementation Order

```
3.9a (Step Orchestration) ─┐
                           ├──→ 3.9c (Page Integration)
3.9b (Data Loading) ───────┘
```

Sub-tasks 3.9a and 3.9b can be developed **in parallel** since they have no dependencies on each other. Sub-task 3.9c requires both to be complete.

---

## Architecture Summary

### Composables

| Composable | Location | Purpose |
|------------|----------|---------|
| `useStepNavigation` | `src/composables/useStepNavigation.ts` | Step state, navigation functions |
| `useDetailData` | `src/composables/useDetailData.ts` | Data loading, setters, status updates |

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `StepIndicator` | `src/components/shared/StepIndicator.vue` | Single step circle + label |
| `StepProgress` | `src/components/shared/StepProgress.vue` | Full progress bar wrapper |
| `Detail` | `src/pages/Detail.vue` | Main page assembly |

---

## 4-Step Workflow

| Step | Index | Label | Component | Description |
|------|-------|-------|-----------|-------------|
| 1 | 0 | Vozidlo | VehicleForm | Enter vehicle data (VIN, brand, model) |
| 2 | 1 | Dodavatel | VendorForm | Enter vendor data (FO/PO, ICO, name) |
| 3 | 2 | Dokumenty | DocumentUpload | Upload & OCR process documents |
| 4 | 3 | Validace | ValidationResult | Display validation results |

---

## UI Specification

```
┌─────────────────────────────────────────────────────────────┐
│  SecureDealAI          SPZ: 5L94454          [← Dashboard]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Progress: [●]──────[●]──────[○]──────[○]                   │
│            Step 1   Step 2   Step 3   Step 4                │
│            Vozidlo  Dodavatel Dokumenty Validace            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │           [Current Step Component]                       ││
│  │                                                          ││
│  │           VehicleForm / VendorForm /                     ││
│  │           DocumentUpload / ValidationResult              ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  useDetailData  │────▶│  Detail.vue     │────▶│  Child          │
│  (composable)   │     │  (orchestrator) │     │  Components     │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Supabase      │     │ useStepNavigation│
│   Database      │     │   (composable)   │
└─────────────────┘     └─────────────────┘
```

---

## Validation Commands

```bash
# Run all Detail-related tests
cd MVPScope/frontend && npm run test -- --filter="Detail|StepIndicator|useStepNavigation|useDetailData"

# Run sub-task specific tests
cd MVPScope/frontend && npm run test -- --filter="useStepNavigation"   # 3.9a
cd MVPScope/frontend && npm run test -- --filter="useDetailData"       # 3.9b
cd MVPScope/frontend && npm run test -- --filter="Detail"              # 3.9c
```

---

## Validation Criteria

All criteria from sub-tasks must pass:

### From 3.9a (Step Orchestration)
- [ ] useStepNavigation composable tests pass
- [ ] StepIndicator component tests pass
- [ ] Navigation between steps works
- [ ] Step states update correctly

### From 3.9b (Data Loading)
- [ ] useDetailData composable tests pass
- [ ] Loading/error states work correctly
- [ ] All data types load correctly
- [ ] Status update works correctly

### From 3.9c (Page Integration)
- [ ] Detail page tests pass
- [ ] All child components integrated
- [ ] Event handling works correctly
- [ ] URL reflects opportunity ID

---

## Completion Checklist

- [ ] **3.9a**: useStepNavigation.ts, StepIndicator.vue, StepProgress.vue
- [ ] **3.9b**: useDetailData.ts
- [ ] **3.9c**: Detail.vue with full integration
- [ ] All tests passing (~50 test cases total)
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
