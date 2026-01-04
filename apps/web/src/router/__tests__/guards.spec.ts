import { describe, it, expect, beforeEach } from 'vitest'
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
