# Task 3.9c: Page Integration & Assembly

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: 3.9a Step Orchestration, 3.9b Data Loading, 3.3-3.8 All Components
> **Estimated Effort**: Low
> **Parent Task**: 3.9 Detail Page

---

## Objective

Assemble the final Detail.vue page by combining the step navigation composable, data loading composable, and all child components (VehicleForm, VendorForm, DocumentUpload, ValidationResult).

---

## Why This Sub-Task Exists

The Detail Page (3.9) was split into focused sub-tasks to:
- Reduce complexity per implementation unit
- Enable parallel development
- Isolate testable concerns
- Reduce risk of integration failures

This sub-task is the final assembly that brings together:
- 3.9a: Step orchestration (useStepNavigation, StepIndicator)
- 3.9b: Data loading (useDetailData)
- 3.3-3.8: All child components

---

## Component Tests

### Required Tests (Write Before Implementation)

Create test file: `MVPScope/frontend/src/pages/__tests__/Detail.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Detail from '../Detail.vue'

// Mock composables
const mockLoadData = vi.fn()
const mockNextStep = vi.fn()
const mockPrevStep = vi.fn()
const mockGoToStep = vi.fn()
const mockSetVehicle = vi.fn()
const mockSetVendor = vi.fn()
const mockSetValidationResult = vi.fn()
const mockUpdateOpportunityStatus = vi.fn()
const mockClearValidation = vi.fn()

vi.mock('@/composables/useDetailData', () => ({
  useDetailData: () => ({
    loading: { value: false },
    error: { value: null },
    opportunity: { value: { id: '123', spz: '5L94454', status: 'DRAFT' } },
    vehicle: { value: null },
    vendor: { value: null },
    validationResult: { value: null },
    loadData: mockLoadData,
    setVehicle: mockSetVehicle,
    setVendor: mockSetVendor,
    setValidationResult: mockSetValidationResult,
    updateOpportunityStatus: mockUpdateOpportunityStatus,
    clearValidation: mockClearValidation,
    hasVehicle: { value: false },
    hasVendor: { value: false },
    hasValidation: { value: false },
    suggestedStartStep: { value: 0 },
  })
}))

vi.mock('@/composables/useStepNavigation', () => ({
  useStepNavigation: () => ({
    currentStep: { value: 0 },
    steps: [
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
    currentStepConfig: { value: { label: 'Vozidlo' } },
    stepStates: { value: [
      { completed: false, active: true },
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

vi.mock('@/components/forms/VehicleForm.vue', () => ({
  default: {
    name: 'VehicleForm',
    template: '<div class="vehicle-form">VehicleForm</div>',
    emits: ['saved', 'next'],
    props: ['buyingOpportunityId', 'initialSpz', 'existingVehicle']
  }
}))

vi.mock('@/components/forms/VendorForm.vue', () => ({
  default: {
    name: 'VendorForm',
    template: '<div class="vendor-form">VendorForm</div>',
    emits: ['saved', 'back', 'next'],
    props: ['buyingOpportunityId', 'existingVendor']
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

describe('Detail Page', () => {
  let router: ReturnType<typeof createTestRouter>

  beforeEach(() => {
    router = createTestRouter()
    vi.clearAllMocks()
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
    it('shows VehicleForm when currentStep is 0', async () => {
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

      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  describe('component events', () => {
    it('calls setVehicle when VehicleForm emits saved', async () => {
      router.push('/detail/123')
      await router.isReady()

      const wrapper = mount(Detail, { global: { plugins: [router] } })
      await flushPromises()

      const vehicleData = { id: 'v1', vin: 'ABC123' }
      await wrapper.findComponent({ name: 'VehicleForm' }).vm.$emit('saved', vehicleData)

      expect(mockSetVehicle).toHaveBeenCalledWith(vehicleData)
    })

    it('calls nextStep when VehicleForm emits next', async () => {
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner when loading', async () => {
    vi.doMock('@/composables/useDetailData', () => ({
      useDetailData: () => ({
        loading: { value: true },
        error: { value: null },
        opportunity: { value: null },
        vehicle: { value: null },
        vendor: { value: null },
        validationResult: { value: null },
        loadData: vi.fn(),
        setVehicle: vi.fn(),
        setVendor: vi.fn(),
        setValidationResult: vi.fn(),
        updateOpportunityStatus: vi.fn(),
        clearValidation: vi.fn(),
        hasVehicle: { value: false },
        hasVendor: { value: false },
        hasValidation: { value: false },
        suggestedStartStep: { value: 0 },
      })
    }))

    const router = createTestRouter()
    router.push('/detail/123')
    await router.isReady()

    const { default: DetailLoading } = await import('../Detail.vue')
    const wrapper = mount(DetailLoading, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Nacitani')
  })
})

describe('Detail Page - Error State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error message when error occurs', async () => {
    vi.doMock('@/composables/useDetailData', () => ({
      useDetailData: () => ({
        loading: { value: false },
        error: { value: 'Network error' },
        opportunity: { value: null },
        vehicle: { value: null },
        vendor: { value: null },
        validationResult: { value: null },
        loadData: vi.fn(),
        setVehicle: vi.fn(),
        setVendor: vi.fn(),
        setValidationResult: vi.fn(),
        updateOpportunityStatus: vi.fn(),
        clearValidation: vi.fn(),
        hasVehicle: { value: false },
        hasVendor: { value: false },
        hasValidation: { value: false },
        suggestedStartStep: { value: 0 },
      })
    }))

    const router = createTestRouter()
    router.push('/detail/123')
    await router.isReady()

    const { default: DetailError } = await import('../Detail.vue')
    const wrapper = mount(DetailError, { global: { plugins: [router] } })

    expect(wrapper.text()).toContain('Network error')
  })

  it('shows retry button when error occurs', async () => {
    vi.doMock('@/composables/useDetailData', () => ({
      useDetailData: () => ({
        loading: { value: false },
        error: { value: 'Network error' },
        opportunity: { value: null },
        vehicle: { value: null },
        vendor: { value: null },
        validationResult: { value: null },
        loadData: vi.fn(),
        setVehicle: vi.fn(),
        setVendor: vi.fn(),
        setValidationResult: vi.fn(),
        updateOpportunityStatus: vi.fn(),
        clearValidation: vi.fn(),
        hasVehicle: { value: false },
        hasVendor: { value: false },
        hasValidation: { value: false },
        suggestedStartStep: { value: 0 },
      })
    }))

    const router = createTestRouter()
    router.push('/detail/123')
    await router.isReady()

    const { default: DetailError } = await import('../Detail.vue')
    const wrapper = mount(DetailError, { global: { plugins: [router] } })

    expect(wrapper.find('button').text()).toContain('znovu')
  })
})
```

