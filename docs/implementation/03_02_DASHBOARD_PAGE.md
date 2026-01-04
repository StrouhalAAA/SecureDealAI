# Task 3.2: Dashboard Page

> **Phase**: 3 - Frontend
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 3.1 Vue.js Project Setup, 2.1 Buying Opportunity CRUD
> **Estimated Effort**: Medium

---

## Objective

Create the main dashboard page displaying a list of buying opportunities with status indicators and the ability to create new opportunities.

---

## Prerequisites

- [ ] Task 3.1 completed (Vue.js project setup)
- [ ] Task 2.1 completed (Buying Opportunity CRUD API)

---

## Component Tests

### Required Tests (Write Before Implementation)

Create test file: `MVPScope/frontend/src/pages/__tests__/Dashboard.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Dashboard from '../Dashboard.vue'

// Mock Supabase
vi.mock('@/composables/useSupabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({
            data: [
              { id: '1', spz: '5L94454', status: 'DRAFT', created_at: '2026-01-01' },
              { id: '2', spz: '1AB2345', status: 'VALIDATED', created_at: '2026-01-01' },
            ],
            count: 2,
            error: null
          }))
        }))
      }))
    }))
  }
}))

describe('Dashboard', () => {
  let router: any

  beforeEach(() => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Dashboard },
        { path: '/opportunity/:id', component: { template: '<div>Detail</div>' } }
      ]
    })
  })

  it('renders list of opportunities', async () => {
    const wrapper = mount(Dashboard, {
      global: { plugins: [router] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('5L94454')
    expect(wrapper.text()).toContain('1AB2345')
  })

  it('displays create button', () => {
    const wrapper = mount(Dashboard, {
      global: { plugins: [router] }
    })

    expect(wrapper.find('button').text()).toContain('Nová příležitost')
  })

  it('has search input', () => {
    const wrapper = mount(Dashboard, {
      global: { plugins: [router] }
    })

    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('shows pagination controls', async () => {
    const wrapper = mount(Dashboard, {
      global: { plugins: [router] }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Předchozí')
    expect(wrapper.text()).toContain('Další')
  })

  it('navigates to detail on row click', async () => {
    const wrapper = mount(Dashboard, {
      global: { plugins: [router] }
    })
    await flushPromises()

    const openButton = wrapper.findAll('button').find(b => b.text().includes('Otevřít'))
    await openButton?.trigger('click')

    expect(router.currentRoute.value.path).toContain('/opportunity/')
  })
})
```

### Test-First Workflow

1. **RED**: Write tests above, run `npm run test -- --filter="Dashboard"` - they should FAIL
2. **GREEN**: Implement Dashboard.vue until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

---

## UI Specification

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  SecureDealAI                              [+ Nová příležitost] │
├─────────────────────────────────────────────────────────────┤
│  Vyhledávání: [________________] [🔍]                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ SPZ        │ Status    │ Vytvořeno  │ Akce              │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │ 5L94454    │ 🟢 GREEN  │ 01.01.2026 │ [Otevřít] [🗑]    │ │
│  │ 1AB2345    │ 🟠 ORANGE │ 01.01.2026 │ [Otevřít] [🗑]    │ │
│  │ 3XY7890    │ 🔴 RED    │ 31.12.2025 │ [Otevřít] [🗑]    │ │
│  │ 4ZZ1111    │ ⚪ DRAFT  │ 30.12.2025 │ [Otevřít] [🗑]    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Zobrazeno 1-4 z 15                    [← Předchozí] [Další →] │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create Dashboard Page

