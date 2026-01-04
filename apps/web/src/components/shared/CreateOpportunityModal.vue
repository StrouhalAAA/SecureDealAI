<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">Nová nákupní příležitost</h2>

      <form @submit.prevent="create">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            SPZ (registrační značka)
          </label>
          <input
            v-model="spz"
            type="text"
            placeholder="např. 5L94454"
            class="w-full px-4 py-2 border rounded-lg uppercase"
            required
            pattern="[A-Za-z0-9]{5,10}"
          />
        </div>

        <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
          {{ error }}
        </div>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Zrušit
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading ? 'Vytvářím...' : 'Vytvořit' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/composables/useSupabase';
import type { BuyingOpportunity } from '@/types';

const emit = defineEmits<{
  close: [];
  created: [data: BuyingOpportunity];
}>();

const spz = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function create() {
  loading.value = true;
  error.value = null;

  try {
    const { data, error: createError } = await supabase
      .from('buying_opportunities')
      .insert({ spz: spz.value.toUpperCase() })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        error.value = 'Příležitost s touto SPZ již existuje';
      } else {
        throw createError;
      }
      return;
    }

    emit('created', data);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chyba při vytváření';
  } finally {
    loading.value = false;
  }
}
</script>
