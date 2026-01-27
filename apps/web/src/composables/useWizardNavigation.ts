import { computed, watch, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  useOpportunityDraftStore,
  VALID_STEPS,
  type WizardStep,
} from '@/stores/opportunityDraftStore'

export function useWizardNavigation() {
  const router = useRouter()
  const route = useRoute()
  const draftStore = useOpportunityDraftStore()

  const isNavigating = ref(false)

  // Get the current step from URL query param
  const urlStep = computed(() => {
    const stepParam = route.query.step as string | undefined
    if (stepParam && VALID_STEPS.includes(stepParam as WizardStep)) {
      return stepParam as WizardStep
    }
    return null
  })

  // Navigate to a step, updating both store and URL
  async function navigateToStep(step: WizardStep, options: { replace?: boolean } = {}) {
    if (isNavigating.value) return
    isNavigating.value = true

    try {
      // Update URL query param
      await router.push({
        path: '/new-opportunity',
        query: { step },
        replace: options.replace,
      })

      // Store handles its own state via pushStep/setCurrentStep
    } finally {
      isNavigating.value = false
    }
  }

  // Navigate to next step with history
  async function pushStepWithUrl(step: WizardStep) {
    draftStore.pushStep(step)
    await navigateToStep(step)
  }

  // Go back to previous step
  async function goBackWithUrl(): Promise<WizardStep | null> {
    const previousStep = draftStore.goBack()
    if (previousStep) {
      await navigateToStep(previousStep, { replace: true })
    }
    return previousStep
  }

  // Set step directly (used for URL sync)
  async function setStepFromUrl(step: WizardStep) {
    if (draftStore.currentStep !== step) {
      draftStore.setCurrentStep(step)
    }
  }

  // Sync store step with URL on mount
  function syncStepFromUrl() {
    const stepFromUrl = urlStep.value
    if (stepFromUrl && stepFromUrl !== draftStore.currentStep) {
      // If the URL has a valid step, check if it's reachable
      if (isStepReachable(stepFromUrl)) {
        draftStore.setCurrentStep(stepFromUrl)
      } else {
        // Redirect to the current step in store (or deal-type if no progress)
        navigateToStep(draftStore.currentStep, { replace: true })
      }
    } else if (!stepFromUrl && draftStore.currentStep !== 'deal-type') {
      // No step in URL but store has progress, redirect to current step
      navigateToStep(draftStore.currentStep, { replace: true })
    } else if (!stepFromUrl) {
      // No step in URL and no progress, set URL to deal-type
      navigateToStep('deal-type', { replace: true })
    }
  }

  // Check if a step is reachable based on current progress
  function isStepReachable(step: WizardStep): boolean {
    const stepIndex = VALID_STEPS.indexOf(step)
    const currentIndex = VALID_STEPS.indexOf(draftStore.currentStep)

    // Can always go back to earlier steps
    if (stepIndex <= currentIndex) return true

    // Check if prerequisites are met
    switch (step) {
      case 'deal-type':
        return true
      case 'contact':
        return draftStore.tempOpportunityId !== ''
      case 'choice':
        return draftStore.savedContact !== null
      case 'upload-orv':
      case 'manual-entry':
        return draftStore.savedContact !== null
      case 'vendor-decision':
        return (
          draftStore.savedContact !== null &&
          (draftStore.ocrExtraction !== null || draftStore.manualVehicleData !== null)
        )
      case 'vendor-form':
        return draftStore.vendorDecision === 'different'
      default:
        return false
    }
  }

  // Watch for URL changes (browser back/forward)
  watch(
    () => route.query.step,
    (newStep) => {
      if (isNavigating.value) return

      const step = newStep as string | undefined
      if (step && VALID_STEPS.includes(step as WizardStep)) {
        const wizardStep = step as WizardStep
        if (isStepReachable(wizardStep)) {
          setStepFromUrl(wizardStep)
        } else {
          // Redirect to current step if URL step is not reachable
          navigateToStep(draftStore.currentStep, { replace: true })
        }
      } else if (!step && route.path === '/new-opportunity') {
        // No step param, redirect to current step
        navigateToStep(draftStore.currentStep, { replace: true })
      }
    }
  )

  // Handle beforeunload to warn about unsaved data
  let beforeUnloadHandler: ((e: BeforeUnloadEvent) => string | undefined) | null = null

  function setupBeforeUnload() {
    beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (draftStore.hasDraft) {
        const message = 'Máte neuložená data. Opravdu chcete opustit stránku?'
        e.preventDefault()
        e.returnValue = message
        return message
      }
      return undefined
    }
    window.addEventListener('beforeunload', beforeUnloadHandler)
  }

  function cleanupBeforeUnload() {
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      beforeUnloadHandler = null
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    syncStepFromUrl()
    setupBeforeUnload()
  })

  onBeforeUnmount(() => {
    cleanupBeforeUnload()
  })

  return {
    urlStep,
    isNavigating,
    navigateToStep,
    pushStepWithUrl,
    goBackWithUrl,
    setStepFromUrl,
    syncStepFromUrl,
    isStepReachable,
  }
}
