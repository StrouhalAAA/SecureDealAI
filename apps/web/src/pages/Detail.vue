<template>
  <div>
    <!-- Sub-header with navigation and SPZ -->
    <div class="flex justify-between items-center mb-6">
      <button
        data-testid="back-to-dashboard"
        @click="goToDashboard"
        class="text-gray-500 hover:text-gray-700 flex items-center gap-1"
        aria-label="Zpět na přehled příležitostí"
      >
        ← Zpět na přehled
      </button>
      <div v-if="data.opportunity.value" class="text-lg font-mono font-bold">
        SPZ: {{ data.opportunity.value.spz }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="data.loading.value" class="py-12 text-center">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="mt-4 text-gray-600">Načítání...</p>
    </div>

    <!-- Error -->
    <div v-else-if="data.error.value" class="py-12">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-700">{{ data.error.value }}</p>
        <button
          @click="data.loadData()"
          class="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Zkusit znovu
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Progress Steps -->
      <div class="mb-8">
        <StepProgress
          :steps="nav.steps"
          :step-states="nav.stepStates.value"
          :allow-jump="true"
          @step-click="nav.goToStep"
        />
      </div>

      <!-- Step Content -->
      <transition name="fade" mode="out-in">
        <!-- Step 1: Vehicle -->
        <VehicleForm
          v-if="nav.currentStep.value === 0"
          :buying-opportunity-id="opportunityId"
          :initial-spz="data.opportunity.value?.spz"
          :existing-vehicle="data.vehicle.value"
          :ocr-data="data.vehicleOCRData.value"
          @saved="onVehicleSaved"
          @next="nav.nextStep"
        />

        <!-- Step 2: Vendor -->
        <VendorForm
          v-else-if="nav.currentStep.value === 1"
          :buying-opportunity-id="opportunityId"
          :existing-vendor="data.vendor.value"
          @saved="onVendorSaved"
          @back="nav.prevStep"
          @next="nav.nextStep"
        />

        <!-- Step 3: Documents -->
        <DocumentUpload
          v-else-if="nav.currentStep.value === 2 && data.opportunity.value?.spz"
          :spz="data.opportunity.value.spz"
          :buying-opportunity-id="opportunityId"
          @back="nav.prevStep"
          @validated="onValidated"
        />

        <!-- Step 4: Results -->
        <ValidationResult
          v-else-if="nav.currentStep.value === 3 && data.validationResult.value"
          :result="data.validationResult.value"
          @retry="handleRetry"
          @close="goToDashboard"
        />
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStepNavigation } from '@/composables/useStepNavigation'
import { useDetailData } from '@/composables/useDetailData'
import StepProgress from '@/components/shared/StepProgress.vue'
import VehicleForm from '@/components/forms/VehicleForm.vue'
import VendorForm from '@/components/forms/VendorForm.vue'
import DocumentUpload from '@/components/ocr/DocumentUpload.vue'
import ValidationResult from '@/components/validation/ValidationResult.vue'
import type { Vehicle, Vendor, ValidationResult as VR } from '@/types'

const route = useRoute()
const router = useRouter()

const opportunityId = computed(() => route.params.id as string)

// Query params for entry method from CreateOpportunityWizard
const entryMethod = computed(() => route.query.from as string | undefined)
const ocrStatus = computed(() => route.query.ocr as string | undefined)

// Step definitions
const steps = [
  { label: 'Vozidlo' },
  { label: 'Dodavatel' },
  { label: 'Dokumenty' },
  { label: 'Validace' },
]

// Composables
const data = useDetailData(opportunityId.value)
const nav = useStepNavigation(steps)

// Determine starting step based on query params and existing data
const startingStep = computed(() => {
  // If coming from upload with OCR completed, start at step 2 (Vendor)
  if (entryMethod.value === 'upload' && ocrStatus.value === 'completed') {
    return 1; // Step 2: Vendor (0-indexed)
  }
  // If coming from manual entry, start at step 1 (Vehicle) to add remaining fields
  if (entryMethod.value === 'manual') {
    return 0; // Step 1: Vehicle (0-indexed)
  }
  // Otherwise use the suggested step from existing data
  return data.suggestedStartStep.value;
})

// Sync step with data on load
watch(() => startingStep.value, (step) => {
  nav.goToStep(step)
}, { immediate: true })

// Clear query params after initial load to avoid confusion on refresh
onMounted(() => {
  if (entryMethod.value || ocrStatus.value) {
    // Replace the route without query params
    router.replace({ path: route.path });
  }
})

// Event handlers
function onVehicleSaved(v: Vehicle) {
  data.setVehicle(v)
}

function onVendorSaved(v: Vendor) {
  data.setVendor(v)
}

async function onValidated(result: VR) {
  data.setValidationResult(result)
  nav.goToStep(3)
  await data.updateOpportunityStatus(result.overall_status)
}

function handleRetry() {
  data.clearValidation()
  nav.goToStep(2)
}

function goToDashboard() {
  router.push('/')
}

onMounted(() => {
  data.loadData()
})
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
