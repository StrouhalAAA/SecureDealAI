# Mock API Implementation Plan - Prověrky MVP

**Version:** 1.0
**Created:** 2025-01-18
**Based on:** docs/ckeck.md specification

---

## Executive Summary

This plan outlines the implementation of validation check APIs ("Prověrky") for SecureDealAI MVP. Based on research, we can use **real APIs** for some services and **mock APIs** for others.

### API Strategy Overview

| Service | Strategy | Reason |
|---------|----------|--------|
| MVCR Invalid Documents | **REAL API** | Free, public, no auth required |
| MDCR STK History | **REAL API** | Free with API key registration |
| ISIR Insolvency | **MOCK** | Requires building local DB replica (complex) |
| CEE Executions | **MOCK** | Paid (60 CZK/query) |
| Cebia AUTOTRACER | **MOCK** | B2B partnership required, paid |
| SFDI e-Dalnice | **MOCK** | No public API available |

---

## Phase 1: Real API Integrations

### 1.1 MVCR Invalid Documents API

**Priority:** HIGH (Free, immediate implementation possible)

#### Endpoint Details
```
URL: https://aplikace.mvcr.cz/neplatne-doklady/doklady.aspx
Method: GET
Auth: None
Response: XML
```

#### Parameters
| Param | Description | Values |
|-------|-------------|--------|
| `dotaz` | Document number | e.g., "123456789" |
| `doklad` | Document type | 0=ID Card, 4=Passport, 6=Weapons |

#### Implementation Tasks
- [ ] Create `supabase/functions/mvcr-documents/` Edge Function
- [ ] Implement XML response parser
- [ ] Create TypeScript types for response
- [ ] Add to validation engine as `DOCUMENT_VALIDITY` check
- [ ] Handle document number format validation (9 digits for new ID, etc.)

#### Sample Integration
```typescript
// mvcr-client.ts
interface MvcrResponse {
  isValid: boolean;
  isInRegistry: boolean;
  registeredSince?: string;
  lastUpdate: string;
}

async function checkDocumentValidity(
  documentNumber: string,
  documentType: 'ID_CARD' | 'PASSPORT'
): Promise<MvcrResponse>
```

---

### 1.2 MDCR STK History API (Datová kostka)

**Priority:** HIGH (Free with registration)

#### Endpoint Details
```
URL: https://api.dataovozidlech.cz/api/vehicletechnicaldata/v2
Method: GET
Auth: API key in header
Response: JSON
```

#### Registration Required
- Register at: https://dataovozidlech.cz/registraceApi
- Obtain API key
- Add to Supabase secrets

#### Implementation Tasks
- [ ] Register for API access
- [ ] Create `supabase/functions/mdcr-stk/` Edge Function
- [ ] Implement client with API key auth
- [ ] Create TypeScript types for vehicle technical data
- [ ] Extract STK history and odometer readings
- [ ] Add to validation engine as `INSPECTION_HISTORY` check

#### Data Available
- Vehicle technical specifications
- STK inspection history with dates
- Odometer readings at each inspection
- Defects found during inspections

---

## Phase 2: Mock API Infrastructure

### 2.1 Mock API Architecture

Create a unified mock service that simulates all external APIs:

```
supabase/functions/
├── proverky-mock/           # Main mock service
│   ├── index.ts             # Router
│   ├── handlers/
│   │   ├── execution.ts     # CEE mock
│   │   ├── insolvency.ts    # ISIR mock
│   │   ├── vehicle.ts       # Cebia mock
│   │   └── highway.ts       # SFDI mock
│   ├── scenarios/
│   │   ├── person.ts        # Person mock scenarios
│   │   ├── company.ts       # Company mock scenarios
│   │   └── vehicle.ts       # Vehicle mock scenarios
│   └── types.ts
```

### 2.2 Mock Scenario System

Based on the specification, implement deterministic mock scenarios:

