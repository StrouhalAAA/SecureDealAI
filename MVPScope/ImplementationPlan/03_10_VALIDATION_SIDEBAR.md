# Task 3.10: Validation Sidebar Component

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: Medium
> **Depends On**: 3.1 Vue.js Setup, 2.9 Validation Preview
> **Estimated Effort**: Medium

---

## Objective

Create a persistent sidebar component that displays real-time validation status during data entry. The sidebar shows document upload progress, vehicle validation status, and vendor validation status, updating as the user enters data without requiring a full validation run.

---

## Key Differences from ValidationResult (Task 3.8)

| Aspect | ValidationResult (3.8) | ValidationSidebar (3.10) |
|--------|----------------------|--------------------------|
| Location | Step 4 (full page) | Persistent sidebar (all steps) |
| Timing | After documents uploaded | Real-time during entry |
| Data Source | `validation_results` table | Live API preview endpoint |
| Purpose | Final result display | Progress tracking & guidance |
| Updates | Static (per validation run) | Dynamic (debounced on input) |

---

## UI Specification

### Desktop Layout (with sidebar)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  SecureDealAI          SPZ: 5L94454                      [<- Dashboard] │
├────────────────────────────────────────────────────────┬────────────────┤
│                                                        │                │
│  Progress: [●]──[●]──[○]──[○]                          │  VALIDACE      │
│            Vozidlo Dodavatel Dokumenty Validace        │                │
│                                                        │  ┌────────────┐│
│  ┌──────────────────────────────────────────────────┐  │  │ Dokumenty  ││
│  │                                                  │  │  │            ││
│  │        [Current Step Form Content]               │  │  │ ORV [====] ││
│  │                                                  │  │  │ OP  [==  ] ││
│  │                                                  │  │  │ VTP [    ] ││
│  │                                                  │  │  └────────────┘│
│  │                                                  │  │                │
│  │                                                  │  │  ┌────────────┐│
│  │                                                  │  │  │ Vozidlo    ││
│  │                                                  │  │  │   🟢 4/7   ││
│  │                                                  │  │  │            ││
│  │                                                  │  │  │ VIN    [✓] ││
│  │                                                  │  │  │ SPZ    [✓] ││
│  │                                                  │  │  │ Make   [✓] ││
│  │                                                  │  │  │ Model  [~] ││
│  │                                                  │  │  │ Date   [-] ││
│  └──────────────────────────────────────────────────┘  │  └────────────┘│
│                                                        │                │
│                      [Zpět] [Pokračovat]               │  ┌────────────┐│
│                                                        │  │ Dodavatel  ││
│                                                        │  │   ⚪ 0/6   ││
│                                                        │  │            ││
│                                                        │  │ (čeká na   ││
│                                                        │  │  zadání)   ││
│                                                        │  └────────────┘│
└────────────────────────────────────────────────────────┴────────────────┘
```

### Mobile Layout (collapsed)
```
┌────────────────────────────────────────┐
│  SecureDealAI     SPZ: 5L94454    [<-] │
├────────────────────────────────────────┤
│  [●]──[●]──[○]──[○]                    │
│                                        │
│  ┌────────────────────────────────────┐│
│  │      [Current Step Form]           ││
│  └────────────────────────────────────┘│
│                                        │
│  ┌────────────────────────────────────┐│
│  │ Validace: 🟢 Vozidlo | ⚪ Dodavatel ││
│  │           [Zobrazit detail]        ││
│  └────────────────────────────────────┘│
│                                        │
│            [Zpět] [Pokračovat]         │
└────────────────────────────────────────┘
```

---

## Component Structure

### File Structure
```
src/components/validation/
├── ValidationSidebar.vue       # Main sidebar container
├── DocumentProgress.vue        # Document upload progress section
├── CategoryStatus.vue          # Vehicle/Vendor validation section
├── FieldStatusList.vue         # List of field validations
└── ValidationMiniBar.vue       # Mobile collapsed view
```

---

## Implementation

### ValidationSidebar.vue
```vue
<template>
  <aside
    class="validation-sidebar bg-gray-50 border-l border-gray-200"
    :class="{ 'hidden lg:block': !expanded, 'fixed inset-0 z-50 lg:relative': expanded }"
  >
    <!-- Header -->
    <div class="p-4 border-b bg-white">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Validace</h2>
        <button
          @click="expanded = false"
          class="lg:hidden p-1 text-gray-500 hover:text-gray-700"
        >
          <XIcon class="h-5 w-5" />
        </button>
      </div>
      <div class="mt-2 flex items-center gap-2">
        <span
          :class="overallStatusClass"
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        >
          {{ overallStatusIcon }} {{ overallStatusLabel }}
        </span>
        <span v-if="loading" class="text-xs text-gray-500">
          Aktualizace...
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-4 overflow-y-auto" style="max-height: calc(100vh - 200px)">
      <!-- Document Progress -->
      <DocumentProgress
        :documents="preview?.categories?.documents"
        :vendor-type="vendorType"
      />

      <!-- Vehicle Validation -->
      <CategoryStatus
        title="Vozidlo"
        icon="car"
        :category="preview?.categories?.vehicle"
        :expanded="expandedCategories.vehicle"
        @toggle="expandedCategories.vehicle = !expandedCategories.vehicle"
      />

      <!-- Vendor Validation -->
      <CategoryStatus
        title="Dodavatel"
        :icon="vendorType === 'FO' ? 'user' : 'building'"
        :category="preview?.categories?.vendor"
        :expanded="expandedCategories.vendor"
        @toggle="expandedCategories.vendor = !expandedCategories.vendor"
      />

      <!-- ARES Status (if company) -->
      <div v-if="vendorType === 'PO' && preview?.categories?.ares" class="bg-white rounded-lg p-4 border">
        <h3 class="text-sm font-medium text-gray-700 mb-2">ARES</h3>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Firma nalezena</span>
            <span :class="preview.categories.ares.company_found ? 'text-green-600' : 'text-red-600'">
              {{ preview.categories.ares.company_found ? 'Ano' : 'Ne' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Aktivni</span>
            <span :class="preview.categories.ares.company_active ? 'text-green-600' : 'text-orange-600'">
              {{ preview.categories.ares.company_active ? 'Ano' : 'Ne' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Platce DPH</span>
            <span class="text-gray-900">
              {{ preview.categories.ares.vat_payer ? 'Ano' : 'Ne' }}
            </span>
          </div>
          <div v-if="preview.categories.ares.unreliable_vat_payer" class="flex justify-between">
            <span class="text-gray-600">Nespolehlivy platce</span>
            <span class="text-red-600 font-medium">ANO</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Summary -->
    <div class="p-4 border-t bg-white">
      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div class="text-lg font-bold text-green-600">{{ summary.passed }}</div>
          <div class="text-gray-500">Prošlo</div>
        </div>
        <div>
          <div class="text-lg font-bold text-orange-600">{{ summary.warnings }}</div>
          <div class="text-gray-500">Varování</div>
        </div>
        <div>
          <div class="text-lg font-bold text-red-600">{{ summary.failed }}</div>
          <div class="text-gray-500">Selhalo</div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { XIcon } from '@heroicons/vue/outline';
import DocumentProgress from './DocumentProgress.vue';
import CategoryStatus from './CategoryStatus.vue';
import type { ValidationPreviewResponse } from '@/types';

const props = defineProps<{
  buyingOpportunityId: string;
  vehicleData?: Record<string, any>;
  vendorData?: Record<string, any>;
  vendorType?: 'FO' | 'PO';
}>();

const emit = defineEmits(['statusChange']);

const preview = ref<ValidationPreviewResponse | null>(null);
const loading = ref(false);
const expanded = ref(false);
const expandedCategories = ref({
  vehicle: true,
  vendor: true,
});

// Computed properties
const summary = computed(() => preview.value?.summary ?? {
  passed: 0,
  warnings: 0,
  failed: 0,
});

const overallStatusConfig = computed(() => {
  const status = preview.value?.preview_status;
  const configs = {
    GREEN: { icon: '🟢', label: 'Vše OK', class: 'bg-green-100 text-green-800' },
    ORANGE: { icon: '🟠', label: 'Vyžaduje pozornost', class: 'bg-orange-100 text-orange-800' },
    RED: { icon: '🔴', label: 'Kritické problémy', class: 'bg-red-100 text-red-800' },
    INCOMPLETE: { icon: '⚪', label: 'Nekompletní', class: 'bg-gray-100 text-gray-800' },
  };
  return configs[status || 'INCOMPLETE'];
});

const overallStatusIcon = computed(() => overallStatusConfig.value.icon);
const overallStatusLabel = computed(() => overallStatusConfig.value.label);
const overallStatusClass = computed(() => overallStatusConfig.value.class);

// Fetch preview data
async function fetchPreview() {
  if (!props.buyingOpportunityId) return;

  loading.value = true;
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validation-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          buying_opportunity_id: props.buyingOpportunityId,
          vehicle_data: props.vehicleData,
          vendor_data: props.vendorData,
        }),
      }
    );

    if (response.ok) {
      preview.value = await response.json();
      emit('statusChange', preview.value.preview_status);
    }
  } catch (error) {
    console.error('Validation preview error:', error);
  } finally {
    loading.value = false;
  }
}

