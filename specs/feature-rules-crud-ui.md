# Feature: Rules CRUD UI - Strategy Document

## Overview

Implement full Create, Read, Update, Delete (CRUD) functionality for the Rules Management UI. This extends the existing read-only rules list (`/rules`) with the ability to create new rules, edit existing rules, clone rules, and delete rules.

**Feature Type:** Pure UI (backend API already complete)
**Complexity:** High
**Estimated Components:** 9 new, 3 modified

## User Story

As an administrator
I want to create, edit, clone, and delete validation rules through a web interface
So that I can maintain and evolve the validation rule set without requiring developer intervention

---

## Shared Contracts

These contracts are established FIRST and shared across all implementation phases. Sub-agents must use these exact definitions.

### TypeScript Types

```typescript
// Location: apps/web/src/composables/useRules.ts (existing)

// Already defined - reuse these
export const TRANSFORM_TYPES = [
  'UPPERCASE', 'LOWERCASE', 'TRIM', 'REMOVE_SPACES', 'REMOVE_DIACRITICS',
  'NORMALIZE_DATE', 'EXTRACT_NUMBER', 'FORMAT_RC', 'FORMAT_ICO', 'FORMAT_DIC',
  'ADDRESS_NORMALIZE', 'NAME_NORMALIZE', 'VIN_NORMALIZE', 'SPZ_NORMALIZE'
] as const;

export const COMPARATOR_TYPES = [
  'EXACT', 'FUZZY', 'CONTAINS', 'REGEX', 'NUMERIC_TOLERANCE',
  'DATE_TOLERANCE', 'EXISTS', 'NOT_EXISTS', 'IN_LIST'
] as const;

export const ENTITY_TYPES = [
  'vehicle', 'vendor', 'buying_opportunity',
  'ocr_orv', 'ocr_op', 'ocr_vtp', 'ares', 'adis', 'cebia', 'dolozky'
] as const;

// NEW types to add
export const SEVERITY_TYPES = ['CRITICAL', 'WARNING', 'INFO'] as const;

export const CATEGORY_TYPES = ['vehicle', 'vendor_fo', 'vendor_po', 'cross', 'external'] as const;

export const VENDOR_TYPES = ['PHYSICAL_PERSON', 'COMPANY'] as const;

export const BUYING_TYPES = ['BRANCH', 'MOBILE_BUYING'] as const;

export type SeverityType = typeof SEVERITY_TYPES[number];
export type CategoryType = typeof CATEGORY_TYPES[number];
export type VendorType = typeof VENDOR_TYPES[number];
export type BuyingType = typeof BUYING_TYPES[number];
```

### Form Data Interface

```typescript
// Location: apps/web/src/components/rules/RuleForm.vue

interface RuleFormData {
  // Basic Info
  rule_id: string;              // Pattern: XXX-NNN (e.g., VEH-001)
  name: string;                 // 3-100 characters
  description: string;          // Optional

  // Source configuration
  source: {
    entity: EntityType;
    field: string;
    transforms: TransformType[];
  };

  // Target configuration
  target: {
    entity: EntityType;
    field: string;
    transforms: TransformType[];
  };

  // Comparison configuration
  comparison: {
    type: ComparatorType;
    threshold?: number;         // 0-1, for FUZZY
    tolerance?: number;         // For NUMERIC_TOLERANCE, DATE_TOLERANCE
    pattern?: string;           // For REGEX
    allowedValues?: string[];   // For IN_LIST
  };

  // Output configuration
  severity: SeverityType;
  blockOnFail: boolean;
  errorMessage: {
    cs: string;                 // Required (Czech)
    en?: string;                // Optional (English)
  };

  // Metadata (Advanced Settings)
  metadata: {
    category?: CategoryType;
    phase?: 'mvp' | 'phase2' | 'future';
    applicableTo?: VendorType[];
    applicableToBuyingType?: BuyingType[];
    priority?: number;
    tags?: string[];
  };
}
```

