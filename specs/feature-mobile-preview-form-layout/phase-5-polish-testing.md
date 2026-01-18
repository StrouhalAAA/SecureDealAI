# Phase 5: Polish & Testing

> **Phase Goal**: Add finishing touches and ensure quality
> **Tasks**: 5
> **Dependencies**: Phases 1-4 (all implementation complete)
> **Estimated Complexity**: Simple to Medium

---

## Task 5.1: Add iOS-Style Typography to Preview Components {#task-51}

**Complexity**: Simple
**Dependencies**: Phase 2 complete
**Files**: All preview components
**Assignable**: Yes (styling only)

### Objective
Ensure all preview components use iOS-like typography and colors.

### Implementation

Add to `tailwind.config.js` or use inline styles:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'ios': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        'ios': {
          'gray-1': '#8e8e93',
          'gray-2': '#aeaeb2',
          'gray-3': '#c7c7cc',
          'gray-4': '#d1d1d6',
          'gray-5': '#e5e5ea',
          'gray-6': '#f2f2f7',
          'blue': '#007aff',
          'green': '#34c759',
          'red': '#ff3b30',
        }
      }
    }
  }
}
```

### Apply to Components

```vue
<!-- In preview components -->
<style scoped>
.font-ios {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.01em; /* SF Pro-like tighter spacing */
}
</style>
```

### iOS System Colors Reference
| Usage | Color | Hex |
|-------|-------|-----|
| Primary Background | systemGray6 | #f2f2f7 |
| Card Background | white | #ffffff |
| Primary Text | label | #000000 |
| Secondary Text | secondaryLabel | rgba(60, 60, 67, 0.6) |
| Tertiary Text | tertiaryLabel | rgba(60, 60, 67, 0.3) |
| Accent | systemBlue | #007aff |
| Separator | separator | rgba(60, 60, 67, 0.29) |

### Acceptance Criteria
- [ ] All preview components use iOS font family
- [ ] Colors match iOS system palette
- [ ] Letter-spacing feels native to iOS
- [ ] Font smoothing enabled
- [ ] Consistent typography across all preview components

---

## Task 5.2: Add Subtle Animations to Preview {#task-52}

**Complexity**: Simple
**Dependencies**: Phase 2 complete
**Files**: `PreviewVehicleCard.vue`, `PreviewVendorCard.vue`
**Assignable**: Yes (parallel with 5.1)

### Objective
Add subtle animations when data appears in preview cards.

### Implementation

```vue
<!-- PreviewVehicleCard.vue -->
<template>
  <Transition name="card-fade" mode="out-in">
    <div v-if="vehicle" :key="vehicle.id" class="bg-white rounded-2xl p-4 shadow-sm">
      <!-- Vehicle content with field transitions -->
      <TransitionGroup name="field-fade" tag="div" class="space-y-3">
        <div v-if="vehicle.spz" key="spz">
          <!-- SPZ display -->
        </div>
        <!-- More fields... -->
      </TransitionGroup>
    </div>

    <!-- Empty state -->
    <div v-else key="empty" class="border-2 border-dashed...">
      <!-- Empty state -->
    </div>
  </Transition>
</template>

<style scoped>
/* Card fade transition */
.card-fade-enter-active,
.card-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.card-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.card-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Field fade transition */
.field-fade-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.field-fade-enter-from {
  opacity: 0;
  transform: translateX(-8px);
}

