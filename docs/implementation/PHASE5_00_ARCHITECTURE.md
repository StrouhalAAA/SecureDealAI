# Phase 5: Access Code Authentication - Architecture Document

> **Version**: 1.0
> **Created**: 2026-01-04
> **Purpose**: High-level architecture for implementing access code protection for internal users
> **Status**: PENDING IMPLEMENTATION

---

## Executive Summary

This document defines the architecture for implementing **access code-based authentication** to protect SecureDealAI in production. This is a security gate for internal users - simpler than full user authentication while providing proper access control.

**Key Decision**: Backend-validated access code with JWT session tokens (Option B from analysis).

---

## Problem Statement

The MVP was built with completely open access:
- All Edge Functions have `verify_jwt = false`
- All database tables allow anonymous (`anon`) role full CRUD
- No login page or route guards exist
- Anyone with the URL can access all data

**Goal**: Restrict access to internal users who know the access code, without implementing full user authentication.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ACCESS CODE FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐     ┌───────────────────┐     ┌────────────────────┐    │
│   │  User    │────▶│ Access Code Page  │────▶│ verify-access-code │    │
│   │  visits  │     │ (Vue.js)          │     │ (Edge Function)    │    │
│   │  app     │     │                   │     │                    │    │
│   └──────────┘     └───────────────────┘     └─────────┬──────────┘    │
│                                                        │               │
│                                               ┌────────▼────────┐      │
│                                               │  Valid code?    │      │
│                                               └────────┬────────┘      │
│                              ┌─────────────────────────┼─────────┐     │
│                              │ YES                     │ NO      │     │
│                              ▼                         ▼         │     │
│                    ┌─────────────────┐      ┌──────────────────┐│     │
│                    │ Return signed   │      │ Return 401       ││     │
│                    │ JWT token       │      │ Unauthorized     ││     │
│                    └────────┬────────┘      └──────────────────┘│     │
│                             │                                    │     │
│                    ┌────────▼────────┐                          │     │
│                    │ Store in        │                          │     │
│                    │ localStorage    │                          │     │
│                    │ + Pinia store   │                          │     │
│                    └────────┬────────┘                          │     │
│                             │                                    │     │
│                    ┌────────▼────────┐                          │     │
│                    │ Redirect to     │                          │     │
│                    │ Dashboard       │                          │     │
│                    └────────┬────────┘                          │     │
│                             │                                    │     │
│   ┌─────────────────────────▼─────────────────────────────────┐ │     │
│   │              PROTECTED APPLICATION                        │ │     │
│   │                                                           │ │     │
│   │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │ │     │
│   │  │ Dashboard   │    │ Detail Page │    │ All other   │   │ │     │
│   │  │             │    │             │    │ routes      │   │ │     │
│   │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   │ │     │
│   │         │                  │                  │          │ │     │
│   │         └──────────────────┼──────────────────┘          │ │     │
│   │                            │                             │ │     │
│   │                   ┌────────▼────────┐                    │ │     │
│   │                   │ API calls with  │                    │ │     │
│   │                   │ JWT in header   │                    │ │     │
│   │                   └────────┬────────┘                    │ │     │
│   └────────────────────────────┼─────────────────────────────┘ │     │
│                                │                                │     │
│                       ┌────────▼────────┐                      │     │
│                       │ Edge Functions  │                      │     │
│                       │ verify JWT      │                      │     │
│                       │ (verify_jwt=true)│                     │     │
│                       └────────┬────────┘                      │     │
│                                │                                │     │
│                       ┌────────▼────────┐                      │     │
│                       │ Supabase DB     │                      │     │
│                       │ (RLS: auth only)│                      │     │
│                       └─────────────────┘                      │     │
│                                                                 │     │
└─────────────────────────────────────────────────────────────────┴─────┘
```

---

## Security Model

### Authentication Flow

1. **User visits app** → Router guard checks for valid JWT in store
2. **No JWT or expired** → Redirect to `/access-code` page
3. **User enters code** → POST to `verify-access-code` Edge Function
4. **Code validated** → Server returns signed JWT (24-hour expiry)
5. **JWT stored** → localStorage + Pinia store
6. **All API calls** → Include JWT in `Authorization: Bearer <token>` header
7. **Edge Functions** → Verify JWT before processing (Supabase built-in)
8. **Database** → RLS policies require `authenticated` role

### Token Structure

```typescript
interface AccessCodeJWT {
  // Standard JWT claims
  iss: string;          // "securedealai"
  sub: string;          // "internal-user"
  iat: number;          // Issued at timestamp
  exp: number;          // Expiry (24 hours from issuance)

