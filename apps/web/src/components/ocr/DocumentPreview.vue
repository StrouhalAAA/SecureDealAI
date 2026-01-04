<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useDocumentPreview } from '@/composables/useDocumentPreview';

type DocumentType = 'ORV' | 'VTP' | 'OP';

interface Props {
  spz: string;
  documentType: DocumentType;
  autoLoad?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: false,
});

const emit = defineEmits<{
  (e: 'load'): void;
  (e: 'error', message: string): void;
}>();

const { state, fetchPreviewUrl, clearPreview, isExpired } = useDocumentPreview();
const showPreview = ref(false);

// Refresh URL before it expires (every 14 minutes if preview is open)
let refreshInterval: ReturnType<typeof setInterval> | null = null;

async function loadPreview(): Promise<void> {
  await fetchPreviewUrl(props.spz, props.documentType);

  if (state.value.url) {
    showPreview.value = true;
    emit('load');
    startRefreshInterval();
  } else if (state.value.error) {
    emit('error', state.value.error);
  }
}

function closePreview(): void {
  showPreview.value = false;
  clearPreview();
  stopRefreshInterval();
}

function startRefreshInterval(): void {
  stopRefreshInterval();
  // Refresh every 14 minutes (before 15 min expiry)
  refreshInterval = setInterval(async () => {
    if (showPreview.value && isExpired()) {
      await fetchPreviewUrl(props.spz, props.documentType);
    }
  }, 14 * 60 * 1000);
}

function stopRefreshInterval(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Auto-load if prop is set
watch(
  () => props.autoLoad,
  (shouldAutoLoad) => {
    if (shouldAutoLoad && !state.value.url) {
      loadPreview();
    }
  },
  { immediate: true }
);

// Cleanup on unmount
onUnmounted(() => {
  stopRefreshInterval();
});
</script>

<template>
  <div class="document-preview">
    <!-- Preview Button -->
    <button
      v-if="!showPreview"
      type="button"
      class="preview-button"
      :disabled="state.loading"
      @click="loadPreview"
    >
      <span v-if="state.loading" class="loading-spinner" />
      <span v-else>Zobrazit dokument</span>
    </button>

    <!-- Error Message -->
    <div v-if="state.error" class="preview-error">
      {{ state.error }}
    </div>

    <!-- Preview Modal/Panel -->
    <div v-if="showPreview && state.url" class="preview-modal">
      <div class="preview-header">
        <span class="preview-title">{{ documentType }}</span>
        <button type="button" class="close-button" @click="closePreview">
          &times;
        </button>
      </div>
      <div class="preview-content">
        <!-- PDF Preview -->
        <iframe
          v-if="state.url.includes('.pdf')"
          :src="state.url"
          class="preview-iframe"
          title="Document Preview"
        />
        <!-- Image Preview -->
        <img
          v-else
          :src="state.url"
          class="preview-image"
          :alt="`${documentType} document`"
        />
      </div>
      <div class="preview-footer">
        <a
          :href="state.url"
          target="_blank"
          rel="noopener noreferrer"
          class="download-link"
        >
          Otevrit v novem okne
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-preview {
  position: relative;
}

.preview-button {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.preview-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff40;
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-error {
  color: #dc2626;
  font-size: 14px;
  margin-top: 8px;
}

.preview-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 900px;
  height: 80vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.preview-title {
  font-weight: 600;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}

.close-button:hover {
  color: #111827;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

.preview-iframe,
.preview-image {
  width: 100%;
  height: 100%;
  border: none;
  object-fit: contain;
}

.preview-footer {
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}

.download-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 14px;
}

.download-link:hover {
  text-decoration: underline;
}
</style>
