# Task 3.6: Document Upload Component

> **Phase**: 3 - Frontend
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 3.1 Vue.js Setup, 2.5 Document Upload API
> **Estimated Effort**: Medium

---

## Objective

Create a document upload component for ORV (malý technický průkaz), OP (občanský průkaz), and VTP (velký technický průkaz) with drag-and-drop support.

**Document Types:**
| Document | Required | Purpose |
|----------|----------|---------|
| **ORV** | Yes | Vehicle registration data (SPZ, VIN, keeper) |
| **OP** | Yes (FO only) | Personal ID for vendor validation |
| **VTP** | No (optional) | Contains owner IČO for ARES validation |

---

## UI Specification

```
┌─────────────────────────────────────────────────────────────┐
│  Krok 3: Nahrání dokumentů                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  ORV (Malý technický průkaz) *                          ││
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │                                                    │  ││
│  │  │     📄 Přetáhněte soubor nebo klikněte            │  ││
│  │  │        PDF, JPEG, PNG (max 10 MB)                  │  ││
│  │  │                                                    │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  │  nebo: ✅ 5L94454_ORV.pdf (2.3 MB) [🔄] [🗑]            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  VTP (Velký technický průkaz)              [nepovinné]  ││
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │                                                    │  ││
│  │  │     📄 Přetáhněte soubor nebo klikněte            │  ││
│  │  │        PDF, JPEG, PNG (max 10 MB)                  │  ││
│  │  │                                                    │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  │  ℹ️ Obsahuje IČO vlastníka pro ověření v ARES           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  OP (Občanský průkaz) *                                 ││
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │                                                    │  ││
│  │  │     📄 Přetáhněte soubor nebo klikněte            │  ││
│  │  │        PDF, JPEG, PNG (max 10 MB)                  │  ││
│  │  │                                                    │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  * povinné dokumenty                                        │
│                                                              │
│                           [← Zpět] [Spustit validaci →]     │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

**src/components/ocr/DocumentUpload.vue**:
```vue
<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-6">Krok 3: Nahrání dokumentů</h2>

    <!-- ORV Upload (Required) -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-3">
        ORV (Malý technický průkaz) <span class="text-red-500">*</span>
      </h3>
      <DropZone
        :file="orvFile"
        :uploading="orvUploading"
        :uploaded="!!orvExtraction"
        :error="orvError"
        accept=".pdf,.jpg,.jpeg,.png"
        @file-selected="uploadOrv"
        @remove="removeOrv"
      />
      <OcrStatus
        v-if="orvExtraction"
        :extraction="orvExtraction"
        @retry="retryOcrOrv"
      />
    </div>

    <!-- VTP Upload (Optional) -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold">VTP (Velký technický průkaz)</h3>
        <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">nepovinné</span>
      </div>
      <DropZone
        :file="vtpFile"
        :uploading="vtpUploading"
        :uploaded="!!vtpExtraction"
        :error="vtpError"
        accept=".pdf,.jpg,.jpeg,.png"
        @file-selected="uploadVtp"
        @remove="removeVtp"
      />
      <p class="text-sm text-gray-500 mt-2">
        ℹ️ Obsahuje IČO vlastníka pro ověření v ARES
      </p>
      <OcrStatus
        v-if="vtpExtraction"
        :extraction="vtpExtraction"
        @retry="retryOcrVtp"
      />
    </div>

    <!-- OP Upload (Required for FO) -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-3">
        OP (Občanský průkaz) <span class="text-red-500">*</span>
      </h3>
      <DropZone
        :file="opFile"
        :uploading="opUploading"
        :uploaded="!!opExtraction"
        :error="opError"
        accept=".pdf,.jpg,.jpeg,.png"
        @file-selected="uploadOp"
        @remove="removeOp"
      />
      <OcrStatus
        v-if="opExtraction"
        :extraction="opExtraction"
        @retry="retryOcrOp"
      />
    </div>

    <p class="text-sm text-gray-500 mb-4">* povinné dokumenty</p>

    <!-- Error -->
    <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
      {{ error }}
    </div>

    <!-- Buttons -->
    <div class="flex justify-between">
      <button
        type="button"
        @click="$emit('back')"
        class="px-6 py-2 border rounded-lg hover:bg-gray-50"
      >
        ← Zpět
      </button>
      <button
        @click="runValidation"
        :disabled="!canValidate || validating"
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {{ validating ? 'Validuji...' : 'Spustit validaci →' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { supabase } from '@/composables/useSupabase';
import DropZone from './DropZone.vue';
import OcrStatus from './OcrStatus.vue';
import type { OcrExtraction } from '@/types';

const props = defineProps<{
  spz: string;
  buyingOpportunityId: string;
}>();

const emit = defineEmits(['back', 'validated']);

const orvFile = ref<File | null>(null);
const vtpFile = ref<File | null>(null);
const opFile = ref<File | null>(null);
const orvUploading = ref(false);
const vtpUploading = ref(false);
const opUploading = ref(false);
const orvExtraction = ref<OcrExtraction | null>(null);
const vtpExtraction = ref<OcrExtraction | null>(null);
const opExtraction = ref<OcrExtraction | null>(null);
const orvError = ref<string | null>(null);
const vtpError = ref<string | null>(null);
const opError = ref<string | null>(null);
const error = ref<string | null>(null);
const validating = ref(false);

const canValidate = computed(() => {
  // ORV is required, VTP is optional, OP is required for FO
  return orvExtraction.value?.ocr_status === 'COMPLETED';
});

async function uploadDocument(file: File, type: 'ORV' | 'VTP' | 'OP') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('spz', props.spz);
  formData.append('document_type', type);

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  return await response.json();
}

async function triggerOcr(extractionId: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-extract`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ocr_extraction_id: extractionId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'OCR failed');
  }

  return await response.json();
}

async function uploadOrv(file: File) {
  orvFile.value = file;
  orvUploading.value = true;
  orvError.value = null;

  try {
    const extraction = await uploadDocument(file, 'ORV');
    orvExtraction.value = extraction;

    // Trigger OCR
    const result = await triggerOcr(extraction.id);
    orvExtraction.value = result;
  } catch (e) {
    orvError.value = e instanceof Error ? e.message : 'Chyba nahrávání';
  } finally {
    orvUploading.value = false;
  }
}

async function uploadVtp(file: File) {
  vtpFile.value = file;
  vtpUploading.value = true;
  vtpError.value = null;

  try {
    const extraction = await uploadDocument(file, 'VTP');
    vtpExtraction.value = extraction;

    // Trigger OCR
    const result = await triggerOcr(extraction.id);
    vtpExtraction.value = result;
  } catch (e) {
    vtpError.value = e instanceof Error ? e.message : 'Chyba nahrávání';
  } finally {
    vtpUploading.value = false;
  }
}

async function uploadOp(file: File) {
  opFile.value = file;
  opUploading.value = true;
  opError.value = null;

  try {
    const extraction = await uploadDocument(file, 'OP');
    opExtraction.value = extraction;

    // Trigger OCR
    const result = await triggerOcr(extraction.id);
    opExtraction.value = result;
  } catch (e) {
    opError.value = e instanceof Error ? e.message : 'Chyba nahrávání';
  } finally {
    opUploading.value = false;
  }
}

function removeOrv() {
  orvFile.value = null;
  orvExtraction.value = null;
  orvError.value = null;
}

function removeVtp() {
  vtpFile.value = null;
  vtpExtraction.value = null;
  vtpError.value = null;
}

function removeOp() {
  opFile.value = null;
  opExtraction.value = null;
  opError.value = null;
}

async function runValidation() {
  validating.value = true;
  error.value = null;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validation-run`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buying_opportunity_id: props.buyingOpportunityId,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Validation failed');
    }

    const result = await response.json();
    emit('validated', result);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chyba validace';
  } finally {
    validating.value = false;
  }
}