```typescript
// Request with mock control
interface ProverkaRequest {
  subjectType: 'PERSON' | 'COMPANY' | 'VEHICLE';
  checks: CheckType[];
  mockScenario?: MockScenario;  // For testing

  // Subject data...
}

// Scenario determines response
enum MockScenario {
  // Person scenarios
  PERSON_CLEAN = 'person_clean',
  PERSON_EXECUTION_SMALL = 'person_execution_small',
  PERSON_EXECUTION_LARGE = 'person_execution_large',
  PERSON_INSOLVENCY_BANKRUPTCY = 'person_insolvency_bankruptcy',

  // Vehicle scenarios
  VEHICLE_CLEAN = 'vehicle_clean',
  VEHICLE_STOLEN = 'vehicle_stolen',
  VEHICLE_ODOMETER_TAMPERED = 'vehicle_odometer_tampered',
  // ... etc
}
```

### 2.3 Deterministic Mock Logic

For production-like behavior without explicit scenarios:

```typescript
// Derive scenario from input data (e.g., last digit of RČ)
function deriveScenario(input: ProverkaRequest): MockScenario {
  if (input.person?.socialSecurityNumber) {
    const lastDigit = parseInt(input.person.socialSecurityNumber.slice(-1));
    switch (lastDigit) {
      case 0: return 'PERSON_CLEAN';
      case 1: return 'PERSON_EXECUTION_SMALL';
      case 2: return 'PERSON_EXECUTION_LARGE';
      case 3: return 'PERSON_INSOLVENCY_FILED';
      // ... etc
    }
  }
  return 'CLEAN';
}
```

---

## Phase 3: Individual Mock Implementations

### 3.1 CEE Executions Mock

**Check Type:** `EXECUTION`

```typescript
interface ExecutionCheckResult {
  checkType: 'EXECUTION';
  status: 'CLEAN' | 'FOUND';
  source: 'CEE_MOCK';
  checkedAt: string;
  records: ExecutionRecord[];
  summary?: {
    totalRecords: number;
    totalPrincipal: number;
    totalDebt: number;
  };
}

interface ExecutionRecord {
  caseNumber: string;        // "123 EX 4567/2023"
  executorName: string;
  executorOffice: string;
  creditor: string;
  principalAmount: number;
  totalAmount: number;
  currency: 'CZK';
  filedDate: string;
  status: 'ACTIVE' | 'COMPLETED';
}
```

**Mock Scenarios:**
| Scenario | Records | Total Debt | Result |
|----------|---------|------------|--------|
| `EXECUTION_NONE` | 0 | 0 | OK |
| `EXECUTION_SINGLE_SMALL` | 1 | < 50,000 | WARNING |
| `EXECUTION_SINGLE_LARGE` | 1 | > 100,000 | BLOCKED |
| `EXECUTION_MULTIPLE` | 3+ | varies | BLOCKED |

---

### 3.2 ISIR Insolvency Mock

**Check Type:** `INSOLVENCY`

```typescript
interface InsolvencyCheckResult {
  checkType: 'INSOLVENCY';
  status: 'CLEAN' | 'FOUND';
  source: 'ISIR_MOCK';
  checkedAt: string;
  records: InsolvencyRecord[];
}

interface InsolvencyRecord {
  caseNumber: string;        // "KSOS 25 INS 12345/2024"
  court: string;
  filedDate: string;
  status: InsolvencyStatus;
  statusDate: string;
  trustee?: {
    name: string;
    address: string;
  };
}

type InsolvencyStatus =
  | 'NONE'
  | 'FILED'
  | 'MORATORIUM'
  | 'RESTRUCTURING'
  | 'BANKRUPTCY_DECLARED'
  | 'DEBT_RELIEF'
  | 'COMPLETED';
```

**Mock Scenarios:**
| Scenario | Status | Result |
|----------|--------|--------|
| `INSOLVENCY_NONE` | NONE | OK |
| `INSOLVENCY_FILED` | FILED | WARNING |
| `INSOLVENCY_BANKRUPTCY` | BANKRUPTCY_DECLARED | BLOCKED |
| `INSOLVENCY_DEBT_RELIEF` | DEBT_RELIEF | WARNING |

