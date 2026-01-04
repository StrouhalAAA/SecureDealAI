# Task 3.7: OCR Status Component

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: Medium
> **Depends On**: 3.6 Document Upload
> **Estimated Effort**: Low

---

## Objective

Create a component to display OCR extraction status and results preview.

---

## Component Tests

### Required Tests (Write Before Implementation)

Create test file: `MVPScope/frontend/src/components/ocr/__tests__/OcrStatus.spec.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OcrStatus from '../OcrStatus.vue'

describe('OcrStatus', () => {
  it('shows pending state', () => {
    const wrapper = mount(OcrStatus, {
      props: {
        extraction: {
          ocr_status: 'PENDING',
          document_type: 'ORV'
        }
      }
    })

    expect(wrapper.text()).toContain('Čeká')
    expect(wrapper.text()).toContain('⏳')
  })

  it('shows processing state with spinner', () => {
    const wrapper = mount(OcrStatus, {
      props: {
        extraction: {
          ocr_status: 'PROCESSING',
          document_type: 'ORV'
        }
      }
    })

    expect(wrapper.text()).toContain('Probíhá')
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('shows completed state with confidence', () => {
    const wrapper = mount(OcrStatus, {
      props: {
        extraction: {
          ocr_status: 'COMPLETED',
          document_type: 'ORV',
          extraction_confidence: 95,
          extracted_data: {
            registrationPlateNumber: '5L94454',
            vin: 'YV1PZA3TCL1103985'
          }
        }
      }
    })

    expect(wrapper.text()).toContain('✅')
    expect(wrapper.text()).toContain('dokončena')
    expect(wrapper.text()).toContain('95%')
  })

  it('shows data preview toggle when completed', async () => {
    const wrapper = mount(OcrStatus, {
      props: {
        extraction: {
          ocr_status: 'COMPLETED',
          document_type: 'ORV',
          extraction_confidence: 95,
          extracted_data: {
            registrationPlateNumber: '5L94454',
            vin: 'YV1PZA3TCL1103985'
          }
        }
      }
    })

    const toggleButton = wrapper.find('button')
    expect(toggleButton.text()).toContain('náhled')

    await toggleButton.trigger('click')
    expect(wrapper.text()).toContain('SPZ')
    expect(wrapper.text()).toContain('VIN')
  })

  it('shows failed state with error message', () => {
    const wrapper = mount(OcrStatus, {
      props: {
        extraction: {
          ocr_status: 'FAILED',
          document_type: 'ORV',
          errors: { message: 'OCR extraction timed out' }
        }
      }
    })

    expect(wrapper.text()).toContain('❌')
    expect(wrapper.text()).toContain('Chyba')
  })

  it('shows retry button when failed', () => {
    const wrapper = mount(OcrStatus, {
      props: {
        extraction: {
          ocr_status: 'FAILED',
          document_type: 'ORV',
          errors: { message: 'Failed' }
        }
      }
    })

    const retryButton = wrapper.find('button')
    expect(retryButton.text()).toContain('Opakovat')
  })

  it('emits retry event when retry button clicked', async () => {
    const wrapper = mount(OcrStatus, {
      props: {
        extraction: {
          ocr_status: 'FAILED',
          document_type: 'ORV',
          errors: { message: 'Failed' }
        }
      }
    })

    const retryButton = wrapper.find('button')
    await retryButton.trigger('click')

    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('formats ORV field names correctly', async () => {
    const wrapper = mount(OcrStatus, {
      props: {
        extraction: {
          ocr_status: 'COMPLETED',
          document_type: 'ORV',
          extraction_confidence: 90,
          extracted_data: {
            registrationPlateNumber: '5L94454',
            vin: 'YV1PZA3TCL1103985',
            keeperName: 'OSIT S.R.O.'
          }
        }
      }
    })

    // Expand preview
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('SPZ')
    expect(wrapper.text()).toContain('VIN')
    expect(wrapper.text()).toContain('Majitel')
  })
})
```

### Test-First Workflow

1. **RED**: Write tests above, run `npm run test -- --filter="OcrStatus"` - they should FAIL
2. **GREEN**: Implement OcrStatus.vue until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

---

## UI States

| Status | Display |
|--------|---------|
| `PENDING` | ⏳ Čeká na zpracování |
| `PROCESSING` | 🔄 Probíhá extrakce... (spinner) |
| `COMPLETED` | ✅ Extrakce dokončena + data preview |
| `FAILED` | ❌ Chyba extrakce + retry button |

---

## Implementation

