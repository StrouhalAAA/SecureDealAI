<template>
  <div
    @click="$emit('expand')"
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 cursor-pointer z-40"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium">Validace:</span>
        <span :class="vehicleStatusClass" class="px-2 py-0.5 rounded text-xs">
          {{ vehicleStatusIcon }} Vozidlo
        </span>
        <span :class="vendorStatusClass" class="px-2 py-0.5 rounded text-xs">
          {{ vendorStatusIcon }} Dodavatel
        </span>
      </div>
      <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ValidationPreviewResponse, PreviewStatus } from '@/types';

const props = defineProps<{
  preview?: ValidationPreviewResponse | null;
}>();

defineEmits(['expand']);

function getStatusConfig(status?: PreviewStatus) {
  const configs: Record<string, { icon: string; class: string }> = {
    GREEN: { icon: '\uD83D\uDFE2', class: 'bg-green-100 text-green-700' },
    ORANGE: { icon: '\uD83D\uDFE0', class: 'bg-orange-100 text-orange-700' },
    RED: { icon: '\uD83D\uDD34', class: 'bg-red-100 text-red-700' },
    INCOMPLETE: { icon: '\u26AA', class: 'bg-gray-100 text-gray-600' },
  };
  return configs[status || 'INCOMPLETE'];
}

const vehicleConfig = computed(() => getStatusConfig(props.preview?.categories?.vehicle?.status));
const vendorConfig = computed(() => getStatusConfig(props.preview?.categories?.vendor?.status));

const vehicleStatusIcon = computed(() => vehicleConfig.value.icon);
const vehicleStatusClass = computed(() => vehicleConfig.value.class);
const vendorStatusIcon = computed(() => vendorConfig.value.icon);
const vendorStatusClass = computed(() => vendorConfig.value.class);
</script>
