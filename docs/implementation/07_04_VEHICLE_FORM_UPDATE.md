# Task 7.4: Vehicle Form Update

> **Phase**: 7 - Vehicle Data Schema Extension
> **Status**: [ ] Pending
> **Priority**: Medium
> **Depends On**: 07_03
> **Estimated Effort**: 2 hours

---

## Objective

Update the frontend Vehicle Form component to:
- Add **tachometer input** field (manual entry)
- Display **OCR-populated fields** as read-only
- Update TypeScript interfaces
- Show visual distinction between manual and OCR fields

---

## Prerequisites

- [ ] Task 07_03 completed (API accepts new fields)

---

## Architecture Reference

See: [PHASE7_00_ARCHITECTURE.md](./PHASE7_00_ARCHITECTURE.md)

### Field Display Strategy

| Field Type | Editable | Visual Style |
|------------|----------|--------------|
| Manual entry (tachometer_km) | Yes | Standard input |
| Core fields (VIN, SPZ, etc.) | Yes | Standard input |
| OCR-populated (color, fuel, etc.) | No* | Gray background, lock icon |

*OCR fields become editable only if no OCR data exists

---

## Implementation Steps

### Step 1: Update Vehicle Type Interface

Update file: `apps/web/src/types/vehicle.ts`

```typescript
/**
 * Vehicle entity - Phase 7 Extended
 */
export interface Vehicle {
  id?: string;
  buying_opportunity_id: string;

  // Core identification
  spz: string;
  vin?: string;
  znacka?: string;
  model?: string;
  rok_vyroby?: number;
  datum_1_registrace?: string;
  majitel?: string;
  motor?: string;
  vykon_kw?: number;

  // Phase 7.1: Fraud detection
  tachometer_km?: number;
  datum_posledni_preregistrace?: string;

  // Phase 7.2: OCR-extractable
  barva?: string;
  palivo?: string;
  objem_motoru?: number;
  pocet_mist?: number;
  max_rychlost?: number;
  kategorie_vozidla?: string;

  // Phase 7.3: Extended VTP data
  karoserie?: string;
  cislo_motoru?: string;
  provozni_hmotnost?: number;
  povolena_hmotnost?: number;
  delka?: number;
  sirka?: number;
  vyska?: number;
  rozvor?: number;
  emise_co2?: string;
  spotreba_paliva?: string;
  emisni_norma?: string;
  datum_stk?: string;
  stk_platnost?: string;

  // Metadata
  data_source?: 'MANUAL' | 'OCR' | 'BC_IMPORT';
  validation_status?: string;
  created_at?: string;
}

// Form input type (subset of Vehicle for form fields)
export interface VehicleFormInput {
  spz: string;
  vin?: string;
  znacka?: string;
  model?: string;
  rok_vyroby?: number;
  datum_1_registrace?: string;
  majitel?: string;
  tachometer_km?: number;  // Phase 7.1 - manual input
}

// Fuel type options for display
export const FUEL_TYPE_OPTIONS = [
  { value: 'BA', label: 'Benzín' },
  { value: 'NM', label: 'Nafta (Diesel)' },
  { value: 'EL', label: 'Elektro' },
  { value: 'LPG', label: 'LPG' },
  { value: 'CNG', label: 'CNG' },
  { value: 'H', label: 'Vodík' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'BA/LPG', label: 'Benzín + LPG' },
  { value: 'EL/BA', label: 'Plug-in Hybrid (Benzín)' },
  { value: 'EL/NM', label: 'Plug-in Hybrid (Diesel)' },
];

// Vehicle category options
export const VEHICLE_CATEGORY_OPTIONS = [
  { value: 'M1', label: 'M1 - Osobní automobil' },
  { value: 'M2', label: 'M2 - Minibus (do 5t)' },
  { value: 'M3', label: 'M3 - Autobus (nad 5t)' },
  { value: 'N1', label: 'N1 - Lehké užitkové (do 3.5t)' },
  { value: 'N2', label: 'N2 - Nákladní (3.5-12t)' },
  { value: 'N3', label: 'N3 - Těžké nákladní (nad 12t)' },
  { value: 'L1', label: 'L1 - Moped' },
  { value: 'L3', label: 'L3 - Motocykl' },
];
```

### Step 2: Update VehicleForm Component

Update file: `apps/web/src/components/forms/VehicleForm.vue`

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Vehicle, VehicleFormInput } from '@/types/vehicle';
import { FUEL_TYPE_OPTIONS } from '@/types/vehicle';

interface Props {
  modelValue: Partial<Vehicle>;
  ocrData?: Partial<Vehicle>;  // OCR-extracted data to display
  loading?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: Partial<Vehicle>): void;
  (e: 'submit'): void;
}>();

