# UI Implementation: Rules Management

> **Executing Agent:** ui-agent
> **Parent Spec:** [../feature-rules-management-ui.md](../feature-rules-management-ui.md)
> **Status:** Ready for execution

---

## Context

This document is executed by the UI agent as part of the Rules Management UI feature. All shared contracts (TypeScript types, API shapes) are defined in the parent spec.

## Input Contracts

The following types are available from `apps/web/src/composables/useRules.ts`:

```typescript
// Already exists - use as-is
interface RuleResponse {
  id: string;
  rule_id: string;
  rule_name: string;
  description?: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  is_active: boolean;
  is_draft: boolean;
  source_entity: string;
  source_field: string;
  target_entity: string;
  target_field: string;
  comparator: string;
  transform?: Array<{ type: string; params?: Record<string, unknown> }>;
}

// Will be added by Phase 1
type TransformType = 'UPPERCASE' | 'LOWERCASE' | ... ;
type ComparatorType = 'EXACT' | 'FUZZY' | ... ;
type EntityType = 'vehicle' | 'vendor' | ... ;
```

## Design Reference

- **Mockup:** `docs/design/validation-rules-management-mockup.html`
- **Color Palette:**
  - Critical: `bg: #FEE2E2, text: #991B1B`
  - Warning: `bg: #FFEDD5, text: #9A3412`
  - Info: `bg: #DBEAFE, text: #1E40AF`
  - Active: `bg: #D1FAE5, text: #065F46`
  - Inactive: `bg: #F3F4F6, text: #6B7280`

---

## Scope

Build the following components and page:

| # | Component | Type | Purpose |
|---|-----------|------|---------|
| 1 | `RuleSeverityBadge.vue` | New | Display CRITICAL/WARNING/INFO badges |
| 2 | `RuleEntityBadge.vue` | New | Display entity type badges (vehicle, vendor, ocr, etc.) |
| 3 | `RuleChip.vue` | New | Display transform/comparator chips |
| 4 | `RulesStatsBar.vue` | New | Stats bar with counts |
| 5 | `RuleStatusBadge.vue` | Update | Light theme active/inactive/draft badges |
| 6 | `RulesList.vue` | Refactor | Light theme table with all badges |
| 7 | `RulesManagement.vue` | New | Main page component |

---

## Step-by-Step Implementation

### Step 1: Create RuleSeverityBadge Component

**File:** `apps/web/src/components/rules/RuleSeverityBadge.vue`

```vue
<template>
  <span :class="['severity-badge', `severity-${severity.toLowerCase()}`]">
    {{ severity }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}>();
</script>

<style scoped>
.severity-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.severity-critical {
  background-color: #FEE2E2;
  color: #991B1B;
}

.severity-warning {
  background-color: #FFEDD5;
  color: #9A3412;
}

.severity-info {
  background-color: #DBEAFE;
  color: #1E40AF;
}
</style>
```

---

### Step 2: Create RuleEntityBadge Component

**File:** `apps/web/src/components/rules/RuleEntityBadge.vue`

```vue
<template>
  <span :class="['entity-badge', entityClass]">
    {{ entity }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  entity: string;
}>();

const entityClass = computed(() => {
  const entityLower = props.entity.toLowerCase();
  if (entityLower === 'vehicle') return 'entity-vehicle';
  if (entityLower === 'vendor') return 'entity-vendor';
  if (entityLower.startsWith('ocr')) return 'entity-ocr';
  if (entityLower === 'ares') return 'entity-ares';
  if (entityLower === 'adis') return 'entity-adis';
  if (entityLower === 'cebia') return 'entity-cebia';
  return 'entity-default';
});
</script>

<style scoped>
.entity-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.entity-vehicle { background-color: #E0E7FF; color: #3730A3; }
.entity-vendor { background-color: #FCE7F3; color: #9D174D; }
.entity-ocr { background-color: #FEF9C3; color: #854D0E; }
.entity-ares { background-color: #CFFAFE; color: #155E75; }
.entity-adis { background-color: #CCFBF1; color: #115E59; }
.entity-cebia { background-color: #FFEDD5; color: #9A3412; }
.entity-default { background-color: #F3F4F6; color: #374151; }
</style>
```

---

### Step 3: Create RuleChip Component

**File:** `apps/web/src/components/rules/RuleChip.vue`

```vue
<template>
  <span :class="['rule-chip', `chip-${type}`]">
    {{ value }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  type: 'transform' | 'comparator';
  value: string;
}>();
</script>

<style scoped>
.rule-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.chip-transform {
  background-color: #EDE9FE;
  color: #5B21B6;
}

.chip-comparator {
  background-color: #ECFDF5;
  color: #047857;
}
</style>
```

---

### Step 4: Create RulesStatsBar Component

**File:** `apps/web/src/components/rules/RulesStatsBar.vue`

