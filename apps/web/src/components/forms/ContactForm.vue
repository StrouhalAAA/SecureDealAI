<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-6">Krok 1: Kontaktní osoba</h2>

    <!-- Contact Type Toggle -->
    <fieldset class="mb-6">
      <legend class="block text-sm font-medium text-gray-700 mb-2">
        Typ kontaktu
      </legend>
      <div class="flex flex-col sm:flex-row gap-4" role="radiogroup" aria-label="Typ kontaktu">
        <label
          v-for="type in contactTypes"
          :key="type.value"
          class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
        >
          <input
            type="radio"
            v-model="contactType"
            :value="type.value"
            class="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
            name="contact-type"
            @change="form.contact_type = type.value"
          />
          <span>{{ type.label }}</span>
        </label>
      </div>
    </fieldset>

    <form @submit.prevent="saveAndContinue" novalidate>
      <!-- PHYSICAL_PERSON (FO) Form -->
      <template v-if="contactType === 'PHYSICAL_PERSON'">
        <!-- Name fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label :for="`first-name-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
              Jméno <span class="text-red-500" aria-label="povinná položka">*</span>
            </label>
            <input
              :id="`first-name-${uniqueId}`"
              ref="firstNameRef"
              v-model="form.first_name"
              type="text"
              class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="getFieldClass('first_name', firstNameTouched)"
              required
              autocomplete="given-name"
              @blur="firstNameTouched = true"
            />
            <p v-if="firstNameTouched && !form.first_name" class="text-red-500 text-xs mt-1" role="alert">
              Jméno je povinné pole
            </p>
          </div>
          <div>
            <label :for="`last-name-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
              Příjmení <span class="text-red-500" aria-label="povinná položka">*</span>
            </label>
            <input
              :id="`last-name-${uniqueId}`"
              v-model="form.last_name"
              type="text"
              class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="getFieldClass('last_name', lastNameTouched)"
              required
              autocomplete="family-name"
              @blur="lastNameTouched = true"
            />
            <p v-if="lastNameTouched && !form.last_name" class="text-red-500 text-xs mt-1" role="alert">
              Příjmení je povinné pole
            </p>
          </div>
        </div>

        <!-- Personal ID (RC) and Date of Birth -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label :for="`personal-id-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
              Rodné číslo
            </label>
            <input
              :id="`personal-id-${uniqueId}`"
              v-model="form.personal_id"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="######/####"
              inputmode="numeric"
              @input="formatRodneCislo"
            />
          </div>
          <div>
            <label :for="`dob-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
              Datum narození
            </label>
            <input
              :id="`dob-${uniqueId}`"
              v-model="form.date_of_birth"
              type="date"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </template>

      <!-- BUSINESS_PERSON (OSVČ) Form -->
      <template v-else-if="contactType === 'BUSINESS_PERSON'">
        <!-- ICO with ARES lookup -->
        <div class="mb-4">
          <label :for="`ico-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
            IČO <span class="text-red-500" aria-label="povinná položka">*</span>
          </label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              :id="`ico-${uniqueId}`"
              ref="icoInputRef"
              v-model="form.company_id"
              type="text"
              class="flex-1 px-4 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="getIcoFieldClass()"
              placeholder="8 číslic"
              maxlength="8"
              inputmode="numeric"
              required
              @input="onIcoInput"
              @blur="icoTouched = true"
            />
            <LoadingButton
              type="button"
              @click="lookupAres"
              :disabled="!isValidIco"
              :loading="aresLoading"
              loading-text="Načítám..."
              variant="secondary"
              size="md"
              aria-label="Načíst ICO z registru ARES"
            >
              Načíst z Aresu
            </LoadingButton>
          </div>
          <p v-if="icoTouched && icoError" class="text-red-500 text-xs mt-1" role="alert">
            {{ icoError }}
          </p>
          <AresStatus :status="aresStatus" :message="aresMessage" class="mt-2" />
        </div>

        <!-- Company Name -->
        <div class="mb-4">
          <label :for="`company-name-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
            Obchodní jméno / Název <span class="text-red-500" aria-label="povinná položka">*</span>
            <span v-if="autoFilled.company_name" class="text-green-600 text-xs ml-2">(z ARES)</span>
          </label>
          <input
            :id="`company-name-${uniqueId}`"
            v-model="form.company_name"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="getFieldClass('company_name', companyNameTouched, autoFilled.company_name)"
            required
            @blur="companyNameTouched = true"
          />
          <p v-if="companyNameTouched && !form.company_name" class="text-red-500 text-xs mt-1" role="alert">
            Název je povinné pole
          </p>
        </div>

        <!-- VAT Payer Toggle -->
        <div class="mb-4">
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 mb-2">
              Plátce DPH
            </legend>
            <div class="flex gap-4" role="radiogroup">
              <label class="flex items-center cursor-pointer">
                <input
                  type="radio"
                  :value="false"
                  v-model="form.is_vat_payer"
                  class="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  name="vat-payer"
                />
                <span>Ne</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input
                  type="radio"
                  :value="true"
                  v-model="form.is_vat_payer"
                  class="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  name="vat-payer"
                />
                <span>Ano</span>
              </label>
            </div>
          </fieldset>
        </div>

        <!-- DIC (only when VAT payer) -->
        <div v-if="form.is_vat_payer" class="mb-4">
          <label :for="`dic-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
            DIČ <span class="text-red-500" aria-label="povinná položka">*</span>
            <span v-if="autoFilled.vat_id" class="text-green-600 text-xs ml-2">(z ARES)</span>
          </label>
          <input
            :id="`dic-${uniqueId}`"
            v-model="form.vat_id"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="getFieldClass('vat_id', vatIdTouched, autoFilled.vat_id)"
            placeholder="CZxxxxxxxx"
            required
            @blur="vatIdTouched = true"
          />
          <p v-if="vatIdTouched && form.is_vat_payer && !form.vat_id" class="text-red-500 text-xs mt-1" role="alert">
            DIČ je povinné pro plátce DPH
          </p>
        </div>

        <!-- Name fields for OSVČ (person behind the business) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label :for="`osvc-first-name-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
              Jméno osoby
            </label>
            <input
              :id="`osvc-first-name-${uniqueId}`"
              v-model="form.first_name"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autocomplete="given-name"
            />
          </div>
          <div>
            <label :for="`osvc-last-name-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
              Příjmení osoby
            </label>
            <input
              :id="`osvc-last-name-${uniqueId}`"
              v-model="form.last_name"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autocomplete="family-name"
            />
          </div>
        </div>
      </template>

      <!-- COMPANY (Firma) Form -->
      <template v-else-if="contactType === 'COMPANY'">
        <!-- ICO with ARES lookup -->
        <div class="mb-4">
          <label :for="`firma-ico-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
            IČO <span class="text-red-500" aria-label="povinná položka">*</span>
          </label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input
              :id="`firma-ico-${uniqueId}`"
              ref="firmaIcoInputRef"
              v-model="form.company_id"
              type="text"
              class="flex-1 px-4 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :class="getIcoFieldClass()"
              placeholder="8 číslic"
              maxlength="8"
              inputmode="numeric"
              required
              @input="onIcoInput"
              @blur="icoTouched = true"
            />
            <LoadingButton
              type="button"
              @click="lookupAres"
              :disabled="!isValidIco"
              :loading="aresLoading"
              loading-text="Načítám..."
              variant="secondary"
              size="md"
              aria-label="Načíst ICO z registru ARES"
            >
              Načíst z Aresu
            </LoadingButton>
          </div>
          <p v-if="icoTouched && icoError" class="text-red-500 text-xs mt-1" role="alert">
            {{ icoError }}
          </p>
          <AresStatus :status="aresStatus" :message="aresMessage" class="mt-2" />
        </div>

        <!-- Company Name -->
        <div class="mb-4">
          <label :for="`firma-name-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
            Název firmy <span class="text-red-500" aria-label="povinná položka">*</span>
            <span v-if="autoFilled.company_name" class="text-green-600 text-xs ml-2">(z ARES)</span>
          </label>
          <input
            :id="`firma-name-${uniqueId}`"
            v-model="form.company_name"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="getFieldClass('company_name', companyNameTouched, autoFilled.company_name)"
            required
            @blur="companyNameTouched = true"
          />
          <p v-if="companyNameTouched && !form.company_name" class="text-red-500 text-xs mt-1" role="alert">
            Název firmy je povinné pole
          </p>
        </div>

        <!-- VAT Payer Toggle -->
        <div class="mb-4">
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 mb-2">
              Plátce DPH
            </legend>
            <div class="flex gap-4" role="radiogroup">
              <label class="flex items-center cursor-pointer">
                <input
                  type="radio"
                  :value="false"
                  v-model="form.is_vat_payer"
                  class="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  name="firma-vat-payer"
                />
                <span>Ne</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input
                  type="radio"
                  :value="true"
                  v-model="form.is_vat_payer"
                  class="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  name="firma-vat-payer"
                />
                <span>Ano</span>
              </label>
            </div>
          </fieldset>
        </div>

        <!-- DIC (only when VAT payer) -->
        <div v-if="form.is_vat_payer" class="mb-4">
          <label :for="`firma-dic-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
            DIČ <span class="text-red-500" aria-label="povinná položka">*</span>
            <span v-if="autoFilled.vat_id" class="text-green-600 text-xs ml-2">(z ARES)</span>
          </label>
          <input
            :id="`firma-dic-${uniqueId}`"
            v-model="form.vat_id"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="getFieldClass('vat_id', vatIdTouched, autoFilled.vat_id)"
            placeholder="CZxxxxxxxx"
            required
            @blur="vatIdTouched = true"
          />
          <p v-if="vatIdTouched && form.is_vat_payer && !form.vat_id" class="text-red-500 text-xs mt-1" role="alert">
            DIČ je povinné pro plátce DPH
          </p>
        </div>

        <!-- Contact Person Section -->
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 class="text-md font-semibold text-gray-800 mb-4">Kontaktní osoba firmy</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label :for="`cp-first-name-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
                Jméno <span class="text-red-500" aria-label="povinná položka">*</span>
              </label>
              <input
                :id="`cp-first-name-${uniqueId}`"
                v-model="form.contact_person_first_name"
                type="text"
                class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                :class="getFieldClass('contact_person_first_name', cpFirstNameTouched)"
                required
                @blur="cpFirstNameTouched = true"
              />
              <p v-if="cpFirstNameTouched && !form.contact_person_first_name" class="text-red-500 text-xs mt-1" role="alert">
                Jméno je povinné pole
              </p>
            </div>
            <div>
              <label :for="`cp-last-name-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
                Příjmení <span class="text-red-500" aria-label="povinná položka">*</span>
              </label>
              <input
                :id="`cp-last-name-${uniqueId}`"
                v-model="form.contact_person_last_name"
                type="text"
                class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                :class="getFieldClass('contact_person_last_name', cpLastNameTouched)"
                required
                @blur="cpLastNameTouched = true"
              />
              <p v-if="cpLastNameTouched && !form.contact_person_last_name" class="text-red-500 text-xs mt-1" role="alert">
                Příjmení je povinné pole
              </p>
            </div>
          </div>

          <!-- Contact person phone and email -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label :for="`cp-phone-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <div class="flex gap-2">
                <select
                  v-model="form.contact_person_phone_prefix"
                  class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="+420">+420</option>
                  <option value="+421">+421</option>
                </select>
                <input
                  :id="`cp-phone-${uniqueId}`"
                  v-model="form.contact_person_phone_number"
                  type="tel"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="xxx xxx xxx"
                />
              </div>
            </div>
            <div>
              <label :for="`cp-email-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                :id="`cp-email-${uniqueId}`"
                v-model="form.contact_person_email"
                type="email"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- COMMON FIELDS (Phone, Email) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label :for="`phone-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
            Telefon {{ contactType === 'COMPANY' ? 'firmy' : '' }}
          </label>
          <div class="flex gap-2">
            <select
              v-model="form.phone_prefix"
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="+420">+420</option>
              <option value="+421">+421</option>
            </select>
            <input
              :id="`phone-${uniqueId}`"
              v-model="form.phone_number"
              type="tel"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="xxx xxx xxx"
            />
          </div>
        </div>
        <div>
          <label :for="`email-${uniqueId}`" class="block text-sm font-medium text-gray-700 mb-1">
            Email {{ contactType === 'COMPANY' ? 'firmy' : '' }}
          </label>
          <input
            :id="`email-${uniqueId}`"
            v-model="form.email"
            type="email"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200" role="alert">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex flex-col sm:flex-row justify-between gap-2">
        <LoadingButton
          type="button"
          @click="$emit('back')"
          variant="outline"
          size="md"
        >
          Zrušit
        </LoadingButton>
        <LoadingButton
          type="submit"
          :loading="loading"
          :disabled="!isValid"
          loading-text="Ukladam..."
          variant="primary"
          size="md"
        >
          Další krok
        </LoadingButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { debounce } from 'lodash-es';
