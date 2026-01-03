# Task 3.8: Validation Result Component

> **Phase**: 3 - Frontend
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: 3.1 Vue.js Setup, 2.8 Validation Run Deploy
> **Estimated Effort**: Medium

---

## Objective

Create a component to display validation results with overall status, field-level comparisons, and identified issues.

---

## UI Specification

```
┌─────────────────────────────────────────────────────────────┐
│  Krok 4: Výsledek validace                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │     🟢 GREEN - Schváleno                                ││
│  │     Všechny kontroly prošly úspěšně                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Porovnání polí                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Pole        │ Manuální      │ OCR           │ Status   ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ VIN         │ YV1PZA...985  │ YV1PZA...985  │ 🟢 MATCH ││
│  │ SPZ         │ 5L94454       │ 5L94454       │ 🟢 MATCH ││
│  │ Majitel     │ OSIT S.R.O.   │ OSIT S.R.O.   │ 🟢 MATCH ││
│  │ Značka      │ VOLVO         │ VOLVO         │ 🟢 MATCH ││
│  │ Model       │ V90           │ V90 CROSS...  │ 🟠 85%   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Upozornění (1)                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚠️ Model - Částečná shoda (85%)                         ││
│  │    Manuální: "V90" vs OCR: "V90 CROSS COUNTRY"          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│                              [Zpět na dashboard]             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

**src/components/validation/ValidationResult.vue**:
```vue
<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-bold mb-6">Krok 4: Výsledek validace</h2>

    <!-- Overall Status Banner -->
    <div :class="statusBannerClass" class="rounded-lg p-6 mb-6 text-center">
      <div class="text-4xl mb-2">{{ statusIcon }}</div>
      <div class="text-2xl font-bold">{{ statusLabel }}</div>
      <div class="text-sm mt-1 opacity-80">{{ statusDescription }}</div>
    </div>

    <!-- Attempt Info -->
    <div class="text-sm text-gray-500 mb-4">
      Pokus #{{ result.attempt_number }} •
      {{ formatDate(result.completed_at) }} •
      {{ result.duration_ms }}ms
    </div>

    <!-- Field Comparisons -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-3">Porovnání polí</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full border rounded-lg">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pole</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manuální hodnota</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OCR hodnota</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="field in result.field_validations"
              :key="field.field"
              :class="getRowClass(field.status)"
            >
              <td class="px-4 py-3 font-medium">{{ formatFieldName(field.field) }}</td>
              <td class="px-4 py-3 font-mono text-sm">
                {{ truncate(field.manual || field.expected, 30) }}
              </td>
              <td class="px-4 py-3 font-mono text-sm">
                {{ truncate(field.ocr || field.actual, 30) }}
              </td>
              <td class="px-4 py-3">
                <FieldStatus :field="field" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Issues -->
    <div v-if="result.issues && result.issues.length > 0" class="mb-6">
      <h3 class="text-lg font-semibold mb-3">
        Upozornění ({{ result.issues.length }})
      </h3>
      <div class="space-y-2">
        <div
          v-for="(issue, index) in result.issues"
          :key="index"
          :class="getIssueClass(issue.severity)"
          class="rounded-lg p-4"
        >
          <div class="flex items-start gap-2">
            <span>{{ getIssueSeverityIcon(issue.severity) }}</span>
            <div>
              <div class="font-medium">
                {{ formatFieldName(issue.field) }} - {{ issue.message }}
              </div>
              <div v-if="issue.details" class="text-sm mt-1 opacity-80">
                Manuální: "{{ issue.details.manual }}"
                vs OCR: "{{ issue.details.ocr }}"
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-between pt-4 border-t">
      <button
        @click="$emit('retry')"
        class="px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        🔄 Opakovat validaci
      </button>
      <button
        @click="$emit('close')"
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Zpět na dashboard
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import FieldStatus from './FieldStatus.vue';
import type { ValidationResult, FieldValidation } from '@/types';

const props = defineProps<{
  result: ValidationResult;
}>();

defineEmits(['retry', 'close']);

