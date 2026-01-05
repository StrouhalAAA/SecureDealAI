<template>
  <div class="swagger-page">
    <div class="swagger-header">
      <div class="header-content">
        <router-link to="/" class="back-link">
          <span class="back-arrow">&larr;</span>
          Zpět na Dashboard
        </router-link>
        <h1>API Dokumentace</h1>
        <p class="subtitle">Rules Management API - OpenAPI 3.0.3</p>
      </div>
    </div>

    <div class="swagger-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Načítání API dokumentace...</p>
      </div>

      <div v-if="error" class="error-state">
        <p class="error-title">Nepodařilo se načíst API dokumentaci</p>
        <p class="error-message">{{ error }}</p>
        <button @click="initSwagger" class="retry-button">Zkusit znovu</button>
      </div>

      <div id="swagger-ui"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle.js';
import 'swagger-ui-dist/swagger-ui.css';

const TOKEN_KEY = 'securedealai_token';

const loading = ref(true);
const error = ref<string | null>(null);

let swaggerInstance: ReturnType<typeof SwaggerUI> | null = null;

const initSwagger = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Get JWT token for authorized requests
    const token = localStorage.getItem(TOKEN_KEY);

    swaggerInstance = SwaggerUI({
      dom_id: '#swagger-ui',
      url: '/openapi.yaml',
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      persistAuthorization: true,

      // Pre-authorize with JWT token if available
      onComplete: () => {
        loading.value = false;

        if (token && swaggerInstance) {
          swaggerInstance.preauthorizeApiKey('bearerAuth', token);
        }
      },

      // Custom request interceptor for auth
      requestInterceptor: (request: { headers: Record<string, string> }) => {
        const currentToken = localStorage.getItem(TOKEN_KEY);
        if (currentToken && !request.headers.Authorization) {
          request.headers.Authorization = `Bearer ${currentToken}`;
        }
        return request;
      },

      // Theme customization
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    });
  } catch (err) {
    loading.value = false;
    error.value = err instanceof Error ? err.message : 'Neznámá chyba';
    console.error('Failed to initialize Swagger UI:', err);
  }
};

onMounted(() => {
  initSwagger();
});

onUnmounted(() => {
  // Clean up Swagger instance if needed
  swaggerInstance = null;
});
</script>

<style scoped>
.swagger-page {
  min-height: 100vh;
  background-color: #f9fafb;
}

.swagger-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1.5rem 2rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #2563eb;
}

.back-arrow {
  margin-right: 0.5rem;
}

h1 {
  color: #111827;
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
}

.subtitle {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
}

.swagger-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 2rem;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  color: #ef4444;
}

.error-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #6b7280;
  margin-bottom: 1rem;
}

.retry-button {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #2563eb;
}

/* Swagger UI Light Theme Overrides */
:deep(.swagger-ui) {
  background: transparent;
}

:deep(.swagger-ui .info .title) {
  color: #111827;
}

:deep(.swagger-ui .info .description),
:deep(.swagger-ui .info li),
:deep(.swagger-ui .info p) {
  color: #374151;
}

:deep(.swagger-ui .opblock-tag) {
  color: #111827;
  border-color: #e5e7eb;
}

:deep(.swagger-ui .opblock) {
  background: white;
  border-color: #e5e7eb;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

:deep(.swagger-ui .opblock .opblock-summary) {
  border-color: #e5e7eb;
}

:deep(.swagger-ui .opblock .opblock-summary-method) {
  font-weight: 600;
}

:deep(.swagger-ui .opblock.opblock-get) {
  background: rgba(97, 175, 254, 0.08);
  border-color: #61affe;
}

:deep(.swagger-ui .opblock.opblock-post) {
  background: rgba(73, 204, 144, 0.08);
  border-color: #49cc90;
}

:deep(.swagger-ui .opblock.opblock-put) {
  background: rgba(252, 161, 48, 0.08);
  border-color: #fca130;
}

:deep(.swagger-ui .opblock.opblock-delete) {
  background: rgba(249, 62, 62, 0.08);
  border-color: #f93e3e;
}

:deep(.swagger-ui .scheme-container) {
  background: white;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  border-radius: 0.375rem;
  padding: 1rem;
}

:deep(.swagger-ui select) {
  background: white;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

:deep(.swagger-ui .btn) {
  background: white;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

:deep(.swagger-ui .btn:hover) {
  background: #f3f4f6;
}

:deep(.swagger-ui .btn.execute) {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

:deep(.swagger-ui .btn.execute:hover) {
  background: #2563eb;
}

:deep(.swagger-ui textarea),
:deep(.swagger-ui input[type="text"]) {
  background: white;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

:deep(.swagger-ui .model-box) {
  background: #f9fafb;
}

:deep(.swagger-ui table thead tr th),
:deep(.swagger-ui table thead tr td) {
  color: #111827;
  border-color: #e5e7eb;
}

:deep(.swagger-ui .response-col_status) {
  color: #111827;
}

:deep(.swagger-ui .response-col_description) {
  color: #374151;
}

:deep(.swagger-ui .opblock-section-header) {
  background: #f9fafb;
}

:deep(.swagger-ui .opblock-section-header h4) {
  color: #111827;
}

:deep(.swagger-ui .parameter__name) {
  color: #111827;
}

:deep(.swagger-ui .parameter__type) {
  color: #6b7280;
}

:deep(.swagger-ui .markdown p) {
  color: #374151;
}

:deep(.swagger-ui .servers-title) {
  color: #111827;
}

:deep(.swagger-ui .filter-container) {
  background: transparent;
}

:deep(.swagger-ui .filter-container input) {
  background: white;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

:deep(.swagger-ui .authorization__btn) {
  fill: #3b82f6;
}

:deep(.swagger-ui .authorization__btn.locked) {
  fill: #10b981;
}
</style>
