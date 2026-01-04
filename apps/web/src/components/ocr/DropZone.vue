<template>
  <div
    :class="dropZoneClass"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="onDrop"
    @click="openFilePicker"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      class="hidden"
      @change="onFileChange"
    />

    <!-- Uploading State -->
    <div v-if="uploading" class="text-center">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="mt-2 text-gray-600">Nahravam...</p>
    </div>

    <!-- Uploaded State -->
    <div v-else-if="uploaded && file" class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-green-500">&#10003;</span>
        <span>{{ file.name }}</span>
        <span class="text-gray-400">({{ formatSize(file.size) }})</span>
      </div>
      <div class="flex gap-2">
        <button @click.stop="$emit('remove')" class="text-red-500 hover:text-red-700">
          X
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center text-red-600">
      <p>{{ error }}</p>
      <p class="text-sm mt-1">Kliknete pro opakovani</p>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center">
      <p class="text-2xl mb-2">+</p>
      <p class="text-gray-600">Pretahnete soubor nebo kliknete</p>
      <p class="text-gray-400 text-sm">PDF, JPEG, PNG (max 10 MB)</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
  accept: string;
}>();

const emit = defineEmits(['file-selected', 'remove']);

const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);

const dropZoneClass = computed(() => {
  const base = 'border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors';
  if (isDragging.value) return `${base} border-blue-500 bg-blue-50`;
  if (props.error) return `${base} border-red-300 bg-red-50`;
  if (props.uploaded) return `${base} border-green-300 bg-green-50`;
  return `${base} border-gray-300 hover:border-gray-400`;
});

function openFilePicker() {
  fileInput.value?.click();
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) {
    validateAndEmit(input.files[0]);
  }
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  if (event.dataTransfer?.files?.[0]) {
    validateAndEmit(event.dataTransfer.files[0]);
  }
}

function validateAndEmit(file: File) {
  const maxSize = 10 * 1024 * 1024; // 10 MB
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

  if (file.size > maxSize) {
    alert('Soubor je prilis velky (max 10 MB)');
    return;
  }

  if (!allowedTypes.includes(file.type)) {
    alert('Nepodporovany format souboru');
    return;
  }

  emit('file-selected', file);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>
