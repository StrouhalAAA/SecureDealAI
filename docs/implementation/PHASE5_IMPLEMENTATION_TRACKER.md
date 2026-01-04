# SecureDealAI - Phase 5: Access Code Authentication Tracker

> **Version**: 1.0
> **Created**: 2026-01-04
> **Last Updated**: 2026-01-04
> **Status**: PENDING IMPLEMENTATION

---

## Overview

This document tracks the implementation progress of Phase 5: Access Code Authentication for SecureDealAI. This phase adds internal-user access control to the production deployment.

**Purpose**: Restrict application access to internal users with a shared access code.

**Architecture Document**: [05_00_ACCESS_CODE_ARCHITECTURE.md](./05_00_ACCESS_CODE_ARCHITECTURE.md)

---

## Progress Summary

| Phase | Total Tasks | Completed | In Progress | Pending |
|-------|-------------|-----------|-------------|---------|
| Phase 5: Access Code Auth | 7 | 0 | 0 | 7 |

**Estimated Total Effort**: 9.5 hours

---

## Task Overview

| # | Task | Document | Status | Depends On | Est. Time |
|---|------|----------|--------|------------|-----------|
| 5.1 | Verify Access Code Edge Function | [05_01_VERIFY_ACCESS_CODE.md](./05_01_VERIFY_ACCESS_CODE.md) | [ ] Pending | None | 2h |
| 5.2 | Enable JWT Verification | [05_02_ENABLE_JWT_VERIFICATION.md](./05_02_ENABLE_JWT_VERIFICATION.md) | [ ] Pending | 5.1 | 1h |
| 5.3 | Update RLS Policies | [05_03_UPDATE_RLS_POLICIES.md](./05_03_UPDATE_RLS_POLICIES.md) | [ ] Pending | 5.2 | 1h |
| 5.4 | Frontend Access Code Page | [05_04_ACCESS_CODE_PAGE.md](./05_04_ACCESS_CODE_PAGE.md) | [ ] Pending | 5.1 | 1.5h |
| 5.5 | Auth Store & Composable | [05_05_AUTH_STORE_COMPOSABLE.md](./05_05_AUTH_STORE_COMPOSABLE.md) | [ ] Pending | None | 1.5h |
| 5.6 | Route Guards & API Integration | [05_06_ROUTE_GUARDS.md](./05_06_ROUTE_GUARDS.md) | [ ] Pending | 5.4, 5.5 | 1h |
| 5.7 | E2E Authentication Tests | [05_07_E2E_AUTH_TESTS.md](./05_07_E2E_AUTH_TESTS.md) | [ ] Pending | All above | 1.5h |

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY GRAPH                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────┐                    ┌───────────┐                │
│   │   5.1     │                    │   5.5     │                │
│   │  Verify   │                    │   Auth    │                │
│   │  Access   │                    │   Store   │                │
│   │  Code     │                    │           │                │
│   └─────┬─────┘                    └─────┬─────┘                │
│         │                                │                       │
│    ┌────┴────┐                          │                       │
│    │         │                          │                       │
│    ▼         ▼                          │                       │
│ ┌──────┐  ┌──────┐                      │                       │
│ │ 5.2  │  │ 5.4  │                      │                       │
│ │ JWT  │  │ Page │                      │                       │
│ │Verify│  │      │                      │                       │
│ └──┬───┘  └──┬───┘                      │                       │
│    │         │                          │                       │
│    ▼         └──────────┬───────────────┘                       │
│ ┌──────┐                │                                       │
│ │ 5.3  │                ▼                                       │
│ │ RLS  │         ┌───────────┐                                  │
│ │Policy│         │   5.6     │                                  │
│ └──┬───┘         │  Route    │                                  │
│    │             │  Guards   │                                  │
│    │             └─────┬─────┘                                  │
│    │                   │                                        │
│    └───────────┬───────┘                                        │
│                │                                                │
│                ▼                                                │
│         ┌───────────┐                                           │
│         │   5.7     │                                           │
│         │   E2E     │                                           │
│         │  Tests    │                                           │
│         └───────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Parallel Execution Possible:**
- **5.1** and **5.5** can run in parallel (no dependencies)
- **5.2** and **5.4** can run in parallel (after 5.1)

---

## Execution Order for Agents

### Sequential Execution (Safest)

```
1. Task 5.1 (Verify Access Code) → Backend foundation
2. Task 5.5 (Auth Store)         → Frontend foundation (can overlap with 5.1)
3. Task 5.2 (JWT Verification)   → Enable backend security
4. Task 5.4 (Access Code Page)   → Frontend entry point
5. Task 5.3 (RLS Policies)       → Database security
6. Task 5.6 (Route Guards)       → Frontend protection
7. Task 5.7 (E2E Tests)          → Verification
```

