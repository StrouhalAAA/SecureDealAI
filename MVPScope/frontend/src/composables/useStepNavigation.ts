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
