# Task 6.6: Swagger UI Integration

> **Task ID**: 06_06
> **Status**: [ ] Pending
> **Depends On**: 6.3, 6.4, 6.5 (All API handlers complete)
> **Estimated Time**: 2 hours

---

## Objective

Integrate Swagger UI into the SecureDealAI frontend to provide interactive API documentation accessible from the main application. Users can explore and test the Rules Management API directly from the browser.

---

## Prerequisites

- Tasks 6.3, 6.4, 6.5 completed (all API handlers working)
- Frontend Vue.js project running
- OpenAPI specification available

---

## Components to Create

| Component | Purpose |
|-----------|---------|
| `SwaggerUI.vue` | Page component wrapping Swagger UI |
| `openapi.yaml` | OpenAPI 3.0.3 specification file |

---

## Implementation Steps

### Step 1: Install Swagger UI Dependencies

```bash
cd apps/web
npm install swagger-ui-dist
```

### Step 2: Copy OpenAPI Specification

Copy the OpenAPI spec from the analysis folder to the public folder:

```bash
cp docs/Analysis/ValidationRulesManagement/openapi-validation-rules.yaml apps/web/public/openapi.yaml
```

### Step 3: Update OpenAPI Spec Server URL

Edit `apps/web/public/openapi.yaml` to include the production server URL:

```yaml
# At the top of the file, update servers section
servers:
  - url: https://bdmygmbxtdgujkytpxha.supabase.co/functions/v1
    description: Production server
  - url: http://localhost:54321/functions/v1
    description: Local development
```

### Step 4: Create SwaggerUI.vue Page Component

```vue
<!-- apps/web/src/pages/SwaggerUI.vue -->
<template>
  <div class="swagger-page">
    <div class="swagger-header">
      <div class="header-content">
        <router-link to="/" class="back-link">
          <span class="back-arrow">&larr;</span>
          Back to Dashboard
        </router-link>
        <h1>API Documentation</h1>
        <p class="subtitle">Rules Management API - OpenAPI 3.0.3</p>
      </div>
    </div>

    <div class="swagger-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading API documentation...</p>
      </div>

      <div v-if="error" class="error-state">
        <p class="error-title">Failed to load API documentation</p>
        <p class="error-message">{{ error }}</p>
        <button @click="initSwagger" class="retry-button">Retry</button>
      </div>

      <div id="swagger-ui" ref="swaggerEl"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle.js';
import 'swagger-ui-dist/swagger-ui.css';

const swaggerEl = ref<HTMLElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

let swaggerInstance: ReturnType<typeof SwaggerUI> | null = null;

const initSwagger = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Get JWT token for authorized requests
    const token = localStorage.getItem('access_token');

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
      requestInterceptor: (request: Request) => {
        const currentToken = localStorage.getItem('access_token');
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
    error.value = err instanceof Error ? err.message : 'Unknown error';
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
  background-color: #1a1a2e;
}

.swagger-header {
  background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
  border-bottom: 1px solid #2d3748;
  padding: 1.5rem 2rem;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
}

.back-link {
  display: inline-flex;
  align-items: center;
  color: #60a5fa;
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: #93c5fd;
}

.back-arrow {
  margin-right: 0.5rem;
}

h1 {
  color: #f3f4f6;
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
}

.subtitle {
  color: #9ca3af;
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
  color: #9ca3af;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #2d3748;
  border-top-color: #60a5fa;
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
  color: #f87171;
}

.error-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #9ca3af;
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

/* Swagger UI Theme Overrides for Dark Mode */
:deep(.swagger-ui) {
  background: transparent;
}

:deep(.swagger-ui .opblock-tag) {
  color: #f3f4f6;
  border-color: #374151;
}

:deep(.swagger-ui .opblock) {
  background: #1f2937;
  border-color: #374151;
}

:deep(.swagger-ui .opblock .opblock-summary) {
  border-color: #374151;
}

:deep(.swagger-ui .opblock .opblock-summary-method) {
  font-weight: 600;
}

:deep(.swagger-ui .opblock.opblock-get) {
  background: rgba(97, 175, 254, 0.1);
  border-color: #61affe;
}

:deep(.swagger-ui .opblock.opblock-post) {
  background: rgba(73, 204, 144, 0.1);
  border-color: #49cc90;
}

:deep(.swagger-ui .opblock.opblock-put) {
  background: rgba(252, 161, 48, 0.1);
  border-color: #fca130;
}

:deep(.swagger-ui .opblock.opblock-delete) {
  background: rgba(249, 62, 62, 0.1);
  border-color: #f93e3e;
}

:deep(.swagger-ui .info .title) {
  color: #f3f4f6;
}

:deep(.swagger-ui .info .description),
:deep(.swagger-ui .info li),
:deep(.swagger-ui .info p) {
  color: #d1d5db;
}

:deep(.swagger-ui .scheme-container) {
  background: #1f2937;
  box-shadow: none;
}

:deep(.swagger-ui select) {
  background: #374151;
  color: #f3f4f6;
  border-color: #4b5563;
}

:deep(.swagger-ui .btn) {
  background: #374151;
  color: #f3f4f6;
  border-color: #4b5563;
}

:deep(.swagger-ui .btn:hover) {
  background: #4b5563;
}

:deep(.swagger-ui .btn.execute) {
  background: #3b82f6;
  border-color: #3b82f6;
}

:deep(.swagger-ui .btn.execute:hover) {
  background: #2563eb;
}

:deep(.swagger-ui textarea),
:deep(.swagger-ui input[type="text"]) {
  background: #374151;
  color: #f3f4f6;
  border-color: #4b5563;
}

:deep(.swagger-ui .model-box) {
  background: #1f2937;
}

:deep(.swagger-ui table thead tr th),
:deep(.swagger-ui table thead tr td) {
  color: #f3f4f6;
  border-color: #374151;
}

:deep(.swagger-ui .response-col_status) {
  color: #f3f4f6;
}

:deep(.swagger-ui .response-col_description) {
  color: #d1d5db;
}

:deep(.swagger-ui .opblock-section-header) {
  background: #111827;
}

:deep(.swagger-ui .opblock-section-header h4) {
  color: #f3f4f6;
}

:deep(.swagger-ui .parameter__name) {
  color: #f3f4f6;
}

:deep(.swagger-ui .parameter__type) {
  color: #9ca3af;
}

:deep(.swagger-ui .markdown p) {
  color: #d1d5db;
}

:deep(.swagger-ui .servers-title) {
  color: #f3f4f6;
}

:deep(.swagger-ui .filter-container) {
  background: transparent;
}

:deep(.swagger-ui .filter-container input) {
  background: #374151;
  color: #f3f4f6;
  border-color: #4b5563;
}
</style>
```

