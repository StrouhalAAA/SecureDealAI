import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref } from 'vue'
import Detail from '../Detail.vue'

// Mock reactive state that can be modified per test
const mockLoading = ref(false)
const mockError = ref<string | null>(null)
const mockOpportunity = ref<{ id: string; spz: string; status: string } | null>({ id: '123', spz: '5L94454', status: 'DRAFT' })
const mockContact = ref(null)
const mockVehicle = ref(null)
const mockVendor = ref(null)
const mockValidationResult = ref(null)
const mockOcrExtractions = ref([])
const mockVehicleOCRData = ref(null)
const mockContactOcrComparison = ref(null)
const mockCurrentStep = ref(0)
const mockSuggestedStartStep = ref(0)

// Mock functions
const mockLoadData = vi.fn()
const mockNextStep = vi.fn()
const mockPrevStep = vi.fn()
const mockGoToStep = vi.fn()
const mockSetContact = vi.fn()
const mockSetVehicle = vi.fn()
const mockSetVendor = vi.fn()
const mockSetValidationResult = vi.fn()
const mockUpdateOpportunityStatus = vi.fn()
const mockClearValidation = vi.fn()

vi.mock('@/composables/useDetailData', () => ({
  useDetailData: () => ({
    loading: mockLoading,
    error: mockError,
    opportunity: mockOpportunity,
    contact: mockContact,
    vehicle: mockVehicle,
    vendor: mockVendor,
    validationResult: mockValidationResult,
    ocrExtractions: mockOcrExtractions,
    vehicleOCRData: mockVehicleOCRData,
    contactOcrComparison: mockContactOcrComparison,
    loadData: mockLoadData,
    setContact: mockSetContact,
    setVehicle: mockSetVehicle,
    setVendor: mockSetVendor,
    setValidationResult: mockSetValidationResult,
    updateOpportunityStatus: mockUpdateOpportunityStatus,
    clearValidation: mockClearValidation,
    hasContact: { value: false },
    hasVehicle: { value: false },
    hasVendor: { value: false },
    hasValidation: { value: false },
    suggestedStartStep: mockSuggestedStartStep,
  })
}))

vi.mock('@/composables/useStepNavigation', () => ({
  useStepNavigation: () => ({
    currentStep: mockCurrentStep,
    steps: [
      { label: 'Kontakt' },
      { label: 'Vozidlo' },
      { label: 'Dodavatel' },
      { label: 'Dokumenty' },
      { label: 'Validace' },
    ],
    nextStep: mockNextStep,
    prevStep: mockPrevStep,
    goToStep: mockGoToStep,
    isFirstStep: { value: true },
    isLastStep: { value: false },
    canGoNext: { value: true },
    canGoBack: { value: false },
    currentStepConfig: { value: { label: 'Kontakt' } },
    stepStates: { value: [
      { completed: false, active: true },
      { completed: false, active: false },
      { completed: false, active: false },
      { completed: false, active: false },
      { completed: false, active: false },
    ]},
  })
}))

// Mock child components
vi.mock('@/components/shared/StepProgress.vue', () => ({
  default: {
    name: 'StepProgress',
    template: '<div class="step-progress">StepProgress</div>',
    props: ['steps', 'stepStates', 'allowJump']
  }
}))

vi.mock('@/components/forms/ContactForm.vue', () => ({
  default: {
    name: 'ContactForm',
    template: '<div class="contact-form">ContactForm</div>',
    emits: ['saved', 'next', 'back'],
    props: ['buyingOpportunityId', 'existingContact']
  }
}))

vi.mock('@/components/forms/VehicleForm.vue', () => ({
  default: {
    name: 'VehicleForm',
    template: '<div class="vehicle-form">VehicleForm</div>',
    emits: ['saved', 'next', 'back'],
    props: ['buyingOpportunityId', 'initialSpz', 'existingVehicle', 'ocrData']
  }
}))

vi.mock('@/components/forms/VendorForm.vue', () => ({
  default: {
    name: 'VendorForm',
    template: '<div class="vendor-form">VendorForm</div>',
    emits: ['saved', 'back', 'next'],
    props: ['buyingOpportunityId', 'existingVendor', 'contact', 'contactOcrComparison']
  }
}))

vi.mock('@/components/ocr/DocumentUpload.vue', () => ({
  default: {
    name: 'DocumentUpload',
    template: '<div class="document-upload">DocumentUpload</div>',
    emits: ['back', 'validated'],
    props: ['spz', 'buyingOpportunityId']
  }
}))