---

### 3.3 Cebia Vehicle Checks Mock

**Check Types:** `VEHICLE_BLACKLIST`, `ODOMETER_CHECK`, `ACCIDENT_HISTORY`

```typescript
interface VehicleBlacklistResult {
  checkType: 'VEHICLE_BLACKLIST';
  status: 'CLEAN' | 'STOLEN' | 'WANTED';
  source: 'CEBIA_MOCK';
  vehicle: {
    vin: string;
    isStolen: boolean;
    isWanted: boolean;
    databases: DatabaseCheck[];
    stolenRecord?: StolenRecord;
  };
}

interface OdometerCheckResult {
  checkType: 'ODOMETER_CHECK';
  status: 'OK' | 'SUSPECTED_TAMPERING';
  source: 'CEBIA_MDCR_MOCK';
  currentOdometer: number;
  history: OdometerReading[];
  analysis: {
    isSuspicious: boolean;
    suspicionReason?: 'ODOMETER_ROLLBACK' | 'IMPOSSIBLE_INCREASE';
    discrepancy?: {
      lastRecordedKm: number;
      currentKm: number;
      difference: number;
    };
    confidence: number;
  };
}

interface AccidentHistoryResult {
  checkType: 'ACCIDENT_HISTORY';
  status: 'CLEAN' | 'FOUND';
  source: 'CEBIA_MOCK';
  accidents: AccidentRecord[];
  summary: {
    totalAccidents: number;
    majorAccidents: number;
    minorAccidents: number;
    totalDamage: number;
  };
}
```

---

### 3.4 SFDI Highway Vignette Mock

**Check Type:** `HIGHWAY_VIGNETTE`

```typescript
interface HighwayVignetteResult {
  checkType: 'HIGHWAY_VIGNETTE';
  status: 'VALID' | 'EXPIRED' | 'NOT_FOUND';
  source: 'SFDI_MOCK';
  vignette?: {
    vehicleIdentifier: string;
    identifierType: 'VIN' | 'SPZ';
    validFrom: string;
    validTo: string;
    type: 'ANNUAL' | 'MONTHLY' | '10_DAY';
    vehicleCategory: string;
    isCurrentlyValid: boolean;
    daysRemaining?: number;
    expiredDaysAgo?: number;
  };
}
```

---

## Phase 4: Unified Prověrky API

### 4.1 Main Endpoint

```
POST /proverky
```

### 4.2 Request Schema

```typescript
interface ProverkaRequest {
  subjectType: 'PERSON' | 'COMPANY' | 'VEHICLE';

  person?: {
    socialSecurityNumber: string;  // RČ without slash
    firstName?: string;
    lastName?: string;
    birthDate?: string;
  };

  company?: {
    ico: string;                   // 8 digits
    dic?: string;                  // CZ + ICO
    name?: string;
  };

  vehicle?: {
    vin: string;                   // 17 chars
    spz?: string;
    currentOdometer?: number;
  };

  document?: {
    type: 'ID_CARD' | 'PASSPORT';
    number: string;
  };

  checks: CheckType[];

  // Development/testing only
  mockScenario?: MockScenario;
  useMockApi?: boolean;           // Force mock even for real APIs
}
```

### 4.3 Response Schema

```typescript
interface ProverkaResponse {
  requestId: string;
  timestamp: string;
  processingTimeMs: number;

  overallStatus: 'OK' | 'WARNING' | 'BLOCKED';

  results: CheckResult[];
  blockingReasons: BlockingReason[];
  warnings: Warning[];

  // Metadata
  apisUsed: {
    checkType: CheckType;
    source: 'REAL' | 'MOCK';
    apiName: string;
  }[];
}
```

---

## Phase 5: Integration with Validation Engine

