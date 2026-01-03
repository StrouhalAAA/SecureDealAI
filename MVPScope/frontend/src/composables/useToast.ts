import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

// Global reactive state for toasts
const toasts = ref<Toast[]>([]);
let nextId = 0;

export function useToast() {
  /**
   * Show a toast notification
   */
  function show(type: ToastType, message: string, duration = 3000): number {
    const id = nextId++;
    toasts.value.push({ id, type, message, duration });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }

    return id;
  }

  /**
   * Remove a toast by ID
   */
  function remove(id: number): void {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  }

  /**
   * Clear all toasts
   */
  function clear(): void {
    toasts.value = [];
  }

  /**
   * Show a success toast
   */
  function success(message: string, duration?: number): number {
    return show('success', message, duration);
  }

  /**
   * Show an error toast
   */
  function error(message: string, duration?: number): number {
    // Error toasts stay longer by default
    return show('error', message, duration ?? 5000);
  }

  /**
   * Show a warning toast
   */
  function warning(message: string, duration?: number): number {
    return show('warning', message, duration ?? 4000);
  }

  /**
   * Show an info toast
   */
  function info(message: string, duration?: number): number {
    return show('info', message, duration);
  }

  return {
    toasts,
    show,
    remove,
    clear,
    success,
    error,
    warning,
    info,
  };
}
