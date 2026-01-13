<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router';
import ToastContainer from '@/components/shared/ToastContainer.vue';
import { useAuth } from '@/composables/useAuth';

const { logout, isAuthenticated } = useAuth();
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <RouterLink
          to="/"
          class="flex items-center gap-3 text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
          aria-label="Přejít na hlavní stránku"
        >
          <img
            v-if="isAuthenticated"
            src="/aaa-auto-logo.svg"
            alt="AAA Auto logo"
            class="h-8"
          />
          SecureDealAI
        </RouterLink>
        <div v-if="isAuthenticated" class="flex items-center gap-4">
          <RouterLink
            to="/rules"
            class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Rules
          </RouterLink>
          <RouterLink
            to="/api-docs"
            class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            API Docs
          </RouterLink>
          <button
            @click="logout()"
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Odhlasit se
          </button>
        </div>
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