// Form state
const form = ref<VehicleFormInput>({
  spz: props.modelValue.spz || '',
  vin: props.modelValue.vin || '',
  znacka: props.modelValue.znacka || '',
  model: props.modelValue.model || '',
  rok_vyroby: props.modelValue.rok_vyroby,
  datum_1_registrace: props.modelValue.datum_1_registrace || '',
  majitel: props.modelValue.majitel || '',
  tachometer_km: props.modelValue.tachometer_km,
});

// Has OCR data been extracted?
const hasOCRData = computed(() => !!props.ocrData && Object.keys(props.ocrData).length > 0);

// Get display value for OCR field (from OCR or current value)
const getOCRFieldValue = (field: keyof Vehicle) => {
  return props.ocrData?.[field] ?? props.modelValue[field];
};

// Get fuel type label
const fuelTypeLabel = computed(() => {
  const value = getOCRFieldValue('palivo');
  return FUEL_TYPE_OPTIONS.find(o => o.value === value)?.label || value || '-';
});

// Watch form changes and emit
watch(form, (newVal) => {
  emit('update:modelValue', { ...props.modelValue, ...newVal });
}, { deep: true });

// Tachometer validation
const tachometerError = computed(() => {
  if (form.value.tachometer_km === undefined || form.value.tachometer_km === null) {
    return null;
  }
  if (form.value.tachometer_km < 0) {
    return 'Stav tachometru nemůže být záporný';
  }
  if (form.value.tachometer_km > 2000000) {
    return 'Stav tachometru se zdá nereálný (> 2 000 000 km)';
  }
  return null;
});

