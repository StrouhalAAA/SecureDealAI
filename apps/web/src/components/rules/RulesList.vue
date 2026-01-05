<template>
  <div class="rules-list">
    <!-- Filters -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Hledat pravidla (ID, název, popis)..."
            class="search-input"
          />
        </div>

        <div class="filter-chips">
          <button
            v-for="chip in filterChips"
            :key="chip.value"
            :class="['filter-chip', { active: activeChip === chip.value }]"
            @click="setActiveChip(chip.value)"
          >
            {{ chip.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table v-if="!loading && filteredRules.length > 0">
        <thead>
          <tr>
            <th class="col-id">ID</th>
            <th class="col-name">Název pravidla</th>
            <th class="col-severity">Závažnost</th>
            <th class="col-status">Stav</th>
            <th class="col-mapping">Zdroj → Cíl</th>
            <th class="col-comparison">Porovnání</th>
            <th class="col-actions">Akce</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in filteredRules" :key="rule.id" class="rule-row">
            <td class="rule-id">{{ rule.rule_id }}</td>
            <td class="rule-name-cell">
              <div class="rule-name">{{ rule.rule_name }}</div>
              <div v-if="rule.description" class="rule-description">{{ rule.description }}</div>
            </td>
            <td>
              <RuleSeverityBadge :severity="rule.severity" />
            </td>
            <td>
              <RuleStatusBadge :is-active="rule.is_active" :is-draft="rule.is_draft" />
            </td>
            <td class="mapping-cell">
              <div class="mapping-row">
                <RuleEntityBadge :entity="rule.source_entity" />
                <svg class="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                <RuleEntityBadge :entity="rule.target_entity" />
              </div>
              <div class="field-mapping">{{ rule.source_field }} → {{ rule.target_field }}</div>
            </td>
            <td class="comparison-cell">
              <div class="chips-stack">
                <RuleChip type="comparator" :value="rule.comparator" />
                <template v-if="rule.transform && rule.transform.length > 0">
                  <RuleChip
                    v-for="(t, idx) in rule.transform"
                    :key="idx"
                    type="transform"
                    :value="t.type"
                  />
                </template>
              </div>
            </td>
            <td class="actions-cell">
              <button class="action-btn" title="Upravit" @click.stop="$emit('edit', rule)">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button
                v-if="!rule.is_active"
                class="action-btn action-activate"
                title="Aktivovat"
                @click.stop="$emit('activate', rule)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </button>
              <button
                v-if="rule.is_active"
                class="action-btn action-deactivate"
                title="Deaktivovat"
                @click.stop="$emit('deactivate', rule)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
                </svg>
              </button>
              <button class="action-btn" title="Klonovat" @click.stop="$emit('clone', rule)">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                </svg>
              </button>
              <button
                v-if="!rule.is_active"
                class="action-btn action-delete"
                title="Smazat"
                @click.stop="$emit('delete', rule)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Loading State -->
      <div v-if="loading" class="state-container">
        <div class="spinner"></div>
        <p>Načítání pravidel...</p>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && filteredRules.length === 0" class="state-container">
        <p>Žádná pravidla nenalezena</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.total_pages > 1" class="pagination">
      <div class="pagination-info">
        Zobrazeno <span class="font-medium">{{ paginationStart }}-{{ paginationEnd }}</span>
        z <span class="font-medium">{{ pagination.total }}</span> pravidel
      </div>
      <div class="pagination-buttons">
        <button
          :disabled="pagination.page === 1"
          @click="$emit('page', pagination.page - 1)"
          class="pagination-btn"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
        <span class="pagination-current">{{ pagination.page }}</span>
        <button
          :disabled="pagination.page === pagination.total_pages"
          @click="$emit('page', pagination.page + 1)"
          class="pagination-btn"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import RuleStatusBadge from './RuleStatusBadge.vue';
import RuleSeverityBadge from './RuleSeverityBadge.vue';
import RuleEntityBadge from './RuleEntityBadge.vue';
import RuleChip from './RuleChip.vue';
import type { RuleResponse } from '@/composables/useRules';

const props = defineProps<{
  rules: RuleResponse[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}>();

defineEmits<{
  (e: 'edit', rule: RuleResponse): void;
  (e: 'activate', rule: RuleResponse): void;
  (e: 'deactivate', rule: RuleResponse): void;
  (e: 'clone', rule: RuleResponse): void;
  (e: 'delete', rule: RuleResponse): void;
  (e: 'filter', filters: Record<string, string>): void;
  (e: 'page', page: number): void;
}>();

const searchQuery = ref('');
const activeChip = ref('all');

const filterChips = [
  { label: 'Vše', value: 'all' },
  { label: 'Vozidlo', value: 'vehicle' },
  { label: 'Dodavatel', value: 'vendor' },
  { label: 'ARES', value: 'ares' },
  { label: 'OCR', value: 'ocr' },
];

function setActiveChip(value: string) {
  activeChip.value = value;
}

const filteredRules = computed(() => {
  // Defensive: ensure rules is always an array
  let result = props.rules ?? [];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(rule =>
      rule.rule_id?.toLowerCase().includes(query) ||
      rule.rule_name?.toLowerCase().includes(query) ||
      (rule.description && rule.description.toLowerCase().includes(query))
    );
  }

  if (activeChip.value !== 'all') {
    result = result.filter(rule => {
      const source = (rule.source_entity || '').toLowerCase();
      const target = (rule.target_entity || '').toLowerCase();
      if (activeChip.value === 'ocr') {
        return source.startsWith('ocr') || target.startsWith('ocr');
      }
      return source === activeChip.value || target === activeChip.value;
    });
  }

  return result;
});

const paginationStart = computed(() => (props.pagination.page - 1) * props.pagination.limit + 1);
const paginationEnd = computed(() => Math.min(props.pagination.page * props.pagination.limit, props.pagination.total));
</script>

<style scoped>
.rules-list {
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #E5E7EB;
  overflow: hidden;
}

.filters-section { padding: 1rem; border-bottom: 1px solid #E5E7EB; }
.filters-row { display: flex; align-items: center; gap: 1rem; }

.search-box { position: relative; flex: 1; max-width: 28rem; }
.search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); width: 1.25rem; height: 1.25rem; color: #9CA3AF; }
.search-input { width: 100%; padding: 0.5rem 0.75rem 0.5rem 2.5rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; font-size: 0.875rem; outline: none; }
.search-input:focus { border-color: #2563EB; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2); }

.filter-chips { display: flex; gap: 0.5rem; }
.filter-chip { padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; background: #F3F4F6; color: #374151; border: none; cursor: pointer; transition: all 0.15s; }
.filter-chip:hover { background: #E5E7EB; }
.filter-chip.active { background: #DBEAFE; color: #1D4ED8; }

.table-container { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
td { padding: 0.75rem 1rem; font-size: 0.875rem; color: #111827; border-bottom: 1px solid #E5E7EB; }
.rule-row:hover { background: #F9FAFB; }

.col-id { width: 7rem; }
.col-severity { width: 7rem; }
.col-status { width: 6rem; }
.col-actions { width: 8rem; text-align: center; }

.rule-id { font-family: 'JetBrains Mono', 'Consolas', monospace; font-weight: 500; color: #2563EB; }
.rule-name-cell { max-width: 16rem; }
.rule-name { font-weight: 500; color: #111827; }
.rule-description { font-size: 0.75rem; color: #6B7280; margin-top: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mapping-cell { min-width: 12rem; }
.mapping-row { display: flex; align-items: center; gap: 0.5rem; }
.arrow-icon { width: 1rem; height: 1rem; color: #9CA3AF; }
.field-mapping { font-size: 0.75rem; font-family: 'JetBrains Mono', 'Consolas', monospace; color: #6B7280; margin-top: 0.25rem; }

.comparison-cell { min-width: 8rem; }
.chips-stack { display: flex; flex-direction: column; gap: 0.25rem; }

.actions-cell { text-align: center; }
.action-btn { padding: 0.375rem; background: transparent; border: none; color: #6B7280; cursor: pointer; border-radius: 0.25rem; transition: all 0.15s; }
.action-btn:hover { background: #F3F4F6; color: #2563EB; }
.action-btn svg { width: 1rem; height: 1rem; }
.action-activate:hover { color: #059669; background: #ECFDF5; }
.action-deactivate:hover { color: #D97706; background: #FEF3C7; }
.action-delete:hover { color: #DC2626; background: #FEE2E2; }

.state-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; color: #6B7280; }
.spinner { width: 2rem; height: 2rem; border: 2px solid #E5E7EB; border-top-color: #2563EB; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }
@keyframes spin { to { transform: rotate(360deg); } }

.pagination { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-top: 1px solid #E5E7EB; background: #F9FAFB; }
.pagination-info { font-size: 0.875rem; color: #374151; }
.pagination-buttons { display: flex; align-items: center; gap: 0.5rem; }
.pagination-btn { padding: 0.25rem 0.75rem; border: 1px solid #D1D5DB; border-radius: 0.5rem; background: white; cursor: pointer; }
.pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-btn:not(:disabled):hover { background: #F3F4F6; }
.pagination-btn svg { width: 1rem; height: 1rem; }
.pagination-current { padding: 0.25rem 0.75rem; background: #2563EB; color: white; border-radius: 0.5rem; font-size: 0.875rem; }
.font-medium { font-weight: 500; }
</style>
