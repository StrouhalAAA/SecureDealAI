<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-6">Krok 1: Data vozidla</h2>

    <form @submit.prevent="saveAndContinue" novalidate>
      <!-- Row 1: SPZ + VIN -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label :for="spzInputId" class="block text-sm font-medium text-gray-700 mb-1">
            SPZ <span class="text-red-500" aria-label="povinna polozka">*</span>
          </label>
          <input
            :id="spzInputId"
            ref="spzInputRef"
            v-model="form.spz"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-gray-300': !form.spz || !spzTouched,
              'border-green-500 bg-green-50': form.spz && spzTouched && !spzError,
              'border-red-500 bg-red-50': spzTouched && spzError,
            }"
            placeholder="napr. 5L94454"
            required
            :disabled="isSpzLocked"
            :aria-describedby="spzError ? spzErrorId : undefined"
            :aria-invalid="spzTouched && !!spzError"
            @blur="spzTouched = true"
          />
          <p v-if="spzTouched && spzError" :id="spzErrorId" class="text-red-500 text-xs mt-1" role="alert">
            {{ spzError }}
          </p>
          <p v-else-if="form.spz && spzTouched && !spzError" class="text-green-600 text-xs mt-1">
            Platna SPZ
          </p>
        </div>
        <div>
          <label :for="vinInputId" class="block text-sm font-medium text-gray-700 mb-1">
            VIN <span class="text-red-500" aria-label="povinna polozka">*</span>
          </label>
          <input
            :id="vinInputId"
            v-model="form.vin"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :class="{
              'border-gray-300': !form.vin || !vinTouched,
              'border-green-500 bg-green-50': form.vin && vinTouched && !vinError,
              'border-red-500 bg-red-50': vinTouched && vinError,
            }"
            placeholder="17 znaku"
            required
            maxlength="17"
            :aria-describedby="vinError ? vinErrorId : undefined"
            :aria-invalid="vinTouched && !!vinError"
            @blur="vinTouched = true"
          />
          <p v-if="vinTouched && vinError" :id="vinErrorId" class="text-red-500 text-xs mt-1" role="alert">
            {{ vinError }}
          </p>
          <p v-else-if="form.vin && vinTouched && !vinError" class="text-green-600 text-xs mt-1">
            Platny VIN
          </p>
        </div>
      </div>

      <!-- Row 2: Brand + Model -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="znacka-input" class="block text-sm font-medium text-gray-700 mb-1">
            Znacka
          </label>
          <input
            id="znacka-input"
            v-model="form.znacka"
            type="text"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="napr. VOLVO"
          />
        </div>
        <div>
          <label for="model-input" class="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <input
            id="model-input"
            v-model="form.model"
            type="text"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="napr. V90 CROSS COUNTRY"
          />
        </div>
      </div>

      <!-- Row 3: Year + First Registration -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="rok-vyroby-input" class="block text-sm font-medium text-gray-700 mb-1">
            Rok vyroby
          </label>
          <input
            id="rok-vyroby-input"
            v-model.number="form.rok_vyroby"
            type="number"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="napr. 2019"
            min="1900"
            :max="currentYear + 1"
          />
        </div>
        <div>
          <label for="datum-registrace-input" class="block text-sm font-medium text-gray-700 mb-1">
            Datum 1. registrace
          </label>
          <input
            id="datum-registrace-input"
            v-model="form.datum_1_registrace"
            type="date"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Row 4: Owner -->
      <div class="mb-4">
        <label :for="majitelInputId" class="block text-sm font-medium text-gray-700 mb-1">
          Majitel / Provozovatel <span class="text-red-500" aria-label="povinna polozka">*</span>
        </label>
        <input
          :id="majitelInputId"
          v-model="form.majitel"
          type="text"
          class="w-full px-4 py-2 border rounded-lg uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{
            'border-gray-300': !majitelTouched,
            'border-green-500 bg-green-50': form.majitel && majitelTouched,
            'border-red-500 bg-red-50': majitelTouched && !form.majitel,
          }"
          placeholder="Jmeno majitele nebo nazev firmy"
          required
          :aria-describedby="majitelTouched && !form.majitel ? majitelErrorId : undefined"
          :aria-invalid="majitelTouched && !form.majitel"
          @blur="majitelTouched = true"
        />
        <p v-if="majitelTouched && !form.majitel" :id="majitelErrorId" class="text-red-500 text-xs mt-1" role="alert">
          Majitel je povinne pole
        </p>
      </div>

      <!-- Row 5: Engine + Power -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="motor-select" class="block text-sm font-medium text-gray-700 mb-1">
            Motor
          </label>
          <select
            id="motor-select"
            v-model="form.motor"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Vyberte --</option>
            <option value="benzin">Benzin</option>
            <option value="nafta">Nafta</option>
            <option value="elektro">Elektro</option>
            <option value="hybrid">Hybrid</option>
            <option value="LPG">LPG</option>
            <option value="CNG">CNG</option>
          </select>
        </div>
        <div>
          <label for="vykon-input" class="block text-sm font-medium text-gray-700 mb-1">
            Vykon (kW)
          </label>
          <input
            id="vykon-input"
            v-model.number="form.vykon_kw"
            type="number"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="napr. 228"
            min="0"
          />
        </div>
      </div>

      <!-- Row 6: Tachometer (Phase 7.1 - Fraud Detection) -->
      <div class="mb-6">
        <label :for="tachometerInputId" class="block text-sm font-medium text-gray-700 mb-1">
          Stav tachometru (km)
          <span class="text-xs text-gray-500 ml-1">- dulezite pro detekci manipulace</span>
        </label>
        <input
          :id="tachometerInputId"
          v-model.number="form.tachometer_km"
          type="number"
          class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{
            'border-gray-300 focus:border-blue-500': !tachometerError,
            'border-red-500 bg-red-50 focus:border-red-500': tachometerError,
          }"
          placeholder="napr. 150000"
          min="0"
          :aria-describedby="tachometerError ? tachometerErrorId : undefined"
          :aria-invalid="!!tachometerError"
        />
        <p v-if="tachometerError" :id="tachometerErrorId" class="text-red-500 text-xs mt-1" role="alert">
          {{ tachometerError }}
        </p>
      </div>

      <!-- OCR Data Section (Phase 7.2 & 7.3 - Read Only) -->
      <div v-if="hasOCRData" class="mb-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div class="flex items-center gap-2 mb-4">
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-base font-medium text-gray-700">Udaje z OCR (technicky prukaz)</h3>
          <span class="ml-auto text-xs text-gray-500 flex items-center gap-1">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
            </svg>
            Pouze pro cteni
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <!-- Color -->
          <div>
            <span class="text-gray-500 block text-xs">Barva</span>
            <p class="font-medium">{{ getOCRFieldValue('barva') || '-' }}</p>
          </div>

          <!-- Fuel Type -->
          <div>
            <span class="text-gray-500 block text-xs">Palivo</span>
            <p class="font-medium">{{ fuelTypeLabel }}</p>
          </div>

          <!-- Engine Capacity -->
          <div>
            <span class="text-gray-500 block text-xs">Objem motoru</span>
            <p class="font-medium">
              {{ getOCRFieldValue('objem_motoru') ? `${getOCRFieldValue('objem_motoru')} cm3` : '-' }}
            </p>
          </div>

          <!-- Seats -->
          <div>
            <span class="text-gray-500 block text-xs">Pocet mist</span>
            <p class="font-medium">{{ getOCRFieldValue('pocet_mist') || '-' }}</p>
          </div>

          <!-- Power -->
          <div>
            <span class="text-gray-500 block text-xs">Vykon</span>
            <p class="font-medium">
              {{ getOCRFieldValue('vykon_kw') ? `${getOCRFieldValue('vykon_kw')} kW` : '-' }}
            </p>
          </div>

          <!-- Max Speed -->
          <div>
            <span class="text-gray-500 block text-xs">Max. rychlost</span>
            <p class="font-medium">
              {{ getOCRFieldValue('max_rychlost') ? `${getOCRFieldValue('max_rychlost')} km/h` : '-' }}
            </p>
          </div>

          <!-- Vehicle Category -->
          <div>
            <span class="text-gray-500 block text-xs">Kategorie</span>
            <p class="font-medium">{{ getOCRFieldValue('kategorie_vozidla') || '-' }}</p>
          </div>

          <!-- Body Type -->
          <div>
            <span class="text-gray-500 block text-xs">Karoserie</span>
            <p class="font-medium">{{ getOCRFieldValue('karoserie') || '-' }}</p>
          </div>
        </div>

        <!-- Extended VTP data (collapsible) -->
        <details class="mt-4">
          <summary class="cursor-pointer text-blue-600 hover:text-blue-800 text-sm">
            Zobrazit rozsirene technicke udaje
          </summary>
          <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2 border-t border-gray-200">
            <div>
              <span class="text-gray-500 block text-xs">Hmotnost (provozni)</span>
              <p class="font-medium">
                {{ getOCRFieldValue('provozni_hmotnost') ? `${getOCRFieldValue('provozni_hmotnost')} kg` : '-' }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 block text-xs">Delka</span>
              <p class="font-medium">
                {{ getOCRFieldValue('delka') ? `${getOCRFieldValue('delka')} mm` : '-' }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 block text-xs">Sirka</span>
              <p class="font-medium">
                {{ getOCRFieldValue('sirka') ? `${getOCRFieldValue('sirka')} mm` : '-' }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 block text-xs">Vyska</span>
              <p class="font-medium">
                {{ getOCRFieldValue('vyska') ? `${getOCRFieldValue('vyska')} mm` : '-' }}
              </p>
            </div>
            <div>
              <span class="text-gray-500 block text-xs">Emise CO2</span>
              <p class="font-medium">{{ getOCRFieldValue('emise_co2') || '-' }}</p>
            </div>
            <div>
              <span class="text-gray-500 block text-xs">STK platnost</span>
              <p class="font-medium">{{ getOCRFieldValue('stk_platnost') || '-' }}</p>
            </div>
          </div>
        </details>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200" role="alert">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex flex-col sm:flex-row justify-end gap-2">
        <LoadingButton
          type="submit"
          :loading="loading"
          :disabled="!isValid || !!tachometerError"
          loading-text="Ukladam..."
          variant="primary"
          size="md"
        >
          Dalsi krok
        </LoadingButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { supabase } from '@/composables/useSupabase';
import { useErrorHandler } from '@/composables/useErrorHandler';
import LoadingButton from '@/components/shared/LoadingButton.vue';
import type { Vehicle, VehicleOCRData } from '@/types';
import { getFuelTypeLabel } from '@/types';

const props = defineProps<{
  buyingOpportunityId: string;
  initialSpz?: string;
  existingVehicle?: Vehicle | null;
  ocrData?: VehicleOCRData | null;
}>();

const emit = defineEmits<{
  (e: 'saved', vehicle: Vehicle): void;
  (e: 'next'): void;
}>();

const { handleError } = useErrorHandler();

const currentYear = new Date().getFullYear();

// Generate unique IDs for accessibility
const uniqueId = Math.random().toString(36).substr(2, 9);
const spzInputId = `spz-input-${uniqueId}`;
const spzErrorId = `spz-error-${uniqueId}`;
const vinInputId = `vin-input-${uniqueId}`;
const vinErrorId = `vin-error-${uniqueId}`;
const majitelInputId = `majitel-input-${uniqueId}`;
const majitelErrorId = `majitel-error-${uniqueId}`;
const tachometerInputId = `tachometer-input-${uniqueId}`;
const tachometerErrorId = `tachometer-error-${uniqueId}`;

// Refs for focus management
const spzInputRef = ref<HTMLInputElement | null>(null);

const form = ref({
  spz: props.initialSpz || '',
  vin: '',
  znacka: '',
  model: '',
  rok_vyroby: null as number | null,
  datum_1_registrace: '',
  majitel: '',
  motor: '',
  vykon_kw: null as number | null,
  tachometer_km: null as number | null,
});

// Touched state for field validation feedback
const spzTouched = ref(false);
const vinTouched = ref(false);
const majitelTouched = ref(false);

const loading = ref(false);
const error = ref<string | null>(null);
const vehicleId = ref<string | null>(null);

const isSpzLocked = computed(() => !!props.initialSpz);

// Has OCR data been extracted?
const hasOCRData = computed(() => {
  if (!props.ocrData) return false;
  // Check if any OCR field has a value
  return Object.values(props.ocrData).some(v => v !== null && v !== undefined);
});

// Get display value for OCR field
const getOCRFieldValue = (field: keyof VehicleOCRData) => {
  return props.ocrData?.[field];
};

// Get fuel type label
const fuelTypeLabel = computed(() => {
  const value = props.ocrData?.palivo;
  return getFuelTypeLabel(value);
});

// SPZ validation
const spzError = computed(() => {
  if (!form.value.spz) return 'SPZ je povinne pole';
  // Czech SPZ format validation (simplified)
  if (form.value.spz.length < 5 || form.value.spz.length > 8) {
    return 'SPZ musi mit 5-8 znaku';
  }
  return null;
});

const vinError = computed(() => {
  if (!form.value.vin) return 'VIN je povinne pole';
  if (form.value.vin.length !== 17) return 'VIN musi mit presne 17 znaku';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(form.value.vin)) {
    return 'VIN obsahuje neplatne znaky (I, O, Q nejsou povoleny)';
  }
  return null;
});

// Tachometer validation (Phase 7.1 - Fraud detection)
const tachometerError = computed(() => {
  if (form.value.tachometer_km === null || form.value.tachometer_km === undefined) {
    return null;
  }
  if (form.value.tachometer_km < 0) {
    return 'Stav tachometru nemuze byt zaporny';
  }
  if (form.value.tachometer_km > 2000000) {
    return 'Stav tachometru se zda nerealisticky (> 2 000 000 km)';
  }
  return null;
});

const isValid = computed(() => {
  return (
    form.value.spz &&
    !spzError.value &&
    form.value.vin &&
    form.value.vin.length === 17 &&
    !vinError.value &&
    form.value.majitel
  );
});

async function saveAndContinue() {
  // Mark all fields as touched to show validation
  spzTouched.value = true;
  vinTouched.value = true;
  majitelTouched.value = true;

  if (!isValid.value || tachometerError.value) return;

  loading.value = true;
  error.value = null;

  try {
    // Base editable fields
    const editableData = {
      buying_opportunity_id: props.buyingOpportunityId,
      spz: form.value.spz.toUpperCase(),
      vin: form.value.vin.toUpperCase(),
      znacka: form.value.znacka || null,
      model: form.value.model || null,
      rok_vyroby: form.value.rok_vyroby,
      datum_1_registrace: form.value.datum_1_registrace || null,
      majitel: form.value.majitel.toUpperCase(),
      motor: form.value.motor || null,
      vykon_kw: form.value.vykon_kw,
      tachometer_km: form.value.tachometer_km,
    };

    let result;

    if (vehicleId.value) {
      // Update existing - only update editable fields, preserve OCR data
      result = await supabase
        .from('vehicles')
        .update(editableData)
        .eq('id', vehicleId.value)
        .select()
        .single();
    } else {
      // Create new - set data_source to MANUAL
      result = await supabase
        .from('vehicles')
        .insert({
          ...editableData,
          data_source: 'MANUAL',
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    vehicleId.value = result.data.id;
    emit('saved', result.data);
    emit('next');
  } catch (e) {
    error.value = handleError(e, 'VehicleForm.saveAndContinue');
  } finally {
    loading.value = false;
  }
}

// Load existing vehicle data and focus first input
onMounted(async () => {
  if (props.existingVehicle) {
    vehicleId.value = props.existingVehicle.id ?? null;
    form.value = {
      spz: props.existingVehicle.spz,
      vin: props.existingVehicle.vin || '',
      znacka: props.existingVehicle.znacka || '',
      model: props.existingVehicle.model || '',
      rok_vyroby: props.existingVehicle.rok_vyroby ?? null,
      datum_1_registrace: props.existingVehicle.datum_1_registrace || '',
      majitel: props.existingVehicle.majitel || '',
      motor: props.existingVehicle.motor || '',
      vykon_kw: props.existingVehicle.vykon_kw ?? null,
      tachometer_km: props.existingVehicle.tachometer_km ?? null,
    };
    // Mark touched if existing data
    spzTouched.value = true;
    vinTouched.value = true;
    majitelTouched.value = true;
  }

  // Auto-focus first editable input
  await nextTick();
  if (!isSpzLocked.value && spzInputRef.value) {
    spzInputRef.value.focus();
  }
});
</script>