const handleSubmit = () => {
  if (!tachometerError.value) {
    emit('submit');
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Section: Primary Identifiers -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-lg font-medium mb-4">Základní identifikace</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- SPZ -->
        <div>
          <label class="block text-sm font-medium text-gray-700">
            Registrační značka (SPZ) *
          </label>
          <input
            v-model="form.spz"
            type="text"
            required
            :disabled="disabled"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="1A2 3456"
          />
        </div>

        <!-- VIN -->
        <div>
          <label class="block text-sm font-medium text-gray-700">VIN</label>
          <input
            v-model="form.vin"
            type="text"
            maxlength="17"
            :disabled="disabled"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 uppercase"
            placeholder="WVWZZZ3CZWE123456"
          />
        </div>

        <!-- Owner -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">Majitel</label>
          <input
            v-model="form.majitel"
            type="text"
            :disabled="disabled"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Jméno majitele nebo název firmy"
          />
        </div>
      </div>
    </div>

    <!-- Section: Vehicle Details -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-lg font-medium mb-4">Údaje o vozidle</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Brand -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Značka</label>
          <input
            v-model="form.znacka"
            type="text"
            :disabled="disabled"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="VOLVO"
          />
        </div>

        <!-- Model -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Model</label>
          <input
            v-model="form.model"
            type="text"
            :disabled="disabled"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="V90 Cross Country"
          />
        </div>

        <!-- Year -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Rok výroby</label>
          <input
            v-model.number="form.rok_vyroby"
            type="number"
            min="1900"
            :max="new Date().getFullYear() + 1"
            :disabled="disabled"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="2019"
          />
        </div>

        <!-- First Registration -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Datum první registrace</label>
          <input
            v-model="form.datum_1_registrace"
            type="date"
            :disabled="disabled"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <!-- PHASE 7.1: Tachometer -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700">
            Stav tachometru (km)
            <span class="text-xs text-gray-500 ml-1">- důležité pro detekci manipulace</span>
          </label>
          <input
            v-model.number="form.tachometer_km"
            type="number"
            min="0"
            :disabled="disabled"
            class="mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500"
            :class="tachometerError ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'"
            placeholder="150000"
          />
          <p v-if="tachometerError" class="mt-1 text-sm text-red-600">
            {{ tachometerError }}
          </p>
        </div>
      </div>
    </div>

    <!-- Section: OCR Data (Read-only) - Phase 7.2 & 7.3 -->
    <div v-if="hasOCRData" class="bg-gray-50 p-4 rounded-lg shadow border border-gray-200">
      <div class="flex items-center gap-2 mb-4">
        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-700">Údaje z OCR (technický průkaz)</h3>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <!-- Color -->
        <div>
          <span class="text-gray-500">Barva</span>
          <p class="font-medium">{{ getOCRFieldValue('barva') || '-' }}</p>
        </div>

        <!-- Fuel Type -->
        <div>
          <span class="text-gray-500">Palivo</span>
          <p class="font-medium">{{ fuelTypeLabel }}</p>
        </div>

        <!-- Engine Capacity -->
        <div>
          <span class="text-gray-500">Objem motoru</span>
          <p class="font-medium">
            {{ getOCRFieldValue('objem_motoru') ? `${getOCRFieldValue('objem_motoru')} cm³` : '-' }}
          </p>
        </div>

        <!-- Seats -->
        <div>
          <span class="text-gray-500">Počet míst</span>
          <p class="font-medium">{{ getOCRFieldValue('pocet_mist') || '-' }}</p>
        </div>

        <!-- Power -->
        <div>
          <span class="text-gray-500">Výkon</span>
          <p class="font-medium">
            {{ getOCRFieldValue('vykon_kw') ? `${getOCRFieldValue('vykon_kw')} kW` : '-' }}
          </p>
        </div>

        <!-- Max Speed -->
        <div>
          <span class="text-gray-500">Max. rychlost</span>
          <p class="font-medium">
            {{ getOCRFieldValue('max_rychlost') ? `${getOCRFieldValue('max_rychlost')} km/h` : '-' }}
          </p>
        </div>

        <!-- Vehicle Category -->
        <div>
          <span class="text-gray-500">Kategorie</span>
          <p class="font-medium">{{ getOCRFieldValue('kategorie_vozidla') || '-' }}</p>
        </div>

        <!-- Body Type -->
        <div>
          <span class="text-gray-500">Karoserie</span>
          <p class="font-medium">{{ getOCRFieldValue('karoserie') || '-' }}</p>
        </div>
      </div>

      <!-- Extended VTP data (collapsible) -->
      <details class="mt-4">
        <summary class="cursor-pointer text-blue-600 hover:text-blue-800 text-sm">
          Zobrazit rozšířené technické údaje
        </summary>
        <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2 border-t">
          <div>
            <span class="text-gray-500">Hmotnost (provozní)</span>
            <p class="font-medium">
              {{ getOCRFieldValue('provozni_hmotnost') ? `${getOCRFieldValue('provozni_hmotnost')} kg` : '-' }}
            </p>
          </div>
          <div>
            <span class="text-gray-500">Délka</span>
            <p class="font-medium">
              {{ getOCRFieldValue('delka') ? `${getOCRFieldValue('delka')} mm` : '-' }}
            </p>
          </div>
          <div>
            <span class="text-gray-500">Šířka</span>
            <p class="font-medium">
              {{ getOCRFieldValue('sirka') ? `${getOCRFieldValue('sirka')} mm` : '-' }}
            </p>
          </div>
          <div>
            <span class="text-gray-500">Výška</span>
            <p class="font-medium">
              {{ getOCRFieldValue('vyska') ? `${getOCRFieldValue('vyska')} mm` : '-' }}
            </p>
          </div>
          <div>
            <span class="text-gray-500">Emise CO₂</span>
            <p class="font-medium">{{ getOCRFieldValue('emise_co2') || '-' }}</p>
          </div>
          <div>
            <span class="text-gray-500">STK platnost</span>
            <p class="font-medium">{{ getOCRFieldValue('stk_platnost') || '-' }}</p>
          </div>
        </div>
      </details>
    </div>

    <!-- Submit Button -->
    <div class="flex justify-end">
      <button
        type="submit"
        :disabled="loading || disabled || !!tachometerError"
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        <span v-if="loading">Ukládám...</span>
        <span v-else>Uložit vozidlo</span>
      </button>
    </div>
  </form>
</template>
```

### Step 3: Update Page Integration

In `OpportunityDetail.vue`, pass OCR data to the form:

```vue
<VehicleForm
  v-model="vehicleData"
  :ocr-data="ocrVehicleData"
  :loading="savingVehicle"
  @submit="saveVehicle"
/>
```

---

## Test Cases

### Visual Testing

1. Open vehicle form without OCR data
   - Tachometer field visible and editable
   - OCR section hidden

2. Open vehicle form with OCR data
   - OCR section visible with extracted values
   - Extended data collapsible

3. Enter invalid tachometer value
   - Error message displayed
   - Submit button disabled

---

## Validation Criteria

- [ ] Tachometer input field added
- [ ] Tachometer validation (positive, < 2M km)
- [ ] OCR data section displays when data available
- [ ] Extended VTP data collapsible
- [ ] Fuel type shows human-readable label
- [ ] TypeScript interfaces updated
- [ ] Form emits updated data correctly

---

## Completion Checklist

- [ ] Vehicle type interface extended
- [ ] VehicleForm component updated
- [ ] Page integration updated
- [ ] Visual tests passing
- [ ] Update tracker: `PHASE7_IMPLEMENTATION_TRACKER.md`
