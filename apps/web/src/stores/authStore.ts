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
