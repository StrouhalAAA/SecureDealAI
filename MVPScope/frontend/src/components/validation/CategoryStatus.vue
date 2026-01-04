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
        <svg
          class="h-4 w-4 text-gray-400 transition-transform"
          :class="{ 'rotate-180': expanded }"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
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
import { computed, h } from 'vue';
import FieldStatusBadge from './FieldStatusBadge.vue';
import type { CategoryResult } from '@/types';

const props = defineProps<{
  title: string;
  icon: 'car' | 'user' | 'building';
  category?: CategoryResult;
  expanded: boolean;
}>();

defineEmits(['toggle']);

// SVG icon components
const TruckIcon = {
  render() {
    return h('svg', {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
    }, [
      h('path', {
        d: 'M16 3h5v8h-5M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'
      })
    ]);
  }
};

const UserIcon = {
  render() {
    return h('svg', {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
    }, [
      h('path', { d: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' }),
      h('circle', { cx: '12', cy: '7', r: '4' })
    ]);
  }
};

const BuildingIcon = {
  render() {
    return h('svg', {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
    }, [
      h('rect', { x: '4', y: '2', width: '16', height: '20', rx: '2', ry: '2' }),
      h('path', { d: 'M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01' })
    ]);
  }
};

const iconComponent = computed(() => {
  const icons = {
    car: TruckIcon,
    user: UserIcon,
    building: BuildingIcon,
  };
  return icons[props.icon] || TruckIcon;
});

const totalCount = computed(() => props.category?.fields_checked ?? 0);
const passedCount = computed(() => props.category?.fields_passed ?? 0);

const statusIcon = computed(() => {
  if (!props.category) return '\u26AA'; // white circle
  const status = props.category.status;
  const icons: Record<string, string> = {
    GREEN: '\uD83D\uDFE2',   // green circle
    ORANGE: '\uD83D\uDFE0', // orange circle
    RED: '\uD83D\uDD34',    // red circle
    INCOMPLETE: '\u26AA',   // white circle
  };
  return icons[status] || '\u26AA';
});

const statusBadgeClass = computed(() => {
  if (!props.category) return 'bg-gray-100 text-gray-600';
  const status = props.category.status;
  const classes: Record<string, string> = {
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