```vue
<template>
  <div class="stats-bar">
    <div class="stat-item">
      <span class="stat-value">{{ stats.total }}</span>
      <span class="stat-label">pravidel celkem</span>
    </div>

    <div class="stat-divider"></div>

    <div class="stat-item">
      <span class="stat-dot dot-active"></span>
      <span class="stat-text">{{ stats.active }} aktivních</span>
    </div>

    <div class="stat-item">
      <span class="stat-dot dot-inactive"></span>
      <span class="stat-text">{{ stats.inactive }} neaktivních</span>
    </div>

    <div class="stat-divider"></div>

    <div class="stat-group">
      <div class="stat-severity">
        <span class="severity-badge severity-critical">CRITICAL</span>
        <span class="severity-count">{{ stats.critical }}</span>
      </div>
      <div class="stat-severity">
        <span class="severity-badge severity-warning">WARNING</span>
        <span class="severity-count">{{ stats.warning }}</span>
      </div>
      <div class="stat-severity">
        <span class="severity-badge severity-info">INFO</span>
        <span class="severity-count">{{ stats.info }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RuleResponse } from '@/composables/useRules';

const props = defineProps<{
  rules: RuleResponse[];
}>();

const stats = computed(() => {
  const rules = props.rules;
  return {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    inactive: rules.filter(r => !r.is_active).length,
    critical: rules.filter(r => r.severity === 'CRITICAL').length,
    warning: rules.filter(r => r.severity === 'WARNING').length,
    info: rules.filter(r => r.severity === 'INFO').length,
  };
});
</script>

<style scoped>
.stats-bar {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border-bottom: 1px solid #E5E7EB;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 0.875rem;
  color: #6B7280;
}

.stat-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.stat-divider {
  width: 1px;
  height: 2rem;
  background: #E5E7EB;
}

.stat-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.dot-active { background-color: #10B981; }
.dot-inactive { background-color: #9CA3AF; }

.stat-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-severity {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.severity-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.severity-critical { background-color: #FEE2E2; color: #991B1B; }
.severity-warning { background-color: #FFEDD5; color: #9A3412; }
.severity-info { background-color: #DBEAFE; color: #1E40AF; }

.severity-count {
  font-size: 0.875rem;
  color: #4B5563;
}
</style>
```

---

### Step 5: Update RuleStatusBadge Component

**File:** `apps/web/src/components/rules/RuleStatusBadge.vue` (REPLACE ENTIRE FILE)

```vue
<template>
  <span :class="['status-badge', statusClass]">
    <svg v-if="isActive" class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>
    <svg v-else-if="isDraft" class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
    </svg>
    <svg v-else class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" />
    </svg>
    {{ statusText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isActive: boolean;
  isDraft: boolean;
}>();

const statusClass = computed(() => {
  if (props.isActive) return 'status-active';
  if (props.isDraft) return 'status-draft';
  return 'status-inactive';
});

const statusText = computed(() => {
  if (props.isActive) return 'Aktivní';
  if (props.isDraft) return 'Draft';
  return 'Neaktivní';
});
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.icon {
  width: 0.875rem;
  height: 0.875rem;
}

.status-active { background-color: #D1FAE5; color: #065F46; }
.status-draft { background-color: #FEF3C7; color: #92400E; }
.status-inactive { background-color: #F3F4F6; color: #6B7280; }
</style>
```

---

### Step 6: Refactor RulesList Component

**File:** `apps/web/src/components/rules/RulesList.vue` (REPLACE ENTIRE FILE)

This is a large component. Key features:
- Light theme table with white background
- Search input with icon
- Quick filter chips (Vše, Vozidlo, Dodavatel, ARES, OCR)
- Source → Target entity mapping visualization
- Transform/Comparator chips
- Action buttons (edit, activate/deactivate, clone, delete)
- Pagination

```vue
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
  let result = props.rules;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(rule =>
      rule.rule_id.toLowerCase().includes(query) ||
      rule.rule_name.toLowerCase().includes(query) ||
      (rule.description && rule.description.toLowerCase().includes(query))
    );
  }

  if (activeChip.value !== 'all') {
    result = result.filter(rule => {
      const source = rule.source_entity.toLowerCase();
      const target = rule.target_entity.toLowerCase();
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
```

---

### Step 7: Create RulesManagement Page

**File:** `apps/web/src/pages/RulesManagement.vue`

