# Phase 2: Preview Content Components

> **Phase Goal**: Create the content that displays inside the phone mockup
> **Tasks**: 3
> **Dependencies**: Phase 1 (PhoneMockup component)
> **Estimated Complexity**: Medium

---

## Task 2.1: Create MobilePreviewScreen.vue Container {#task-21}

**Complexity**: Medium
**Dependencies**: Task 1.2 (PhoneMockup)
**File**: `apps/web/src/components/preview/MobilePreviewScreen.vue`
**Assignable**: Yes (after Phase 1)

### Objective
Create the main screen container that displays inside the phone mockup, including app header, content area, and bottom navigation.

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `vehicle` | `Vehicle \| null` | `null` | Current vehicle data |
| `vendor` | `Vendor \| null` | `null` | Current vendor data |
| `currentStep` | `number` | `0` | Current wizard step |

### Implementation Structure

```vue
<template>
  <div class="flex flex-col h-full bg-gray-50 font-ios">
    <!-- App Header -->
    <header class="flex items-center h-12 px-4 bg-white border-b border-gray-200">
      <button class="p-2 -ml-2">
        <ChevronLeftIcon class="w-5 h-5 text-blue-500" />
      </button>
      <h1 class="flex-1 text-center font-semibold">
        {{ stepTitle }}
      </h1>
      <div class="w-9" /> <!-- Spacer for centering -->
    </header>

    <!-- Scrollable Content -->
    <main class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Vehicle Card (steps 0-3) -->
      <PreviewVehicleCard
        v-if="vehicle || currentStep === 0"
        :vehicle="vehicle"
      />

      <!-- Vendor Card (steps 1-3) -->
      <PreviewVendorCard
        v-if="vendor || currentStep >= 1"
        :vendor="vendor"
      />
    </main>

    <!-- Bottom Navigation -->
    <nav class="flex items-center justify-around h-16 bg-white border-t border-gray-200">
      <button v-for="item in navItems" :key="item.label" class="flex flex-col items-center gap-1 text-gray-400">
        <component :is="item.icon" class="w-6 h-6" />
        <span class="text-[10px]">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Vehicle, Vendor } from '@/types'
import PreviewVehicleCard from './PreviewVehicleCard.vue'
import PreviewVendorCard from './PreviewVendorCard.vue'

interface Props {
  vehicle?: Vehicle | null
  vendor?: Vendor | null
  currentStep?: number
}

const props = withDefaults(defineProps<Props>(), {
  vehicle: null,
  vendor: null,
  currentStep: 0
})

const stepTitles = ['Vozidlo', 'Dodavatel', 'Dokumenty', 'Validace']

const stepTitle = computed(() => stepTitles[props.currentStep] || 'Detail')

const navItems = [
  { label: 'Domů', icon: 'HomeIcon' },
  { label: 'Hledat', icon: 'SearchIcon' },
  { label: 'Přidat', icon: 'PlusCircleIcon' },
  { label: 'Profil', icon: 'UserIcon' }
]
</script>

<style scoped>
.font-ios {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
```

### Visual Layout
```
┌─────────────────────────┐
│  ←   Vozidlo            │  ← App Header (h-12)
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │ PreviewVehicleCard│  │  ← Scrollable Content
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ PreviewVendorCard │  │
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│ 🏠  🔍  ➕  👤         │  ← Bottom Nav (h-16)
└─────────────────────────┘
```

### Content Logic
| Step | Shows |
|------|-------|
| 0 (Vehicle) | PreviewVehicleCard only |
| 1 (Vendor) | PreviewVehicleCard + PreviewVendorCard |
| 2 (Documents) | Both cards |
| 3 (Validation) | Both cards |

### Acceptance Criteria
- [ ] Header shows correct title based on step
- [ ] Back button styled correctly
- [ ] Content area is scrollable
- [ ] Vehicle card shows when appropriate
- [ ] Vendor card shows when appropriate
- [ ] Bottom nav looks iOS-native
- [ ] Uses iOS font family

---

## Task 2.2: Create PreviewVehicleCard.vue Component {#task-22}

**Complexity**: Medium
**Dependencies**: Task 2.1
**File**: `apps/web/src/components/preview/PreviewVehicleCard.vue`
**Assignable**: Yes (after 2.1)

### Objective
Display vehicle data in an app-like card format with license plate, VIN, and specs.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `vehicle` | `Vehicle \| null` | Vehicle data to display |

### Implementation Structure

