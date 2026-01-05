# Bug: RLS Policy Violation - Auth Token Not Attached to Supabase REST Calls

## Bug Description
After signing in with an access code, users cannot create new buying opportunities. The system returns an RLS policy violation error (code `42501`) and then kicks the user back to the login page. The root cause is that the custom JWT token issued by `verify-access-code` is not being attached to Supabase REST API calls - the frontend components use the unauthenticated `supabase` client instead of creating authenticated requests.

**Actual behavior**:
- User enters valid access code → receives JWT token
- User tries to create a new opportunity → RLS error: "new row violates row-level security policy for table buying_opportunities"
- System redirects to login page (due to global 401 handler)

**Expected behavior**:
- User enters valid access code → receives JWT token
- JWT token is automatically included in all Supabase REST API calls
- User can create/read/update/delete data as authenticated user

## Problem Statement
The frontend has two Supabase client options:
1. `supabase` - A basic client created with anon key (no auth headers)
2. `useAuthenticatedSupabase()` - Creates a client with the auth token from `authStore`

All data-access components (CreateOpportunityModal, Dashboard, VehicleForm, VendorForm, etc.) import and use the basic `supabase` client, which sends requests with `role: "anon"`. However, the RLS policies were updated in migration `013_authenticated_rls_policies.sql` to require `role: "authenticated"`.

The Authorization header in requests shows the **anon key** instead of the custom JWT:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbXlnbWJ4dGRndWpreXRweGhhIiwicm9sZSI6ImFub24iLC...
```

## Solution Statement
Modify `useSupabase.ts` to return a reactive authenticated client that automatically includes the JWT token from `authStore` when available. This single change will propagate authentication to all components without requiring changes to each individual component.

The key insight is that instead of having two separate clients (`supabase` and `useAuthenticatedSupabase`), we should have ONE client that is automatically authenticated when a token exists.

## Steps to Reproduce
1. Navigate to the application at https://secure-deal-ai-web.vercel.app/
2. Enter a valid access code on the login page
3. After successful authentication, click "Nová příležitost" (New Opportunity)
4. Enter a valid SPZ (e.g., "5LP7322")
5. Click "Vytvořit" (Create)
6. **Result**: Error message appears, then redirect to login page

## Root Cause Analysis
The authentication flow has a gap between token issuance and token usage:

```
[verify-access-code] ─── issues JWT ───▶ [authStore.setAuth(token)]
                                              │
                                              │ Token stored but NOT used
                                              ▼
[Components] ─── import { supabase } ───▶ [Basic client with anon key]
                                              │
                                              │ RLS requires authenticated
                                              ▼
[Supabase RLS] ─── role='anon' ───▶ REJECT (42501)
```

The `useAuthenticatedSupabase()` function exists and correctly creates an authenticated client, but:
1. It's never imported by any component
2. Components all import the static `supabase` export which has no auth headers
3. There's no mechanism to refresh the client when auth state changes

## Issues Identified

### Issue 1: Static Supabase Client Without Auth Headers
- **Error Pattern**: `42501 - new row violates row-level security policy`
- **Category**: Frontend
- **Affected Files**:
  - `apps/web/src/composables/useSupabase.ts`
  - `apps/web/src/components/shared/CreateOpportunityModal.vue`
  - `apps/web/src/pages/Dashboard.vue`
  - `apps/web/src/composables/useDetailData.ts`
  - `apps/web/src/composables/useDocumentPreview.ts`
  - `apps/web/src/components/ocr/DocumentUpload.vue`
  - `apps/web/src/components/forms/VehicleForm.vue`
  - `apps/web/src/components/forms/VendorForm.vue`
- **Root Cause**: All components import the static `supabase` client which is created once at module load with the anon key. The auth token from `authStore` is never attached to requests.
- **Fix Approach**: Refactor `useSupabase.ts` to return an authenticated client when token is available

### Issue 2: JWT Secret Mismatch (Potential)
- **Error Pattern**: If JWT verification fails with "Invalid JWT"
- **Category**: Backend / Configuration
- **Affected Files**:
  - `supabase/functions/verify-access-code/index.ts` (JWT creation)
  - Supabase project settings (JWT verification)
- **Root Cause**: The `JWT_SECRET` used in `verify-access-code` must match Supabase's project JWT secret
- **Fix Approach**: Verify JWT_SECRET environment variable matches Supabase project secret (from Dashboard → Project Settings → API → JWT Secret)

## Relevant Files
Use these files to fix the bug:

### Primary Fix Location
- `apps/web/src/composables/useSupabase.ts` - **Must modify** to create authenticated client using token from authStore

### Files Using Supabase Client (no changes needed if useSupabase is fixed correctly)
- `apps/web/src/components/shared/CreateOpportunityModal.vue` - Creates buying opportunities
- `apps/web/src/pages/Dashboard.vue` - Lists and deletes opportunities
- `apps/web/src/composables/useDetailData.ts` - Loads opportunity details
- `apps/web/src/composables/useDocumentPreview.ts` - Document preview
- `apps/web/src/components/ocr/DocumentUpload.vue` - Document upload
- `apps/web/src/components/forms/VehicleForm.vue` - Vehicle data
- `apps/web/src/components/forms/VendorForm.vue` - Vendor data

### Auth Related Files (for reference)
- `apps/web/src/stores/authStore.ts` - Stores the JWT token
- `apps/web/src/plugins/authInterceptor.ts` - Handles 401 redirects

### New Files
No new files needed.

## Step by Step Tasks

### Step 1: Understand Current Auth Flow
- Read `apps/web/src/stores/authStore.ts` to understand how token is stored
- Verify token is correctly stored after login (check localStorage)
- Confirm `getAuthHeader()` returns correct header format

### Step 2: Refactor useSupabase.ts
Modify `apps/web/src/composables/useSupabase.ts` to automatically include auth headers:

**Current problematic code:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**New approach - create client with global fetch override:**
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create client with custom fetch that includes auth header
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      // Get auth store - need to do this lazily to avoid circular deps
      const authStore = useAuthStore()
      const token = authStore.token

      const headers = new Headers(options?.headers)

      // If we have a valid token, use it instead of anon key
      if (token && authStore.isAuthenticated) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      return fetch(url, {
        ...options,
        headers
      })
    }
  }
})

export function useSupabase() {
  return { supabase }
}

// Keep for backwards compatibility but mark as deprecated
export function useAuthenticatedSupabase(): SupabaseClient {
  return supabase // Now same as regular client
}
```

