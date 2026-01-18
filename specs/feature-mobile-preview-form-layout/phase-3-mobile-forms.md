# Phase 3: Mobile-Optimized Forms

> **Phase Goal**: Create mobile-first versions of the vehicle and vendor forms
> **Tasks**: 2
> **Dependencies**: Phase 1 (foundation complete)
> **Estimated Complexity**: Complex (most work-intensive phase)

---

## Task 3.1: Create MobileVehicleForm.vue Component {#task-31}

**Complexity**: Complex
**Dependencies**: Phase 1, Task 0.2 (form analysis)
**File**: `apps/web/src/components/forms/MobileVehicleForm.vue`
**Assignable**: Yes (standalone, can be parallel with 3.2)

### Objective
Create a mobile-optimized version of VehicleForm with identical functionality but mobile-first styling.

### Source Reference
Copy logic from: `apps/web/src/components/forms/VehicleForm.vue`

### Mobile Styling Changes

| Property | Desktop (VehicleForm) | Mobile (MobileVehicleForm) |
|----------|----------------------|---------------------------|
| Layout | 2-column grid on md+ | Single column always |
| Input padding | `py-2 px-4` | `py-3 px-4` |
| Font size | `text-sm` | `text-base` (16px) |
| Field spacing | `space-y-4` | `space-y-5` |
| Button height | `h-10` | `h-12` (48px) |
| Touch targets | Default | Min 44x44px |

### Implementation Structure

```vue
<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <!-- OCR Data Section (if available) -->
    <div v-if="hasOcrData" class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <h3 class="text-sm font-medium text-amber-800 mb-2">OCR Data k dispozici</h3>
      <!-- OCR preview fields -->
    </div>

    <!-- SPZ Field -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        SPZ <span class="text-red-500">*</span>
      </label>
      <input
        v-model="form.spz"
        type="text"
        class="mobile-input"
        placeholder="1AB 2345"
        :disabled="!!existingVehicle"
      />
      <p v-if="errors.spz" class="mt-1 text-sm text-red-500">{{ errors.spz }}</p>
    </div>

    <!-- VIN Field -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        VIN <span class="text-red-500">*</span>
      </label>
      <input
        v-model="form.vin"
        type="text"
        class="mobile-input font-mono uppercase"
        placeholder="WVWZZZ3CZWE123456"
        maxlength="17"
      />
      <p v-if="errors.vin" class="mt-1 text-sm text-red-500">{{ errors.vin }}</p>
    </div>

    <!-- Make (Značka) -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Značka <span class="text-red-500">*</span>
      </label>
      <input
        v-model="form.znacka"
        type="text"
        class="mobile-input"
        placeholder="Škoda"
      />
    </div>

    <!-- Model -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Model <span class="text-red-500">*</span>
      </label>
      <input
        v-model="form.model"
        type="text"
        class="mobile-input"
        placeholder="Octavia"
      />
    </div>

    <!-- Year of Manufacture -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Rok výroby <span class="text-red-500">*</span>
      </label>
      <input
        v-model.number="form.rok_vyroby"
        type="number"
        class="mobile-input"
        placeholder="2020"
        min="1900"
        :max="new Date().getFullYear()"
      />
    </div>

    <!-- First Registration Date -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Datum 1. registrace
      </label>
      <input
        v-model="form.datum_1_registrace"
        type="date"
        class="mobile-input"
      />
    </div>

    <!-- Owner -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Majitel <span class="text-red-500">*</span>
      </label>
      <input
        v-model="form.majitel"
        type="text"
        class="mobile-input"
        placeholder="Jan Novák"
      />
    </div>

    <!-- Engine Type -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Motor
      </label>
      <select v-model="form.motor" class="mobile-input">
        <option value="">Vyberte...</option>
        <option value="Benzín">Benzín</option>
        <option value="Diesel">Diesel</option>
        <option value="Elektro">Elektro</option>
        <option value="Hybrid">Hybrid</option>
        <option value="CNG">CNG</option>
        <option value="LPG">LPG</option>
      </select>
    </div>

    <!-- Power -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Výkon (kW)
      </label>
      <input
        v-model.number="form.vykon_kw"
        type="number"
        class="mobile-input"
        placeholder="110"
        min="0"
      />
    </div>

    <!-- Mileage -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Tachometr (km)
      </label>
      <input
        v-model.number="form.tachometer_km"
        type="number"
        class="mobile-input"
        placeholder="125000"
        min="0"
      />
    </div>

    <!-- Submit Button -->
    <div class="pt-4">
      <LoadingButton
        type="submit"
        :loading="saving"
        class="w-full h-12 text-base"
      >
        Uložit a pokračovat
      </LoadingButton>
    </div>
  </form>
</template>

<script setup lang="ts">
// Copy all logic from VehicleForm.vue
// Keep all validation, events, and functionality identical
</script>

<style scoped>
.mobile-input {
  @apply w-full py-3 px-4 text-base border border-gray-300 rounded-xl;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  @apply disabled:bg-gray-100 disabled:text-gray-500;
  /* Prevent iOS zoom on focus */
  font-size: 16px;
}

/* Ensure touch targets are at least 44px */
input, select, button {
  min-height: 44px;
}
</style>
```

