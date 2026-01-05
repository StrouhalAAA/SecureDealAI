<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="handleCancel">
        <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-header">
            <h2 id="modal-title" class="modal-title">Klonovat pravidlo</h2>
          </div>

          <form @submit.prevent="handleConfirm" class="modal-body">
            <p class="info-text">
              Vytvoří se kopie pravidla <strong>{{ rule?.rule_id }}</strong> s novým ID.
            </p>

            <div class="form-group">
              <label :for="newIdInputId" class="form-label">
                Nové ID pravidla <span class="required">*</span>
              </label>
              <input
                :id="newIdInputId"
                ref="newIdInput"
                v-model="newRuleId"
                type="text"
                class="form-input font-mono uppercase"
                :class="{
                  'has-error': touched && !isValidId
                }"
                placeholder="VEH-032"
                @blur="touched = true"
              />
              <p v-if="touched && !isValidId" class="error-text">
                Formát: XXX-NNN (např. VEH-001)
              </p>
              <p v-else class="help-text">Formát: XXX-NNN</p>
            </div>

            <div class="form-group">
              <label :for="newNameInputId" class="form-label">
                Nový název pravidla <span class="required">*</span>
              </label>
              <input
                :id="newNameInputId"
                v-model="newName"
                type="text"
                class="form-input"
                :class="{
                  'has-error': touched && !isValidName
                }"
                placeholder="Kopie: VIN Match Rule"
                @blur="touched = true"
              />
              <p v-if="touched && !isValidName" class="error-text">
                Název musí mít 3-100 znaků
              </p>
            </div>
          </form>

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
              class="btn-primary"
              :disabled="loading || !isValid"
              @click="handleConfirm"
            >
              <svg v-if="loading" class="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <svg v-else viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
              </svg>
              {{ loading ? 'Klonuji...' : 'Klonovat' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { RuleResponse } from '@/composables/useRules';

const props = defineProps<{
  modelValue: boolean;
  rule: RuleResponse | null;
  loading?: boolean;
  existingRules?: RuleResponse[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [data: { newRuleId: string; newName: string }];
  cancel: [];
}>();

// Generate unique IDs
const uniqueId = Math.random().toString(36).substr(2, 9);
const newIdInputId = `new-id-${uniqueId}`;
const newNameInputId = `new-name-${uniqueId}`;

const newIdInput = ref<HTMLInputElement | null>(null);
const newRuleId = ref('');
const newName = ref('');
const touched = ref(false);

// Validation
const RULE_ID_PATTERN = /^[A-Z]{2,4}-\d{3}$/;

const isValidId = computed(() => RULE_ID_PATTERN.test(newRuleId.value));
const isValidName = computed(() => newName.value.length >= 3 && newName.value.length <= 100);
const isValid = computed(() => isValidId.value && isValidName.value);

// Suggest next available rule ID
function suggestNextRuleId(): string {
  if (!props.rule?.rule_id) return '';

  const match = props.rule.rule_id.match(/^([A-Z]{2,4})-(\d{3})$/);
  if (!match) return '';

  const prefix = match[1];
  const existingNumbers = (props.existingRules || [])
    .map(r => {
      const m = r.rule_id.match(new RegExp(`^${prefix}-(\\d{3})$`));
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(n => n > 0);

  const nextNum = existingNumbers.length > 0
    ? Math.max(...existingNumbers) + 1
    : parseInt(match[2], 10) + 1;

  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

// Initialize values when modal opens
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.rule) {
    newRuleId.value = suggestNextRuleId();
    newName.value = `Kopie: ${props.rule.rule_name}`;
    touched.value = false;

    await nextTick();
    newIdInput.value?.focus();
    newIdInput.value?.select();
  }
});

function handleCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}

function handleConfirm() {
  touched.value = true;
  if (!isValid.value) return;

  emit('confirm', {
    newRuleId: newRuleId.value.toUpperCase(),
    newName: newName.value,
  });
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

.info-text {
  font-size: 0.9375rem;
  color: #374151;
  margin: 0 0 1.25rem 0;
}

.info-text strong {
  font-weight: 600;
  color: #111827;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.375rem;
}

.form-label .required {
  color: #EF4444;
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #D1D5DB;
  border-radius: 0.5rem;
  background: white;
  outline: none;
  transition: all 0.15s;
}

.form-input:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input.has-error {
  border-color: #EF4444;
  background: #FEF2F2;
}

.form-input.has-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-input.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
}

.form-input.uppercase {
  text-transform: uppercase;
}

.help-text {
  font-size: 0.75rem;
  color: #6B7280;
  margin-top: 0.25rem;
}

.error-text {
  font-size: 0.75rem;
  color: #EF4444;
  margin-top: 0.25rem;
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
.btn-primary {
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

.btn-primary {
  background: #2563EB;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #1D4ED8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary svg {
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