// Load existing extractions on mount
onMounted(async () => {
  const { data } = await supabase
    .from('ocr_extractions')
    .select('*')
    .eq('spz', props.spz);

  if (data) {
    orvExtraction.value = data.find((e) => e.document_type === 'ORV') || null;
    vtpExtraction.value = data.find((e) => e.document_type === 'VTP') || null;
    opExtraction.value = data.find((e) => e.document_type === 'OP') || null;
  }
});
</script>
```

---

## DropZone Component

**src/components/ocr/DropZone.vue**:
```vue
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
      <p class="mt-2 text-gray-600">Nahrávám...</p>
    </div>

    <!-- Uploaded State -->
    <div v-else-if="uploaded && file" class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-green-500">✅</span>
        <span>{{ file.name }}</span>
        <span class="text-gray-400">({{ formatSize(file.size) }})</span>
      </div>
      <div class="flex gap-2">
        <button @click.stop="$emit('remove')" class="text-red-500 hover:text-red-700">
          🗑
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center text-red-600">
      <p>❌ {{ error }}</p>
      <p class="text-sm mt-1">Klikněte pro opakování</p>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center">
      <p class="text-2xl mb-2">📄</p>
      <p class="text-gray-600">Přetáhněte soubor nebo klikněte</p>
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
    alert('Soubor je příliš velký (max 10 MB)');
    return;
  }

  if (!allowedTypes.includes(file.type)) {
    alert('Nepodporovaný formát souboru');
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
```

---

## Validation Criteria

- [ ] Drag-and-drop upload works for all document types (ORV, VTP, OP)
- [ ] Click to select file works
- [ ] File size validation (10 MB max)
- [ ] File type validation (PDF, JPEG, PNG)
- [ ] Upload progress indicator
- [ ] Error handling and display
- [ ] Remove uploaded file
- [ ] Trigger OCR after upload
- [ ] Load existing extractions
- [ ] VTP marked as optional with info text
- [ ] Required documents marked with asterisk

---

## Completion Checklist

- [ ] DocumentUpload.vue created with ORV, VTP, OP zones
- [ ] DropZone.vue created
- [ ] File upload working for all document types
- [ ] OCR trigger working for all document types
- [ ] VTP optional indicator displayed
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