  // Custom claims
  access_type: "internal";
  code_id: string;      // Hash of which code was used (for audit)
}
```

### Security Boundaries

| Layer | Before | After |
|-------|--------|-------|
| **Edge Functions** | `verify_jwt = false` | `verify_jwt = true` (except verify-access-code) |
| **Database RLS** | `TO anon USING (true)` | `TO authenticated USING (true)` |
| **Frontend** | No route guards | All routes except `/access-code` protected |
| **API Calls** | No auth header | Bearer token required |

---

## Component Breakdown

### Backend Components

| Component | File | Purpose |
|-----------|------|---------|
| **verify-access-code** | `supabase/functions/verify-access-code/index.ts` | Validates code, issues JWT |
| **Config update** | `supabase/config.toml` | Enable JWT verification |
| **RLS migration** | `supabase/migrations/XXX_authenticated_rls.sql` | Replace anon with authenticated policies |

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| **Access Code Page** | `apps/web/src/pages/AccessCode.vue` | Code entry form |
| **Auth Store** | `apps/web/src/stores/authStore.ts` | Pinia store for session state |
| **Auth Composable** | `apps/web/src/composables/useAuth.ts` | Auth logic (login, logout, check) |
| **Route Guards** | `apps/web/src/router/index.ts` | Navigation guards |

---

## Environment Configuration

### Required Secrets (Supabase)

```bash
# The access code(s) - stored as SHA-256 hash
ACCESS_CODE_HASH=sha256_of_your_code

# JWT signing secret (32+ random characters)
JWT_SECRET=random_32_char_string_here

# Optional: Multiple codes for different teams
# ACCESS_CODE_HASH_TEAM_A=sha256_hash_a
# ACCESS_CODE_HASH_TEAM_B=sha256_hash_b
```

### Frontend Environment

```bash
# No changes needed - uses existing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# JWT is obtained at runtime from verify-access-code endpoint
```

---

## API Specifications

### POST /functions/v1/verify-access-code

**Request:**
```typescript
interface VerifyAccessCodeRequest {
  code: string;  // The access code entered by user
}
```

**Response (Success - 200):**
```typescript
interface VerifyAccessCodeResponse {
  success: true;
  token: string;        // JWT token
  expires_at: string;   // ISO timestamp
}
```

**Response (Error - 401):**
```typescript
interface VerifyAccessCodeError {
  success: false;
  error: "INVALID_CODE" | "CODE_EXPIRED" | "RATE_LIMITED";
  message: string;
}
```

### Rate Limiting

- **5 attempts per IP per 15 minutes**
- After 5 failed attempts: 15-minute lockout
- Stored in Supabase table `access_code_attempts`

---

## Database Changes

### New Table: access_code_attempts

```sql
CREATE TABLE access_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  code_hash TEXT  -- Only stored on success (for audit)
);

CREATE INDEX idx_access_code_attempts_ip
  ON access_code_attempts(ip_address, attempted_at);
```

### RLS Policy Updates

Replace all `anon` policies with `authenticated`:

```sql
-- Example for buying_opportunities table
DROP POLICY IF EXISTS "buying_opportunities_anon_select" ON buying_opportunities;

CREATE POLICY "buying_opportunities_auth_select" ON buying_opportunities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "buying_opportunities_auth_insert" ON buying_opportunities
    FOR INSERT TO authenticated WITH CHECK (true);

