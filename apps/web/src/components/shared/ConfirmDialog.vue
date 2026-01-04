<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center"
        @keydown.escape="cancel"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black bg-opacity-50"
          @click="cancel"
        ></div>

        <!-- Dialog -->
        <div
          class="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
          role="alertdialog"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
        >
          <!-- Icon -->
          <div v-if="variant === 'danger'" class="mb-4 flex justify-center">
            <div class="p-3 bg-red-100 rounded-full">
              <svg
                class="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <div v-else-if="variant === 'warning'" class="mb-4 flex justify-center">
            <div class="p-3 bg-yellow-100 rounded-full">
              <svg
                class="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h3
            :id="titleId"
            class="text-lg font-bold text-center mb-2"
          >
            {{ title }}
          </h3>

          <!-- Message -->
          <p
            :id="messageId"
            class="text-gray-600 text-center mb-6"
          >
            {{ message }}
          </p>

          <!-- Buttons -->
          <div class="flex justify-center gap-3">
            <button
              ref="cancelButtonRef"
              @click="cancel"
              class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {{ cancelLabel }}
            </button>
            <button
              @click="confirm"
              :class="[
                'px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2',
                confirmButtonClasses,
              ]"
              :disabled="loading"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg
                  class="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
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
                Zpracovavam...
              </span>
              <span v-else>{{ confirmLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'danger' | 'warning';
    loading?: boolean;
  }>(),
  {
    confirmLabel: 'Potvrdit',
    cancelLabel: 'Zrusit',
    variant: 'default',
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const cancelButtonRef = ref<HTMLButtonElement | null>(null);

// Generate unique IDs for accessibility
const titleId = `dialog-title-${Math.random().toString(36).substr(2, 9)}`;
const messageId = `dialog-message-${Math.random().toString(36).substr(2, 9)}`;

// Store the element that had focus before opening
let previousActiveElement: Element | null = null;

const confirmButtonClasses = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
    case 'warning':
      return 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400';
    default:
      return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
  }
});

function confirm() {
  emit('confirm');
}

function cancel() {
  if (!props.loading) {
    emit('update:modelValue', false);
    emit('cancel');
  }
}

// Focus management
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      // Store current focus
      previousActiveElement = document.activeElement;

      // Focus the cancel button after render
      await nextTick();
      cancelButtonRef.value?.focus();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';

      // Return focus to previous element
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    }
  }
);

// Cleanup on unmount
onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative {
  transform: scale(0.95);
}

.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