vi.mock('@/components/validation/ValidationResult.vue', () => ({
  default: {
    name: 'ValidationResult',
    template: '<div class="validation-result">ValidationResult</div>',
    emits: ['retry', 'close'],
    props: ['result']
  }
}))

const createTestRouter = () => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/detail/:id', name: 'Detail', component: Detail }
    ]
  })
}

// Reset mock state before each test
function resetMockState() {
  mockLoading.value = false
  mockError.value = null
  mockOpportunity.value = { id: '123', spz: '5L94454', status: 'DRAFT' }
  mockContact.value = null
  mockVehicle.value = null
  mockVendor.value = null
  mockValidationResult.value = null
  mockOcrExtractions.value = []
  mockVehicleOCRData.value = null
  mockContactOcrComparison.value = null
  mockCurrentStep.value = 0
  mockSuggestedStartStep.value = 0
}

describe('Detail Page', () => {
  let router: ReturnType<typeof createTestRouter>

  beforeEach(() => {
    router = createTestRouter()
    vi.clearAllMocks()
    resetMockState()
  })

  describe('mounting', () => {
    it('calls loadData on mount', async () => {
      router.push('/detail/123')
      await router.isReady()

      mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      expect(mockLoadData).toHaveBeenCalled()
    })

    it('displays opportunity SPZ in header', async () => {
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      expect(wrapper.text()).toContain('5L94454')
    })

    it('shows StepProgress component', async () => {
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      expect(wrapper.find('.step-progress').exists()).toBe(true)
    })
  })

  describe('step rendering', () => {
    it('shows ContactForm when currentStep is 0', async () => {
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      expect(wrapper.find('.contact-form').exists()).toBe(true)
    })

    it('shows VehicleForm when currentStep is 1', async () => {
      mockCurrentStep.value = 1
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      expect(wrapper.find('.vehicle-form').exists()).toBe(true)
    })
  })

  describe('navigation', () => {
    it('navigates to dashboard when back button clicked', async () => {
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      const backButton = wrapper.find('[data-testid="back-to-dashboard"]')
      await backButton.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  describe('component events', () => {
    it('calls setContact when ContactForm emits saved', async () => {
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      const contactData = { id: 'c1', first_name: 'Test', last_name: 'User' }
      await wrapper.findComponent({ name: 'ContactForm' }).vm.$emit('saved', contactData)

      expect(mockSetContact).toHaveBeenCalledWith(contactData)
    })

    it('calls setVehicle when VehicleForm emits saved', async () => {
      mockCurrentStep.value = 1
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      const vehicleData = { id: 'v1', vin: 'ABC123' }
      await wrapper.findComponent({ name: 'VehicleForm' }).vm.$emit('saved', vehicleData)

      expect(mockSetVehicle).toHaveBeenCalledWith(vehicleData)
    })

    it('calls nextStep when VehicleForm emits next', async () => {
      mockCurrentStep.value = 1
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      await wrapper.findComponent({ name: 'VehicleForm' }).vm.$emit('next')

      expect(mockNextStep).toHaveBeenCalled()
    })
  })
})

describe('Detail Page - Loading State', () => {
  let router: ReturnType<typeof createTestRouter>

  beforeEach(() => {
    router = createTestRouter()
    vi.clearAllMocks()
    resetMockState()
  })

  it('shows loading spinner when loading', async () => {
    // Set loading state
    mockLoading.value = true
    mockOpportunity.value = null

    router.push('/detail/123')
    await router.isReady()

    const wrapper = mount(Detail, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Načítání')
  })
})

describe('Detail Page - Error State', () => {
  let router: ReturnType<typeof createTestRouter>

  beforeEach(() => {
    router = createTestRouter()
    vi.clearAllMocks()
    resetMockState()
  })

  it('shows error message when error occurs', async () => {
    // Set error state
    mockError.value = 'Network error'
    mockOpportunity.value = null

    router.push('/detail/123')
    await router.isReady()

    const wrapper = mount(Detail, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Network error')
  })

  it('shows retry button when error occurs', async () => {
    // Set error state
    mockError.value = 'Network error'
    mockOpportunity.value = null

    router.push('/detail/123')
    await router.isReady()

    const wrapper = mount(Detail, { global: { plugins: [router] } })
    await flushPromises()

    // Find the retry button within the error container (not the back button)
    const errorContainer = wrapper.find('.bg-red-50')
    expect(errorContainer.exists()).toBe(true)
    const retryButton = errorContainer.find('button')
    expect(retryButton.exists()).toBe(true)
    expect(retryButton.text()).toContain('znovu')
  })
})
