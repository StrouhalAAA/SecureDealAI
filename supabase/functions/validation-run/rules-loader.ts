/**
 * SecureDealAI MVP - Rules Loader
 * Loads validation rules from Supabase database
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationRule, ValidationRuleRow } from './types.ts';

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 */
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

// =============================================================================
// CACHING
// =============================================================================

interface CacheEntry {
  rules: ValidationRule[];
  hash: string;
  timestamp: number;
}

let rulesCache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!rulesCache) return false;

  const now = Date.now();
  return now - rulesCache.timestamp < CACHE_TTL_MS;
}

/**
 * Invalidate the rules cache
 */
export function invalidateCache(): void {
  rulesCache = null;
}

// =============================================================================
// RULES LOADING
// =============================================================================

/**
 * Load all active validation rules from database
 */
export async function loadActiveRules(): Promise<ValidationRule[]> {
  // Check cache first
  if (isCacheValid() && rulesCache) {
    console.log(`[RulesLoader] Using cached rules (${rulesCache.rules.length} rules)`);
    return rulesCache.rules;
  }

  const client = getSupabaseClient();

  console.log('[RulesLoader] Loading active rules from database...');

  const { data, error } = await client
    .from('validation_rules')
    .select('rule_id, rule_definition, version, activated_at')
    .eq('is_active', true)
    .order('rule_definition->metadata->priority', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[RulesLoader] Error loading rules:', error);
    throw new Error(`Failed to load validation rules: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn('[RulesLoader] No active rules found');
    return [];
  }

  // Extract rule definitions
  const rules: ValidationRule[] = data.map((row: ValidationRuleRow) => row.rule_definition);

  // Filter only enabled rules
  const enabledRules = rules.filter(rule => rule.enabled !== false);

  // Sort by priority
  enabledRules.sort((a, b) => {
    const priorityA = a.metadata?.priority ?? 50;
    const priorityB = b.metadata?.priority ?? 50;
    return priorityA - priorityB;
  });

  // Compute hash for reproducibility
  const hash = await computeRulesHash(enabledRules);

  // Update cache
  rulesCache = {
    rules: enabledRules,
    hash,
    timestamp: Date.now(),
  };

  console.log(`[RulesLoader] Loaded ${enabledRules.length} active rules (hash: ${hash.substring(0, 8)})`);

  return enabledRules;
}

/**
 * Load a specific rule by ID
 */
export async function loadRuleById(ruleId: string): Promise<ValidationRule | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('validation_rules')
    .select('rule_definition')
    .eq('rule_id', ruleId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to load rule ${ruleId}: ${error.message}`);
  }

  return data?.rule_definition ?? null;
}

/**
 * Load rules by category
 */
export async function loadRulesByCategory(
  category: 'vehicle' | 'vendor_fo' | 'vendor_po' | 'cross' | 'external'
): Promise<ValidationRule[]> {
  const allRules = await loadActiveRules();

  return allRules.filter(rule => rule.metadata?.category === category);
}

/**
 * Load rules by severity
 */
export async function loadRulesBySeverity(
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
): Promise<ValidationRule[]> {
  const allRules = await loadActiveRules();

  return allRules.filter(rule => rule.severity === severity);
}

// =============================================================================
// HASH COMPUTATION
// =============================================================================

/**
 * Compute a hash of the rules for reproducibility tracking
 */
export async function computeRulesHash(rules: ValidationRule[]): Promise<string> {
  const rulesString = JSON.stringify(
    rules.map(r => ({ id: r.id, name: r.name })).sort((a, b) => a.id.localeCompare(b.id))
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(rulesString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Get current rules snapshot hash
 */
export async function getRulesSnapshotHash(): Promise<string> {
  const rules = await loadActiveRules();
  return rulesCache?.hash ?? await computeRulesHash(rules);
}

// =============================================================================
// FALLBACK - LOAD FROM JSON FILE
// =============================================================================

/**
 * Load rules from seed JSON file (fallback for development/testing)
 */
export async function loadRulesFromSeed(): Promise<ValidationRule[]> {
  try {
    const seedPath = new URL('./VALIDATION_RULES_SEED.json', import.meta.url);
    const response = await fetch(seedPath);

    if (!response.ok) {
      throw new Error(`Failed to fetch seed file: ${response.status}`);
    }

    const seed = await response.json();
    const rules: ValidationRule[] = seed.rules ?? [];

    // Filter only enabled MVP rules
    const enabledRules = rules.filter(
      rule => rule.enabled && rule.metadata?.phase === 'mvp'
    );

    console.log(`[RulesLoader] Loaded ${enabledRules.length} rules from seed file`);

    return enabledRules;
  } catch (error) {
    console.error('[RulesLoader] Failed to load seed rules:', error);
    return [];
  }
}

// =============================================================================
// RULES VALIDATION
// =============================================================================

/**
 * Validate a rule definition against expected schema
 */
export function validateRuleDefinition(rule: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule || typeof rule !== 'object') {
    return { valid: false, errors: ['Rule must be an object'] };
  }

  const r = rule as Record<string, unknown>;

  // Required fields
  if (!r.id || typeof r.id !== 'string') {
    errors.push('Missing or invalid rule id');
  } else if (!/^[A-Z]{2,4}-[0-9]{3}$/.test(r.id as string)) {
    errors.push(`Invalid rule id format: ${r.id} (expected: XX-000 or XXX-000)`);
  }

  if (!r.name || typeof r.name !== 'string') {
    errors.push('Missing or invalid rule name');
  }

  if (!r.source || typeof r.source !== 'object') {
    errors.push('Missing or invalid source configuration');
  }

  if (!r.target || typeof r.target !== 'object') {
    errors.push('Missing or invalid target configuration');
  }

  if (!r.comparison || typeof r.comparison !== 'object') {
    errors.push('Missing or invalid comparison configuration');
  }

  if (!r.severity || !['CRITICAL', 'WARNING', 'INFO'].includes(r.severity as string)) {
    errors.push('Missing or invalid severity (must be CRITICAL, WARNING, or INFO)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get rules statistics
 */
export async function getRulesStatistics(): Promise<{
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byPhase: Record<string, number>;
}> {
  const rules = await loadActiveRules();

  const stats = {
    total: rules.length,
    byCategory: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    byPhase: {} as Record<string, number>,
  };

  for (const rule of rules) {
    // By category
    const category = rule.metadata?.category ?? 'unknown';
    stats.byCategory[category] = (stats.byCategory[category] ?? 0) + 1;

    // By severity
    stats.bySeverity[rule.severity] = (stats.bySeverity[rule.severity] ?? 0) + 1;

    // By phase
    const phase = rule.metadata?.phase ?? 'unknown';
    stats.byPhase[phase] = (stats.byPhase[phase] ?? 0) + 1;
  }

  return stats;
}
