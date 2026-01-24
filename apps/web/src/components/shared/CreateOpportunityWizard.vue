<template>
  <div class="fixed inset-0 bg-white z-50 overflow-y-auto">
    <div class="min-h-screen">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 max-w-4xl mx-auto">
        <div class="flex items-center gap-2">
          <button
            v-if="canGoBack"
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

      <!-- Progress Steps -->
      <div class="px-6 py-3 bg-gray-50 border-b max-w-4xl mx-auto">
        <div class="flex items-center justify-between">
          <div
            v-for="(step, index) in progressSteps"
            :key="step.key"
            class="flex items-center"
          >
            <div
              class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium"
              :class="{
                'bg-blue-600 text-white': currentStepIndex >= index,
                'bg-gray-200 text-gray-500': currentStepIndex < index,
              }"
            >
              {{ index + 1 }}
            </div>
            <span
              class="ml-2 text-sm hidden sm:inline"
              :class="{
                'text-blue-600 font-medium': currentStepIndex >= index,
                'text-gray-400': currentStepIndex < index,
              }"
            >
              {{ step.label }}
            </span>
            <div
              v-if="index < progressSteps.length - 1"
              class="w-8 sm:w-12 h-0.5 mx-2"
              :class="{
                'bg-blue-600': currentStepIndex > index,
                'bg-gray-200': currentStepIndex <= index,
              }"
            />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 max-w-4xl mx-auto">
        <!-- Step 0: Deal Type Selection -->
        <div v-if="currentStep === 'deal-type'" class="space-y-4">
          <p class="text-gray-600 text-center mb-6">
            Vyberte typ výkupu:
          </p>

          <!-- Branch Option -->
          <button
            @click="selectDealType('BRANCH')"
            class="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left group"
          >
            <div class="flex items-start gap-4">
              <div class="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Pobočka</h3>
                <p class="text-sm text-gray-500 mt-1">
                  Výkup na pobočce
                </p>
              </div>
            </div>
          </button>

          <!-- Mobile Buying Option -->
          <button
            @click="selectDealType('MOBILE_BUYING')"
            class="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left group"
          >
            <div class="flex items-start gap-4">
              <div class="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Mobilní výkup</h3>
                <p class="text-sm text-gray-500 mt-1">
                  Výkup u zákazníka
                </p>
              </div>
            </div>
          </button>
        </div>

        <!-- Step 1: Contact -->
        <div v-else-if="currentStep === 'contact'">
          <ContactForm
            :buying-opportunity-id="tempOpportunityId"
            :existing-contact="existingContact"
            @saved="onContactSaved"
            @next="goToVehicleChoice"
            @back="goBack"
          />
        </div>

        <!-- Step 2: Vehicle Choice -->
        <div v-else-if="currentStep === 'choice'" class="space-y-4">
          <p class="text-gray-600 text-center mb-6">
            Vyberte způsob přidání vozidla:
          </p>

          <!-- Upload ORV Option -->
          <button
            @click="selectVehicleEntry('upload-orv')"
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
            @click="selectVehicleEntry('manual-entry')"
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

        <!-- Step 2a: Upload ORV -->
        <div v-else-if="currentStep === 'upload-orv'" class="space-y-4">
          <!-- DropZone - First, upload the document -->
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

          <!-- SPZ Display/Input - Show after OCR or for manual fallback -->
          <div v-if="ocrExtraction?.ocr_status === 'COMPLETED' || ocrSpzExtractionFailed">
            <label for="upload-spz" class="block text-sm font-medium text-gray-700 mb-1">
              SPZ (registrační značka) <span class="text-red-500">*</span>
            </label>
            <!-- Show extracted SPZ with edit option -->
            <div v-if="extractedSpz && !editingSpz" class="flex items-center gap-2">
              <div class="flex-1 px-4 py-2 border border-green-300 bg-green-50 rounded-lg uppercase font-mono text-green-800">
                {{ spz }}
              </div>
              <button
                @click="editingSpz = true"
                type="button"
                class="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
              >
                Upravit
              </button>
            </div>
            <!-- Editable input (for manual entry or correction) -->
            <input
              v-else
              id="upload-spz"
              v-model="spz"
              type="text"
              placeholder="napr. 5L94454"
              class="w-full px-4 py-2 border rounded-lg uppercase font-mono"
              :class="{
                'border-gray-300': !spzError,
                'border-red-500 bg-red-50': spzError,
              }"
              @blur="validateSpz"
            />
            <p v-if="extractedSpz && !editingSpz" class="text-green-600 text-xs mt-1">
              SPZ byla automaticky extrahována z dokumentu
            </p>
            <p v-else-if="ocrSpzExtractionFailed" class="text-yellow-600 text-xs mt-1">
              SPZ nebyla rozpoznána - zadejte prosím ručně
            </p>
            <p v-if="spzError" class="text-red-500 text-xs mt-1">{{ spzError }}</p>
          </div>

          <!-- Error -->
          <div v-if="error" class="p-3 bg-red-50 text-red-700 rounded-lg">
            {{ error }}
          </div>

          <!-- Submit Button -->
          <div class="flex justify-between pt-4">
            <button
              @click="goBack"
              class="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Zpět
            </button>
            <button
              @click="createVehicleFromUpload"
              :disabled="!canSubmitUpload || loading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Vytvářím...' : 'Pokračovat' }}
            </button>
          </div>
        </div>

        <!-- Step 2b: Manual Entry -->
        <div v-else-if="currentStep === 'manual-entry'">
          <QuickVehicleForm
            :loading="loading"
            :error="error"
            @submit="createVehicleFromManual"
            @cancel="goBack"
          />
        </div>

        <!-- Step 3: Vendor Decision -->
        <div v-else-if="currentStep === 'vendor-decision'" class="space-y-6">
          <h3 class="text-lg font-semibold">Je dodavatel stejný jako kontakt?</h3>

          <!-- Contact Summary -->
          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p class="text-sm text-gray-500 mb-1">Kontakt:</p>
            <p class="font-medium text-lg">{{ contactDisplayName }}</p>
            <p v-if="savedContact?.company_id" class="text-sm text-gray-600">
              ICO: {{ savedContact.company_id }}
            </p>
          </div>

          <!-- OCR Warning if owner differs from contact -->
          <div
            v-if="ocrMajitelDiffers"
            class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
            role="alert"
          >
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 class="font-medium text-yellow-800">Majitel z OCR se liší od kontaktu</h4>
                <p class="text-sm text-yellow-700 mt-1">
                  OCR Majitel: <strong>{{ ocrMajitelName }}</strong>
                </p>
              </div>
            </div>
          </div>

          <!-- Decision Options -->
          <div class="space-y-3">
            <label
              class="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors"
              :class="{
                'border-blue-500 bg-blue-50': vendorDecision === 'same',
                'border-gray-200 hover:border-gray-300': vendorDecision !== 'same',
              }"
            >
              <input
                type="radio"
                v-model="vendorDecision"
                value="same"
                class="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span class="font-medium">Ano - {{ contactDisplayName }} je prodávající</span>
                <p class="text-sm text-gray-500 mt-1">
                  Data kontaktu budou použita jako data dodavatele
                </p>
              </div>
            </label>

            <label
              class="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors"
              :class="{
                'border-blue-500 bg-blue-50': vendorDecision === 'different',
                'border-gray-200 hover:border-gray-300': vendorDecision !== 'different',
              }"
            >
              <input
                type="radio"
                v-model="vendorDecision"
                value="different"
                class="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span class="font-medium">Ne - Prodávající je jiný subjekt</span>
                <p class="text-sm text-gray-500 mt-1">
                  Můžete zadat dodavatele jako fyzickou osobu, OSVČ nebo firmu
                </p>
              </div>
            </label>
          </div>

          <!-- Buttons -->
          <div class="flex justify-between pt-4">
            <button
              @click="goBack"
              class="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Zpět
            </button>
            <button
              @click="handleVendorDecision"
              :disabled="!vendorDecision || loading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Zpracovávám...' : 'Pokračovat' }}
            </button>
          </div>
        </div>

        <!-- Step 3a: Vendor Form (when different) -->
        <div v-else-if="currentStep === 'vendor-form'">
          <VendorForm
            :buying-opportunity-id="createdOpportunityId!"
            :existing-vendor="existingVendor"
            @saved="onVendorSaved"
            @next="completeWizard"
            @back="goBack"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/composables/useSupabase';
