<template>
  <span :class="['rule-chip', `chip-${type}`]">
    {{ value }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  type: 'transform' | 'comparator';
  value: string;
}>();
</script>

<style scoped>
.rule-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.chip-transform {
  background-color: #EDE9FE;
  color: #5B21B6;
}

.chip-comparator {
  background-color: #ECFDF5;
  color: #047857;
}
</style>