### Test-First Workflow

1. **RED**: Write tests above, run `npm run test -- --filter="Detail"` - they should FAIL
2. **GREEN**: Implement Detail.vue until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

---

## Implementation

### Detail.vue Page

**src/pages/Detail.vue**:
```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button
            data-testid="back-to-dashboard"
            @click="goToDashboard"
            class="text-gray-500 hover:text-gray-700"
          >
            ← Dashboard
          </button>
          <h1 class="text-xl font-bold">SecureDealAI</h1>
        </div>
        <div v-if="data.opportunity.value" class="text-lg font-mono font-bold">
          SPZ: {{ data.opportunity.value.spz }}
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="data.loading.value" class="max-w-4xl mx-auto px-4 py-12 text-center">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="mt-4 text-gray-600">Nacitani...</p>
    </div>

    <!-- Error -->
    <div v-else-if="data.error.value" class="max-w-4xl mx-auto px-4 py-12">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-700">{{ data.error.value }}</p>
        <button
          @click="data.loadData()"
          class="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Zkusit znovu
        </button>
      </div>
    </div>

    <!-- Content -->
    <main v-else class="max-w-4xl mx-auto px-4 py-8">
      <!-- Progress Steps -->
      <div class="mb-8">
        <StepProgress
          :steps="nav.steps"
          :step-states="nav.stepStates.value"
          :allow-jump="true"
          @step-click="nav.goToStep"
        />
      </div>

      <!-- Step Content -->
      <transition name="fade" mode="out-in">
        <!-- Step 1: Vehicle -->
        <VehicleForm
          v-if="nav.currentStep.value === 0"
          :buying-opportunity-id="opportunityId"
          :initial-spz="data.opportunity.value?.spz"
          :existing-vehicle="data.vehicle.value"
          @saved="onVehicleSaved"
          @next="nav.nextStep"
        />

        <!-- Step 2: Vendor -->
        <VendorForm
          v-else-if="nav.currentStep.value === 1"
          :buying-opportunity-id="opportunityId"
          :existing-vendor="data.vendor.value"
          @saved="onVendorSaved"
          @back="nav.prevStep"
          @next="nav.nextStep"
        />

        <!-- Step 3: Documents -->
        <DocumentUpload
          v-else-if="nav.currentStep.value === 2"
          :spz="data.opportunity.value?.spz"
          :buying-opportunity-id="opportunityId"
          @back="nav.prevStep"
          @validated="onValidated"
        />

        <!-- Step 4: Results -->
        <ValidationResult
          v-else-if="nav.currentStep.value === 3 && data.validationResult.value"
          :result="data.validationResult.value"
          @retry="handleRetry"
          @close="goToDashboard"
        />
      </transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStepNavigation } from '@/composables/useStepNavigation'
import { useDetailData } from '@/composables/useDetailData'
import StepProgress from '@/components/shared/StepProgress.vue'
import VehicleForm from '@/components/forms/VehicleForm.vue'
import VendorForm from '@/components/forms/VendorForm.vue'
import DocumentUpload from '@/components/ocr/DocumentUpload.vue'
import ValidationResult from '@/components/validation/ValidationResult.vue'
import type { Vehicle, Vendor, ValidationResult as VR } from '@/types'

const route = useRoute()
const router = useRouter()

const opportunityId = computed(() => route.params.id as string)

// Step definitions
const steps = [
  { label: 'Vozidlo' },
  { label: 'Dodavatel' },
  { label: 'Dokumenty' },
  { label: 'Validace' },
]

// Composables
const data = useDetailData(opportunityId.value)
const nav = useStepNavigation(steps)

// Sync step with data on load
watch(() => data.suggestedStartStep.value, (step) => {
  nav.goToStep(step)
}, { immediate: true })

// Event handlers
function onVehicleSaved(v: Vehicle) {
  data.setVehicle(v)
}

function onVendorSaved(v: Vendor) {
  data.setVendor(v)
}

async function onValidated(result: VR) {
  data.setValidationResult(result)
  nav.goToStep(3)
  await data.updateOpportunityStatus(result.overall_status)
}

function handleRetry() {
  data.clearValidation()
  nav.goToStep(2)
}

function goToDashboard() {
  router.push('/')
}

onMounted(() => {
  data.loadData()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

---

## UI Specification

```
┌─────────────────────────────────────────────────────────────┐
│  SecureDealAI          SPZ: 5L94454          [← Dashboard]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Progress: [●]──────[●]──────[○]──────[○]                   │
│            Step 1   Step 2   Step 3   Step 4                │
│            Vozidlo  Dodavatel Dokumenty Validace            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │           [Current Step Component]                       ││
│  │                                                          ││
│  │           VehicleForm / VendorForm /                     ││
│  │           DocumentUpload / ValidationResult              ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Workflow Logic

1. **Load existing data** on page mount via `useDetailData`
2. **Sync starting step** based on `suggestedStartStep` from data composable
3. **Render current step** component based on `currentStep` from navigation composable
4. **Handle component events**:
   - `saved` → Update local state via setter
   - `next` → Advance to next step
   - `back` → Go to previous step
   - `validated` → Store result, go to step 4, update opportunity status
   - `retry` → Clear validation, go back to step 3
   - `close` → Navigate to dashboard

---

## Validation Commands

```bash
# Run Detail page tests
cd MVPScope/frontend && npm run test -- --filter="Detail"

# Run all page tests
cd MVPScope/frontend && npm run test -- --filter="pages"

# Run all frontend tests
cd MVPScope/frontend && npm run test
```

---

## Validation Criteria

- [x] Detail page tests pass
- [x] Page loads data on mount
- [x] Progress indicator shows correct states
- [x] Step transitions work correctly
- [x] Loading state displays correctly
- [x] Error state displays with retry button
- [x] All child component events handled
- [x] Navigation to dashboard works
- [x] URL reflects opportunity ID

---

## Completion Checklist

- [x] Detail.vue created
- [x] All child components integrated
- [x] Event handling working
- [x] All tests passing
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
