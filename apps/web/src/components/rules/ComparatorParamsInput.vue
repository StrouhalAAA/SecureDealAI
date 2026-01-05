<template>
  <div class="comparator-params">
    <!-- No params needed for these comparators -->
    <div v-if="!needsParams" class="no-params">
      <span class="no-params-text">Tento typ porovnání nevyžaduje další parametry</span>
    </div>

    <!-- FUZZY: threshold slider -->
    <div v-else-if="comparatorType === 'FUZZY'" class="param-group">
      <label :for="thresholdId" class="param-label">
        Práh shody (threshold)
        <span class="param-value">{{ thresholdDisplay }}</span>
      </label>
      <input
        :id="thresholdId"
        type="range"
        min="0"
        max="1"
        step="0.05"
        :value="thresholdValue"
        class="slider"
        @input="updateThreshold"
      />
      <div class="slider-labels">
        <span>0.0 (volnější)</span>
        <span>1.0 (přesný)</span>
      </div>
      <p class="param-help">
        Hodnota 0.8 znamená 80% shoda. Vyšší hodnota = přísnější porovnání.
      </p>
    </div>

    <!-- NUMERIC_TOLERANCE: tolerance number -->
    <div v-else-if="comparatorType === 'NUMERIC_TOLERANCE'" class="param-group">
      <label :for="toleranceId" class="param-label">
        Tolerance (absolutní rozdíl)
      </label>
      <input
        :id="toleranceId"
        type="number"
        min="0"
        step="1"
        :value="toleranceValue"
        placeholder="např. 100"
        class="number-input"
        @input="updateTolerance"
      />
      <p class="param-help">
        Povolený rozdíl mezi hodnotami. Např. tolerance 100 znamená, že hodnoty 1000 a 1050 budou považovány za shodné.
      </p>
    </div>

    <!-- DATE_TOLERANCE: tolerance in days -->
    <div v-else-if="comparatorType === 'DATE_TOLERANCE'" class="param-group">
      <label :for="toleranceId" class="param-label">
        Tolerance (dny)
      </label>
      <input
        :id="toleranceId"
        type="number"
        min="0"
        step="1"
        :value="toleranceValue"
        placeholder="např. 30"
        class="number-input"
        @input="updateTolerance"
      />
      <p class="param-help">
        Povolený rozdíl v dnech. Např. tolerance 30 znamená, že data do 30 dnů od sebe budou považována za shodná.
      </p>
    </div>

    <!-- REGEX: pattern input -->
    <div v-else-if="comparatorType === 'REGEX'" class="param-group">
      <label :for="patternId" class="param-label">
        Regulární výraz (pattern) <span class="required">*</span>
      </label>
      <div class="pattern-wrapper">
        <span class="pattern-prefix">/</span>
        <input
          :id="patternId"
          type="text"
          :value="patternValue"
          placeholder="^[A-Z]{2,4}-\\d{3}$"
          class="pattern-input"
          :class="{ 'has-error': patternError }"
          @input="updatePattern"
        />
        <span class="pattern-suffix">/</span>
      </div>
      <p v-if="patternError" class="error-text">{{ patternError }}</p>
      <p v-else class="param-help">
        Regulární výraz pro validaci hodnoty. Např. <code>^[A-Z]{2,4}-\d{3}$</code> pro formát VEH-001.
      </p>
    </div>

    <!-- IN_LIST: allowed values -->
    <div v-else-if="comparatorType === 'IN_LIST'" class="param-group">
      <label class="param-label">
        Povolené hodnoty <span class="required">*</span>
      </label>
      <TagInput
        :model-value="allowedValuesArray"
        placeholder="Přidejte hodnotu a stiskněte Enter..."
        :allow-custom="true"
        :has-error="allowedValuesError !== null"
        :error-message="allowedValuesError || undefined"
        @update:model-value="updateAllowedValues"
      />
      <p v-if="!allowedValuesError" class="param-help">
        Seznam povolených hodnot. Zdrojová hodnota musí být jedna z těchto.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ComparatorType } from '@/composables/useRules';
import TagInput from '@/components/shared/TagInput.vue';

