# Phase 4: Detail.vue Integration

> **Phase Goal**: Connect all components in the Detail page
> **Tasks**: 5
> **Dependencies**: Phases 1, 2, 3 (all components created)
> **Estimated Complexity**: Simple to Medium

---

## Task 4.1: Add View Mode State to Detail.vue {#task-41}

**Complexity**: Simple
**Dependencies**: None (can start anytime)
**File**: `apps/web/src/pages/Detail.vue`
**Assignable**: Yes (small isolated change)

### Objective
Add reactive state for view mode with localStorage persistence.

### Implementation

```typescript
// In <script setup>
import { ref, watch, onMounted } from 'vue'

// View mode state
type ViewMode = 'split' | 'full'
const viewMode = ref<ViewMode>('split')

// Persist to localStorage
const STORAGE_KEY = 'securedeal:layoutMode'

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'full' || stored === 'split') {
    viewMode.value = stored
  }
})

watch(viewMode, (newMode) => {
  localStorage.setItem(STORAGE_KEY, newMode)
})

// Toggle function
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'split' ? 'full' : 'split'
}
```

### Acceptance Criteria
- [ ] `viewMode` ref initialized with 'split' default
- [ ] Reads from localStorage on mount
- [ ] Persists to localStorage on change
- [ ] `toggleViewMode` function available
- [ ] Works correctly on page refresh

---

## Task 4.2: Add Layout Toggle Button to Detail.vue Header {#task-42}

**Complexity**: Simple
**Dependencies**: Task 4.1
**File**: `apps/web/src/pages/Detail.vue`
**Assignable**: Yes (small UI addition)

### Objective
Add a toggle button in the page header to switch between split and full view.

### Implementation

Add button near the back link in the header area:

```vue
<template>
  <div class="...header classes...">
    <!-- Back link -->
    <RouterLink to="/" class="...">
      ← Zpět
    </RouterLink>

    <!-- View Mode Toggle (desktop only) -->
    <button
      @click="toggleViewMode"
      class="hidden lg:flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600"
      :title="viewMode === 'split' ? 'Přepnout na plnou šířku' : 'Přepnout na rozdělené zobrazení'"
    >
      <!-- Split mode icon (phone + desktop) -->
      <template v-if="viewMode === 'split'">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="3" width="8" height="18" rx="2" stroke-width="2"/>
          <rect x="14" y="3" width="8" height="18" rx="1" stroke-width="2"/>
        </svg>
        <span class="text-sm">Rozdělené</span>
      </template>

      <!-- Full mode icon (desktop only) -->
      <template v-else>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="2"/>
        </svg>
        <span class="text-sm">Plná šířka</span>
      </template>
    </button>

    <!-- SPZ display -->
    <div class="...">{{ spz }}</div>
  </div>
</template>
```

### Button States
| Mode | Icon | Label |
|------|------|-------|
| `split` | Phone + Desktop rectangles | "Rozdělené" |
| `full` | Single rectangle | "Plná šířka" |

### Visibility
- Hidden on screens < 1024px (`hidden lg:flex`)
- No point showing toggle when preview can't be displayed anyway

### Acceptance Criteria
- [ ] Toggle button visible on desktop (>= 1024px)
- [ ] Hidden on mobile/tablet (< 1024px)
- [ ] Clicking toggles between 'split' and 'full'
- [ ] Correct icon shows for current mode
- [ ] Tooltip explains the toggle function
- [ ] Hover state provides feedback

---

## Task 4.3: Integrate SplitFormLayout in Detail.vue {#task-43}

**Complexity**: Medium
**Dependencies**: Tasks 1.1 (SplitFormLayout), 4.1, 4.2
**File**: `apps/web/src/pages/Detail.vue`
**Assignable**: Yes (requires careful template restructuring)

### Objective
Wrap the step content in SplitFormLayout when in split mode.

### Implementation

```vue
<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header with toggle button (from Task 4.2) -->
    <header>...</header>

    <!-- Step Progress -->
    <StepProgress :steps="steps" :current-step="currentStep" />

    <!-- Content Area -->
    <div class="mt-8">
      <!-- Split View Mode -->
      <SplitFormLayout v-if="viewMode === 'split'">
        <template #left>
          <!-- Form content goes here (Task 4.4 will swap components) -->
          <component
            :is="currentFormComponent"
            v-bind="currentFormProps"
            v-on="currentFormEvents"
          />
        </template>

        <template #right>
          <PhoneMockup>
            <MobilePreviewScreen
              :vehicle="data.vehicle.value"
              :vendor="data.vendor.value"
              :current-step="currentStep"
            />
          </PhoneMockup>
        </template>
      </SplitFormLayout>

      <!-- Full Width Mode -->
      <div v-else class="max-w-2xl mx-auto">
        <component
          :is="currentFormComponent"
          v-bind="currentFormProps"
          v-on="currentFormEvents"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SplitFormLayout from '@/components/layout/SplitFormLayout.vue'
import PhoneMockup from '@/components/preview/PhoneMockup.vue'
import MobilePreviewScreen from '@/components/preview/MobilePreviewScreen.vue'
</script>
```

### Template Structure
```
viewMode === 'split'
├── SplitFormLayout
│   ├── #left: Form component
│   └── #right: PhoneMockup > MobilePreviewScreen
│
viewMode === 'full'
└── max-w-2xl container
    └── Form component
```

