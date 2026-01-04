import { useAuthStore } from '@/stores/authStore'
import router from '@/router'

/**
 * Setup global fetch interceptor for handling 401 responses
 */
export function setupAuthInterceptor() {
  const originalFetch = window.fetch

  window.fetch = async function(...args): Promise<Response> {
    const response = await originalFetch.apply(this, args)

    // Check for 401 Unauthorized
    if (response.status === 401) {
      const authStore = useAuthStore()

      // Don't redirect if we're on the access code page
      if (!window.location.pathname.includes('/access-code')) {
        // Clear auth state
        authStore.clearAuth()

        // Redirect to access code page
        router.push({
          path: '/access-code',
          query: { redirect: window.location.pathname }
        })
      }
    }

    return response
  }
}
