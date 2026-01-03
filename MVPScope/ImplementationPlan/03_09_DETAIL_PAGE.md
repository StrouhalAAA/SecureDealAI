# Task 3.9: Detail Page (Multi-step Workflow)

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: 3.3-3.8 All Components
> **Estimated Effort**: Medium

---

## Objective

Create the main detail page that orchestrates the 4-step validation workflow using all previously created components.

---

## UI Specification

```
┌─────────────────────────────────────────────────────────────┐
│  SecureDealAI          SPZ: 5L94454          [← Dashboard]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Progress: [●]──────[●]──────[○]──────[○]                   │
│            Step 1   Step 2   Step 3   Step 4                │
│            Vozidlo  Dodavatel Dokumenty Validace            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │           [Current Step Component]                       ││
│  │                                                          ││
│  │           VehicleForm / VendorForm /                     ││
│  │           DocumentUpload / ValidationResult              ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

**src/pages/Detail.vue**:
```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button
            @click="goToDashboard"
            class="text-gray-500 hover:text-gray-700"
          >
            ← Dashboard
          </button>
          <h1 class="text-xl font-bold">SecureDealAI</h1>
        </div>
        <div class="text-lg font-mono font-bold">
          SPZ: {{ opportunity?.spz }}
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="max-w-4xl mx-auto px-4 py-12 text-center">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="mt-4 text-gray-600">Načítání...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="max-w-4xl mx-auto px-4 py-12">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-700">{{ error }}</p>
        <button
          @click="loadData"
          class="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Zkusit znovu
        </button>
      </div>
    </div>

    <!-- Content -->
    <main v-else class="max-w-4xl mx-auto px-4 py-8">
      <!-- Progress Steps -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <StepIndicator
            v-for="(step, index) in steps"
            :key="index"
            :step="index + 1"
            :label="step.label"
            :active="currentStep === index"
            :completed="currentStep > index"
            :is-last="index === steps.length - 1"
          />
        </div>
      </div>

      <!-- Step Content -->
      <transition name="fade" mode="out-in">
        <!-- Step 1: Vehicle -->
        <VehicleForm
          v-if="currentStep === 0"
          :buying-opportunity-id="opportunityId"
          :initial-spz="opportunity?.spz"
          :existing-vehicle="vehicle"
          @saved="onVehicleSaved"
          @next="nextStep"
        />

        <!-- Step 2: Vendor -->
        <VendorForm
          v-else-if="currentStep === 1"
          :buying-opportunity-id="opportunityId"
          :existing-vendor="vendor"
          @saved="onVendorSaved"
          @back="prevStep"
          @next="nextStep"
        />

        <!-- Step 3: Documents -->
        <DocumentUpload
          v-else-if="currentStep === 2"
          :spz="opportunity?.spz"
          :buying-opportunity-id="opportunityId"
          @back="prevStep"
          @validated="onValidated"
        />

        <!-- Step 4: Results -->
        <ValidationResult
          v-else-if="currentStep === 3 && validationResult"
          :result="validationResult"
          @retry="runValidation"
          @close="goToDashboard"
        />
      </transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/composables/useSupabase';
import StepIndicator from '@/components/shared/StepIndicator.vue';
import VehicleForm from '@/components/forms/VehicleForm.vue';
import VendorForm from '@/components/forms/VendorForm.vue';
import DocumentUpload from '@/components/ocr/DocumentUpload.vue';
import ValidationResult from '@/components/validation/ValidationResult.vue';
import type { BuyingOpportunity, Vehicle, Vendor, ValidationResult as VR } from '@/types';

const route = useRoute();
const router = useRouter();

const opportunityId = computed(() => route.params.id as string);

const steps = [
  { label: 'Vozidlo' },
  { label: 'Dodavatel' },
  { label: 'Dokumenty' },
  { label: 'Validace' },
];

const currentStep = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);

const opportunity = ref<BuyingOpportunity | null>(null);
const vehicle = ref<Vehicle | null>(null);
const vendor = ref<Vendor | null>(null);
const validationResult = ref<VR | null>(null);

