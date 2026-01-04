<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button
            data-testid="back-to-dashboard"
            @click="goToDashboard"
            class="text-gray-500 hover:text-gray-700"
          >
            ← Dashboard
          </button>
          <h1 class="text-xl font-bold">SecureDealAI</h1>
        </div>
        <div v-if="data.opportunity.value" class="text-lg font-mono font-bold">
          SPZ: {{ data.opportunity.value.spz }}
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="data.loading.value" class="max-w-4xl mx-auto px-4 py-12 text-center">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="mt-4 text-gray-600">Nacitani...</p>
    </div>

    <!-- Error -->
    <div v-else-if="data.error.value" class="max-w-4xl mx-auto px-4 py-12">
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
    <main v-else class="max-w-4xl mx-auto px-4 py-8">
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
    </main>
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

// Sync step with data on load
watch(() => data.suggestedStartStep.value, (step) => {
  nav.goToStep(step)
}, { immediate: true })

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