### Acceptance Criteria
- [ ] SplitFormLayout imported and used
- [ ] Split layout shows when viewMode is 'split'
- [ ] Full-width layout shows when viewMode is 'full'
- [ ] PhoneMockup contains MobilePreviewScreen
- [ ] Preview receives vehicle/vendor data
- [ ] Preview receives currentStep
- [ ] Layout transition is smooth

---

## Task 4.4: Conditional Form Component Selection {#task-44}

**Complexity**: Medium
**Dependencies**: Tasks 3.1, 3.2 (mobile forms), 4.3
**File**: `apps/web/src/pages/Detail.vue`
**Assignable**: Yes (logic addition)

### Objective
Use mobile form components in split mode, standard forms in full mode.

### Implementation

```typescript
<script setup lang="ts">
import { computed } from 'vue'

// Standard forms
import VehicleForm from '@/components/forms/VehicleForm.vue'
import VendorForm from '@/components/forms/VendorForm.vue'

// Mobile forms
import MobileVehicleForm from '@/components/forms/MobileVehicleForm.vue'
import MobileVendorForm from '@/components/forms/MobileVendorForm.vue'

// Other step components
import DocumentsStep from '@/components/steps/DocumentsStep.vue'
import ValidationStep from '@/components/steps/ValidationStep.vue'

// Computed form component based on step and view mode
const currentFormComponent = computed(() => {
  const step = nav.currentStep.value
  const isSplit = viewMode.value === 'split'

  switch (step) {
    case 0: // Vehicle
      return isSplit ? MobileVehicleForm : VehicleForm
    case 1: // Vendor
      return isSplit ? MobileVendorForm : VendorForm
    case 2: // Documents
      return DocumentsStep
    case 3: // Validation
      return ValidationStep
    default:
      return null
  }
})

// Props for current form
const currentFormProps = computed(() => {
  const step = nav.currentStep.value

  switch (step) {
    case 0:
      return {
        buyingOpportunityId: opportunityId.value,
        initialSpz: route.query.spz as string | undefined,
        existingVehicle: data.vehicle.value,
        ocrData: data.ocrData.value
      }
    case 1:
      return {
        buyingOpportunityId: opportunityId.value,
        existingVendor: data.vendor.value
      }
    // ... other steps
    default:
      return {}
  }
})

// Event handlers for current form
const currentFormEvents = computed(() => {
  const step = nav.currentStep.value

  switch (step) {
    case 0:
      return {
        saved: handleVehicleSaved,
        next: () => nav.goToStep(1)
      }
    case 1:
      return {
        saved: handleVendorSaved,
        next: () => nav.goToStep(2),
        back: () => nav.goToStep(0)
      }
    // ... other steps
    default:
      return {}
  }
})
</script>
```

### Component Mapping
| Step | Full Mode | Split Mode |
|------|-----------|------------|
| 0 (Vehicle) | VehicleForm | MobileVehicleForm |
| 1 (Vendor) | VendorForm | MobileVendorForm |
| 2 (Documents) | DocumentsStep | DocumentsStep |
| 3 (Validation) | ValidationStep | ValidationStep |

### Acceptance Criteria
- [ ] MobileVehicleForm used in split mode for step 0
- [ ] MobileVendorForm used in split mode for step 1
- [ ] Standard forms used in full mode
- [ ] Props passed correctly to both form types
- [ ] Events handled correctly from both form types
- [ ] Form data persists when switching view modes
- [ ] No errors when switching modes mid-form

---

## Task 4.5: Wire Reactive Data to Preview Components {#task-45}

**Complexity**: Simple
**Dependencies**: Tasks 2.1-2.3 (preview components), 4.3
**File**: `apps/web/src/pages/Detail.vue`
**Assignable**: Yes (props wiring)

### Objective
Ensure preview updates in real-time as user enters data.

### Implementation

The `useDetailData` composable already provides reactive data:

```typescript
// In Detail.vue
const data = useDetailData(opportunityId)

// data.vehicle is a ref that updates when vehicle is saved
// data.vendor is a ref that updates when vendor is saved
// These are already reactive!
```

Pass to preview:
```vue
<MobilePreviewScreen
  :vehicle="data.vehicle.value"
  :vendor="data.vendor.value"
  :current-step="nav.currentStep.value"
/>
```

### Data Flow
```
Form Input → save() → Supabase → refetch() → data.vehicle/vendor → Preview Updates
```

### Real-time Updates
The preview updates when:
1. User saves vehicle form → `data.vehicle` updates → PreviewVehicleCard re-renders
2. User saves vendor form → `data.vendor` updates → PreviewVendorCard re-renders
3. Step changes → `currentStep` updates → Preview shows appropriate content

### Empty States
Preview components already handle null data with empty states (implemented in Phase 2).

### Acceptance Criteria
- [ ] Preview updates when vehicle data is saved
- [ ] Preview updates when vendor data is saved
- [ ] Preview shows correct content for current step
- [ ] Empty states render when no data present
- [ ] No console errors during data flow
- [ ] Preview doesn't flicker on updates

---

## Phase Completion Checklist

- [ ] Task 4.1 (View Mode State) completed
- [ ] Task 4.2 (Toggle Button) completed
- [ ] Task 4.3 (SplitFormLayout Integration) completed
- [ ] Task 4.4 (Conditional Form Selection) completed
- [ ] Task 4.5 (Reactive Data Wiring) completed
- [ ] Complete flow tested: vehicle → vendor → preview updates

## Sequential Execution Required
Tasks 4.1 → 4.2 → 4.3 → 4.4 → 4.5 must be executed in order due to dependencies.

## Next Phase
Once integration is complete, proceed to [Phase 5: Polish & Testing](./phase-5-polish-testing.md)