```vue
<template>
  <div class="bg-white rounded-2xl p-4 shadow-sm">
    <template v-if="vehicle">
      <!-- License Plate (SPZ) -->
      <div class="flex items-center gap-3 mb-4">
        <div class="license-plate flex items-center bg-white border-2 border-blue-600 rounded px-3 py-1.5">
          <!-- EU Stripe -->
          <div class="w-6 h-8 bg-blue-600 rounded-l -ml-3 mr-2 flex items-center justify-center">
            <span class="text-white text-[8px] font-bold">CZ</span>
          </div>
          <span class="font-mono text-xl font-bold tracking-wider">
            {{ vehicle.spz || '---' }}
          </span>
        </div>
      </div>

      <!-- VIN -->
      <div class="text-xs text-gray-500 font-mono mb-3">
        VIN: {{ vehicle.vin || '---' }}
      </div>

      <!-- Make & Model -->
      <h3 class="text-lg font-semibold text-gray-900 mb-1">
        {{ vehicle.znacka || '---' }} {{ vehicle.model || '' }}
      </h3>

      <!-- Owner -->
      <p class="text-sm text-gray-600 mb-4">
        {{ vehicle.majitel || 'Majitel nezadán' }}
      </p>

      <!-- Specs Grid -->
      <div class="grid grid-cols-2 gap-3">
        <SpecItem label="Rok výroby" :value="vehicle.rok_vyroby?.toString()" />
        <SpecItem label="Tachometr" :value="formatKm(vehicle.tachometer_km)" suffix="km" />
        <SpecItem label="Motor" :value="vehicle.motor" />
        <SpecItem label="Výkon" :value="vehicle.vykon_kw?.toString()" suffix="kW" />
      </div>
    </template>

    <!-- Empty State -->
    <template v-else>
      <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
        <CarIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-400 text-sm">Zadejte údaje vozidla</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Vehicle } from '@/types'

interface Props {
  vehicle: Vehicle | null
}

defineProps<Props>()

const formatKm = (km?: number) => {
  if (!km) return null
  return km.toLocaleString('cs-CZ')
}
</script>
```

### SpecItem Sub-component
Create inline or as separate component:

```vue
<template>
  <div class="bg-gray-50 rounded-lg p-2">
    <div class="text-[10px] text-gray-500 uppercase tracking-wide">{{ label }}</div>
    <div class="text-sm font-medium text-gray-900">
      {{ value || '—' }}{{ value && suffix ? ` ${suffix}` : '' }}
    </div>
  </div>
</template>
```

### Visual Design
```
┌─────────────────────────────────┐
│  ┌────────────────────┐         │
│  │ CZ │ 1AB 2345      │         │  ← License Plate
│  └────────────────────┘         │
│  VIN: WVWZZZ3CZWE123456         │  ← VIN monospace
│                                  │
│  Škoda Octavia                   │  ← Make + Model
│  Jan Novák                       │  ← Owner
│                                  │
│  ┌────────┐  ┌────────┐         │
│  │Rok     │  │Tachometr│        │  ← Specs Grid
│  │2020    │  │125,000km│        │
│  └────────┘  └────────┘         │
│  ┌────────┐  ┌────────┐         │
│  │Motor   │  │Výkon   │         │
│  │Benzín  │  │110 kW  │         │
│  └────────┘  └────────┘         │
└─────────────────────────────────┘
```

### Acceptance Criteria
- [ ] SPZ displays in EU license plate style with blue stripe
- [ ] VIN shows in monospace font
- [ ] Make/Model displays as title
- [ ] Owner name shows below title
- [ ] Specs grid shows 4 items with proper formatting
- [ ] Numbers formatted with Czech locale (space as thousands separator)
- [ ] Empty fields show "—" placeholder
- [ ] Full empty state shows when no vehicle data

---

## Task 2.3: Create PreviewVendorCard.vue Component {#task-23}

**Complexity**: Medium
**Dependencies**: Task 2.1
**File**: `apps/web/src/components/preview/PreviewVendorCard.vue`
**Assignable**: Yes (after 2.1, can be parallel with 2.2)

### Objective
Display vendor data in an app-like card format with type indicator, contact info, and bank account.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `vendor` | `Vendor \| null` | Vendor data to display |

### Implementation Structure

