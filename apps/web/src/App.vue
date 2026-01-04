<script setup lang="ts">
import { RouterView } from 'vue-router';
import ToastContainer from '@/components/shared/ToastContainer.vue';
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <h1 class="text-2xl font-bold text-gray-900">
          SecureDealAI
        </h1>
      </div>
    </header>
    <main>
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <RouterView />
      </div>
    </main>
    <ToastContainer />
  </div>
</template>