-- ... repeat for all tables
```

---

## Implementation Phases

### Phase 5.1: Backend - Verify Access Code Function
- Create `verify-access-code` Edge Function
- Implement code validation against hashed secret
- Implement JWT signing
- Add rate limiting table and logic
- **Depends on**: Nothing (can start immediately)
- **Estimate**: 2 hours

### Phase 5.2: Backend - Enable JWT Verification
- Update `supabase/config.toml` for all existing functions
- Test that functions reject requests without valid JWT
- **Depends on**: 5.1 (need way to get valid JWT for testing)
- **Estimate**: 1 hour

### Phase 5.3: Database - Update RLS Policies
- Create migration to replace `anon` with `authenticated` policies
- Test that anonymous access is blocked
- **Depends on**: 5.2 (functions must verify JWT first)
- **Estimate**: 1 hour

### Phase 5.4: Frontend - Access Code Page
- Create `/access-code` route and page component
- Build code entry form with validation
- Handle success/error states
- **Depends on**: 5.1 (needs endpoint to call)
- **Estimate**: 1.5 hours

### Phase 5.5: Frontend - Auth Store & Composable
- Create Pinia store for auth state
- Create `useAuth` composable
- Implement JWT storage (localStorage + store sync)
- Add token expiry checking
- **Depends on**: Nothing (can start in parallel with 5.1)
- **Estimate**: 1.5 hours

### Phase 5.6: Frontend - Route Guards & API Integration
- Add `beforeEach` navigation guard
- Update `useSupabase` to include auth header
- Handle 401 responses globally
- **Depends on**: 5.4, 5.5
- **Estimate**: 1 hour

### Phase 5.7: E2E Tests - Authentication Flow
- Test access code entry flow
- Test protected route redirect
- Test API rejection without auth
- Test token expiry handling
- **Depends on**: All above
- **Estimate**: 1.5 hours

---

## Dependency Graph

```
Phase 5.1 (verify-access-code)
├── Phase 5.2 (JWT verification)
│   └── Phase 5.3 (RLS policies)
└── Phase 5.4 (Access Code Page)
    └── Phase 5.6 (Route Guards)

Phase 5.5 (Auth Store) ─────────┐
                                └── Phase 5.6 (Route Guards)
                                    └── Phase 5.7 (E2E Tests)
```

**Parallel Execution Possible:**
- 5.1 and 5.5 can run in parallel
- 5.2 and 5.4 can run in parallel (after 5.1)

---

## Verification Criteria

### Security Verification

| Check | Method | Expected Result |
|-------|--------|-----------------|
| Anonymous API access blocked | `curl` without auth header | 401 Unauthorized |
| Invalid code rejected | POST invalid code | 401 with error message |
| Valid code returns JWT | POST valid code | 200 with token |
| JWT required for all endpoints | Test each endpoint | All return 401 without JWT |
| Rate limiting works | 6 rapid invalid attempts | 429 on 6th attempt |
| RLS blocks anonymous | Direct DB query as anon | Empty result |

### Functional Verification

| Check | Method | Expected Result |
|-------|--------|-----------------|
| Access code page loads | Navigate to `/access-code` | Form displayed |
| Valid code redirects | Enter valid code | Redirect to Dashboard |
| Invalid code shows error | Enter invalid code | Error message displayed |
| Protected routes redirect | Visit `/` without auth | Redirect to `/access-code` |
| Logout clears session | Click logout | Redirect to access code |
| Token persists refresh | Refresh page | Still authenticated |

---

## Rollback Plan

If issues arise after deployment:

1. **Quick rollback**: Revert `config.toml` to `verify_jwt = false`
2. **Database rollback**: Migration includes `DOWN` to restore anon policies
3. **Frontend**: Access code page doesn't break existing functionality

---

## Future Enhancements (Not in Scope)

- Multiple access codes with different permissions
- Code expiration and rotation
- User-specific codes (individual tracking)
- Full Supabase Auth integration
- OAuth/SSO support
- Audit log of all accesses

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/verify-access-code/index.ts` | Access code validation endpoint |
| `supabase/migrations/XXX_auth_rls_policies.sql` | RLS policy updates |
| `supabase/migrations/XXX_access_code_attempts.sql` | Rate limiting table |
| `apps/web/src/pages/AccessCode.vue` | Access code entry page |
| `apps/web/src/stores/authStore.ts` | Auth state management |
| `apps/web/src/composables/useAuth.ts` | Auth logic composable |
| `apps/web/tests/e2e/auth.spec.ts` | E2E auth tests |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/config.toml` | Set `verify_jwt = true` for all functions |
| `apps/web/src/router/index.ts` | Add navigation guards |
| `apps/web/src/composables/useSupabase.ts` | Add auth header to requests |
| `apps/web/src/composables/useErrorHandler.ts` | Handle 401 redirects |

---

## Agent Execution Notes

Each task document (05_01 through 05_07) contains:
- Specific implementation steps
- Code templates and examples
- Test cases to verify
- Completion checklist

**Critical Implementation Details:**

1. **JWT Secret**: Must use `Deno.env.get("JWT_SECRET")` - never hardcode
2. **Code Hash**: Compare `SHA256(input)` against `ACCESS_CODE_HASH` env var
3. **CORS**: verify-access-code needs same CORS headers as other functions
4. **Token Storage**: Use both localStorage (persistence) and Pinia (reactivity)
5. **Guard Exception**: `/access-code` route must NOT require auth
