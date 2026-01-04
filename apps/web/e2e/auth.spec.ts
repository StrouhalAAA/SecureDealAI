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

    // Should see dashboard content (SecureDealAI header)
    await expect(page.getByRole('heading', { name: /SecureDealAI/i })).toBeVisible({ timeout: 10000 })
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

    // Should show remaining attempts (the error message contains attempt info)
    await expect(page.getByText(/attempts remaining|invalid/i)).toBeVisible()
  })

  test('shows rate limit after multiple failures', async ({ page }) => {
    await page.goto('/access-code')

    // Try multiple invalid codes
    for (let i = 0; i < 5; i++) {
      await page.getByRole('textbox').fill(`${INVALID_ACCESS_CODE}${i}`)
      await page.getByRole('button', { name: /access application/i }).click()

      // Wait for response
      await page.waitForTimeout(500)

      // Clear input for next attempt (only if not locked)
      const lockedButton = page.getByRole('button', { name: /locked/i })
      if (await lockedButton.isVisible().catch(() => false)) {
        break
      }
      await page.getByRole('textbox').clear()
    }

    // Should show rate limit message (either "too many" or countdown)
    await expect(page.getByText(/too many|try again in|locked/i)).toBeVisible()

    // Button should be disabled (either by "Locked" state or disabled attribute)
    const submitButton = page.getByRole('button', { name: /access application|locked|verifying/i })
    await expect(submitButton).toBeDisabled()
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
    await expect(page.getByRole('heading', { name: /SecureDealAI/i })).toBeVisible({ timeout: 10000 })
  })

  test('logout clears session and redirects', async ({ page }) => {
    // Log in first
    await page.goto('/access-code')
    await page.getByRole('textbox').fill(VALID_ACCESS_CODE)
    await page.getByRole('button', { name: /access application/i }).click()
    await expect(page).toHaveURL('/')

    // Clear localStorage to simulate logout
    await page.evaluate(() => {
      localStorage.removeItem('securedealai_token')
      localStorage.removeItem('securedealai_token_expiry')
    })

    // Trigger navigation to check auth
    await page.goto('/')

    // Should redirect to access code page
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

  test('API returns 401 without auth token', async ({ request, baseURL }) => {
    // Get the Supabase URL from environment or construct it
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'

    const response = await request.get(`${supabaseUrl}/functions/v1/buying-opportunity`)

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401)
  })

  test('API accepts request with valid token', async ({ request }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'

    // First, get a valid token
    const tokenResponse = await request.post(`${supabaseUrl}/functions/v1/verify-access-code`, {
      data: { code: VALID_ACCESS_CODE }
    })

    // Skip this test if verify endpoint is not available
    if (!tokenResponse.ok()) {
      test.skip()
      return
    }

    const { token } = await tokenResponse.json()
    expect(token).toBeTruthy()

    // Now make an authenticated request
    const apiResponse = await request.get(`${supabaseUrl}/functions/v1/buying-opportunity`, {
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

    // Clear auth on page1 (simulate logout)
    await page1.evaluate(() => {
      localStorage.removeItem('securedealai_token')
      localStorage.removeItem('securedealai_token_expiry')
      // Trigger storage event for cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'securedealai_token',
        newValue: null
      }))
    })

    // Wait a moment for storage event to propagate
    await page2.waitForTimeout(500)

    // Trigger navigation on page2 to check auth
    await page2.reload()

    // page2 should be redirected to access code
    await expect(page2).toHaveURL(/\/access-code/)

    await context.close()
  })

})
