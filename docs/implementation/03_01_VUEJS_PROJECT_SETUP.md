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

## Component Tests

### Required Tests (Write Before Implementation)

For project setup, only a smoke test is required to verify the testing infrastructure works correctly.

Create test file: `MVPScope/frontend/src/components/__tests__/smoke.spec.ts`

```typescript
import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('vitest is configured correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('can import Vue', async () => {
    const { ref } = await import('vue')
    const count = ref(0)
    expect(count.value).toBe(0)
  })
})
```

### Test-First Workflow

1. **RED**: After installing Vitest, run `npm run test` - tests should fail initially
2. **GREEN**: Configure Vitest properly until tests pass
3. **VERIFY**: Ensure `npm run test` exits with code 0

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
│   │       ├── StatusBadge.vue
│   │       └── MockModeIndicator.vue    # ← NEW: Shows mock mode badge
│   ├── composables/
│   │   ├── useSupabase.ts
│   │   ├── useValidation.ts
│   │   └── useAres.ts
│   ├── services/                         # ← NEW: Mock API layer
│   │   ├── mockApi.ts                    # Mock Supabase client & Edge Functions
│   │   └── __tests__/
│   │       └── mockApi.spec.ts           # Mock API tests
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
import { mockSupabaseClient, isMockMode } from '@/services/mockApi';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use mock client in mock mode, real client otherwise
export const supabase = isMockMode()
  ? mockSupabaseClient
  : createClient(supabaseUrl, supabaseKey);

export function useSupabase() {
  return { supabase, isMockMode: isMockMode() };
}
```

---

## Mock API Layer (Frontend-First Development)

The Mock API layer enables frontend development **in parallel with backend**, eliminating blocking dependencies and increasing development velocity.

### Benefits

| Benefit | Description |
|---------|-------------|
| **Parallel Development** | Frontend can progress without waiting for backend APIs |
| **Predictable Data** | Consistent test data for UI development and testing |
| **Offline Development** | Work without network/Supabase connectivity |
| **Faster Iteration** | No API latency during UI prototyping |
| **E2E Test Stability** | Deterministic data for automated tests |

### Mock Mode Toggle

Add to **.env**:
```env
# Set to 'true' to enable mock mode (no backend required)
VITE_MOCK_MODE=true
```

Add to **.env.example**:
```env
VITE_MOCK_MODE=false
```

### Implementation

**src/services/mockApi.ts**:
```typescript
import type {
  BuyingOpportunity,
  Vehicle,
  Vendor,
  OcrExtraction,
  ValidationResult,
} from '@/types';

// ============================================
// Mock Mode Detection
// ============================================

export function isMockMode(): boolean {
  return import.meta.env.VITE_MOCK_MODE === 'true';
}

// ============================================
// Mock Data Store
// ============================================

