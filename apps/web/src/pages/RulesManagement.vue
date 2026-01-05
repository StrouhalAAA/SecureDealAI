<template>
  <div class="rules-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/')">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </button>
        <div>
          <h1 class="page-title">Validační pravidla</h1>
          <p class="page-subtitle">Správa a konfigurace pravidel pro validaci dat</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" disabled title="Připravuje se">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          Export
        </button>
        <button class="btn-secondary" disabled title="Připravuje se">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          Import
        </button>
        <button class="btn-primary" @click="$router.push('/rules/new')">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          Nové pravidlo
        </button>
      </div>
    </header>

    <!-- Stats Bar -->
    <RulesStatsBar :rules="rules" />

    <!-- Main Content -->
    <main class="page-content">
      <div v-if="error" class="error-banner">
        <p>{{ error }}</p>
        <button @click="loadRules">Zkusit znovu</button>
      </div>

      <RulesList
        :rules="rules"
        :loading="loading"
        :pagination="pagination"
        @edit="handleEdit"
        @activate="handleActivate"
        @deactivate="handleDeactivate"
        @clone="handleClone"
        @delete="handleDelete"
        @filter="handleFilter"
        @page="handlePageChange"
      />
    </main>

    <!-- Delete Modal -->
    <DeleteRuleModal
      v-model="showDeleteModal"
      :rule="selectedRule"
      :loading="modalLoading"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- Clone Modal -->
    <CloneRuleModal
      v-model="showCloneModal"
      :rule="selectedRule"
      :loading="modalLoading"
      :existing-rules="rules"
      @confirm="confirmClone"
      @cancel="showCloneModal = false"
    />

    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRules, type RuleResponse } from '@/composables/useRules';
import RulesStatsBar from '@/components/rules/RulesStatsBar.vue';
import RulesList from '@/components/rules/RulesList.vue';
import DeleteRuleModal from '@/components/rules/DeleteRuleModal.vue';
import CloneRuleModal from '@/components/rules/CloneRuleModal.vue';

const router = useRouter();

const { rules, loading, error, pagination, fetchRules, activateRule, deactivateRule, deleteRule, cloneRule } = useRules();

const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' });

// Modal state
const showDeleteModal = ref(false);
const showCloneModal = ref(false);
const selectedRule = ref<RuleResponse | null>(null);
const modalLoading = ref(false);

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 3000);
}

async function loadRules() {
  await fetchRules({ status: 'all' });
}

onMounted(() => { loadRules(); });

function handleEdit(rule: RuleResponse) {
  router.push(`/rules/${rule.rule_id}/edit`);
}

async function handleActivate(rule: RuleResponse) {
  const result = await activateRule(rule.rule_id);
  if (result) {
    showToast(`Pravidlo ${rule.rule_id} bylo aktivováno`, 'success');
    await loadRules();
  } else {
    showToast(`Aktivace pravidla ${rule.rule_id} selhala`, 'error');
  }
}

async function handleDeactivate(rule: RuleResponse) {
  const result = await deactivateRule(rule.rule_id);
  if (result) {
    showToast(`Pravidlo ${rule.rule_id} bylo deaktivováno`, 'success');
    await loadRules();
  } else {
    showToast(`Deaktivace pravidla ${rule.rule_id} selhala`, 'error');
  }
}

function handleClone(rule: RuleResponse) {
  selectedRule.value = rule;
  showCloneModal.value = true;
}

async function confirmClone(data: { newRuleId: string; newName: string }) {
  if (!selectedRule.value) return;

  modalLoading.value = true;
  const result = await cloneRule(selectedRule.value.rule_id, data.newRuleId, data.newName);
  modalLoading.value = false;

  if (result) {
    showToast(`Pravidlo naklonováno jako ${data.newRuleId}`, 'success');
    showCloneModal.value = false;
    selectedRule.value = null;
    // Navigate to edit the new clone
    router.push(`/rules/${data.newRuleId}/edit`);
  } else {
    showToast('Klonování pravidla selhalo', 'error');
  }
}

function handleDelete(rule: RuleResponse) {
  selectedRule.value = rule;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!selectedRule.value) return;

  modalLoading.value = true;
  const success = await deleteRule(selectedRule.value.rule_id);
  modalLoading.value = false;

  if (success) {
    showToast(`Pravidlo ${selectedRule.value.rule_id} bylo smazáno`, 'success');
    showDeleteModal.value = false;
    selectedRule.value = null;
    await loadRules();
  } else {
    showToast('Smazání pravidla selhalo', 'error');
  }
}

function handleFilter(filters: Record<string, string>) {
  fetchRules({
    status: filters.status as 'active' | 'draft' | 'all',
    source_entity: filters.source_entity,
    severity: filters.severity,
  });
}

function handlePageChange(page: number) {
  fetchRules({ page });
}
</script>

<style scoped>
.rules-page { min-height: 100vh; background: #F9FAFB; }

.page-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: white; border-bottom: 1px solid #E5E7EB; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.header-left { display: flex; align-items: center; gap: 1rem; }
.back-btn { padding: 0.5rem; background: transparent; border: none; color: #6B7280; cursor: pointer; border-radius: 0.375rem; }
.back-btn:hover { background: #F3F4F6; color: #374151; }
.back-btn svg { width: 1.25rem; height: 1.25rem; }
.page-title { font-size: 1.25rem; font-weight: 600; color: #111827; margin: 0; }
.page-subtitle { font-size: 0.875rem; color: #6B7280; margin: 0.25rem 0 0 0; }

.header-actions { display: flex; gap: 0.75rem; }
.btn-secondary, .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.btn-secondary { background: white; color: #374151; border: 1px solid #D1D5DB; }
.btn-secondary:hover:not(:disabled) { background: #F9FAFB; }
.btn-secondary:disabled, .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #2563EB; color: white; border: none; }
.btn-primary:hover:not(:disabled) { background: #1D4ED8; }
.btn-secondary svg, .btn-primary svg { width: 1rem; height: 1rem; }

.page-content { padding: 1.5rem; }

.error-banner { display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 1rem; background: #FEE2E2; border: 1px solid #FECACA; border-radius: 0.5rem; color: #991B1B; }
.error-banner button { padding: 0.375rem 0.75rem; background: white; color: #991B1B; border: 1px solid #FECACA; border-radius: 0.375rem; cursor: pointer; }

.toast { position: fixed; bottom: 1.5rem; right: 1.5rem; padding: 1rem 1.5rem; border-radius: 0.5rem; font-weight: 500; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 50; animation: slideIn 0.3s ease; }
.toast-success { background: #D1FAE5; color: #065F46; }
.toast-error { background: #FEE2E2; color: #991B1B; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
</style>
