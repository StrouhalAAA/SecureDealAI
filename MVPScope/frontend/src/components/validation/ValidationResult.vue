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
import type { ValidationResult, ValidationStatus } from '@/types';

const props = defineProps<{
  result: ValidationResult;
}>();

defineEmits(['retry', 'close']);

const statusConfig = computed(() => {
  const configs: Record<ValidationStatus, {
    icon: string;
    label: string;
    description: string;
    bannerClass: string;
  }> = {
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

function truncate(text: string | null | undefined, length: number): string {
  if (!text) return '-';
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function getRowClass(status: ValidationStatus): string {
  const classes: Record<ValidationStatus, string> = {
    GREEN: 'bg-green-50',
    ORANGE: 'bg-orange-50',
    RED: 'bg-red-50',
  };
  return classes[status] || '';
}

function getIssueClass(severity: string): string {
  const classes: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-800',
    WARNING: 'bg-orange-100 text-orange-800',
    INFO: 'bg-blue-100 text-blue-800',
  };
  return classes[severity] || 'bg-gray-100';
}

function getIssueSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    CRITICAL: '🔴',
    WARNING: '⚠️',
    INFO: 'ℹ️',
  };
  return icons[severity] || '•';
}
</script>
