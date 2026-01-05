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
          <h1 class="page-title">Nové pravidlo</h1>
          <p class="page-subtitle">Vytvořte nové validační pravidlo</p>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="page-content">
      <RuleForm
        mode="create"
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
import { ref } from 'vue';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import RuleForm from '@/components/rules/RuleForm.vue';
import type { RuleResponse } from '@/composables/useRules';

const router = useRouter();

const isDirty = ref(false);
const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' });

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 3000);
}

function handleBack() {
  if (isDirty.value) {
    const confirm = window.confirm('Máte neuložené změny. Opravdu chcete odejít?');
    if (!confirm) return;
  }
  router.push('/rules');
}

function handleSaved(rule: RuleResponse) {
  isDirty.value = false;
  showToast(`Pravidlo ${rule.rule_id} bylo vytvořeno`, 'success');
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