import { supabase } from '@/composables/useSupabase';
import { useErrorHandler } from '@/composables/useErrorHandler';
import AresStatus from '@/components/shared/AresStatus.vue';
import LoadingButton from '@/components/shared/LoadingButton.vue';
import type { Contact, ContactType, ContactFormState, AresStatusType } from '@/types';

const props = defineProps<{
  buyingOpportunityId: string;
  existingContact?: Contact | null;
}>();

const emit = defineEmits<{
  (e: 'saved', contact: Contact): void;
  (e: 'next'): void;
  (e: 'back'): void;
}>();

const { handleError } = useErrorHandler();

// Unique ID for accessibility
const uniqueId = Math.random().toString(36).substr(2, 9);

// Contact type options
const contactTypes: { value: ContactType; label: string }[] = [
  { value: 'PHYSICAL_PERSON', label: 'Fyzická osoba' },
  { value: 'BUSINESS_PERSON', label: 'OSVČ' },
  { value: 'COMPANY', label: 'Firma' },
];

// Refs for focus management
const firstNameRef = ref<HTMLInputElement | null>(null);
const icoInputRef = ref<HTMLInputElement | null>(null);
const firmaIcoInputRef = ref<HTMLInputElement | null>(null);

// Form state
const contactType = ref<ContactType>('PHYSICAL_PERSON');
const contactId = ref<string | null>(null);

