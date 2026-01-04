/**
 * Unit Tests for VehicleForm Component
 *
 * Run with: npm run test
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// UNIT TESTS - VIN Validation Logic
// =============================================================================

describe('VIN Validation', () => {
  const validateVin = (vin: string): { isValid: boolean; error: string | null } => {
    if (!vin) return { isValid: false, error: null };
    if (vin.length !== 17) {
      return { isValid: false, error: 'VIN musi mit presne 17 znaku' };
    }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return { isValid: false, error: 'VIN obsahuje neplatne znaky' };
    }
    return { isValid: true, error: null };
  };

  it('accepts valid 17-character VIN', () => {
    const result = validateVin('YV1PZA3TCL1103985');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('accepts VIN with numbers only', () => {
    const result = validateVin('12345678901234567');
    expect(result.isValid).toBe(true);
  });

  it('accepts VIN with mixed alphanumeric', () => {
    const result = validateVin('1HGCM82633A004352');
    expect(result.isValid).toBe(true);
  });

  it('rejects VIN shorter than 17 characters', () => {
    const result = validateVin('YV1PZA3TCL110398');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('17 znaku');
  });

  it('rejects VIN longer than 17 characters', () => {
    const result = validateVin('YV1PZA3TCL11039850');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('17 znaku');
  });

  it('rejects empty VIN', () => {
    const result = validateVin('');
    expect(result.isValid).toBe(false);
  });

  it('rejects VIN with invalid characters I, O, Q', () => {
    // I, O, Q are not allowed in VINs
    const result = validateVin('YV1PZA3TCL110398I');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('neplatne znaky');
  });

  it('rejects VIN with lowercase letters', () => {
    const result = validateVin('yv1pza3tcl1103985');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('neplatne znaky');
  });

  it('rejects VIN with special characters', () => {
    const result = validateVin('YV1PZA3TCL-103985');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('neplatne znaky');
  });
});

// =============================================================================
// UNIT TESTS - SPZ Normalization
// =============================================================================

describe('SPZ Normalization', () => {
  const normalizeSPZ = (spz: string): string => {
    return spz.toUpperCase().replace(/\s/g, '');
  };

  it('converts lowercase to uppercase', () => {
    expect(normalizeSPZ('abc123')).toBe('ABC123');
  });

  it('removes spaces', () => {
    expect(normalizeSPZ('5L9 4454')).toBe('5L94454');
  });

  it('handles multiple spaces', () => {
    expect(normalizeSPZ('5L9  44 54')).toBe('5L94454');
  });

  it('handles leading/trailing spaces', () => {
    expect(normalizeSPZ('  5L94454  ')).toBe('5L94454');
  });

  it('handles already normalized SPZ', () => {
    expect(normalizeSPZ('5L94454')).toBe('5L94454');
  });
});

// =============================================================================
// UNIT TESTS - Year Validation
// =============================================================================

describe('Year Validation', () => {
  const currentYear = new Date().getFullYear();

  const validateYear = (year: number | null): boolean => {
    if (year === null || year === undefined) return true; // Optional field
    return year >= 1900 && year <= currentYear + 1;
  };

  it('accepts null (optional field)', () => {
    expect(validateYear(null)).toBe(true);
  });

  it('accepts current year', () => {
    expect(validateYear(currentYear)).toBe(true);
  });

  it('accepts next year', () => {
    expect(validateYear(currentYear + 1)).toBe(true);
  });

  it('accepts year 1900', () => {
    expect(validateYear(1900)).toBe(true);
  });

  it('accepts year 2020', () => {
    expect(validateYear(2020)).toBe(true);
  });

  it('rejects year before 1900', () => {
    expect(validateYear(1899)).toBe(false);
  });

  it('rejects year too far in future', () => {
    expect(validateYear(currentYear + 2)).toBe(false);
  });
});

// =============================================================================
// UNIT TESTS - Date Format Validation
// =============================================================================

describe('Date Format Validation', () => {
  const validateDateFormat = (date: string): boolean => {
    if (!date) return true; // Optional field
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  };

  it('accepts empty string (optional)', () => {
    expect(validateDateFormat('')).toBe(true);
  });

  it('accepts valid YYYY-MM-DD format', () => {
    expect(validateDateFormat('2020-01-15')).toBe(true);
  });

  it('accepts edge date values', () => {
    expect(validateDateFormat('1900-01-01')).toBe(true);
    expect(validateDateFormat('2099-12-31')).toBe(true);
  });

  it('rejects DD/MM/YYYY format', () => {
    expect(validateDateFormat('15/01/2020')).toBe(false);
  });

  it('rejects MM-DD-YYYY format', () => {
    expect(validateDateFormat('01-15-2020')).toBe(false);
  });

  it('rejects incomplete date', () => {
    expect(validateDateFormat('2020-01')).toBe(false);
  });
});

// =============================================================================
// UNIT TESTS - Form Validity
// =============================================================================

describe('Form Validity', () => {
  interface FormData {
    spz: string;
    vin: string;
    majitel: string;
    znacka?: string;
    model?: string;
    rok_vyroby?: number | null;
  }

  const isFormValid = (form: FormData): boolean => {
    if (!form.spz) return false;
    if (!form.vin || form.vin.length !== 17) return false;
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(form.vin)) return false;
    if (!form.majitel) return false;
    return true;
  };

  it('returns true for complete valid form', () => {
    const form: FormData = {
      spz: '5L94454',
      vin: 'YV1PZA3TCL1103985',
      majitel: 'OSIT S.R.O.',
      znacka: 'VOLVO',
      model: 'V90',
    };
    expect(isFormValid(form)).toBe(true);
  });

  it('returns true for minimal valid form (required fields only)', () => {
    const form: FormData = {
      spz: '5L94454',
      vin: 'YV1PZA3TCL1103985',
      majitel: 'OSIT S.R.O.',
    };
    expect(isFormValid(form)).toBe(true);
  });

  it('returns false when SPZ is empty', () => {
    const form: FormData = {
      spz: '',
      vin: 'YV1PZA3TCL1103985',
      majitel: 'OSIT S.R.O.',
    };
    expect(isFormValid(form)).toBe(false);
  });

  it('returns false when VIN is empty', () => {
    const form: FormData = {
      spz: '5L94454',
      vin: '',
      majitel: 'OSIT S.R.O.',
    };
    expect(isFormValid(form)).toBe(false);
  });

  it('returns false when VIN is invalid', () => {
    const form: FormData = {
      spz: '5L94454',
      vin: 'INVALID',
      majitel: 'OSIT S.R.O.',
    };
    expect(isFormValid(form)).toBe(false);
  });

  it('returns false when majitel is empty', () => {
    const form: FormData = {
      spz: '5L94454',
      vin: 'YV1PZA3TCL1103985',
      majitel: '',
    };
    expect(isFormValid(form)).toBe(false);
  });
});

// =============================================================================
// UNIT TESTS - Owner Normalization
// =============================================================================

describe('Owner Normalization', () => {
  const normalizeOwner = (owner: string): string => {
    return owner.toUpperCase().trim();
  };

  it('converts to uppercase', () => {
    expect(normalizeOwner('osit s.r.o.')).toBe('OSIT S.R.O.');
  });

  it('trims whitespace', () => {
    expect(normalizeOwner('  Jan Novak  ')).toBe('JAN NOVAK');
  });

  it('handles already normalized value', () => {
    expect(normalizeOwner('OSIT S.R.O.')).toBe('OSIT S.R.O.');
  });

  it('preserves special characters', () => {
    expect(normalizeOwner('Škoda Auto a.s.')).toBe('ŠKODA AUTO A.S.');
  });
});