```vue
<template>
  <div class="bg-white rounded-2xl p-4 shadow-sm">
    <template v-if="vendor">
      <!-- Vendor Type Badge -->
      <div class="flex items-center gap-2 mb-3">
        <div :class="[
          'w-8 h-8 rounded-full flex items-center justify-center',
          isCompany ? 'bg-blue-100' : 'bg-green-100'
        ]">
          <BuildingIcon v-if="isCompany" class="w-4 h-4 text-blue-600" />
          <UserIcon v-else class="w-4 h-4 text-green-600" />
        </div>
        <span class="text-xs text-gray-500">
          {{ isCompany ? 'Právnická osoba' : 'Fyzická osoba' }}
        </span>
      </div>

      <!-- Name -->
      <h3 class="text-lg font-semibold text-gray-900 mb-1">
        {{ vendorName }}
      </h3>

      <!-- Identifier (ICO or RC) -->
      <p class="text-sm text-gray-500 font-mono mb-4">
        {{ identifierLabel }}: {{ maskedIdentifier }}
      </p>

      <!-- Address -->
      <div v-if="hasAddress" class="flex items-start gap-2 mb-3">
        <MapPinIcon class="w-4 h-4 text-gray-400 mt-0.5" />
        <div class="text-sm text-gray-600">
          <div>{{ vendor.ulice }}</div>
          <div>{{ vendor.psc }} {{ vendor.mesto }}</div>
        </div>
      </div>

      <!-- Contact Info -->
      <div class="space-y-2">
        <div v-if="vendor.telefon" class="flex items-center gap-2">
          <PhoneIcon class="w-4 h-4 text-gray-400" />
          <span class="text-sm text-gray-600">{{ vendor.telefon }}</span>
        </div>
        <div v-if="vendor.email" class="flex items-center gap-2">
          <MailIcon class="w-4 h-4 text-gray-400" />
          <span class="text-sm text-gray-600">{{ vendor.email }}</span>
        </div>
      </div>

      <!-- Bank Account (masked) -->
      <div v-if="vendor.cislo_uctu" class="mt-4 pt-4 border-t border-gray-100">
        <div class="flex items-center gap-2">
          <CreditCardIcon class="w-4 h-4 text-gray-400" />
          <span class="text-sm text-gray-600 font-mono">
            {{ maskedBankAccount }}
          </span>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <template v-else>
      <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
        <UserIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-400 text-sm">Zadejte údaje dodavatele</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Vendor } from '@/types'

interface Props {
  vendor: Vendor | null
}

const props = defineProps<Props>()

const isCompany = computed(() => props.vendor?.vendor_type === 'COMPANY')

const vendorName = computed(() => {
  if (!props.vendor) return ''
  if (isCompany.value) {
    return props.vendor.nazev_firmy || 'Název firmy nezadán'
  }
  return `${props.vendor.jmeno || ''} ${props.vendor.prijmeni || ''}`.trim() || 'Jméno nezadáno'
})

const identifierLabel = computed(() => isCompany.value ? 'IČO' : 'RČ')

const maskedIdentifier = computed(() => {
  if (!props.vendor) return '---'
  if (isCompany.value) {
    return props.vendor.ico || '---'
  }
  // Mask RC: show only last 4 digits
  const rc = props.vendor.rodne_cislo || ''
  if (rc.length < 4) return '---'
  return '••••••' + rc.slice(-4)
})

const hasAddress = computed(() =>
  props.vendor?.ulice || props.vendor?.mesto
)

const maskedBankAccount = computed(() => {
  const account = props.vendor?.cislo_uctu || ''
  if (account.length < 4) return '---'
  return '••••••' + account.slice(-4)
})
</script>
```

### Visual Design
```
┌─────────────────────────────────┐
│  🏢  Právnická osoba            │  ← Type badge
│                                  │
│  ACME s.r.o.                     │  ← Name
│  IČO: 12345678                   │  ← Identifier
│                                  │
│  📍 Hlavní 123                   │  ← Address
│     110 00 Praha 1               │
│                                  │
│  📞 +420 123 456 789             │  ← Phone
│  ✉️  info@acme.cz                │  ← Email
│                                  │
│  ───────────────────────         │
│  💳 ••••••3456                   │  ← Masked bank account
└─────────────────────────────────┘
```

### Privacy Requirements
| Field | Masking Rule |
|-------|-------------|
| `rodne_cislo` | Show only last 4 digits: `••••••1234` |
| `cislo_uctu` | Show only last 4 digits: `••••••3456` |
| `ico` | Show full (public data) |

### Acceptance Criteria
- [ ] Correct icon shows based on vendor_type (person vs building)
- [ ] Type label shows "Fyzická osoba" or "Právnická osoba"
- [ ] Name displays correctly for both types
- [ ] ICO shows full, RC shows masked (last 4 only)
- [ ] Address displays with map pin icon
- [ ] Contact info shows with appropriate icons
- [ ] Bank account is masked for privacy
- [ ] Empty state shows when no vendor data

---

## Phase Completion Checklist

- [ ] Task 2.1 (MobilePreviewScreen) completed
- [ ] Task 2.2 (PreviewVehicleCard) completed
- [ ] Task 2.3 (PreviewVendorCard) completed

## Parallel Execution Note
Tasks 2.2 and 2.3 can be executed in parallel after 2.1 is complete.

## Next Phase
Once preview components are complete, proceed to [Phase 3: Mobile Forms](./phase-3-mobile-forms.md)
