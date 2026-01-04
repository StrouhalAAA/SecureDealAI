# Task 5.7: E2E Authentication Tests

> **Phase**: 5 - Access Code Authentication
> **Status**: [ ] Pending
> **Priority**: Medium
> **Depends On**: 5.3, 5.6
> **Estimated Effort**: 1.5 hours

---

## Objective

Create end-to-end tests using Playwright to verify the complete authentication flow works correctly in a real browser environment.

---

## Prerequisites

- [ ] All Phase 5 tasks (5.1-5.6) completed
- [ ] Application deployed and accessible
- [ ] Playwright configured (from Task 4.1)

---

## Architecture Reference

See: [05_00_ACCESS_CODE_ARCHITECTURE.md](./05_00_ACCESS_CODE_ARCHITECTURE.md)

---

## Test Scenarios

1. **Access Code Entry** - Valid code grants access
2. **Invalid Code Rejection** - Wrong code shows error
3. **Rate Limiting** - Multiple failures trigger lockout
4. **Protected Route Redirect** - Unauthenticated users redirected
5. **Session Persistence** - Refresh maintains authentication
6. **Logout** - Clears session and redirects
7. **Token Expiry** - Expired token triggers re-authentication

---

## Implementation Steps

### Step 1: Create Auth E2E Test File

Create file: `apps/web/tests/e2e/auth.spec.ts`

```typescript
import { test, expect, Page } from '@playwright/test'

// Test access code - should match what's configured in your test environment
const VALID_ACCESS_CODE = process.env.TEST_ACCESS_CODE || 'TestCode123'
const INVALID_ACCESS_CODE = 'WrongCode999'

test.describe('Authentication Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
  })

  test('displays access code page for unauthenticated users', async ({ page }) => {
    await page.goto('/')

    // Should be redirected to access code page
    await expect(page).toHaveURL(/\/access-code/)

    // Should see the access code form
    await expect(page.getByRole('heading', { name: /access code/i })).toBeVisible()
    await expect(page.getByRole('textbox')).toBeVisible()
    await expect(page.getByRole('button', { name: /access application/i })).toBeVisible()
  })

  test('grants access with valid code', async ({ page }) => {
    await page.goto('/access-code')

    // Enter valid code
    await page.getByRole('textbox').fill(VALID_ACCESS_CODE)
    await page.getByRole('button', { name: /access application/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL('/')

    // Should see dashboard content (adjust selector based on your dashboard)
    await expect(page.getByText(/buying opportunities/i)).toBeVisible({ timeout: 10000 })
  })

  test('rejects invalid access code', async ({ page }) => {
    await page.goto('/access-code')

    // Enter invalid code
    await page.getByRole('textbox').fill(INVALID_ACCESS_CODE)
    await page.getByRole('button', { name: /access application/i }).click()

    // Should show error message
    await expect(page.getByText(/invalid access code/i)).toBeVisible()

    // Should remain on access code page
    await expect(page).toHaveURL(/\/access-code/)
  })

  test('shows remaining attempts on failure', async ({ page }) => {
    await page.goto('/access-code')

    // Enter invalid code
    await page.getByRole('textbox').fill(INVALID_ACCESS_CODE)
    await page.getByRole('button', { name: /access application/i }).click()

    // Should show remaining attempts
    await expect(page.getByText(/attempts remaining/i)).toBeVisible()
  })

  test('shows rate limit after multiple failures', async ({ page }) => {
    await page.goto('/access-code')

    // Try multiple invalid codes
    for (let i = 0; i < 5; i++) {
      await page.getByRole('textbox').fill(`${INVALID_ACCESS_CODE}${i}`)
      await page.getByRole('button', { name: /access application/i }).click()

      // Wait for response
      await page.waitForTimeout(500)

      // Clear input for next attempt
      await page.getByRole('textbox').clear()
    }

    // Should show rate limit message
    await expect(page.getByText(/too many|try again/i)).toBeVisible()

    // Button should be disabled
    await expect(page.getByRole('button', { name: /locked/i })).toBeDisabled()
  })

  test('preserves intended destination after login', async ({ page }) => {
    // Try to access a specific opportunity
    await page.goto('/opportunity/test-123')

    // Should redirect to access code with redirect param
    await expect(page).toHaveURL(/\/access-code\?redirect=.*opportunity/)

    // Log in
    await page.getByRole('textbox').fill(VALID_ACCESS_CODE)
    await page.getByRole('button', { name: /access application/i }).click()

    // Should redirect to original destination
    await expect(page).toHaveURL(/\/opportunity\/test-123/)
  })

  test('session persists across page refresh', async ({ page }) => {
    // Log in first
    await page.goto('/access-code')
    await page.getByRole('textbox').fill(VALID_ACCESS_CODE)
    await page.getByRole('button', { name: /access application/i }).click()

    // Wait for redirect
    await expect(page).toHaveURL('/')

    // Refresh the page
    await page.reload()

    // Should still be on dashboard (not redirected to access code)
    await expect(page).toHaveURL('/')
    await expect(page.getByText(/buying opportunities/i)).toBeVisible({ timeout: 10000 })
  })

  test('logout clears session and redirects', async ({ page }) => {
    // Log in first
    await page.goto('/access-code')
    await page.getByRole('textbox').fill(VALID_ACCESS_CODE)
    await page.getByRole('button', { name: /access application/i }).click()
    await expect(page).toHaveURL('/')

    // Click logout (adjust selector based on your UI)
    await page.getByRole('button', { name: /logout/i }).click()

    // Should redirect to access code page
    await expect(page).toHaveURL(/\/access-code/)

    // Trying to access dashboard should redirect again
    await page.goto('/')
    await expect(page).toHaveURL(/\/access-code/)
  })

  test('redirects authenticated user away from access code page', async ({ page }) => {
    // Log in
    await page.goto('/access-code')
    await page.getByRole('textbox').fill(VALID_ACCESS_CODE)
    await page.getByRole('button', { name: /access application/i }).click()
    await expect(page).toHaveURL('/')

    // Try to go back to access code page
    await page.goto('/access-code')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/')
  })

})

test.describe('API Authentication', () => {

  test('API returns 401 without auth token', async ({ request }) => {
    const response = await request.get('/functions/v1/buying-opportunity')

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401)
  })

  test('API accepts request with valid token', async ({ page, request }) => {
    // First, get a valid token
    const tokenResponse = await request.post('/functions/v1/verify-access-code', {
      data: { code: VALID_ACCESS_CODE }
    })

    expect(tokenResponse.ok()).toBeTruthy()
    const { token } = await tokenResponse.json()

    // Now make an authenticated request
    const apiResponse = await request.get('/functions/v1/buying-opportunity', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    // Should not return 401 (might be 200 or other status depending on params)
    expect(apiResponse.status()).not.toBe(401)
  })

})

test.describe('Cross-Tab Session Sync', () => {

  test('logout in one tab affects other tabs', async ({ browser }) => {
    // Create two pages (tabs)
    const context = await browser.newContext()
    const page1 = await context.newPage()
    const page2 = await context.newPage()

    // Log in on page1
    await page1.goto('/access-code')
    await page1.getByRole('textbox').fill(VALID_ACCESS_CODE)
    await page1.getByRole('button', { name: /access application/i }).click()
    await expect(page1).toHaveURL('/')

    // Navigate page2 to dashboard (should work because session is shared)
    await page2.goto('/')
    await expect(page2).toHaveURL('/')

    // Logout on page1
    await page1.getByRole('button', { name: /logout/i }).click()

    // Wait a moment for storage event to propagate
    await page2.waitForTimeout(500)

    // Trigger navigation on page2 to check auth
    await page2.reload()

    // page2 should be redirected to access code
    await expect(page2).toHaveURL(/\/access-code/)

    await context.close()
  })

})
```

