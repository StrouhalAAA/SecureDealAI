<template>
  <div class="tag-input-container">
    <label v-if="label" :for="inputId" class="tag-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>

    <div
      class="tag-input-wrapper"
      :class="{ 'focused': isFocused, 'has-error': hasError }"
      @click="focusInput"
    >
      <!-- Existing tags -->
      <span
        v-for="(tag, index) in modelValue"
        :key="tag"
        class="tag"
      >
        {{ tag }}
        <button
          type="button"
          class="tag-remove"
          @click.stop="removeTag(index)"
          :aria-label="`Odebrat ${tag}`"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </span>

      <!-- Input field -->
      <input
        ref="inputRef"
        :id="inputId"
        v-model="inputValue"
        type="text"
        :placeholder="modelValue.length === 0 ? placeholder : ''"
        :disabled="disabled || (maxTags !== undefined && modelValue.length >= maxTags)"
        class="tag-text-input"
        @keydown="handleKeydown"
        @focus="isFocused = true; showSuggestions = true"
        @blur="handleBlur"
        :aria-describedby="helpTextId"
      />
    </div>

    <!-- Suggestions dropdown -->
    <ul
      v-if="showSuggestions && filteredSuggestions.length > 0"
      class="suggestions-dropdown"
      role="listbox"
    >
      <li
        v-for="(suggestion, index) in filteredSuggestions"
        :key="suggestion"
        class="suggestion-item"
        :class="{ 'highlighted': highlightedIndex === index }"
        role="option"
        :aria-selected="highlightedIndex === index"
        @mousedown.prevent="selectSuggestion(suggestion)"
        @mouseenter="highlightedIndex = index"
      >
        {{ suggestion }}
      </li>
    </ul>

    <p v-if="helpText" :id="helpTextId" class="help-text">{{ helpText }}</p>
    <p v-if="hasError && errorMessage" class="error-text">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: string[];
  label?: string;
  placeholder?: string;
  maxTags?: number;
  allowCustom?: boolean;
  suggestions?: string[];
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}>(), {
  placeholder: 'Přidat...',
  allowCustom: true,
  suggestions: () => [],
  required: false,
  disabled: false,
  hasError: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref('');
const isFocused = ref(false);
const showSuggestions = ref(false);
const highlightedIndex = ref(-1);

// Generate unique IDs
const uniqueId = Math.random().toString(36).substr(2, 9);
const inputId = `tag-input-${uniqueId}`;
const helpTextId = `tag-help-${uniqueId}`;

const filteredSuggestions = computed(() => {
  if (!props.suggestions.length) return [];

  const search = inputValue.value.toLowerCase();
  return props.suggestions.filter(
    s => !props.modelValue.includes(s) &&
        (search === '' || s.toLowerCase().includes(search))
  );
});

watch(inputValue, () => {
  highlightedIndex.value = -1;
});

function focusInput() {
  inputRef.value?.focus();
}

function addTag(tag: string) {
  const trimmed = tag.trim();
  if (!trimmed) return;
  if (props.maxTags && props.modelValue.length >= props.maxTags) return;
  if (props.modelValue.includes(trimmed)) return;

  // Check if custom tags are allowed when not in suggestions
  if (!props.allowCustom && !props.suggestions.includes(trimmed)) return;

  emit('update:modelValue', [...props.modelValue, trimmed]);
  inputValue.value = '';
  highlightedIndex.value = -1;
}

function removeTag(index: number) {
  const newTags = [...props.modelValue];
  newTags.splice(index, 1);
  emit('update:modelValue', newTags);
}

function selectSuggestion(suggestion: string) {
  addTag(suggestion);
  showSuggestions.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredSuggestions.value.length) {
        selectSuggestion(filteredSuggestions.value[highlightedIndex.value]);
      } else if (inputValue.value.trim()) {
        addTag(inputValue.value);
      }
      break;

    case 'Backspace':
      if (inputValue.value === '' && props.modelValue.length > 0) {
        removeTag(props.modelValue.length - 1);
      }
      break;

    case 'ArrowDown':
      event.preventDefault();
      if (filteredSuggestions.value.length > 0) {
        highlightedIndex.value = Math.min(
          highlightedIndex.value + 1,
          filteredSuggestions.value.length - 1
        );
        showSuggestions.value = true;
      }
      break;

    case 'ArrowUp':
      event.preventDefault();
      if (filteredSuggestions.value.length > 0) {
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
      }
      break;

    case 'Escape':
      showSuggestions.value = false;
      highlightedIndex.value = -1;
      break;
  }
}

function handleBlur() {
  isFocused.value = false;
  // Delay hiding suggestions to allow click events
  setTimeout(() => {
    showSuggestions.value = false;
    highlightedIndex.value = -1;
  }, 150);
}
</script>

<style scoped>
.tag-input-container {
  position: relative;
}

.tag-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.375rem;
}

.tag-label .required {
  color: #EF4444;
  margin-left: 0.125rem;
}

.tag-input-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem;
  min-height: 2.625rem;
  background: white;
  border: 1px solid #D1D5DB;
  border-radius: 0.5rem;
  cursor: text;
  transition: all 0.15s;
}

.tag-input-wrapper.focused {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.tag-input-wrapper.has-error {
  border-color: #EF4444;
}

.tag-input-wrapper.has-error.focused {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #EFF6FF;
  color: #1D4ED8;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 0.375rem;
  white-space: nowrap;
}

.tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  padding: 0;
  background: transparent;
  border: none;
  color: #3B82F6;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.15s;
}

.tag-remove:hover {
  background: #DBEAFE;
  color: #1D4ED8;
}

.tag-remove svg {
  width: 0.75rem;
  height: 0.75rem;
}

.tag-text-input {
  flex: 1;
  min-width: 6rem;
  padding: 0.25rem;
  border: none;
  outline: none;
  font-size: 0.875rem;
  background: transparent;
}

.tag-text-input::placeholder {
  color: #9CA3AF;
}

.tag-text-input:disabled {
  cursor: not-allowed;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  padding: 0.25rem;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  list-style: none;
  z-index: 50;
  max-height: 12rem;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  border-radius: 0.375rem;
}

.suggestion-item.highlighted,
.suggestion-item:hover {
  background: #F3F4F6;
}

.help-text {
  font-size: 0.75rem;
  color: #6B7280;
  margin-top: 0.375rem;
}

.error-text {
  font-size: 0.75rem;
  color: #EF4444;
  margin-top: 0.375rem;
}
</style>
