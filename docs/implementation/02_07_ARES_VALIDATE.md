# Task 2.7: ARES Validate (Full Validation)

> **Phase**: 2 - Backend API
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: 2.4 ARES Lookup, INT_02 ARES/ADIS API Spec
> **Estimated Effort**: Medium

---

## Objective

Create a Supabase Edge Function for comprehensive ARES/ADIS validation of company vendors, including DPH (VAT) status checks and bank account verification.

---

## Prerequisites

- [ ] Task 2.4 completed (ARES Lookup working)
- [ ] INT_02 completed (ARES/ADIS API specification documented)
- [ ] ADIS API access confirmed

---

## API Specification

### Endpoint
```
POST /functions/v1/ares-validate
```

### Request
```typescript
interface AresValidateRequest {
  buying_opportunity_id: string;
  ico: string;                    // Required
  dic?: string;                   // Optional, for DIC verification
  bank_account?: string;          // Optional, for bank account check
  company_name?: string;          // Optional, for name comparison
}
```

### Response
```typescript
interface AresValidateResponse {
  id: string;                     // ares_validations record ID
  buying_opportunity_id: string;
  overall_status: 'GREEN' | 'ORANGE' | 'RED';
  validation_results: AresValidationResult[];
  ares_data: AresCompanyData;
  dph_status: DphStatus | null;
  created_at: string;
}

interface AresValidationResult {
  rule_id: string;
  rule_name: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  details?: Record<string, unknown>;
}

interface DphStatus {
  is_vat_payer: boolean;
  is_unreliable: boolean;
  registered_accounts: string[];
  checked_at: string;
}
```

---

## Validation Rules

| Rule ID | Check | Severity | Pass Condition |
|---------|-------|----------|----------------|
| ARES-001 | Company exists | CRITICAL | IČO found in ARES |
| ARES-002 | Company name matches | WARNING | FUZZY match >= 80% |
| ARES-003 | VAT ID matches | CRITICAL | DIČ in request = DIČ in ARES |
| ARES-004 | Company age | WARNING | Founded > 1 year ago |
| DPH-001 | Is VAT payer | CRITICAL | is_vat_payer = true |
| DPH-002 | Not unreliable payer | CRITICAL | is_unreliable = false |
| DPH-003 | Bank account registered | WARNING | Account in registered_accounts |

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p MVPScope/supabase/functions/ares-validate
```

### Step 2: Create ADIS Client

```typescript
// MVPScope/supabase/functions/ares-validate/adis-client.ts

interface AdisResponse {
  dic: string;
  nespolehlivy: boolean;
  datumZverejneni?: string;
  bankovniUcty: string[];
}

