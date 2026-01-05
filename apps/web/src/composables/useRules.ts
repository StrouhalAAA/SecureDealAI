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
  'ocr_orv', 'ocr_op', 'ocr_vtp', 'ares', 'adis', 'cebia'
] as const;

export type TransformType = typeof TRANSFORM_TYPES[number];
export type ComparatorType = typeof COMPARATOR_TYPES[number];
export type EntityType = typeof ENTITY_TYPES[number];

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

export interface RulesListResponse {
  data: RuleResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
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

      const data = await response.json() as { data: RulesListResponse };
      rules.value = data.data.data;
      pagination.value = data.data.pagination;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch rules:', err);
    } finally {
      loading.value = false;
    }
  }

  async function getRule(ruleId: string): Promise<RuleResponse | null> {
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
      return data.data as RuleResponse;
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