### Props (identical to VehicleForm)
| Prop | Type | Description |
|------|------|-------------|
| `buyingOpportunityId` | `string` | ID of the buying opportunity |
| `initialSpz` | `string \| undefined` | Pre-filled SPZ value |
| `existingVehicle` | `Vehicle \| null` | Existing vehicle data to edit |
| `ocrData` | `OCRVehicleData \| null` | OCR extraction data |

### Events (identical to VehicleForm)
| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `Vehicle` | Emitted after successful save |
| `next` | - | Emitted when user wants to proceed |

### Validation (must match VehicleForm exactly)
- SPZ: Required, format validation
- VIN: Required, 17 characters, checksum
- Značka: Required
- Model: Required
- Rok výroby: Required, 1900-current year
- Majitel: Required
- Other fields: Optional

### Acceptance Criteria
- [ ] All form fields present and functional
- [ ] Single column layout on all screen sizes
- [ ] Input padding is `py-3` (larger than desktop)
- [ ] Font size is 16px to prevent iOS zoom
- [ ] Field spacing is `space-y-5` (larger than desktop)
- [ ] Button height is 48px (h-12)
- [ ] All validation works identically to VehicleForm
- [ ] Emits `saved` event with correct payload
- [ ] Emits `next` event when proceeding
- [ ] OCR data section displays when data present
- [ ] Disabled state works for SPZ when editing

---

## Task 3.2: Create MobileVendorForm.vue Component {#task-32}

**Complexity**: Complex
**Dependencies**: Phase 1, Task 0.2 (form analysis)
**File**: `apps/web/src/components/forms/MobileVendorForm.vue`
**Assignable**: Yes (standalone, can be parallel with 3.1)

### Objective
Create a mobile-optimized version of VendorForm with identical functionality but mobile-first styling.

### Source Reference
Copy logic from: `apps/web/src/components/forms/VendorForm.vue`

### Key Features to Preserve
1. **Vendor Type Toggle**: PHYSICAL_PERSON / COMPANY switch
2. **ARES Lookup**: ICO lookup with AresStatus component
3. **ICO Checksum Validation**: Modulo 11 algorithm
4. **RC Validation**: Birth number format (6 digits / 3-4 digits)
5. **Registered Bank Accounts**: Radio selection from ARES data
6. **Conditional Fields**: Different fields for person vs company

### Implementation Structure