// Debounced fetch for real-time updates
const debouncedFetch = useDebounceFn(fetchPreview, 500);

// Watch for data changes
watch(
  () => [props.vehicleData, props.vendorData],
  () => {
    debouncedFetch();
  },
  { deep: true }
);

// Initial fetch
onMounted(() => {
  fetchPreview();
});

// Expose method for manual refresh
defineExpose({
  refresh: fetchPreview,
  expand: () => { expanded.value = true; },
});
</script>

<style scoped>
.validation-sidebar {
  width: 280px;
  min-width: 280px;
}

@media (max-width: 1024px) {
  .validation-sidebar {
    width: 100%;
  }
}
</style>
```

---

### DocumentProgress.vue
```vue
<template>
  <div class="bg-white rounded-lg p-4 border">
    <h3 class="text-sm font-medium text-gray-700 mb-3">Dokumenty</h3>
    <div class="space-y-3">
      <!-- ORV -->
      <DocumentItem
        label="ORV"
        :status="documents?.orv"
        required
      />
      <!-- OP (required for FO) -->
      <DocumentItem
        label="OP"
        :status="documents?.op"
        :required="vendorType === 'FO'"
        :hint="vendorType === 'PO' ? 'Volitelne pro PO' : ''"
      />
      <!-- VTP (optional) -->
      <DocumentItem
        label="VTP"
        :status="documents?.vtp"
        hint="Volitelne (ICO pro ARES)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DocumentItem from './DocumentItem.vue';