### API Endpoints (Backend Ready)

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/functions/v1/rules` | POST | Create new rule | `{ rule_definition: {...} }` |
| `/functions/v1/rules/:rule_id` | GET | Get single rule | - |
| `/functions/v1/rules/:rule_id` | PUT | Update existing rule | `{ rule_definition: {...} }` |
| `/functions/v1/rules/:rule_id` | DELETE | Delete rule (soft) | - |
| `/functions/v1/rules/:rule_id/clone` | POST | Clone rule | `{ new_rule_id, new_rule_name }` |
| `/functions/v1/rules/:rule_id/activate` | POST | Activate draft | - |
| `/functions/v1/rules/:rule_id/deactivate` | POST | Deactivate rule | - |

### Validation Rules (Must Match Backend)

```typescript
// Rule ID format
const RULE_ID_PATTERN = /^[A-Z]{2,4}-\d{3}$/;  // e.g., VEH-001, ARES-010

// Name validation
const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 100;

// Comparator-specific validation
const COMPARATOR_PARAMS = {
  FUZZY: { threshold: { required: false, min: 0, max: 1, default: 0.8 } },
  NUMERIC_TOLERANCE: { tolerance: { required: false, type: 'number' } },
  DATE_TOLERANCE: { tolerance: { required: false, type: 'number' } },
  REGEX: { pattern: { required: true, type: 'string' } },
  IN_LIST: { allowedValues: { required: true, type: 'array' } },
};
```

### Design Reference

- **Theme:** Light (consistent with existing RulesManagement.vue)
- **Language:** Czech (primary), with Czech field labels and error messages
- **Form Pattern:** Follow VehicleForm.vue (grid layout, real-time validation, touched state)
- **Modal Pattern:** Follow CreateOpportunityModal.vue (overlay, centered card)

---

## Implementation Phases

### Phase 1: Shared Components
**Handled by:** Main orchestrator
**Dependencies:** None
**Can start:** Immediately

Create reusable components needed by the form:

#### 1.1 TagInput.vue (Shared Component)
**Location:** `apps/web/src/components/shared/TagInput.vue`

**Purpose:** Reusable tag/chip input for multi-value fields

**Props:**
```typescript
interface TagInputProps {
  modelValue: string[];
  placeholder?: string;
  maxTags?: number;
  allowCustom?: boolean;        // Allow typing new values
  suggestions?: string[];       // Predefined suggestions
}
```

**Features:**
- Add tags by typing and pressing Enter
- Remove tags by clicking X or backspace
- Optional dropdown suggestions
- Keyboard navigation

---

#### 1.2 RuleFormSection.vue
**Location:** `apps/web/src/components/rules/RuleFormSection.vue`

**Purpose:** Collapsible section wrapper for form organization

**Props:**
```typescript
interface RuleFormSectionProps {
  title: string;
  description?: string;
  icon?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}