const form = ref<ContactFormState>({
  contact_type: 'PHYSICAL_PERSON',
  country: 'Česká republika',
  country_code: 'CZ',
  phone_prefix: '+420',
  phone_number: '',
  email: '',
  first_name: '',
  last_name: '',
  personal_id: '',
  date_of_birth: '',
  company_name: '',
  company_id: '',
  is_vat_payer: false,
  vat_id: '',
  contact_person_first_name: '',
  contact_person_last_name: '',
  contact_person_phone_prefix: '+420',
  contact_person_phone_number: '',
  contact_person_email: '',
});

// Touched state
const firstNameTouched = ref(false);
const lastNameTouched = ref(false);
const companyNameTouched = ref(false);
const icoTouched = ref(false);
const vatIdTouched = ref(false);
const cpFirstNameTouched = ref(false);
const cpLastNameTouched = ref(false);

// ARES state
const aresLoading = ref(false);
const aresStatus = ref<AresStatusType>('idle');
const aresMessage = ref('');
const aresVerified = ref(false);
const aresVerifiedAt = ref<string | null>(null);
const aresData = ref<Record<string, unknown> | null>(null);

// Auto-filled tracking
const autoFilled = ref({
  company_name: false,
  vat_id: false,
});

// General state
const loading = ref(false);
const error = ref<string | null>(null);

