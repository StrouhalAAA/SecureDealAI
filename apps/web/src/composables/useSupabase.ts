import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create base client
export const supabase = createClient(supabaseUrl, supabaseKey)

export function useSupabase() {
  return { supabase }
}

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
