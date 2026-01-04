# Task 3.1: Vue.js Project Setup

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: None (can start in parallel with backend)
> **Estimated Effort**: Low

---

## Objective

Initialize a Vue.js 3 project with Vite, TypeScript, and required dependencies for the SecureDealAI frontend.

---

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager

---

## Project Structure

```
MVPScope/frontend/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── forms/
│   │   │   ├── VehicleForm.vue
│   │   │   └── VendorForm.vue
│   │   ├── ocr/
│   │   │   ├── DocumentUpload.vue
│   │   │   └── OcrStatus.vue
│   │   ├── validation/
│   │   │   ├── ValidationResult.vue
│   │   │   └── FieldComparison.vue
│   │   └── shared/
│   │       ├── AresStatus.vue
│   │       └── StatusBadge.vue
│   ├── composables/
│   │   ├── useSupabase.ts
│   │   ├── useValidation.ts
│   │   └── useAres.ts
│   ├── pages/
│   │   ├── Dashboard.vue
│   │   └── Detail.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   └── opportunity.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.vue
│   └── main.ts
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Implementation Steps

### Step 1: Create Project

```bash
cd MVPScope

# Create Vue.js project with Vite
npm create vite@latest frontend -- --template vue-ts

cd frontend
npm install
```

### Step 2: Install Dependencies

```bash
# Supabase client
npm install @supabase/supabase-js

# Vue Router
npm install vue-router@4

# State management (optional - Pinia)
npm install pinia

# UI Framework (Tailwind CSS recommended)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Form handling
npm install vee-validate @vee-validate/zod zod

# Utilities
npm install date-fns
npm install lodash-es
npm install -D @types/lodash-es
```

### Step 3: Configure Tailwind CSS

**tailwind.config.js**:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'status-green': '#22c55e',
        'status-orange': '#f97316',
        'status-red': '#ef4444',
      },
    },
  },
  plugins: [],
}
```

**src/assets/main.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 4: Configure Supabase Client

**src/composables/useSupabase.ts**:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export function useSupabase() {
  return { supabase };
}
```

### Step 5: Configure Router

**src/router/index.ts**:
```typescript
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
  },
  {
    path: '/opportunity/:id',
    name: 'Detail',
    component: () => import('../pages/Detail.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
```

### Step 6: Configure Environment

**.env** (for development):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**.env.example**:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Step 7: Update main.ts

**src/main.ts**:
```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { router } from './router';
import App from './App.vue';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
```

### Step 8: Test Development Server

```bash
npm run dev
```

---

## Type Definitions

**src/types/index.ts**:
```typescript
export interface BuyingOpportunity {
  id: string;
  spz: string;
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  buying_opportunity_id: string;
  spz: string;
  vin: string | null;
  znacka: string | null;
  model: string | null;
  rok_vyroby: number | null;
  datum_1_registrace: string | null;
  majitel: string | null;
}

export interface Vendor {
  id: string;
  buying_opportunity_id: string;
  vendor_type: 'PHYSICAL_PERSON' | 'COMPANY';
  name: string;
  personal_id: string | null;
  company_id: string | null;
  vat_id: string | null;
  address_street: string | null;
  address_city: string | null;
  address_postal_code: string | null;
}

export type ValidationStatus = 'GREEN' | 'ORANGE' | 'RED';
```

---

## Deployment Configuration

**vite.config.ts** (for Vercel):
```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
  },
});
```

**vercel.json**:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Validation Criteria

- [ ] Project created with Vue 3 + TypeScript
- [ ] Tailwind CSS configured
- [ ] Supabase client configured
- [ ] Router configured with Dashboard and Detail routes
- [ ] Development server runs without errors
- [ ] Environment variables working

---

## Completion Checklist

- [ ] Project scaffolded
- [ ] Dependencies installed
- [ ] Tailwind configured
- [ ] Supabase client configured
- [ ] Router set up
- [ ] Types defined
- [ ] Dev server working
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
