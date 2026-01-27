import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Contact, OcrExtraction, ContactFormState } from '@/types'

const STORAGE_KEY = 'securedealai_opportunity_draft'
const DRAFT_EXPIRY_HOURS = 24

export type WizardStep =
  | 'deal-type'
  | 'contact'
  | 'choice'
  | 'upload-orv'
  | 'manual-entry'
  | 'vendor-decision'
  | 'vendor-form'

export const VALID_STEPS: WizardStep[] = [
  'deal-type',
  'contact',
  'choice',
  'upload-orv',
  'manual-entry',
  'vendor-decision',
  'vendor-form',
]

export interface ManualVehicleData {
  spz: string
  vin: string
  znacka: string
  model: string
  majitel: string
}

export interface UploadedFileMetadata {
  name: string
  size: number
  type: string
  uploadedAt: string
}

export interface OpportunityDraftState {
  // Step tracking
  currentStep: WizardStep
  stepHistory: WizardStep[]

  // Deal type
  buyingType: 'BRANCH' | 'MOBILE_BUYING'

  // Opportunity IDs
  tempOpportunityId: string
  createdOpportunityId: string | null

  // Contact data
  savedContact: Contact | null
  contactFormData: Partial<ContactFormState> | null

  // Vehicle choice
  entryMethod: 'upload' | 'manual'

  // Upload/OCR state
  spz: string
  ocrExtraction: OcrExtraction | null
  uploadedFileMetadata: UploadedFileMetadata | null

  // Manual entry state
  manualVehicleData: ManualVehicleData | null

  // Vendor decision
  vendorDecision: 'same' | 'different' | null

  // Metadata
  createdAt: string
  updatedAt: string
}