```vue
<template>
  <div class="rules-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/')">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </button>
        <div>
          <h1 class="page-title">Validační pravidla</h1>
          <p class="page-subtitle">Správa a konfigurace pravidel pro validaci dat</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" disabled title="Připravuje se">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          Export
        </button>
        <button class="btn-secondary" disabled title="Připravuje se">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          Import
        </button>
        <button class="btn-primary" disabled title="Připravuje se">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          Nové pravidlo
        </button>
      </div>
    </header>

    <!-- Stats Bar -->
    <RulesStatsBar :rules="rules" />

    <!-- Main Content -->
    <main class="page-content">
      <div v-if="error" class="error-banner">
        <p>{{ error }}</p>
        <button @click="loadRules">Zkusit znovu</button>
      </div>

      <RulesList
        :rules="rules"
        :loading="loading"
        :pagination="pagination"
        @edit="handleEdit"
        @activate="handleActivate"
        @deactivate="handleDeactivate"
        @clone="handleClone"
        @delete="handleDelete"
        @filter="handleFilter"
        @page="handlePageChange"
      />
    </main>

    <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRules, type RuleResponse } from '@/composables/useRules';
import RulesStatsBar from '@/components/rules/RulesStatsBar.vue';
import RulesList from '@/components/rules/RulesList.vue';

const { rules, loading, error, pagination, fetchRules, activateRule, deactivateRule } = useRules();

const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' });

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => { toast.value.show = false; }, 3000);
}

async function loadRules() {
  await fetchRules({ status: 'all' });
}

onMounted(() => { loadRules(); });

function handleEdit(rule: RuleResponse) {
  console.log('Edit rule:', rule.rule_id);
  showToast('Editace pravidel bude brzy k dispozici', 'success');
}

async function handleActivate(rule: RuleResponse) {
  const result = await activateRule(rule.rule_id);
  if (result) {
    showToast(`Pravidlo ${rule.rule_id} bylo aktivováno`, 'success');
    await loadRules();
  } else {
    showToast(`Aktivace pravidla ${rule.rule_id} selhala`, 'error');
  }
}

async function handleDeactivate(rule: RuleResponse) {
  const result = await deactivateRule(rule.rule_id);
  if (result) {
    showToast(`Pravidlo ${rule.rule_id} bylo deaktivováno`, 'success');
    await loadRules();
  } else {
    showToast(`Deaktivace pravidla ${rule.rule_id} selhala`, 'error');
  }
}

function handleClone(rule: RuleResponse) {
  console.log('Clone rule:', rule.rule_id);
  showToast('Klonování pravidel bude brzy k dispozici', 'success');
}

function handleDelete(rule: RuleResponse) {
  console.log('Delete rule:', rule.rule_id);
  showToast('Mazání pravidel bude brzy k dispozici', 'success');
}

function handleFilter(filters: Record<string, string>) {
  fetchRules({
    status: filters.status as 'active' | 'draft' | 'all',
    source_entity: filters.source_entity,
    severity: filters.severity,
  });
}

function handlePageChange(page: number) {
  fetchRules({ page });
}
</script>

<style scoped>
.rules-page { min-height: 100vh; background: #F9FAFB; }

.page-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: white; border-bottom: 1px solid #E5E7EB; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.header-left { display: flex; align-items: center; gap: 1rem; }
.back-btn { padding: 0.5rem; background: transparent; border: none; color: #6B7280; cursor: pointer; border-radius: 0.375rem; }
.back-btn:hover { background: #F3F4F6; color: #374151; }
.back-btn svg { width: 1.25rem; height: 1.25rem; }
.page-title { font-size: 1.25rem; font-weight: 600; color: #111827; margin: 0; }
.page-subtitle { font-size: 0.875rem; color: #6B7280; margin: 0.25rem 0 0 0; }

.header-actions { display: flex; gap: 0.75rem; }
.btn-secondary, .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.btn-secondary { background: white; color: #374151; border: 1px solid #D1D5DB; }
.btn-secondary:hover:not(:disabled) { background: #F9FAFB; }
.btn-secondary:disabled, .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #2563EB; color: white; border: none; }
.btn-primary:hover:not(:disabled) { background: #1D4ED8; }
.btn-secondary svg, .btn-primary svg { width: 1rem; height: 1rem; }

.page-content { padding: 1.5rem; }

.error-banner { display: flex; justify-content: space-between; align-items: center; padding: 1rem; margin-bottom: 1rem; background: #FEE2E2; border: 1px solid #FECACA; border-radius: 0.5rem; color: #991B1B; }
.error-banner button { padding: 0.375rem 0.75rem; background: white; color: #991B1B; border: 1px solid #FECACA; border-radius: 0.375rem; cursor: pointer; }

.toast { position: fixed; bottom: 1.5rem; right: 1.5rem; padding: 1rem 1.5rem; border-radius: 0.5rem; font-weight: 500; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 50; animation: slideIn 0.3s ease; }
.toast-success { background: #D1FAE5; color: #065F46; }
.toast-error { background: #FEE2E2; color: #991B1B; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
</style>
```

---

## Output Artifacts

After execution, the following files will exist:

| File | Status |
|------|--------|
| `apps/web/src/components/rules/RuleSeverityBadge.vue` | NEW |
| `apps/web/src/components/rules/RuleEntityBadge.vue` | NEW |
| `apps/web/src/components/rules/RuleChip.vue` | NEW |
| `apps/web/src/components/rules/RulesStatsBar.vue` | NEW |
| `apps/web/src/components/rules/RuleStatusBadge.vue` | UPDATED |
| `apps/web/src/components/rules/RulesList.vue` | REFACTORED |
| `apps/web/src/pages/RulesManagement.vue` | NEW |

---

## Does NOT Include

This implementation explicitly excludes:
- Type definitions in `useRules.ts` (handled by Phase 1)
- API endpoint changes (uses existing Rules API)
- Database migrations
- Router configuration changes (assumes `/rules` route exists)
- Unit tests (separate task)
- Rule creation/edit modals (future iteration)
