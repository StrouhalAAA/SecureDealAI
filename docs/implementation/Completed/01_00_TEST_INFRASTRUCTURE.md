# Task 01_00: Test Infrastructure Setup

> **Phase**: 1 - Infrastructure Setup (NEW FIRST TASK)
> **Status**: [x] Implemented (2026-01-03)
> **Priority**: Critical (Blocks all other tasks)
> **Depends On**: None
> **Estimated Effort**: Medium

---

## Objective

Set up testing frameworks for all application tiers to enable Test-Driven Development throughout the implementation.

---

## Prerequisites

- [x] Node.js installed
- [x] Supabase CLI installed
- [x] Project cloned locally

---

## Implementation Steps

### Step 1: Backend Test Setup (Deno)

Create test configuration for Supabase Edge Functions:

```bash
# Create test directory
mkdir -p MVPScope/supabase/functions/tests
```

```json
// MVPScope/supabase/deno.json (update existing)
{
  "tasks": {
    "test": "deno test --allow-env --allow-net --allow-read functions/tests/"
  },
  "imports": {
    "std/": "https://deno.land/std@0.208.0/",
    "@std/assert": "jsr:@std/assert@1"
  }
}
```

```typescript
// MVPScope/supabase/functions/tests/test-utils.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getTestClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "test-anon-key"
  );
}

export async function cleanupTestData(spz: string) {
  const client = getTestClient();
  await client.from("buying_opportunities").delete().eq("spz", spz);
}

export function generateTestSpz(): string {
  return `TEST${Date.now().toString().slice(-6)}`;
}
```

```typescript
// MVPScope/supabase/functions/tests/smoke.test.ts
import { assertEquals } from "@std/assert";

Deno.test("Supabase connection works", async () => {
  const res = await fetch("http://localhost:54321/rest/v1/", {
    headers: { "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "" }
  });
  assertEquals(res.status, 200);
});
```

### Step 2: Frontend Test Setup (Vitest)

```bash
# Install test dependencies (run in frontend directory)
cd MVPScope/frontend
npm install -D vitest @vue/test-utils jsdom @testing-library/vue
```

```typescript
// MVPScope/frontend/vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts,vue}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

```json
// MVPScope/frontend/package.json (add to scripts)
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

```typescript
// MVPScope/frontend/src/components/__tests__/smoke.spec.ts
import { describe, it, expect } from 'vitest'

describe('Test Setup', () => {
  it('vitest is configured correctly', () => {
    expect(1 + 1).toBe(2)
  })
})
```

### Step 3: E2E Test Setup (Playwright)

```bash
# Install Playwright
cd MVPScope/frontend
npm init playwright@latest
```

```typescript
// MVPScope/frontend/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

```typescript
// MVPScope/frontend/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SecureDealAI/);
});
```

### Step 4: Test Data Setup

```bash
# Create test data directory
mkdir -p test_data/fixtures
```

```json
// test_data/fixtures/buying-opportunity.json
{
  "valid": {
    "spz": "5L94454",
    "status": "DRAFT"
  },
  "invalid_spz": {
    "spz": "",
    "status": "DRAFT"
  }
}
```

```json
// test_data/fixtures/vehicle.json
{
  "valid": {
    "vin": "YV1PZA3TCL1103985",
    "make": "VOLVO",
    "model": "V90 CROSS COUNTRY",
    "first_registration_date": "2020-01-15"
  },
  "invalid_vin": {
    "vin": "TOOSHORT",
    "make": "VOLVO",
    "model": "V90"
  }
}
```

```json
// test_data/fixtures/vendor-company.json
{
  "valid": {
    "vendor_type": "COMPANY",
    "company_name": "OSIT S.R.O.",
    "company_id": "27074358",
    "tax_id": "CZ27074358"
  }
}
```

### Step 5: Mock Server for External APIs

```typescript
// MVPScope/supabase/functions/tests/mocks/mistral-mock.ts
export function createMistralMock() {
  return {
    extractORV: () => ({
      registrationPlateNumber: "5L94454",
      vin: "YV1PZA3TCL1103985",
      keeperName: "OSIT S.R.O.",
      make: "VOLVO",
      model: "V90 CROSS COUNTRY"
    }),
    extractOP: () => ({
      firstName: "JAN",
      lastName: "NOVAK",
      personalNumber: "800101/1234"
    })
  };
}
```

```typescript
// MVPScope/supabase/functions/tests/mocks/ares-mock.ts
export function createAresMock() {
  return {
    lookup: (ico: string) => {
      if (ico === "27074358") {
        return {
          ico: "27074358",
          obchodniJmeno: "OSIT S.R.O.",
          dic: "CZ27074358",
          sidlo: { textovaAdresa: "Praha 1, Staromestske nam. 1" }
        };
      }
      return null;
    }
  };
}
```

### Step 6: Root Package.json Scripts

```json
// package.json (project root - add/update scripts)
{
  "scripts": {
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd MVPScope/supabase && deno task test",
    "test:frontend": "cd MVPScope/frontend && npm run test",
    "test:e2e": "cd MVPScope/frontend && npx playwright test",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

## Validation Criteria

- [x] `npm run test:backend` runs and passes smoke test
- [x] `npm run test:frontend` runs and passes smoke test
- [x] `npm run test:e2e` runs (may skip if no frontend yet)
- [x] Test fixtures load correctly
- [x] Mock servers return expected data

---

## Validation Commands

```bash
# Backend tests
cd MVPScope/supabase && deno task test

# Frontend tests
cd MVPScope/frontend && npm run test

# E2E tests (after frontend exists)
cd MVPScope/frontend && npx playwright test

# All tests from root
npm run test
```

---

## Completion Checklist

- [x] Deno test runner configured
- [x] Vitest configured for Vue.js
- [x] Playwright installed and configured
- [x] Test fixtures created
- [x] Mock servers for Mistral/ARES created
- [x] Root package.json scripts added
- [x] All smoke tests pass
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
