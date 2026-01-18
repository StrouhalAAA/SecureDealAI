import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateOpportunityWizard from '../CreateOpportunityWizard.vue'

// Mock useErrorHandler to avoid Pinia dependency
vi.mock('@/composables/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: vi.fn(() => 'Mocked error'),
    handleApiError: vi.fn(),
    shouldRedirect: vi.fn(() => ({ redirect: false })),
    isRetryable: vi.fn(() => false),
  })
}))

// Mock Supabase
vi.mock('@/composables/useSupabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-id', spz: 'TEST123', status: 'DRAFT' },
            error: null
          }))
        }))
      }))
    }))
  }
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('CreateOpportunityWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows choice step by default', () => {
    const wrapper = mount(CreateOpportunityWizard)

    expect(wrapper.text()).toContain('Nahrát ORV')
    expect(wrapper.text()).toContain('Zadat ručně')
    expect(wrapper.text()).toContain('Vyberte způsob přidání vozidla')
  })

  it('displays correct title on choice step', () => {
    const wrapper = mount(CreateOpportunityWizard)

    expect(wrapper.find('h2').text()).toBe('Nová nákupní příležitost')
  })

  it('navigates to upload step when Upload ORV is clicked', async () => {
    const wrapper = mount(CreateOpportunityWizard)

    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')

    expect(wrapper.find('h2').text()).toBe('Nahrát ORV dokument')
    expect(wrapper.text()).toContain('SPZ (registrační značka)')
  })

  it('navigates to manual entry step when Manual Entry is clicked', async () => {
    const wrapper = mount(CreateOpportunityWizard)

    const manualButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Zadat ručně')
    )
    await manualButton?.trigger('click')

    expect(wrapper.find('h2').text()).toBe('Ruční zadání vozidla')
  })

  it('shows back button on non-choice steps', async () => {
    const wrapper = mount(CreateOpportunityWizard)

    // Initially no back button
    expect(wrapper.find('[aria-label="Zpět"]').exists()).toBe(false)

    // Navigate to upload step
    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')

    // Back button should be visible
    expect(wrapper.find('[aria-label="Zpět"]').exists()).toBe(true)
  })

  it('navigates back to choice step when back is clicked', async () => {
    const wrapper = mount(CreateOpportunityWizard)

    // Navigate to upload step
    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')

    // Click back
    const backButton = wrapper.find('[aria-label="Zpět"]')
    await backButton.trigger('click')

    // Should be back to choice step
    expect(wrapper.find('h2').text()).toBe('Nová nákupní příležitost')
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(CreateOpportunityWizard)

    const closeButton = wrapper.find('[aria-label="Zavřít"]')
    await closeButton.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')?.length).toBe(1)
  })

  it('validates SPZ before allowing file upload', async () => {
    const wrapper = mount(CreateOpportunityWizard)

    // Navigate to upload step
    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')

    // Find SPZ input and blur without entering value
    const spzInput = wrapper.find('#upload-spz')
    await spzInput.trigger('blur')

    // Should show error
    expect(wrapper.text()).toContain('SPZ je povinné pole')
  })

  it('shows SPZ format error for invalid length', async () => {
    const wrapper = mount(CreateOpportunityWizard)

    // Navigate to upload step
    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')

    // Enter short SPZ
    const spzInput = wrapper.find('#upload-spz')
    await spzInput.setValue('ABC')
    await spzInput.trigger('blur')

    // Should show format error
    expect(wrapper.text()).toContain('SPZ musí mít 5-8 znaků')
  })

  it('submit button is disabled without valid OCR extraction', async () => {
    const wrapper = mount(CreateOpportunityWizard)

    // Navigate to upload step
    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')

    // Find submit button
    const submitButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Vytvořit příležitost')
    )

    expect(submitButton?.attributes('disabled')).toBeDefined()
  })
})
