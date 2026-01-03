# Task 3.9a: Step Orchestration & Navigation

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: 3.1 Vue.js Setup
> **Estimated Effort**: Low
> **Parent Task**: 3.9 Detail Page

---

## Objective

Create the step orchestration logic and StepIndicator component for the 4-step validation workflow. This sub-task focuses purely on navigation state management without data loading concerns.

---

## Why This Sub-Task Exists

The Detail Page (3.9) was split into focused sub-tasks to:
- Reduce complexity per implementation unit
- Enable parallel development
- Isolate testable concerns
- Reduce risk of integration failures

---

## Component Tests

### Required Tests (Write Before Implementation)

Create test file: `MVPScope/frontend/src/composables/__tests__/useStepNavigation.spec.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { useStepNavigation } from '../useStepNavigation'

describe('useStepNavigation', () => {
  const steps = [
    { label: 'Vozidlo' },
    { label: 'Dodavatel' },
    { label: 'Dokumenty' },
    { label: 'Validace' },
  ]

  describe('initialization', () => {
    it('starts at step 0 by default', () => {
      const { currentStep } = useStepNavigation(steps)
      expect(currentStep.value).toBe(0)
    })

    it('can start at a specific step', () => {
      const { currentStep } = useStepNavigation(steps, { initialStep: 2 })
      expect(currentStep.value).toBe(2)
    })

    it('clamps initial step to valid range', () => {
      const { currentStep } = useStepNavigation(steps, { initialStep: 10 })
      expect(currentStep.value).toBe(3) // Last valid step
    })
  })

  describe('navigation', () => {
    it('nextStep advances to next step', () => {
      const { currentStep, nextStep } = useStepNavigation(steps)
      expect(currentStep.value).toBe(0)

      nextStep()
      expect(currentStep.value).toBe(1)
    })

    it('nextStep does not exceed last step', () => {
      const { currentStep, nextStep } = useStepNavigation(steps, { initialStep: 3 })

      nextStep()
      expect(currentStep.value).toBe(3) // Still at last step
    })

    it('prevStep goes back to previous step', () => {
      const { currentStep, prevStep } = useStepNavigation(steps, { initialStep: 2 })

      prevStep()
      expect(currentStep.value).toBe(1)
    })

    it('prevStep does not go below 0', () => {
      const { currentStep, prevStep } = useStepNavigation(steps)

      prevStep()
      expect(currentStep.value).toBe(0) // Still at first step
    })

    it('goToStep navigates to specific step', () => {
      const { currentStep, goToStep } = useStepNavigation(steps)

      goToStep(2)
      expect(currentStep.value).toBe(2)
    })

    it('goToStep clamps to valid range', () => {
      const { currentStep, goToStep } = useStepNavigation(steps)

      goToStep(-1)
      expect(currentStep.value).toBe(0)

      goToStep(100)
      expect(currentStep.value).toBe(3)
    })
  })

  describe('computed properties', () => {
    it('isFirstStep returns true on step 0', () => {
      const { isFirstStep } = useStepNavigation(steps)
      expect(isFirstStep.value).toBe(true)
    })

    it('isLastStep returns true on last step', () => {
      const { isLastStep } = useStepNavigation(steps, { initialStep: 3 })
      expect(isLastStep.value).toBe(true)
    })

    it('canGoNext returns false on last step', () => {
      const { canGoNext } = useStepNavigation(steps, { initialStep: 3 })
      expect(canGoNext.value).toBe(false)
    })

    it('canGoBack returns false on first step', () => {
      const { canGoBack } = useStepNavigation(steps)
      expect(canGoBack.value).toBe(false)
    })

    it('currentStepConfig returns correct step config', () => {
      const { currentStepConfig, goToStep } = useStepNavigation(steps)

      expect(currentStepConfig.value.label).toBe('Vozidlo')

      goToStep(2)
      expect(currentStepConfig.value.label).toBe('Dokumenty')
    })

    it('stepStates returns correct state for each step', () => {
      const { stepStates, goToStep } = useStepNavigation(steps)

      goToStep(2) // Current step is 2

      expect(stepStates.value[0]).toEqual({ completed: true, active: false })
      expect(stepStates.value[1]).toEqual({ completed: true, active: false })
      expect(stepStates.value[2]).toEqual({ completed: false, active: true })
      expect(stepStates.value[3]).toEqual({ completed: false, active: false })
    })
  })

  describe('events', () => {
    it('emits stepChange when step changes', () => {
      const events: number[] = []
      const { nextStep } = useStepNavigation(steps, {
        onStepChange: (step) => events.push(step)
      })

      nextStep()
      nextStep()

      expect(events).toEqual([1, 2])
    })
  })
})
```

