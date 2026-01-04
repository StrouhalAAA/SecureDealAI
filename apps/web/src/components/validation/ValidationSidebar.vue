<template>
  <aside
    class="validation-sidebar bg-gray-50 border-l border-gray-200"
    :class="{ 'hidden lg:block': !expanded, 'fixed inset-0 z-50 lg:relative': expanded }"
  >
    <!-- Header -->
    <div class="p-4 border-b bg-white">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Validace</h2>
        <button
          @click="expanded = false"
          class="lg:hidden p-1 text-gray-500 hover:text-gray-700"
          aria-label="Zavrit"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <div class="mt-2 flex items-center gap-2">
        <span
          :class="overallStatusClass"
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        >
          {{ overallStatusIcon }} {{ overallStatusLabel }}
        </span>
        <span v-if="loading" class="text-xs text-gray-500">
          Aktualizace...
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-4 overflow-y-auto" style="max-height: calc(100vh - 200px)">
      <!-- Document Progress -->
      <DocumentProgress
        :documents="preview?.categories?.documents"
        :vendor-type="vendorType"
      />

      <!-- Vehicle Validation -->
      <CategoryStatus
        title="Vozidlo"
        icon="car"
        :category="preview?.categories?.vehicle"
        :expanded="expandedCategories.vehicle"
        @toggle="expandedCategories.vehicle = !expandedCategories.vehicle"
      />

      <!-- Vendor Validation -->
      <CategoryStatus
        title="Dodavatel"
        :icon="vendorType === 'FO' ? 'user' : 'building'"
        :category="preview?.categories?.vendor"
        :expanded="expandedCategories.vendor"
        @toggle="expandedCategories.vendor = !expandedCategories.vendor"
      />

      <!-- ARES Status (if company) -->
      <div v-if="vendorType === 'PO' && preview?.categories?.ares" class="bg-white rounded-lg p-4 border">
        <h3 class="text-sm font-medium text-gray-700 mb-2">ARES</h3>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Firma nalezena</span>
            <span :class="preview.categories.ares.company_found ? 'text-green-600' : 'text-red-600'">
              {{ preview.categories.ares.company_found ? 'Ano' : 'Ne' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Aktivni</span>
            <span :class="preview.categories.ares.company_active ? 'text-green-600' : 'text-orange-600'">
              {{ preview.categories.ares.company_active ? 'Ano' : 'Ne' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Platce DPH</span>
            <span class="text-gray-900">
              {{ preview.categories.ares.vat_payer ? 'Ano' : 'Ne' }}
            </span>
          </div>
          <div v-if="preview.categories.ares.unreliable_vat_payer" class="flex justify-between">
            <span class="text-gray-600">Nespolehlivy platce</span>
            <span class="text-red-600 font-medium">ANO</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Summary -->
    <div class="p-4 border-t bg-white">
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div class="text-lg font-bold text-green-600">{{ summary.passed }}</div>
          <div class="text-gray-500">Proslo</div>
        </div>
        <div>
          <div class="text-lg font-bold text-orange-600">{{ summary.warnings }}</div>
          <div class="text-gray-500">Varovani</div>
        </div>
        <div>
          <div class="text-lg font-bold text-red-600">{{ summary.failed }}</div>
          <div class="text-gray-500">Selhalo</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import DocumentProgress from './DocumentProgress.vue';
import CategoryStatus from './CategoryStatus.vue';
import type { ValidationPreviewResponse, PreviewStatus } from '@/types';

const props = defineProps<{
  buyingOpportunityId: string;
  vehicleData?: Record<string, unknown>;
  vendorData?: Record<string, unknown>;
  vendorType?: 'FO' | 'PO';
}>();

const emit = defineEmits<{
  (e: 'statusChange', status: PreviewStatus): void;
}>();

const preview = ref<ValidationPreviewResponse | null>(null);
const loading = ref(false);
const expanded = ref(false);
const expandedCategories = ref({
  vehicle: true,
  vendor: true,
});

// Computed properties
const summary = computed(() => preview.value?.summary ?? {
  passed: 0,
  warnings: 0,
  failed: 0,
});

const overallStatusConfig = computed(() => {
  const status = preview.value?.preview_status;
  const configs: Record<string, { icon: string; label: string; class: string }> = {
    GREEN: { icon: '\uD83D\uDFE2', label: 'Vse OK', class: 'bg-green-100 text-green-800' },
    ORANGE: { icon: '\uD83D\uDFE0', label: 'Vyzaduje pozornost', class: 'bg-orange-100 text-orange-800' },
    RED: { icon: '\uD83D\uDD34', label: 'Kriticke problemy', class: 'bg-red-100 text-red-800' },
    INCOMPLETE: { icon: '\u26AA', label: 'Nekompletni', class: 'bg-gray-100 text-gray-800' },
  };
  return configs[status || 'INCOMPLETE'];
});

const overallStatusIcon = computed(() => overallStatusConfig.value.icon);
const overallStatusLabel = computed(() => overallStatusConfig.value.label);
const overallStatusClass = computed(() => overallStatusConfig.value.class);

// Fetch preview data
async function fetchPreview() {
  if (!props.buyingOpportunityId) return;

  loading.value = true;
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validation-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          buying_opportunity_id: props.buyingOpportunityId,
          vehicle_data: props.vehicleData,
          vendor_data: props.vendorData,
        }),
      }
    );

    if (response.ok) {
      preview.value = await response.json();
      emit('statusChange', preview.value!.preview_status);
    }
  } catch (error) {
    console.error('Validation preview error:', error);
  } finally {
    loading.value = false;
  }
}

// Debounced fetch for real-time updates
const debouncedFetch = useDebounceFn(fetchPreview, 500);

// Watch for data changes
watch(
  () => [props.vehicleData, props.vendorData],
  () => {
    debouncedFetch();
  },
  { deep: true }
);

// Initial fetch
onMounted(() => {
  fetchPreview();
});

// Expose method for manual refresh and state
defineExpose({
  refresh: fetchPreview,
  expand: () => { expanded.value = true; },
  preview,
});
</script>

<style scoped>
.validation-sidebar {
  width: 280px;
  min-width: 280px;
}

@media (max-width: 1024px) {
  .validation-sidebar {
    width: 100%;
  }
}
</style>
