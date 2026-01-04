import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('starts with no authentication', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
  })

  it('sets auth correctly', () => {
    const store = useAuthStore()
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

    store.setAuth('test-token', futureDate)

    expect(store.token).toBe('test-token')
    expect(store.isAuthenticated).toBe(true)
  })

  it('persists to localStorage', () => {
    const store = useAuthStore()
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

    store.setAuth('test-token', futureDate)

    expect(localStorage.getItem('securedealai_token')).toBe('test-token')
  })

  it('loads from localStorage', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    localStorage.setItem('securedealai_token', 'stored-token')
    localStorage.setItem('securedealai_token_expiry', futureDate.toISOString())

    const store = useAuthStore()
    store.loadFromStorage()

    expect(store.token).toBe('stored-token')
    expect(store.isAuthenticated).toBe(true)
  })

  it('clears expired token on load', () => {
    const pastDate = new Date(Date.now() - 1000)
    localStorage.setItem('securedealai_token', 'expired-token')
    localStorage.setItem('securedealai_token_expiry', pastDate.toISOString())

    const store = useAuthStore()
    store.loadFromStorage()

    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('clears auth correctly', () => {
    const store = useAuthStore()
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

    store.setAuth('test-token', futureDate)
    store.clearAuth()

    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('securedealai_token')).toBeNull()
  })

  it('returns correct auth header', () => {
    const store = useAuthStore()
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)

    store.setAuth('test-token', futureDate)

    const header = store.getAuthHeader()
    expect(header.Authorization).toBe('Bearer test-token')
  })

  it('returns empty header when not authenticated', () => {
    const store = useAuthStore()
    const header = store.getAuthHeader()
    expect(header).toEqual({})
  })

  it('detects token expiring soon', () => {
    const store = useAuthStore()
    // Token expires in 2 minutes (less than 5 minute threshold)
    const soonDate = new Date(Date.now() + 2 * 60 * 1000)

    store.setAuth('test-token', soonDate)

    expect(store.isTokenExpiringSoon).toBe(true)
  })
})