### Step 2: Update Playwright Config for Auth Tests

Update `apps/web/playwright.config.ts` if needed:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Step 3: Add Test Environment Variables

Create/update `apps/web/.env.test`:

```bash
# Test access code (hash of this should be in Supabase secrets)
TEST_ACCESS_CODE=TestCode123

# Supabase URLs
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

### Step 4: Create Test Helper for Auth

Create file: `apps/web/tests/e2e/helpers/auth.ts`

```typescript
import { Page, expect } from '@playwright/test'

const VALID_ACCESS_CODE = process.env.TEST_ACCESS_CODE || 'TestCode123'

/**
 * Helper to authenticate a page
 */
export async function authenticate(page: Page): Promise<void> {
  await page.goto('/access-code')
  await page.getByRole('textbox').fill(VALID_ACCESS_CODE)
  await page.getByRole('button', { name: /access application/i }).click()
  await expect(page).toHaveURL('/')
}

/**
 * Helper to check if page is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url()
  return !url.includes('/access-code')
}

/**
 * Helper to logout
 */
export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /logout/i }).click()
  await expect(page).toHaveURL(/\/access-code/)
}
```

### Step 5: Run Tests

```bash
# Run all E2E tests
cd apps/web
npx playwright test

# Run only auth tests
npx playwright test auth.spec.ts

# Run with UI mode for debugging
npx playwright test auth.spec.ts --ui

# Run in headed mode
npx playwright test auth.spec.ts --headed
```

---

## Test Matrix

| Test | Scenario | Expected Result |
|------|----------|-----------------|
| 1 | Unauthenticated user visits `/` | Redirect to `/access-code` |
| 2 | Valid access code entered | Redirect to Dashboard |
| 3 | Invalid access code entered | Error message shown |
| 4 | 5 failed attempts | Rate limit message shown |
| 5 | Login with redirect param | Redirect to original destination |
| 6 | Page refresh after login | Session persists |
| 7 | Logout clicked | Redirect to access code |
| 8 | API call without token | 401 response |
| 9 | API call with valid token | Success response |
| 10 | Logout in another tab | Current tab detects it |

---

## Validation Criteria

- [ ] All E2E auth tests pass
- [ ] Tests run in CI pipeline
- [ ] Tests cover happy path and error cases
- [ ] Tests verify API authentication
- [ ] Tests verify cross-tab sync

---

## Completion Checklist

- [ ] E2E test file created
- [ ] Playwright config updated
- [ ] Test helpers created
- [ ] All tests passing locally
- [ ] Tests added to CI pipeline
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`

---

## Troubleshooting

### Tests fail with "invalid access code"

Ensure `TEST_ACCESS_CODE` hash matches the `ACCESS_CODE_HASH` configured in Supabase secrets.

### Tests timeout waiting for redirect

Increase timeout or check if the app is running:
```typescript
await expect(page).toHaveURL('/', { timeout: 30000 })
```

### Rate limit tests interfere with other tests

Run rate limit tests in isolation or reset the `access_code_attempts` table between tests.

### Cross-tab tests are flaky

Increase wait time for storage events to propagate:
```typescript
await page2.waitForTimeout(1000)
```
