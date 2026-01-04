import { Page, expect } from '@playwright/test'

const VALID_ACCESS_CODE = process.env.TEST_ACCESS_CODE || 'TestCode123'

/**
 * Helper to authenticate a page via the access code form
 */
export async function authenticate(page: Page): Promise<void> {
  await page.goto('/access-code')
  await page.getByRole('textbox').fill(VALID_ACCESS_CODE)
  await page.getByRole('button', { name: /access application/i }).click()
  await expect(page).toHaveURL('/')
}

/**
 * Helper to check if page is authenticated
 * Returns true if not on access-code page
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url()
  return !url.includes('/access-code')
}

/**
 * Helper to logout by clearing localStorage
 */
export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('securedealai_token')
    localStorage.removeItem('securedealai_token_expiry')
  })
  await page.goto('/')
  await expect(page).toHaveURL(/\/access-code/)
}

/**
 * Helper to clear all auth state before a test
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.clear())
}

/**
 * Helper to simulate an authenticated session by setting localStorage directly
 * Useful for tests that need to start authenticated without going through the login flow
 */
export async function setMockAuthState(
  page: Page,
  token: string = 'mock-token-for-testing',
  expiresIn: number = 3600000 // 1 hour in ms
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn).toISOString()

  await page.addInitScript(({ token, expiresAt }) => {
    localStorage.setItem('securedealai_token', token)
    localStorage.setItem('securedealai_token_expiry', expiresAt)
  }, { token, expiresAt })
}
