# Task 6.7: Frontend Rules Management

> **Task ID**: 06_07
> **Status**: [ ] Pending
> **Depends On**: 6.6 (Swagger UI Integration)
> **Estimated Time**: 4 hours
> **Priority**: Optional (Nice-to-have for Phase 1)

---

## Objective

Create a user-friendly frontend interface for managing validation rules. This includes a rules list with filtering, a rule editor for creating/updating rules, and lifecycle management controls.

---

## Prerequisites

- Task 6.6 completed (Swagger UI working, confirms API is functional)
- Understanding of existing Vue.js patterns in the project
- Rules API endpoints working

---

## Components to Create

| Component | Purpose |
|-----------|---------|
| `RulesManagement.vue` | Main page with rules list and actions |
| `RulesList.vue` | Sortable, filterable table of rules |
| `RuleEditor.vue` | Modal/drawer for creating/editing rules |
| `RuleStatusBadge.vue` | Badge showing rule status (active/draft/inactive) |
| `useRules.ts` | Composable for rules API operations |

---

## Implementation Steps

### Step 1: Create useRules Composable

```typescript
// apps/web/src/composables/useRules.ts

import { ref, computed } from 'vue';
import { fetchWithAuth } from './useSupabase';

export interface RuleResponse {
  id: string;
  rule_id: string;
  rule_name: string;
  description?: string;
  source_entity: string;
  source_field: string;
  target_entity: string;
  target_field: string;
  transform?: Array<{ type: string; params?: Record<string, unknown> }>;
  comparator: string;
  comparator_params?: Record<string, unknown>;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  error_message: string;
  applies_to?: {
    vendor_type?: string[];
    buying_type?: string[];
  };
  enabled: boolean;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RulesListResponse {
  data: RuleResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface CreateRuleRequest {
  rule_id: string;
  rule_name: string;
  description?: string;
  source_entity: string;
  source_field: string;
  target_entity: string;
  target_field: string;
  transform?: Array<{ type: string }>;
  comparator: string;
  comparator_params?: Record<string, unknown>;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  error_message: string;
  applies_to?: {
    vendor_type?: string[];
    buying_type?: string[];
  };
  enabled?: boolean;
}

export interface RulesFilters {
  status?: 'active' | 'draft' | 'all';
  source_entity?: string;
  severity?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useRules() {
  const rules = ref<RuleResponse[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    page: 1,
    limit: 50,
    total: 0,
    total_pages: 0,
  });

  const functionsUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

  async function fetchRules(filters: RulesFilters = {}): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.source_entity) params.set('source_entity', filters.source_entity);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());

      const url = `${functionsUrl}/rules?${params.toString()}`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.status}`);
      }

      const data = await response.json() as { data: RulesListResponse };
      rules.value = data.data.data;
      pagination.value = data.data.pagination;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch rules:', err);
    } finally {
      loading.value = false;
    }
  }

  async function getRule(ruleId: string): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createRule(rule: CreateRuleRequest): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to create rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to create rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateRule(ruleId: string, updates: Partial<CreateRuleRequest>): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to update rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to update rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function deleteRule(ruleId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to delete rule: ${response.status}`);
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to delete rule:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function activateRule(ruleId: string): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}/activate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to activate rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to activate rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function deactivateRule(ruleId: string): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}/deactivate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to deactivate rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to deactivate rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function cloneRule(ruleId: string, newRuleId: string, newName?: string): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_rule_id: newRuleId,
          new_rule_name: newName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to clone rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to clone rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    rules,
    loading,
    error,
    pagination,
    fetchRules,
    getRule,
    createRule,
    updateRule,
    deleteRule,
    activateRule,
    deactivateRule,
    cloneRule,
  };
}
```

### Step 2: Create RuleStatusBadge Component

```vue
<!-- apps/web/src/components/rules/RuleStatusBadge.vue -->
<template>
  <span :class="['status-badge', statusClass]">
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
  if (props.isDraft) return 'status-draft';
  if (props.isActive) return 'status-active';
  return 'status-inactive';
});

const statusText = computed(() => {
  if (props.isDraft) return 'Draft';
  if (props.isActive) return 'Active';
  return 'Inactive';
});
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-active {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-draft {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-inactive {
  background-color: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.3);
}
</style>
```

### Step 3: Create RulesList Component

```vue
<!-- apps/web/src/components/rules/RulesList.vue -->
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
import { ref, computed, watch } from 'vue';
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
  // Local filtering only
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
```

### Step 4: Create RulesManagement Page

```vue
<!-- apps/web/src/pages/RulesManagement.vue -->
<template>
  <div class="rules-management">
    <div class="page-header">
      <div class="header-content">
        <router-link to="/" class="back-link">
          <span>&larr;</span> Back to Dashboard
        </router-link>
        <h1>Rules Management</h1>
        <p class="subtitle">Manage validation rules for the SecureDealAI system</p>
      </div>
      <div class="header-actions">
        <button class="secondary-btn" @click="exportRules">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
        <button class="primary-btn" @click="openCreateModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 4v16m8-8H4" />
          </svg>
          New Rule
        </button>
      </div>
    </div>

    <RulesList
      :rules="rules"
      :loading="loading"
      :pagination="pagination"
      @edit="openEditModal"
      @activate="handleActivate"
      @deactivate="handleDeactivate"
      @clone="openCloneModal"
      @delete="handleDelete"
      @create="openCreateModal"
      @filter="handleFilter"
      @page="handlePageChange"
    />

    <!-- Rule Editor Modal would go here -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <h2>{{ modalMode === 'create' ? 'Create Rule' : 'Edit Rule' }}</h2>
          <!-- Rule form would go here -->
          <p class="placeholder">Rule editor form implementation...</p>
          <div class="modal-actions">
            <button class="secondary-btn" @click="closeModal">Cancel</button>
            <button class="primary-btn">Save</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import RulesList from '@/components/rules/RulesList.vue';
import { useRules, type RuleResponse, type RulesFilters } from '@/composables/useRules';

const {
  rules,
  loading,
  pagination,
  fetchRules,
  activateRule,
  deactivateRule,
  deleteRule,
} = useRules();

const showModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const selectedRule = ref<RuleResponse | null>(null);

const currentFilters = ref<RulesFilters>({
  status: 'all',
  page: 1,
  limit: 50,
});

onMounted(() => {
  fetchRules(currentFilters.value);
});

function openCreateModal() {
  modalMode.value = 'create';
  selectedRule.value = null;
  showModal.value = true;
}

function openEditModal(rule: RuleResponse) {
  modalMode.value = 'edit';
  selectedRule.value = rule;
  showModal.value = true;
}

function openCloneModal(rule: RuleResponse) {
  // Prompt for new rule ID
  const newId = prompt('Enter new rule ID (format: XXX-NNN):', '');
  if (newId) {
    // Clone logic would go here
    console.log('Clone', rule.rule_id, 'as', newId);
  }
}

function closeModal() {
  showModal.value = false;
  selectedRule.value = null;
}

async function handleActivate(rule: RuleResponse) {
  if (confirm(`Activate rule ${rule.rule_id}?`)) {
    const result = await activateRule(rule.rule_id);
    if (result) {
      fetchRules(currentFilters.value);
    }
  }
}

async function handleDeactivate(rule: RuleResponse) {
  if (confirm(`Deactivate rule ${rule.rule_id}?`)) {
    const result = await deactivateRule(rule.rule_id);
    if (result) {
      fetchRules(currentFilters.value);
    }
  }
}

async function handleDelete(rule: RuleResponse) {
  if (confirm(`Delete rule ${rule.rule_id}? This cannot be undone.`)) {
    const result = await deleteRule(rule.rule_id);
    if (result) {
      fetchRules(currentFilters.value);
    }
  }
}

function handleFilter(filters: Record<string, string>) {
  currentFilters.value = { ...currentFilters.value, ...filters, page: 1 };
  fetchRules(currentFilters.value);
}

function handlePageChange(page: number) {
  currentFilters.value.page = page;
  fetchRules(currentFilters.value);
}

function exportRules() {
  const functionsUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
  const token = localStorage.getItem('access_token');
  window.open(`${functionsUrl}/rules/export?status=all`, '_blank');
}
</script>

<style scoped>
.rules-management {
  min-height: 100vh;
  background: #1a1a2e;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-content {
  flex: 1;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #60a5fa;
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.back-link:hover {
  color: #93c5fd;
}

h1 {
  color: #f3f4f6;
  font-size: 1.75rem;
  margin: 0;
}

.subtitle {
  color: #9ca3af;
  margin: 0.25rem 0 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.primary-btn,
.secondary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn {
  background: #3b82f6;
  color: white;
  border: none;
}

.primary-btn:hover {
  background: #2563eb;
}

.secondary-btn {
  background: #374151;
  color: #f3f4f6;
  border: 1px solid #4b5563;
}

.secondary-btn:hover {
  background: #4b5563;
}

.primary-btn svg,
.secondary-btn svg {
  width: 1rem;
  height: 1rem;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background: #1f2937;
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  color: #f3f4f6;
  margin: 0 0 1rem;
}

.placeholder {
  color: #9ca3af;
  padding: 2rem;
  text-align: center;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #374151;
}
</style>
```

### Step 5: Add Route

```typescript
// apps/web/src/router/index.ts

// Add import
import RulesManagement from '@/pages/RulesManagement.vue';

// Add route
{
  path: '/rules',
  name: 'Rules',
  component: RulesManagement,
  meta: { requiresAuth: true }
},
```

### Step 6: Add Navigation Link

Add a link to Rules Management in the app header.

---

## Test Cases

### TC-6.7.1: Rules Page Loads

Navigate to `/rules` in the browser.

Expected: Rules list displayed with filters

### TC-6.7.2: Filter by Status

Select "Active" in status filter.

Expected: Only active rules displayed

### TC-6.7.3: Search Works

Type "VEH" in search box.

Expected: Only rules with "VEH" in ID or name shown

### TC-6.7.4: Activate Rule

Click activate button on a draft rule.

Expected: Confirmation dialog, rule becomes active

### TC-6.7.5: Deactivate Rule

Click deactivate button on active rule.

Expected: Confirmation dialog, rule becomes inactive

### TC-6.7.6: Clone Rule

Click clone button, enter new ID.

Expected: New rule created as draft

### TC-6.7.7: Delete Rule

Click delete on inactive rule.

Expected: Confirmation dialog, rule removed

### TC-6.7.8: Pagination

Navigate through pages.

Expected: Different rules on each page

---

## Validation Criteria

- [ ] useRules composable created with all methods
- [ ] RuleStatusBadge displays correct states
- [ ] RulesList shows rules with all columns
- [ ] Filtering works for all parameters
- [ ] Search filters locally
- [ ] Pagination works
- [ ] Activate/Deactivate/Clone/Delete work
- [ ] Route configured
- [ ] Navigation link added

---

## Completion Checklist

When this task is complete:
1. All components created
2. Composable with all API methods
3. Route configured
4. Navigation integrated
5. All actions working
6. All test cases passing

**Mark as complete**: Update tracker status to `[x] Complete`