export const mockData = {
  buyingOpportunities: [
    {
      id: 'opp-001',
      spz: '5L94454',
      status: 'DRAFT',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
    },
    {
      id: 'opp-002',
      spz: '4A12345',
      status: 'VALIDATED',
      created_at: '2026-01-02T14:30:00Z',
      updated_at: '2026-01-02T15:45:00Z',
    },
    {
      id: 'opp-003',
      spz: '2B67890',
      status: 'PENDING',
      created_at: '2026-01-03T09:00:00Z',
      updated_at: '2026-01-03T09:30:00Z',
    },
  ] as BuyingOpportunity[],

  vehicles: [
    {
      id: 'veh-001',
      buying_opportunity_id: 'opp-001',
      spz: '5L94454',
      vin: 'YV1PZA3TCL1103985',
      znacka: 'VOLVO',
      model: 'V90 CROSS COUNTRY',
      rok_vyroby: 2020,
      datum_1_registrace: '2020-03-15',
      majitel: 'OSIT S.R.O.',
    },
    {
      id: 'veh-002',
      buying_opportunity_id: 'opp-002',
      spz: '4A12345',
      vin: 'WVWZZZ3CZWE123456',
      znacka: 'VOLKSWAGEN',
      model: 'PASSAT',
      rok_vyroby: 2019,
      datum_1_registrace: '2019-06-20',
      majitel: 'Jan Novák',
    },
  ] as Vehicle[],

  vendors: [
    {
      id: 'ven-001',
      buying_opportunity_id: 'opp-001',
      vendor_type: 'COMPANY',
      name: 'OSIT S.R.O.',
      personal_id: null,
      company_id: '12345678',
      vat_id: 'CZ12345678',
      address_street: 'Hlavní 123',
      address_city: 'Praha',
      address_postal_code: '11000',
    },
    {
      id: 'ven-002',
      buying_opportunity_id: 'opp-002',
      vendor_type: 'PHYSICAL_PERSON',
      name: 'Jan Novák',
      personal_id: '8501011234',
      company_id: null,
      vat_id: null,
      address_street: 'Dlouhá 45',
      address_city: 'Brno',
      address_postal_code: '60200',
    },
  ] as Vendor[],

  ocrExtractions: [
    {
      id: 'ocr-001',
      spz: '5L94454',
      document_type: 'ORV',
      ocr_status: 'COMPLETED',
      extraction_confidence: 95,
      extracted_data: {
        registrationPlateNumber: '5L94454',
        vin: 'YV1PZA3TCL1103985',
        make: 'VOLVO',
        model: 'V90 CROSS COUNTRY',
        keeperName: 'OSIT S.R.O.',
      },
      created_at: '2026-01-01T10:15:00Z',
    },
    {
      id: 'ocr-002',
      spz: '5L94454',
      document_type: 'VTP',
      ocr_status: 'COMPLETED',
      extraction_confidence: 92,
      extracted_data: {
        ownerName: 'OSIT S.R.O.',
        ownerIco: '12345678',
        ownerAddress: 'Hlavní 123, Praha 11000',
      },
      created_at: '2026-01-01T10:20:00Z',
    },
  ] as OcrExtraction[],

  validationResults: [
    {
      id: 'val-001',
      buying_opportunity_id: 'opp-002',
      overall_status: 'GREEN',
      attempt_number: 1,
      completed_at: '2026-01-02T15:45:00Z',
      duration_ms: 150,
      field_validations: [
        { field: 'vin', result: 'MATCH', manual: 'WVWZZZ3CZWE123456', ocr: 'WVWZZZ3CZWE123456' },
        { field: 'spz', result: 'MATCH', manual: '4A12345', ocr: '4A12345' },
        { field: 'znacka', result: 'MATCH', manual: 'VOLKSWAGEN', ocr: 'VOLKSWAGEN' },
        { field: 'model', result: 'MATCH', manual: 'PASSAT', ocr: 'PASSAT' },
      ],
      issues: [],
    },
  ] as ValidationResult[],

  aresResponses: {
    '12345678': {
      found: true,
      ico: '12345678',
      name: 'OSIT S.R.O.',
      address: 'Hlavní 123, 11000 Praha',
      active: true,
      vat_payer: true,
      unreliable_vat_payer: false,
    },
    '87654321': {
      found: true,
      ico: '87654321',
      name: 'TEST COMPANY A.S.',
      address: 'Testovací 456, 12000 Praha',
      active: false,
      vat_payer: false,
      unreliable_vat_payer: false,
    },
  } as Record<string, any>,
};

// ============================================
// Mock Supabase Client
// ============================================

type MockQueryResult<T> = {
  data: T | null;
  error: Error | null;
};

function createMockQueryBuilder<T>(tableName: string, data: T[]) {
  let filteredData = [...data];
  let selectFields: string | null = null;

  const builder = {
    select: (fields?: string) => {
      selectFields = fields || '*';
      return builder;
    },
    eq: (column: string, value: any) => {
      filteredData = filteredData.filter((item: any) => item[column] === value);
      return builder;
    },
    neq: (column: string, value: any) => {
      filteredData = filteredData.filter((item: any) => item[column] !== value);
      return builder;
    },
    in: (column: string, values: any[]) => {
      filteredData = filteredData.filter((item: any) => values.includes(item[column]));
      return builder;
    },
    order: (column: string, options?: { ascending?: boolean }) => {
      const asc = options?.ascending ?? true;
      filteredData.sort((a: any, b: any) => {
        if (a[column] < b[column]) return asc ? -1 : 1;
        if (a[column] > b[column]) return asc ? 1 : -1;
        return 0;
      });
      return builder;
    },
    limit: (count: number) => {
      filteredData = filteredData.slice(0, count);
      return builder;
    },
    single: async (): Promise<MockQueryResult<T>> => {
      await simulateLatency();
      return {
        data: filteredData[0] || null,
        error: filteredData.length === 0 ? new Error('No rows found') : null,
      };
    },
    then: async (resolve: (result: MockQueryResult<T[]>) => void) => {
      await simulateLatency();
      resolve({ data: filteredData, error: null });
    },
  };

  return builder;
}