import { useErrorHandler } from '@/composables/useErrorHandler';
import DropZone from '@/components/ocr/DropZone.vue';
import OcrStatus from '@/components/ocr/OcrStatus.vue';
import QuickVehicleForm from './QuickVehicleForm.vue';
import ContactForm from '@/components/forms/ContactForm.vue';
import VendorForm from '@/components/forms/VendorForm.vue';
import { extractPowerKw } from '@/utils/addressParser';
import type { BuyingOpportunity, OcrExtraction, Contact, Vendor } from '@/types';
import { getContactDisplayName } from '@/types/contact';

const { handleError } = useErrorHandler();

type WizardStep =
  | 'deal-type'
  | 'contact'
  | 'choice'
  | 'upload-orv'
  | 'manual-entry'
  | 'vendor-decision'
  | 'vendor-form';

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
const currentStep = ref<WizardStep>('deal-type');
const stepHistory = ref<WizardStep[]>([]);
const buyingType = ref<'BRANCH' | 'MOBILE_BUYING'>('BRANCH');

// Progress steps for visual indicator
const progressSteps = [
  { key: 'deal-type', label: 'Typ' },
  { key: 'contact', label: 'Kontakt' },
  { key: 'vehicle', label: 'Vozidlo' },
  { key: 'vendor', label: 'Dodavatel' },
];

