<template>
  <div class="stats-bar">
    <div class="stat-item">
      <span class="stat-value">{{ stats.total }}</span>
      <span class="stat-label">pravidel celkem</span>
    </div>

    <div class="stat-divider"></div>

    <div class="stat-item">
      <span class="stat-dot dot-active"></span>
      <span class="stat-text">{{ stats.active }} aktivních</span>
    </div>

    <div class="stat-item">
      <span class="stat-dot dot-inactive"></span>
      <span class="stat-text">{{ stats.inactive }} neaktivních</span>
    </div>

    <div class="stat-divider"></div>

    <div class="stat-group">
      <div class="stat-severity">
        <span class="severity-badge severity-critical">CRITICAL</span>
        <span class="severity-count">{{ stats.critical }}</span>
      </div>
      <div class="stat-severity">
        <span class="severity-badge severity-warning">WARNING</span>
        <span class="severity-count">{{ stats.warning }}</span>
      </div>
      <div class="stat-severity">
        <span class="severity-badge severity-info">INFO</span>
        <span class="severity-count">{{ stats.info }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RuleResponse } from '@/composables/useRules';

const props = defineProps<{
  rules: RuleResponse[];
}>();

const stats = computed(() => {
  const rules = props.rules;
  return {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    inactive: rules.filter(r => !r.is_active).length,
    critical: rules.filter(r => r.severity === 'CRITICAL').length,
    warning: rules.filter(r => r.severity === 'WARNING').length,
    info: rules.filter(r => r.severity === 'INFO').length,
  };
});
</script>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border-bottom: 1px solid #E5E7EB;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 0.875rem;
  color: #6B7280;
}

.stat-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.stat-divider {
  width: 1px;
  height: 2rem;
  background: #E5E7EB;
}

.stat-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.dot-active { background-color: #10B981; }
.dot-inactive { background-color: #9CA3AF; }

.stat-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-severity {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.severity-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.severity-critical { background-color: #FEE2E2; color: #991B1B; }
.severity-warning { background-color: #FFEDD5; color: #9A3412; }
.severity-info { background-color: #DBEAFE; color: #1E40AF; }

.severity-count {
  font-size: 0.875rem;
  color: #4B5563;
}
</style>