/* Stagger children */
.field-fade-enter-active:nth-child(1) { transition-delay: 0ms; }
.field-fade-enter-active:nth-child(2) { transition-delay: 50ms; }
.field-fade-enter-active:nth-child(3) { transition-delay: 100ms; }
.field-fade-enter-active:nth-child(4) { transition-delay: 150ms; }
</style>
```

### Animation Guidelines
- Duration: 200-300ms (iOS-like)
- Easing: `ease` or `ease-out`
- Transform: Subtle (8px max)
- No animation on initial page load
- Stagger children for list-like content

### Acceptance Criteria
- [ ] Cards fade in smoothly when data loads
- [ ] Fields stagger in with slight delay
- [ ] Animations are subtle and not distracting
- [ ] Empty state transitions smoothly
- [ ] No layout shift during animations
- [ ] Performance is smooth (60fps)

---

## Task 5.3: Add Mobile Responsive Preview Modal {#task-53}

**Complexity**: Medium
**Dependencies**: Tasks 1.2 (PhoneMockup), 2.1 (MobilePreviewScreen)
**File**: `apps/web/src/pages/Detail.vue`
**Assignable**: Yes (new UI feature)

### Objective
On small screens (<1024px), show a floating button that opens a full-screen preview modal.

### Implementation

```vue
<template>
  <!-- Existing content... -->

  <!-- Floating Preview Button (mobile only) -->
  <button
    v-if="viewMode === 'split'"
    @click="showPreviewModal = true"
    class="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center z-40"
    aria-label="Zobrazit náhled"
  >
    <PhoneIcon class="w-6 h-6" />
  </button>

  <!-- Preview Modal -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="showPreviewModal"
        class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        @click.self="showPreviewModal = false"
        @keydown.escape="showPreviewModal = false"
      >
        <div class="relative max-w-sm w-full">
          <!-- Close Button -->
          <button
            @click="showPreviewModal = false"
            class="absolute -top-12 right-0 text-white p-2"
            aria-label="Zavřít"
          >
            <XIcon class="w-6 h-6" />
          </button>

          <!-- Phone Mockup -->
          <PhoneMockup>
            <MobilePreviewScreen
              :vehicle="data.vehicle.value"
              :vendor="data.vendor.value"
              :current-step="nav.currentStep.value"
            />
          </PhoneMockup>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showPreviewModal = ref(false)

// Close on escape key
onMounted(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') showPreviewModal.value = false
  }
  window.addEventListener('keydown', handleEscape)
  onUnmounted(() => window.removeEventListener('keydown', handleEscape))
})
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .relative,
.modal-fade-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from .relative {
  transform: scale(0.95) translateY(20px);
}

.modal-fade-leave-to .relative {
  transform: scale(0.95);
}
</style>
```

### Behavior
| Screen Size | Behavior |
|-------------|----------|
| >= 1024px | No floating button, preview in split layout |
| < 1024px | Floating button visible, opens modal on click |

### Accessibility
- `aria-label` on buttons
- Closes on Escape key
- Closes on backdrop click
- Focus trap inside modal (optional enhancement)

### Acceptance Criteria
- [ ] Floating button visible only on mobile/tablet (<1024px)
- [ ] Button positioned bottom-right with shadow
- [ ] Clicking opens full-screen modal
- [ ] Modal contains PhoneMockup with current preview
- [ ] Close button in modal corner
- [ ] Modal closes on Escape key
- [ ] Modal closes on backdrop click
- [ ] Smooth open/close animation

---

## Task 5.4: Create SplitFormLayout Unit Tests {#task-54}

**Complexity**: Simple
**Dependencies**: Task 1.1
**File**: `apps/web/src/components/layout/__tests__/SplitFormLayout.spec.ts`
**Assignable**: Yes (parallel with other tests)

### Implementation

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SplitFormLayout from '../SplitFormLayout.vue'

describe('SplitFormLayout', () => {
  it('renders two panels with default widths', () => {
    const wrapper = mount(SplitFormLayout, {
      slots: {
        left: '<div data-testid="left">Left</div>',
        right: '<div data-testid="right">Right</div>'
      }
    })

    const leftPanel = wrapper.find('[data-testid="left"]')
    const rightPanel = wrapper.find('[data-testid="right"]')

    expect(leftPanel.exists()).toBe(true)
    expect(rightPanel.exists()).toBe(true)
  })

  it('applies custom widths via props', () => {
    const wrapper = mount(SplitFormLayout, {
      props: {
        leftWidth: '30%',
        rightWidth: '70%'
      },
      slots: {
        left: '<div>Left</div>',
        right: '<div>Right</div>'
      }
    })

    const panels = wrapper.findAll('div > div')
    expect(panels[0].attributes('style')).toContain('flex-basis: 30%')
    expect(panels[1].attributes('style')).toContain('flex-basis: 70%')
  })

  it('renders slot content correctly', () => {
    const wrapper = mount(SplitFormLayout, {
      slots: {
        left: '<form>Form content</form>',
        right: '<div>Preview content</div>'
      }
    })

    expect(wrapper.html()).toContain('Form content')
    expect(wrapper.html()).toContain('Preview content')
  })
})
```

