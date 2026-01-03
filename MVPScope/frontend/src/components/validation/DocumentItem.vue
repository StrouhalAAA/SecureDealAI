<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700">{{ label }}</span>
      <span v-if="required" class="text-red-500 text-xs">*</span>
      <span v-if="hint" class="text-xs text-gray-400">({{ hint }})</span>
    </div>
    <div class="flex items-center gap-1">
      <!-- Status icon -->
      <span v-if="status?.ocr_processed" class="text-green-600">
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
      </span>
      <span v-else-if="status?.uploaded" class="text-yellow-600">
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
        </svg>
      </span>
      <span v-else class="text-gray-300">
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
        </svg>
      </span>
      <!-- Fields count -->
      <span v-if="status?.ocr_fields_extracted" class="text-xs text-gray-500">
        {{ status.ocr_fields_extracted }} poli
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DocumentStatus } from '@/types';

defineProps<{
  label: string;
  status?: DocumentStatus;
  required?: boolean;
  hint?: string;
}>();
</script>