const currentStepIndex = computed(() => {
  switch (currentStep.value) {
    case 'deal-type':
      return 0;
    case 'contact':
      return 1;
    case 'choice':
    case 'upload-orv':
    case 'manual-entry':
      return 2;
    case 'vendor-decision':
    case 'vendor-form':
      return 3;
    default:
      return 0;
  }
});

// Shared state
const loading = ref(false);
const error = ref<string | null>(null);

// Temporary opportunity ID (created when saving contact)
const tempOpportunityId = ref<string>('');
const createdOpportunityId = ref<string | null>(null);

// Contact state
const savedContact = ref<Contact | null>(null);
const existingContact = ref<Contact | null>(null);

// Vehicle entry method
const entryMethod = ref<'upload' | 'manual'>('upload');

// Upload step state
const spz = ref('');
const spzError = ref<string | null>(null);
const uploadedFile = ref<File | null>(null);
const uploading = ref(false);
const uploadError = ref<string | null>(null);
const ocrExtraction = ref<OcrExtraction | null>(null);
const editingSpz = ref(false);

// Vendor decision state
const vendorDecision = ref<'same' | 'different' | null>(null);
const existingVendor = ref<Vendor | null>(null);

// Computed
const canGoBack = computed(() => {
  return stepHistory.value.length > 0;
});

const stepTitle = computed(() => {
  switch (currentStep.value) {
    case 'deal-type':
      return 'Typ výkupu';
    case 'contact':
      return 'Nová nákupní příležitost';
    case 'choice':
      return 'Data vozidla';
    case 'upload-orv':
      return 'Nahrát ORV dokument';
    case 'manual-entry':
      return 'Ruční zadání vozidla';
    case 'vendor-decision':
      return 'Dodavatel';
    case 'vendor-form':
      return 'Data dodavatele';
    default:
      return 'Nová nákupní příležitost';
  }
});

// Extracted SPZ from OCR
const extractedSpz = computed(() => {
  const ocrData = ocrExtraction.value?.extracted_data as Record<string, unknown> | null;
  if (!ocrData) return null;
  const regPlate = ocrData.registrationPlateNumber as string | undefined;
  return regPlate ? regPlate.toUpperCase().replace(/\s/g, '') : null;
});

// Check if OCR completed but failed to extract SPZ
const ocrSpzExtractionFailed = computed(() => {
  return ocrExtraction.value?.ocr_status === 'COMPLETED' && !extractedSpz.value;
});

