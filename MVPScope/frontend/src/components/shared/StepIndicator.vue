<template>
  <div
    class="flex items-center"
    :class="{ 'flex-1': !isLast, 'cursor-pointer': clickable }"
    @click="handleClick"
  >
    <!-- Circle -->
    <div
      :class="circleClass"
      class="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors"
    >
      <span v-if="completed">✓</span>
      <span v-else>{{ step }}</span>
    </div>

    <!-- Label -->
    <div class="ml-2 text-sm transition-colors" :class="labelClass">
      {{ label }}
    </div>

    <!-- Connector Line -->
    <div
      v-if="!isLast"
      class="flex-1 h-1 mx-4 transition-colors"
      :class="lineClass"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  step: number
  label: string
  active?: boolean
  completed?: boolean
  isLast?: boolean
  clickable?: boolean
}>(), {
  active: false,
  completed: false,
  isLast: false,
  clickable: false,
})

const emit = defineEmits<{
  click: []
}>()

const circleClass = computed(() => {
  if (props.completed) return 'bg-green-500 text-white'
  if (props.active) return 'bg-blue-500 text-white'
  return 'bg-gray-200 text-gray-500'
})

const labelClass = computed(() => {
  if (props.completed || props.active) return 'text-gray-900 font-medium'
  return 'text-gray-400'
})

const lineClass = computed(() => {
  if (props.completed) return 'bg-green-500'
  return 'bg-gray-200'
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>
