/**
 * SecureDealAI MVP - Transform Functions
 * Data normalization transforms for validation comparison
 */

import { TransformType } from './types.ts';

// =============================================================================
// DIACRITICS MAPPING
// =============================================================================

const DIACRITICS_MAP: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a',
  'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A', 'Ã': 'A',
  'č': 'c', 'ć': 'c', 'ç': 'c',
  'Č': 'C', 'Ć': 'C', 'Ç': 'C',
  'ď': 'd', 'đ': 'd',
  'Ď': 'D', 'Đ': 'D',
  'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'ě': 'e', 'ę': 'e',
  'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E', 'Ě': 'E', 'Ę': 'E',
  'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
  'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I',
  'ľ': 'l', 'ĺ': 'l', 'ł': 'l',
  'Ľ': 'L', 'Ĺ': 'L', 'Ł': 'L',
  'ň': 'n', 'ń': 'n', 'ñ': 'n',
  'Ň': 'N', 'Ń': 'N', 'Ñ': 'N',
  'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o', 'ő': 'o',
  'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O', 'Õ': 'O', 'Ő': 'O',
  'ř': 'r', 'ŕ': 'r',
  'Ř': 'R', 'Ŕ': 'R',
  'š': 's', 'ś': 's', 'ş': 's',
  'Š': 'S', 'Ś': 'S', 'Ş': 'S',
  'ť': 't', 'ţ': 't',
  'Ť': 'T', 'Ţ': 'T',
  'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'ů': 'u', 'ű': 'u',
  'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U', 'Ů': 'U', 'Ű': 'U',
  'ý': 'y', 'ÿ': 'y',
  'Ý': 'Y', 'Ÿ': 'Y',
  'ž': 'z', 'ź': 'z', 'ż': 'z',
  'Ž': 'Z', 'Ź': 'Z', 'Ż': 'Z',
};

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

/**
 * Convert string to uppercase
 */
function uppercase(value: string): string {
  return value.toUpperCase();
}

/**
 * Convert string to lowercase
 */
function lowercase(value: string): string {
  return value.toLowerCase();
}

/**
 * Trim whitespace from both ends
 */
function trim(value: string): string {
  return value.trim();
}

/**
 * Remove all whitespace characters
 */
function removeSpaces(value: string): string {
  return value.replace(/\s+/g, '');
}

/**
 * Remove diacritics (accents) from string
 */
function removeDiacritics(value: string): string {
  return value
    .split('')
    .map(char => DIACRITICS_MAP[char] || char)
    .join('');
}

/**
 * Normalize date to YYYY-MM-DD format
 * Handles various input formats:
 * - DD.MM.YYYY
 * - DD/MM/YYYY
 * - YYYY-MM-DD
 * - DD-MM-YYYY
 * - ISO 8601
 */
function normalizeDate(value: string): string {
  if (!value) return '';

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // DD.MM.YYYY or DD/MM/YYYY
  const dotSlashMatch = value.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dotSlashMatch) {
    const [, day, month, year] = dotSlashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD-MM-YYYY
  const dashMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // ISO 8601 with time
  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // Try Date parsing as fallback
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore parsing errors
  }

  return value;
}

/**
 * Extract numeric value from string
 * E.g., "150 kW" -> "150", "1.234,56" -> "1234.56"
 */
function extractNumber(value: string): string {
  if (!value) return '';

  // Handle European number format (1.234,56 -> 1234.56)
  let normalized = value.replace(/\s/g, '');

  // If contains both . and , assume European format
  if (normalized.includes('.') && normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',') && !normalized.includes('.')) {
    // Only comma, assume decimal separator
    normalized = normalized.replace(',', '.');
  }

  // Extract the number
  const match = normalized.match(/-?\d+\.?\d*/);
  return match ? match[0] : '';
}

/**
 * Format Czech personal ID (Rodné číslo)
 * Normalizes to format: XXXXXX/XXXX
 */
function formatRc(value: string): string {
  if (!value) return '';

  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  if (digits.length === 9) {
    // Old format (before 1954): 9 digits
    return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  } else if (digits.length === 10) {
    // Current format: 10 digits
    return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  }

  return digits;
}

/**
 * Format Czech company ID (IČO)
 * Normalizes to 8 digits with leading zeros
 */
function formatIco(value: string): string {
  if (!value) return '';

  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // Pad to 8 digits
  return digits.padStart(8, '0');
}

/**
 * Format Czech VAT ID (DIČ)
 * Normalizes to format: CZxxxxxxxx
 */
function formatDic(value: string): string {
  if (!value) return '';

  // Remove spaces
  let normalized = value.replace(/\s/g, '').toUpperCase();

  // If starts with CZ, extract the number part
  if (normalized.startsWith('CZ')) {
    const digits = normalized.slice(2).replace(/\D/g, '');
    return `CZ${digits}`;
  }

  // Just digits - add CZ prefix
  const digits = normalized.replace(/\D/g, '');
  if (digits.length >= 8) {
    return `CZ${digits}`;
  }

  return normalized;
}