const canSubmitUpload = computed(() => {
  // Need valid SPZ (from OCR or manual) and completed OCR
  const hasValidSpz = spz.value.length >= 5 && !spzError.value;
  const ocrCompleted = ocrExtraction.value?.ocr_status === 'COMPLETED';
  return hasValidSpz && ocrCompleted;
});

const contactDisplayName = computed(() => {
  if (!savedContact.value) return '';
  return getContactDisplayName(savedContact.value);
});

// OCR Majitel comparison
const ocrMajitelName = computed(() => {
  const ocrData = ocrExtraction.value?.extracted_data as Record<string, unknown> | null;
  if (!ocrData) return null;
  return (ocrData.keeperParsedName as string) || (ocrData.keeperName as string) || null;
});

const ocrMajitelDiffers = computed(() => {
  if (!ocrMajitelName.value || !savedContact.value) return false;

  const contactName = contactDisplayName.value.toUpperCase();
  const ocrName = ocrMajitelName.value.toUpperCase();

  // Simple comparison - they differ if names don't match
  return contactName !== ocrName && !ocrName.includes(contactName) && !contactName.includes(ocrName);
});

// Navigation methods
function pushStep(step: WizardStep) {
  stepHistory.value.push(currentStep.value);
  currentStep.value = step;
}

function goBack() {
  if (stepHistory.value.length > 0) {
    const previousStep = stepHistory.value.pop()!;
    currentStep.value = previousStep;
    error.value = null;

    // Reset some state when going back
    if (previousStep === 'choice') {
      uploadedFile.value = null;
      ocrExtraction.value = null;
      uploadError.value = null;
    }
    if (previousStep === 'vendor-decision') {
      vendorDecision.value = null;
    }
  }
}

// Deal type step handler
async function selectDealType(type: 'BRANCH' | 'MOBILE_BUYING') {
  buyingType.value = type;
  await initializeOpportunity();
  pushStep('contact');
}

// Contact step handlers
function onContactSaved(contact: Contact) {
  savedContact.value = contact;
  // The opportunity is created when the contact is saved (via buying_opportunity_id)
  createdOpportunityId.value = contact.buying_opportunity_id;
}

function goToVehicleChoice() {
  pushStep('choice');
}