### Parallel Execution (Faster)

```
Batch 1 (Parallel):
  - 5.1 Verify Access Code Edge Function
  - 5.5 Auth Store & Composable

Batch 2 (After Batch 1, Parallel):
  - 5.2 Enable JWT Verification
  - 5.4 Frontend Access Code Page

Batch 3 (After Batch 2):
  - 5.3 Update RLS Policies
  - 5.6 Route Guards & API Integration

Batch 4 (After Batch 3):
  - 5.7 E2E Authentication Tests
```

---

## Environment Configuration Required

### Supabase Secrets (set before starting)

```bash
# Generate access code hash
echo -n "YourAccessCode2026!" | sha256sum
# Use the output as ACCESS_CODE_HASH

supabase secrets set ACCESS_CODE_HASH="<sha256_hash>"
supabase secrets set JWT_SECRET="<random_32+_char_string>"
```

### Frontend Environment

No changes required - uses existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Files to Create

| File | Task | Purpose |
|------|------|---------|
| `supabase/functions/verify-access-code/index.ts` | 5.1 | Access code validation endpoint |
| `supabase/migrations/012_access_code_attempts.sql` | 5.1 | Rate limiting table |
| `supabase/migrations/013_authenticated_rls_policies.sql` | 5.3 | RLS policy updates |
| `apps/web/src/pages/AccessCode.vue` | 5.4 | Access code entry page |
| `apps/web/src/stores/authStore.ts` | 5.5 | Auth state management |
| `apps/web/src/composables/useAuth.ts` | 5.5 | Auth logic composable |
| `apps/web/src/plugins/authInterceptor.ts` | 5.6 | Global 401 handler |
| `apps/web/tests/e2e/auth.spec.ts` | 5.7 | E2E auth tests |

## Files to Modify

| File | Task | Changes |
|------|------|---------|
| `supabase/config.toml` | 5.1, 5.2 | Add verify-access-code, enable JWT for others |
| `apps/web/src/router/index.ts` | 5.4, 5.6 | Add route, add guards |
| `apps/web/src/composables/useSupabase.ts` | 5.5 | Add auth header support |
| `apps/web/src/main.ts` | 5.6 | Setup auth interceptor |

---

## Verification Checklist (Post-Implementation)

### Security Verification

| Check | Command | Expected |
|-------|---------|----------|
| Anonymous API blocked | `curl /functions/v1/buying-opportunity` | 401 |
| Invalid code rejected | POST wrong code to verify-access-code | 401 |
| Valid code returns JWT | POST correct code | 200 + token |
| Rate limiting works | 6 rapid failures | 429 |
| RLS blocks anon | Direct REST API as anon | Empty/error |

### Functional Verification

| Check | Action | Expected |
|-------|--------|----------|
| Access code page loads | Navigate to `/access-code` | Form displayed |
| Valid code grants access | Enter correct code | Redirect to Dashboard |
| Protected routes redirect | Visit `/` without auth | Redirect to `/access-code` |
| Logout works | Click logout | Session cleared, redirect |
| Session persists | Refresh page | Still authenticated |

---

## Rollback Plan

If issues arise after deployment:

1. **Quick Fix**: Revert `config.toml` to `verify_jwt = false`
2. **Database**: Run rollback migration to restore anon RLS policies
3. **Frontend**: Access code page doesn't break existing functionality

---

## Changelog

### 2026-01-04: Phase 5 Plan Created

- Created architecture document (05_00)
- Created 7 task documents (05_01 - 05_07)
- Defined dependency graph
- Established execution order for agents

---

## Agent Execution Notes

Each task document contains:
- **Objective**: What the task accomplishes
- **Prerequisites**: What must be done first
- **Implementation Steps**: Detailed code and commands
- **Test Cases**: How to verify the implementation
- **Validation Criteria**: Checklist for completion
- **Troubleshooting**: Common issues and solutions

**Critical Details for Agents:**

1. **JWT Secret**: Must use Supabase's JWT secret for tokens to work with `verify_jwt = true`
2. **Code Hash**: Always compare SHA-256 hashes, never plain text
3. **CORS**: All Edge Functions need consistent CORS headers
4. **Token Claims**: JWT must include `role: "authenticated"` and `aud: "authenticated"`
5. **Route Guard**: `/access-code` must NOT require authentication
6. **Storage**: Use both localStorage (persistence) and Pinia (reactivity)