import type { DocumentProgress } from '@/types';

defineProps<{
  documents?: DocumentProgress;
  vendorType?: 'FO' | 'PO';
}>();
</script>
```

---

### DocumentItem.vue
```vue
<template>
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700">{{ label }}</span>
      <span v-if="required" class="text-red-500 text-xs">*</span>
      <span v-if="hint" class="text-xs text-gray-400">({{ hint }})</span>
    </div>
    <div class="flex items-center gap-1">
      <!-- Status icon -->
      <span v-if="status?.ocr_processed" class="text-green-600">
        <CheckCircleIcon class="h-5 w-5" />
      </span>
      <span v-else-if="status?.uploaded" class="text-yellow-600">
        <ClockIcon class="h-5 w-5" />
      </span>
      <span v-else class="text-gray-300">
        <MinusCircleIcon class="h-5 w-5" />
      </span>
      <!-- Fields count -->
      <span v-if="status?.ocr_fields_extracted" class="text-xs text-gray-500">
        {{ status.ocr_fields_extracted }} poli
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, ClockIcon, MinusCircleIcon } from '@heroicons/vue/solid';
import type { DocumentStatus } from '@/types';

defineProps<{
  label: string;
  status?: DocumentStatus;
  required?: boolean;
  hint?: string;
}>();
</script>
```

---

### CategoryStatus.vue
```vue
<template>
  <div class="bg-white rounded-lg border overflow-hidden">
    <!-- Header (clickable) -->
    <button
      @click="$emit('toggle')"
      class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <div class="flex items-center gap-2">
        <component :is="iconComponent" class="h-5 w-5 text-gray-500" />
        <span class="font-medium text-gray-700">{{ title }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="statusBadgeClass" class="px-2 py-0.5 rounded-full text-xs font-medium">
          {{ statusIcon }} {{ passedCount }}/{{ totalCount }}
        </span>
        <ChevronDownIcon
          class="h-4 w-4 text-gray-400 transition-transform"
          :class="{ 'rotate-180': expanded }"
        />
      </div>
    </button>

    <!-- Expanded content -->
    <div v-if="expanded && category" class="px-4 pb-3 border-t">
      <div class="space-y-1 pt-2">
        <div
          v-for="issue in category.issues"
          :key="issue.field"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-gray-600">{{ formatFieldName(issue.field) }}</span>
          <FieldStatusBadge :status="issue.status" :similarity="issue.similarity" />
        </div>
        <div v-if="category.fields_missing > 0" class="text-xs text-gray-400 pt-2">
          {{ category.fields_missing }} poli ceka na data
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  TruckIcon,
  UserIcon,
  OfficeBuildingIcon,
  ChevronDownIcon,
} from '@heroicons/vue/outline';
import FieldStatusBadge from './FieldStatusBadge.vue';
import type { CategoryResult } from '@/types';

