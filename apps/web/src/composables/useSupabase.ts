import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Create Supabase client with custom fetch that automatically includes auth token.
 *
 * The key insight is that we intercept ALL fetch requests and dynamically inject
 * the JWT token from authStore when available. This means:
 * 1. All components using this client automatically get authenticated requests
 * 2. No need to change individual components
 * 3. Token changes are picked up immediately (no stale clients)
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      // Get auth store lazily at request time to avoid circular dependencies
      // and ensure we always get the current token value
      const authStore = useAuthStore()
      const token = authStore.token

      const headers = new Headers(options?.headers)

      // If we have a valid token, replace the Authorization header with our JWT
      // This overrides the default anon key authorization
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

/**
 * @deprecated Use the regular `supabase` export instead.
 * The client now automatically includes auth headers when a token is available.
 */
export function useAuthenticatedSupabase(): SupabaseClient {
  // Now same as regular client - auth is handled by custom fetch
  return supabase
}

/**
 * Make an authenticated fetch request to Edge Functions
 *
 * Note: 401 responses are handled globally by the auth interceptor.
 * This function still clears auth state but doesn't redirect (interceptor handles that).
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

  // Note: 401 handling is done globally by authInterceptor
  // but we still clear local state as a safety measure
  if (response.status === 401) {
    authStore.clearAuth()
  }

  return response
}