Create test file: `MVPScope/frontend/src/components/shared/__tests__/StepIndicator.spec.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StepIndicator from '../StepIndicator.vue'

describe('StepIndicator', () => {
  const defaultProps = {
    step: 1,
    label: 'Vozidlo',
    active: false,
    completed: false,
    isLast: false
  }

  it('shows checkmark when step is completed', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, completed: true }
    })

    expect(wrapper.text()).toContain('✓')
  })

  it('shows step number when not completed', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, step: 2 }
    })

    expect(wrapper.text()).toContain('2')
  })

  it('applies completed styling', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, completed: true }
    })

    const circle = wrapper.find('div > div')
    expect(circle.classes()).toContain('bg-green-500')
    expect(circle.classes()).toContain('text-white')
  })

  it('applies active styling', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, active: true }
    })

    const circle = wrapper.find('div > div')
    expect(circle.classes()).toContain('bg-blue-500')
    expect(circle.classes()).toContain('text-white')
  })

  it('applies inactive styling', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps }
    })

    const circle = wrapper.find('div > div')
    expect(circle.classes()).toContain('bg-gray-200')
    expect(circle.classes()).toContain('text-gray-500')
  })

  it('displays step label', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, label: 'Dodavatel' }
    })

    expect(wrapper.text()).toContain('Dodavatel')
  })

  it('shows connector line when not last step', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, isLast: false }
    })

    expect(wrapper.find('.h-1').exists()).toBe(true)
  })

  it('hides connector line on last step', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, isLast: true }
    })

    expect(wrapper.find('.h-1').exists()).toBe(false)
  })

  it('shows completed line color when step is completed', () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, completed: true, isLast: false }
    })

    const line = wrapper.find('.h-1')
    expect(line.classes()).toContain('bg-green-500')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(StepIndicator, {
      props: { ...defaultProps, clickable: true }
    })

    await wrapper.find('div').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

### Test-First Workflow

1. **RED**: Write tests above, run `npm run test -- --filter="StepIndicator|useStepNavigation"` - they should FAIL
2. **GREEN**: Implement composable and component until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

---

## Implementation

### Step Navigation Composable

**src/composables/useStepNavigation.ts**:
```typescript
import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface StepConfig {
  label: string
  icon?: string
  disabled?: boolean
}

export interface StepState {
  completed: boolean
  active: boolean
}

export interface UseStepNavigationOptions {
  initialStep?: number
  onStepChange?: (step: number) => void
}

export interface UseStepNavigationReturn {
  currentStep: Ref<number>
  steps: StepConfig[]

  // Navigation
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void

  // Computed
  isFirstStep: ComputedRef<boolean>
  isLastStep: ComputedRef<boolean>
  canGoNext: ComputedRef<boolean>
  canGoBack: ComputedRef<boolean>
  currentStepConfig: ComputedRef<StepConfig>
  stepStates: ComputedRef<StepState[]>
}

