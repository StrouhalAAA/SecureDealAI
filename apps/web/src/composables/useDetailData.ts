import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { supabase } from '@/composables/useSupabase'
import type { BuyingOpportunity, Vehicle, Vendor, ValidationResult, VehicleOCRData, VendorOCRData, OcrExtraction, Contact } from '@/types'

/**
 * Contact comparison result with OCR Majitel/Provozovatel data
 */
export interface ContactOcrComparison {
  matches: boolean
  differences: {
    field: string
    contact: string | null
    ocr: string | null
  }[]
}

export interface UseDetailDataReturn {
  // State
  loading: Ref<boolean>
  error: Ref<string | null>
  opportunity: Ref<BuyingOpportunity | null>
  contact: Ref<Contact | null>
  vehicle: Ref<Vehicle | null>
  vendor: Ref<Vendor | null>
  validationResult: Ref<ValidationResult | null>
  ocrExtractions: Ref<OcrExtraction[]>
  vehicleOCRData: ComputedRef<VehicleOCRData | null>
  vendorOCRData: ComputedRef<VendorOCRData | null>

  // Actions
  loadData: () => Promise<void>
  setContact: (c: Contact) => void
  setVehicle: (v: Vehicle) => void
  setVendor: (v: Vendor) => void
  setValidationResult: (r: ValidationResult) => void
  updateOpportunityStatus: (status: string) => Promise<void>
  clearValidation: () => void

  // Computed
  hasContact: ComputedRef<boolean>
  hasVehicle: ComputedRef<boolean>
  hasVendor: ComputedRef<boolean>
  hasValidation: ComputedRef<boolean>
  suggestedStartStep: ComputedRef<number>
  contactOcrComparison: ComputedRef<ContactOcrComparison | null>
}