**src/pages/Dashboard.vue**:
```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">SecureDealAI</h1>
        <button
          @click="openCreateModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nová příležitost
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Search -->
      <div class="mb-6">
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Hledat podle SPZ..."
            class="flex-1 px-4 py-2 border rounded-lg"
            @keyup.enter="search"
          />
          <button
            @click="search"
            class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            🔍
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
                  🗑
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
              ← Předchozí
            </button>
            <button
              @click="nextPage"
              :disabled="pagination.page >= pagination.totalPages"
              class="px-3 py-1 border rounded disabled:opacity-50"
            >
              Další →
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Modal -->
    <CreateOpportunityModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onOpportunityCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/composables/useSupabase';
import StatusBadge from '@/components/shared/StatusBadge.vue';
import CreateOpportunityModal from '@/components/shared/CreateOpportunityModal.vue';
import type { BuyingOpportunity } from '@/types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

const router = useRouter();

const opportunities = ref<BuyingOpportunity[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');
const showCreateModal = ref(false);

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
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (searchQuery.value) {
      query = query.ilike('spz', `%${searchQuery.value}%`);
    }

    const { data, error: fetchError, count } = await query;

    if (fetchError) throw fetchError;

    opportunities.value = data || [];
    pagination.value.total = count || 0;
    pagination.value.from = from + 1;
    pagination.value.to = Math.min(to + 1, count || 0);
    pagination.value.totalPages = Math.ceil((count || 0) / pagination.value.limit);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chyba při načítání dat';
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString: string): string {
  return format(new Date(dateString), 'dd.MM.yyyy', { locale: cs });
}

function openDetail(id: string) {
  router.push(`/opportunity/${id}`);
}

function openCreateModal() {
  showCreateModal.value = true;
}

function onOpportunityCreated(opp: BuyingOpportunity) {
  showCreateModal.value = false;
  router.push(`/opportunity/${opp.id}`);
}

function confirmDelete(opp: BuyingOpportunity) {
  if (confirm(`Opravdu chcete smazat příležitost ${opp.spz}?`)) {
    deleteOpportunity(opp.id);
  }
}

async function deleteOpportunity(id: string) {
  try {
    await supabase.from('buying_opportunities').delete().eq('id', id);
    fetchOpportunities();
  } catch (e) {
    error.value = 'Chyba při mazání';
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
```

### Step 2: Create StatusBadge Component

**src/components/shared/StatusBadge.vue**:
```vue
<template>
  <span :class="badgeClass" class="px-2 py-1 rounded-full text-xs font-medium">
    {{ icon }} {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: 'DRAFT' | 'PENDING' | 'VALIDATED' | 'REJECTED' | 'GREEN' | 'ORANGE' | 'RED';
}>();

const config = computed(() => {
  const configs = {
    DRAFT: { icon: '⚪', label: 'Koncept', class: 'bg-gray-100 text-gray-800' },
    PENDING: { icon: '🔵', label: 'Čeká', class: 'bg-blue-100 text-blue-800' },
    VALIDATED: { icon: '🟢', label: 'Ověřeno', class: 'bg-green-100 text-green-800' },
    REJECTED: { icon: '🔴', label: 'Zamítnuto', class: 'bg-red-100 text-red-800' },
    GREEN: { icon: '🟢', label: 'GREEN', class: 'bg-green-100 text-green-800' },
    ORANGE: { icon: '🟠', label: 'ORANGE', class: 'bg-orange-100 text-orange-800' },
    RED: { icon: '🔴', label: 'RED', class: 'bg-red-100 text-red-800' },
  };
  return configs[props.status] || configs.DRAFT;
});

const icon = computed(() => config.value.icon);
const label = computed(() => config.value.label);
const badgeClass = computed(() => config.value.class);
</script>
```

### Step 3: Create CreateOpportunityModal

**src/components/shared/CreateOpportunityModal.vue**:
```vue
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
            pattern="[A-Z0-9]{5,10}"
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

const emit = defineEmits(['close', 'created']);

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
```

---

## Validation Commands

```bash
# Run Dashboard component tests
cd MVPScope/frontend && npm run test -- --filter="Dashboard"

# Run all frontend tests
cd MVPScope/frontend && npm run test
```

---

## Validation Criteria

- [ ] All Dashboard component tests pass
- [ ] List of opportunities displays correctly
- [ ] Status badges show correct colors
- [ ] Search by SPZ works
- [ ] Pagination works
- [ ] Create new opportunity works
- [ ] Delete opportunity works
- [ ] Navigation to detail page works
- [ ] Loading and error states display

---

## Completion Checklist

- [ ] Dashboard.vue created
- [ ] StatusBadge.vue created
- [ ] CreateOpportunityModal.vue created
- [ ] Supabase integration working
- [ ] All features tested
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
