import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AccessCode from '../AccessCode.vue'

// Mock useAuth
const mockLogin = vi.fn()
const mockIsAuthenticated = { value: false }

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: mockIsAuthenticated
  })
}))

describe('AccessCode.vue', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())

    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/access-code', component: AccessCode },
        { path: '/', component: { template: '<div>Dashboard</div>' } }
      ]
    })

    mockLogin.mockReset()
    mockIsAuthenticated.value = false
  })

  it('renders the access code form', () => {
    const wrapper = mount(AccessCode, {
      global: { plugins: [router] }
    })

    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('SecureDealAI')
  })

  it('shows error when submitting empty code', async () => {
    const wrapper = mount(AccessCode, {
      global: { plugins: [router] }
    })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Please enter an access code')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls login with entered code', async () => {
    mockLogin.mockResolvedValue({ success: true })

    const wrapper = mount(AccessCode, {
      global: { plugins: [router] }
    })

    await wrapper.find('input').setValue('test-code')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockLogin).toHaveBeenCalledWith('test-code')
  })

  it('shows error message on failed login', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Invalid access code'
    })

    const wrapper = mount(AccessCode, {
      global: { plugins: [router] }
    })

    await wrapper.find('input').setValue('wrong-code')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid access code')
  })

  it('shows countdown on rate limit', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Too many attempts',
      retry_after: 60
    })

    const wrapper = mount(AccessCode, {
      global: { plugins: [router] }
    })

    await wrapper.find('input').setValue('wrong-code')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('1:00')
  })

  it('disables form during loading', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})) // Never resolves

    const wrapper = mount(AccessCode, {
      global: { plugins: [router] }
    })

    await wrapper.find('input').setValue('test-code')
    wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Verifying')
  })
})
