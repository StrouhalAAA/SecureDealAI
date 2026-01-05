<template>
  <div class="transform-select">
    <label v-if="label" class="select-label">{{ label }}</label>

    <!-- Transform chips grouped by category -->
    <div class="transform-categories">
      <div
        v-for="category in categories"
        :key="category.name"
        class="category-group"
      >
        <span class="category-label">{{ category.label }}</span>
        <div class="chips">
          <button
            v-for="transform in category.transforms"
            :key="transform"
            type="button"
            class="chip"
            :class="{
              'selected': modelValue.includes(transform),
              'disabled': disabled
            }"
            :disabled="disabled"
            @click="toggleTransform(transform)"
          >
            <svg
              v-if="modelValue.includes(transform)"
              class="check-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            {{ transform }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="helpText" class="help-text">{{ helpText }}</p>
  </div>
</template>

<script setup lang="ts">
import { TRANSFORM_TYPES, type TransformType } from '@/composables/useRules';

const props = withDefaults(defineProps<{
  modelValue: TransformType[];
  label?: string;
  helpText?: string;
  disabled?: boolean;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: TransformType[]];
}>();

// Group transforms by category for better UX
const categories = [
  {
    name: 'case',
    label: 'Velikost písmen',
    transforms: ['UPPERCASE', 'LOWERCASE'] as TransformType[],
  },
  {
    name: 'whitespace',
    label: 'Bílé znaky',
    transforms: ['TRIM', 'REMOVE_SPACES'] as TransformType[],
  },
  {
    name: 'text',
    label: 'Úprava textu',
    transforms: ['REMOVE_DIACRITICS', 'EXTRACT_NUMBER'] as TransformType[],
  },
  {
    name: 'formatting',
    label: 'Formátování',
    transforms: ['NORMALIZE_DATE', 'FORMAT_RC', 'FORMAT_ICO', 'FORMAT_DIC'] as TransformType[],
  },
  {
    name: 'normalization',
    label: 'Normalizace',
    transforms: ['ADDRESS_NORMALIZE', 'NAME_NORMALIZE', 'VIN_NORMALIZE', 'SPZ_NORMALIZE'] as TransformType[],
  },
];

// Verify all transforms are included (development check)
const allInCategories = categories.flatMap(c => c.transforms);
const missingTransforms = TRANSFORM_TYPES.filter(t => !allInCategories.includes(t));
if (missingTransforms.length > 0) {
  console.warn('Missing transforms in categories:', missingTransforms);
}

function toggleTransform(transform: TransformType) {
  if (props.disabled) return;

  const newValue = [...props.modelValue];
  const index = newValue.indexOf(transform);

  if (index >= 0) {
    newValue.splice(index, 1);
  } else {
    newValue.push(transform);
  }

  emit('update:modelValue', newValue);
}
</script>

<style scoped>
.transform-select {
  width: 100%;
}

.select-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.transform-categories {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.category-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  color: #4B5563;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover:not(.disabled) {
  background: #E5E7EB;
  border-color: #D1D5DB;
}

.chip.selected {
  color: #1D4ED8;
  background: #EFF6FF;
  border-color: #93C5FD;
}

.chip.selected:hover:not(.disabled) {
  background: #DBEAFE;
  border-color: #60A5FA;
}

.chip.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.check-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: #2563EB;
}

.help-text {
  font-size: 0.75rem;
  color: #6B7280;
  margin-top: 0.5rem;
}
</style>
