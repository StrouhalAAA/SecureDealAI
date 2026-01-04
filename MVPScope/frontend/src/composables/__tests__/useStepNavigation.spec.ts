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
