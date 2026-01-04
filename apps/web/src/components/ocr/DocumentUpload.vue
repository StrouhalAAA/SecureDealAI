<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-6">Krok 3: Nahrani dokumentu</h2>

    <!-- ORV Upload (Required) -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-3">
        ORV (Maly technicky prukaz) <span class="text-red-500">*</span>
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
        <h3 class="text-lg font-semibold">VTP (Velky technicky prukaz)</h3>
        <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">nepovinne</span>
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
        Obsahuje ICO vlastnika pro overeni v ARES
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
        OP (Obcansky prukaz) <span class="text-red-500">*</span>
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

    <p class="text-sm text-gray-500 mb-4">* povinne dokumenty</p>

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
        &larr; Zpet
      </button>
      <button
        @click="runValidation"
        :disabled="!canValidate || validating"
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {{ validating ? 'Validuji...' : 'Spustit validaci &rarr;' }}
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
    orvError.value = e instanceof Error ? e.message : 'Chyba nahravani';
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
    vtpError.value = e instanceof Error ? e.message : 'Chyba nahravani';
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
    opError.value = e instanceof Error ? e.message : 'Chyba nahravani';
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

async function retryOcrOrv() {
  if (orvExtraction.value) {
    orvUploading.value = true;
    orvError.value = null;
    try {
      const result = await triggerOcr(orvExtraction.value.id);
      orvExtraction.value = result;
    } catch (e) {
      orvError.value = e instanceof Error ? e.message : 'Chyba OCR';
    } finally {
      orvUploading.value = false;
    }
  }
}

async function retryOcrVtp() {
  if (vtpExtraction.value) {
    vtpUploading.value = true;
    vtpError.value = null;
    try {
      const result = await triggerOcr(vtpExtraction.value.id);
      vtpExtraction.value = result;
    } catch (e) {
      vtpError.value = e instanceof Error ? e.message : 'Chyba OCR';
    } finally {
      vtpUploading.value = false;
    }
  }
}

async function retryOcrOp() {
  if (opExtraction.value) {
    opUploading.value = true;
    opError.value = null;
    try {
      const result = await triggerOcr(opExtraction.value.id);
      opExtraction.value = result;
    } catch (e) {
      opError.value = e instanceof Error ? e.message : 'Chyba OCR';
    } finally {
      opUploading.value = false;
    }
  }
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
    orvExtraction.value = data.find((e: OcrExtraction) => e.document_type === 'ORV') || null;
    vtpExtraction.value = data.find((e: OcrExtraction) => e.document_type === 'VTP') || null;
    opExtraction.value = data.find((e: OcrExtraction) => e.document_type === 'OP') || null;
  }
});
</script>
