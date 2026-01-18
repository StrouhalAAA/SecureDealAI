# Mobile Preview Form Layout - Task Index

> **Feature**: Transform the opportunity detail form into a split-screen layout with desktop editing + mobile preview
> **Status**: Planning Complete
> **Total Tasks**: 20
> **Original Spec**: [../feature-mobile-preview-form-layout.md](../feature-mobile-preview-form-layout.md)

## Overview

This feature enables users to:
1. Edit vehicle/vendor data in a compact, mobile-like form panel (40% width)
2. See a live iPhone preview showing how data appears in the final mobile app (60% width)

## Task Breakdown by Phase

| Phase | Description | Tasks | Complexity |
|-------|-------------|-------|------------|
| [Phase 0](./phase-0-research.md) | Research & Exploration | 2 | Simple |
| [Phase 1](./phase-1-foundation.md) | Foundation Components | 3 | Simple-Medium |
| [Phase 2](./phase-2-preview-components.md) | Preview Content Components | 3 | Medium |
| [Phase 3](./phase-3-mobile-forms.md) | Mobile-Optimized Forms | 2 | Complex |
| [Phase 4](./phase-4-integration.md) | Detail.vue Integration | 5 | Simple-Medium |
| [Phase 5](./phase-5-polish-testing.md) | Polish & Testing | 5 | Simple-Medium |

## Quick Stats

- **Simple Tasks**: 12 (60%)
- **Medium Tasks**: 6 (30%)
- **Complex Tasks**: 2 (10%)

## Files to Create

| File | Task |
|------|------|
| `components/layout/SplitFormLayout.vue` | [1.1](./phase-1-foundation.md#task-11) |
| `components/preview/PhoneMockup.vue` | [1.2](./phase-1-foundation.md#task-12) |
| `components/preview/PhoneStatusBar.vue` | [1.3](./phase-1-foundation.md#task-13) |
| `components/preview/MobilePreviewScreen.vue` | [2.1](./phase-2-preview-components.md#task-21) |
| `components/preview/PreviewVehicleCard.vue` | [2.2](./phase-2-preview-components.md#task-22) |
| `components/preview/PreviewVendorCard.vue` | [2.3](./phase-2-preview-components.md#task-23) |
| `components/forms/MobileVehicleForm.vue` | [3.1](./phase-3-mobile-forms.md#task-31) |
| `components/forms/MobileVendorForm.vue` | [3.2](./phase-3-mobile-forms.md#task-32) |

## Files to Modify

| File | Tasks |
|------|-------|
| `pages/Detail.vue` | [4.1-4.5](./phase-4-integration.md) |

## Dependency Graph

```
Phase 0: [0.1, 0.2] ─────────────────────────────────────┐
                                                          │
Phase 1: [1.1, 1.3] parallel → [1.2] ────────────────────┤
                                                          │
Phase 2: [2.1] → [2.2, 2.3] parallel ────────────────────┤
                                                          │
Phase 3: [3.1, 3.2] parallel (after Phase 1) ────────────┤
                                                          │
Phase 4: [4.1] → [4.2] → [4.3] → [4.4] → [4.5] ──────────┤
                                                          │
Phase 5: [5.1, 5.2] parallel → [5.3] → [5.4-5.7] → [5.8]─┘
```

## Parallel Execution Opportunities

These task groups can run simultaneously:
- `[1.1, 1.3]` - Layout container + Status bar
- `[2.2, 2.3]` - Vehicle + Vendor preview cards
- `[3.1, 3.2]` - Mobile vehicle + vendor forms
- `[5.1, 5.2]` - Typography + Animations
- `[5.4, 5.5, 5.6, 5.7]` - All unit tests

## Acceptance Criteria (from spec)

- [ ] Split layout default: form 40% left, phone preview 60% right
- [ ] Phone mockup looks like realistic iPhone with notch, status bar, home indicator
- [ ] Vehicle data entered in form appears live in phone preview
- [ ] Vendor data entered in form appears live in phone preview
- [ ] Toggle button switches between split view and full-width form
- [ ] Layout preference persists via localStorage
- [ ] On screens < 1024px, only form shown (no preview)
- [ ] Mobile forms use single-column layout with larger touch targets
- [ ] Preview shows appropriate empty states
- [ ] All existing form validation works
- [ ] All existing tests pass
- [ ] Frontend builds without errors

## Validation Commands

```bash
npm run test:db                    # Supabase connection
cd apps/web && npm run build       # Build check
cd apps/web && npm run test        # Unit tests
```
