<template>
  <form @submit.prevent="handleSubmit" novalidate class="space-y-4">
    <!-- Row 1: SPZ -->
    <div>
      <label for="quick-spz" class="block text-sm font-medium text-gray-700 mb-1">
        SPZ (registrační značka) <span class="text-red-500">*</span>
      </label>
      <input
        id="quick-spz"
        ref="spzInput"
        v-model="form.spz"
        type="text"
        placeholder="např. 5L94454"
        class="w-full px-4 py-2 border rounded-lg uppercase font-mono"
        :class="{
          'border-gray-300': !spzTouched || !spzError,
          'border-red-500 bg-red-50': spzTouched && spzError,
          'border-green-500 bg-green-50': spzTouched && !spzError && form.spz,
        }"
        @blur="spzTouched = true"
      />
      <p v-if="spzTouched && spzError" class="text-red-500 text-xs mt-1">{{ spzError }}</p>
    </div>

    <!-- Row 2: VIN -->
    <div>
      <label for="quick-vin" class="block text-sm font-medium text-gray-700 mb-1">
        VIN
      </label>
      <input
        id="quick-vin"
        v-model="form.vin"
        type="text"
        placeholder="17 znaků"
        maxlength="17"
        class="w-full px-4 py-2 border rounded-lg uppercase font-mono"
        :class="{
          'border-gray-300': !vinTouched || !vinError,
          'border-red-500 bg-red-50': vinTouched && vinError,
          'border-green-500 bg-green-50': vinTouched && !vinError && form.vin,
        }"
        @blur="vinTouched = true"
      />
      <p v-if="vinTouched && vinError" class="text-red-500 text-xs mt-1">{{ vinError }}</p>
      <p v-else class="text-gray-400 text-xs mt-1">Volitelné - může být doplněno později</p>
    </div>

    <!-- Row 3: Make + Model -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="quick-znacka" class="block text-sm font-medium text-gray-700 mb-1">
          Značka
        </label>
        <input
          id="quick-znacka"
          v-model="form.znacka"
          type="text"
          placeholder="např. VOLVO"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label for="quick-model" class="block text-sm font-medium text-gray-700 mb-1">
          Model
        </label>
        <input
          id="quick-model"
          v-model="form.model"
          type="text"
          placeholder="např. V90"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>

    <!-- Row 4: Owner -->
    <div>
      <label for="quick-majitel" class="block text-sm font-medium text-gray-700 mb-1">
        Majitel / Provozovatel <span class="text-red-500">*</span>
      </label>
      <input
        id="quick-majitel"
        v-model="form.majitel"
        type="text"
        placeholder="Jméno majitele nebo název firmy"
        class="w-full px-4 py-2 border rounded-lg uppercase"
        :class="{
          'border-gray-300': !majitelTouched || form.majitel,
          'border-red-500 bg-red-50': majitelTouched && !form.majitel,
          'border-green-500 bg-green-50': majitelTouched && form.majitel,
        }"
        @blur="majitelTouched = true"
      />
      <p v-if="majitelTouched && !form.majitel" class="text-red-500 text-xs mt-1">
        Majitel je povinné pole
      </p>
    </div>

    <!-- Error -->
    <div v-if="error" class="p-3 bg-red-50 text-red-700 rounded-lg">
      {{ error }}
    </div>

    <!-- Buttons -->
    <div class="flex justify-end gap-2 pt-4">
      <button
        type="button"
        @click="$emit('cancel')"
        class="px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        Zrušit
      </button>
      <button
        type="submit"
        :disabled="!isValid || loading"
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Vytvářím...' : 'Vytvořit příležitost' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';

export interface QuickVehicleFormData {
  spz: string;
  vin: string;
  znacka: string;
  model: string;
  majitel: string;
}

const props = defineProps<{
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  submit: [data: QuickVehicleFormData];
  cancel: [];
}>();

const spzInput = ref<HTMLInputElement | null>(null);

const form = ref<QuickVehicleFormData>({
  spz: '',
  vin: '',
  znacka: '',
  model: '',
  majitel: '',
});

// Touched state for validation feedback
const spzTouched = ref(false);
const vinTouched = ref(false);
const majitelTouched = ref(false);

// Validation
const spzError = computed(() => {
  if (!form.value.spz) return 'SPZ je povinné pole';
  if (form.value.spz.length < 5 || form.value.spz.length > 8) {
    return 'SPZ musí mít 5-8 znaků';
  }
  return null;
});

const vinError = computed(() => {
  if (!form.value.vin) return null; // VIN is optional
  if (form.value.vin.length !== 17) return 'VIN musí mít přesně 17 znaků';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(form.value.vin)) {
    return 'VIN obsahuje neplatné znaky (I, O, Q nejsou povoleny)';
  }
  return null;
});

const isValid = computed(() => {
  return (
    form.value.spz &&
    !spzError.value &&
    !vinError.value &&
    form.value.majitel
  );
});

function handleSubmit() {
  // Mark all required fields as touched
  spzTouched.value = true;
  vinTouched.value = true;
  majitelTouched.value = true;

  if (!isValid.value) return;

  emit('submit', { ...form.value });
}

onMounted(async () => {
  await nextTick();
  spzInput.value?.focus();
});
</script>