export function useStepNavigation(
  steps: StepConfig[],
  options: UseStepNavigationOptions = {}
): UseStepNavigationReturn {
  const { initialStep = 0, onStepChange } = options

  // Clamp initial step to valid range
  const clampedInitial = Math.max(0, Math.min(initialStep, steps.length - 1))
  const currentStep = ref(clampedInitial)

  // Navigation functions
  function goToStep(step: number) {
    const clamped = Math.max(0, Math.min(step, steps.length - 1))
    if (clamped !== currentStep.value) {
      currentStep.value = clamped
      onStepChange?.(clamped)
    }
  }

  function nextStep() {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++
      onStepChange?.(currentStep.value)
    }
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--
      onStepChange?.(currentStep.value)
    }
  }

  // Computed properties
  const isFirstStep = computed(() => currentStep.value === 0)
  const isLastStep = computed(() => currentStep.value === steps.length - 1)
  const canGoNext = computed(() => currentStep.value < steps.length - 1)
  const canGoBack = computed(() => currentStep.value > 0)

  const currentStepConfig = computed(() => steps[currentStep.value])

  const stepStates = computed<StepState[]>(() =>
    steps.map((_, index) => ({
      completed: index < currentStep.value,
      active: index === currentStep.value,
    }))
  )

  return {
    currentStep,
    steps,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoBack,
    currentStepConfig,
    stepStates,
  }
}
```

### StepIndicator Component

**src/components/shared/StepIndicator.vue**:
```vue
<template>
  <div
    class="flex items-center"
    :class="{ 'flex-1': !isLast, 'cursor-pointer': clickable }"
    @click="handleClick"
  >
    <!-- Circle -->
    <div
      :class="circleClass"
      class="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors"
    >
      <span v-if="completed">✓</span>
      <span v-else>{{ step }}</span>
    </div>

    <!-- Label -->
    <div class="ml-2 text-sm transition-colors" :class="labelClass">
      {{ label }}
    </div>

    <!-- Connector Line -->
    <div
      v-if="!isLast"
      class="flex-1 h-1 mx-4 transition-colors"
      :class="lineClass"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  step: number
  label: string
  active?: boolean
  completed?: boolean
  isLast?: boolean
  clickable?: boolean
}>(), {
  active: false,
  completed: false,
  isLast: false,
  clickable: false,
})

const emit = defineEmits<{
  click: []
}>()

const circleClass = computed(() => {
  if (props.completed) return 'bg-green-500 text-white'
  if (props.active) return 'bg-blue-500 text-white'
  return 'bg-gray-200 text-gray-500'
})

const labelClass = computed(() => {
  if (props.completed || props.active) return 'text-gray-900 font-medium'
  return 'text-gray-400'
})

const lineClass = computed(() => {
  if (props.completed) return 'bg-green-500'
  return 'bg-gray-200'
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>
```

### StepProgress Component (wrapper)

**src/components/shared/StepProgress.vue**:
```vue
<template>
  <div class="flex items-center justify-between">
    <StepIndicator
      v-for="(step, index) in steps"
      :key="index"
      :step="index + 1"
      :label="step.label"
      :active="stepStates[index].active"
      :completed="stepStates[index].completed"
      :is-last="index === steps.length - 1"
      :clickable="allowJump && stepStates[index].completed"
      @click="$emit('stepClick', index)"
    />
  </div>
</template>

<script setup lang="ts">
import StepIndicator from './StepIndicator.vue'
import type { StepConfig, StepState } from '@/composables/useStepNavigation'

defineProps<{
  steps: StepConfig[]
  stepStates: StepState[]
  allowJump?: boolean
}>()

defineEmits<{
  stepClick: [index: number]
}>()
</script>
```

---

## Step Definitions

The validation workflow has 4 steps:

| Step | Index | Label | Component |
|------|-------|-------|-----------|
| 1 | 0 | Vozidlo | VehicleForm |
| 2 | 1 | Dodavatel | VendorForm |
| 3 | 2 | Dokumenty | DocumentUpload |
| 4 | 3 | Validace | ValidationResult |

---

## Validation Commands

```bash
# Run step navigation tests
cd MVPScope/frontend && npm run test -- --filter="useStepNavigation"

# Run StepIndicator component tests
cd MVPScope/frontend && npm run test -- --filter="StepIndicator"

# Run all tests
cd MVPScope/frontend && npm run test
```

---

## Validation Criteria

- [x] useStepNavigation composable tests pass
- [x] StepIndicator component tests pass
- [x] Navigation between steps works (next/prev/goTo)
- [x] Step states (active/completed) update correctly
- [x] Boundary conditions handled (first/last step)
- [x] Events emitted on step change

---

## Completion Checklist

- [x] useStepNavigation.ts created
- [x] StepIndicator.vue created
- [x] StepProgress.vue created
- [x] All tests passing
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
