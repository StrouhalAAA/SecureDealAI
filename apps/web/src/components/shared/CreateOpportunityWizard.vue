<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <button
            v-if="currentStep !== 'choice'"
            @click="goBack"
            class="p-1 hover:bg-gray-100 rounded"
            aria-label="Zpět"
          >
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 class="text-xl font-bold">{{ stepTitle }}</h2>
        </div>
        <button
          @click="$emit('close')"
          class="p-1 hover:bg-gray-100 rounded"
          aria-label="Zavřít"
        >
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Step: Choice -->
        <div v-if="currentStep === 'choice'" class="space-y-4">
          <p class="text-gray-600 text-center mb-6">
            Vyberte způsob přidání vozidla:
          </p>

          <!-- Upload ORV Option -->
          <button
            @click="selectStep('upload-orv')"
            class="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
          >
            <div class="flex items-start gap-4">
              <div class="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Nahrát ORV</h3>
                <p class="text-sm text-gray-500 mt-1">
                  Nahrajte malý technický průkaz a data budou automaticky extrahována
                </p>
              </div>
            </div>
          </button>

          <!-- Manual Entry Option -->
          <button
            @click="selectStep('manual-entry')"
            class="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left group"
          >
            <div class="flex items-start gap-4">
              <div class="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Zadat ručně</h3>
                <p class="text-sm text-gray-500 mt-1">
                  Vyplňte data vozidla ručně bez nahrání dokumentu
                </p>
              </div>
            </div>
          </button>
        </div>

        <!-- Step: Upload ORV -->
        <div v-else-if="currentStep === 'upload-orv'" class="space-y-4">
          <!-- SPZ Input -->
          <div>
            <label for="upload-spz" class="block text-sm font-medium text-gray-700 mb-1">
              SPZ (registrační značka) <span class="text-red-500">*</span>
            </label>
            <input
              id="upload-spz"
              v-model="spz"
              type="text"
              placeholder="např. 5L94454"
              class="w-full px-4 py-2 border rounded-lg uppercase font-mono"
              :class="{
                'border-gray-300': !spzError,
                'border-red-500 bg-red-50': spzError,
              }"
              @blur="validateSpz"
            />
            <p v-if="spzError" class="text-red-500 text-xs mt-1">{{ spzError }}</p>
          </div>

          <!-- DropZone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Nahrát ORV dokument <span class="text-red-500">*</span>
            </label>
            <DropZone
              :file="uploadedFile"
              :uploading="uploading"
              :uploaded="!!ocrExtraction"
              :error="uploadError"
              accept=".pdf,.jpg,.jpeg,.png"
              @file-selected="handleFileSelected"
              @remove="removeFile"
            />
          </div>

          <!-- OCR Status -->
          <OcrStatus
            v-if="ocrExtraction"
            :extraction="ocrExtraction"
            @retry="retryOcr"
          />

          <!-- Error -->
          <div v-if="error" class="p-3 bg-red-50 text-red-700 rounded-lg">
            {{ error }}
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end pt-4">
            <button
              @click="createFromUpload"
              :disabled="!canSubmitUpload || loading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Vytvářím...' : 'Vytvořit příležitost' }}
            </button>
          </div>
        </div>

        <!-- Step: Manual Entry -->
        <div v-else-if="currentStep === 'manual-entry'">
          <QuickVehicleForm
            :loading="loading"
            :error="error"
            @submit="createFromManual"
            @cancel="goBack"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/composables/useSupabase';
import DropZone from '@/components/ocr/DropZone.vue';
import OcrStatus from '@/components/ocr/OcrStatus.vue';
import QuickVehicleForm from './QuickVehicleForm.vue';
import type { BuyingOpportunity, OcrExtraction } from '@/types';

type WizardStep = 'choice' | 'upload-orv' | 'manual-entry';

export interface CreateResult {
  opportunity: BuyingOpportunity;
  entryMethod: 'upload' | 'manual';
  ocrCompleted: boolean;
}

const emit = defineEmits<{
  close: [];
  created: [data: CreateResult];
}>();

// Step state
const currentStep = ref<WizardStep>('choice');

// Shared state
const loading = ref(false);
const error = ref<string | null>(null);

// Upload step state
const spz = ref('');
const spzError = ref<string | null>(null);
const uploadedFile = ref<File | null>(null);
const uploading = ref(false);
const uploadError = ref<string | null>(null);
const ocrExtraction = ref<OcrExtraction | null>(null);

// Computed
const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 'choice':
      return 'Nová nákupní příležitost';
    case 'upload-orv':
      return 'Nahrát ORV dokument';
    case 'manual-entry':
      return 'Ruční zadání vozidla';
    default:
      return 'Nová nákupní příležitost';
  }
});

