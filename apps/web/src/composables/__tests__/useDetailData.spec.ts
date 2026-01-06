import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase - define mock with hoisted vi.hoisted
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn()
  }
}))

vi.mock('@/composables/useSupabase', () => ({
  supabase: mockSupabase
}))

import { useDetailData } from '../useDetailData'

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
        })),
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: data ? [data] : [], error }))
        })),
        in: vi.fn(() => Promise.resolve({ data: data ? [data] : [], error }))
      }))
    }))
  })

  describe('initial state', () => {
    it('starts with loading false', () => {
      const { loading } = useDetailData('123')
      expect(loading.value).toBe(false)
    })

    it('starts with null data', () => {
      const { opportunity, vehicle, vendor, validationResult, ocrExtractions, vehicleOCRData } = useDetailData('123')
      expect(opportunity.value).toBeNull()
      expect(vehicle.value).toBeNull()
      expect(vendor.value).toBeNull()
      expect(validationResult.value).toBeNull()
      expect(ocrExtractions.value).toEqual([])
      expect(vehicleOCRData.value).toBeNull()
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

      mockSupabase.from.mockImplementation((_table: string) => ({
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

      mockSupabase.from.mockImplementation((_table: string) => ({
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