```vue
<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <!-- Vendor Type Toggle -->
    <div class="flex bg-gray-100 rounded-xl p-1">
      <button
        type="button"
        @click="form.vendor_type = 'PHYSICAL_PERSON'"
        :class="[
          'flex-1 py-3 text-base font-medium rounded-lg transition-colors',
          form.vendor_type === 'PHYSICAL_PERSON'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500'
        ]"
      >
        Fyzická osoba
      </button>
      <button
        type="button"
        @click="form.vendor_type = 'COMPANY'"
        :class="[
          'flex-1 py-3 text-base font-medium rounded-lg transition-colors',
          form.vendor_type === 'COMPANY'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500'
        ]"
      >
        Právnická osoba
      </button>
    </div>

    <!-- Physical Person Fields -->
    <template v-if="form.vendor_type === 'PHYSICAL_PERSON'">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Jméno <span class="text-red-500">*</span>
        </label>
        <input v-model="form.jmeno" type="text" class="mobile-input" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Příjmení <span class="text-red-500">*</span>
        </label>
        <input v-model="form.prijmeni" type="text" class="mobile-input" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Rodné číslo <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.rodne_cislo"
          type="text"
          class="mobile-input font-mono"
          placeholder="123456/1234"
        />
        <p v-if="errors.rodne_cislo" class="mt-1 text-sm text-red-500">
          {{ errors.rodne_cislo }}
        </p>
      </div>
    </template>

    <!-- Company Fields -->
    <template v-else>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          IČO <span class="text-red-500">*</span>
        </label>
        <div class="flex gap-2">
          <input
            v-model="form.ico"
            type="text"
            class="mobile-input font-mono flex-1"
            placeholder="12345678"
            maxlength="8"
          />
          <button
            type="button"
            @click="lookupAres"
            :disabled="aresLoading || !form.ico"
            class="px-4 py-3 bg-blue-500 text-white rounded-xl disabled:opacity-50"
          >
            Ověřit
          </button>
        </div>
        <AresStatus :status="aresStatus" class="mt-2" />
        <p v-if="errors.ico" class="mt-1 text-sm text-red-500">
          {{ errors.ico }}
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Název firmy <span class="text-red-500">*</span>
        </label>
        <input v-model="form.nazev_firmy" type="text" class="mobile-input" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          DIČ
        </label>
        <input
          v-model="form.dic"
          type="text"
          class="mobile-input font-mono"
          placeholder="CZ12345678"
        />
      </div>
    </template>

    <!-- Address Section (both types) -->
    <div class="pt-4 border-t border-gray-200">
      <h3 class="text-base font-medium text-gray-900 mb-4">Adresa</h3>

      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Ulice a číslo <span class="text-red-500">*</span>
          </label>
          <input v-model="form.ulice" type="text" class="mobile-input" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Město <span class="text-red-500">*</span>
          </label>
          <input v-model="form.mesto" type="text" class="mobile-input" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            PSČ <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.psc"
            type="text"
            class="mobile-input"
            placeholder="110 00"
            maxlength="6"
          />
        </div>
      </div>
    </div>

    <!-- Contact Section -->
    <div class="pt-4 border-t border-gray-200">
      <h3 class="text-base font-medium text-gray-900 mb-4">Kontakt</h3>

      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Telefon
          </label>
          <input
            v-model="form.telefon"
            type="tel"
            class="mobile-input"
            placeholder="+420 123 456 789"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            v-model="form.email"
            type="email"
            class="mobile-input"
            placeholder="email@example.com"
          />
        </div>
      </div>
    </div>

    <!-- Bank Account Section -->
    <div class="pt-4 border-t border-gray-200">
      <h3 class="text-base font-medium text-gray-900 mb-4">Bankovní účet</h3>

      <!-- Registered accounts from ARES -->
      <div v-if="registeredAccounts.length > 0" class="space-y-3 mb-4">
        <label
          v-for="account in registeredAccounts"
          :key="account"
          class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer"
          :class="form.cislo_uctu === account ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
        >
          <input
            type="radio"
            v-model="form.cislo_uctu"
            :value="account"
            class="w-5 h-5 text-blue-500"
          />
          <span class="font-mono">{{ account }}</span>
        </label>
      </div>

      <!-- Manual entry -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ registeredAccounts.length > 0 ? 'Nebo zadat ručně:' : 'Číslo účtu' }}
        </label>
        <input
          v-model="form.cislo_uctu"
          type="text"
          class="mobile-input font-mono"
          placeholder="123456789/0100"
        />
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="pt-4 flex gap-3">
      <button
        type="button"
        @click="$emit('back')"
        class="flex-1 h-12 text-base border border-gray-300 rounded-xl text-gray-700"
      >
        Zpět
      </button>
      <LoadingButton
        type="submit"
        :loading="saving"
        class="flex-1 h-12 text-base"
      >
        Uložit a pokračovat
      </LoadingButton>
    </div>
  </form>
</template>

<script setup lang="ts">
// Copy all logic from VendorForm.vue
// Keep all validation, ARES lookup, and event handling identical
</script>

<style scoped>
.mobile-input {
  @apply w-full py-3 px-4 text-base border border-gray-300 rounded-xl;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  @apply disabled:bg-gray-100 disabled:text-gray-500;
  font-size: 16px;
}

input, select, button {
  min-height: 44px;
}
</style>
```

### Props (identical to VendorForm)
| Prop | Type | Description |
|------|------|-------------|
| `buyingOpportunityId` | `string` | ID of the buying opportunity |
| `existingVendor` | `Vendor \| null` | Existing vendor data to edit |

### Events (identical to VendorForm)
| Event | Payload | Description |
|-------|---------|-------------|
| `saved` | `Vendor` | Emitted after successful save |
| `next` | - | Emitted when proceeding forward |
| `back` | - | Emitted when going back |

### Validation to Preserve
| Field | Validation |
|-------|------------|
| ICO | Required for COMPANY, 8 digits, modulo 11 checksum |
| RC | Required for PHYSICAL_PERSON, format `XXXXXX/XXX(X)` |
| Jméno/Příjmení | Required for PHYSICAL_PERSON |
| Název firmy | Required for COMPANY |
| Ulice, Město, PSČ | Required |

### ARES Integration
- Must use existing `useAres` composable
- Display `AresStatus` component for lookup feedback
- Populate form fields from ARES response
- Show registered bank accounts as radio options

### Acceptance Criteria
- [ ] Vendor type toggle works correctly
- [ ] Different fields show for person vs company
- [ ] ARES lookup works and populates fields
- [ ] ICO checksum validation works
- [ ] RC format validation works
- [ ] Registered bank accounts show as radio options
- [ ] All validation works identically to VendorForm
- [ ] Emits `saved`, `next`, `back` events correctly
- [ ] Mobile styling applied (single column, larger inputs)
- [ ] All touch targets are at least 44px

---

## Phase Completion Checklist

- [ ] Task 3.1 (MobileVehicleForm) completed
- [ ] Task 3.2 (MobileVendorForm) completed
- [ ] Both forms pass all validation tests
- [ ] Events work identically to original forms

## Parallel Execution Note
Tasks 3.1 and 3.2 have no dependencies on each other and can be executed in parallel.

## Next Phase
Once mobile forms are complete, proceed to [Phase 4: Integration](./phase-4-integration.md)
