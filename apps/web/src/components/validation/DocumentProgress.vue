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