```

**Features:**
- Consistent section styling (white card with shadow)
- Optional collapse/expand functionality
- Chevron icon animation on toggle

---

#### 1.3 TransformMultiSelect.vue
**Location:** `apps/web/src/components/rules/TransformMultiSelect.vue`

**Purpose:** Multi-select chips for selecting transforms

**Props:**
```typescript
interface TransformMultiSelectProps {
  modelValue: TransformType[];
  label?: string;
  helpText?: string;
}
```

**Features:**
- Displays all 14 transforms as selectable chips
- Selected chips highlighted with checkmark
- Chips grouped by category (case, data, formatting, normalization)

---

#### 1.4 ComparatorParamsInput.vue
**Location:** `apps/web/src/components/rules/ComparatorParamsInput.vue`

**Purpose:** Dynamic parameter inputs based on comparator type

**Props:**
```typescript
interface ComparatorParamsInputProps {
  comparatorType: ComparatorType;
  modelValue: Record<string, unknown>;
}
```

**Conditional Fields:**
| Comparator | Field | Input Type | Validation |
|------------|-------|------------|------------|
| FUZZY | threshold | Range slider (0-1) | Default: 0.8 |
| NUMERIC_TOLERANCE | tolerance | Number input | Positive number |
| DATE_TOLERANCE | tolerance | Number input | Days as integer |
| REGEX | pattern | Text input | Valid regex |
| IN_LIST | allowedValues | TagInput | At least 1 value |
| EXACT, CONTAINS, EXISTS, NOT_EXISTS | - | None | - |

**Outputs (Phase 1):**
- `apps/web/src/components/shared/TagInput.vue`
- `apps/web/src/components/rules/RuleFormSection.vue`
- `apps/web/src/components/rules/TransformMultiSelect.vue`
- `apps/web/src/components/rules/ComparatorParamsInput.vue`

---

### Phase 2: Main Form Component
**Handled by:** ui-agent
**Spec:** [./feature-rules-crud-ui/01-rule-form.md](./feature-rules-crud-ui/01-rule-form.md)
**Dependencies:** Phase 1 components
**Can start:** After Phase 1

#### 2.1 RuleForm.vue
**Location:** `apps/web/src/components/rules/RuleForm.vue`

**Props:**
```typescript
interface RuleFormProps {
  mode: 'create' | 'edit' | 'clone';
  ruleId?: string;              // Required for edit/clone
  initialData?: RuleFormData;   // Pre-populated for edit/clone
}
```

**Emits:**
```typescript
defineEmits<{
  saved: [rule: RuleResponse];
  cancel: [];
}>();
```

**Form Sections:**

**Section 1: Základní informace (Basic Info)**
```
┌─────────────────────────────────────────────────────────────┐
│ Základní informace                                          │
├─────────────────────────────────────────────────────────────┤
│ ID pravidla *           Název pravidla *                    │
│ [VEH-___]               [________________________]          │
│ Formát: XXX-NNN         3-100 znaků                        │
│                                                             │
│ Popis                                                       │
│ [___________________________________________________]      │
│ [___________________________________________________]      │
└─────────────────────────────────────────────────────────────┘
```

**Section 2: Zdrojová data (Source)**
```
┌─────────────────────────────────────────────────────────────┐
│ Zdrojová data                                               │
├─────────────────────────────────────────────────────────────┤
│ Entita *                         Pole *                     │
│ [▼ vehicle         ]             [vin________________]      │
│                                                             │
│ Transformace                                                │
│ [UPPERCASE ×] [TRIM ×] [+ Přidat]                          │
└─────────────────────────────────────────────────────────────┘
```

**Section 3: Cílová data (Target)** - Same structure as Source

**Section 4: Porovnání (Comparison)**
```
┌─────────────────────────────────────────────────────────────┐
│ Porovnání                                                   │
├─────────────────────────────────────────────────────────────┤
│ Typ porovnání *                                             │
│ [▼ FUZZY           ]                                        │
│                                                             │
│ Práh shody (threshold)          ← Shown only for FUZZY     │
│ [═══════●═══] 0.80                                         │
│ 0.0          1.0                                           │
└─────────────────────────────────────────────────────────────┘
```

**Section 5: Výstup (Output)**
```
┌─────────────────────────────────────────────────────────────┐
│ Výstup                                                      │
├─────────────────────────────────────────────────────────────┤
│ Závažnost *                     Blokovat při selhání       │
│ [▼ WARNING       ]              [×] Ne                      │
│                                                             │
│ Chybová zpráva (CZ) *                                       │
│ [VIN se neshoduje s údaji v ORV_________________________]   │
│                                                             │
│ Chybová zpráva (EN)                                         │
│ [VIN does not match ORV data____________________________]   │
└─────────────────────────────────────────────────────────────┘
```

**Section 6: Pokročilé nastavení (Advanced Settings)** - Collapsible
```
┌─────────────────────────────────────────────────────────────┐
│ ▶ Pokročilé nastavení                              [Rozbalit]│
├─────────────────────────────────────────────────────────────┤
│ Kategorie               Fáze                                │
│ [▼ vehicle      ]       [▼ mvp          ]                  │
│                                                             │
│ Platí pro typ prodejce          Platí pro typ nákupu       │
│ [☑ PHYSICAL_PERSON]             [☑ BRANCH]                 │
│ [☑ COMPANY]                     [☐ MOBILE_BUYING]          │
│                                                             │
│ Štítky                                                      │
│ [vin ×] [vehicle ×] [+ Přidat]                             │
└─────────────────────────────────────────────────────────────┘
```

**Validation Logic:**
```typescript
const validations = computed(() => ({
  rule_id: {
    valid: RULE_ID_PATTERN.test(form.value.rule_id),
    error: 'Formát: XXX-NNN (např. VEH-001)',
  },
  name: {
    valid: form.value.name.length >= 3 && form.value.name.length <= 100,
    error: 'Název musí mít 3-100 znaků',
  },
  source_entity: {
    valid: !!form.value.source.entity,
    error: 'Vyberte zdrojovou entitu',
  },
  source_field: {
    valid: !!form.value.source.field,
    error: 'Zadejte zdrojové pole',
  },
  target_entity: {
    valid: !!form.value.target.entity,
    error: 'Vyberte cílovou entitu',
  },
  target_field: {
    valid: !!form.value.target.field,
    error: 'Zadejte cílové pole',
  },
  comparator: {
    valid: !!form.value.comparison.type,
    error: 'Vyberte typ porovnání',
  },
  severity: {
    valid: SEVERITY_TYPES.includes(form.value.severity),
    error: 'Vyberte závažnost',
  },
  error_message_cs: {
    valid: !!form.value.errorMessage.cs,
    error: 'Zadejte chybovou zprávu v češtině',
  },
  // Conditional validations
  threshold: {
    valid: form.value.comparison.type !== 'FUZZY' ||
           (form.value.comparison.threshold !== undefined &&
            form.value.comparison.threshold >= 0 &&
            form.value.comparison.threshold <= 1),
    error: 'Práh musí být mezi 0 a 1',
  },
  pattern: {
    valid: form.value.comparison.type !== 'REGEX' ||
           isValidRegex(form.value.comparison.pattern),
    error: 'Neplatný regulární výraz',
  },
  allowedValues: {
    valid: form.value.comparison.type !== 'IN_LIST' ||
           (form.value.comparison.allowedValues?.length ?? 0) > 0,
    error: 'Zadejte alespoň jednu povolenou hodnotu',
  },
}));
```

**Submission Logic:**
```typescript
async function handleSubmit() {
  // Mark all required fields as touched
  touchAllFields();

  if (!isFormValid.value) {
    // Scroll to first error
    scrollToFirstError();
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const payload = transformFormToApiPayload(form.value);

    let result: RuleResponse | null;
    if (props.mode === 'create' || props.mode === 'clone') {
      result = await createRule(payload);
    } else {
      result = await updateRule(props.ruleId!, payload);
    }

    if (result) {
      emit('saved', result);
    }
  } catch (e) {
    error.value = handleError(e, 'RuleForm.handleSubmit');
  } finally {
    loading.value = false;
  }
}

