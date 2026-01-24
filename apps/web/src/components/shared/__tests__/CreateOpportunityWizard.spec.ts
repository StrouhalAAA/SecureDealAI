import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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
    from: () => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-opportunity-id', spz: 'TEMP-123', status: 'DRAFT' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'test-opportunity-id', spz: 'TEST123', status: 'DRAFT' },
            error: null
          }))
        }))
      })),
      rpc: vi.fn(() => Promise.resolve({ error: null }))
    })
  }
}))

// Mock child components to simplify testing
vi.mock('@/components/forms/ContactForm.vue', () => ({
  default: {
    name: 'ContactForm',
    props: ['buyingOpportunityId', 'existingContact'],
    emits: ['saved', 'next', 'back'],
    template: `
      <div data-testid="contact-form">
        <h3>Krok 1: Kontaktní osoba</h3>
        <button @click="$emit('next')" data-testid="contact-next">Další krok</button>
        <button @click="$emit('back')" data-testid="contact-back">Zrušit</button>
      </div>
    `
  }
}))

vi.mock('@/components/forms/VendorForm.vue', () => ({
  default: {
    name: 'VendorForm',
    props: ['buyingOpportunityId', 'existingVendor'],
    emits: ['saved', 'next', 'back'],
    template: '<div data-testid="vendor-form">Vendor Form</div>'
  }
}))

vi.mock('@/components/shared/QuickVehicleForm.vue', () => ({
  default: {
    name: 'QuickVehicleForm',
    props: ['loading', 'error'],
    emits: ['submit', 'cancel'],
    template: '<div data-testid="quick-vehicle-form">Quick Vehicle Form</div>'
  }
}))

vi.mock('../QuickVehicleForm.vue', () => ({
  default: {
    name: 'QuickVehicleForm',
    props: ['loading', 'error'],
    emits: ['submit', 'cancel'],
    template: '<div data-testid="quick-vehicle-form">Quick Vehicle Form</div>'
  }
}))

vi.mock('@/components/ocr/DropZone.vue', () => ({
  default: {
    name: 'DropZone',
    props: ['file', 'uploading', 'uploaded', 'error', 'accept'],
    emits: ['file-selected', 'remove'],
    template: '<div data-testid="drop-zone">Drop Zone</div>'
  }
}))

vi.mock('@/components/ocr/OcrStatus.vue', () => ({
  default: {
    name: 'OcrStatus',
    props: ['extraction'],
    emits: ['retry'],
    template: '<div data-testid="ocr-status">OCR Status</div>'
  }
}))

vi.mock('@/utils/addressParser', () => ({
  extractPowerKw: vi.fn(() => null)
}))

