/**
 * SecureDealAI MVP - ARES Validation Logic
 *
 * Implements the 7 validation rules for ARES/ADIS company verification:
 * - ARES-001: Company exists in ARES
 * - ARES-002: Company name matches (fuzzy)
 * - ARES-003: VAT ID (DIČ) matches
 * - ARES-004: Company age (> 1 year)
 * - DPH-001: Is VAT payer
 * - DPH-002: Not unreliable payer
 * - DPH-003: Bank account registered
 */

import { AresCompanyData } from '../ares-lookup/ares-client.ts';
import { DphStatus, isBankAccountRegistered } from './adis-client.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationInput {
  ico: string;
  dic?: string;
  bank_account?: string;
  company_name?: string;
  ares_data: AresCompanyData | null;
  dph_status: DphStatus | null;
}

export interface AresValidationResult {
  rule_id: string;
  rule_name: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  details?: Record<string, unknown>;
}

export type OverallStatus = 'GREEN' | 'ORANGE' | 'RED';

// =============================================================================
// VALIDATION RUNNER
// =============================================================================

/**
 * Run all ARES/ADIS validation rules
 *
 * @param input - Validation input with all required data
 * @returns Array of validation results
 */
export function runValidations(input: ValidationInput): AresValidationResult[] {
  const results: AresValidationResult[] = [];

  // ARES-001: Company exists in ARES
  results.push(validateCompanyExists(input));

  // If company doesn't exist, we can't run further validations
  if (!input.ares_data) {
    return results;
  }

  // ARES-002: Company name matches (if provided)
  if (input.company_name) {
    results.push(validateCompanyName(input));
  }

  // ARES-003: VAT ID matches (if provided)
  if (input.dic) {
    results.push(validateVatId(input));
  }

  // ARES-004: Company age (> 1 year)
  results.push(validateCompanyAge(input));

  // DPH checks (only if company has DIČ or DPH status available)
  if (input.dph_status) {
    // DPH-001: Is VAT payer
    results.push(validateVatPayerStatus(input));

    // DPH-002: Not unreliable payer
    results.push(validateNotUnreliable(input));

    // DPH-003: Bank account registered (if provided)
    if (input.bank_account) {
      results.push(validateBankAccount(input));
    }
  } else if (input.ares_data.dic || input.dic) {
    // Company has DIČ but DPH status check failed/skipped
    results.push({
      rule_id: 'DPH-001',
      rule_name: 'VAT Payer Status',
      status: 'SKIP',
      severity: 'CRITICAL',
      message: 'DPH status check unavailable - ADIS service unreachable',
      details: {
        reason: 'adis_unavailable',
      },
    });
  }

  return results;
}

/**
 * Calculate overall status from validation results
 *
 * Logic:
 * - RED: Any CRITICAL rule has status=FAIL
 * - ORANGE: Any WARNING rule has status=WARNING or FAIL
 * - GREEN: All rules pass or are skipped
 */
export function calculateOverallStatus(results: AresValidationResult[]): OverallStatus {
  // Check for any CRITICAL failures
  const hasCriticalFailure = results.some(
    (r) => r.severity === 'CRITICAL' && r.status === 'FAIL'
  );

  if (hasCriticalFailure) {
    return 'RED';
  }

  // Check for any WARNING issues
  const hasWarning = results.some(
    (r) => r.severity === 'WARNING' && (r.status === 'WARNING' || r.status === 'FAIL')
  );

  // Also check for CRITICAL rules that returned WARNING status
  const hasCriticalWarning = results.some(
    (r) => r.severity === 'CRITICAL' && r.status === 'WARNING'
  );

  if (hasWarning || hasCriticalWarning) {
    return 'ORANGE';
  }

  return 'GREEN';
}

// =============================================================================
// INDIVIDUAL VALIDATION RULES
// =============================================================================

/**
 * ARES-001: Company exists in ARES
 */
function validateCompanyExists(input: ValidationInput): AresValidationResult {
  return {
    rule_id: 'ARES-001',
    rule_name: 'Company Existence',
    status: input.ares_data ? 'PASS' : 'FAIL',
    severity: 'CRITICAL',
    message: input.ares_data
      ? `Company "${input.ares_data.name}" found in ARES registry`
      : `IČO ${input.ico} not found in ARES registry`,
    details: input.ares_data
      ? {
          ico: input.ares_data.ico,
          name: input.ares_data.name,
          is_active: input.ares_data.is_active,
        }
      : {
          searched_ico: input.ico,
        },
  };
}

/**
 * ARES-002: Company name matches (fuzzy comparison)
 * Threshold: >= 80% similarity
 */
function validateCompanyName(input: ValidationInput): AresValidationResult {
  const similarity = fuzzyMatch(input.company_name!, input.ares_data!.name);
  const threshold = 0.8;

  return {
    rule_id: 'ARES-002',
    rule_name: 'Company Name Match',
    status: similarity >= threshold ? 'PASS' : 'WARNING',
    severity: 'WARNING',
    message:
      similarity >= threshold
        ? `Company name matches ARES record (${Math.round(similarity * 100)}% similarity)`
        : `Company name differs from ARES record (${Math.round(similarity * 100)}% similarity)`,
    details: {
      input_name: input.company_name,
      ares_name: input.ares_data!.name,
      similarity: Math.round(similarity * 100),
      threshold: Math.round(threshold * 100),
    },
  };
}

/**
 * ARES-003: VAT ID (DIČ) matches
 */
