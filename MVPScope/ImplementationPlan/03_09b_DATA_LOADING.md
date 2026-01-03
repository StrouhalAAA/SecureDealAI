# Task 3.9b: Data Loading & State Management

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented (2026-01-04)
> **Priority**: High
> **Depends On**: 3.1 Vue.js Setup
> **Estimated Effort**: Low
> **Parent Task**: 3.9 Detail Page

---

## Objective

Create the data loading composable for the Detail page that handles fetching buying opportunity, vehicle, vendor, and validation data from Supabase with proper loading states and error handling.

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

Create test file: `MVPScope/frontend/src/composables/__tests__/useDetailData.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDetailData } from '../useDetailData'
import { flushPromises } from '@vue/test-utils'

// Mock Supabase
const mockSupabase = {
  from: vi.fn()
}

vi.mock('@/composables/useSupabase', () => ({
  supabase: mockSupabase
}))

describe('useDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockQuery = (data: any, error: any = null) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data, error })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data, error }))
          }))
        }))
      }))
    }))
  })

  describe('initial state', () => {
    it('starts with loading false', () => {
      const { loading } = useDetailData('123')
      expect(loading.value).toBe(false)
    })

    it('starts with null data', () => {
      const { opportunity, vehicle, vendor, validationResult } = useDetailData('123')
      expect(opportunity.value).toBeNull()
      expect(vehicle.value).toBeNull()
      expect(vendor.value).toBeNull()
      expect(validationResult.value).toBeNull()
    })

    it('starts with no error', () => {
      const { error } = useDetailData('123')
      expect(error.value).toBeNull()
    })
  })

  describe('loadData', () => {
    it('sets loading true while fetching', async () => {
      mockSupabase.from.mockImplementation(() => createMockQuery(null))

      const { loading, loadData } = useDetailData('123')

      const promise = loadData()
      expect(loading.value).toBe(true)

      await promise
      expect(loading.value).toBe(false)
    })

    it('loads buying opportunity data', async () => {
      const oppData = { id: '123', spz: '5L94454', status: 'DRAFT' }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery(oppData)
        }
        return createMockQuery(null)
      })

      const { opportunity, loadData } = useDetailData('123')
      await loadData()

      expect(opportunity.value).toEqual(oppData)
    })

    it('loads vehicle data', async () => {
      const vehicleData = { id: 'v1', vin: 'YV1PZA3TCL1103985' }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'vehicles') {
          return createMockQuery(vehicleData)
        }
        return createMockQuery(null)
      })

      const { vehicle, loadData } = useDetailData('123')
      await loadData()

      expect(vehicle.value).toEqual(vehicleData)
    })

    it('loads vendor data', async () => {
      const vendorData = { id: 'vnd1', name: 'OSIT S.R.O.', ico: '12345678' }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'vendors') {
          return createMockQuery(vendorData)
        }
        return createMockQuery(null)
      })

      const { vendor, loadData } = useDetailData('123')
      await loadData()

      expect(vendor.value).toEqual(vendorData)
    })

    it('loads latest validation result', async () => {
      const validationData = {
        id: 'vr1',
        overall_status: 'GREEN',
        attempt_number: 2
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'validation_results') {
          return createMockQuery(validationData)
        }
        return createMockQuery(null)
      })

      const { validationResult, loadData } = useDetailData('123')
      await loadData()

      expect(validationResult.value).toEqual(validationData)
    })

    it('sets error when opportunity fetch fails', async () => {
      mockSupabase.from.mockImplementation(() =>
        createMockQuery(null, new Error('Network error'))
      )

      const { error, loadData } = useDetailData('123')
      await loadData()

      expect(error.value).toBe('Network error')
    })

    it('clears error on successful reload', async () => {
      // First call fails
      mockSupabase.from.mockImplementation(() =>
        createMockQuery(null, new Error('Network error'))
      )

      const { error, loadData } = useDetailData('123')
      await loadData()
      expect(error.value).toBe('Network error')

      // Second call succeeds
      mockSupabase.from.mockImplementation(() =>
        createMockQuery({ id: '123', spz: '5L94454' })
      )
      await loadData()
      expect(error.value).toBeNull()
    })
  })

  describe('data setters', () => {
    it('setVehicle updates vehicle ref', () => {
      const { vehicle, setVehicle } = useDetailData('123')
      const vehicleData = { id: 'v1', vin: 'ABC123' }

      setVehicle(vehicleData as any)
      expect(vehicle.value).toEqual(vehicleData)
    })

    it('setVendor updates vendor ref', () => {
      const { vendor, setVendor } = useDetailData('123')
      const vendorData = { id: 'vnd1', name: 'Test Co' }

      setVendor(vendorData as any)
      expect(vendor.value).toEqual(vendorData)
    })

    it('setValidationResult updates validationResult ref', () => {
      const { validationResult, setValidationResult } = useDetailData('123')
      const result = { id: 'vr1', overall_status: 'GREEN' }

      setValidationResult(result as any)
      expect(validationResult.value).toEqual(result)
    })
  })

  describe('updateOpportunityStatus', () => {
    it('updates status to VALIDATED for GREEN result', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return {
            ...createMockQuery({ id: '123', spz: '5L94454' }),
            update: updateMock
          }
        }
        return createMockQuery(null)
      })

      const { updateOpportunityStatus } = useDetailData('123')
      await updateOpportunityStatus('GREEN')

      expect(updateMock).toHaveBeenCalledWith({ status: 'VALIDATED' })
    })

    it('updates status to PENDING for ORANGE result', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))

      mockSupabase.from.mockImplementation((table: string) => ({
        ...createMockQuery(null),
        update: updateMock
      }))

      const { updateOpportunityStatus } = useDetailData('123')
      await updateOpportunityStatus('ORANGE')

      expect(updateMock).toHaveBeenCalledWith({ status: 'PENDING' })
    })

    it('updates status to REJECTED for RED result', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))

      mockSupabase.from.mockImplementation((table: string) => ({
        ...createMockQuery(null),
        update: updateMock
      }))

      const { updateOpportunityStatus } = useDetailData('123')
      await updateOpportunityStatus('RED')

      expect(updateMock).toHaveBeenCalledWith({ status: 'REJECTED' })
    })
  })

  describe('computed properties', () => {
    it('hasVehicle returns true when vehicle exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'vehicles') {
          return createMockQuery({ id: 'v1', vin: 'ABC123' })
        }
        return createMockQuery(null)
      })

      const { hasVehicle, loadData } = useDetailData('123')
      await loadData()

      expect(hasVehicle.value).toBe(true)
    })

    it('hasVendor returns true when vendor exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'vendors') {
          return createMockQuery({ id: 'vnd1', name: 'Test' })
        }
        return createMockQuery(null)
      })

      const { hasVendor, loadData } = useDetailData('123')
      await loadData()

      expect(hasVendor.value).toBe(true)
    })

    it('hasValidation returns true when validation exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'validation_results') {
          return createMockQuery({ id: 'vr1', overall_status: 'GREEN' })
        }
        return createMockQuery(null)
      })

      const { hasValidation, loadData } = useDetailData('123')
      await loadData()

      expect(hasValidation.value).toBe(true)
    })

    it('suggestedStartStep returns 0 when no data exists', () => {
      const { suggestedStartStep } = useDetailData('123')
      expect(suggestedStartStep.value).toBe(0)
    })

    it('suggestedStartStep returns 1 when only vehicle exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'vehicles') {
          return createMockQuery({ id: 'v1' })
        }
        return createMockQuery(null)
      })

      const { suggestedStartStep, loadData } = useDetailData('123')
      await loadData()

      expect(suggestedStartStep.value).toBe(1)
    })

    it('suggestedStartStep returns 2 when vehicle and vendor exist', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'vehicles') {
          return createMockQuery({ id: 'v1' })
        }
        if (table === 'vendors') {
          return createMockQuery({ id: 'vnd1' })
        }
        return createMockQuery(null)
      })

      const { suggestedStartStep, loadData } = useDetailData('123')
      await loadData()

      expect(suggestedStartStep.value).toBe(2)
    })

    it('suggestedStartStep returns 3 when validation exists', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'buying_opportunities') {
          return createMockQuery({ id: '123', spz: '5L94454' })
        }
        if (table === 'vehicles') {
          return createMockQuery({ id: 'v1' })
        }
        if (table === 'vendors') {
          return createMockQuery({ id: 'vnd1' })
        }
        if (table === 'validation_results') {
          return createMockQuery({ id: 'vr1' })
        }
        return createMockQuery(null)
      })

      const { suggestedStartStep, loadData } = useDetailData('123')
      await loadData()

      expect(suggestedStartStep.value).toBe(3)
    })
  })
})
```

