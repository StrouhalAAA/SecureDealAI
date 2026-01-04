import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush })
}))

import { useAuth } from '../useAuth'

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mockFetch.mockReset()
    mockPush.mockReset()
  })

  it('login succeeds with valid response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        token: 'new-token',
        expires_at: new Date(Date.now() + 86400000).toISOString()
      })
    })

    const { login, isAuthenticated } = useAuth()
    const result = await login('valid-code')

    expect(result.success).toBe(true)
    expect(isAuthenticated.value).toBe(true)
  })

  it('login fails with invalid code', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: 'INVALID_CODE',
        message: 'Invalid access code'
      })
    })

    const { login, isAuthenticated } = useAuth()
    const result = await login('wrong-code')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Invalid access code')
    expect(isAuthenticated.value).toBe(false)
  })

  it('login returns retry_after on rate limit', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many attempts',
        retry_after: 900
      })
    })

    const { login } = useAuth()
    const result = await login('any-code')

    expect(result.success).toBe(false)
    expect(result.retry_after).toBe(900)
  })

  it('logout clears auth and redirects', () => {
    const { logout } = useAuth()
    logout()

    expect(mockPush).toHaveBeenCalledWith('/access-code')
  })

  it('logout without redirect does not navigate', () => {
    const { logout } = useAuth()
    logout(false)

    expect(mockPush).not.toHaveBeenCalled()
  })
})
