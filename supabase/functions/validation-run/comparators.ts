/**
 * SecureDealAI MVP - Comparator Functions
 * Value comparison functions for validation rules
 */

import { ComparisonConfig, ComparisonType } from './types.ts';

// =============================================================================
// COMPARISON RESULT
// =============================================================================

export interface ComparisonResult {
  isMatch: boolean;
  similarity?: number;    // 0-1 for fuzzy matches
  details?: string;
}

// =============================================================================
// FUZZY MATCHING - Levenshtein Distance
// =============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // Deletion
        dp[i][j - 1] + 1,      // Insertion
        dp[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLength;
}

// =============================================================================
// COMPARISON FUNCTIONS
// =============================================================================

/**
 * Exact match comparison
 */
function compareExact(
  source: string,
  target: string,
  config: ComparisonConfig
): ComparisonResult {
  const caseSensitive = config.caseSensitive ?? false;

  const s = caseSensitive ? source : source.toLowerCase();
  const t = caseSensitive ? target : target.toLowerCase();

  return {
    isMatch: s === t,
    similarity: s === t ? 1 : 0,
  };
}

/**
 * Fuzzy match using Levenshtein distance
 */
function compareFuzzy(
  source: string,
  target: string,
  config: ComparisonConfig
): ComparisonResult {
  const threshold = config.threshold ?? 0.8;
  const caseSensitive = config.caseSensitive ?? false;

  const s = caseSensitive ? source : source.toLowerCase();
  const t = caseSensitive ? target : target.toLowerCase();

  const similarity = calculateSimilarity(s, t);

  return {
    isMatch: similarity >= threshold,
    similarity,
    details: `Similarity: ${(similarity * 100).toFixed(1)}%, threshold: ${(threshold * 100).toFixed(0)}%`,
  };
}

/**
 * Contains check - source contains target or vice versa
 */
function compareContains(
  source: string,
  target: string,
  config: ComparisonConfig
): ComparisonResult {
  const caseSensitive = config.caseSensitive ?? false;

  const s = caseSensitive ? source : source.toLowerCase();
  const t = caseSensitive ? target : target.toLowerCase();

  const isMatch = s.includes(t) || t.includes(s);

  return {
    isMatch,
    details: isMatch ? 'String contains match found' : 'No containment relationship',
  };
}

/**
 * Regex pattern match
 */
function compareRegex(
  source: string,
  _target: string,
  config: ComparisonConfig
): ComparisonResult {
  if (!config.pattern) {
    return {
      isMatch: false,
      details: 'No regex pattern provided',
    };
  }

  try {
    const flags = config.caseSensitive ? '' : 'i';
    const regex = new RegExp(config.pattern, flags);
    const isMatch = regex.test(source);

    return {
      isMatch,
      details: isMatch ? `Matches pattern: ${config.pattern}` : `Does not match pattern: ${config.pattern}`,
    };
  } catch (error) {
    return {
      isMatch: false,
      details: `Invalid regex pattern: ${error}`,
    };
  }
}

/**
 * Numeric tolerance comparison
 */
function compareNumericTolerance(
  source: string,
  target: string,
  config: ComparisonConfig
): ComparisonResult {
  const sourceNum = parseFloat(source);
  const targetNum = parseFloat(target);

  if (isNaN(sourceNum) || isNaN(targetNum)) {
    return {
      isMatch: false,
      details: `Invalid numeric values: source=${source}, target=${target}`,
    };
  }

  const tolerance = config.tolerance ?? 0;
  const toleranceType = config.toleranceType ?? 'absolute';

  let difference: number;
  let allowedDifference: number;

  if (toleranceType === 'percentage') {
    // Percentage tolerance (e.g., 0.05 = 5%)
    difference = Math.abs(sourceNum - targetNum);
    allowedDifference = Math.abs(targetNum * tolerance);
  } else {
    // Absolute tolerance
    difference = Math.abs(sourceNum - targetNum);
    allowedDifference = tolerance;
  }

  const isMatch = difference <= allowedDifference;

  return {
    isMatch,
    similarity: isMatch ? 1 - difference / Math.max(Math.abs(targetNum), 1) : 0,
    details: `Difference: ${difference.toFixed(2)}, allowed: ${allowedDifference.toFixed(2)} (${toleranceType})`,
  };
}

/**
 * Date tolerance comparison (in days)
 * Supports directional comparisons for fraud detection:
 * - MIN_DAYS_BEFORE: Source date must be at least N days before target
 * - MAX_DAYS_AFTER: Source date must be at most N days after target
 * - WITHIN_RANGE: Source date must be within +/- N days of target (default)
 */
