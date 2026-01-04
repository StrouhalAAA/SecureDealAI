# Task 3.4: Vendor Form Component

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: 3.1 Vue.js Setup, 2.3 Vendor CRUD, 2.4 ARES Lookup
> **Estimated Effort**: High

---

## Objective

Create a form component for entering vendor data (Step 2) with automatic ARES lookup and auto-fill for companies.

---

## Prerequisites

- [ ] Task 3.1 completed (Vue.js project setup)
- [ ] Task 2.3 completed (Vendor CRUD API)
- [ ] Task 2.4 completed (ARES Lookup API)

---

## UI Specification

### Company (PO) Mode
```
┌─────────────────────────────────────────────────────────────┐
│  Krok 2: Data dodavatele                                    │
├─────────────────────────────────────────────────────────────┤
│  Typ dodavatele:  ○ Fyzická osoba  ● Právnická osoba       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IČO *                                                       │
│  [27074358________] [🔍] ✅ Ověřeno v ARES                   │
│                                                              │
│  Název firmy *               (auto-filled from ARES)        │
│  [OSIT S.R.O.___________________________________]           │
│                                                              │
│  DIČ                         (auto-filled from ARES)        │
│  [CZ27074358______]                                          │
│                                                              │
│  Ulice                       (auto-filled from ARES)        │
│  [Mrštíkova 399/2A_______________________________]          │
│                                                              │
│  Město *                     PSČ *                           │
│  [Liberec_________]          [46007______________]          │
│                                                              │
│  Telefon                     Email                           │
│  [+420 xxx xxx xxx]          [info@osit.cz_______]          │
│                                                              │
│  Bankovní účet                                               │
│  [123456789/0100_________________________________]          │
│                                                              │
│                           [← Zpět] [Další krok →]            │
└─────────────────────────────────────────────────────────────┘
```

