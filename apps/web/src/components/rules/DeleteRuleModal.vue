<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleCancel">
        <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-header">
            <h2 id="modal-title" class="modal-title">Smazat pravidlo?</h2>
          </div>

          <div class="modal-body">
            <div class="warning-icon">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>

            <p class="confirm-text">
              Opravdu chcete smazat pravidlo <strong>{{ rule?.rule_id }}</strong>?
            </p>

            <div v-if="rule" class="rule-details">
              <div class="detail-row">
                <span class="detail-label">Název:</span>
                <span class="detail-value">{{ rule.rule_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Stav:</span>
                <span class="detail-value">
                  <RuleStatusBadge :is-active="rule.is_active" :is-draft="rule.is_draft" />
                </span>
              </div>
            </div>

            <p class="danger-text">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              Tato akce je nevratná.
            </p>

            <!-- Warning for active rules -->
            <div v-if="rule?.is_active" class="active-warning">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>Aktivní pravidla nelze smazat. Nejprve pravidlo deaktivujte.</span>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn-secondary"
              :disabled="loading"
              @click="handleCancel"
            >
              Zrušit
            </button>
            <button
              type="button"
              class="btn-danger"
              :disabled="loading || rule?.is_active"
              @click="handleConfirm"
            >
              <svg v-if="loading" class="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <svg v-else viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              {{ loading ? 'Mažu...' : 'Smazat' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { RuleResponse } from '@/composables/useRules';
import RuleStatusBadge from './RuleStatusBadge.vue';

defineProps<{
  modelValue: boolean;
  rule: RuleResponse | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
  cancel: [];
}>();

function handleCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}

function handleConfirm() {
  emit('confirm');
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  padding: 1rem;
}

.modal-container {
  width: 100%;
  max-width: 28rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.modal-header {
  padding: 1.25rem 1.5rem 0;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-body {
  padding: 1.25rem 1.5rem;
}

.warning-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.warning-icon svg {
  width: 3rem;
  height: 3rem;
  color: #F59E0B;
}

.confirm-text {
  text-align: center;
  font-size: 0.9375rem;
  color: #374151;
  margin: 0 0 1rem 0;
}

.confirm-text strong {
  font-weight: 600;
  color: #111827;
}

.rule-details {
  background: #F9FAFB;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}

.detail-label {
  font-size: 0.875rem;
  color: #6B7280;
}

.detail-value {
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
}

.danger-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #DC2626;
  margin: 0;
}

.danger-text svg {
  width: 1rem;
  height: 1rem;
}

.active-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-top: 1rem;
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: #92400E;
}

.active-warning svg {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  color: #F59E0B;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: #F9FAFB;
  border-top: 1px solid #E5E7EB;
}

.btn-secondary,
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover:not(:disabled) {
  background: #F9FAFB;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #DC2626;
  color: white;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background: #B91C1C;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger svg {
  width: 1rem;
  height: 1rem;
}

/* Spinner */
.spinner {
  width: 1rem;
  height: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
