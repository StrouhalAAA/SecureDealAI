import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type { BuyingOpportunity, Vehicle, Vendor, ValidationResult, VehicleOCRData, OcrExtraction } from '@/types'

export interface UseDetailDataReturn {
  // State
  loading: Ref<boolean>
  error: Ref<string | null>
  opportunity: Ref<BuyingOpportunity | null>
  vehicle: Ref<Vehicle | null>
  vendor: Ref<Vendor | null>
  validationResult: Ref<ValidationResult | null>
  ocrExtractions: Ref<OcrExtraction[]>
  vehicleOCRData: ComputedRef<VehicleOCRData | null>

  // Actions
  loadData: () => Promise<void>
  setVehicle: (v: Vehicle) => void
  setVendor: (v: Vendor) => void
  setValidationResult: (r: ValidationResult) => void
  updateOpportunityStatus: (status: string) => Promise<void>
  clearValidation: () => void

  // Computed
  hasVehicle: ComputedRef<boolean>
  hasVendor: ComputedRef<boolean>
  hasValidation: ComputedRef<boolean>
  suggestedStartStep: ComputedRef<number>
}

export function useDetailData(opportunityId: string): UseDetailDataReturn {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const opportunity = ref<BuyingOpportunity | null>(null)
  const vehicle = ref<Vehicle | null>(null)
  const vendor = ref<Vendor | null>(null)
  const validationResult = ref<ValidationResult | null>(null)
  const ocrExtractions = ref<OcrExtraction[]>([])

  async function loadData(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Load buying opportunity
      const { data: oppData, error: oppError } = await supabase
        .from('buying_opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single()

      if (oppError) throw oppError
      opportunity.value = oppData

      // Load vehicle (may not exist)
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('buying_opportunity_id', opportunityId)
        .single()
      vehicle.value = vehicleData

      // Load vendor (may not exist)
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('buying_opportunity_id', opportunityId)
        .single()
      vendor.value = vendorData

      // Load latest validation result (may not exist)
      const { data: validationData } = await supabase
        .from('validation_results')
        .select('*')
        .eq('buying_opportunity_id', opportunityId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .single()
      validationResult.value = validationData

      // Load OCR extractions for vehicle data (Phase 7.2 & 7.3)
      if (oppData?.spz) {
        const { data: ocrData } = await supabase
          .from('ocr_extractions')
          .select('*')
          .eq('spz', oppData.spz)
          .eq('ocr_status', 'COMPLETED')
          .in('document_type', ['VTP', 'ORV'])
        ocrExtractions.value = ocrData || []
      }

    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Chyba pri nacitani'
    } finally {
      loading.value = false
    }
  }

  function setVehicle(v: Vehicle): void {
    vehicle.value = v
  }

  function setVendor(v: Vendor): void {
    vendor.value = v
  }

  function setValidationResult(r: ValidationResult): void {
    validationResult.value = r
  }

  function clearValidation(): void {
    validationResult.value = null
  }

  async function updateOpportunityStatus(validationStatus: string): Promise<void> {
    const statusMap: Record<string, string> = {
      GREEN: 'VALIDATED',
      ORANGE: 'PENDING',
      RED: 'REJECTED',
    }

    await supabase
      .from('buying_opportunities')
      .update({ status: statusMap[validationStatus] || 'PENDING' })
      .eq('id', opportunityId)
  }

  // Computed properties
  const hasVehicle = computed(() => vehicle.value !== null)
  const hasVendor = computed(() => vendor.value !== null)
  const hasValidation = computed(() => validationResult.value !== null)

  const suggestedStartStep = computed(() => {
    if (validationResult.value) return 3
    if (vendor.value) return 2
    if (vehicle.value) return 1
    return 0
  })

  /**
   * Extract vehicle-related OCR data from completed extractions
   * Merges data from VTP and ORV documents, preferring VTP when both exist
   */
  const vehicleOCRData = computed<VehicleOCRData | null>(() => {
    if (ocrExtractions.value.length === 0) return null

    // Find VTP and ORV extractions
    const vtp = ocrExtractions.value.find(e => e.document_type === 'VTP')
    const orv = ocrExtractions.value.find(e => e.document_type === 'ORV')

    // Get extracted data objects
    const vtpData = vtp?.extracted_data as Record<string, unknown> | null
    const orvData = orv?.extracted_data as Record<string, unknown> | null

    if (!vtpData && !orvData) return null

    // Merge data, preferring VTP values when both exist
    return {
      barva: (vtpData?.barva as string) || (orvData?.barva as string) || null,
      palivo: (vtpData?.palivo as string) || (orvData?.palivo as string) || null,
      objem_motoru: (vtpData?.objem_motoru as number) || (orvData?.objem_motoru as number) || null,
      pocet_mist: (vtpData?.pocet_mist as number) || (orvData?.pocet_mist as number) || null,
      max_rychlost: (vtpData?.max_rychlost as number) || (orvData?.max_rychlost as number) || null,
      kategorie_vozidla: (vtpData?.kategorie_vozidla as string) || (orvData?.kategorie_vozidla as string) || null,
      vykon_kw: (vtpData?.vykon_kw as number) || (orvData?.vykon_kw as number) || null,
      karoserie: (vtpData?.karoserie as string) || null,
      provozni_hmotnost: (vtpData?.provozni_hmotnost as number) || null,
      povolena_hmotnost: (vtpData?.povolena_hmotnost as number) || null,
      delka: (vtpData?.delka as number) || null,
      sirka: (vtpData?.sirka as number) || null,
      vyska: (vtpData?.vyska as number) || null,
      rozvor: (vtpData?.rozvor as number) || null,
      emise_co2: (vtpData?.emise_co2 as string) || null,
      spotreba_paliva: (vtpData?.spotreba_paliva as string) || null,
      emisni_norma: (vtpData?.emisni_norma as string) || null,
      stk_platnost: (vtpData?.stk_platnost as string) || null,
    }
  })

  return {
    loading,
    error,
    opportunity,
    vehicle,
    vendor,
    validationResult,
    ocrExtractions,
    vehicleOCRData,
    loadData,
    setVehicle,
    setVendor,
    setValidationResult,
    updateOpportunityStatus,
    clearValidation,
    hasVehicle,
    hasVendor,
    hasValidation,
    suggestedStartStep,
  }
}