function transformFormToApiPayload(form: RuleFormData): CreateRuleRequest {
  return {
    rule_definition: {
      id: form.rule_id,
      name: form.name,
      description: form.description || undefined,
      enabled: true,
      source: {
        entity: form.source.entity,
        field: form.source.field,
        transforms: form.source.transforms,
      },
      target: {
        entity: form.target.entity,
        field: form.target.field,
        transforms: form.target.transforms,
      },
      comparison: {
        type: form.comparison.type,
        ...(form.comparison.type === 'FUZZY' && { threshold: form.comparison.threshold }),
        ...((['NUMERIC_TOLERANCE', 'DATE_TOLERANCE'].includes(form.comparison.type)) && { tolerance: form.comparison.tolerance }),
        ...(form.comparison.type === 'REGEX' && { pattern: form.comparison.pattern }),
        ...(form.comparison.type === 'IN_LIST' && { allowedValues: form.comparison.allowedValues }),
      },
      severity: form.severity,
      blockOnFail: form.blockOnFail,
      errorMessage: {
        cs: form.errorMessage.cs,
        ...(form.errorMessage.en && { en: form.errorMessage.en }),
      },
      metadata: {
        ...(form.metadata.category && { category: form.metadata.category }),
        ...(form.metadata.phase && { phase: form.metadata.phase }),
        ...(form.metadata.applicableTo?.length && { applicableTo: form.metadata.applicableTo }),
        ...(form.metadata.applicableToBuyingType?.length && { applicableToBuyingType: form.metadata.applicableToBuyingType }),
        ...(form.metadata.tags?.length && { tags: form.metadata.tags }),
      },
    },
  };
}
```

**Outputs (Phase 2):**
- `apps/web/src/components/rules/RuleForm.vue`

---

### Phase 3: Pages & Routing
**Handled by:** Main orchestrator
**Dependencies:** Phase 2 complete
**Can start:** After Phase 2

#### 3.1 RuleCreatePage.vue
**Location:** `apps/web/src/pages/RuleCreatePage.vue`

**Purpose:** Full-page wrapper for creating new rules

**Template Structure:**
```vue
<template>
  <div class="rule-page">
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBack">
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>Nové pravidlo</h1>
          <p>Vytvořte nové validační pravidlo</p>
        </div>
      </div>
    </header>

    <main class="page-content">
      <RuleForm
        mode="create"
        @saved="handleSaved"
        @cancel="handleCancel"
      />
    </main>
  </div>