vi.mock('@/types/contact', () => ({
  getContactDisplayName: vi.fn(() => 'Jan Novak')
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('CreateOpportunityWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to navigate past deal-type step to contact step
  async function navigateToContactStep(wrapper: ReturnType<typeof mount>) {
    // Click "Pobočka" button to select deal type
    const branchButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Pobočka')
    )
    await branchButton?.trigger('click')
    await flushPromises()
  }

  it('shows deal type selection by default', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // The wizard should start with deal-type step
    expect(wrapper.find('h2').text()).toBe('Typ výkupu')
    expect(wrapper.text()).toContain('Vyberte typ výkupu')
    expect(wrapper.text()).toContain('Pobočka')
    expect(wrapper.text()).toContain('Mobilní výkup')
  })

  it('navigates to contact step when deal type is selected', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    await navigateToContactStep(wrapper)

    // Should now show contact form
    expect(wrapper.find('[data-testid="contact-form"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Kontaktní osoba')
  })

  it('displays correct title on contact step', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    await navigateToContactStep(wrapper)

    expect(wrapper.find('h2').text()).toBe('Nová nákupní příležitost')
  })

  it('shows progress steps with correct labels', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    expect(wrapper.text()).toContain('Typ')
    expect(wrapper.text()).toContain('Kontakt')
    expect(wrapper.text()).toContain('Vozidlo')
    expect(wrapper.text()).toContain('Dodavatel')
  })

  it('does not show back button on initial deal-type step', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // Back button should not exist when stepHistory is empty
    expect(wrapper.find('[aria-label="Zpět"]').exists()).toBe(false)
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    const closeButton = wrapper.find('[aria-label="Zavřít"]')
    expect(closeButton.exists()).toBe(true)

    await closeButton.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')?.length).toBe(1)
  })

  it('navigates to vehicle choice step when contact next is clicked', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // Navigate to contact step first
    await navigateToContactStep(wrapper)

    // Click "next" on contact form
    const nextButton = wrapper.find('[data-testid="contact-next"]')
    await nextButton.trigger('click')
    await flushPromises()

    // Should now show vehicle choice step
    expect(wrapper.find('h2').text()).toBe('Data vozidla')
    expect(wrapper.text()).toContain('Vyberte způsob přidání vozidla')
    expect(wrapper.text()).toContain('Nahrát ORV')
    expect(wrapper.text()).toContain('Zadat ručně')
  })

  it('shows back button after navigating to contact step', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // Navigate to contact step
    await navigateToContactStep(wrapper)

    // Back button should now be visible
    expect(wrapper.find('[aria-label="Zpět"]').exists()).toBe(true)
  })

  it('navigates to upload step when Upload ORV is clicked', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // Navigate to contact step then choice step
    await navigateToContactStep(wrapper)
    await wrapper.find('[data-testid="contact-next"]').trigger('click')
    await flushPromises()

    // Click Upload ORV
    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')
    await flushPromises()

    expect(wrapper.find('h2').text()).toBe('Nahrát ORV dokument')
    // SPZ input is now shown after OCR completes, not before
    expect(wrapper.text()).toContain('Nahrát ORV dokument')
  })

  it('navigates to manual entry step when Manual Entry is clicked', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // Navigate to contact step then choice step
    await navigateToContactStep(wrapper)
    await wrapper.find('[data-testid="contact-next"]').trigger('click')
    await flushPromises()

    // Click Manual Entry
    const manualButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Zadat ručně')
    )
    await manualButton?.trigger('click')
    await flushPromises()

    expect(wrapper.find('h2').text()).toBe('Ruční zadání vozidla')
    expect(wrapper.find('[data-testid="quick-vehicle-form"]').exists()).toBe(true)
  })

  it('navigates back to choice step from upload step', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // Navigate to contact step then choice step
    await navigateToContactStep(wrapper)
    await wrapper.find('[data-testid="contact-next"]').trigger('click')
    await flushPromises()

    // Navigate to upload step
    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')
    await flushPromises()

    // Click back
    const backButton = wrapper.find('[aria-label="Zpět"]')
    await backButton.trigger('click')
    await flushPromises()

    // Should be back to choice step
    expect(wrapper.find('h2').text()).toBe('Data vozidla')
  })

  it('shows DropZone for immediate file upload without SPZ requirement', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // Navigate to upload step
    await navigateToContactStep(wrapper)
    await wrapper.find('[data-testid="contact-next"]').trigger('click')
    await flushPromises()

    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')
    await flushPromises()

    // DropZone should be visible for immediate upload
    expect(wrapper.find('[data-testid="drop-zone"]').exists()).toBe(true)
    // SPZ input should NOT be visible until OCR completes
    expect(wrapper.find('#upload-spz').exists()).toBe(false)
  })

  it('does not show SPZ field before OCR extraction completes', async () => {
    const wrapper = mount(CreateOpportunityWizard)
    await flushPromises()

    // Navigate to upload step
    await navigateToContactStep(wrapper)
    await wrapper.find('[data-testid="contact-next"]').trigger('click')
    await flushPromises()

    const uploadButton = wrapper.findAll('button').find(
      btn => btn.text().includes('Nahrát ORV')
    )
    await uploadButton?.trigger('click')
    await flushPromises()

    // SPZ field should not be visible before OCR
    const spzInput = wrapper.find('#upload-spz')
    expect(spzInput.exists()).toBe(false)
  })
})
