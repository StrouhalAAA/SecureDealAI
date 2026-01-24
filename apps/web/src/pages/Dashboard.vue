<template>
  <div>
    <!-- App Description Section -->
    <section class="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
      <h2 class="text-lg font-semibold text-blue-900 mb-2">O aplikaci</h2>
      <ul class="text-sm text-blue-800 space-y-1">
        <li>• Tato aplikace slouží k simulaci procesu nákupu vozidel</li>
        <li>• Umožňuje validovat data podle definovaných pravidel</li>
        <li>• Podporuje tvorbu nových validačních pravidel pro end-to-end testování</li>
      </ul>
    </section>

    <!-- Action Bar -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900">Příležitosti k nákupu</h2>
      <button
        @click="openNewOpportunity"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        + Nová výkupní příležitost
      </button>
    </div>

    <!-- Main Content -->
      <!-- Search -->
      <div class="mb-6">
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Hledat podle SPZ..."
            class="flex-1 px-4 py-2 border rounded-lg"
            aria-label="Vyhledávání příležitostí podle SPZ"
            @keyup.enter="search"
          />
          <button
            @click="search"
            class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Hledat
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="mt-4 text-gray-600">Načítání...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-700">{{ error }}</p>
        <button @click="fetchOpportunities" class="mt-2 text-red-600 underline">
          Zkusit znovu
        </button>
      </div>

      <!-- Table -->
      <div v-else class="bg-white shadow rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SPZ</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prodejce</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vytvořeno</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Akce</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="opp in opportunities" :key="opp.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap font-mono font-bold">
                {{ opp.spz }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <StatusBadge :status="opp.status" />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-700 max-w-xs truncate" :title="opp.vendors?.name || ''">
                {{ opp.vendors?.name || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                {{ formatDate(opp.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <button
                  @click="openDetail(opp.id)"
                  class="text-blue-600 hover:text-blue-800 mr-4"
                >
                  Otevřít
                </button>
                <button
                  @click="confirmDelete(opp)"
                  class="text-red-600 hover:text-red-800"
                >
                  Smazat
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div v-if="opportunities.length === 0" class="text-center py-12 text-gray-500">
          Žádné příležitosti k zobrazení
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t flex justify-between items-center">
          <span class="text-sm text-gray-500">
            Zobrazeno {{ pagination.from }}-{{ pagination.to }} z {{ pagination.total }}
          </span>
          <div class="flex gap-2">
            <button
              @click="prevPage"
              :disabled="pagination.page === 1"
              class="px-3 py-1 border rounded disabled:opacity-50"
            >
              Předchozí
            </button>
            <button
              @click="nextPage"
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 py-1 border rounded disabled:opacity-50"
            >
              Další
            </button>
          </div>
        </div>
      </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/composables/useSupabase';
import StatusBadge from '@/components/shared/StatusBadge.vue';
import type { BuyingOpportunity, BuyingOpportunityWithVendor } from '@/types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const router = useRouter();

const opportunities = ref<BuyingOpportunityWithVendor[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');

const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  from: 0,
  to: 0,
  totalPages: 0,
});

async function fetchOpportunities() {
  loading.value = true;
  error.value = null;

  try {
    const from = (pagination.value.page - 1) * pagination.value.limit;
    const to = from + pagination.value.limit - 1;

    let query = supabase
      .from('buying_opportunities')
      .select('*, vendors(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (searchQuery.value) {
      query = query.ilike('spz', `%${searchQuery.value}%`);
    }

    const { data, error: fetchError, count } = await query;

    if (fetchError) throw fetchError;

    opportunities.value = data || [];
    pagination.value.total = count || 0;
    pagination.value.from = opportunities.value.length > 0 ? from + 1 : 0;
    pagination.value.to = Math.min(from + (data?.length || 0), count || 0);
    pagination.value.totalPages = Math.ceil((count || 0) / pagination.value.limit);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chyba při načítání dat';
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return format(d, 'dd.MM.yyyy', { locale: cs });
  } catch {
    return '-';
  }
}

function openDetail(id: string) {
  router.push(`/opportunity/${id}`);
}

function openNewOpportunity() {
  router.push('/new-opportunity');
}

function confirmDelete(opp: BuyingOpportunity) {
  if (confirm(`Opravdu chcete smazat příležitost ${opp.spz}?`)) {
    deleteOpportunity(opp.id);
  }
}

async function deleteOpportunity(id: string) {
  try {
    const { error: deleteError } = await supabase.from('buying_opportunities').delete().eq('id', id);
    if (deleteError) throw deleteError;
    fetchOpportunities();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chyba při mazání';
  }
}

function search() {
  pagination.value.page = 1;
  fetchOpportunities();
}

function prevPage() {
  if (pagination.value.page > 1) {
    pagination.value.page--;
    fetchOpportunities();
  }
}

function nextPage() {
  if (pagination.value.page < pagination.value.totalPages) {
    pagination.value.page++;
    fetchOpportunities();
  }
}

onMounted(fetchOpportunities);
</script>
