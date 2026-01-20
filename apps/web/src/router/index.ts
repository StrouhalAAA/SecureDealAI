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
    path: '/new-opportunity',
    name: 'NewOpportunity',
    component: () => import('@/pages/NewOpportunity.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/opportunity/:id',
    name: 'Detail',
    component: () => import('@/pages/Detail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/api-docs',
    name: 'ApiDocs',
    component: () => import('@/pages/SwaggerUI.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rules',
    name: 'Rules',
    component: () => import('@/pages/RulesManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rules/new',
    name: 'RuleCreate',
    component: () => import('@/pages/RuleCreatePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/rules/:id/edit',
    name: 'RuleEdit',
    component: () => import('@/pages/RuleEditPage.vue'),
    meta: { requiresAuth: true }
  },
  // Catch-all - redirect to dashboard (which will redirect to access-code if not authed)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to: RouteLocationNormalized) => {
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