const props = defineProps<{
  title: string;
  icon: 'car' | 'user' | 'building';
  category?: CategoryResult;
  expanded: boolean;
}>();

defineEmits(['toggle']);

const iconComponent = computed(() => {
  const icons = {
    car: TruckIcon,
    user: UserIcon,
    building: OfficeBuildingIcon,
  };
  return icons[props.icon] || TruckIcon;
});

const totalCount = computed(() => props.category?.fields_checked ?? 0);
const passedCount = computed(() => props.category?.fields_passed ?? 0);

const statusIcon = computed(() => {
  if (!props.category) return '⚪';
  const status = props.category.status;
  const icons = { GREEN: '🟢', ORANGE: '🟠', RED: '🔴', INCOMPLETE: '⚪' };
  return icons[status] || '⚪';
});

const statusBadgeClass = computed(() => {
  if (!props.category) return 'bg-gray-100 text-gray-600';
  const status = props.category.status;
  const classes = {
    GREEN: 'bg-green-100 text-green-700',
    ORANGE: 'bg-orange-100 text-orange-700',
    RED: 'bg-red-100 text-red-700',
    INCOMPLETE: 'bg-gray-100 text-gray-600',
  };
  return classes[status] || 'bg-gray-100 text-gray-600';
});

function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    vin: 'VIN',
    spz: 'SPZ',
    make: 'Znacka',
    model: 'Model',
    first_registration_date: '1. registrace',
    engine_power: 'Vykon motoru',
    owner_name: 'Majitel',
    name: 'Jmeno',
    personal_id: 'Rodne cislo',
    company_id: 'ICO',
    company_name: 'Nazev firmy',
    address_street: 'Ulice',
    address_city: 'Mesto',
    address_postal_code: 'PSC',
  };
  return names[field] || field;
}
</script>
```

---

### ValidationMiniBar.vue (Mobile)
```vue
<template>
  <div
    @click="$emit('expand')"
    class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 cursor-pointer"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium">Validace:</span>
        <span :class="vehicleStatusClass" class="px-2 py-0.5 rounded text-xs">
          {{ vehicleStatusIcon }} Vozidlo
        </span>
        <span :class="vendorStatusClass" class="px-2 py-0.5 rounded text-xs">
          {{ vendorStatusIcon }} Dodavatel
        </span>
      </div>
      <ChevronUpIcon class="h-5 w-5 text-gray-400" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronUpIcon } from '@heroicons/vue/outline';
import type { ValidationPreviewResponse } from '@/types';

const props = defineProps<{
  preview?: ValidationPreviewResponse;
}>();

defineEmits(['expand']);