</template>
```

**Logic:**
- On save: Show success toast, navigate to `/rules`
- On cancel: Confirm if dirty, navigate to `/rules`
- Unsaved changes guard on navigation

---

#### 3.2 RuleEditPage.vue
**Location:** `apps/web/src/pages/RuleEditPage.vue`

**Purpose:** Full-page wrapper for editing existing rules

**Template Structure:**
```vue
<template>
  <div class="rule-page">
    <header class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBack">
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>Upravit pravidlo {{ ruleId }}</h1>
          <p>{{ rule?.rule_name }}</p>
        </div>
      </div>
      <div class="header-right">
        <RuleStatusBadge :rule="rule" v-if="rule" />
      </div>
    </header>

    <main class="page-content">
      <div v-if="loading" class="loading-state">
        <Spinner />
        <p>Načítám pravidlo...</p>
      </div>

      <div v-else-if="notFound" class="not-found-state">
        <h2>Pravidlo nenalezeno</h2>
        <p>Pravidlo s ID "{{ ruleId }}" neexistuje.</p>
        <router-link to="/rules">Zpět na seznam</router-link>
      </div>

      <RuleForm
        v-else
        mode="edit"
        :rule-id="ruleId"
        :initial-data="formData"
        @saved="handleSaved"
        @cancel="handleCancel"
      />
    </main>
  </div>
</template>
```

**Logic:**
- Fetch rule data on mount using `getRule(ruleId)`
- Transform API response to form data structure
- Handle 404 gracefully
- On save: Show success toast, navigate to `/rules`
- Versioning note: If editing active rule, API creates new draft version

---

#### 3.3 Router Updates
**Location:** `apps/web/src/router/index.ts`

**Add Routes:**
```typescript
{
  path: '/rules/new',
  name: 'RuleCreate',
  component: () => import('@/pages/RuleCreatePage.vue'),
  meta: { requiresAuth: true }
},
{
  path: '/rules/:id/edit',
  name: 'RuleEdit',
  component: () => import('@/pages/RuleEditPage.vue'),
  meta: { requiresAuth: true },
  props: true
}
```

**Outputs (Phase 3):**
- `apps/web/src/pages/RuleCreatePage.vue`
- `apps/web/src/pages/RuleEditPage.vue`
- `apps/web/src/router/index.ts` (modified)

---

### Phase 4: Modal Components
**Handled by:** Main orchestrator
**Dependencies:** Phase 3 complete
**Can start:** After Phase 3

#### 4.1 DeleteRuleModal.vue
**Location:** `apps/web/src/components/rules/DeleteRuleModal.vue`

**Props:**
```typescript
interface DeleteRuleModalProps {
  modelValue: boolean;          // v-model for open state
  rule: RuleResponse | null;
  loading?: boolean;
}
```

**Emits:**
```typescript
defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
  cancel: [];
}>();
```

**Template:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Smazat pravidlo?                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️  Opravdu chcete smazat pravidlo VEH-001?               │
│                                                             │
│  Název: VIN Match Rule                                      │
│  Stav: Draft                                                │
│                                                             │
│  ⚡ Tato akce je nevratná.                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️  Aktivní pravidla nelze smazat. Nejprve          │   │
│  │     pravidlo deaktivujte.                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                 (shown only if rule.is_active)              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                          [Zrušit]  [🗑️ Smazat]             │
└─────────────────────────────────────────────────────────────┘
```

**Logic:**
- Disable delete button if `rule.is_active === true`
- Show warning message for active rules
- On confirm: Call `deleteRule(rule.rule_id)`, emit success/error

---

#### 4.2 CloneRuleModal.vue
**Location:** `apps/web/src/components/rules/CloneRuleModal.vue`

**Props:**
```typescript
interface CloneRuleModalProps {
  modelValue: boolean;
  rule: RuleResponse | null;
  loading?: boolean;
}
```

**Emits:**
```typescript
defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [data: { newRuleId: string; newName: string }];
  cancel: [];
}>();
```

