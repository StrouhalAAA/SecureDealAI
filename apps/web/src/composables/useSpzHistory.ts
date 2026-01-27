import { ref, computed } from 'vue'
import { supabase } from './useSupabase'

/**
 * History entry for a single SPZ record
 */
export interface SpzHistoryEntry {
  id: string
  status: string
  buying_type: string | null
  validation_status: string | null
  created_at: string
}

/**
 * SPZ history response from get_spz_history function
 */
export interface SpzHistoryData {
  total_count: number
  latest_id: string | null
  latest_status: string | null
  latest_created_at: string | null
  validation_statuses: Record<string, number>
  history: SpzHistoryEntry[]
}

/**
 * Composable for checking SPZ history in the database
 * Used to show warnings when a vehicle with the same SPZ was previously processed
 */
export function useSpzHistory() {
  const spzHistory = ref<SpzHistoryData | null>(null)
  const isChecking = ref(false)
  const historyError = ref<string | null>(null)

  /**
   * Check if there are existing records for the given SPZ
   */
  const hasExistingRecords = computed(() => {
    return spzHistory.value !== null && spzHistory.value.total_count > 0
  })

  /**
   * Normalize SPZ value (uppercase, trim whitespace)
   */
  function normalizeSpz(spz: string): string {
    return spz.toUpperCase().trim()
  }

  /**
   * Check history for a given SPZ
   * @param spz - The license plate to check
   * @param excludeId - Optional ID to exclude from results (for editing existing records)
   */
  async function checkSpzHistory(spz: string, excludeId?: string): Promise<SpzHistoryData | null> {
    // Reset state
    historyError.value = null

    // Validate input
    if (!spz || spz.trim().length === 0) {
      spzHistory.value = null
      return null
    }

    const normalizedSpz = normalizeSpz(spz)

    // Skip TEMP- placeholders
    if (normalizedSpz.startsWith('TEMP-')) {
      spzHistory.value = null
      return null
    }

    isChecking.value = true

    try {
      const { data, error } = await supabase
        .rpc('get_spz_history', { p_spz: normalizedSpz })
        .single()

      if (error) {
        throw error
      }

      // Cast to expected type
      const responseData = data as SpzHistoryData | null

      // Handle null/empty response
      if (!responseData || responseData.total_count === 0) {
        spzHistory.value = null
        return null
      }

      // Filter out the current record if excludeId is provided
      let historyData = responseData
      if (excludeId && historyData.history) {
        const filteredHistory = historyData.history.filter(
          (entry: SpzHistoryEntry) => entry.id !== excludeId
        )
        const filteredCount = historyData.total_count - (historyData.history.length - filteredHistory.length)

        if (filteredCount === 0) {
          spzHistory.value = null
          return null
        }

        historyData = {
          ...historyData,
          total_count: filteredCount,
          history: filteredHistory,
          latest_id: filteredHistory.length > 0 ? filteredHistory[0].id : null,
          latest_status: filteredHistory.length > 0 ? filteredHistory[0].status : null,
          latest_created_at: filteredHistory.length > 0 ? filteredHistory[0].created_at : null,
        }
      }

      spzHistory.value = historyData
      return historyData
    } catch (e) {
      console.error('Error checking SPZ history:', e)
      historyError.value = e instanceof Error ? e.message : 'Chyba pri kontrole historie SPZ'
      spzHistory.value = null
      return null
    } finally {
      isChecking.value = false
    }
  }

  /**
   * Clear the history state
   */
  function clearHistory() {
    spzHistory.value = null
    historyError.value = null
  }

  return {
    spzHistory,
    isChecking,
    historyError,
    hasExistingRecords,
    checkSpzHistory,
    clearHistory,
  }
}
