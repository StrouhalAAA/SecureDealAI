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

## Validation Criteria

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
