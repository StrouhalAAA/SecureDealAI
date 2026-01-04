<template>
  <span :class="statusClass" class="px-2 py-1 rounded text-xs font-medium">
    {{ icon }} {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FieldValidation } from '@/types';

const props = defineProps<{
  field: FieldValidation;
}>();

const config = computed(() => {
  if (props.field.result === 'MATCH') {
    return {
      icon: '🟢',
      label: 'MATCH',
      class: 'bg-green-100 text-green-800',
    };
  }

  if (props.field.result === 'MISMATCH') {
    if (props.field.status === 'RED') {
      return {
        icon: '🔴',
        label: 'MISMATCH',
        class: 'bg-red-100 text-red-800',
      };
    }
    // Fuzzy match with similarity
    const similarity = props.field.similarity
      ? `${Math.round(props.field.similarity * 100)}%`
      : 'PARTIAL';
    return {
      icon: '🟠',
      label: similarity,
      class: 'bg-orange-100 text-orange-800',
    };
  }

  if (props.field.result === 'MISSING') {
    return {
      icon: '⚪',
      label: 'MISSING',
      class: 'bg-gray-100 text-gray-600',
    };
  }

  return {
    icon: '•',
    label: props.field.result || 'UNKNOWN',
    class: 'bg-gray-100',
  };
});

const icon = computed(() => config.value.icon);
const label = computed(() => config.value.label);
const statusClass = computed(() => config.value.class);
</script>