**Template:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Klonovat pravidlo                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Vytvoří se kopie pravidla VEH-001 s novým ID.             │
│                                                             │
│  Nové ID pravidla *                                         │
│  [VEH-032_________]                                         │
│  Formát: XXX-NNN                                           │
│                                                             │
│  Nový název pravidla *                                      │
│  [Kopie: VIN Match Rule_______________________________]    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                          [Zrušit]  [📋 Klonovat]           │
└─────────────────────────────────────────────────────────────┘
```

**Logic:**
- Pre-populate `newRuleId` with next available ID (e.g., VEH-001 → VEH-032)
- Pre-populate `newName` with "Kopie: {original_name}"
- Validate new rule ID format before enabling confirm
- On confirm: Call `cloneRule(originalId, newRuleId, newName)`
- On success: Navigate to `/rules/:newRuleId/edit` or refresh list

**Helper Function:**
```typescript
function suggestNextRuleId(prefix: string, existingRules: RuleResponse[]): string {
  const pattern = new RegExp(`^${prefix}-(\\d{3})$`);
  const numbers = existingRules
    .map(r => r.rule_id.match(pattern)?.[1])
    .filter(Boolean)
    .map(n => parseInt(n!, 10));

  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}
```

**Outputs (Phase 4):**
- `apps/web/src/components/rules/DeleteRuleModal.vue`
- `apps/web/src/components/rules/CloneRuleModal.vue`

---

### Phase 5: Integration & Wiring
**Handled by:** Main orchestrator
**Dependencies:** Phase 4 complete
**Can start:** After Phase 4

#### 5.1 RulesManagement.vue Updates
**Location:** `apps/web/src/pages/RulesManagement.vue`

**Changes:**

1. **Enable "Nové pravidlo" button:**
```vue
<button class="btn-primary" @click="$router.push('/rules/new')">
  <PlusIcon />
  Nové pravidlo
</button>
```

2. **Add modal imports and state:**
```typescript
import DeleteRuleModal from '@/components/rules/DeleteRuleModal.vue';
import CloneRuleModal from '@/components/rules/CloneRuleModal.vue';

const showDeleteModal = ref(false);
const showCloneModal = ref(false);
const selectedRule = ref<RuleResponse | null>(null);
const modalLoading = ref(false);
```

3. **Update event handlers:**
```typescript
function handleEdit(rule: RuleResponse) {
  router.push(`/rules/${rule.rule_id}/edit`);
}

function handleDelete(rule: RuleResponse) {
  selectedRule.value = rule;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!selectedRule.value) return;

  modalLoading.value = true;
  const success = await deleteRule(selectedRule.value.rule_id);
  modalLoading.value = false;

  if (success) {
    showToast(`Pravidlo ${selectedRule.value.rule_id} bylo smazáno`, 'success');
    showDeleteModal.value = false;
    selectedRule.value = null;
    await loadRules();
  } else {
    showToast('Smazání pravidla selhalo', 'error');
  }
}

function handleClone(rule: RuleResponse) {
  selectedRule.value = rule;
  showCloneModal.value = true;
}

async function confirmClone(data: { newRuleId: string; newName: string }) {
  if (!selectedRule.value) return;

  modalLoading.value = true;
  const result = await cloneRule(selectedRule.value.rule_id, data.newRuleId, data.newName);
  modalLoading.value = false;

  if (result) {
    showToast(`Pravidlo naklonováno jako ${data.newRuleId}`, 'success');
    showCloneModal.value = false;
    selectedRule.value = null;
    router.push(`/rules/${data.newRuleId}/edit`);
  } else {
    showToast('Klonování pravidla selhalo', 'error');
  }
}
```

4. **Add modals to template:**
```vue
<DeleteRuleModal
  v-model="showDeleteModal"
  :rule="selectedRule"
  :loading="modalLoading"
  @confirm="confirmDelete"
  @cancel="showDeleteModal = false"
/>

<CloneRuleModal
  v-model="showCloneModal"
  :rule="selectedRule"
  :loading="modalLoading"
  @confirm="confirmClone"
  @cancel="showCloneModal = false"
/>
```

**Outputs (Phase 5):**
- `apps/web/src/pages/RulesManagement.vue` (modified)

---

### Phase 6: Polish & Testing
**Handled by:** Main orchestrator
**Dependencies:** Phase 5 complete
**Can start:** After Phase 5

**Tasks:**

1. **Unsaved Changes Guard:**
```typescript
// In RuleCreatePage.vue and RuleEditPage.vue
const isDirty = ref(false);

