<template>
  <div class="rule-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBack" title="Zpět na seznam">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </button>
        <div>
          <h1 class="page-title">Upravit pravidlo {{ ruleId }}</h1>
          <p class="page-subtitle">{{ rule?.rule_name || 'Načítám...' }}</p>
        </div>
      </div>
      <div v-if="rule" class="header-right">
        <RuleStatusBadge :is-active="rule.is_active" :is-draft="rule.is_draft" />
      </div>
    </header>

    <!-- Main Content -->
    <main class="page-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner-container">
          <svg class="spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p>Načítám pravidlo...</p>
      </div>

      <!-- Not Found State -->
      <div v-else-if="notFound" class="not-found-state">
        <svg class="not-found-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2>Pravidlo nenalezeno</h2>
        <p>Pravidlo s ID "{{ ruleId }}" neexistuje.</p>
        <router-link to="/rules" class="back-link">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          Zpět na seznam pravidel
        </router-link>
      </div>

      <!-- Edit Form -->
      <RuleForm
        v-else-if="rule"
        mode="edit"
        :rule-id="ruleId"
        :initial-data="formData"
        @saved="handleSaved"
        @cancel="handleCancel"
        @dirty="isDirty = $event"
      />
    </main>

    <!-- Toast -->
    <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import RuleForm from '@/components/rules/RuleForm.vue';
import RuleStatusBadge from '@/components/rules/RuleStatusBadge.vue';
import { useRules, type RuleResponse, type TransformType, type ComparatorType, type CategoryType, type SeverityType, type VendorType, type BuyingType } from '@/composables/useRules';

const router = useRouter();
const route = useRoute();

const { getRule } = useRules();

const ruleId = computed(() => route.params.id as string);

const rule = ref<RuleResponse | null>(null);
const loading = ref(true);
const notFound = ref(false);
const isDirty = ref(false);
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' });

// Transform API response to form data structure
const formData = computed(() => {
  if (!rule.value) return undefined;

  const r = rule.value;

  // Parse transforms from API format
  const sourceTransforms: TransformType[] = [];
  const targetTransforms: TransformType[] = [];

  if (r.transform && Array.isArray(r.transform)) {
    r.transform.forEach((t: { type: string; target?: string }) => {
      if (t.target === 'target') {
        targetTransforms.push(t.type as TransformType);
      } else {
        sourceTransforms.push(t.type as TransformType);
      }
    });
  }

  return {
    rule_id: r.rule_id,
    name: r.rule_name,
    description: r.description || '',
    source: {
      entity: r.source_entity,
      field: r.source_field,
      transforms: sourceTransforms,
    },
    target: {
      entity: r.target_entity,
      field: r.target_field,
      transforms: targetTransforms,
    },
    comparison: {
      type: r.comparator as ComparatorType,
      ...r.comparator_params,
    },
    severity: r.severity as SeverityType,
    blockOnFail: r.severity === 'CRITICAL',
    errorMessage: {
      cs: r.error_message,
      en: '',
    },
    metadata: {
      category: '' as CategoryType | '',
      phase: '' as 'mvp' | 'phase2' | 'future' | '',
      applicableTo: (r.applies_to?.vendor_type || []) as VendorType[],
      applicableToBuyingType: (r.applies_to?.buying_type || []) as BuyingType[],
      tags: [],
    },
  };
});

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 3000);
}

async function loadRule() {
  loading.value = true;
  notFound.value = false;

  try {
    const result = await getRule(ruleId.value);
    if (result) {
      rule.value = result;
    } else {
      notFound.value = true;
    }
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
}

function handleBack() {
  if (isDirty.value) {
    const confirm = window.confirm('Máte neuložené změny. Opravdu chcete odejít?');
    if (!confirm) return;
  }
  router.push('/rules');
}

function handleSaved(updatedRule: RuleResponse) {
  isDirty.value = false;
  showToast(`Pravidlo ${updatedRule.rule_id} bylo uloženo`, 'success');
  setTimeout(() => {
    router.push('/rules');
  }, 1000);
}

function handleCancel() {
  handleBack();
}

// Navigation guard for unsaved changes
onBeforeRouteLeave(() => {
  if (isDirty.value) {
    const confirm = window.confirm('Máte neuložené změny. Opravdu chcete odejít?');
    if (!confirm) return false;
  }
  return true;
});

onMounted(() => {
  loadRule();
});
</script>

<style scoped>
.rule-page {
  min-height: 100vh;
  background: #F9FAFB;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #E5E7EB;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: #6B7280;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.15s;
}

.back-btn:hover {
  background: #F3F4F6;
  color: #374151;
}

.back-btn svg {
  width: 1.25rem;
  height: 1.25rem;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #6B7280;
  margin: 0.25rem 0 0 0;
}

.page-content {
  padding: 1.5rem;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.spinner-container {
  margin-bottom: 1rem;
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  color: #2563EB;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 0.875rem;
  color: #6B7280;
}

/* Not Found State */
.not-found-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.not-found-icon {
  width: 4rem;
  height: 4rem;
  color: #D1D5DB;
  margin-bottom: 1rem;
}

.not-found-state h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.not-found-state p {
  font-size: 0.875rem;
  color: #6B7280;
  margin: 0 0 1.5rem 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #2563EB;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.back-link svg {
  width: 1rem;
  height: 1rem;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 50;
  animation: slideIn 0.3s ease;
}

.toast-success {
  background: #D1FAE5;
  color: #065F46;
}

.toast-error {
  background: #FEE2E2;
  color: #991B1B;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
