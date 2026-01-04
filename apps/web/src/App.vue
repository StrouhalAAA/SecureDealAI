<script setup lang="ts">
import { RouterView } from 'vue-router';
import ToastContainer from '@/components/shared/ToastContainer.vue';
import { useAuth } from '@/composables/useAuth';

const { logout, isAuthenticated } = useAuth();
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">
          SecureDealAI
        </h1>
        <button
          v-if="isAuthenticated"
          @click="logout()"
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Odhlasit se
        </button>
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