### Physical Person (FO) Mode
```
┌─────────────────────────────────────────────────────────────┐
│  Krok 2: Data dodavatele                                    │
├─────────────────────────────────────────────────────────────┤
│  Typ dodavatele:  ● Fyzická osoba  ○ Právnická osoba       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Jméno a příjmení *                                          │
│  [PETR KUSKO_____________________________________]          │
│                                                              │
│  Rodné číslo *               Datum narození                  │
│  [800415/2585_____]          [15.04.1980_________]          │
│                                                              │
│  Ulice                                                       │
│  [Mníšek za humny 420____________________________]          │
│                                                              │
│  Město *                     PSČ *                           │
│  [Mníšek__________]          [46331______________]          │
│                                                              │
│  Telefon                     Email                           │
│  [+420 xxx xxx xxx]          [petr@email.cz______]          │
│                                                              │
│  Číslo OP                    Platnost OP do                  │
│  [217215163_______]          [22.05.2034_________]          │
│                                                              │
│                           [← Zpět] [Další krok →]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

**src/components/forms/VendorForm.vue**:
```vue
<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-6">Krok 2: Data dodavatele</h2>

    <!-- Vendor Type Toggle -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Typ dodavatele
      </label>
      <div class="flex gap-4">
        <label class="flex items-center cursor-pointer">
          <input
            type="radio"
            v-model="vendorType"
            value="PHYSICAL_PERSON"
            class="mr-2"
          />
          Fyzická osoba
        </label>
        <label class="flex items-center cursor-pointer">
          <input
            type="radio"
            v-model="vendorType"
            value="COMPANY"
            class="mr-2"
          />
          Právnická osoba
        </label>
      </div>
    </div>

    <form @submit.prevent="saveAndContinue">
      <!-- COMPANY FORM -->
      <template v-if="vendorType === 'COMPANY'">
        <!-- IČO with ARES lookup -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            IČO <span class="text-red-500">*</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="form.company_id"
              type="text"
              class="flex-1 px-4 py-2 border rounded-lg font-mono"
              placeholder="8 číslic"
              maxlength="8"
              pattern="\d{8}"
              required
              @input="onIcoInput"
            />
            <button
              type="button"
              @click="lookupAres"
              :disabled="!isValidIco || aresLoading"
              class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              {{ aresLoading ? '...' : '🔍' }}
            </button>
          </div>
          <AresStatus :status="aresStatus" :message="aresMessage" class="mt-2" />
        </div>

        <!-- Company Name -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Název firmy <span class="text-red-500">*</span>
            <span v-if="autoFilled.name" class="text-green-600 text-xs ml-2">
              (vyplněno z ARES)
            </span>
          </label>
          <input
            v-model="form.name"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase"
            required
            :class="{ 'bg-green-50': autoFilled.name }"
          />
        </div>

        <!-- DIČ -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            DIČ
            <span v-if="autoFilled.vat_id" class="text-green-600 text-xs ml-2">
              (vyplněno z ARES)
            </span>
          </label>
          <input
            v-model="form.vat_id"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase font-mono"
            placeholder="CZxxxxxxxx"
            :class="{ 'bg-green-50': autoFilled.vat_id }"
          />
        </div>
      </template>

      <!-- PHYSICAL PERSON FORM -->
      <template v-else>
        <!-- Name -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Jméno a příjmení <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            class="w-full px-4 py-2 border rounded-lg uppercase"
            placeholder="JMÉNO PŘÍJMENÍ"
            required
          />
        </div>

        <!-- Personal ID + DOB -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Rodné číslo <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.personal_id"
              type="text"
              class="w-full px-4 py-2 border rounded-lg font-mono"
              placeholder="######/####"
              required
              @input="formatRodneCislo"
            />
            <p v-if="rcError" class="text-red-500 text-xs mt-1">{{ rcError }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Datum narození
            </label>
            <input
              v-model="form.date_of_birth"
              type="date"
              class="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        <!-- Document Number + Expiry -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Číslo OP
            </label>
            <input
              v-model="form.document_number"
              type="text"
              class="w-full px-4 py-2 border rounded-lg font-mono"
              placeholder="např. 217215163"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Platnost OP do
            </label>
            <input
              v-model="form.document_expiry_date"
              type="date"
              class="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
      </template>

      <!-- COMMON FIELDS -->
      <!-- Address -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Ulice
          <span v-if="autoFilled.address" class="text-green-600 text-xs ml-2">
            (vyplněno z ARES)
          </span>
        </label>
        <input
          v-model="form.address_street"
          type="text"
          class="w-full px-4 py-2 border rounded-lg"
          :class="{ 'bg-green-50': autoFilled.address }"
        />
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Město <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.address_city"
            type="text"
            class="w-full px-4 py-2 border rounded-lg"
            required
            :class="{ 'bg-green-50': autoFilled.address }"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            PSČ <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.address_postal_code"
            type="text"
            class="w-full px-4 py-2 border rounded-lg font-mono"
            placeholder="xxxxx"
            required
            maxlength="5"
            :class="{ 'bg-green-50': autoFilled.address }"
          />
        </div>
      </div>

      <!-- Contact -->
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Telefon
          </label>
          <input
            v-model="form.phone"
            type="tel"
            class="w-full px-4 py-2 border rounded-lg"
            placeholder="+420 xxx xxx xxx"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            v-model="form.email"
            type="email"
            class="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <!-- Bank Account -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Bankovní účet
        </label>
        <input
          v-model="form.bank_account"
          type="text"
          class="w-full px-4 py-2 border rounded-lg font-mono"
          placeholder="číslo účtu/kód banky"
        />
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
        {{ error }}
      </div>

      <!-- Buttons -->
      <div class="flex justify-between">
        <button
          type="button"
          @click="$emit('back')"
          class="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          ← Zpět
        </button>
        <button
          type="submit"
          :disabled="loading || !isValid"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {{ loading ? 'Ukládám...' : 'Další krok →' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { supabase } from '@/composables/useSupabase';
import AresStatus from '@/components/shared/AresStatus.vue';
import type { Vendor } from '@/types';

// ... (implement full script with ARES lookup, validation, save logic)
</script>
```

---

## ARES Integration

```typescript
// Debounced ARES lookup on IČO change
const lookupAres = useDebounceFn(async () => {
  if (!isValidIco.value) return;

  aresLoading.value = true;
  aresStatus.value = 'loading';

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ares-lookup/${form.value.company_id}`,
      { headers: { Authorization: `Bearer ${anonKey}` } }
    );

    const result = await response.json();

    if (result.found) {
      // Auto-fill fields
      form.value.name = result.data.name;
      form.value.vat_id = result.data.dic || '';
      form.value.address_street = result.data.address.street;
      form.value.address_city = result.data.address.city;
      form.value.address_postal_code = result.data.address.postal_code;

      autoFilled.value = { name: true, vat_id: !!result.data.dic, address: true };
      aresStatus.value = 'verified';
      aresMessage.value = `Firma ověřena: ${result.data.name}`;
    } else {
      aresStatus.value = 'not_found';
      aresMessage.value = 'Firma nebyla nalezena v ARES';
    }
  } catch (e) {
    aresStatus.value = 'error';
    aresMessage.value = 'Chyba při ověřování v ARES';
  } finally {
    aresLoading.value = false;
  }
}, 500);
```

---

## Validation Criteria

- [x] Vendor type toggle works
- [x] Company: IČO validation (8 digits)
- [x] Company: ARES auto-lookup on IČO
- [x] Company: Auto-fill from ARES data
- [x] Company: ARES status indicator
- [x] FO: Rodné číslo validation
- [x] FO: Format with slash (######/####)
- [x] Common fields work for both types
- [x] Saves to database correctly
- [x] Edit mode loads existing data

---

## Completion Checklist

- [x] VendorForm.vue created
- [x] ARES integration working
- [x] All validations working
- [x] Auto-fill highlighting
- [x] Edit mode working
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
