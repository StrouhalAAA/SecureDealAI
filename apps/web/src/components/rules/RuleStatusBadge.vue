<template>
  <span :class="['status-badge', statusClass]">
    <svg v-if="isActive" class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>
    <svg v-else-if="isDraft" class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
    </svg>
    <svg v-else class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
    </svg>
    {{ statusText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isActive: boolean;
  isDraft: boolean;
}>();

const statusClass = computed(() => {
  if (props.isActive) return 'status-active';
  if (props.isDraft) return 'status-draft';
  return 'status-inactive';
});

const statusText = computed(() => {
  if (props.isActive) return 'Aktivní';
  if (props.isDraft) return 'Draft';
  return 'Neaktivní';
});
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.icon {
  width: 0.875rem;
  height: 0.875rem;
}

.status-active { background-color: #D1FAE5; color: #065F46; }
.status-draft { background-color: #FEF3C7; color: #92400E; }
.status-inactive { background-color: #F3F4F6; color: #6B7280; }
</style>
