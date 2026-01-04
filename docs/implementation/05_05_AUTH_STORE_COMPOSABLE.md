# Task 5.5: Frontend Auth Store & Composable

> **Phase**: 5 - Access Code Authentication
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: None
> **Estimated Effort**: 1.5 hours

---

## Objective

Create the Pinia store and composable for managing authentication state. This handles JWT storage, expiry checking, and providing auth state to components.

---

## Prerequisites

- [ ] None - can start immediately

---

## Architecture Reference

See: [05_00_ACCESS_CODE_ARCHITECTURE.md](./05_00_ACCESS_CODE_ARCHITECTURE.md)

---

## Design Requirements

### Auth Store Responsibilities

- Store JWT token
- Track authentication state
- Track token expiry time
- Persist to localStorage
- Sync state across tabs

### useAuth Composable Responsibilities

- `login(code)` - Call verify-access-code API, store token
- `logout()` - Clear token, redirect
- `checkAuth()` - Verify token validity
- `isAuthenticated` - Reactive auth state
- `getAuthHeader()` - Get Authorization header for API calls

---

## Implementation Steps

### Step 1: Create Auth Store

Create file: `apps/web/src/stores/authStore.ts`

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'securedealai_token'
const EXPIRY_KEY = 'securedealai_token_expiry'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(null)
  const expiresAt = ref<Date | null>(null)

  // Computed
  const isAuthenticated = computed(() => {
    if (!token.value || !expiresAt.value) return false
    return new Date() < expiresAt.value
  })

  const isTokenExpiringSoon = computed(() => {
    if (!expiresAt.value) return false
    const fiveMinutes = 5 * 60 * 1000
    return new Date().getTime() + fiveMinutes > expiresAt.value.getTime()
  })

  // Actions
  function setAuth(newToken: string, expiry: string | Date) {
    token.value = newToken
    expiresAt.value = typeof expiry === 'string' ? new Date(expiry) : expiry

    // Persist to localStorage
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(EXPIRY_KEY, expiresAt.value.toISOString())
  }

  function clearAuth() {
    token.value = null
    expiresAt.value = null

    // Clear localStorage
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
  }

  function loadFromStorage() {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedExpiry = localStorage.getItem(EXPIRY_KEY)

    if (storedToken && storedExpiry) {
      const expiry = new Date(storedExpiry)

      // Check if token is still valid
      if (new Date() < expiry) {
        token.value = storedToken
        expiresAt.value = expiry
      } else {
        // Token expired, clear it
        clearAuth()
      }
    }
  }

  function getAuthHeader(): Record<string, string> {
    if (!token.value || !isAuthenticated.value) {
      return {}
    }
    return {
      'Authorization': `Bearer ${token.value}`
    }
  }

  // Initialize from storage on store creation
  loadFromStorage()

  // Listen for storage changes (sync across tabs)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === TOKEN_KEY) {
        if (event.newValue) {
          loadFromStorage()
        } else {
          clearAuth()
        }
      }
    })
  }

  return {
    // State
    token,
    expiresAt,

    // Computed
    isAuthenticated,
    isTokenExpiringSoon,

    // Actions
    setAuth,
    clearAuth,
    loadFromStorage,
    getAuthHeader
  }
})
```

### Step 2: Create useAuth Composable

Create file: `apps/web/src/composables/useAuth.ts`

```typescript
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

interface LoginResult {
  success: boolean
  message: string
  retry_after?: number
}

interface VerifyResponse {
  success: boolean
  token?: string
  expires_at?: string
  error?: string
  message?: string
  retry_after?: number
}

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const isTokenExpiringSoon = computed(() => authStore.isTokenExpiringSoon)

  /**
   * Attempt to log in with an access code
   */
  async function login(code: string): Promise<LoginResult> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-access-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })

      const data: VerifyResponse = await response.json()

      if (response.ok && data.success && data.token && data.expires_at) {
        authStore.setAuth(data.token, data.expires_at)
        return { success: true, message: 'Login successful' }
      }

      return {
        success: false,
        message: data.message || 'Invalid access code',
        retry_after: data.retry_after
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      }
    }
  }

  /**
   * Log out and redirect to access code page
   */
  function logout(redirect = true) {
    authStore.clearAuth()
    if (redirect) {
      router.push('/access-code')
    }
  }

  /**
   * Check if current auth is valid
   * Returns true if authenticated, false otherwise
   */
  function checkAuth(): boolean {
    // Force a fresh check from storage
    authStore.loadFromStorage()
    return authStore.isAuthenticated
  }

  /**
   * Get authorization header for API calls
   */
  function getAuthHeader(): Record<string, string> {
    return authStore.getAuthHeader()
  }

  /**
   * Handle 401 response from API
   * Call this when an API returns 401
   */
  function handleUnauthorized() {
    logout(true)
  }

  return {
    isAuthenticated,
    isTokenExpiringSoon,
    login,
    logout,
    checkAuth,
    getAuthHeader,
    handleUnauthorized
  }
}
```

### Step 3: Update useSupabase to Include Auth Header

Update file: `apps/web/src/composables/useSupabase.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create base client
export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Get a Supabase client with auth headers
 * Use this for all API calls that require authentication
 */
export function useAuthenticatedSupabase(): SupabaseClient {
  const authStore = useAuthStore()

  // Create a new client with the auth token in global headers
  const token = authStore.token

  if (token) {
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })
  }

  return supabase
}

/**
 * Make an authenticated fetch request to Edge Functions
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const authStore = useAuthStore()
  const authHeaders = authStore.getAuthHeader()

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${supabaseUrl}/functions/v1/${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers
    }
  })

  // Handle 401 - could trigger logout here
  if (response.status === 401) {
    authStore.clearAuth()
    // Optionally redirect - but let the caller handle this
  }

  return response
}
```

### Step 4: Add Unit Tests

Create file: `apps/web/src/stores/__tests__/authStore.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
```

Create file: `apps/web/src/composables/__tests__/useAuth.spec.ts`

```typescript
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
```

---

## Validation Criteria

- [ ] Auth store created at `apps/web/src/stores/authStore.ts`
- [ ] useAuth composable created at `apps/web/src/composables/useAuth.ts`
- [ ] useSupabase updated with auth header support
- [ ] Token persisted to localStorage
- [ ] Token loaded from localStorage on app start
- [ ] Expired tokens cleared automatically
- [ ] Cross-tab sync works
- [ ] Unit tests pass

---

## Completion Checklist

- [ ] Auth store implemented
- [ ] useAuth composable implemented
- [ ] useSupabase updated
- [ ] Unit tests created and passing
- [ ] Manual testing completed
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