function compareDateTolerance(
  source: string,
  target: string,
  config: ComparisonConfig
): ComparisonResult {
  const sourceDate = new Date(source);
  const targetDate = new Date(target);

  if (isNaN(sourceDate.getTime()) || isNaN(targetDate.getTime())) {
    return {
      isMatch: false,
      details: `Invalid date values: source=${source}, target=${target}`,
    };
  }

  const toleranceDays = config.tolerance ?? 0;
  const direction = config.direction ?? 'WITHIN_RANGE';

  // Calculate difference: positive means target is after source
  const diffMs = targetDate.getTime() - sourceDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  switch (direction) {
    case 'MIN_DAYS_BEFORE':
      // Source date must be at least toleranceDays before target
      // e.g., re-registration date must be at least 10 days before validation date
      if (diffDays >= toleranceDays) {
        return {
          isMatch: true,
          details: `Date is ${diffDays} days before target, minimum required: ${toleranceDays}`,
        };
      }
      return {
        isMatch: false,
        details: `Date is only ${diffDays} days before target, minimum required: ${toleranceDays}`,
      };

    case 'MAX_DAYS_AFTER':
      // Source date must be at most toleranceDays after target
      if (-diffDays <= toleranceDays) {
        return {
          isMatch: true,
          details: `Date is ${-diffDays} days after target, maximum allowed: ${toleranceDays}`,
        };
      }
      return {
        isMatch: false,
        details: `Date is ${-diffDays} days after target, maximum allowed: ${toleranceDays}`,
      };

    case 'WITHIN_RANGE':
    default:
      // Date must be within +/- toleranceDays (original behavior)
      const absDiffDays = Math.abs(diffDays);
      const isMatch = absDiffDays <= toleranceDays;
      return {
        isMatch,
        details: `Difference: ${absDiffDays} days, tolerance: ${toleranceDays} days`,
      };
  }
}

/**
 * Check if value exists (is non-empty)
 */
function compareExists(
  source: string,
  _target: string,
  _config: ComparisonConfig
): ComparisonResult {
  const exists = source !== null && source !== undefined && source !== '';

  return {
    isMatch: exists,
    details: exists ? 'Value exists' : 'Value is missing or empty',
  };
}

/**
 * Check if value does not exist (is empty)
 */
function compareNotExists(
  source: string,
  _target: string,
  _config: ComparisonConfig
): ComparisonResult {
  const notExists = source === null || source === undefined || source === '';

  return {
    isMatch: notExists,
    details: notExists ? 'Value does not exist' : 'Value exists',
  };
}

/**
 * Check if value is in allowed list
 */
function compareInList(
  source: string,
  _target: string,
  config: ComparisonConfig
): ComparisonResult {
  const allowedValues = config.allowedValues ?? [];
  const caseSensitive = config.caseSensitive ?? false;

  const s = caseSensitive ? source : source.toLowerCase();
  const normalizedList = caseSensitive
    ? allowedValues
    : allowedValues.map(v => v.toLowerCase());

  const isMatch = normalizedList.includes(s);

  return {
    isMatch,
    details: isMatch
      ? `Value '${source}' is in allowed list`
      : `Value '${source}' is not in allowed list: [${allowedValues.join(', ')}]`,
  };
}

// =============================================================================
// COMPARATOR REGISTRY
// =============================================================================

const COMPARATORS: Record<
  ComparisonType,
  (source: string, target: string, config: ComparisonConfig) => ComparisonResult
> = {
  EXACT: compareExact,
  FUZZY: compareFuzzy,
  CONTAINS: compareContains,
  REGEX: compareRegex,
  NUMERIC_TOLERANCE: compareNumericTolerance,
  DATE_TOLERANCE: compareDateTolerance,
  EXISTS: compareExists,
  NOT_EXISTS: compareNotExists,
  IN_LIST: compareInList,
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Compare two values using specified comparison configuration
 */
export function compare(
  source: string | null | undefined,
  target: string | null | undefined,
  config: ComparisonConfig
): ComparisonResult {
  const sourceStr = source ?? '';
  const targetStr = target ?? '';

  const comparator = COMPARATORS[config.type];

  if (!comparator) {
    console.warn(`Unknown comparison type: ${config.type}`);
    return {
      isMatch: false,
      details: `Unknown comparison type: ${config.type}`,
    };
  }

  return comparator(sourceStr, targetStr, config);
}

/**
 * Get list of available comparison types
 */
export function getAvailableComparators(): ComparisonType[] {
  return Object.keys(COMPARATORS) as ComparisonType[];
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const _internal = {
  levenshteinDistance,
  calculateSimilarity,
  compareExact,
  compareFuzzy,
  compareContains,
  compareRegex,
  compareNumericTolerance,
  compareDateTolerance,
  compareExists,
  compareNotExists,
  compareInList,
};
