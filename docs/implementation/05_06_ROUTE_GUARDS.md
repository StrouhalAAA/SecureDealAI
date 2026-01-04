# Task 5.6: Frontend Route Guards & API Integration

> **Phase**: 5 - Access Code Authentication
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 5.4 (Access Code Page), 5.5 (Auth Store)
> **Estimated Effort**: 1 hour

---

## Objective

Add Vue Router navigation guards to protect routes and update API calls to include authentication headers. Handle 401 responses globally.

---

## Prerequisites

- [ ] Task 5.4 completed (Access Code page exists)
- [ ] Task 5.5 completed (Auth store and composable exist)

---

## Architecture Reference

See: [05_00_ACCESS_CODE_ARCHITECTURE.md](./05_00_ACCESS_CODE_ARCHITECTURE.md)

---

## Implementation Steps

### Step 1: Update Router with Navigation Guards

Update file: `apps/web/src/router/index.ts`

```typescript
import { createRouter, createWebHistory, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const routes = [
  {
    path: '/access-code',
    name: 'AccessCode',
    component: () => import('@/pages/AccessCode.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/pages/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/opportunity/:id',
    name: 'Detail',
    component: () => import('@/pages/Detail.vue'),
    meta: { requiresAuth: true }
  },
  // Catch-all - redirect to dashboard (which will redirect to access-code if not authed)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized) => {
  const authStore = useAuthStore()

  // Refresh auth state from storage
  authStore.loadFromStorage()

  const requiresAuth = to.meta.requiresAuth !== false
  const isAuthenticated = authStore.isAuthenticated

  // Route requires auth but user is not authenticated
  if (requiresAuth && !isAuthenticated) {
    // Redirect to access code page, preserving intended destination
    return {
      path: '/access-code',
      query: { redirect: to.fullPath }
    }
  }

  // User is authenticated and trying to access access-code page
  if (to.path === '/access-code' && isAuthenticated) {
    // Redirect to dashboard or intended destination
    const redirect = to.query.redirect as string || '/'
    return { path: redirect }
  }

  // Allow navigation
  return true
})

export default router
```

### Step 2: Create Global 401 Handler

Create file: `apps/web/src/plugins/authInterceptor.ts`

```typescript
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
```

### Step 3: Update Main App Entry

Update file: `apps/web/src/main.ts`

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setupAuthInterceptor } from './plugins/authInterceptor'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Setup auth interceptor after pinia is available
setupAuthInterceptor()

app.mount('#app')
```

### Step 4: Update Error Handler

Update file: `apps/web/src/composables/useErrorHandler.ts`

Add 401 handling (if not already present):

```typescript
import { useAuth } from '@/composables/useAuth'

export function useErrorHandler() {
  const { handleUnauthorized } = useAuth()

  function handleApiError(error: unknown, context?: string): void {
    // Check for 401 response
    if (error instanceof Response && error.status === 401) {
      handleUnauthorized()
      return
    }

    // Check for error object with status
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const statusError = error as { status: number }
      if (statusError.status === 401) {
        handleUnauthorized()
        return
      }
    }

    // Handle other errors...
    console.error(`Error in ${context || 'unknown context'}:`, error)
  }

  return {
    handleApiError
  }
}
```

### Step 5: Update API Composables to Use Auth Headers

Update any composables that make API calls. Example for a generic pattern:

```typescript
// Example: apps/web/src/composables/useBuyingOpportunity.ts

import { ref } from 'vue'
import { fetchWithAuth } from '@/composables/useSupabase'

export function useBuyingOpportunity() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOpportunities() {
    loading.value = true
    error.value = null

    try {
      const response = await fetchWithAuth('buying-opportunity', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    fetchOpportunities
  }
}
```

### Step 6: Add Logout Button to App Header

If you have an app header/navbar, add a logout button:

```vue
<!-- Example: apps/web/src/components/AppHeader.vue -->
<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const { logout, isAuthenticated } = useAuth()
</script>

<template>
  <header class="bg-gray-800 border-b border-gray-700">
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <h1 class="text-xl font-bold text-white">SecureDealAI</h1>

      <button
        v-if="isAuthenticated"
        @click="logout()"
        class="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
      >
        Logout
      </button>
    </div>
  </header>
</template>
```

### Step 7: Add Unit Tests

Create file: `apps/web/src/router/__tests__/guards.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

describe('Router Guards', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()

    // Create router with guards
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/access-code',
          component: { template: '<div>Access Code</div>' },
          meta: { requiresAuth: false }
        },
        {
          path: '/',
          component: { template: '<div>Dashboard</div>' },
          meta: { requiresAuth: true }
        },
        {
          path: '/opportunity/:id',
          component: { template: '<div>Detail</div>' },
          meta: { requiresAuth: true }
        }
      ]
    })

    // Add the guard
    router.beforeEach((to) => {
      const authStore = useAuthStore()
      authStore.loadFromStorage()

      const requiresAuth = to.meta.requiresAuth !== false
      const isAuthenticated = authStore.isAuthenticated

      if (requiresAuth && !isAuthenticated) {
        return { path: '/access-code', query: { redirect: to.fullPath } }
      }

      if (to.path === '/access-code' && isAuthenticated) {
        return { path: '/' }
      }

      return true
    })
  })

  it('redirects unauthenticated user to access code', async () => {
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/access-code')
    expect(router.currentRoute.value.query.redirect).toBe('/')
  })

  it('allows authenticated user to access protected route', async () => {
    const authStore = useAuthStore()
    const futureDate = new Date(Date.now() + 86400000)
    authStore.setAuth('valid-token', futureDate)

    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('redirects authenticated user away from access code page', async () => {
    const authStore = useAuthStore()
    const futureDate = new Date(Date.now() + 86400000)
    authStore.setAuth('valid-token', futureDate)

    await router.push('/access-code')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('preserves redirect query when redirecting to access code', async () => {
    await router.push('/opportunity/123')
    expect(router.currentRoute.value.query.redirect).toBe('/opportunity/123')
  })

  it('allows access to access code page when not authenticated', async () => {
    await router.push('/access-code')
    expect(router.currentRoute.value.path).toBe('/access-code')
  })
})
```

---

## Validation Criteria

- [ ] Router guards redirect unauthenticated users to `/access-code`
- [ ] Redirect query parameter preserves intended destination
- [ ] Authenticated users can access protected routes
- [ ] Authenticated users are redirected away from access code page
- [ ] 401 responses trigger logout and redirect
- [ ] API calls include auth headers
- [ ] Logout clears auth and redirects
- [ ] Unit tests pass

---

## Test Cases

### Manual Testing

1. **Not authenticated, visit `/`** → Redirect to `/access-code?redirect=/`
2. **Not authenticated, visit `/opportunity/123`** → Redirect to `/access-code?redirect=/opportunity/123`
3. **Authenticate, check redirect** → Should go to original destination
4. **Authenticated, visit `/access-code`** → Redirect to `/`
5. **Authenticated, click logout** → Clear session, redirect to `/access-code`
6. **Authenticated, API returns 401** → Clear session, redirect to `/access-code`
7. **Token expires in another tab** → Current tab should redirect on next API call

---

## Completion Checklist

- [ ] Router guards implemented
- [ ] Auth interceptor setup
- [ ] main.ts updated
- [ ] Error handler updated
- [ ] API composables updated with auth headers
- [ ] Logout functionality works
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