### Acceptance Criteria
- [ ] Test file created in correct location
- [ ] Tests pass for default widths
- [ ] Tests pass for custom widths
- [ ] Tests verify slot content renders

---

## Task 5.5: Create PhoneMockup Unit Tests {#task-55}

**Complexity**: Simple
**Dependencies**: Task 1.2
**File**: `apps/web/src/components/preview/__tests__/PhoneMockup.spec.ts`
**Assignable**: Yes (parallel with other tests)

### Implementation

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PhoneMockup from '../PhoneMockup.vue'

describe('PhoneMockup', () => {
  it('renders iPhone-like frame', () => {
    const wrapper = mount(PhoneMockup)

    // Check for rounded corners (phone frame)
    expect(wrapper.find('.rounded-\\[44px\\]').exists()).toBe(true)
  })

  it('renders Dynamic Island', () => {
    const wrapper = mount(PhoneMockup)

    // Dynamic Island should be a rounded black element at top
    const dynamicIsland = wrapper.find('.rounded-full.bg-black')
    expect(dynamicIsland.exists()).toBe(true)
  })

  it('renders home indicator', () => {
    const wrapper = mount(PhoneMockup)

    // Home indicator is a small rounded bar at bottom
    expect(wrapper.html()).toContain('bg-gray-800')
  })

  it('renders slot content in screen area', () => {
    const wrapper = mount(PhoneMockup, {
      slots: {
        default: '<div data-testid="content">Screen Content</div>'
      }
    })

    expect(wrapper.find('[data-testid="content"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Screen Content')
  })
})
```

### Acceptance Criteria
- [ ] Tests verify frame structure
- [ ] Tests verify Dynamic Island presence
- [ ] Tests verify home indicator presence
- [ ] Tests verify slot content rendering

---

## Task 5.6: Create MobilePreviewScreen Unit Tests {#task-56}

**Complexity**: Simple
**Dependencies**: Task 2.1
**File**: `apps/web/src/components/preview/__tests__/MobilePreviewScreen.spec.ts`
**Assignable**: Yes (parallel with other tests)

### Implementation

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MobilePreviewScreen from '../MobilePreviewScreen.vue'

describe('MobilePreviewScreen', () => {
  it('shows vehicle card when vehicle data present', () => {
    const wrapper = mount(MobilePreviewScreen, {
      props: {
        vehicle: { id: '1', spz: '1AB 2345', vin: 'WVWZZZ3CZWE123456' },
        vendor: null,
        currentStep: 0
      }
    })

    expect(wrapper.findComponent({ name: 'PreviewVehicleCard' }).exists()).toBe(true)
  })

  it('shows vendor card when vendor data present', () => {
    const wrapper = mount(MobilePreviewScreen, {
      props: {
        vehicle: null,
        vendor: { id: '1', vendor_type: 'COMPANY', nazev_firmy: 'ACME' },
        currentStep: 1
      }
    })

    expect(wrapper.findComponent({ name: 'PreviewVendorCard' }).exists()).toBe(true)
  })

  it('shows empty state when no data', () => {
    const wrapper = mount(MobilePreviewScreen, {
      props: {
        vehicle: null,
        vendor: null,
        currentStep: 0
      }
    })

    // Should show vehicle card with empty state
    expect(wrapper.text()).toContain('Zadejte údaje')
  })

  it('shows correct header title for each step', async () => {
    const wrapper = mount(MobilePreviewScreen, {
      props: { vehicle: null, vendor: null, currentStep: 0 }
    })

    expect(wrapper.text()).toContain('Vozidlo')

    await wrapper.setProps({ currentStep: 1 })
    expect(wrapper.text()).toContain('Dodavatel')

    await wrapper.setProps({ currentStep: 2 })
    expect(wrapper.text()).toContain('Dokumenty')
  })
})
```

### Acceptance Criteria
- [ ] Tests verify vehicle card conditional rendering
- [ ] Tests verify vendor card conditional rendering
- [ ] Tests verify empty states
- [ ] Tests verify step-based header title

---

## Task 5.7: Create Mobile Form Validation Tests {#task-57}

**Complexity**: Medium
**Dependencies**: Tasks 3.1, 3.2
**File**: `apps/web/src/components/forms/__tests__/MobileVehicleForm.spec.ts`
**Assignable**: Yes (parallel with other tests)

### Implementation

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MobileVehicleForm from '../MobileVehicleForm.vue'

describe('MobileVehicleForm', () => {
  it('validates required SPZ field', async () => {
    const wrapper = mount(MobileVehicleForm, {
      props: { buyingOpportunityId: '123' }
    })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('SPZ je povinné')
  })

  it('validates VIN length', async () => {
    const wrapper = mount(MobileVehicleForm, {
      props: { buyingOpportunityId: '123' }
    })

    await wrapper.find('input[placeholder*="VIN"]').setValue('TOOSHORT')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('VIN musí mít 17 znaků')
  })

  it('emits saved event with correct data', async () => {
    const wrapper = mount(MobileVehicleForm, {
      props: { buyingOpportunityId: '123' }
    })

    // Fill in required fields
    await wrapper.find('input[placeholder*="SPZ"]').setValue('1AB 2345')
    await wrapper.find('input[placeholder*="VIN"]').setValue('WVWZZZ3CZWE123456')
    // ... fill other required fields

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('uses mobile-optimized styling', () => {
    const wrapper = mount(MobileVehicleForm, {
      props: { buyingOpportunityId: '123' }
    })

    const inputs = wrapper.findAll('input')
    inputs.forEach(input => {
      expect(input.classes()).toContain('mobile-input')
    })
  })
})
```

### Acceptance Criteria
- [ ] Tests verify all required field validation
- [ ] Tests verify VIN length validation
- [ ] Tests verify form submission emits correct data
- [ ] Tests confirm mobile styling is applied

---

## Task 5.8: Run Full Validation Suite {#task-58}

**Complexity**: Simple
**Dependencies**: All previous tasks
**Assignable**: Yes (final verification)

### Commands to Execute

```bash
# 1. Test Supabase connection
npm run test:db

# 2. Build frontend (checks for TypeScript errors)
cd apps/web && npm run build

# 3. Run unit tests
cd apps/web && npm run test

# 4. (Optional) Run linter
cd apps/web && npm run lint
```

### Expected Results
| Command | Expected Outcome |
|---------|------------------|
| `npm run test:db` | Connection successful |
| `npm run build` | Build completes with 0 errors |
| `npm run test` | All tests pass |
| `npm run lint` | No errors (warnings OK) |

### Troubleshooting
- **TypeScript errors**: Check component imports and prop types
- **Test failures**: Review failed test assertions
- **Build errors**: Check for missing dependencies

### Acceptance Criteria
- [ ] `npm run test:db` passes
- [ ] `npm run build` completes without errors
- [ ] `npm run test` - all tests pass
- [ ] No TypeScript errors
- [ ] No critical linting errors

---

## Phase Completion Checklist

- [ ] Task 5.1 (iOS Typography) completed
- [ ] Task 5.2 (Animations) completed
- [ ] Task 5.3 (Mobile Modal) completed
- [ ] Task 5.4 (SplitFormLayout Tests) completed
- [ ] Task 5.5 (PhoneMockup Tests) completed
- [ ] Task 5.6 (MobilePreviewScreen Tests) completed
- [ ] Task 5.7 (Mobile Form Tests) completed
- [ ] Task 5.8 (Validation Suite) completed

## Parallel Execution Opportunities
- Tasks 5.1 and 5.2 can run in parallel (both are styling)
- Tasks 5.4, 5.5, 5.6, 5.7 can all run in parallel (independent tests)
- Task 5.8 must run last

---

## Feature Complete!

After Phase 5, the Mobile Preview Form Layout feature is complete. Verify all acceptance criteria from the original spec:

- [ ] Split layout with 40%/60% panels
- [ ] Realistic iPhone mockup with notch, status bar, home indicator
- [ ] Live vehicle data preview
- [ ] Live vendor data preview
- [ ] Toggle between split and full view
- [ ] localStorage persistence
- [ ] Mobile-only form display on small screens
- [ ] Mobile forms with larger touch targets
- [ ] Appropriate empty states
- [ ] All existing validation works
- [ ] All tests pass
- [ ] Build succeeds
