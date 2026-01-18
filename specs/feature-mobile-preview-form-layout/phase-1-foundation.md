# Phase 1: Foundation Components

> **Phase Goal**: Build the core layout infrastructure and phone mockup
> **Tasks**: 3
> **Dependencies**: Phase 0 (research)
> **Estimated Complexity**: Simple to Medium

---

## Task 1.1: Create SplitFormLayout.vue Component {#task-11}

**Complexity**: Simple
**Dependencies**: None
**File**: `apps/web/src/components/layout/SplitFormLayout.vue`
**Assignable**: Yes (standalone component)

### Objective
Create a two-panel layout container that splits the screen between form and preview.

### Implementation Details

```vue
<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <div
      class="w-full lg:flex-shrink-0"
      :style="{ flexBasis: leftWidth }"
    >
      <slot name="left" />
    </div>
    <div
      class="hidden lg:block lg:flex-shrink-0"
      :style="{ flexBasis: rightWidth }"
    >
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  leftWidth?: string
  rightWidth?: string
}

withDefaults(defineProps<Props>(), {
  leftWidth: '40%',
  rightWidth: '60%'
})
</script>
```

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `leftWidth` | string | '40%' | Width of left panel (form) |
| `rightWidth` | string | '60%' | Width of right panel (preview) |

### Slots
| Slot | Purpose |
|------|---------|
| `left` | Form content |
| `right` | Preview content (hidden on mobile) |

### Responsive Behavior
- `>= 1024px`: Side-by-side layout with specified widths
- `< 1024px`: Only left slot visible, full width

### Acceptance Criteria
- [ ] Component renders two panels side-by-side on desktop
- [ ] Left panel takes 40% width by default
- [ ] Right panel takes 60% width by default
- [ ] Custom widths work via props
- [ ] Right panel hidden on screens < 1024px
- [ ] Gap of 24px (gap-6) between panels
- [ ] Slots render content correctly

---

## Task 1.2: Create PhoneMockup.vue Component {#task-12}

**Complexity**: Medium
**Dependencies**: Task 0.1 (iPhone dimensions), Task 1.3 (StatusBar)
**File**: `apps/web/src/components/preview/PhoneMockup.vue`
**Assignable**: Yes (after 1.3 is complete)

### Objective
Create a realistic iPhone frame component that wraps preview content.

### Implementation Details

```vue
<template>
  <div class="phone-mockup">
    <!-- iPhone Frame -->
    <div class="relative bg-black rounded-[44px] p-3 shadow-2xl max-h-[680px]">
      <!-- Inner Screen -->
      <div
        class="relative bg-white rounded-[36px] overflow-hidden"
        style="aspect-ratio: 393 / 852;"
      >
        <!-- Dynamic Island -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-full z-10" />

        <!-- Status Bar -->
        <PhoneStatusBar class="relative z-20" />

        <!-- Content Area -->
        <div class="flex-1 overflow-hidden">
          <slot />
        </div>

        <!-- Home Indicator -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-800 rounded-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PhoneStatusBar from './PhoneStatusBar.vue'
</script>

<style scoped>
.phone-mockup {
  /* Center the phone in container */
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
</style>
```