function createMockInsertBuilder<T>(tableName: string, dataStore: T[]) {
  return {
    insert: (newData: Partial<T> | Partial<T>[]) => {
      const items = Array.isArray(newData) ? newData : [newData];
      const insertedItems = items.map((item, index) => ({
        id: `mock-${tableName}-${Date.now()}-${index}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item,
      })) as T[];

      dataStore.push(...insertedItems);

      return {
        select: () => ({
          single: async () => {
            await simulateLatency();
            return { data: insertedItems[0], error: null };
          },
          then: async (resolve: any) => {
            await simulateLatency();
            resolve({ data: insertedItems, error: null });
          },
        }),
      };
    },
  };
}

function createMockUpdateBuilder<T extends { id: string }>(tableName: string, dataStore: T[]) {
  let targetId: string | null = null;

  return {
    update: (updates: Partial<T>) => ({
      eq: (column: string, value: any) => {
        if (column === 'id') targetId = value;
        return {
          select: () => ({
            single: async () => {
              await simulateLatency();
              const index = dataStore.findIndex((item) => item.id === targetId);
              if (index >= 0) {
                dataStore[index] = { ...dataStore[index], ...updates, updated_at: new Date().toISOString() };
                return { data: dataStore[index], error: null };
              }
              return { data: null, error: new Error('Row not found') };
            },
          }),
          then: async (resolve: any) => {
            await simulateLatency();
            const index = dataStore.findIndex((item) => item.id === targetId);
            if (index >= 0) {
              dataStore[index] = { ...dataStore[index], ...updates, updated_at: new Date().toISOString() };
              resolve({ data: dataStore[index], error: null });
            } else {
              resolve({ data: null, error: new Error('Row not found') });
            }
          },
        };
      },
    }),
  };
}

// Simulate network latency (50-150ms)
function simulateLatency(): Promise<void> {
  const delay = 50 + Math.random() * 100;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Mock Supabase client with table access
export const mockSupabaseClient = {
  from: (tableName: string) => {
    const tableMap: Record<string, any[]> = {
      buying_opportunities: mockData.buyingOpportunities,
      vehicles: mockData.vehicles,
      vendors: mockData.vendors,
      ocr_extractions: mockData.ocrExtractions,
      validation_results: mockData.validationResults,
    };

    const data = tableMap[tableName] || [];

    return {
      ...createMockQueryBuilder(tableName, data),
      ...createMockInsertBuilder(tableName, data),
      ...createMockUpdateBuilder(tableName, data),
    };
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        await simulateLatency();
        console.log(`[Mock] Uploaded ${file.name} to ${bucket}/${path}`);
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://mock-storage.local/${bucket}/${path}` },
      }),
    }),
  },
};

// ============================================
// Mock Edge Function Handlers
// ============================================

export const mockEdgeFunctions = {
  // ARES Lookup
  'ares-lookup': async (body: { ico: string }) => {
    await simulateLatency();
    const result = mockData.aresResponses[body.ico];
    if (result) {
      return { ok: true, json: async () => result };
    }
    return {
      ok: true,
      json: async () => ({ found: false, ico: body.ico }),
    };
  },

  // Document Upload
  'document-upload': async (body: FormData) => {
    await simulateLatency();
    const spz = body.get('spz') as string;
    const documentType = body.get('document_type') as string;
    const newExtraction: OcrExtraction = {
      id: `ocr-mock-${Date.now()}`,
      spz,
      document_type: documentType,
      ocr_status: 'PENDING',
      extraction_confidence: null,
      extracted_data: null,
      created_at: new Date().toISOString(),
    };
    mockData.ocrExtractions.push(newExtraction);
    return { ok: true, json: async () => newExtraction };
  },

  // OCR Extract
  'ocr-extract': async (body: { ocr_extraction_id: string }) => {
    await simulateLatency();
    const extraction = mockData.ocrExtractions.find((e) => e.id === body.ocr_extraction_id);
    if (extraction) {
      extraction.ocr_status = 'COMPLETED';
      extraction.extraction_confidence = 90 + Math.random() * 10;
      extraction.extracted_data = {
        registrationPlateNumber: extraction.spz,
        vin: 'MOCK' + Math.random().toString(36).substring(2, 15).toUpperCase(),
        make: 'MOCK_MAKE',
        model: 'MOCK_MODEL',
      };
      return { ok: true, json: async () => extraction };
    }
    return { ok: false, json: async () => ({ error: 'Extraction not found' }) };
  },

  // Validation Run
  'validation-run': async (body: { buying_opportunity_id: string }) => {
    await simulateLatency();
    const result: ValidationResult = {
      id: `val-mock-${Date.now()}`,
      buying_opportunity_id: body.buying_opportunity_id,
      overall_status: 'GREEN',
      attempt_number: 1,
      completed_at: new Date().toISOString(),
      duration_ms: 100 + Math.random() * 100,
      field_validations: [
        { field: 'vin', result: 'MATCH', manual: 'MOCKVIN123', ocr: 'MOCKVIN123' },
        { field: 'spz', result: 'MATCH', manual: '5L94454', ocr: '5L94454' },
      ],
      issues: [],
    };
    mockData.validationResults.push(result);
    return { ok: true, json: async () => result };
  },

  // Validation Preview
  'validation-preview': async (body: any) => {
    await simulateLatency();
    return {
      ok: true,
      json: async () => ({
        preview_status: 'INCOMPLETE',
        categories: {
          documents: {
            orv: { uploaded: false, ocr_processed: false },
            op: { uploaded: false, ocr_processed: false },
            vtp: { uploaded: false, ocr_processed: false },
          },
          vehicle: { status: 'INCOMPLETE', fields_checked: 0, fields_passed: 0, issues: [] },
          vendor: { status: 'INCOMPLETE', fields_checked: 0, fields_passed: 0, issues: [] },
        },
        summary: { passed: 0, warnings: 0, failed: 0 },
      }),
    };
  },
};