async function loadData() {
  loading.value = true;
  error.value = null;

  try {
    // Load buying opportunity
    const { data: oppData, error: oppError } = await supabase
      .from('buying_opportunities')
      .select('*')
      .eq('id', opportunityId.value)
      .single();

    if (oppError) throw oppError;
    opportunity.value = oppData;

    // Load vehicle
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('*')
      .eq('buying_opportunity_id', opportunityId.value)
      .single();
    vehicle.value = vehicleData;

    // Load vendor
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('*')
      .eq('buying_opportunity_id', opportunityId.value)
      .single();
    vendor.value = vendorData;

    // Load latest validation result
    const { data: validationData } = await supabase
      .from('validation_results')
      .select('*')
      .eq('buying_opportunity_id', opportunityId.value)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .single();
    validationResult.value = validationData;

    // Determine starting step based on data
    determineStartingStep();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chyba při načítání';
  } finally {
    loading.value = false;
  }
}

function determineStartingStep() {
  if (validationResult.value) {
    currentStep.value = 3;
  } else if (vendor.value) {
    currentStep.value = 2;
  } else if (vehicle.value) {
    currentStep.value = 1;
  } else {
    currentStep.value = 0;
  }
}

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function onVehicleSaved(v: Vehicle) {
  vehicle.value = v;
}

function onVendorSaved(v: Vendor) {
  vendor.value = v;
}

function onValidated(result: VR) {
  validationResult.value = result;
  currentStep.value = 3;

  // Update opportunity status
  updateOpportunityStatus(result.overall_status);
}

async function updateOpportunityStatus(validationStatus: string) {
  const statusMap = {
    GREEN: 'VALIDATED',
    ORANGE: 'PENDING',
    RED: 'REJECTED',
  };

  await supabase
    .from('buying_opportunities')
    .update({ status: statusMap[validationStatus] || 'PENDING' })
    .eq('id', opportunityId.value);
}

async function runValidation() {
  currentStep.value = 2;
  validationResult.value = null;
}

function goToDashboard() {
  router.push('/');
}

onMounted(loadData);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

---

## StepIndicator Component

**src/components/shared/StepIndicator.vue**:
```vue
<template>
  <div class="flex items-center" :class="{ 'flex-1': !isLast }">
    <!-- Circle -->
    <div
      :class="circleClass"
      class="w-10 h-10 rounded-full flex items-center justify-center font-bold"
    >
      <span v-if="completed">✓</span>
      <span v-else>{{ step }}</span>
    </div>

    <!-- Label -->
    <div class="ml-2 text-sm" :class="labelClass">
      {{ label }}
    </div>

    <!-- Line -->
    <div
      v-if="!isLast"
      class="flex-1 h-1 mx-4"
      :class="lineClass"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
  isLast: boolean;
}>();

const circleClass = computed(() => {
  if (props.completed) return 'bg-green-500 text-white';
  if (props.active) return 'bg-blue-500 text-white';
  return 'bg-gray-200 text-gray-500';
});

const labelClass = computed(() => {
  if (props.completed || props.active) return 'text-gray-900 font-medium';
  return 'text-gray-400';
});

const lineClass = computed(() => {
  if (props.completed) return 'bg-green-500';
  return 'bg-gray-200';
});
</script>
```

---

## Workflow Logic

1. **Load existing data** on page mount
2. **Determine starting step** based on what data exists:
   - No vehicle → Step 1
   - Vehicle exists, no vendor → Step 2
   - Vendor exists, no validation → Step 3
   - Validation exists → Step 4
3. **Save data** at each step before proceeding
4. **Update opportunity status** after validation

---

## Validation Criteria

- [x] Page loads opportunity data
- [x] Progress indicator shows current step
- [x] Navigation between steps works
- [x] Step components receive correct props
- [x] Data persists between steps
- [x] Validation result displays correctly
- [x] Back to dashboard works
- [x] URL reflects opportunity ID

---

## Completion Checklist

- [x] Detail.vue created
- [x] StepIndicator.vue created
- [x] Step navigation working
- [x] Data loading working
- [x] All step components integrated
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
