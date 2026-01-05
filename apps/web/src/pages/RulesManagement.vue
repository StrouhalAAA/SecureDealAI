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