function getStatusConfig(status?: string) {
  const configs = {
    GREEN: { icon: '🟢', class: 'bg-green-100 text-green-700' },
    ORANGE: { icon: '🟠', class: 'bg-orange-100 text-orange-700' },
    RED: { icon: '🔴', class: 'bg-red-100 text-red-700' },
    INCOMPLETE: { icon: '⚪', class: 'bg-gray-100 text-gray-600' },
  };
  return configs[status || 'INCOMPLETE'];
}

const vehicleConfig = computed(() => getStatusConfig(props.preview?.categories?.vehicle?.status));
const vendorConfig = computed(() => getStatusConfig(props.preview?.categories?.vendor?.status));

const vehicleStatusIcon = computed(() => vehicleConfig.value.icon);
const vehicleStatusClass = computed(() => vehicleConfig.value.class);
const vendorStatusIcon = computed(() => vendorConfig.value.icon);
const vendorStatusClass = computed(() => vendorConfig.value.class);
</script>
```

---

## Integration with Detail Page

Update `Detail.vue` (Task 3.9) to include the sidebar:

```vue
<template>
  <div class="flex min-h-screen">
    <!-- Main content area -->
    <main class="flex-1 p-6">
      <!-- Progress indicator -->
      <StepIndicator :current-step="currentStep" :steps="steps" />

      <!-- Step content -->
      <div class="mt-6">
        <VehicleForm
          v-if="currentStep === 1"
          v-model="vehicleData"
          @submit="handleVehicleSubmit"
        />
        <VendorForm
          v-if="currentStep === 2"
          v-model="vendorData"
          @submit="handleVendorSubmit"
        />
        <DocumentUpload
          v-if="currentStep === 3"
          :buying-opportunity-id="opportunityId"
          @complete="handleDocumentsComplete"
        />
        <ValidationResult
          v-if="currentStep === 4"
          :result="validationResult"
        />
      </div>
    </main>

    <!-- Validation Sidebar (desktop) -->
    <ValidationSidebar
      ref="sidebarRef"
      :buying-opportunity-id="opportunityId"
      :vehicle-data="vehicleData"
      :vendor-data="vendorData"
      :vendor-type="vendorData?.vendor_type"
      @status-change="handleStatusChange"
    />

    <!-- Validation MiniBar (mobile) -->
    <ValidationMiniBar
      :preview="sidebarRef?.preview"
      @expand="sidebarRef?.expand()"
    />
  </div>
</template>
```

---

## State Flow

```
User Input (Vehicle/Vendor Form)
        ↓
    v-model updates
        ↓
    watch() triggers
        ↓
    debounce 500ms
        ↓
    POST /validation-preview
        ↓
    Update sidebar state
        ↓
    Re-render categories
```

---

## Refresh Triggers

The sidebar should refresh in these scenarios:

| Trigger | Debounce | Method |
|---------|----------|--------|
| Vehicle form input | 500ms | Watch + debounce |
| Vendor form input | 500ms | Watch + debounce |
| Document uploaded | Immediate | Event listener |
| OCR processing complete | Immediate | Supabase realtime |
| Manual refresh button | None | User click |
| Step navigation | None | onMounted |

---

## Accessibility

- Keyboard navigation for expand/collapse
- ARIA labels for status indicators
- Screen reader announcements for status changes
- Focus management when sidebar expands

---

## Validation Criteria

- [ ] Sidebar displays on desktop (lg+)
- [ ] Mini bar displays on mobile (< lg)
- [ ] Document progress shows upload/OCR status
- [ ] Vehicle category shows field statuses
- [ ] Vendor category shows field statuses
- [ ] ARES section shows for company vendors
- [ ] Real-time updates on form input (debounced)
- [ ] Loading state during API calls
- [ ] Expand/collapse categories works
- [ ] Mobile expand works

---

## Completion Checklist

- [x] ValidationSidebar.vue created
- [x] DocumentProgress.vue created
- [x] CategoryStatus.vue created
- [x] ValidationMiniBar.vue created
- [x] Integration with Detail.vue (ready for use)
- [x] Real-time updates working (debounced fetch on data changes)
- [x] Mobile responsive layout
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
