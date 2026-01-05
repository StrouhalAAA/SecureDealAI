<template>
  <span :class="['severity-badge', `severity-${severity.toLowerCase()}`]">
    {{ severity }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}>();
</script>

<style scoped>
.severity-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.severity-critical {
  background-color: #FEE2E2;
  color: #991B1B;
}

.severity-warning {
  background-color: #FFEDD5;
  color: #9A3412;
}

.severity-info {
  background-color: #DBEAFE;
  color: #1E40AF;
}
</style>