### Step 5: Add Route for Swagger UI

Update the router to include the Swagger page:

```typescript
// apps/web/src/router/index.ts

// Add import
import SwaggerUI from '@/pages/SwaggerUI.vue';

// Add route (inside the routes array, with other protected routes)
{
  path: '/api-docs',
  name: 'ApiDocs',
  component: SwaggerUI,
  meta: { requiresAuth: true }
},
```

### Step 6: Add Link in Header/Navigation

Add a link to the API docs in the application header:

```vue
<!-- In apps/web/src/components/layout/AppHeader.vue or similar -->
<template>
  <header class="app-header">
    <!-- ... existing header content ... -->

    <nav class="nav-links">
      <router-link to="/" class="nav-link">Dashboard</router-link>
      <router-link to="/api-docs" class="nav-link">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        API Docs
      </router-link>
    </nav>

    <!-- ... rest of header ... -->
  </header>
</template>

<style scoped>
.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9ca3af;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #f3f4f6;
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.router-link-active {
  color: #60a5fa;
  background-color: rgba(96, 165, 250, 0.1);
}

.nav-icon {
  width: 1rem;
  height: 1rem;
}
</style>
```

### Step 7: Add Dashboard Link (Optional)

If you want a card on the dashboard linking to API docs:

```vue
<!-- In apps/web/src/pages/Dashboard.vue -->
<template>
  <!-- ... existing dashboard content ... -->

  <div class="quick-links">
    <router-link to="/api-docs" class="quick-link-card">
      <div class="card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <div class="card-content">
        <h3>API Documentation</h3>
        <p>Explore and test the Rules Management API</p>
      </div>
      <span class="card-arrow">&rarr;</span>
    </router-link>
  </div>
</template>

<style scoped>
.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.quick-link-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: all 0.2s;
}

.quick-link-card:hover {
  border-color: #60a5fa;
  background: #263348;
}

.card-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(96, 165, 250, 0.1);
  border-radius: 0.5rem;
  color: #60a5fa;
}

.card-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  color: #f3f4f6;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.card-content p {
  color: #9ca3af;
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
}

.card-arrow {
  color: #60a5fa;
  font-size: 1.25rem;
}
</style>
```

### Step 8: Build and Test

```bash
cd apps/web
npm run build
npm run dev
```

Navigate to `http://localhost:5173/api-docs` to verify Swagger UI loads correctly.

---

## Test Cases

### TC-6.6.1: Swagger Page Loads

Navigate to `/api-docs` in the browser.

Expected: Swagger UI renders with all endpoints visible

### TC-6.6.2: OpenAPI Spec Loads

Check browser network tab for `/openapi.yaml`

Expected: 200 OK, valid YAML content

### TC-6.6.3: Authorization Header Applied

Use "Try it out" on any endpoint

Expected: Request includes `Authorization: Bearer <token>`

### TC-6.6.4: Try It Out Works

Execute `GET /rules` from Swagger UI

Expected: Response displayed in Swagger UI

### TC-6.6.5: Dark Theme Applied

Verify visual appearance matches dark theme

Expected: Dark backgrounds, light text, colored HTTP method badges

### TC-6.6.6: Navigation Link Works

Click "API Docs" link in header

Expected: Navigates to `/api-docs`

### TC-6.6.7: Back Link Works

Click "Back to Dashboard" on Swagger page

Expected: Navigates to `/`

### TC-6.6.8: Auth Required

Try to access `/api-docs` without authentication

Expected: Redirects to access code page

---

## Validation Criteria

- [ ] Swagger UI page component created
- [ ] OpenAPI spec copied to public folder
- [ ] Server URLs configured correctly
- [ ] Route added to router
- [ ] Navigation link added to header
- [ ] Dark theme styling applied
- [ ] JWT token auto-applied to requests
- [ ] Try It Out functionality works
- [ ] Page protected by auth guard

---

## Troubleshooting

### Issue: Swagger UI doesn't load

**Solution**: Check that `swagger-ui-dist` is installed and imported correctly.

### Issue: OpenAPI spec not found

**Solution**: Verify `openapi.yaml` is in the `public` folder.

### Issue: CORS errors on Try It Out

**Solution**: Ensure Edge Function CORS headers allow the frontend origin.

### Issue: Authentication not working

**Solution**: Verify `localStorage.getItem('access_token')` returns a valid token.

---

## Completion Checklist

When this task is complete:
1. SwaggerUI.vue page created
2. OpenAPI spec in public folder
3. Route configured
4. Navigation link added
5. Dark theme applied
6. Auth integration working
7. All test cases passing

**Mark as complete**: Update tracker status to `[x] Complete`
