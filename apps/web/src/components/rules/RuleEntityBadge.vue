<template>
  <span :class="['entity-badge', entityClass]">
    {{ entity }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  entity: string;
}>();

const entityClass = computed(() => {
  const entityLower = props.entity.toLowerCase();
  if (entityLower === 'vehicle') return 'entity-vehicle';
  if (entityLower === 'vendor') return 'entity-vendor';
  if (entityLower.startsWith('ocr')) return 'entity-ocr';
  if (entityLower === 'ares') return 'entity-ares';
  if (entityLower === 'adis') return 'entity-adis';
  if (entityLower === 'cebia') return 'entity-cebia';
  return 'entity-default';
});
</script>

<style scoped>
.entity-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.entity-vehicle { background-color: #E0E7FF; color: #3730A3; }
.entity-vendor { background-color: #FCE7F3; color: #9D174D; }
.entity-ocr { background-color: #FEF9C3; color: #854D0E; }
.entity-ares { background-color: #CFFAFE; color: #155E75; }
.entity-adis { background-color: #CCFBF1; color: #115E59; }
.entity-cebia { background-color: #FFEDD5; color: #9A3412; }
.entity-default { background-color: #F3F4F6; color: #374151; }
</style>