function validateVatId(input: ValidationInput): AresValidationResult {
  // Normalize both DIČ values for comparison
  const inputDic = normalizeDic(input.dic!);
  const aresDic = input.ares_data!.dic ? normalizeDic(input.ares_data!.dic) : null;

  const dicMatch = aresDic && inputDic === aresDic;

  return {
    rule_id: 'ARES-003',
    rule_name: 'VAT ID Match',
    status: dicMatch ? 'PASS' : 'FAIL',
    severity: 'CRITICAL',
    message: dicMatch
      ? 'DIČ matches ARES record'
      : aresDic
        ? `DIČ mismatch: expected ${aresDic}, got ${inputDic}`
        : `Company ${input.ares_data!.ico} has no DIČ in ARES`,
    details: {
      input_dic: inputDic,
      ares_dic: aresDic,
    },
  };
}

/**
 * ARES-004: Company age (> 1 year)
 */
function validateCompanyAge(input: ValidationInput): AresValidationResult {
  if (!input.ares_data!.date_founded) {
    return {
      rule_id: 'ARES-004',
      rule_name: 'Company Age',
      status: 'SKIP',
      severity: 'WARNING',
      message: 'Company founding date not available in ARES',
    };
  }

  const founded = new Date(input.ares_data!.date_founded);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const isOldEnough = founded < oneYearAgo;
  const ageInDays = Math.floor(
    (Date.now() - founded.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    rule_id: 'ARES-004',
    rule_name: 'Company Age',
    status: isOldEnough ? 'PASS' : 'WARNING',
    severity: 'WARNING',
    message: isOldEnough
      ? `Company founded ${input.ares_data!.date_founded} (${Math.floor(ageInDays / 365)} years ago)`
      : `Company is less than 1 year old (founded ${input.ares_data!.date_founded})`,
    details: {
      date_founded: input.ares_data!.date_founded,
      age_days: ageInDays,
      threshold_days: 365,
    },
  };
}

/**
 * DPH-001: Is VAT payer
 */
function validateVatPayerStatus(input: ValidationInput): AresValidationResult {
  return {
    rule_id: 'DPH-001',
    rule_name: 'VAT Payer Status',
    status: input.dph_status!.is_vat_payer ? 'PASS' : 'FAIL',
    severity: 'CRITICAL',
    message: input.dph_status!.is_vat_payer
      ? 'Company is a registered VAT payer'
      : 'Company is NOT a registered VAT payer',
    details: {
      is_vat_payer: input.dph_status!.is_vat_payer,
      checked_at: input.dph_status!.checked_at,
    },
  };
}

/**
 * DPH-002: Not unreliable payer
 */
function validateNotUnreliable(input: ValidationInput): AresValidationResult {
  const isUnreliable = input.dph_status!.is_unreliable;

  return {
    rule_id: 'DPH-002',
    rule_name: 'Unreliable Payer Check',
    status: isUnreliable ? 'FAIL' : 'PASS',
    severity: 'CRITICAL',
    message: isUnreliable
      ? `WARNING: Company is marked as UNRELIABLE VAT payer${input.dph_status!.unreliable_since ? ` since ${input.dph_status!.unreliable_since}` : ''}!`
      : 'Company is NOT on the unreliable payer list',
    details: {
      is_unreliable: isUnreliable,
      unreliable_since: input.dph_status!.unreliable_since,
    },
  };
}

/**
 * DPH-003: Bank account registered
 */
function validateBankAccount(input: ValidationInput): AresValidationResult {
  const isRegistered = isBankAccountRegistered(
    input.bank_account!,
    input.dph_status!.registered_accounts
  );

  return {
    rule_id: 'DPH-003',
    rule_name: 'Bank Account Registration',
    status: isRegistered ? 'PASS' : 'WARNING',
    severity: 'WARNING',
    message: isRegistered
      ? 'Bank account is registered with tax authority'
      : 'Bank account is NOT registered with tax authority - payment may not be tax deductible',
    details: {
      input_account: input.bank_account,
      registered_accounts_count: input.dph_status!.registered_accounts.length,
      is_registered: isRegistered,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Fuzzy match using Levenshtein distance
 * Returns similarity ratio between 0 and 1
 */
function fuzzyMatch(a: string, b: string): number {
  // Normalize strings for comparison
  const normalizedA = normalizeForComparison(a);
  const normalizedB = normalizeForComparison(b);

  if (normalizedA === normalizedB) {
    return 1.0;
  }

  const longer = normalizedA.length > normalizedB.length ? normalizedA : normalizedB;
  const shorter = normalizedA.length > normalizedB.length ? normalizedB : normalizedA;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Normalize string for comparison
 * - Lowercase
 * - Remove diacritics
 * - Remove extra whitespace
 * - Remove common legal form suffixes
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ' ')
    .replace(/\.\s*/g, ' ')
    .replace(/\b(s\.?r\.?o\.?|a\.?s\.?|spol\.?|v\.?o\.?s\.?|k\.?s\.?)\b/gi, '') // Remove legal forms
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  // Create distance matrix
  const d: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first column
  for (let i = 0; i <= m; i++) {
    d[i][0] = i;
  }

  // Initialize first row
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Normalize DIČ for comparison
 * Ensures consistent format: CZxxxxxxxx (uppercase, no spaces)
 */
function normalizeDic(dic: string): string {
  const cleaned = dic.replace(/\s+/g, '').toUpperCase();
  return cleaned.startsWith('CZ') ? cleaned : `CZ${cleaned}`;
}