function getInitialState(): OpportunityDraftState {
  return {
    currentStep: 'deal-type',
    stepHistory: [],
    buyingType: 'BRANCH',
    tempOpportunityId: '',
    createdOpportunityId: null,
    savedContact: null,
    contactFormData: null,
    entryMethod: 'upload',
    spz: '',
    ocrExtraction: null,
    uploadedFileMetadata: null,
    manualVehicleData: null,
    vendorDecision: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function isValidDraft(data: unknown): data is OpportunityDraftState {
  if (!data || typeof data !== 'object') return false
  const draft = data as Record<string, unknown>

  // Check required fields
  if (typeof draft.currentStep !== 'string') return false
  if (!Array.isArray(draft.stepHistory)) return false
  if (typeof draft.createdAt !== 'string') return false

  // Check expiry
  const createdAt = new Date(draft.createdAt as string)
  const expiryTime = createdAt.getTime() + DRAFT_EXPIRY_HOURS * 60 * 60 * 1000
  if (Date.now() > expiryTime) return false

  return true
}

export const useOpportunityDraftStore = defineStore('opportunityDraft', () => {
  // State
  const state = ref<OpportunityDraftState>(getInitialState())

  // Computed getters for easy access
  const currentStep = computed(() => state.value.currentStep)
  const stepHistory = computed(() => state.value.stepHistory)
  const buyingType = computed(() => state.value.buyingType)
  const tempOpportunityId = computed(() => state.value.tempOpportunityId)
  const createdOpportunityId = computed(() => state.value.createdOpportunityId)
  const savedContact = computed(() => state.value.savedContact)
  const contactFormData = computed(() => state.value.contactFormData)
  const entryMethod = computed(() => state.value.entryMethod)
  const spz = computed(() => state.value.spz)
  const ocrExtraction = computed(() => state.value.ocrExtraction)
  const uploadedFileMetadata = computed(() => state.value.uploadedFileMetadata)
  const manualVehicleData = computed(() => state.value.manualVehicleData)
  const vendorDecision = computed(() => state.value.vendorDecision)

  const hasDraft = computed(() => {
    // Draft exists if we've moved past the first step or have any data
    return (
      state.value.stepHistory.length > 0 ||
      state.value.currentStep !== 'deal-type' ||
      state.value.savedContact !== null ||
      state.value.ocrExtraction !== null ||
      state.value.manualVehicleData !== null
    )
  })

  const canGoBack = computed(() => state.value.stepHistory.length > 0)

  // Actions
  function setCurrentStep(step: WizardStep) {
    state.value.currentStep = step
    state.value.updatedAt = new Date().toISOString()
  }

  function pushStep(step: WizardStep) {
    state.value.stepHistory.push(state.value.currentStep)
    state.value.currentStep = step
    state.value.updatedAt = new Date().toISOString()
  }

  function goBack(): WizardStep | null {
    if (state.value.stepHistory.length === 0) return null

    const previousStep = state.value.stepHistory.pop()!
    state.value.currentStep = previousStep
    state.value.updatedAt = new Date().toISOString()

    // Reset step-specific data when going back
    if (previousStep === 'choice') {
      state.value.ocrExtraction = null
      state.value.uploadedFileMetadata = null
      state.value.spz = ''
      state.value.manualVehicleData = null
    }
    if (previousStep === 'vendor-decision') {
      state.value.vendorDecision = null
    }

    return previousStep
  }

  function setBuyingType(type: 'BRANCH' | 'MOBILE_BUYING') {
    state.value.buyingType = type
    state.value.updatedAt = new Date().toISOString()
  }

  function setOpportunityIds(tempId: string, createdId: string | null = null) {
    state.value.tempOpportunityId = tempId
    state.value.createdOpportunityId = createdId
    state.value.updatedAt = new Date().toISOString()
  }

  function setContactData(contact: Contact | null, formData?: Partial<ContactFormState>) {
    state.value.savedContact = contact
    if (formData) {
      state.value.contactFormData = formData
    }
    if (contact) {
      state.value.createdOpportunityId = contact.buying_opportunity_id
    }
    state.value.updatedAt = new Date().toISOString()
  }

  function setContactFormData(formData: Partial<ContactFormState>) {
    state.value.contactFormData = formData
    state.value.updatedAt = new Date().toISOString()
  }

  function setEntryMethod(method: 'upload' | 'manual') {
    state.value.entryMethod = method
    state.value.updatedAt = new Date().toISOString()
  }

  function setSpz(value: string) {
    state.value.spz = value
    state.value.updatedAt = new Date().toISOString()
  }

  function setOcrExtraction(extraction: OcrExtraction | null) {
    state.value.ocrExtraction = extraction
    state.value.updatedAt = new Date().toISOString()
  }

  function setUploadedFileMetadata(file: File | null) {
    if (file) {
      state.value.uploadedFileMetadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      }
    } else {
      state.value.uploadedFileMetadata = null
    }
    state.value.updatedAt = new Date().toISOString()
  }

  function setManualVehicleData(data: ManualVehicleData | null) {
    state.value.manualVehicleData = data
    state.value.updatedAt = new Date().toISOString()
  }

  function setVendorDecision(decision: 'same' | 'different' | null) {
    state.value.vendorDecision = decision
    state.value.updatedAt = new Date().toISOString()
  }

  function clearDraft() {
    state.value = getInitialState()
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // sessionStorage not available
    }
  }

  function saveToStorage() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch {
      // sessionStorage not available or full
    }
  }

  function loadFromStorage(): boolean {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return false

      const parsed = JSON.parse(stored)
      if (!isValidDraft(parsed)) {
        sessionStorage.removeItem(STORAGE_KEY)
        return false
      }

      state.value = parsed
      return true
    } catch {
      return false
    }
  }

  function hasStoredDraft(): boolean {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return false

      const parsed = JSON.parse(stored)
      return isValidDraft(parsed)
    } catch {
      return false
    }
  }

  // Auto-save to sessionStorage on state changes
  watch(
    state,
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  return {
    // State (as computed for reactivity)
    currentStep,
    stepHistory,
    buyingType,
    tempOpportunityId,
    createdOpportunityId,
    savedContact,
    contactFormData,
    entryMethod,
    spz,
    ocrExtraction,
    uploadedFileMetadata,
    manualVehicleData,
    vendorDecision,

    // Computed
    hasDraft,
    canGoBack,

    // Actions
    setCurrentStep,
    pushStep,
    goBack,
    setBuyingType,
    setOpportunityIds,
    setContactData,
    setContactFormData,
    setEntryMethod,
    setSpz,
    setOcrExtraction,
    setUploadedFileMetadata,
    setManualVehicleData,
    setVendorDecision,
    clearDraft,
    saveToStorage,
    loadFromStorage,
    hasStoredDraft,
  }
})
