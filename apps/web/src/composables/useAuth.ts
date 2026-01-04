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