### Step 3: Verify Pinia Store Initialization Order
Ensure the auth store is initialized before Supabase client is used:
- Check `apps/web/src/main.ts` for Pinia setup order
- The custom fetch function calls `useAuthStore()` lazily (at request time), so initialization order should be fine

### Step 4: Test Locally
1. Start local dev server: `cd apps/web && npm run dev`
2. Clear localStorage and session storage
3. Enter valid access code
4. Verify token is stored: `localStorage.getItem('securedealai_token')`
5. Open Network tab
6. Create new opportunity
7. Inspect request headers - verify `Authorization: Bearer` has the custom JWT (NOT the anon key)

### Step 5: Handle Edge Cases
- Ensure requests work when not authenticated (anon key fallback for login page)
- Ensure token refresh/expiry is handled
- Test that logging out clears auth and subsequent requests use anon key

### Step 6: Build and Deploy
```bash
cd apps/web
npm run build
# Deploy to Vercel (automatic via CI or manual)
```

### Step 7: Run Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

## Database Changes
No database changes required. The RLS policies in migration `013_authenticated_rls_policies.sql` are correct - they properly require `authenticated` role. The issue is on the frontend.

## Testing Strategy

### Regression Tests
1. **Login Flow**: Enter valid access code → should receive token → should redirect to dashboard
2. **Create Opportunity**: After login → create new opportunity → should succeed (not RLS error)
3. **Read Data**: After login → view dashboard → should see existing opportunities
4. **Update Data**: After login → edit vehicle/vendor → should succeed
5. **Logout**: Click logout → token cleared → cannot access protected data
6. **Session Persistence**: After login → refresh page → should still be authenticated

### Edge Cases
1. **Expired Token**: Token expires → next request gets 401 → redirect to login
2. **Invalid Token**: Tampered token → 401 → redirect to login
3. **No Token**: Access protected route without login → redirect to login
4. **Network Error**: Handle network failures gracefully
5. **Concurrent Requests**: Multiple simultaneous requests should all have correct auth

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

```bash
# Test Supabase connection
npm run test:db

# Build frontend (catches TypeScript errors)
cd apps/web && npm run build

# Run frontend tests
cd apps/web && npm run test

# Manual E2E validation (after deployment):
# 1. Go to https://secure-deal-ai-web.vercel.app/
# 2. Enter valid access code
# 3. Create a new opportunity with SPZ "TEST123"
# 4. Verify it appears in the list
# 5. Check Network tab - Authorization header should have custom JWT
```

## Notes

### Why Not Change Every Component?
The fix is centralized in `useSupabase.ts` rather than changing every component because:
1. All components already import from `useSupabase.ts`
2. Changing one file = less risk of introducing bugs
3. Future components automatically get auth without thinking about it
4. Follows DRY principle

### JWT Secret Verification
If the fix doesn't work after the frontend change, verify the JWT secret:
1. Go to Supabase Dashboard → Project Settings → API
2. Copy the "JWT Secret" value
3. Ensure `JWT_SECRET` environment variable in Edge Functions matches this value:
   ```bash
   supabase secrets set JWT_SECRET="your-supabase-jwt-secret"
   ```

### Alternative Approach (Not Recommended)
An alternative would be to change every component to use `useAuthenticatedSupabase()`, but this:
- Requires changes to 7+ files
- Is easy to forget in new components
- Doesn't fix the root cause (static client creation)