### 5.1 Add New Check Types

Update `supabase/functions/validation-run/types.ts`:

```typescript
type ExternalCheckType =
  | 'EXECUTION'           // CEE
  | 'INSOLVENCY'          // ISIR
  | 'DOCUMENT_VALIDITY'   // MVCR (real)
  | 'VEHICLE_BLACKLIST'   // Cebia
  | 'ODOMETER_CHECK'      // Cebia + MDCR
  | 'ACCIDENT_HISTORY'    // Cebia
  | 'HIGHWAY_VIGNETTE'    // SFDI
  | 'INSPECTION_HISTORY'; // MDCR (real)
```

### 5.2 Create New Validation Rules

Add to `validation_rules` table:

```json
[
  {
    "rule_id": "EXT-001",
    "name": "No Active Executions",
    "severity": "CRITICAL",
    "source": { "entity": "external", "field": "execution.status" },
    "comparison": { "type": "NOT_EXISTS" }
  },
  {
    "rule_id": "EXT-002",
    "name": "No Bankruptcy",
    "severity": "CRITICAL",
    "source": { "entity": "external", "field": "insolvency.status" },
    "comparison": { "type": "NOT_IN_LIST", "values": ["BANKRUPTCY_DECLARED"] }
  },
  {
    "rule_id": "EXT-003",
    "name": "Valid ID Document",
    "severity": "CRITICAL",
    "source": { "entity": "external", "field": "document.isValid" },
    "comparison": { "type": "EXACT", "value": true }
  },
  {
    "rule_id": "EXT-004",
    "name": "Vehicle Not Stolen",
    "severity": "CRITICAL",
    "source": { "entity": "external", "field": "vehicle.isStolen" },
    "comparison": { "type": "EXACT", "value": false }
  }
]
```

---

## Implementation Timeline

### Week 1: Infrastructure
- [ ] Create mock API Edge Function structure
- [ ] Implement unified request/response types
- [ ] Set up mock scenario system

### Week 2: Real APIs
- [ ] Implement MVCR Invalid Documents client
- [ ] Register for MDCR API and implement STK client
- [ ] Test real API integrations

### Week 3: Mock Services
- [ ] Implement CEE Executions mock
- [ ] Implement ISIR Insolvency mock
- [ ] Implement Cebia vehicle checks mocks
- [ ] Implement SFDI highway vignette mock

### Week 4: Integration
- [ ] Integrate with validation engine
- [ ] Add new validation rules
- [ ] Create comprehensive test scenarios
- [ ] Documentation and testing

---

## Environment Variables

Add to Supabase secrets:

```bash
# Real APIs
MDCR_API_KEY=your-api-key-from-registration

# Mock control
PROVERKY_USE_MOCK=true|false
PROVERKY_MOCK_DELAY_MS=500
```

---

## Testing Strategy

### Unit Tests
- Test each mock handler individually
- Test real API clients with mocked HTTP responses
- Test scenario derivation logic

### Integration Tests
- Test unified `/proverky` endpoint
- Test all mock scenarios
- Test real APIs in staging environment

### Test Data
Use deterministic test data based on spec:
- RČ ending in 0 → Clean person
- RČ ending in 1 → Small execution
- VIN ending in 0 → Clean vehicle
- VIN ending in 1 → Stolen vehicle

---

## Appendix: API Reference URLs

| Service | URL | Type |
|---------|-----|------|
| MVCR Invalid Docs | `https://aplikace.mvcr.cz/neplatne-doklady/doklady.aspx` | Real |
| MDCR STK API | `https://api.dataovozidlech.cz/api/vehicletechnicaldata/v2` | Real |
| MDCR Registration | `https://dataovozidlech.cz/registraceApi` | - |
| CEE Documentation | `https://www.ceecr.cz/dev` | Reference |
| ISIR WSDL | `https://isir.justice.cz:8443/isir_ws/services/IsirPub001?wsdl` | Reference |
