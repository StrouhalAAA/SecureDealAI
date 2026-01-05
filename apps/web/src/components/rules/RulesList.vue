<template>
  <div class="rules-list">
    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>Status</label>
        <select v-model="filters.status" @change="onFilterChange">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Entity</label>
        <select v-model="filters.source_entity" @change="onFilterChange">
          <option value="">All Entities</option>
          <option value="VEHICLE">Vehicle</option>
          <option value="VENDOR">Vendor</option>
          <option value="TRANSACTION">Transaction</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Severity</label>
        <select v-model="filters.severity" @change="onFilterChange">
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>
      </div>

      <div class="filter-group search">
        <label>Search</label>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search rules..."
          @input="onSearchChange"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table v-if="!loading && rules.length > 0">
        <thead>
          <tr>
            <th>Rule ID</th>
            <th>Name</th>
            <th>Entity</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Version</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in filteredRules" :key="rule.id">
            <td class="rule-id">{{ rule.rule_id }}</td>
            <td class="rule-name">
              <span class="name">{{ rule.rule_name }}</span>
              <span v-if="rule.description" class="description">{{ rule.description }}</span>
            </td>
            <td>
              <span class="entity-badge">{{ rule.source_entity }}</span>
              →
              <span class="entity-badge">{{ rule.target_entity }}</span>
            </td>
            <td>
              <span :class="['severity-badge', `severity-${rule.severity.toLowerCase()}`]">
                {{ rule.severity }}
              </span>
            </td>
            <td>
              <RuleStatusBadge :is-active="rule.is_active" :is-draft="rule.is_draft" />
            </td>
            <td class="version">v{{ rule.version }}</td>
            <td class="actions">
              <button
                class="action-btn"
                title="Edit"
                @click="$emit('edit', rule)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                v-if="rule.is_draft || !rule.is_active"
                class="action-btn activate"
                title="Activate"
                @click="$emit('activate', rule)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button
                v-if="rule.is_active"
                class="action-btn deactivate"
                title="Deactivate"
                @click="$emit('deactivate', rule)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button
                class="action-btn"
                title="Clone"
                @click="$emit('clone', rule)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                v-if="!rule.is_active"
                class="action-btn delete"
                title="Delete"
                @click="$emit('delete', rule)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading rules...</p>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && rules.length === 0" class="empty-state">
        <p>No rules found</p>
        <button class="primary-btn" @click="$emit('create')">Create First Rule</button>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.total_pages > 1" class="pagination">
      <button
        :disabled="pagination.page === 1"
        @click="changePage(pagination.page - 1)"
      >
        Previous
      </button>
      <span>Page {{ pagination.page }} of {{ pagination.total_pages }}</span>
      <button
        :disabled="pagination.page === pagination.total_pages"
        @click="changePage(pagination.page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import RuleStatusBadge from './RuleStatusBadge.vue';
import type { RuleResponse } from '@/composables/useRules';

const props = defineProps<{
  rules: RuleResponse[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}>();

const emit = defineEmits<{
  (e: 'edit', rule: RuleResponse): void;
  (e: 'activate', rule: RuleResponse): void;
  (e: 'deactivate', rule: RuleResponse): void;
  (e: 'clone', rule: RuleResponse): void;
  (e: 'delete', rule: RuleResponse): void;
  (e: 'create'): void;
  (e: 'filter', filters: Record<string, string>): void;
  (e: 'page', page: number): void;
}>();

const filters = ref({
  status: 'all',
  source_entity: '',
  severity: '',
});

const searchQuery = ref('');

const filteredRules = computed(() => {
  if (!searchQuery.value) return props.rules;

  const query = searchQuery.value.toLowerCase();
  return props.rules.filter(rule =>
    rule.rule_id.toLowerCase().includes(query) ||
    rule.rule_name.toLowerCase().includes(query) ||
    (rule.description && rule.description.toLowerCase().includes(query))
  );
});

function onFilterChange() {
  emit('filter', {
    status: filters.value.status,
    source_entity: filters.value.source_entity,
    severity: filters.value.severity,
  });
}

function onSearchChange() {
  // Local filtering only - no need to emit
}

function changePage(page: number) {
  emit('page', page);
}
</script>

<style scoped>
.rules-list {
  background: #1f2937;
  border-radius: 0.5rem;
  overflow: hidden;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem;
  background: #111827;
  border-bottom: 1px solid #374151;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-group label {
  font-size: 0.75rem;
  color: #9ca3af;
  text-transform: uppercase;
}

.filter-group select,
.filter-group input {
  padding: 0.5rem;
  background: #374151;
  border: 1px solid #4b5563;
  border-radius: 0.375rem;
  color: #f3f4f6;
  font-size: 0.875rem;
}

.filter-group.search {
  flex: 1;
  min-width: 200px;
}

.filter-group.search input {
  width: 100%;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #374151;
}

th {
  background: #111827;
  color: #9ca3af;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 600;
}

td {
  color: #f3f4f6;
  font-size: 0.875rem;
}

.rule-id {
  font-family: monospace;
  color: #60a5fa;
}

.rule-name .name {
  display: block;
  font-weight: 500;
}

.rule-name .description {
  display: block;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}

.entity-badge {
  font-size: 0.75rem;
  color: #9ca3af;
}

.severity-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.severity-critical {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.severity-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.severity-info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.version {
  font-family: monospace;
  color: #9ca3af;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.25rem;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f3f4f6;
}

.action-btn.activate:hover {
  color: #10b981;
}

.action-btn.deactivate:hover {
  color: #f59e0b;
}

.action-btn.delete:hover {
  color: #ef4444;
}

.action-btn svg {
  width: 1rem;
  height: 1rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #9ca3af;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #374151;
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.primary-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.primary-btn:hover {
  background: #2563eb;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid #374151;
}

.pagination button {
  padding: 0.5rem 1rem;
  background: #374151;
  color: #f3f4f6;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button:not(:disabled):hover {
  background: #4b5563;
}

.pagination span {
  color: #9ca3af;
  font-size: 0.875rem;
}
</style>