const statusConfig = computed(() => {
  const configs = {
    GREEN: {
      icon: '🟢',
      label: 'GREEN - Schváleno',
      description: 'Všechny kontroly prošly úspěšně',
      bannerClass: 'bg-green-100 text-green-800',
    },
    ORANGE: {
      icon: '🟠',
      label: 'ORANGE - K přezkoumání',
      description: 'Některé kontroly vyžadují manuální ověření',
      bannerClass: 'bg-orange-100 text-orange-800',
    },
    RED: {
      icon: '🔴',
      label: 'RED - Zablokováno',
      description: 'Kritické nesrovnalosti - transakce zamítnuta',
      bannerClass: 'bg-red-100 text-red-800',
    },
  };
  return configs[props.result.overall_status] || configs.RED;
});

const statusIcon = computed(() => statusConfig.value.icon);
const statusLabel = computed(() => statusConfig.value.label);
const statusDescription = computed(() => statusConfig.value.description);
const statusBannerClass = computed(() => statusConfig.value.bannerClass);

function formatDate(date: string): string {
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: cs });
}

function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    vin: 'VIN',
    spz: 'SPZ',
    majitel: 'Majitel',
    znacka: 'Značka',
    model: 'Model',
    datum_1_registrace: '1. registrace',
    name: 'Jméno',
    personal_id: 'Rodné číslo',
    company_id: 'IČO',
    address_street: 'Ulice',
    address_city: 'Město',
    address_postal_code: 'PSČ',
  };
  return names[field] || field;
}

function truncate(text: string | null, length: number): string {
  if (!text) return '-';
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function getRowClass(status: string): string {
  const classes = {
    GREEN: 'bg-green-50',
    ORANGE: 'bg-orange-50',
    RED: 'bg-red-50',
  };
  return classes[status] || '';
}

function getIssueClass(severity: string): string {
  const classes = {
    CRITICAL: 'bg-red-100 text-red-800',
    WARNING: 'bg-orange-100 text-orange-800',
    INFO: 'bg-blue-100 text-blue-800',
  };
  return classes[severity] || 'bg-gray-100';
}

function getIssueSeverityIcon(severity: string): string {
  const icons = {
    CRITICAL: '🔴',
    WARNING: '⚠️',
    INFO: 'ℹ️',
  };
  return icons[severity] || '•';
}
</script>
```

---

## FieldStatus Component

**src/components/validation/FieldStatus.vue**:
```vue
<template>
  <span :class="statusClass" class="px-2 py-1 rounded text-xs font-medium">
    {{ icon }} {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FieldValidation } from '@/types';

const props = defineProps<{
  field: FieldValidation;
}>();

const config = computed(() => {
  if (props.field.result === 'MATCH') {
    return {
      icon: '🟢',
      label: 'MATCH',
      class: 'bg-green-100 text-green-800',
    };
  }

  if (props.field.result === 'MISMATCH') {
    if (props.field.status === 'RED') {
      return {
        icon: '🔴',
        label: 'MISMATCH',
        class: 'bg-red-100 text-red-800',
      };
    }
    // Fuzzy match with similarity
    const similarity = props.field.similarity
      ? `${Math.round(props.field.similarity * 100)}%`
      : 'PARTIAL';
    return {
      icon: '🟠',
      label: similarity,
      class: 'bg-orange-100 text-orange-800',
    };
  }

  if (props.field.result === 'MISSING') {
    return {
      icon: '⚪',
      label: 'MISSING',
      class: 'bg-gray-100 text-gray-600',
    };
  }

  return {
    icon: '•',
    label: props.field.result || 'UNKNOWN',
    class: 'bg-gray-100',
  };
});

const icon = computed(() => config.value.icon);
const label = computed(() => config.value.label);
const statusClass = computed(() => config.value.class);
</script>
```

---

## Validation Criteria

- [ ] Overall status banner displays correctly (GREEN/ORANGE/RED)
- [ ] Field comparison table shows all fields
- [ ] Status column shows MATCH/MISMATCH/MISSING
- [ ] Fuzzy matches show percentage
- [ ] Issues section lists all warnings/errors
- [ ] Issue severity icons correct
- [ ] Retry button works
- [ ] Close button navigates to dashboard

---

## Completion Checklist

- [x] ValidationResult.vue created
- [x] FieldStatus.vue created
- [x] All status variants styled
- [x] Issues display working
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
