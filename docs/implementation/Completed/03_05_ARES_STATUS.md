# Task 3.5: ARES Status Component

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: Medium
> **Depends On**: 3.1 Vue.js Setup
> **Estimated Effort**: Low

---

## Objective

Create a visual component for displaying ARES lookup status with appropriate icons and colors.

---

## Component Tests

### Required Tests (Write Before Implementation)

Create test file: `MVPScope/frontend/src/components/shared/__tests__/AresStatus.spec.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AresStatus from '../AresStatus.vue'

describe('AresStatus', () => {
  it('shows nothing when status is idle', () => {
    const wrapper = mount(AresStatus, {
      props: { status: 'idle' }
    })

    expect(wrapper.text()).toBe('')
  })

  it('displays loading spinner when status is loading', () => {
    const wrapper = mount(AresStatus, {
      props: { status: 'loading' }
    })

    expect(wrapper.text()).toContain('Ověřuji')
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('displays success message when status is verified', () => {
    const wrapper = mount(AresStatus, {
      props: { status: 'verified', message: 'Firma ověřena: OSIT S.R.O.' }
    })

    expect(wrapper.text()).toContain('✅')
    expect(wrapper.text()).toContain('OSIT S.R.O.')
  })

  it('displays not found message when status is not_found', () => {
    const wrapper = mount(AresStatus, {
      props: { status: 'not_found', message: 'Firma nebyla nalezena' }
    })

    expect(wrapper.text()).toContain('❌')
    expect(wrapper.text()).toContain('nebyla nalezena')
  })

  it('displays warning message when status is warning', () => {
    const wrapper = mount(AresStatus, {
      props: { status: 'warning', message: 'Neshoduje se název firmy' }
    })

    expect(wrapper.text()).toContain('⚠️')
    expect(wrapper.text()).toContain('Neshoduje se')
  })

  it('displays error message when status is error', () => {
    const wrapper = mount(AresStatus, {
      props: { status: 'error', message: 'Chyba při ověřování' }
    })

    expect(wrapper.text()).toContain('❌')
    expect(wrapper.text()).toContain('Chyba')
  })

  it('applies correct background colors for each status', () => {
    const statuses = [
      { status: 'loading', expectedClass: 'bg-blue-50' },
      { status: 'verified', expectedClass: 'bg-green-50' },
      { status: 'not_found', expectedClass: 'bg-red-50' },
      { status: 'warning', expectedClass: 'bg-orange-50' },
      { status: 'error', expectedClass: 'bg-red-50' },
    ]

    statuses.forEach(({ status, expectedClass }) => {
      const wrapper = mount(AresStatus, {
        props: { status: status as any }
      })
      expect(wrapper.classes()).toContain(expectedClass)
    })
  })
})
```

### Test-First Workflow

1. **RED**: Write tests above, run `npm run test -- --filter="AresStatus"` - they should FAIL
2. **GREEN**: Implement AresStatus.vue until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

---

## UI States

| Status | Icon | Color | Message Example |
|--------|------|-------|-----------------|
| `idle` | - | Gray | - |
| `loading` | Spinner | Blue | Ověřuji v ARES... |
| `verified` | ✅ | Green | Firma ověřena: OSIT S.R.O. |
| `not_found` | ❌ | Red | Firma nebyla nalezena v ARES |
| `warning` | ⚠️ | Orange | Neshoduje se název firmy |
| `error` | ❌ | Red | Chyba při ověřování |

---

## Implementation

**src/components/shared/AresStatus.vue**:
```vue
<template>
  <div v-if="status !== 'idle'" :class="containerClass">
    <!-- Loading -->
    <template v-if="status === 'loading'">
      <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      <span class="text-blue-600">Ověřuji v ARES...</span>
    </template>

    <!-- Verified -->
    <template v-else-if="status === 'verified'">
      <span class="text-green-500">✅</span>
      <span class="text-green-700">{{ message || 'Ověřeno v ARES' }}</span>
    </template>

    <!-- Not Found -->
    <template v-else-if="status === 'not_found'">
      <span class="text-red-500">❌</span>
      <span class="text-red-700">{{ message || 'Nenalezeno v ARES' }}</span>
    </template>

    <!-- Warning -->
    <template v-else-if="status === 'warning'">
      <span class="text-orange-500">⚠️</span>
      <span class="text-orange-700">{{ message }}</span>
    </template>

    <!-- Error -->
    <template v-else-if="status === 'error'">
      <span class="text-red-500">❌</span>
      <span class="text-red-700">{{ message || 'Chyba ověření' }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type AresStatusType = 'idle' | 'loading' | 'verified' | 'not_found' | 'warning' | 'error';

const props = defineProps<{
  status: AresStatusType;
  message?: string;
}>();

const containerClass = computed(() => {
  const base = 'flex items-center gap-2 text-sm px-3 py-1 rounded-lg';
  const colors = {
    idle: '',
    loading: 'bg-blue-50',
    verified: 'bg-green-50',
    not_found: 'bg-red-50',
    warning: 'bg-orange-50',
    error: 'bg-red-50',
  };
  return `${base} ${colors[props.status]}`;
});
</script>
```

---

## Usage Example

```vue
<template>
  <div>
    <input v-model="ico" @input="lookupAres" />
    <AresStatus :status="aresStatus" :message="aresMessage" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import AresStatus from '@/components/shared/AresStatus.vue';

const ico = ref('');
const aresStatus = ref<AresStatusType>('idle');
const aresMessage = ref('');

async function lookupAres() {
  if (ico.value.length !== 8) {
    aresStatus.value = 'idle';
    return;
  }

  aresStatus.value = 'loading';

  try {
    const result = await fetchAres(ico.value);
    if (result.found) {
      aresStatus.value = 'verified';
      aresMessage.value = `Firma ověřena: ${result.data.name}`;
    } else {
      aresStatus.value = 'not_found';
      aresMessage.value = 'IČO nebylo nalezeno v registru ARES';
    }
  } catch (e) {
    aresStatus.value = 'error';
    aresMessage.value = 'Nepodařilo se ověřit v ARES';
  }
}
</script>
```

---

## Validation Commands

```bash
# Run AresStatus component tests
cd MVPScope/frontend && npm run test -- --filter="AresStatus"

# Run all frontend tests
cd MVPScope/frontend && npm run test
```

---

## Validation Criteria

- [ ] All AresStatus component tests pass
- [ ] All 6 status states display correctly
- [ ] Loading spinner animates
- [ ] Colors match status severity
- [ ] Custom messages display
- [ ] Hidden when status is 'idle'

---

## Completion Checklist

- [x] AresStatus.vue created
- [x] All states styled
- [x] Tested in VendorForm
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
