<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const route = useRoute()
const { login, isAuthenticated } = useAuth()

const accessCode = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const retryAfter = ref<number | null>(null)

const codeInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  // If already authenticated, redirect to intended destination
  if (isAuthenticated.value) {
    const redirect = route.query.redirect as string || '/'
    router.replace(redirect)
    return
  }

  // Auto-focus the input
  codeInput.value?.focus()
})

async function handleSubmit() {
  if (!accessCode.value.trim()) {
    errorMessage.value = 'Please enter an access code'
    return
  }

  if (isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''
  retryAfter.value = null

  try {
    const result = await login(accessCode.value.trim())

    if (result.success) {
      // Redirect to intended destination or dashboard
      const redirect = route.query.redirect as string || '/'
      router.replace(redirect)
    } else {
      errorMessage.value = result.message
      if (result.retry_after) {
        retryAfter.value = result.retry_after
        startCountdown()
      }
      // Clear the input on error
      accessCode.value = ''
      codeInput.value?.focus()
    }
  } catch (error) {
    errorMessage.value = 'An unexpected error occurred. Please try again.'
    console.error('Login error:', error)
  } finally {
    isLoading.value = false
  }
}

// Countdown timer for rate limiting
const countdownInterval = ref<number | null>(null)

function startCountdown() {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }

  countdownInterval.value = window.setInterval(() => {
    if (retryAfter.value !== null && retryAfter.value > 0) {
      retryAfter.value--
    } else {
      if (countdownInterval.value) {
        clearInterval(countdownInterval.value)
        countdownInterval.value = null
      }
      retryAfter.value = null
      errorMessage.value = ''
    }
  }, 1000)
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <!-- Logo/Branding -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">SecureDealAI</h1>
        <p class="text-gray-400 mt-2">Vehicle Validation Platform</p>
        <p class="text-gray-500 mt-3 text-sm max-w-sm mx-auto">
          Platforma pro testování validace procesu nákupu vozidel
        </p>
      </div>

      <!-- Access Code Form -->
      <div class="bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-700">
        <h2 class="text-xl font-semibold text-white mb-6 text-center">
          Enter Access Code
        </h2>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div>
            <label for="accessCode" class="block text-sm font-medium text-gray-300 mb-2">
              Access Code
            </label>
            <input
              ref="codeInput"
              id="accessCode"
              v-model="accessCode"
              type="password"
              autocomplete="off"
              :disabled="isLoading || retryAfter !== null"
              class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your access code"
            />
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="bg-red-900/50 border border-red-500/50 rounded-lg p-4">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="text-red-300 text-sm">{{ errorMessage }}</p>
                <p v-if="retryAfter !== null" class="text-red-400 text-sm mt-1">
                  Try again in {{ formatTime(retryAfter) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading || retryAfter !== null || !accessCode.trim()"
            class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <span v-if="isLoading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </span>
            <span v-else-if="retryAfter !== null">
              Locked ({{ formatTime(retryAfter) }})
            </span>
            <span v-else>
              Access Application
            </span>
          </button>
        </form>

        <!-- Help Text -->
        <div class="mt-6 text-center text-sm text-gray-500">
          <p>Potřebujete přístupový kód?</p>
          <p class="mt-1">
            Kontaktujte
            <span class="text-gray-400">Jakub Strouhal</span> –
            <a
              href="mailto:jakub.strouhal@aaaauto.cz"
              class="text-blue-400 hover:text-blue-300 underline transition-colors"
            >jakub.strouhal@aaaauto.cz</a>
          </p>
        </div>
      </div>

      <!-- Footer -->
      <p class="mt-8 text-center text-sm text-gray-600">
        Internal use only
      </p>
    </div>
  </div>
</template>
