<template>
  <div class="animate-pulse" role="status" aria-label="Nacitam data...">
    <!-- Header row -->
    <div class="h-10 bg-gray-200 rounded mb-2"></div>

    <!-- Data rows -->
    <div
      v-for="i in rows"
      :key="i"
      class="flex gap-4 mb-1"
    >
      <div
        v-for="j in columns"
        :key="j"
        class="h-12 bg-gray-100 rounded flex-1"
        :style="{ animationDelay: `${(i * columns + j) * 50}ms` }"
      ></div>
    </div>

    <span class="sr-only">Nacitam data...</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number;
    columns?: number;
  }>(),
  {
    rows: 5,
    columns: 4,
  }
);
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse > div {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
