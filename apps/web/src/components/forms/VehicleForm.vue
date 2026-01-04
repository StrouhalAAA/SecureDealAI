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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
          :disabled="!isValid"
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
import type { Vehicle } from '@/types';

const props = defineProps<{
  buyingOpportunityId: string;
  initialSpz?: string;
  existingVehicle?: Vehicle | null;
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
});

// Touched state for field validation feedback
const spzTouched = ref(false);
const vinTouched = ref(false);
const majitelTouched = ref(false);

const loading = ref(false);
const error = ref<string | null>(null);
const vehicleId = ref<string | null>(null);

const isSpzLocked = computed(() => !!props.initialSpz);

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

  if (!isValid.value) return;

  loading.value = true;
  error.value = null;

  try {
    const vehicleData = {
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
      data_source: 'MANUAL',
    };

    let result;

    if (vehicleId.value) {
      // Update existing
      result = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', vehicleId.value)
        .select()
        .single();
    } else {
      // Create new
      result = await supabase
        .from('vehicles')
        .insert(vehicleData)
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
    vehicleId.value = props.existingVehicle.id;
    form.value = {
      spz: props.existingVehicle.spz,
      vin: props.existingVehicle.vin || '',
      znacka: props.existingVehicle.znacka || '',
      model: props.existingVehicle.model || '',
      rok_vyroby: props.existingVehicle.rok_vyroby,
      datum_1_registrace: props.existingVehicle.datum_1_registrace || '',
      majitel: props.existingVehicle.majitel || '',
      motor: props.existingVehicle.motor || '',
      vykon_kw: props.existingVehicle.vykon_kw,
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
