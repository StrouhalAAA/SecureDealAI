<template>
  <div v-if="status !== 'idle'" :class="containerClass">
    <!-- Loading -->
    <template v-if="status === 'loading'">
      <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      <span class="text-blue-600">Ověřuji v ARES...</span>
    </template>

    <!-- Verified -->
    <template v-else-if="status === 'verified'">
      <span class="text-green-500">&#x2705;</span>
      <span class="text-green-700">{{ message || 'Ověřeno v ARES' }}</span>
    </template>

    <!-- Not Found -->
    <template v-else-if="status === 'not_found'">
      <span class="text-red-500">&#x274C;</span>
      <span class="text-red-700">{{ message || 'Nenalezeno v ARES' }}</span>
    </template>

    <!-- Warning -->
    <template v-else-if="status === 'warning'">
      <span class="text-orange-500">&#x26A0;&#xFE0F;</span>
      <span class="text-orange-700">{{ message }}</span>
    </template>

    <!-- Error -->
    <template v-else-if="status === 'error'">
      <span class="text-red-500">&#x274C;</span>
      <span class="text-red-700">{{ message || 'Chyba ověření' }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type AresStatusType = 'idle' | 'loading' | 'verified' | 'not_found' | 'warning' | 'error';

const props = defineProps<{
  status: AresStatusType;
  message?: string;
}>();

const containerClass = computed(() => {
  const base = 'flex items-center gap-2 text-sm px-3 py-1 rounded-lg';
  const colors = {
    idle: '',
    loading: 'bg-blue-50',
    verified: 'bg-green-50',
    not_found: 'bg-red-50',
    warning: 'bg-orange-50',
    error: 'bg-red-50',
  };
  return `${base} ${colors[props.status]}`;
});
</script>