const props = defineProps<{
  comparatorType: ComparatorType;
  modelValue: Record<string, unknown>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>];
}>();

// Generate unique IDs
const uniqueId = Math.random().toString(36).substr(2, 9);
const thresholdId = `threshold-${uniqueId}`;
const toleranceId = `tolerance-${uniqueId}`;
const patternId = `pattern-${uniqueId}`;

// Check if this comparator needs params
const needsParams = computed(() => {
  return ['FUZZY', 'NUMERIC_TOLERANCE', 'DATE_TOLERANCE', 'REGEX', 'IN_LIST'].includes(props.comparatorType);
});

// FUZZY threshold
const thresholdValue = computed(() => {
  return (props.modelValue.threshold as number) ?? 0.8;
});

const thresholdDisplay = computed(() => {
  return thresholdValue.value.toFixed(2);
});

function updateThreshold(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value);
  emit('update:modelValue', { ...props.modelValue, threshold: value });
}

// NUMERIC_TOLERANCE and DATE_TOLERANCE
const toleranceValue = computed(() => {
  return props.modelValue.tolerance as number | undefined;
});

function updateTolerance(event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value);
  emit('update:modelValue', {
    ...props.modelValue,
    tolerance: isNaN(value) ? undefined : value,
  });
}

// REGEX pattern
const patternValue = computed(() => {
  return (props.modelValue.pattern as string) ?? '';
});

const patternError = computed(() => {
  if (props.comparatorType !== 'REGEX') return null;
  if (!patternValue.value) return 'Zadejte regulární výraz';

  try {
    new RegExp(patternValue.value);
    return null;
  } catch {
    return 'Neplatný regulární výraz';
  }
});

function updatePattern(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit('update:modelValue', { ...props.modelValue, pattern: value });
}

// IN_LIST allowed values
const allowedValuesArray = computed(() => {
  const values = props.modelValue.allowedValues;
  if (Array.isArray(values)) return values as string[];
  return [];
});

const allowedValuesError = computed(() => {
  if (props.comparatorType !== 'IN_LIST') return null;
  if (allowedValuesArray.value.length === 0) return 'Zadejte alespoň jednu povolenou hodnotu';
  return null;
});

function updateAllowedValues(values: string[]) {
  emit('update:modelValue', { ...props.modelValue, allowedValues: values });
}
</script>

<style scoped>
.comparator-params {
  margin-top: 0.75rem;
}

.no-params {
  padding: 0.75rem;
  background: #F9FAFB;
  border-radius: 0.5rem;
  text-align: center;
}

.no-params-text {
  font-size: 0.875rem;
  color: #6B7280;
}

.param-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.param-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.param-label .required {
  color: #EF4444;
}

.param-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2563EB;
  background: #EFF6FF;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
}

.slider {
  width: 100%;
  height: 0.5rem;
  background: #E5E7EB;
  border-radius: 0.25rem;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  background: #2563EB;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
}

.slider::-moz-range-thumb {
  width: 1.25rem;
  height: 1.25rem;
  background: #2563EB;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #9CA3AF;
}

.number-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #D1D5DB;
  border-radius: 0.5rem;
  outline: none;
  transition: all 0.15s;
}

.number-input:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.pattern-wrapper {
  display: flex;
  align-items: center;
}

.pattern-prefix,
.pattern-suffix {
  padding: 0.5rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 1rem;
  color: #6B7280;
  background: #F3F4F6;
  border: 1px solid #D1D5DB;
}

.pattern-prefix {
  border-right: none;
  border-radius: 0.5rem 0 0 0.5rem;
}

.pattern-suffix {
  border-left: none;
  border-radius: 0 0.5rem 0.5rem 0;
}

.pattern-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 0.875rem;
  border: 1px solid #D1D5DB;
  outline: none;
  transition: all 0.15s;
}

.pattern-input:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.pattern-input.has-error {
  border-color: #EF4444;
}

.pattern-input.has-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.param-help {
  font-size: 0.75rem;
  color: #6B7280;
  margin-top: 0.25rem;
}

.param-help code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 0.75rem;
  background: #F3F4F6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

.error-text {
  font-size: 0.75rem;
  color: #EF4444;
  margin-top: 0.25rem;
}
</style>
