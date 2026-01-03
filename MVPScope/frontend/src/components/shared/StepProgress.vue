<template>
  <div class="flex items-center justify-between">
    <StepIndicator
      v-for="(step, index) in steps"
      :key="index"
      :step="index + 1"
      :label="step.label"
      :active="stepStates[index].active"
      :completed="stepStates[index].completed"
      :is-last="index === steps.length - 1"
      :clickable="allowJump && stepStates[index].completed"
      @click="$emit('stepClick', index)"
    />
  </div>
</template>

<script setup lang="ts">
import StepIndicator from './StepIndicator.vue'
import type { StepConfig, StepState } from '@/composables/useStepNavigation'

defineProps<{
  steps: StepConfig[]
  stepStates: StepState[]
  allowJump?: boolean
}>()

defineEmits<{
  stepClick: [index: number]
}>()
</script>
