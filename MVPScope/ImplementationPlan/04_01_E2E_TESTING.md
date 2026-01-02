# Task 4.1: End-to-End Testing

> **Phase**: 4 - Testing & Polish
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: All Phase 2 & 3 tasks
> **Estimated Effort**: Medium

---

## Objective

Conduct comprehensive end-to-end testing of the complete validation workflow using real documents and data.

---

## Prerequisites

- [ ] All Phase 2 tasks completed (Backend APIs)
- [ ] All Phase 3 tasks completed (Frontend)
- [ ] Test documents available (sample ORV, OP)

---

## Test Scenarios

### Scenario 1: Happy Path (All GREEN)

**Setup:**
- SPZ: 5L94454
- VIN: YV1PZA3TCL1103985
- Owner: OSIT S.R.O.
- Vendor Type: COMPANY
- IČO: 27074358

**Steps:**
1. Create new buying opportunity with SPZ
2. Fill vehicle form with exact matching data
3. Fill vendor form, verify ARES auto-fill
4. Upload ORV document
5. Upload OP document (if FO)
6. Run validation
7. Verify GREEN status

**Expected Result:**
- All fields show ✅ MATCH
- Overall status: GREEN
- No issues listed

---

### Scenario 2: Minor Mismatches (ORANGE)

**Setup:**
- Same as Scenario 1, but with slight variations:
  - Model: "V90" instead of "V90 CROSS COUNTRY"
  - Address: "Mníšek 420" instead of "MNÍŠEK ZA HUMNY Č.P. 420"

**Expected Result:**
- VIN, SPZ, Owner: ✅ MATCH
- Model: 🟠 ~70% match
- Address: 🟠 ~60% match
- Overall status: ORANGE
- Issues list shows warnings

---

### Scenario 3: Critical Mismatch (RED)

**Setup:**
- VIN mismatch: Different VIN in manual entry vs OCR

**Expected Result:**
- VIN: 🔴 MISMATCH
- Overall status: RED
- Transaction blocked

---

### Scenario 4: Company with ARES Validation

**Setup:**
- Vendor Type: COMPANY
- IČO: Valid Czech company
- DIČ: Matching/Mismatching

**Test Cases:**
1. Valid IČO → ARES lookup success, auto-fill works
2. Invalid IČO → ARES returns not found
3. DIČ mismatch → Warning in validation
4. Unreliable VAT payer → RED status

---

### Scenario 5: Physical Person (FO)

**Setup:**
- Vendor Type: PHYSICAL_PERSON
- Personal ID: Valid rodné číslo
- OP document uploaded

**Test Cases:**
1. Name matches OP extraction
2. Address fuzzy match with OP
3. Document expiry check

---

### Scenario 6: OCR Failures

**Test Cases:**
1. Low quality image → OCR fails or low confidence
2. Unsupported format → Upload rejected
3. Large file → Size limit enforced
4. Missing fields in OCR → Validation handles gracefully

---

## Test Checklist

### Backend API Tests

| Endpoint | Test | Status |
|----------|------|--------|
| buying-opportunity | Create with valid SPZ | [ ] Pass |
| buying-opportunity | Duplicate SPZ rejected | [ ] Pass |
| vehicle | Create with valid data | [ ] Pass |
| vehicle | VIN validation (17 chars) | [ ] Pass |
| vendor | Create FO with rodné číslo | [ ] Pass |
| vendor | Create PO with IČO | [ ] Pass |
| ares-lookup | Valid IČO returns data | [ ] Pass |
| ares-lookup | Invalid IČO returns 404 | [ ] Pass |
| document-upload | PDF upload works | [ ] Pass |
| document-upload | JPEG upload works | [ ] Pass |
| document-upload | Size limit enforced | [ ] Pass |
| ocr-extract | ORV extraction works | [ ] Pass |
| ocr-extract | OP extraction works | [ ] Pass |
| validation-run | GREEN scenario | [ ] Pass |
| validation-run | ORANGE scenario | [ ] Pass |
| validation-run | RED scenario | [ ] Pass |

### Frontend Tests

| Component | Test | Status |
|-----------|------|--------|
| Dashboard | List opportunities | [ ] Pass |
| Dashboard | Create new opportunity | [ ] Pass |
| Dashboard | Search by SPZ | [ ] Pass |
| Dashboard | Pagination | [ ] Pass |
| VehicleForm | All fields work | [ ] Pass |
| VehicleForm | VIN validation | [ ] Pass |
| VehicleForm | Save and continue | [ ] Pass |
| VendorForm | Toggle FO/PO | [ ] Pass |
| VendorForm | ARES lookup | [ ] Pass |
| VendorForm | Auto-fill works | [ ] Pass |
| DocumentUpload | Drag and drop | [ ] Pass |
| DocumentUpload | Click to upload | [ ] Pass |
| DocumentUpload | OCR status display | [ ] Pass |
| ValidationResult | GREEN display | [ ] Pass |
| ValidationResult | ORANGE display | [ ] Pass |
| ValidationResult | RED display | [ ] Pass |
| ValidationResult | Issues list | [ ] Pass |
| DetailPage | Step navigation | [ ] Pass |
| DetailPage | Data persistence | [ ] Pass |

### Integration Tests

| Flow | Status |
|------|--------|
| Complete GREEN flow (FO) | [ ] Pass |
| Complete GREEN flow (PO) | [ ] Pass |
| Complete ORANGE flow | [ ] Pass |
| Complete RED flow | [ ] Pass |
| ARES integration | [ ] Pass |
| OCR integration | [ ] Pass |

---

## Test Data

### Sample Documents

| Document | File | Purpose |
|----------|------|---------|
| ORV | `test_data/5L94454_ORV.pdf` | Vehicle registration |
| OP | `test_data/5L94454_OP.pdf` | Personal ID |

### Sample Companies

| Company | IČO | DIČ | Notes |
|---------|-----|-----|-------|
| Test Company 1 | 27074358 | CZ27074358 | Valid, active |
| Test Company 2 | 12345678 | - | Non-existent |

---

## Bug Tracking

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 1 | - | - | - |

---

## Completion Checklist

- [ ] All backend API tests passing
- [ ] All frontend tests passing
- [ ] All integration tests passing
- [ ] No critical bugs open
- [ ] Performance acceptable (<30s validation)
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