// ============================================
// Mock Fetch Wrapper
// ============================================

export function createMockFetch() {
  return async (url: string, options?: RequestInit) => {
    const functionName = url.split('/functions/v1/')[1]?.split('?')[0];

    if (functionName && mockEdgeFunctions[functionName as keyof typeof mockEdgeFunctions]) {
      let body: any = {};
      if (options?.body) {
        if (options.body instanceof FormData) {
          body = options.body;
        } else {
          body = JSON.parse(options.body as string);
        }
      }
      return mockEdgeFunctions[functionName as keyof typeof mockEdgeFunctions](body);
    }

    // Fallback to real fetch if not a known mock endpoint
    console.warn(`[Mock] Unknown endpoint: ${url}, falling back to real fetch`);
    return fetch(url, options);
  };
}

// Install mock fetch globally in mock mode
if (isMockMode()) {
  console.info('🔶 Mock Mode Enabled - Using mock API layer');
  (window as any).originalFetch = window.fetch;
  window.fetch = createMockFetch() as typeof fetch;
}
```

### Mock Mode Indicator Component

**src/components/shared/MockModeIndicator.vue**:
```vue
<template>
  <div
    v-if="isMockMode"
    class="fixed bottom-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-lg z-50"
  >
    🔶 MOCK MODE
  </div>
</template>

<script setup lang="ts">
import { isMockMode } from '@/services/mockApi';
</script>
```

Add to **src/App.vue**:
```vue
<template>
  <RouterView />
  <MockModeIndicator />
</template>

<script setup lang="ts">
import MockModeIndicator from '@/components/shared/MockModeIndicator.vue';
</script>
```

### Mock API Tests

Add to test file: `MVPScope/frontend/src/services/__tests__/mockApi.spec.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mockData, mockSupabaseClient, isMockMode, mockEdgeFunctions } from '../mockApi';