export async function checkDphStatus(dic: string): Promise<AdisResponse | null> {
  const ADIS_URL = Deno.env.get("ADIS_API_URL") || "https://adis.mfcr.cz/dpr/DphReg";

  try {
    // Query ADIS registry
    const response = await fetch(`${ADIS_URL}?dic=${dic}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (response.status === 404) {
      return null; // Not a VAT payer
    }

    if (!response.ok) {
      throw new Error(`ADIS API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("ADIS fetch error:", error);
    throw error;
  }
}

export function transformAdisResponse(adis: AdisResponse): DphStatus {
  return {
    is_vat_payer: true,
    is_unreliable: adis.nespolehlivy === true,
    registered_accounts: adis.bankovniUcty || [],
    checked_at: new Date().toISOString(),
  };
}
```

### Step 3: Create Validation Logic

```typescript
// MVPScope/supabase/functions/ares-validate/validator.ts

import { AresLookupData } from "./ares-client.ts";
import { DphStatus } from "./adis-client.ts";

interface ValidationInput {
  ico: string;
  dic?: string;
  bank_account?: string;
  company_name?: string;
  ares_data: AresLookupData | null;
  dph_status: DphStatus | null;
}

export function runValidations(input: ValidationInput): AresValidationResult[] {
  const results: AresValidationResult[] = [];

  // ARES-001: Company exists
  results.push({
    rule_id: 'ARES-001',
    rule_name: 'Company Existence',
    status: input.ares_data ? 'PASS' : 'FAIL',
    severity: 'CRITICAL',
    message: input.ares_data
      ? `Company "${input.ares_data.name}" found in ARES`
      : `IČO ${input.ico} not found in ARES registry`,
  });

  if (!input.ares_data) {
    return results; // Cannot continue without ARES data
  }

  // ARES-002: Company name matches (if provided)
  if (input.company_name) {
    const similarity = fuzzyMatch(input.company_name, input.ares_data.name);
    results.push({
      rule_id: 'ARES-002',
      rule_name: 'Company Name Match',
      status: similarity >= 0.8 ? 'PASS' : 'WARNING',
      severity: 'WARNING',
      message: `Name similarity: ${Math.round(similarity * 100)}%`,
      details: {
        input_name: input.company_name,
        ares_name: input.ares_data.name,
        similarity,
      },
    });
  }

  // ARES-003: VAT ID matches (if provided)
  if (input.dic) {
    const dicMatch = input.ares_data.dic === input.dic;
    results.push({
      rule_id: 'ARES-003',
      rule_name: 'VAT ID Match',
      status: dicMatch ? 'PASS' : 'FAIL',
      severity: 'CRITICAL',
      message: dicMatch
        ? 'DIČ matches ARES record'
        : `DIČ mismatch: expected ${input.ares_data.dic}, got ${input.dic}`,
    });
  }

  // ARES-004: Company age (> 1 year)
  if (input.ares_data.date_founded) {
    const founded = new Date(input.ares_data.date_founded);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const isOldEnough = founded < oneYearAgo;
    results.push({
      rule_id: 'ARES-004',
      rule_name: 'Company Age',
      status: isOldEnough ? 'PASS' : 'WARNING',
      severity: 'WARNING',
      message: isOldEnough
        ? `Company founded ${input.ares_data.date_founded}`
        : `Company is less than 1 year old (founded ${input.ares_data.date_founded})`,
    });
  }

  // DPH checks
  if (input.dph_status) {
    // DPH-001: Is VAT payer
    results.push({
      rule_id: 'DPH-001',
      rule_name: 'VAT Payer Status',
      status: input.dph_status.is_vat_payer ? 'PASS' : 'FAIL',
      severity: 'CRITICAL',
      message: input.dph_status.is_vat_payer
        ? 'Company is registered VAT payer'
        : 'Company is not a registered VAT payer',
    });

    // DPH-002: Not unreliable
    results.push({
      rule_id: 'DPH-002',
      rule_name: 'Unreliable Payer Check',
      status: input.dph_status.is_unreliable ? 'FAIL' : 'PASS',
      severity: 'CRITICAL',
      message: input.dph_status.is_unreliable
        ? 'WARNING: Company is marked as unreliable VAT payer!'
        : 'Company is not on unreliable payer list',
    });

    // DPH-003: Bank account registered (if provided)
    if (input.bank_account) {
      const isRegistered = input.dph_status.registered_accounts.includes(
        normalizeBankAccount(input.bank_account)
      );
      results.push({
        rule_id: 'DPH-003',
        rule_name: 'Bank Account Registration',
        status: isRegistered ? 'PASS' : 'WARNING',
        severity: 'WARNING',
        message: isRegistered
          ? 'Bank account is registered with tax authority'
          : 'Bank account is NOT registered with tax authority',
      });
    }
  } else if (input.ares_data.dic) {
    // DPH status expected but not available
    results.push({
      rule_id: 'DPH-001',
      rule_name: 'VAT Payer Status',
      status: 'SKIP',
      severity: 'CRITICAL',
      message: 'DPH status check unavailable',
    });
  }

  return results;
}

function fuzzyMatch(a: string, b: string): number {
  // Levenshtein-based similarity
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(
    longer.toLowerCase(),
    shorter.toLowerCase()
  );

  return (longer.length - distance) / longer.length;
}

function normalizeBankAccount(account: string): string {
  return account.replace(/\s+/g, '').replace(/-/g, '');
}
```

### Step 4: Implement index.ts

```typescript
// MVPScope/supabase/functions/ares-validate/index.ts
// ... combine ARES lookup + ADIS check + validation logic
// ... store results in ares_validations table
```

### Step 5: Deploy Function

```bash
supabase functions deploy ares-validate
supabase secrets set ADIS_API_URL=https://...
```

---

## Overall Status Logic

```
IF any CRITICAL rule has status=FAIL:
  overall_status = 'RED'
ELSE IF any WARNING rule has status=WARNING or FAIL:
  overall_status = 'ORANGE'
ELSE:
  overall_status = 'GREEN'
```

---

## Validation Criteria

- [ ] ARES-001 to ARES-004 rules work correctly
- [ ] DPH-001 to DPH-003 rules work correctly
- [ ] Overall status calculated correctly
- [ ] Results stored in ares_validations table
- [ ] Unreliable payer detection works
- [ ] Bank account check works

---

## Test Cases

```bash
# Validate company
curl -X POST "https://[project].supabase.co/functions/v1/ares-validate" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "buying_opportunity_id": "uuid-123",
    "ico": "27074358",
    "dic": "CZ27074358",
    "company_name": "Example s.r.o.",
    "bank_account": "123456789/0100"
  }'
```

---

## Related Documents

- [INT_02_ARES_ADIS_API.md](./INT_02_ARES_ADIS_API.md) - ARES/ADIS API specification
- [02_04_ARES_LOOKUP.md](./02_04_ARES_LOOKUP.md) - ARES Lookup (instant)

---

## Completion Checklist

- [x] ADIS API specification documented (INT_02)
- [x] Function created and deployed
- [x] All 7 rules implemented
- [x] Overall status calculation correct
- [x] Results persisted to database
- [ ] Tests pass (manual testing recommended)
- [x] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
