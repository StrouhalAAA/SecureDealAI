<template>
  <form @submit.prevent="handleSubmit" novalidate class="rule-form">
    <!-- Section 1: Basic Info -->
    <RuleFormSection title="Základní informace" icon="📋">
      <div class="form-grid">
        <div class="form-group">
          <label :for="ruleIdInputId" class="form-label">
            ID pravidla <span class="required">*</span>
          </label>
          <input
            :id="ruleIdInputId"
            v-model="form.rule_id"
            type="text"
            class="form-input font-mono uppercase"
            :class="{
              'has-error': touched.rule_id && !validations.rule_id.valid,
              'has-success': touched.rule_id && validations.rule_id.valid
            }"
            placeholder="VEH-001"
            :disabled="mode === 'edit'"
            @blur="touched.rule_id = true"
          />
          <p v-if="touched.rule_id && !validations.rule_id.valid" class="error-text">
            {{ validations.rule_id.error }}
          </p>
          <p v-else class="help-text">Formát: XXX-NNN (např. VEH-001, ARES-010)</p>
        </div>

        <div class="form-group">
          <label :for="nameInputId" class="form-label">
            Název pravidla <span class="required">*</span>
          </label>
          <input
            :id="nameInputId"
            v-model="form.name"
            type="text"
            class="form-input"
            :class="{
              'has-error': touched.name && !validations.name.valid,
              'has-success': touched.name && validations.name.valid
            }"
            placeholder="Kontrola VIN vs ORV"
            @blur="touched.name = true"
          />
          <p v-if="touched.name && !validations.name.valid" class="error-text">
            {{ validations.name.error }}
          </p>
          <p v-else class="help-text">3-100 znaků</p>
        </div>
      </div>

      <div class="form-group mt-4">
        <label :for="descInputId" class="form-label">Popis</label>
        <textarea
          :id="descInputId"
          v-model="form.description"
          rows="2"
          class="form-input"
          placeholder="Volitelný popis pravidla..."
        />
      </div>
    </RuleFormSection>

    <!-- Section 2: Source Data -->
    <RuleFormSection title="Zdrojová data" icon="📤" class="mt-4">
      <div class="form-grid">
        <div class="form-group">
          <label :for="sourceEntityId" class="form-label">
            Entita <span class="required">*</span>
          </label>
          <select
            :id="sourceEntityId"
            v-model="form.source.entity"
            class="form-select"
            :class="{
              'has-error': touched.source_entity && !validations.source_entity.valid
            }"
            @blur="touched.source_entity = true"
          >
            <option value="">-- Vyberte entitu --</option>
            <option v-for="entity in ENTITY_TYPES" :key="entity" :value="entity">
              {{ entityLabels[entity] || entity }}
            </option>
          </select>
          <p v-if="touched.source_entity && !validations.source_entity.valid" class="error-text">
            {{ validations.source_entity.error }}
          </p>
        </div>

        <div class="form-group">
          <label :for="sourceFieldId" class="form-label">
            Pole <span class="required">*</span>
          </label>
          <input
            :id="sourceFieldId"
            v-model="form.source.field"
            type="text"
            class="form-input font-mono"
            :class="{
              'has-error': touched.source_field && !validations.source_field.valid
            }"
            placeholder="vin"
            @blur="touched.source_field = true"
          />
          <p v-if="touched.source_field && !validations.source_field.valid" class="error-text">
            {{ validations.source_field.error }}
          </p>
        </div>
      </div>

      <div class="form-group mt-4">
        <TransformMultiSelect
          v-model="form.source.transforms"
          label="Transformace"
          help-text="Transformace se aplikují v pořadí zleva doprava."
        />
      </div>
    </RuleFormSection>

    <!-- Section 3: Target Data -->
    <RuleFormSection title="Cílová data" icon="📥" class="mt-4">
      <div class="form-grid">
        <div class="form-group">
          <label :for="targetEntityId" class="form-label">
            Entita <span class="required">*</span>
          </label>
          <select
            :id="targetEntityId"
            v-model="form.target.entity"
            class="form-select"
            :class="{
              'has-error': touched.target_entity && !validations.target_entity.valid
            }"
            @blur="touched.target_entity = true"
          >
            <option value="">-- Vyberte entitu --</option>
            <option v-for="entity in ENTITY_TYPES" :key="entity" :value="entity">
              {{ entityLabels[entity] || entity }}
            </option>
          </select>
          <p v-if="touched.target_entity && !validations.target_entity.valid" class="error-text">
            {{ validations.target_entity.error }}
          </p>
        </div>

        <div class="form-group">
          <label :for="targetFieldId" class="form-label">
            Pole <span class="required">*</span>
          </label>
          <input
            :id="targetFieldId"
            v-model="form.target.field"
            type="text"
            class="form-input font-mono"
            :class="{
              'has-error': touched.target_field && !validations.target_field.valid
            }"
            placeholder="vin"
            @blur="touched.target_field = true"
          />
          <p v-if="touched.target_field && !validations.target_field.valid" class="error-text">
            {{ validations.target_field.error }}
          </p>
        </div>
      </div>

      <div class="form-group mt-4">
        <TransformMultiSelect
          v-model="form.target.transforms"
          label="Transformace"
          help-text="Transformace se aplikují v pořadí zleva doprava."
        />
      </div>
    </RuleFormSection>

    <!-- Section 4: Comparison -->
    <RuleFormSection title="Porovnání" icon="⚖️" class="mt-4">
      <div class="form-group">
        <label :for="comparatorId" class="form-label">
          Typ porovnání <span class="required">*</span>
        </label>
        <select
          :id="comparatorId"
          v-model="form.comparison.type"
          class="form-select"
          :class="{
            'has-error': touched.comparator && !validations.comparator.valid
          }"
          @blur="touched.comparator = true"
        >
          <option value="">-- Vyberte typ --</option>
          <option v-for="comp in COMPARATOR_TYPES" :key="comp" :value="comp">
            {{ comparatorLabels[comp] || comp }}
          </option>
        </select>
        <p v-if="touched.comparator && !validations.comparator.valid" class="error-text">
          {{ validations.comparator.error }}
        </p>
      </div>

      <!-- Dynamic comparator params -->
      <ComparatorParamsInput
        v-if="form.comparison.type"
        v-model="comparatorParams"
        :comparator-type="form.comparison.type"
      />
    </RuleFormSection>

    <!-- Section 5: Output -->
    <RuleFormSection title="Výstup" icon="📊" class="mt-4">
      <div class="form-grid">
        <div class="form-group">
          <label :for="severityId" class="form-label">
            Závažnost <span class="required">*</span>
          </label>
          <select
            :id="severityId"
            v-model="form.severity"
            class="form-select"
            :class="{
              'has-error': touched.severity && !validations.severity.valid
            }"
            @blur="touched.severity = true"
          >
            <option value="">-- Vyberte závažnost --</option>
            <option v-for="sev in SEVERITY_TYPES" :key="sev" :value="sev">
              {{ severityLabels[sev] }}
            </option>
          </select>
          <p v-if="touched.severity && !validations.severity.valid" class="error-text">
            {{ validations.severity.error }}
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">Blokovat při selhání</label>
          <div class="toggle-wrapper">
            <button
              type="button"
              class="toggle-btn"
              :class="{ 'active': form.blockOnFail }"
              @click="form.blockOnFail = !form.blockOnFail"
            >
              <span class="toggle-slider" />
            </button>
            <span class="toggle-label">{{ form.blockOnFail ? 'Ano' : 'Ne' }}</span>
          </div>
          <p class="help-text">Pokud ano, selhání tohoto pravidla zablokuje příležitost.</p>
        </div>
      </div>

      <div class="form-group mt-4">
        <label :for="errorMsgCsId" class="form-label">
          Chybová zpráva (CZ) <span class="required">*</span>
        </label>
        <input
          :id="errorMsgCsId"
          v-model="form.errorMessage.cs"
          type="text"
          class="form-input"
          :class="{
            'has-error': touched.error_message_cs && !validations.error_message_cs.valid
          }"
          placeholder="VIN se neshoduje s údaji v ORV"
          @blur="touched.error_message_cs = true"
        />
        <p v-if="touched.error_message_cs && !validations.error_message_cs.valid" class="error-text">
          {{ validations.error_message_cs.error }}
        </p>
      </div>

      <div class="form-group mt-4">
        <label :for="errorMsgEnId" class="form-label">Chybová zpráva (EN)</label>
        <input
          :id="errorMsgEnId"
          v-model="form.errorMessage.en"
          type="text"
          class="form-input"
          placeholder="VIN does not match ORV data"
        />
        <p class="help-text">Volitelný anglický překlad</p>
      </div>
    </RuleFormSection>

    <!-- Section 6: Advanced Settings (Collapsible) -->
    <RuleFormSection
      title="Pokročilé nastavení"
      icon="⚙️"
      :collapsible="true"
      :default-open="false"
      class="mt-4"
    >
      <div class="form-grid">
        <div class="form-group">
          <label :for="categoryId" class="form-label">Kategorie</label>
          <select :id="categoryId" v-model="form.metadata.category" class="form-select">
            <option value="">-- Bez kategorie --</option>
            <option v-for="cat in CATEGORY_TYPES" :key="cat" :value="cat">
              {{ categoryLabels[cat] || cat }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label :for="phaseId" class="form-label">Fáze</label>
          <select :id="phaseId" v-model="form.metadata.phase" class="form-select">
            <option value="">-- Bez fáze --</option>
            <option value="mvp">MVP</option>
            <option value="phase2">Fáze 2</option>
            <option value="future">Budoucí</option>
          </select>
        </div>
      </div>

      <div class="form-grid mt-4">
        <div class="form-group">
          <label class="form-label">Platí pro typ prodejce</label>
          <div class="checkbox-group">
            <label
              v-for="vt in VENDOR_TYPES"
              :key="vt"
              class="checkbox-item"
            >
              <input
                type="checkbox"
                :value="vt"
                v-model="form.metadata.applicableTo"
              />
              <span>{{ vendorTypeLabels[vt] }}</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Platí pro typ nákupu</label>
          <div class="checkbox-group">
            <label
              v-for="bt in BUYING_TYPES"
              :key="bt"
              class="checkbox-item"
            >
              <input
                type="checkbox"
                :value="bt"
                v-model="form.metadata.applicableToBuyingType"
              />
              <span>{{ buyingTypeLabels[bt] }}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="form-group mt-4">
        <TagInput
          v-model="form.metadata.tags"
          label="Štítky"
          placeholder="Přidejte štítek..."
          :suggestions="suggestedTags"
          help-text="Štítky pro organizaci pravidel"
        />
      </div>
    </RuleFormSection>

    <!-- Error message -->
    <div v-if="error" class="error-banner mt-4">
      <div class="error-content">
        <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Form actions -->
    <div class="form-actions mt-6">
      <button
        type="button"
        class="btn-secondary"
        :disabled="loading"
        @click="emit('cancel')"
      >
        Zrušit
      </button>
      <button
        type="submit"
        class="btn-primary"
        :disabled="loading || !isFormValid"
      >
        <svg v-if="loading" class="spinner" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25" />
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ loading ? 'Ukládám...' : (mode === 'create' ? 'Vytvořit pravidlo' : 'Uložit změny') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import {
  useRules,
  ENTITY_TYPES,
  COMPARATOR_TYPES,
  SEVERITY_TYPES,
  CATEGORY_TYPES,
  VENDOR_TYPES,
  BUYING_TYPES,
  type RuleResponse,
  type TransformType,
  type ComparatorType,
  type SeverityType,
  type CategoryType,
  type VendorType,
  type BuyingType,
} from '@/composables/useRules';
import { useErrorHandler } from '@/composables/useErrorHandler';
import RuleFormSection from './RuleFormSection.vue';
import TransformMultiSelect from './TransformMultiSelect.vue';
import ComparatorParamsInput from './ComparatorParamsInput.vue';
import TagInput from '@/components/shared/TagInput.vue';

const props = defineProps<{
  mode: 'create' | 'edit' | 'clone';
  ruleId?: string;
  initialData?: RuleFormData;
}>();

const emit = defineEmits<{
  saved: [rule: RuleResponse];
  cancel: [];
  dirty: [isDirty: boolean];
}>();

// Form data interface
interface RuleFormData {
  rule_id: string;
  name: string;
  description: string;
  source: {
    entity: string;
    field: string;
    transforms: TransformType[];
  };
  target: {
    entity: string;
    field: string;
    transforms: TransformType[];
  };
  comparison: {
    type: ComparatorType | '';
  };
  severity: SeverityType | '';
  blockOnFail: boolean;
  errorMessage: {
    cs: string;
    en: string;
  };
  metadata: {
    category: CategoryType | '';
    phase: 'mvp' | 'phase2' | 'future' | '';
    applicableTo: VendorType[];
    applicableToBuyingType: BuyingType[];
    tags: string[];
  };
}

const { createRule, updateRule } = useRules();
const { handleError } = useErrorHandler();

// Generate unique IDs for form fields
const uniqueId = Math.random().toString(36).substr(2, 9);
const ruleIdInputId = `rule-id-${uniqueId}`;
const nameInputId = `name-${uniqueId}`;
const descInputId = `desc-${uniqueId}`;
const sourceEntityId = `source-entity-${uniqueId}`;
const sourceFieldId = `source-field-${uniqueId}`;
const targetEntityId = `target-entity-${uniqueId}`;
const targetFieldId = `target-field-${uniqueId}`;
const comparatorId = `comparator-${uniqueId}`;
const severityId = `severity-${uniqueId}`;
const errorMsgCsId = `error-msg-cs-${uniqueId}`;
const errorMsgEnId = `error-msg-en-${uniqueId}`;
const categoryId = `category-${uniqueId}`;
const phaseId = `phase-${uniqueId}`;

// Form state
const form = reactive<RuleFormData>({
  rule_id: '',
  name: '',
  description: '',
  source: {
    entity: '',
    field: '',
    transforms: [],
  },
  target: {
    entity: '',
    field: '',
    transforms: [],
  },
  comparison: {
    type: '',
  },
  severity: '',
  blockOnFail: false,
  errorMessage: {
    cs: '',
    en: '',
  },
  metadata: {
    category: '',
    phase: '',
    applicableTo: [],
    applicableToBuyingType: [],
    tags: [],
  },
});

// Comparator params are stored separately and synced
const comparatorParams = ref<Record<string, unknown>>({});

// Touched state for validation
const touched = reactive({
  rule_id: false,
  name: false,
  source_entity: false,
  source_field: false,
  target_entity: false,
  target_field: false,
  comparator: false,
  severity: false,
  error_message_cs: false,
});

const loading = ref(false);
const error = ref<string | null>(null);

// Validation patterns
const RULE_ID_PATTERN = /^[A-Z]{2,4}-\d{3}$/;

// Validation logic
const validations = computed(() => ({
  rule_id: {
    valid: RULE_ID_PATTERN.test(form.rule_id),
    error: 'Formát: XXX-NNN (např. VEH-001)',
  },
  name: {
    valid: form.name.length >= 3 && form.name.length <= 100,
    error: 'Název musí mít 3-100 znaků',
  },
  source_entity: {
    valid: !!form.source.entity,
    error: 'Vyberte zdrojovou entitu',
  },
  source_field: {
    valid: !!form.source.field,
    error: 'Zadejte zdrojové pole',
  },
  target_entity: {
    valid: !!form.target.entity,
    error: 'Vyberte cílovou entitu',
  },
  target_field: {
    valid: !!form.target.field,
    error: 'Zadejte cílové pole',
  },
  comparator: {
    valid: !!form.comparison.type,
    error: 'Vyberte typ porovnání',
  },
  severity: {
    valid: !!form.severity,
    error: 'Vyberte závažnost',
  },
  error_message_cs: {
    valid: !!form.errorMessage.cs,
    error: 'Zadejte chybovou zprávu v češtině',
  },
  threshold: {
    valid: form.comparison.type !== 'FUZZY' ||
           (comparatorParams.value.threshold !== undefined &&
            (comparatorParams.value.threshold as number) >= 0 &&
            (comparatorParams.value.threshold as number) <= 1),
    error: 'Práh musí být mezi 0 a 1',
  },
  pattern: {
    valid: form.comparison.type !== 'REGEX' ||
           isValidRegex(comparatorParams.value.pattern as string),
    error: 'Neplatný regulární výraz',
  },
  allowedValues: {
    valid: form.comparison.type !== 'IN_LIST' ||
           ((comparatorParams.value.allowedValues as string[])?.length ?? 0) > 0,
    error: 'Zadejte alespoň jednu povolenou hodnotu',
  },
}));

const isFormValid = computed(() => {
  return Object.values(validations.value).every(v => v.valid);
});

// Helper function to validate regex
function isValidRegex(pattern: string | undefined): boolean {
  if (!pattern) return false;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

// Labels for dropdowns
const entityLabels: Record<string, string> = {
  vehicle: 'Vozidlo',
  vendor: 'Prodejce',
  buying_opportunity: 'Příležitost',
  ocr_orv: 'OCR - ORV',
  ocr_op: 'OCR - OP',
  ocr_vtp: 'OCR - VTP',
  ares: 'ARES',
  adis: 'ADIS',
  cebia: 'Cebia',
  dolozky: 'Doložky',
};

const comparatorLabels: Record<string, string> = {
  EXACT: 'Přesná shoda',
  FUZZY: 'Fuzzy shoda',
  CONTAINS: 'Obsahuje',
  REGEX: 'Regulární výraz',
  NUMERIC_TOLERANCE: 'Číselná tolerance',
  DATE_TOLERANCE: 'Datumová tolerance',
  EXISTS: 'Existuje',
  NOT_EXISTS: 'Neexistuje',
  IN_LIST: 'V seznamu',
};

const severityLabels: Record<string, string> = {
  CRITICAL: '🔴 Kritická',
  WARNING: '🟠 Varování',
  INFO: '🔵 Informace',
};

const categoryLabels: Record<string, string> = {
  vehicle: 'Vozidlo',
  vendor_fo: 'Prodejce (FO)',
  vendor_po: 'Prodejce (PO)',
  cross: 'Křížová kontrola',
  external: 'Externí zdroje',
};

const vendorTypeLabels: Record<string, string> = {
  PHYSICAL_PERSON: 'Fyzická osoba',
  COMPANY: 'Právnická osoba',
};

const buyingTypeLabels: Record<string, string> = {
  BRANCH: 'Pobočka',
  MOBILE_BUYING: 'Mobilní nákup',
};

const suggestedTags = ['vin', 'spz', 'vehicle', 'vendor', 'ares', 'ocr', 'identity', 'address'];

// Watch for comparator type changes to reset params
watch(() => form.comparison.type, (newType) => {
  if (newType === 'FUZZY') {
    comparatorParams.value = { threshold: 0.8 };
  } else if (newType === 'IN_LIST') {
    comparatorParams.value = { allowedValues: [] };
  } else {
    comparatorParams.value = {};
  }
});

// Track dirty state
watch(form, () => {
  emit('dirty', true);
}, { deep: true });

// Initialize form with initial data
onMounted(() => {
  if (props.initialData) {
    Object.assign(form, props.initialData);
    // Extract comparator params from initialData if present
    if (props.initialData.comparison) {
      const { type, ...params } = props.initialData.comparison as Record<string, unknown>;
      comparatorParams.value = params;
    }
  }

  // For clone mode, clear the ID so user must enter a new one
  if (props.mode === 'clone') {
    form.rule_id = '';
  }
});

// Touch all fields for validation display
function touchAllFields() {
  Object.keys(touched).forEach(key => {
    (touched as Record<string, boolean>)[key] = true;
  });
}

// Scroll to first error
function scrollToFirstError() {
  const errorEl = document.querySelector('.has-error');
  if (errorEl) {
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Transform form to API payload
function transformFormToApiPayload() {
  return {
    rule_id: form.rule_id,
    rule_name: form.name,
    description: form.description || undefined,
    source_entity: form.source.entity,
    source_field: form.source.field,
    target_entity: form.target.entity,
    target_field: form.target.field,
    transform: form.source.transforms.length > 0 || form.target.transforms.length > 0
      ? [
          ...form.source.transforms.map(t => ({ type: t, target: 'source' })),
          ...form.target.transforms.map(t => ({ type: t, target: 'target' })),
        ]
      : undefined,
    comparator: form.comparison.type,
    comparator_params: Object.keys(comparatorParams.value).length > 0
      ? comparatorParams.value
      : undefined,
    severity: form.severity as SeverityType,
    error_message: form.errorMessage.cs,
    applies_to: (form.metadata.applicableTo.length > 0 || form.metadata.applicableToBuyingType.length > 0)
      ? {
          vendor_type: form.metadata.applicableTo.length > 0 ? form.metadata.applicableTo : undefined,
          buying_type: form.metadata.applicableToBuyingType.length > 0 ? form.metadata.applicableToBuyingType : undefined,
        }
      : undefined,
    enabled: true,
  };
}

// Submit handler
async function handleSubmit() {
  touchAllFields();

  if (!isFormValid.value) {
    scrollToFirstError();
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const payload = transformFormToApiPayload();

    let result: RuleResponse | null;
    if (props.mode === 'create' || props.mode === 'clone') {
      result = await createRule(payload);
    } else {
      result = await updateRule(props.ruleId!, payload);
    }

    if (result) {
      emit('saved', result);
    } else {
      throw new Error('Operace selhala');
    }
  } catch (e) {
    error.value = handleError(e, 'RuleForm.handleSubmit');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.rule-form {
  max-width: 48rem;
  margin: 0 auto;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.375rem;
}

.form-label .required {
  color: #EF4444;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #D1D5DB;
  border-radius: 0.5rem;
  background: white;
  outline: none;
  transition: all 0.15s;
}

.form-input:focus,
.form-select:focus {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input.has-error,
.form-select.has-error {
  border-color: #EF4444;
  background: #FEF2F2;
}

.form-input.has-error:focus,
.form-select.has-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-input.has-success {
  border-color: #10B981;
  background: #F0FDF4;
}

.form-input.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
}

.form-input.uppercase {
  text-transform: uppercase;
}

textarea.form-input {
  resize: vertical;
  min-height: 4rem;
}

.help-text {
  font-size: 0.75rem;
  color: #6B7280;
  margin-top: 0.25rem;
}

.error-text {
  font-size: 0.75rem;
  color: #EF4444;
  margin-top: 0.25rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mt-6 {
  margin-top: 1.5rem;
}

/* Toggle switch */
.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-btn {
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  background: #D1D5DB;
  border: none;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-btn.active {
  background: #2563EB;
}

.toggle-slider {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1.25rem;
  height: 1.25rem;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.toggle-btn.active .toggle-slider {
  transform: translateX(1.25rem);
}

.toggle-label {
  font-size: 0.875rem;
  color: #374151;
}

/* Checkbox group */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.checkbox-item input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: #2563EB;
}

/* Error banner */
.error-banner {
  padding: 0.75rem 1rem;
  background: #FEE2E2;
  border: 1px solid #FECACA;
  border-radius: 0.5rem;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #991B1B;
  font-size: 0.875rem;
}

.error-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

/* Form actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid #E5E7EB;
}

.btn-secondary,
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #D1D5DB;
}

.btn-secondary:hover:not(:disabled) {
  background: #F9FAFB;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #2563EB;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #1D4ED8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Spinner */
.spinner {
  width: 1rem;
  height: 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
