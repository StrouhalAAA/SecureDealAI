<template>
  <span :class="statusClass" class="px-2 py-0.5 rounded text-xs font-medium">
    {{ icon }} {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PreviewStatus } from '@/types';

const props = defineProps<{
  status: PreviewStatus;
  similarity?: number;
}>();

const config = computed(() => {
  if (props.status === 'GREEN') {
    return {
      icon: '✓',
      label: 'OK',
      class: 'bg-green-100 text-green-800',
    };
  }

  if (props.status === 'RED') {
    return {
      icon: '✗',
      label: 'Neshoda',
      class: 'bg-red-100 text-red-800',
    };
  }

  if (props.status === 'ORANGE') {
    const similarity = props.similarity
      ? `${Math.round(props.similarity * 100)}%`
      : '~';
    return {
      icon: '~',
      label: similarity,
      class: 'bg-orange-100 text-orange-800',
    };
  }

  // INCOMPLETE
  return {
    icon: '-',
    label: 'Chybi',
    class: 'bg-gray-100 text-gray-600',
  };
});

const icon = computed(() => config.value.icon);
const label = computed(() => config.value.label);
const statusClass = computed(() => config.value.class);
</script>
