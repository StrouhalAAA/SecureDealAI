<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
      variantClasses,
      sizeClasses,
      { 'opacity-50 cursor-not-allowed': disabled || loading },
    ]"
    :aria-busy="loading"
    :aria-disabled="disabled || loading"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="animate-spin"
      :class="spinnerSizeClass"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
        class="opacity-25"
      />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        class="opacity-75"
      />
    </svg>

    <!-- Loading text or slot content -->
    <span v-if="loading" role="status">
      {{ loadingText }}
    </span>
    <slot v-else></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
    loadingText?: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    loading: false,
    disabled: false,
    loadingText: 'Zpracovavam...',
    variant: 'primary',
    size: 'md',
    type: 'button',
  }
);

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    case 'secondary':
      return 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400';
    case 'danger':
      return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
    case 'outline':
      return 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300';
    case 'ghost':
      return 'text-gray-700 hover:bg-gray-100 focus:ring-gray-300';
    default:
      return '';
  }
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-sm py-1.5 px-3';
    case 'lg':
      return 'text-lg py-3 px-6';
    case 'md':
    default:
      return 'text-base py-2 px-4';
  }
});

const spinnerSizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-3 w-3';
    case 'lg':
      return 'h-5 w-5';
    case 'md':
    default:
      return 'h-4 w-4';
  }
});
</script>