// Validation
const isValidIco = computed(() => {
  const ico = form.value.company_id;
  if (!ico || ico.length !== 8) return false;
  if (!/^\d{8}$/.test(ico)) return false;

  // Czech ICO checksum validation (modulo 11)
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 7; i++) {
    sum += parseInt(ico[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  let checkDigit: number;

  if (remainder === 0) {
    checkDigit = 1;
  } else if (remainder === 1) {
    checkDigit = 0;
  } else {
    checkDigit = 11 - remainder;
  }

  return parseInt(ico[7], 10) === checkDigit;
});

const icoError = computed(() => {
  if (!form.value.company_id) return 'IČO je povinné pole';
  if (!/^\d+$/.test(form.value.company_id)) return 'IČO musí obsahovat pouze číslice';
  if (form.value.company_id.length !== 8) return 'IČO musí mít přesně 8 číslic';
  if (!isValidIco.value) return 'Neplatné IČO (kontrolní součet)';
  return null;
});

const isValid = computed(() => {
  switch (contactType.value) {
    case 'PHYSICAL_PERSON':
      return !!form.value.first_name && !!form.value.last_name;

    case 'BUSINESS_PERSON':
      return (
        !!form.value.company_name &&
        isValidIco.value &&
        (!form.value.is_vat_payer || !!form.value.vat_id)
      );

    case 'COMPANY':
      return (
        !!form.value.company_name &&
        isValidIco.value &&
        (!form.value.is_vat_payer || !!form.value.vat_id) &&
        !!form.value.contact_person_first_name &&
        !!form.value.contact_person_last_name
      );

    default:
      return false;
  }
});

// Methods
function formatRodneCislo(event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, '');

  if (value.length > 6) {
    value = value.slice(0, 6) + '/' + value.slice(6, 10);
  }

  form.value.personal_id = value;
}

function onIcoInput() {
  if (aresStatus.value !== 'idle') {
    aresStatus.value = 'idle';
    aresMessage.value = '';
    aresVerified.value = false;
    aresVerifiedAt.value = null;
    aresData.value = null;
    autoFilled.value = { company_name: false, vat_id: false };
  }

  if (isValidIco.value) {
    debouncedLookup();
  }
}

async function lookupAres() {
  if (!isValidIco.value || aresLoading.value) return;

  aresLoading.value = true;
  aresStatus.value = 'loading';
  aresMessage.value = '';

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/ares-lookup/${form.value.company_id}`,
      {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (result.found) {
      form.value.company_name = result.data.name || '';
      form.value.vat_id = result.data.dic || '';

      if (result.data.dic) {
        form.value.is_vat_payer = true;
      }

      autoFilled.value = {
        company_name: !!result.data.name,
        vat_id: !!result.data.dic,
      };

      aresVerified.value = true;
      aresVerifiedAt.value = new Date().toISOString();
      aresData.value = result.data;
      aresStatus.value = 'verified';
      aresMessage.value = `Overeno: ${result.data.name}`;
    } else {
      aresStatus.value = 'not_found';
      aresMessage.value = result.message || 'Nenalezeno v ARES';
      aresVerified.value = false;
    }
  } catch (e) {
    console.error('ARES lookup error:', e);
    aresStatus.value = 'error';
    aresMessage.value = 'Chyba při ověřování v ARES';
    aresVerified.value = false;
  } finally {
    aresLoading.value = false;
  }
}

const debouncedLookup = debounce(() => {
  lookupAres();
}, 500);

function getFieldClass(field: string, touched: boolean, autofilled = false): string {
  const value = (form.value as Record<string, unknown>)[field];
  if (autofilled) {
    return 'bg-green-50 border-green-300';
  }
  if (!touched) {
    return 'border-gray-300';
  }
  return value ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50';
}

function getIcoFieldClass(): string {
  if (!icoTouched.value) {
    return 'border-gray-300';
  }
  if (form.value.company_id && isValidIco.value) {
    return 'border-green-500 bg-green-50';
  }
  if (form.value.company_id && !isValidIco.value) {
    return 'border-red-500 bg-red-50';
  }
  return 'border-gray-300';
}

async function saveAndContinue() {
  // Mark all relevant fields as touched
  if (contactType.value === 'PHYSICAL_PERSON') {
    firstNameTouched.value = true;
    lastNameTouched.value = true;
  } else if (contactType.value === 'BUSINESS_PERSON') {
    companyNameTouched.value = true;
    icoTouched.value = true;
    if (form.value.is_vat_payer) vatIdTouched.value = true;
  } else if (contactType.value === 'COMPANY') {
    companyNameTouched.value = true;
    icoTouched.value = true;
    if (form.value.is_vat_payer) vatIdTouched.value = true;
    cpFirstNameTouched.value = true;
    cpLastNameTouched.value = true;
  }

  if (!isValid.value) return;

  loading.value = true;
  error.value = null;

  try {
    const contactData = {
      buying_opportunity_id: props.buyingOpportunityId,
      contact_type: contactType.value,
      country: form.value.country,
      country_code: form.value.country_code,
      phone_prefix: form.value.phone_prefix || null,
      phone_number: form.value.phone_number || null,
      email: form.value.email || null,
      first_name: contactType.value !== 'COMPANY'
        ? (form.value.first_name?.toUpperCase() || null)
        : null,
      last_name: contactType.value !== 'COMPANY'
        ? (form.value.last_name?.toUpperCase() || null)
        : null,
      personal_id: contactType.value === 'PHYSICAL_PERSON'
        ? (form.value.personal_id || null)
        : null,
      date_of_birth: contactType.value === 'PHYSICAL_PERSON' && form.value.date_of_birth
        ? form.value.date_of_birth
        : null,
      company_name: contactType.value !== 'PHYSICAL_PERSON'
        ? (form.value.company_name?.toUpperCase() || null)
        : null,
      company_id: contactType.value !== 'PHYSICAL_PERSON'
        ? (form.value.company_id || null)
        : null,
      is_vat_payer: contactType.value !== 'PHYSICAL_PERSON' ? form.value.is_vat_payer : false,
      vat_id: contactType.value !== 'PHYSICAL_PERSON' && form.value.is_vat_payer
        ? (form.value.vat_id?.toUpperCase() || null)
        : null,
      ares_verified: contactType.value !== 'PHYSICAL_PERSON' ? aresVerified.value : false,
      ares_verified_at: contactType.value !== 'PHYSICAL_PERSON' ? aresVerifiedAt.value : null,
      ares_data: contactType.value !== 'PHYSICAL_PERSON' ? aresData.value : null,
      contact_person: contactType.value === 'COMPANY'
        ? {
            first_name: form.value.contact_person_first_name?.toUpperCase() || '',
            last_name: form.value.contact_person_last_name?.toUpperCase() || '',
            phone_prefix: form.value.contact_person_phone_prefix || null,
            phone_number: form.value.contact_person_phone_number || null,
            email: form.value.contact_person_email || null,
          }
        : null,
      data_source: aresVerified.value ? 'ARES' : 'MANUAL',
    };

    let result;

    if (contactId.value) {
      result = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', contactId.value)
        .select()
        .single();
    } else {
      result = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    contactId.value = result.data.id;
    emit('saved', result.data);
    emit('next');
  } catch (e) {
    error.value = handleError(e, 'ContactForm.saveAndContinue');
  } finally {
    loading.value = false;
  }
}

// Watch contact type changes
watch(contactType, async (newType) => {
  // Reset ARES state when switching types
  if (newType === 'PHYSICAL_PERSON') {
    aresStatus.value = 'idle';
    aresMessage.value = '';
    aresVerified.value = false;
    aresVerifiedAt.value = null;
    aresData.value = null;
    autoFilled.value = { company_name: false, vat_id: false };
  }

  // Focus first input
  await nextTick();
  if (newType === 'PHYSICAL_PERSON') {
    firstNameRef.value?.focus();
  } else if (newType === 'BUSINESS_PERSON') {
    icoInputRef.value?.focus();
  } else if (newType === 'COMPANY') {
    firmaIcoInputRef.value?.focus();
  }
});

// Load existing contact
onMounted(async () => {
  if (props.existingContact) {
    contactId.value = props.existingContact.id;
    contactType.value = props.existingContact.contact_type;

    form.value = {
      contact_type: props.existingContact.contact_type,
      country: props.existingContact.country,
      country_code: props.existingContact.country_code,
      phone_prefix: props.existingContact.phone_prefix || '+420',
      phone_number: props.existingContact.phone_number || '',
      email: props.existingContact.email || '',
      first_name: props.existingContact.first_name || '',
      last_name: props.existingContact.last_name || '',
      personal_id: props.existingContact.personal_id || '',
      date_of_birth: props.existingContact.date_of_birth || '',
      company_name: props.existingContact.company_name || '',
      company_id: props.existingContact.company_id || '',
      is_vat_payer: props.existingContact.is_vat_payer,
      vat_id: props.existingContact.vat_id || '',
      contact_person_first_name: props.existingContact.contact_person?.first_name || '',
      contact_person_last_name: props.existingContact.contact_person?.last_name || '',
      contact_person_phone_prefix: props.existingContact.contact_person?.phone_prefix || '+420',
      contact_person_phone_number: props.existingContact.contact_person?.phone_number || '',
      contact_person_email: props.existingContact.contact_person?.email || '',
    };

    if (props.existingContact.ares_verified) {
      aresVerified.value = true;
      aresVerifiedAt.value = props.existingContact.ares_verified_at;
      aresData.value = props.existingContact.ares_data;
      aresStatus.value = 'verified';
      aresMessage.value = 'Overeno v ARES';
    }
  }

  await nextTick();
  if (contactType.value === 'PHYSICAL_PERSON') {
    firstNameRef.value?.focus();
  } else if (contactType.value === 'BUSINESS_PERSON') {
    icoInputRef.value?.focus();
  } else if (contactType.value === 'COMPANY') {
    firmaIcoInputRef.value?.focus();
  }
});
</script>
