<template>
  <div
    v-if="history && history.total_count > 0"
    class="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 mb-4"
    role="alert"
  >
    <!-- Header -->
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <div class="flex-1">
        <h3 class="text-sm font-semibold text-amber-800">
          Toto vozidlo bylo jiz drive zpracovano
        </h3>
        <p class="mt-1 text-sm text-amber-700">
          Vozidlo s touto SPZ bylo zpracovano
          <strong>{{ history.total_count }}x</strong>.
          <span v-if="latestDate">
            Naposledy {{ formatDate(latestDate) }}.
          </span>
        </p>

        <!-- Latest record status -->
        <div v-if="history.latest_status" class="mt-2 flex items-center gap-2 text-sm">
          <span class="text-amber-700">Posledni stav:</span>
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusBadgeClass(history.latest_status)"
          >
            {{ translateStatus(history.latest_status) }}
          </span>
        </div>

        <!-- Validation summary -->
        <div v-if="hasValidationSummary" class="mt-2 flex flex-wrap gap-2 text-xs">
          <span
            v-for="(count, status) in history.validation_statuses"
            :key="status"
            class="inline-flex items-center rounded-full px-2 py-0.5 font-medium"
            :class="validationBadgeClass(status as string)"
          >
            {{ translateValidationStatus(status as string) }}: {{ count }}
          </span>
        </div>

        <!-- Collapsible history -->
        <details v-if="history.history && history.history.length > 0" class="mt-3">
          <summary class="cursor-pointer text-sm text-amber-700 hover:text-amber-900">
            Zobrazit historii ({{ history.history.length }} zaznamu)
          </summary>
          <div class="mt-2 space-y-1">
            <div
              v-for="entry in history.history"
              :key="entry.id"
              class="flex items-center justify-between rounded bg-amber-100/50 px-2 py-1 text-xs"
            >
              <span class="text-amber-800">
                {{ formatDate(entry.created_at) }}
              </span>
              <span class="flex items-center gap-2">
                <span
                  class="inline-flex items-center rounded px-1.5 py-0.5 font-medium"
                  :class="statusBadgeClass(entry.status)"
                >
                  {{ translateStatus(entry.status) }}
                </span>
                <span
                  v-if="entry.validation_status"
                  class="inline-flex items-center rounded px-1.5 py-0.5 font-medium"
                  :class="validationBadgeClass(entry.validation_status)"
                >
                  {{ translateValidationStatus(entry.validation_status) }}
                </span>
              </span>
            </div>
          </div>
        </details>

        <!-- Info text -->
        <p class="mt-3 text-xs text-amber-600">
          Muzete pokracovat ve vytvareni nove prilezitosti. Toto upozorneni je pouze informativni.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SpzHistoryData } from '@/composables/useSpzHistory'

const props = defineProps<{
  history: SpzHistoryData | null
}>()

const latestDate = computed(() => props.history?.latest_created_at || null)

const hasValidationSummary = computed(() => {
  if (!props.history?.validation_statuses) return false
  return Object.keys(props.history.validation_statuses).length > 0
})

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    DRAFT: 'Rozpracovano',
    PENDING: 'Ceka na validaci',
    VALIDATED: 'Zvalidovano',
    REJECTED: 'Zamitnuto',
  }
  return translations[status] || status
}

function translateValidationStatus(status: string): string {
  const translations: Record<string, string> = {
    GREEN: 'Schvaleno',
    ORANGE: 'K provereni',
    RED: 'Zamitnuto',
    NONE: 'Bez validace',
  }
  return translations[status] || status
}

function statusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-blue-100 text-blue-700',
    VALIDATED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

function validationBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    GREEN: 'bg-green-100 text-green-700',
    ORANGE: 'bg-orange-100 text-orange-700',
    RED: 'bg-red-100 text-red-700',
    NONE: 'bg-gray-100 text-gray-600',
  }
  return classes[status] || 'bg-gray-100 text-gray-600'
}
</script>