onBeforeRouteLeave((to, from) => {
  if (isDirty.value) {
    const confirm = window.confirm('Máte neuložené změny. Opravdu chcete odejít?');
    if (!confirm) return false;
  }
});
```

2. **Error Handling:**
- Display field-specific API validation errors
- Handle network errors gracefully
- Show retry option for transient failures

3. **Loading States:**
- Form submission: LoadingButton with spinner
- Page load: Full skeleton loader
- Modal actions: Disabled buttons with spinner

4. **Accessibility:**
- ARIA labels on all form fields
- Error announcements for screen readers
- Focus management (first field on mount, first error on submit)
- Keyboard navigation in modals

5. **Build Verification:**
```bash
cd apps/web && npm run build
```

**Outputs (Phase 6):**
- All components polished
- Build passes without errors

---

## Files Summary

### New Files (9)

| File | Phase |
|------|-------|
| `apps/web/src/components/shared/TagInput.vue` | 1 |
| `apps/web/src/components/rules/RuleFormSection.vue` | 1 |
| `apps/web/src/components/rules/TransformMultiSelect.vue` | 1 |
| `apps/web/src/components/rules/ComparatorParamsInput.vue` | 1 |
| `apps/web/src/components/rules/RuleForm.vue` | 2 |
| `apps/web/src/pages/RuleCreatePage.vue` | 3 |
| `apps/web/src/pages/RuleEditPage.vue` | 3 |
| `apps/web/src/components/rules/DeleteRuleModal.vue` | 4 |
| `apps/web/src/components/rules/CloneRuleModal.vue` | 4 |

### Modified Files (3)

| File | Phase | Changes |
|------|-------|---------|
| `apps/web/src/router/index.ts` | 3 | Add 2 routes |
| `apps/web/src/pages/RulesManagement.vue` | 5 | Wire up buttons, add modals |
| `apps/web/src/composables/useRules.ts` | 1 | Add type constants (optional) |

---

## Acceptance Criteria

### Create Rule
- [ ] `/rules/new` page loads with empty form
- [ ] All form sections render correctly
- [ ] Rule ID validates format XXX-NNN
- [ ] Name validates 3-100 characters
- [ ] Required fields show validation errors on blur
- [ ] Comparator params appear/hide based on type selection
- [ ] Advanced Settings section collapses/expands
- [ ] Form submits successfully and creates draft rule
- [ ] Success toast appears after creation
- [ ] Navigates to `/rules` after save

### Edit Rule
- [ ] `/rules/:id/edit` page loads with pre-populated form
- [ ] Shows loading state while fetching
- [ ] Shows 404 state if rule not found
- [ ] Form updates successfully
- [ ] If editing active rule, creates new version (backend handles this)
- [ ] Success toast appears after update
- [ ] Navigates to `/rules` after save

### Delete Rule
- [ ] Delete button opens confirmation modal
- [ ] Modal shows rule details (ID, name, status)
- [ ] Active rules show warning and disabled delete button
- [ ] Confirm deletes rule and refreshes list
- [ ] Success toast appears after deletion

### Clone Rule
- [ ] Clone button opens modal with pre-filled suggestions
- [ ] New rule ID validates format
- [ ] Confirm clones rule and navigates to edit page
- [ ] Success toast appears after cloning

### General
- [ ] Unsaved changes prompt on navigation
- [ ] All buttons show loading state during operations
- [ ] Error messages display for failed operations
- [ ] Build completes without TypeScript errors
- [ ] Light theme consistent with existing UI

---

## Validation Commands

```bash
# Build verification
cd apps/web && npm run build

# Dev server for manual testing
cd apps/web && npm run dev
# Navigate to:
# - http://localhost:5173/rules (list with working buttons)
# - http://localhost:5173/rules/new (create form)
# - http://localhost:5173/rules/VEH-001/edit (edit form)

# Type checking
cd apps/web && npx tsc --noEmit
```

---

## Related Documentation

- **Backend API:** `docs/architecture/RULE_MANAGEMENT_API.md`
- **OpenAPI Spec:** `docs/architecture/openapi-validation-rules.yaml`
- **Database Schema:** `docs/architecture/DB_SCHEMA_DYNAMIC_RULES.sql`
- **Validation Rules Schema:** `docs/architecture/VALIDATION_RULES_SCHEMA.json`
- **Previous UI Spec:** `specs/feature-rules-management-ui.md`