export function useDetailData(opportunityId: string): UseDetailDataReturn {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const opportunity = ref<BuyingOpportunity | null>(null)
  const contact = ref<Contact | null>(null)
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

      // Load contact (may not exist)
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('buying_opportunity_id', opportunityId)
        .single()
      contact.value = contactData

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

  function setContact(c: Contact): void {
    contact.value = c
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
  const hasContact = computed(() => contact.value !== null)
  const hasVehicle = computed(() => vehicle.value !== null)
  const hasVendor = computed(() => vendor.value !== null)
  const hasValidation = computed(() => validationResult.value !== null)

  const suggestedStartStep = computed(() => {
    // New flow: Contact -> Vehicle -> Vendor -> Documents -> Validation
    // Steps: 0=Contact, 1=Vehicle, 2=Vendor, 3=Documents, 4=Validation
    if (validationResult.value) return 4
    if (vendor.value) return 3
    if (vehicle.value) return 2
    if (contact.value) return 1
    return 0
  })

  /**
   * Helper function to extract power in kW from maxPower string format "110/3500" or "110 / 3 500"
   * Returns the first number (kW value) or null if parsing fails
   */
  function extractPowerKw(maxPower: string | number | null | undefined): number | null {
    if (maxPower === null || maxPower === undefined) return null
    // If already a number (from VTP), return directly
    if (typeof maxPower === 'number') return maxPower
    // Parse string format like "110/3500" or "110 / 3 500"
    const match = String(maxPower).match(/^(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }

  /**
   * Extract vehicle-related OCR data from completed extractions
   * Merges data from VTP and ORV documents, preferring VTP when both exist
   *
   * IMPORTANT: OCR extracted_data uses English camelCase field names (fuelType, engineCcm, maxPower, seats)
   * but this composable outputs Czech snake_case field names (palivo, objem_motoru, vykon_kw, pocet_mist)
   * to match database column names used in VehicleForm.vue
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
    // Map from OCR schema field names (camelCase) to database column names (Czech snake_case)
    return {
      // OCR field: color → DB column: barva
      barva: (vtpData?.color as string) || (orvData?.color as string) || null,
      // OCR field: fuelType → DB column: palivo
      palivo: (vtpData?.fuelType as string) || (orvData?.fuelType as string) || null,
      // OCR field: engineCcm → DB column: objem_motoru
      objem_motoru: (vtpData?.engineCcm as number) || (orvData?.engineCcm as number) || null,
      // OCR field: seats → DB column: pocet_mist
      pocet_mist: (vtpData?.seats as number) || (orvData?.seats as number) || null,
      // OCR field: maxSpeed → DB column: max_rychlost (not in scope but keeping for completeness)
      max_rychlost: (vtpData?.maxSpeed as number) || (orvData?.maxSpeed as number) || null,
      // OCR field: vehicleType → DB column: kategorie_vozidla
      kategorie_vozidla: (vtpData?.vehicleType as string) || (orvData?.vehicleType as string) || null,
      // OCR field: maxPower (string "110/3500") or maxPowerKw (number) → DB column: vykon_kw
      // VTP uses maxPowerKw (number), ORV uses maxPower (string that needs parsing)
      vykon_kw: extractPowerKw(
        (vtpData?.maxPowerKw as number | undefined) ||
        (vtpData?.maxPower as string | undefined) ||
        (orvData?.maxPower as string | undefined)
      ),
      // VTP-only fields (already use correct field names from VTP schema)
      karoserie: (vtpData?.bodyType as string) || null,
      provozni_hmotnost: (vtpData?.operatingWeight as number) || null,
      povolena_hmotnost: (vtpData?.maxPermittedWeight as number) || null,
      delka: (vtpData?.length as number) || null,
      sirka: (vtpData?.width as number) || null,
      vyska: (vtpData?.height as number) || null,
      rozvor: (vtpData?.wheelbase as number) || null,
      emise_co2: (vtpData?.co2Emissions as string) || null,
      spotreba_paliva: (vtpData?.fuelConsumption as string) || null,
      emisni_norma: (vtpData?.emissionStandard as string) || null,
      stk_platnost: (vtpData?.nextInspectionDue as string) || null,
    }
  })

  /**
   * Extract vendor-related OCR data from completed extractions
   * Uses ORV for keeper info and VTP for owner IČO as fallback
   *
   * Maps from OCR schema field names to database-aligned field names
   */
  const vendorOCRData = computed<VendorOCRData | null>(() => {
    if (ocrExtractions.value.length === 0) return null

    // Find ORV and VTP extractions
    const orv = ocrExtractions.value.find(e => e.document_type === 'ORV')
    const vtp = ocrExtractions.value.find(e => e.document_type === 'VTP')

    // Get extracted data objects
    const orvData = orv?.extracted_data as Record<string, unknown> | null
    const vtpData = vtp?.extracted_data as Record<string, unknown> | null

    if (!orvData && !vtpData) return null

    // Prefer ORV keeper data, fallback to VTP owner for IČO
    // Use parsed name if available (without ICO suffix), fallback to raw keeperName
    return {
      vendor_type: (orvData?.keeperVendorType as 'PHYSICAL_PERSON' | 'COMPANY') || 'PHYSICAL_PERSON',
      personal_id: (orvData?.keeperPersonalId as string) || null,
      company_id: (orvData?.keeperCompanyId as string) || (vtpData?.ownerIco as string) || null,
      name: (orvData?.keeperParsedName as string) || (orvData?.keeperName as string) || (vtpData?.ownerName as string) || null,
      address: (orvData?.keeperAddress as string) || (vtpData?.ownerAddress as string) || null,
      identifier_valid: (orvData?.keeperIdentifierValid as boolean) || false,
    }
  })

  /**
   * Compare contact data with OCR Majitel/Provozovatel data
   * Used to warn user when contact differs from document owner/keeper
   */
  const contactOcrComparison = computed<ContactOcrComparison | null>(() => {
    if (!contact.value || !vendorOCRData.value) return null

    const differences: ContactOcrComparison['differences'] = []

    // Helper to normalize strings for comparison (uppercase, remove diacritics, trim)
    const normalize = (str: string | null | undefined): string => {
      if (!str) return ''
      return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    }

    // Get contact name based on type
    let contactName: string | null = null
    if (contact.value.contact_type === 'PHYSICAL_PERSON') {
      contactName = `${contact.value.first_name || ''} ${contact.value.last_name || ''}`.trim()
    } else {
      contactName = contact.value.company_name
    }

    // Get contact identifier based on type
    let contactIdentifier: string | null = null
    if (contact.value.contact_type === 'PHYSICAL_PERSON') {
      contactIdentifier = contact.value.personal_id
    } else {
      contactIdentifier = contact.value.company_id
    }

    // Compare name
    const ocrName = vendorOCRData.value.name
    if (normalize(contactName) !== normalize(ocrName)) {
      differences.push({
        field: 'Jmeno/Nazev',
        contact: contactName,
        ocr: ocrName,
      })
    }

    // Compare identifier (IČO or RČ)
    const ocrIdentifier = vendorOCRData.value.vendor_type === 'PHYSICAL_PERSON'
      ? vendorOCRData.value.personal_id
      : vendorOCRData.value.company_id
    if (normalize(contactIdentifier) !== normalize(ocrIdentifier)) {
      differences.push({
        field: vendorOCRData.value.vendor_type === 'PHYSICAL_PERSON' ? 'Rodne cislo' : 'ICO',
        contact: contactIdentifier,
        ocr: ocrIdentifier,
      })
    }

    return {
      matches: differences.length === 0,
      differences,
    }
  })

  return {
    loading,
    error,
    opportunity,
    contact,
    vehicle,
    vendor,
    validationResult,
    ocrExtractions,
    vehicleOCRData,
    vendorOCRData,
    loadData,
    setContact,
    setVehicle,
    setVendor,
    setValidationResult,
    updateOpportunityStatus,
    clearValidation,
    hasContact,
    hasVehicle,
    hasVendor,
    hasValidation,
    suggestedStartStep,
    contactOcrComparison,
  }
}
