<template>
  <div :class="containerClass" class="mt-3 rounded-lg p-4">
    <!-- Pending -->
    <div v-if="extraction.ocr_status === 'PENDING'" class="flex items-center gap-2">
      <span>⏳</span>
      <span>Čeká na zpracování...</span>
    </div>

    <!-- Processing -->
    <div v-else-if="extraction.ocr_status === 'PROCESSING'" class="flex items-center gap-2">
      <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      <span>Probíhá extrakce textu...</span>
    </div>

    <!-- Completed -->
    <div v-else-if="extraction.ocr_status === 'COMPLETED'">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-green-500">✅</span>
          <span class="font-medium">Extrakce dokončena</span>
          <span class="text-gray-400 text-sm">
            ({{ Math.round(extraction.extraction_confidence || 0) }}% přesnost)
          </span>
        </div>
        <button
          @click="showPreview = !showPreview"
          class="text-blue-600 text-sm hover:underline"
        >
          {{ showPreview ? 'Skrýt náhled' : 'Zobrazit náhled' }}
        </button>
      </div>

      <!-- Data Preview -->
      <div v-if="showPreview" class="mt-3 bg-gray-50 rounded p-3">
        <h4 class="font-medium text-sm mb-2">Extrahovaná data:</h4>
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <template v-for="(value, key) in extractedDataPreview" :key="key">
            <dt class="text-gray-500">{{ formatFieldName(String(key)) }}:</dt>
            <dd class="font-mono">{{ value || '-' }}</dd>
          </template>
        </dl>
      </div>
    </div>

    <!-- Failed -->
    <div v-else-if="extraction.ocr_status === 'FAILED'" class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-red-600">
        <span>❌</span>
        <span>Chyba extrakce: {{ errorMessage }}</span>
      </div>
      <button
        @click="$emit('retry')"
        class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
      >
        🔄 Opakovat
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { OcrExtraction } from '@/types';

const props = defineProps<{
  extraction: OcrExtraction;
}>();

defineEmits(['retry']);

const showPreview = ref(false);

const containerClass = computed(() => {
  const classes: Record<string, string> = {
    PENDING: 'bg-gray-100',
    PROCESSING: 'bg-blue-50',
    COMPLETED: 'bg-green-50',
    FAILED: 'bg-red-50',
  };
  return classes[props.extraction.ocr_status] || 'bg-gray-100';
});

const extractedDataPreview = computed(() => {
  const data = props.extraction.extracted_data;
  if (!data) return {};

  // Show only key fields based on document type
  if (props.extraction.document_type === 'ORV') {
    return {
      registrationPlateNumber: data.registrationPlateNumber,
      vin: data.vin,
      make: data.make,
      model: data.model,
      keeperName: data.keeperName,
    };
  } else if (props.extraction.document_type === 'VTP') {
    return {
      registrationPlateNumber: data.registrationPlateNumber,
      vin: data.vin,
      ownerName: data.ownerName,
      ownerIco: data.ownerIco,
      ownerAddress: data.ownerAddress,
    };
  } else {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      personalNumber: data.personalNumber,
      permanentStay: data.permanentStay,
    };
  }
});

const errorMessage = computed(() => {
  return props.extraction.errors?.message || 'Neznámá chyba';
});

const fieldNameMap: Record<string, string> = {
  registrationPlateNumber: 'SPZ',
  vin: 'VIN',
  make: 'Značka',
  model: 'Model',
  keeperName: 'Majitel',
  ownerName: 'Vlastník',
  ownerIco: 'IČO vlastníka',
  ownerAddress: 'Adresa vlastníka',
  firstName: 'Jméno',
  lastName: 'Příjmení',
  personalNumber: 'Rodné číslo',
  permanentStay: 'Trvalý pobyt',
};

function formatFieldName(key: string): string {
  return fieldNameMap[key] || key;
}
</script>