**src/components/ocr/OcrStatus.vue**:
```vue
<template>
  <div :class="containerClass" class="mt-3 rounded-lg p-4">
    <!-- Pending -->
    <div v-if="extraction.ocr_status === 'PENDING'" class="flex items-center gap-2">
      <span>⏳</span>
      <span>Čeká na zpracování...</span>
    </div>

    <!-- Processing -->
    <div v-else-if="extraction.ocr_status === 'PROCESSING'" class="flex items-center gap-2">
      <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      <span>Probíhá extrakce textu...</span>
    </div>

    <!-- Completed -->
    <div v-else-if="extraction.ocr_status === 'COMPLETED'">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-green-500">✅</span>
          <span class="font-medium">Extrakce dokončena</span>
          <span class="text-gray-400 text-sm">
            ({{ Math.round(extraction.extraction_confidence || 0) }}% přesnost)
          </span>
        </div>
        <button
          @click="showPreview = !showPreview"
          class="text-blue-600 text-sm hover:underline"
        >
          {{ showPreview ? 'Skrýt náhled' : 'Zobrazit náhled' }}
        </button>
      </div>

      <!-- Data Preview -->
      <div v-if="showPreview" class="mt-3 bg-gray-50 rounded p-3">
        <h4 class="font-medium text-sm mb-2">Extrahovaná data:</h4>
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <template v-for="(value, key) in extractedDataPreview" :key="key">
            <dt class="text-gray-500">{{ formatFieldName(key) }}:</dt>
            <dd class="font-mono">{{ value || '-' }}</dd>
          </template>
        </dl>
      </div>
    </div>

    <!-- Failed -->
    <div v-else-if="extraction.ocr_status === 'FAILED'" class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-red-600">
        <span>❌</span>
        <span>Chyba extrakce: {{ errorMessage }}</span>
      </div>
      <button
        @click="$emit('retry')"
        class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
      >
        🔄 Opakovat
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { OcrExtraction } from '@/types';

const props = defineProps<{
  extraction: OcrExtraction;
}>();

defineEmits(['retry']);

const showPreview = ref(false);

const containerClass = computed(() => {
  const classes = {
    PENDING: 'bg-gray-100',
    PROCESSING: 'bg-blue-50',
    COMPLETED: 'bg-green-50',
    FAILED: 'bg-red-50',
  };
  return classes[props.extraction.ocr_status] || 'bg-gray-100';
});

const extractedDataPreview = computed(() => {
  const data = props.extraction.extracted_data;
  if (!data) return {};

  // Show only key fields
  if (props.extraction.document_type === 'ORV') {
    return {
      registrationPlateNumber: data.registrationPlateNumber,
      vin: data.vin,
      make: data.make,
      model: data.model,
      keeperName: data.keeperName,
    };
  } else {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
      personalNumber: data.personalNumber,
      permanentStay: data.permanentStay,
    };
  }
});

const errorMessage = computed(() => {
  return props.extraction.errors?.message || 'Neznámá chyba';
});

const fieldNameMap: Record<string, string> = {
  registrationPlateNumber: 'SPZ',
  vin: 'VIN',
  make: 'Značka',
  model: 'Model',
  keeperName: 'Majitel',
  firstName: 'Jméno',
  lastName: 'Příjmení',
  personalNumber: 'Rodné číslo',
  permanentStay: 'Trvalý pobyt',
};

function formatFieldName(key: string): string {
  return fieldNameMap[key] || key;
}
</script>
```

---

## Extracted Data Preview

### ORV Fields
| Key | Display Name |
|-----|--------------|
| registrationPlateNumber | SPZ |
| vin | VIN |
| make | Značka |
| model | Model |
| keeperName | Provozovatel |

### VTP Fields
| Key | Display Name |
|-----|--------------|
| registrationPlateNumber | SPZ |
| vin | VIN |
| ownerName | Vlastník |
| ownerIco | IČO vlastníka |
| ownerAddress | Adresa vlastníka |

### OP Fields
| Key | Display Name |
|-----|--------------|
| firstName | Jméno |
| lastName | Příjmení |
| personalNumber | Rodné číslo |
| permanentStay | Trvalý pobyt |

---

## Validation Commands

```bash
# Run OcrStatus component tests
cd MVPScope/frontend && npm run test -- --filter="OcrStatus"

# Run all frontend tests
cd MVPScope/frontend && npm run test
```

---

## Validation Criteria

- [ ] All OcrStatus component tests pass
- [ ] All 4 status states display correctly
- [ ] Processing shows animated spinner
- [ ] Completed shows confidence percentage
- [ ] Data preview expands/collapses
- [ ] Failed shows error message
- [ ] Retry button triggers event

---

## Completion Checklist

- [ ] OcrStatus.vue created
- [ ] All states styled
- [ ] Data preview working
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