const canSubmitUpload = computed(() => {
  return (
    spz.value.length >= 5 &&
    !spzError.value &&
    ocrExtraction.value?.ocr_status === 'COMPLETED'
  );
});

// Methods
function selectStep(step: WizardStep) {
  currentStep.value = step;
  error.value = null;
}

function goBack() {
  currentStep.value = 'choice';
  error.value = null;
  // Reset upload state when going back
  uploadedFile.value = null;
  ocrExtraction.value = null;
  uploadError.value = null;
}

function validateSpz() {
  if (!spz.value) {
    spzError.value = 'SPZ je povinné pole';
    return false;
  }
  if (spz.value.length < 5 || spz.value.length > 8) {
    spzError.value = 'SPZ musí mít 5-8 znaků';
    return false;
  }
  spzError.value = null;
  return true;
}

async function handleFileSelected(file: File) {
  if (!validateSpz()) {
    uploadError.value = 'Nejprve vyplňte SPZ';
    return;
  }

  uploadedFile.value = file;
  uploading.value = true;
  uploadError.value = null;

  try {
    // Upload document
    const formData = new FormData();
    formData.append('file', file);
    formData.append('spz', spz.value.toUpperCase());
    formData.append('document_type', 'ORV');

    const uploadResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const err = await uploadResponse.json();
      throw new Error(err.message || 'Chyba nahrávání');
    }

    const extraction = await uploadResponse.json();
    ocrExtraction.value = extraction;

    // Trigger OCR
    const ocrResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-extract`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ocr_extraction_id: extraction.id }),
      }
    );

    if (!ocrResponse.ok) {
      const err = await ocrResponse.json();
      throw new Error(err.message || 'Chyba OCR extrakce');
    }

    const ocrResult = await ocrResponse.json();
    ocrExtraction.value = ocrResult;
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : 'Chyba nahrávání';
  } finally {
    uploading.value = false;
  }
}

function removeFile() {
  uploadedFile.value = null;
  ocrExtraction.value = null;
  uploadError.value = null;
}

async function retryOcr() {
  if (!ocrExtraction.value) return;

  uploading.value = true;
  uploadError.value = null;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-extract`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ocr_extraction_id: ocrExtraction.value.id }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Chyba OCR extrakce');
    }

    const result = await response.json();
    ocrExtraction.value = result;
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : 'Chyba OCR';
  } finally {
    uploading.value = false;
  }
}

async function createFromUpload() {
  if (!canSubmitUpload.value) return;

  loading.value = true;
  error.value = null;

  try {
    // Create buying opportunity
    const { data: opportunity, error: createError } = await supabase
      .from('buying_opportunities')
      .insert({ spz: spz.value.toUpperCase() })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        error.value = 'Příležitost s touto SPZ již existuje';
      } else {
        throw createError;
      }
      return;
    }

    // Create vehicle from OCR data
    const ocrData = ocrExtraction.value?.extracted_data as Record<string, unknown> | null;
    if (ocrData) {
      await supabase.from('vehicles').insert({
        buying_opportunity_id: opportunity.id,
        spz: spz.value.toUpperCase(),
        vin: (ocrData.vin as string) || null,
        znacka: (ocrData.make as string) || null,
        model: (ocrData.model as string) || null,
        majitel: (ocrData.keeperName as string) || null,
        datum_1_registrace: (ocrData.firstRegistrationDate as string) || null,
        data_source: 'OCR',
      });
    }

    emit('created', {
      opportunity,
      entryMethod: 'upload',
      ocrCompleted: true,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chyba při vytváření';
  } finally {
    loading.value = false;
  }
}

interface ManualFormData {
  spz: string;
  vin: string;
  znacka: string;
  model: string;
  majitel: string;
}

async function createFromManual(formData: ManualFormData) {
  loading.value = true;
  error.value = null;

  try {
    // Create buying opportunity
    const { data: opportunity, error: createError } = await supabase
      .from('buying_opportunities')
      .insert({ spz: formData.spz.toUpperCase() })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        error.value = 'Příležitost s touto SPZ již existuje';
      } else {
        throw createError;
      }
      return;
    }

    // Create vehicle with manual data
    await supabase.from('vehicles').insert({
      buying_opportunity_id: opportunity.id,
      spz: formData.spz.toUpperCase(),
      vin: formData.vin.toUpperCase() || null,
      znacka: formData.znacka || null,
      model: formData.model || null,
      majitel: formData.majitel.toUpperCase() || null,
      data_source: 'MANUAL',
    });

    emit('created', {
      opportunity,
      entryMethod: 'manual',
      ocrCompleted: false,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chyba při vytváření';
  } finally {
    loading.value = false;
  }
}
</script>
