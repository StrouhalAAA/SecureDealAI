import { ref } from 'vue';
import { fetchWithAuth } from './useSupabase';

// Transform types supported by the validation engine
export const TRANSFORM_TYPES = [
  'UPPERCASE', 'LOWERCASE', 'TRIM', 'REMOVE_SPACES', 'REMOVE_DIACRITICS',
  'NORMALIZE_DATE', 'EXTRACT_NUMBER', 'FORMAT_RC', 'FORMAT_ICO', 'FORMAT_DIC',
  'ADDRESS_NORMALIZE', 'NAME_NORMALIZE', 'VIN_NORMALIZE', 'SPZ_NORMALIZE'
] as const;

// Comparator types for rule matching
export const COMPARATOR_TYPES = [
  'EXACT', 'FUZZY', 'CONTAINS', 'REGEX', 'NUMERIC_TOLERANCE',
  'DATE_TOLERANCE', 'EXISTS', 'NOT_EXISTS', 'IN_LIST'
] as const;

// Entity types (data sources)
export const ENTITY_TYPES = [
  'vehicle', 'vendor', 'buying_opportunity',
  'ocr_orv', 'ocr_op', 'ocr_vtp', 'ares', 'adis', 'cebia', 'dolozky'
] as const;

// Severity levels for rules
export const SEVERITY_TYPES = ['CRITICAL', 'WARNING', 'INFO'] as const;

// Rule categories
export const CATEGORY_TYPES = ['vehicle', 'vendor_fo', 'vendor_po', 'cross', 'external'] as const;

// Vendor types for applicability
export const VENDOR_TYPES = ['PHYSICAL_PERSON', 'COMPANY'] as const;

// Buying types for applicability
export const BUYING_TYPES = ['BRANCH', 'MOBILE_BUYING'] as const;

export type TransformType = typeof TRANSFORM_TYPES[number];
export type ComparatorType = typeof COMPARATOR_TYPES[number];
export type EntityType = typeof ENTITY_TYPES[number];
export type SeverityType = typeof SEVERITY_TYPES[number];
export type CategoryType = typeof CATEGORY_TYPES[number];
export type VendorType = typeof VENDOR_TYPES[number];
export type BuyingType = typeof BUYING_TYPES[number];

// RuleListItem - flat structure returned by list endpoint
export interface RuleResponse {
  id: string;
  rule_id: string;
  rule_name: string;
  description?: string;
  source_entity: string;
  source_field: string;
  target_entity: string;
  target_field: string;
  transform?: Array<{ type: string; params?: Record<string, unknown> }>;
  comparator: string;
  comparator_params?: Record<string, unknown>;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  error_message: string;
  applies_to?: {
    vendor_type?: string[];
    buying_type?: string[];
  };
  enabled: boolean;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// RuleDefinition - the nested rule_definition structure from the backend
export interface RuleDefinition {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  source: {
    entity: string;
    field: string;
    transforms?: TransformType[];
  };
  target: {
    entity: string;
    field: string;
    transforms?: TransformType[];
  };
  comparison: {
    type: ComparatorType;
    caseSensitive?: boolean;
    threshold?: number;
    tolerance?: number;
    toleranceType?: 'absolute' | 'percentage';
    pattern?: string;
    allowedValues?: string[];
  };
  severity: SeverityType;
  blockOnFail?: boolean;
  conditions?: {
    operator?: 'AND' | 'OR';
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  };
  errorMessage?: {
    cs: string;
    en: string;
    sk?: string;
    pl?: string;
  };
  metadata?: {
    category?: CategoryType;
    phase?: 'mvp' | 'phase2' | 'future';
    requiresDocument?: 'ORV' | 'OP' | 'VTP' | null;
    requiresDocuments?: number[];
    requiresDocumentGroup?: 'VTP' | 'ORV' | 'OP';
    applicableTo?: VendorType[];
    applicableToBuyingType?: BuyingType[];
    priority?: number;
    tags?: string[];
  };
}

// SingleRuleResponse - nested structure returned by GET /rules/:id endpoint
export interface SingleRuleResponse {
  id: string;
  rule_id: string;
  rule_definition: RuleDefinition;
  is_active: boolean;
  is_draft: boolean;
  version: number;
  schema_version?: string;
  created_by?: string;
  created_at: string;
  updated_by?: string | null;
  updated_at: string | null;
  activated_by?: string | null;
  activated_at?: string | null;
}

/**
 * Response structure from the backend rules API
 * The backend wraps the response in { data: { rules, total_count, page, limit }, meta }
 */
export interface RulesApiResponse {
  rules: RuleResponse[];
  total_count: number;
  page?: number;
  limit?: number;
}

export interface CreateRuleRequest {
  rule_id: string;
  rule_name: string;
  description?: string;
  source_entity: string;
  source_field: string;
  target_entity: string;
  target_field: string;
  transform?: Array<{ type: string }>;
  comparator: string;
  comparator_params?: Record<string, unknown>;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  error_message: string;
  applies_to?: {
    vendor_type?: string[];
    buying_type?: string[];
  };
  enabled?: boolean;
}

export interface RulesFilters {
  status?: 'active' | 'draft' | 'all';
  source_entity?: string;
  severity?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useRules() {
  const rules = ref<RuleResponse[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    page: 1,
    limit: 50,
    total: 0,
    total_pages: 0,
  });

  const functionsUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

  async function fetchRules(filters: RulesFilters = {}): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.source_entity) params.set('source_entity', filters.source_entity);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());

      const url = `${functionsUrl}/rules?${params.toString()}`;
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.status}`);
      }

      // Backend returns { data: { rules, total_count, page, limit }, meta }
      const json = await response.json() as { data: RulesApiResponse };
      const apiData = json.data;

      // Parse rules array (with fallback to empty array for safety)
      rules.value = apiData.rules || [];

      // Map backend pagination format to frontend format
      const total = apiData.total_count || 0;
      const currentPage = apiData.page || 1;
      const currentLimit = apiData.limit || 50;
      pagination.value = {
        page: currentPage,
        limit: currentLimit,
        total: total,
        total_pages: Math.ceil(total / currentLimit) || 1,
      };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch rules:', err);
    } finally {
      loading.value = false;
    }
  }

  async function getRule(ruleId: string): Promise<SingleRuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as SingleRuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createRule(rule: CreateRuleRequest): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to create rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to create rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateRule(ruleId: string, updates: Partial<CreateRuleRequest>): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to update rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to update rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function deleteRule(ruleId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to delete rule: ${response.status}`);
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to delete rule:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function activateRule(ruleId: string): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}/activate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to activate rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to activate rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function deactivateRule(ruleId: string): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}/deactivate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to deactivate rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to deactivate rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function cloneRule(ruleId: string, newRuleId: string, newName?: string): Promise<RuleResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchWithAuth(`${functionsUrl}/rules/${ruleId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_rule_id: newRuleId,
          new_rule_name: newName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to clone rule: ${response.status}`);
      }

      const data = await response.json();
      return data.data as RuleResponse;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to clone rule:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    rules,
    loading,
    error,
    pagination,
    fetchRules,
    getRule,
    createRule,
    updateRule,
    deleteRule,
    activateRule,
    deactivateRule,
    cloneRule,
  };
}
