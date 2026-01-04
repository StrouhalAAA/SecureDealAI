import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type { BuyingOpportunity, Vehicle, Vendor, ValidationResult } from '@/types'

export interface UseDetailDataReturn {
  // State
  loading: Ref<boolean>
  error: Ref<string | null>
  opportunity: Ref<BuyingOpportunity | null>
  vehicle: Ref<Vehicle | null>
  vendor: Ref<Vendor | null>
  validationResult: Ref<ValidationResult | null>

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

  return {
    loading,
    error,
    opportunity,
    vehicle,
    vendor,
    validationResult,
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