/**
 * Normalize address
 * - Expands common abbreviations
 * - Normalizes street/city format
 */
function addressNormalize(value: string): string {
  if (!value) return '';

  let normalized = value.trim().toUpperCase();

  // Expand common Czech abbreviations
  const abbreviations: Record<string, string> = {
    'UL.': 'ULICE',
    'NÁM.': 'NÁMĚSTÍ',
    'NAM.': 'NAMESTI',
    'TŘ.': 'TŘÍDA',
    'TR.': 'TRIDA',
    'KPT.': 'KAPITÁNA',
    'GEN.': 'GENERÁLA',
    'DR.': 'DOKTORA',
    'ING.': 'INŽENÝRA',
    'Č.': 'ČÍSLO',
    'ČP.': '',
    'Č.P.': '',
    'ČO.': '',
    'Č.O.': '',
  };

  for (const [abbr, full] of Object.entries(abbreviations)) {
    normalized = normalized.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), full);
  }

  // Remove multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return removeDiacritics(normalized);
}

/**
 * Normalize name
 * - Handles first/last name order
 * - Removes titles
 */
function nameNormalize(value: string): string {
  if (!value) return '';

  let normalized = value.trim().toUpperCase();

  // Remove common titles
  const titles = [
    'ING.', 'MGR.', 'BC.', 'MUDR.', 'JUDR.', 'PHDR.', 'RNDR.',
    'DOC.', 'PROF.', 'CSC.', 'PHD.', 'MBA', 'DR.', 'TH.D.',
    'ING', 'MGR', 'BC', 'MUDR', 'JUDR', 'PHDR', 'RNDR',
  ];

  for (const title of titles) {
    normalized = normalized.replace(new RegExp(`\\b${title.replace('.', '\\.')}\\b`, 'g'), '');
  }

  // Remove multiple spaces and trim
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return removeDiacritics(normalized);
}

/**
 * Normalize VIN (Vehicle Identification Number)
 * - 17 characters
 * - Uppercase
 * - No spaces
 * - Replace common OCR errors (O->0, I->1)
 */
function vinNormalize(value: string): string {
  if (!value) return '';

  let normalized = value.replace(/\s/g, '').toUpperCase();

  // VIN doesn't contain I, O, Q - fix common OCR errors
  normalized = normalized
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/Q/g, '0');

  // Take first 17 characters
  return normalized.slice(0, 17);
}

/**
 * Normalize SPZ (Czech registration plate)
 * - Uppercase
 * - No spaces or special characters
 */
function spzNormalize(value: string): string {
  if (!value) return '';

  return value
    .replace(/[\s\-\.]/g, '')
    .toUpperCase();
}

// =============================================================================
// TRANSFORM REGISTRY
// =============================================================================

const TRANSFORMS: Record<TransformType, (value: string) => string> = {
  UPPERCASE: uppercase,
  LOWERCASE: lowercase,
  TRIM: trim,
  REMOVE_SPACES: removeSpaces,
  REMOVE_DIACRITICS: removeDiacritics,
  NORMALIZE_DATE: normalizeDate,
  EXTRACT_NUMBER: extractNumber,
  FORMAT_RC: formatRc,
  FORMAT_ICO: formatIco,
  FORMAT_DIC: formatDic,
  ADDRESS_NORMALIZE: addressNormalize,
  NAME_NORMALIZE: nameNormalize,
  VIN_NORMALIZE: vinNormalize,
  SPZ_NORMALIZE: spzNormalize,
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Apply a single transform to a value
 */
export function applyTransform(value: unknown, transform: TransformType): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  const transformFn = TRANSFORMS[transform];

  if (!transformFn) {
    console.warn(`Unknown transform: ${transform}`);
    return stringValue;
  }

  return transformFn(stringValue);
}

/**
 * Apply multiple transforms in sequence
 */
export function applyTransforms(value: unknown, transforms: TransformType[]): string {
  if (!transforms || transforms.length === 0) {
    return value === null || value === undefined ? '' : String(value);
  }

  let result = value;
  for (const transform of transforms) {
    result = applyTransform(result, transform);
  }

  return result as string;
}

/**
 * Get list of available transforms
 */
export function getAvailableTransforms(): TransformType[] {
  return Object.keys(TRANSFORMS) as TransformType[];
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export const _internal = {
  uppercase,
  lowercase,
  trim,
  removeSpaces,
  removeDiacritics,
  normalizeDate,
  extractNumber,
  formatRc,
  formatIco,
  formatDic,
  addressNormalize,
  nameNormalize,
  vinNormalize,
  spzNormalize,
};