### Test-First Workflow

1. **RED**: Write tests above, run `npm run test -- --filter="useDetailData"` - they should FAIL
2. **GREEN**: Implement composable until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

---

## Implementation

### Data Loading Composable

**src/composables/useDetailData.ts**:
```typescript
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
```

---

## TypeScript Types

Ensure these types exist in `src/types/index.ts`:

```typescript
export interface BuyingOpportunity {
  id: string
  spz: string
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED'
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  buying_opportunity_id: string
  vin: string
  brand?: string
  model?: string
  year?: number
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  buying_opportunity_id: string
  vendor_type: 'FO' | 'PO'
  name: string
  ico?: string
  dic?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface ValidationResult {
  id: string
  buying_opportunity_id: string
  overall_status: 'GREEN' | 'ORANGE' | 'RED'
  attempt_number: number
  issues: ValidationIssue[]
  created_at: string
}

export interface ValidationIssue {
  rule_id: string
  rule_name: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  status: 'MATCH' | 'MISMATCH' | 'MISSING'
  message?: string
}
```

---

## Validation Commands

```bash
# Run data loading tests
cd MVPScope/frontend && npm run test -- --filter="useDetailData"

# Run all composable tests
cd MVPScope/frontend && npm run test -- --filter="composables"

# Run all tests
cd MVPScope/frontend && npm run test
```

---

## Validation Criteria

- [x] useDetailData composable tests pass
- [x] Loading state works correctly
- [x] Error handling works correctly
- [x] All data types load correctly
- [x] Setters update state correctly
- [x] Status update works correctly
- [x] Computed properties return correct values
- [x] suggestedStartStep logic works correctly

---

## Completion Checklist

- [x] useDetailData.ts created
- [x] All tests passing (23 tests)
- [x] TypeScript types defined (existing types already covered requirements)
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