describe('Mock API Layer', () => {
  describe('isMockMode', () => {
    it('returns boolean based on environment variable', () => {
      expect(typeof isMockMode()).toBe('boolean');
    });
  });

  describe('mockSupabaseClient', () => {
    it('can query buying_opportunities', async () => {
      const { data, error } = await mockSupabaseClient
        .from('buying_opportunities')
        .select('*')
        .eq('id', 'opp-001')
        .single();

      expect(error).toBeNull();
      expect(data?.spz).toBe('5L94454');
    });

    it('can query vehicles', async () => {
      const result = await new Promise((resolve) => {
        mockSupabaseClient
          .from('vehicles')
          .select('*')
          .eq('buying_opportunity_id', 'opp-001')
          .then(resolve);
      });

      expect((result as any).data.length).toBeGreaterThan(0);
    });

    it('can insert new records', async () => {
      const initialCount = mockData.buyingOpportunities.length;

      await mockSupabaseClient
        .from('buying_opportunities')
        .insert({ spz: '1X99999', status: 'DRAFT' })
        .select()
        .single();

      expect(mockData.buyingOpportunities.length).toBe(initialCount + 1);
    });

    it('can query with ordering', async () => {
      const result = await new Promise((resolve) => {
        mockSupabaseClient
          .from('buying_opportunities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(2)
          .then(resolve);
      });

      expect((result as any).data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('mockEdgeFunctions', () => {
    it('ares-lookup returns data for known IČO', async () => {
      const response = await mockEdgeFunctions['ares-lookup']({ ico: '12345678' });
      const data = await response.json();

      expect(data.found).toBe(true);
      expect(data.name).toBe('OSIT S.R.O.');
    });

    it('ares-lookup returns not found for unknown IČO', async () => {
      const response = await mockEdgeFunctions['ares-lookup']({ ico: '00000000' });
      const data = await response.json();

      expect(data.found).toBe(false);
    });

    it('validation-run returns GREEN result', async () => {
      const response = await mockEdgeFunctions['validation-run']({
        buying_opportunity_id: 'opp-001',
      });
      const data = await response.json();

      expect(data.overall_status).toBe('GREEN');
      expect(data.field_validations.length).toBeGreaterThan(0);
    });

    it('validation-preview returns preview structure', async () => {
      const response = await mockEdgeFunctions['validation-preview']({
        buying_opportunity_id: 'opp-001',
      });
      const data = await response.json();

      expect(data.preview_status).toBeDefined();
      expect(data.categories).toBeDefined();
      expect(data.summary).toBeDefined();
    });
  });
});
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

export interface OcrExtraction {
  id: string;
  spz: string;
  document_type: 'ORV' | 'VTP' | 'OP';
  ocr_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extraction_confidence: number | null;
  extracted_data: Record<string, any> | null;
  errors?: { message: string };
  created_at: string;
}

export interface FieldValidation {
  field: string;
  result: 'MATCH' | 'MISMATCH' | 'MISSING';
  status?: 'GREEN' | 'ORANGE' | 'RED';
  manual?: string;
  ocr?: string;
  expected?: string;
  actual?: string;
  similarity?: number;
}

export interface ValidationResult {
  id: string;
  buying_opportunity_id: string;
  overall_status: ValidationStatus;
  attempt_number: number;
  completed_at: string;
  duration_ms: number;
  field_validations: FieldValidation[];
  issues: Array<{
    field: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
    details?: { manual: string; ocr: string };
  }>;
}

export interface ValidationPreviewResponse {
  preview_status: 'GREEN' | 'ORANGE' | 'RED' | 'INCOMPLETE';
  categories: {
    documents?: {
      orv?: { uploaded: boolean; ocr_processed: boolean; ocr_fields_extracted?: number };
      op?: { uploaded: boolean; ocr_processed: boolean; ocr_fields_extracted?: number };
      vtp?: { uploaded: boolean; ocr_processed: boolean; ocr_fields_extracted?: number };
    };
    vehicle?: CategoryResult;
    vendor?: CategoryResult;
    ares?: {
      company_found: boolean;
      company_active: boolean;
      vat_payer: boolean;
      unreliable_vat_payer: boolean;
    };
  };
  summary: { passed: number; warnings: number; failed: number };
}

export interface CategoryResult {
  status: 'GREEN' | 'ORANGE' | 'RED' | 'INCOMPLETE';
  fields_checked: number;
  fields_passed: number;
  fields_missing?: number;
  issues: Array<{ field: string; status: string; similarity?: number }>;
}

export interface DocumentStatus {
  uploaded: boolean;
  ocr_processed: boolean;
  ocr_fields_extracted?: number;
}

export interface DocumentProgress {
  orv?: DocumentStatus;
  op?: DocumentStatus;
  vtp?: DocumentStatus;
}
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

## Validation Commands

```bash
# Run component tests
cd MVPScope/frontend && npm run test

# Verify test passes
cd MVPScope/frontend && npm run test -- --run
```

---

## Validation Criteria

- [ ] Project created with Vue 3 + TypeScript
- [ ] Tailwind CSS configured
- [ ] Supabase client configured
- [ ] Router configured with Dashboard and Detail routes
- [ ] Development server runs without errors
- [ ] Environment variables working
- [ ] Vitest smoke test passes
- [ ] Mock API layer implemented (`src/services/mockApi.ts`)
- [ ] Mock mode toggle works (`VITE_MOCK_MODE=true`)
- [ ] MockModeIndicator component shows in mock mode
- [ ] Mock API tests pass

---

## Completion Checklist

- [ ] Project scaffolded
- [ ] Dependencies installed
- [ ] Tailwind configured
- [ ] Supabase client configured
- [ ] Router set up
- [ ] Types defined
- [ ] **Mock API layer created** (`src/services/mockApi.ts`)
- [ ] **MockModeIndicator component created**
- [ ] **Mock API tests passing**
- [ ] Dev server working (with `VITE_MOCK_MODE=true`)
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
