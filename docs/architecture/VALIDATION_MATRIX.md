# Validation Matrix

Last Updated: 2026-01-01

## 1. Vehicle Validations

Source: Manual input vs OCR from ORV document

| Rule ID | Field | Match Type | Threshold | Severity | Blocking |
|---------|-------|------------|-----------|----------|----------|
| VEH-001 | VIN | EXACT | - | CRITICAL | Yes |
| VEH-002 | SPZ | EXACT | - | CRITICAL | Yes |
| VEH-003 | Owner Name | EXACT | - | CRITICAL | Yes |
| VEH-004 | Brand | FUZZY | 80% | WARNING | No |
| VEH-005 | Model | FUZZY | 70% | WARNING | No |
| VEH-006 | First Registration Date | EXACT | - | WARNING | No |
| VEH-007 | Engine Power | TOLERANCE | ±5% | WARNING | No |

## 2. Vendor Validations - Individual (FO)

Source: Manual input vs OCR from OP document

| Rule ID | Field | Match Type | Threshold | Severity | Blocking |
|---------|-------|------------|-----------|----------|----------|
| VND-001 | Full Name | EXACT | - | CRITICAL | Yes |
| VND-002 | Personal ID (RČ) | EXACT | - | CRITICAL | Yes |
| VND-003 | Street Address | FUZZY | 60% | WARNING | No |
| VND-004 | City | FUZZY | 80% | WARNING | No |
| VND-005 | Postal Code | EXACT | - | WARNING | No |
| VND-006 | Date of Birth | EXACT | - | INFO | No |

## 3. Vendor Validations - Company (PO)

Source: Manual input vs ARES/ADIS registries

| Rule ID | Field | Source | Severity | Blocking |
|---------|-------|--------|----------|----------|
| ARES-001 | Company Existence | ARES | CRITICAL | Yes |
| ARES-002 | Company Name | ARES | WARNING | No |
| ARES-003 | VAT ID (DIČ) | ARES | CRITICAL | Yes |
| ARES-004 | Company Age | ARES | WARNING | No |
| DPH-001 | VAT Payer Status | ADIS | CRITICAL | Yes |
| DPH-002 | Unreliable Payer | ADIS | CRITICAL | Yes |
| DPH-003 | Bank Account | ADIS | WARNING | No |

## 4. Cross-Entity Validations

| Rule ID | Description | Match Type | Threshold | Severity | Blocking |
|---------|-------------|------------|-----------|----------|----------|
| XV-001 | Vehicle Owner = Vendor | FUZZY | 95% | CRITICAL | Yes |

## 5. Status Determination

```
IF any CRITICAL rule fails:
    return RED (blocked)
ELSE IF any WARNING rule fails:
    return ORANGE (manual review)
ELSE:
    return GREEN (approved)
```

## 6. Gap Analysis

### Missing in MVP

| ID | Area | Description | Priority | Proposed Solution |
|----|------|-------------|----------|-------------------|
| GAP-001 | FO | ID card validity check | High | Doložky.cz |
| GAP-002 | FO | ID card expiry check | High | Doložky.cz |
| GAP-003 | FO | Person execution check | Critical | Cebia |
| GAP-004 | FO | Person insolvency check | Critical | Cebia |
| GAP-005 | Vehicle | Vehicle execution check | Critical | Cebia |
| GAP-006 | Vehicle | Vehicle lien check | Critical | Cebia |
| GAP-007 | Vehicle | Stolen vehicle check | Critical | Cebia |
| GAP-008 | FO | Age validation (20-80) | Medium | Local calculation |
| GAP-009 | Vehicle | Owner vs Keeper logic | Medium | Business rule |
| GAP-010 | PO | Director tenure check | Low | ARES VR |

### Phase 2 Integrations

#### Doložky.cz (ID Card Validation)

| Rule ID | Check | Trigger | Severity |
|---------|-------|---------|----------|
| DOL-001 | ID card validity | After OP OCR | CRITICAL |
| DOL-002 | ID card expiry | After OP OCR | CRITICAL |
| DOL-003 | Personal data cross-validation | After OP OCR | CRITICAL |

#### Cebia (Vehicle and Person Checks)

| Rule ID | Check | Trigger | Severity |
|---------|-------|---------|----------|
| CEB-001 | Vehicle execution | After VIN input | CRITICAL |
| CEB-002 | Vehicle lien | After VIN input | CRITICAL |
| CEB-003 | Stolen vehicle | After VIN input | CRITICAL |
| CEB-004 | Person execution | After RČ input | CRITICAL |
| CEB-005 | Person insolvency | After RČ input | CRITICAL |
| CEB-006 | Company insolvency | After IČO input | CRITICAL |

## 7. Validation Timeline

```
STEP 1: Vehicle Entry
    - [Phase 2] Cebia: CEB-001, CEB-002, CEB-003

STEP 2: Vendor Entry
    - FO: [Phase 2] Cebia: CEB-004, CEB-005
    - PO: [MVP] ARES: ARES-001 to ARES-004
    - PO: [MVP] ADIS: DPH-001 to DPH-003
    - PO: [Phase 2] Cebia: CEB-006

STEP 3: Document Upload
    - OCR extraction
    - [Phase 2] Doložky.cz: DOL-001 to DOL-003

STEP 4: Validation
    - Vehicle: VEH-001 to VEH-007
    - Vendor FO: VND-001 to VND-006
    - Cross: XV-001
```

## 8. Summary

| Category | MVP Rules | Phase 2 Rules | Total |
|----------|-----------|---------------|-------|
| Vehicle | 7 | 4 | 11 |
| Vendor FO | 6 | 5 | 11 |
| Vendor PO | 7 | 1 | 8 |
| Cross-Entity | 1 | 0 | 1 |
| **Total** | **21** | **10** | **31** |

| Severity | MVP | Phase 2 |
|----------|-----|---------|
| CRITICAL | 10 | 8 |
| WARNING | 10 | 1 |
| INFO | 1 | 1 |