// Vehicle choice handlers
function selectVehicleEntry(method: 'upload-orv' | 'manual-entry') {
  entryMethod.value = method === 'upload-orv' ? 'upload' : 'manual';
  pushStep(method);
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
  uploadedFile.value = file;
  uploading.value = true;
  uploadError.value = null;
  editingSpz.value = false;

  try {
    const formData = new FormData();
    formData.append('file', file);
    // SPZ is now optional - backend will generate placeholder if not provided
    if (spz.value.trim()) {
      formData.append('spz', spz.value.toUpperCase());
    }
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

    // Auto-populate SPZ from OCR extraction
    const ocrData = ocrResult.extracted_data as Record<string, unknown> | null;
    if (ocrData) {
      const regPlate = ocrData.registrationPlateNumber as string | undefined;
      if (regPlate) {
        spz.value = regPlate.toUpperCase().replace(/\s/g, '');
        spzError.value = null;
      }
    }
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
  spz.value = '';
  spzError.value = null;
  editingSpz.value = false;
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

async function createVehicleFromUpload() {
  if (!canSubmitUpload.value || !createdOpportunityId.value) return;

  loading.value = true;
  error.value = null;

  try {
    // Update buying opportunity with SPZ
    const { error: updateError } = await supabase
      .from('buying_opportunities')
      .update({ spz: spz.value.toUpperCase() })
      .eq('id', createdOpportunityId.value);

    if (updateError) throw updateError;

    // Create vehicle from OCR data
    const ocrData = ocrExtraction.value?.extracted_data as Record<string, unknown> | null;
    if (ocrData) {
      const keeperDisplayName = (ocrData.keeperParsedName as string) || (ocrData.keeperName as string) || null;

      const { error: vehicleError } = await supabase.from('vehicles').insert({
        buying_opportunity_id: createdOpportunityId.value,
        spz: spz.value.toUpperCase(),
        vin: (ocrData.vin as string) || null,
        znacka: (ocrData.make as string) || null,
        model: (ocrData.model as string) || null,
        majitel: keeperDisplayName,
        datum_1_registrace: (ocrData.firstRegistrationDate as string) || null,
        palivo: (ocrData.fuelType as string) || null,
        objem_motoru: (ocrData.engineCcm as number) || null,
        vykon_kw: extractPowerKw(ocrData.maxPower as string | number | null),
        pocet_mist: (ocrData.seats as number) || null,
        max_rychlost: (ocrData.maxSpeed as number) || null,
        barva: (ocrData.color as string) || null,
        kategorie_vozidla: (ocrData.vehicleType as string) || null,
        data_source: 'OCR',
      });

      if (vehicleError) throw vehicleError;
    }

    // Move to vendor decision step
    pushStep('vendor-decision');
  } catch (e) {
    error.value = handleError(e, 'CreateOpportunityWizard.createVehicleFromUpload');
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

async function createVehicleFromManual(formData: ManualFormData) {
  if (!createdOpportunityId.value) return;

  loading.value = true;
  error.value = null;

  try {
    // Update buying opportunity with SPZ
    const { error: updateError } = await supabase
      .from('buying_opportunities')
      .update({ spz: formData.spz.toUpperCase() })
      .eq('id', createdOpportunityId.value);

    if (updateError) throw updateError;

    // Create vehicle with manual data
    const { error: vehicleError } = await supabase.from('vehicles').insert({
      buying_opportunity_id: createdOpportunityId.value,
      spz: formData.spz.toUpperCase(),
      vin: formData.vin.toUpperCase() || null,
      znacka: formData.znacka || null,
      model: formData.model || null,
      majitel: formData.majitel.toUpperCase() || null,
      data_source: 'MANUAL',
    });

    if (vehicleError) throw vehicleError;

    // Move to vendor decision step
    pushStep('vendor-decision');
  } catch (e) {
    error.value = handleError(e, 'CreateOpportunityWizard.createVehicleFromManual');
  } finally {
    loading.value = false;
  }
}

// Vendor decision handlers
async function handleVendorDecision() {
  if (!vendorDecision.value || !createdOpportunityId.value || !savedContact.value) return;

  loading.value = true;
  error.value = null;

  try {
    if (vendorDecision.value === 'same') {
      // Copy contact data to vendor using the database function
      const { error: copyError } = await supabase.rpc('copy_contact_to_vendor', {
        p_contact_id: savedContact.value.id,
      });

      if (copyError) throw copyError;

      // Complete the wizard
      completeWizard();
    } else {
      // Go to vendor form for different vendor entry
      pushStep('vendor-form');
    }
  } catch (e) {
    error.value = handleError(e, 'CreateOpportunityWizard.handleVendorDecision');
  } finally {
    loading.value = false;
  }
}

function onVendorSaved(vendor: Vendor) {
  existingVendor.value = vendor;
}

async function completeWizard() {
  if (!createdOpportunityId.value) return;

  // Fetch the created opportunity
  const { data: opportunity, error: fetchError } = await supabase
    .from('buying_opportunities')
    .select('*')
    .eq('id', createdOpportunityId.value)
    .single();

  if (fetchError) {
    error.value = handleError(fetchError, 'CreateOpportunityWizard.completeWizard');
    return;
  }

  emit('created', {
    opportunity,
    entryMethod: entryMethod.value,
    ocrCompleted: ocrExtraction.value?.ocr_status === 'COMPLETED',
  });
}

// Initialize: Create temporary buying opportunity for contact to reference
async function initializeOpportunity() {
  try {
    // Create a placeholder buying opportunity with buying_type
    // SPZ will be updated in the vehicle step
    const placeholderSpz = `TEMP-${Date.now()}`;

    const { data, error: createError } = await supabase
      .from('buying_opportunities')
      .insert({
        spz: placeholderSpz,
        buying_type: buyingType.value,
      })
      .select()
      .single();

    if (createError) throw createError;

    tempOpportunityId.value = data.id;
    createdOpportunityId.value = data.id;
  } catch (e) {
    error.value = handleError(e, 'CreateOpportunityWizard.initializeOpportunity');
  }
}

// Note: initializeOpportunity is now called when user selects deal type
</script>
