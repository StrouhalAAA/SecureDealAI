# Task 4.2: Error Handling & UX Polish

> **Phase**: 4 - Testing & Polish
> **Status**: [ ] Pending
> **Priority**: Medium
> **Depends On**: 4.1 E2E Testing
> **Estimated Effort**: Medium

---

## Objective

Improve error handling, loading states, and overall user experience across the application.

---

## Prerequisites

- [ ] Task 4.1 completed (E2E testing reveals edge cases)

---

## Error Handling Improvements

### API Error Categories

| Category | HTTP Status | User Message | Action |
|----------|-------------|--------------|--------|
| Validation | 400 | Specific field errors | Show inline |
| Not Found | 404 | "Záznam nenalezen" | Redirect to dashboard |
| Duplicate | 409 | "SPZ již existuje" | Show inline |
| Auth | 401/403 | "Přístup odepřen" | Redirect to login |
| Server | 500 | "Chyba serveru" | Retry option |
| Network | - | "Chyba připojení" | Retry option |
| Timeout | - | "Požadavek vypršel" | Retry option |

### Global Error Handler

```typescript
// src/composables/useErrorHandler.ts
export function useErrorHandler() {
  function handleError(error: unknown, context?: string): string {
    console.error(`Error in ${context}:`, error);

    if (error instanceof Response) {
      switch (error.status) {
        case 400:
          return 'Neplatná data';
        case 401:
          return 'Přístup odepřen - přihlaste se';
        case 403:
          return 'Nemáte oprávnění';
        case 404:
          return 'Záznam nenalezen';
        case 409:
          return 'Záznam již existuje';
        case 503:
          return 'Služba dočasně nedostupná';
        default:
          return 'Chyba serveru';
      }
    }

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return 'Chyba připojení k serveru';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Neznámá chyba';
  }

  return { handleError };
}
```

---

## Loading States

### Skeleton Loaders

```vue
<!-- src/components/shared/TableSkeleton.vue -->
<template>
  <div class="animate-pulse">
    <div class="h-10 bg-gray-200 rounded mb-2"></div>
    <div v-for="i in rows" :key="i" class="h-12 bg-gray-100 rounded mb-1"></div>
  </div>
</template>

<script setup>
defineProps({ rows: { type: Number, default: 5 } });
</script>
```

### Button Loading States

```vue
<button :disabled="loading" class="...">
  <span v-if="loading" class="flex items-center gap-2">
    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
      <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
    Zpracovávám...
  </span>
  <span v-else>{{ label }}</span>
</button>
```

---

## Form UX Improvements

### Field Validation Feedback

```vue
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-1">
    VIN <span class="text-red-500">*</span>
  </label>
  <input
    v-model="vin"
    :class="[
      'w-full px-4 py-2 border rounded-lg',
      vinError ? 'border-red-500 bg-red-50' : 'border-gray-300',
      vinValid ? 'border-green-500 bg-green-50' : ''
    ]"
  />
  <p v-if="vinError" class="text-red-500 text-xs mt-1">{{ vinError }}</p>
  <p v-else-if="vinValid" class="text-green-500 text-xs mt-1">✓ Platný VIN</p>
</div>
```

### Auto-save Indicator

```vue
<div class="text-sm text-gray-400">
  <span v-if="saving">💾 Ukládám...</span>
  <span v-else-if="lastSaved">✓ Uloženo {{ formatRelativeTime(lastSaved) }}</span>
</div>
```

---

## Confirmation Dialogs

### Delete Confirmation

```vue
<!-- src/components/shared/ConfirmDialog.vue -->
<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md">
      <h3 class="text-lg font-bold mb-2">{{ title }}</h3>
      <p class="text-gray-600 mb-4">{{ message }}</p>
      <div class="flex justify-end gap-2">
        <button @click="$emit('cancel')" class="px-4 py-2 border rounded">
          Zrušit
        </button>
        <button
          @click="$emit('confirm')"
          :class="confirmClass"
          class="px-4 py-2 rounded text-white"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
```

---

## Toast Notifications

```typescript
// src/composables/useToast.ts
import { ref } from 'vue';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

export function useToast() {
  function show(type: Toast['type'], message: string, duration = 3000) {
    const id = nextId++;
    toasts.value.push({ id, type, message });

    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, duration);
  }

  return {
    toasts,
    success: (msg: string) => show('success', msg),
    error: (msg: string) => show('error', msg),
    warning: (msg: string) => show('warning', msg),
    info: (msg: string) => show('info', msg),
  };
}
```

---

## Accessibility Improvements

### Keyboard Navigation

- [ ] Tab navigation through forms
- [ ] Enter to submit forms
- [ ] Escape to close modals
- [ ] Arrow keys in dropdowns

### Screen Reader Support

- [ ] aria-label on icon buttons
- [ ] aria-describedby for error messages
- [ ] role="alert" for error notifications
- [ ] role="status" for loading states

### Focus Management

```typescript
// Auto-focus first input on page load
onMounted(() => {
  const firstInput = document.querySelector('input:not([disabled])');
  if (firstInput) {
    (firstInput as HTMLInputElement).focus();
  }
});

// Return focus after modal closes
function closeModal() {
  modalOpen.value = false;
  nextTick(() => {
    triggerButton.value?.focus();
  });
}
```

---

## Performance Optimizations

### Debounced Inputs

```typescript
import { useDebounceFn } from '@vueuse/core';

const debouncedSearch = useDebounceFn((query: string) => {
  // API call
}, 300);
```

### Lazy Loading Components

```typescript
const ValidationResult = defineAsyncComponent(() =>
  import('@/components/validation/ValidationResult.vue')
);
```

### Image Optimization

- Lazy load document previews
- Compress uploaded images before sending

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column |
| Tablet | 640-1024px | Compact table |
| Desktop | > 1024px | Full layout |

### Mobile Considerations

- [ ] Touch-friendly tap targets (min 44px)
- [ ] Swipe gestures for navigation
- [ ] Collapsible sections
- [ ] Bottom-fixed action buttons

---

## Completion Checklist

- [ ] Global error handler implemented
- [ ] Loading skeletons added
- [ ] Form validation feedback improved
- [ ] Toast notifications working
- [ ] Confirm dialogs implemented
- [ ] Accessibility improvements made
- [ ] Responsive design verified
- [ ] Performance optimizations applied
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