### Visual Structure
```
┌─────────────────────────────┐  ← Black frame (rounded-[44px])
│  ┌───────────────────────┐  │  ← White screen (rounded-[36px])
│  │    ┌─────────────┐    │  │  ← Dynamic Island
│  │    └─────────────┘    │  │
│  │  9:41  ▁▂▃▄ ⚡ 80%    │  │  ← Status Bar
│  │                       │  │
│  │                       │  │
│  │    [Screen Content]   │  │  ← Slot content
│  │                       │  │
│  │                       │  │
│  │        ════           │  │  ← Home Indicator
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### Styling Requirements
- Outer frame: `bg-black`, `rounded-[44px]`, `p-3`, `shadow-2xl`
- Inner screen: `bg-white`, `rounded-[36px]`, `overflow-hidden`
- Aspect ratio: `393 / 852` (~1:2.17)
- Max height: `680px` to prevent overflow
- Dynamic Island: `w-28 h-8 rounded-full bg-black`
- Home indicator: `w-32 h-1 bg-gray-800 rounded-full`

### Acceptance Criteria
- [ ] Renders iPhone-like frame with correct proportions
- [ ] Dynamic Island visible at top center
- [ ] Status bar renders with PhoneStatusBar component
- [ ] Content slot fills screen area
- [ ] Home indicator visible at bottom
- [ ] Frame scales responsively within container
- [ ] Shadow provides depth effect

---

## Task 1.3: Create PhoneStatusBar.vue Component {#task-13}

**Complexity**: Simple
**Dependencies**: None
**File**: `apps/web/src/components/preview/PhoneStatusBar.vue`
**Assignable**: Yes (standalone component)

### Objective
Create a static iOS-style status bar with time, signal, wifi, and battery indicators.

### Implementation Details

```vue
<template>
  <div class="flex items-center justify-between px-6 pt-12 pb-2 text-xs font-semibold">
    <!-- Time -->
    <span class="w-12">{{ currentTime }}</span>

    <!-- Center spacer (for Dynamic Island) -->
    <div class="flex-1" />

    <!-- Status Icons -->
    <div class="flex items-center gap-1">
      <!-- Cellular -->
      <svg class="w-4 h-3" viewBox="0 0 17 10">
        <path d="M0 7h3v3H0zM4 4h3v6H4zM8 2h3v8H8zM12 0h3v10h-3z" fill="currentColor"/>
      </svg>

      <!-- WiFi -->
      <svg class="w-4 h-3" viewBox="0 0 16 12">
        <path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8 5c2.5 0 4.5 1.5 5.5 3.5l-1.5 1C11 8 9.5 7 8 7s-3 1-4 2.5l-1.5-1C3.5 6.5 5.5 5 8 5zm0-5c4.5 0 8 2.5 10 6l-1.5 1C15 4 12 2 8 2S1 4 .5 7L-1 6c2-3.5 5.5-6 9-6z" fill="currentColor"/>
      </svg>

      <!-- Battery -->
      <div class="flex items-center">
        <div class="w-6 h-3 border border-current rounded-sm relative">
          <div class="absolute inset-0.5 bg-current rounded-sm" style="width: 80%"/>
        </div>
        <div class="w-0.5 h-1.5 bg-current rounded-r ml-px"/>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const currentTime = computed(() => {
  const now = new Date()
  return now.toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
})
</script>

<style scoped>
/* iOS system font */
div {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
```

### Elements
| Element | Position | Details |
|---------|----------|---------|
| Time | Left | Current time in HH:MM format |
| Cellular | Right | 4-bar signal indicator (static) |
| WiFi | Right | WiFi icon (static) |
| Battery | Right | 80% filled battery icon (static) |

### Styling
- Font: system-ui (iOS-like)
- Size: `text-xs font-semibold`
- Padding: `px-6 pt-12 pb-2` (accounts for Dynamic Island)
- Color: Uses `currentColor` for theming

### Acceptance Criteria
- [ ] Shows current time in HH:MM format
- [ ] Displays static cellular signal bars
- [ ] Displays static WiFi icon
- [ ] Displays static battery at ~80%
- [ ] Uses iOS-like system font
- [ ] Proper spacing below Dynamic Island

---

## Directory Setup

Before creating components, ensure directories exist:

```bash
mkdir -p apps/web/src/components/layout
mkdir -p apps/web/src/components/preview
```

---

## Phase Completion Checklist

- [ ] `components/layout/` directory created
- [ ] `components/preview/` directory created
- [ ] Task 1.1 (SplitFormLayout) completed
- [ ] Task 1.3 (PhoneStatusBar) completed
- [ ] Task 1.2 (PhoneMockup) completed

## Parallel Execution Note
Tasks 1.1 and 1.3 have no dependencies and can be executed in parallel.

## Next Phase
Once foundation is complete, proceed to [Phase 2: Preview Components](./phase-2-preview-components.md)
