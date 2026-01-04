<template>
  <span :class="badgeClass" class="px-2 py-1 rounded-full text-xs font-medium">
    {{ icon }} {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED' | 'GREEN' | 'ORANGE' | 'RED';
}>();

const config = computed(() => {
  const configs: Record<string, { icon: string; label: string; class: string }> = {
    DRAFT: { icon: '', label: 'Koncept', class: 'bg-gray-100 text-gray-800' },
    PENDING: { icon: '', label: 'Čeká', class: 'bg-blue-100 text-blue-800' },
    VALIDATED: { icon: '', label: 'Ověřeno', class: 'bg-green-100 text-green-800' },
    REJECTED: { icon: '', label: 'Zamítnuto', class: 'bg-red-100 text-red-800' },
    GREEN: { icon: '', label: 'GREEN', class: 'bg-green-100 text-green-800' },
    ORANGE: { icon: '', label: 'ORANGE', class: 'bg-orange-100 text-orange-800' },
    RED: { icon: '', label: 'RED', class: 'bg-red-100 text-red-800' },
  };
  return configs[props.status] || configs.DRAFT;
});

const icon = computed(() => config.value.icon);
const label = computed(() => config.value.label);
const badgeClass = computed(() => config.value.class);
</script>
