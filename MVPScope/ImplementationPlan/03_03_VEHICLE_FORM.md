# Task 3.3: Vehicle Form Component

> **Phase**: 3 - Frontend
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 3.1 Vue.js Project Setup, 2.2 Vehicle CRUD
> **Estimated Effort**: Medium

---

## Objective

Create a form component for entering vehicle data (Step 1 of the validation workflow).

---

## Prerequisites

- [ ] Task 3.1 completed (Vue.js project setup)
- [ ] Task 2.2 completed (Vehicle CRUD API)

---

## UI Specification

```
┌─────────────────────────────────────────────────────────────┐
│  Krok 1: Data vozidla                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SPZ *                    VIN *                              │
│  [5L94454_________]       [YV1PZA3TCL1103985__]             │
│                                                              │
│  Značka                   Model                              │
│  [VOLVO___________]       [V90 CROSS COUNTRY__]             │
│                                                              │
│  Rok výroby               1. registrace                      │
│  [2019____________]       [15.08.2019_________]             │
│                                                              │
│  Majitel/Provozovatel *                                      │
│  [OSIT S.R.O._____________________________________]         │
│                                                              │
│  Motor                    Výkon (kW)                         │
│  [benzín__________]       [228________________]             │
│                                                              │
│                                        [Další krok →]        │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

**src/components/forms/VehicleForm.vue**:
```vue
<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-6">Krok 1: Data vozidla</h2>

    <form @submit.prevent="saveAndContinue">
      <!-- Row 1: SPZ + VIN -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            SPZ <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.spz"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase font-mono"
            placeholder="např. 5L94454"
            required
            :disabled="isSpzLocked"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            VIN <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.vin"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase font-mono"
            placeholder="17 znaků"
            required
            maxlength="17"
            pattern="[A-HJ-NPR-Z0-9]{17}"
          />
          <p v-if="vinError" class="text-red-500 text-xs mt-1">{{ vinError }}</p>
        </div>
      </div>

      <!-- Row 2: Brand + Model -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Značka
          </label>
          <input
            v-model="form.znacka"
            type="text"
            class="w-full px-4 py-2 border rounded-lg"
            placeholder="např. VOLVO"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <input
            v-model="form.model"
            type="text"
            class="w-full px-4 py-2 border rounded-lg"
            placeholder="např. V90 CROSS COUNTRY"
          />
        </div>
      </div>

      <!-- Row 3: Year + First Registration -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Rok výroby
          </label>
          <input
            v-model.number="form.rok_vyroby"
            type="number"
            class="w-full px-4 py-2 border rounded-lg"
            placeholder="např. 2019"
            min="1900"
            :max="currentYear + 1"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Datum 1. registrace
          </label>
          <input
            v-model="form.datum_1_registrace"
            type="date"
            class="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <!-- Row 4: Owner -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Majitel / Provozovatel <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.majitel"
          type="text"
          class="w-full px-4 py-2 border rounded-lg uppercase"
          placeholder="Jméno majitele nebo název firmy"
          required
        />
      </div>

      <!-- Row 5: Engine + Power -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Motor
          </label>
          <select v-model="form.motor" class="w-full px-4 py-2 border rounded-lg">
            <option value="">-- Vyberte --</option>
            <option value="benzín">Benzín</option>
            <option value="nafta">Nafta</option>
            <option value="elektro">Elektro</option>
            <option value="hybrid">Hybrid</option>
            <option value="LPG">LPG</option>
            <option value="CNG">CNG</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Výkon (kW)
          </label>
          <input
            v-model.number="form.vykon_kw"
            type="number"
            class="w-full px-4 py-2 border rounded-lg"
            placeholder="např. 228"
            min="0"
          />
        </div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
        {{ error }}
      </div>

      <!-- Submit -->
      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="loading || !isValid"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {{ loading ? 'Ukládám...' : 'Další krok →' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { supabase } from '@/composables/useSupabase';
import type { Vehicle } from '@/types';

const props = defineProps<{
  buyingOpportunityId: string;
  initialSpz?: string;
  existingVehicle?: Vehicle | null;
}>();

const emit = defineEmits(['saved', 'next']);

const currentYear = new Date().getFullYear();

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

const loading = ref(false);
const error = ref<string | null>(null);
const vehicleId = ref<string | null>(null);

const isSpzLocked = computed(() => !!props.initialSpz);

const vinError = computed(() => {
  if (!form.value.vin) return null;
  if (form.value.vin.length !== 17) return 'VIN musí mít přesně 17 znaků';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(form.value.vin)) {
    return 'VIN obsahuje neplatné znaky';
  }
  return null;
});

const isValid = computed(() => {
  return (
    form.value.spz &&
    form.value.vin &&
    form.value.vin.length === 17 &&
    !vinError.value &&
    form.value.majitel
  );
});

async function saveAndContinue() {
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
    error.value = e instanceof Error ? e.message : 'Chyba při ukládání';
  } finally {
    loading.value = false;
  }
}

// Load existing vehicle data
onMounted(() => {
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
  }
});
</script>
```

---

## Field Specifications

| Field | Required | Validation | Notes |
|-------|----------|------------|-------|
| SPZ | Yes | Pattern match | Locked after creation |
| VIN | Yes | Exactly 17 chars, no I/O/Q | Uppercase, no spaces |
| Značka | No | - | Brand/make |
| Model | No | - | - |
| Rok výroby | No | 1900 - current+1 | - |
| Datum 1. registrace | No | Valid date | - |
| Majitel | Yes | - | Uppercase |
| Motor | No | Dropdown | - |
| Výkon kW | No | Positive number | - |

---

## Validation Criteria

- [ ] Form displays all fields correctly
- [ ] Required fields enforced
- [ ] VIN validation (17 chars, valid chars)
- [ ] SPZ locked when passed as prop
- [ ] Saves to database on submit
- [ ] Loads existing data correctly
- [ ] Emits 'next' event on success

---

## Completion Checklist

- [ ] VehicleForm.vue created
- [ ] All field validations working
- [ ] Supabase integration working
- [ ] Edit mode working
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
