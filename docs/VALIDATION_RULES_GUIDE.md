# Validation Rules System Guide

> **Audience**: Business stakeholders, developers, and operations team members
> **Last Updated**: January 2025
> **Version**: 1.0

## Table of Contents

1. [Overview](#overview)
2. [How Validation Works](#how-validation-works)
3. [Understanding Rules](#understanding-rules)
4. [Rule Categories](#rule-categories)
5. [Severity Levels](#severity-levels)
6. [Validation Status (Traffic Light System)](#validation-status-traffic-light-system)
7. [Which Rules Apply When?](#which-rules-apply-when)
8. [Working with the Rules UI](#working-with-the-rules-ui)
9. [Current MVP Rules](#current-mvp-rules)
10. [Examples](#examples)
11. [Troubleshooting](#troubleshooting)

---

## Overview

SecureDealAI uses a **dynamic validation rules engine** to verify vehicle purchase opportunities. When a vehicle is brought in for purchase, the system automatically checks:

- **Manual input** (what the seller tells us) against
- **OCR extractions** (what we scan from documents) and
- **External registries** (ARES, ADIS - official Czech databases)

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **No Code Changes** | Rules can be added, modified, or disabled without deploying code |
| **Audit Trail** | Every rule change and validation result is logged |
| **Reproducibility** | Past validations can be exactly recreated |
| **Context-Aware** | Different rules apply based on vendor type and buying context |

---

## How Validation Works

### The Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUYING OPPORTUNITY                            │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   VEHICLE   │    │   VENDOR    │    │   DOCUMENTS         │  │
│  │   (Manual)  │    │   (Manual)  │    │   (OCR Scanned)     │  │
│  │             │    │             │    │                     │  │
│  │ • VIN       │    │ • Name      │    │ • ORV (Malý TP)     │  │
│  │ • SPZ       │    │ • IČO/RČ    │    │ • OP (ID Card)      │  │
│  │ • Brand     │    │ • DIČ       │    │ • VTP (Velký TP)    │  │
│  │ • Model     │    │ • Address   │    │                     │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION ENGINE                             │
│                                                                  │
│  1. Load applicable rules (based on context)                    │
│  2. Execute each rule in priority order                         │
│  3. Compare source vs target values                             │
│  4. Determine overall status                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION RESULT                             │
│                                                                  │
│     🔴 RED        🟠 ORANGE       🟢 GREEN                       │
│     Blocked       Manual Review   Approved                       │
└─────────────────────────────────────────────────────────────────┘
```

### What Gets Compared?

Each rule defines a **source** (what we received) and a **target** (what we verify against):

| Source (Input) | Target (Verification) |
|----------------|----------------------|
| Vehicle data (manual entry) | ORV document (OCR) |
| Vendor data (manual entry) | OP document (OCR) |
| Vendor company data | ARES registry (API) |
| Vendor VAT data | ADIS registry (API) |
| Vehicle in VTP | VTP document (OCR) |

---

## Understanding Rules

### Rule Structure

Every rule has these components:

```
┌─────────────────────────────────────────────────────────────────┐
│  RULE: VEH-001 (VIN Match)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WHAT:      Compare VIN from manual input vs ORV document       │
│  SEVERITY:  CRITICAL (blocks transaction if mismatch)           │
│  CATEGORY:  Vehicle                                             │
│  PRIORITY:  1 (runs first)                                      │
│                                                                  │
│  SOURCE:    vehicle.vin (manual input)                          │
│             Transforms: REMOVE_SPACES → UPPERCASE → VIN_NORMALIZE│
│                                                                  │
│  TARGET:    ocr_orv.vin (scanned from ORV document)             │
│             Transforms: REMOVE_SPACES → UPPERCASE → VIN_NORMALIZE│
│                                                                  │
│  COMPARE:   EXACT match (after transforms)                      │
│                                                                  │
│  CONDITIONS: ORV document must be uploaded                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Transforms

Before comparing values, the system normalizes them using transforms:

| Transform | What It Does | Example |
|-----------|--------------|---------|
| `UPPERCASE` | Converts to uppercase | "abc" → "ABC" |
| `LOWERCASE` | Converts to lowercase | "ABC" → "abc" |
| `TRIM` | Removes leading/trailing spaces | " hello " → "hello" |
| `REMOVE_SPACES` | Removes all spaces | "A B C" → "ABC" |
| `REMOVE_DIACRITICS` | Removes accents | "Příliš" → "Prilis" |
| `NORMALIZE_DATE` | Standardizes date format | "1.1.2024" → "2024-01-01" |
| `FORMAT_RC` | Formats Czech personal ID | "850101/1234" → "8501011234" |
| `FORMAT_ICO` | Formats company ID (8 digits) | "1234567" → "01234567" |
| `FORMAT_DIC` | Formats VAT ID | "cz12345678" → "CZ12345678" |
| `VIN_NORMALIZE` | Cleans VIN (17 chars) | "WVW ZZZ 3CZ..." → "WVWZZZ3CZ..." |
| `SPZ_NORMALIZE` | Cleans license plate | "5L9 4454" → "5L94454" |
| `ADDRESS_NORMALIZE` | Standardizes addresses | "ul. Hlavní 1" → "HLAVNI 1" |
| `NAME_NORMALIZE` | Standardizes names | "Ing. Jan Novák" → "JAN NOVAK" |

### Comparison Types

| Comparator | Use Case | Example |
|------------|----------|---------|
| `EXACT` | Values must match exactly | VIN, SPZ, IČO |
| `FUZZY` | Allows minor differences (typos) | Names, Addresses |
| `CONTAINS` | One value contains the other | Bank account in list |
| `NUMERIC_TOLERANCE` | Numbers within ±X% | Engine power ±5% |
| `DATE_TOLERANCE` | Dates within X days | Company age ≥365 days |
| `EXISTS` | Value must exist | Company in ARES |
| `NOT_EXISTS` | Value must NOT exist | No liens on vehicle |

---

## Rule Categories

Rules are organized into **5 categories** based on what they validate:

### 1. Vehicle Rules (`vehicle`)
Validate vehicle data against scanned documents.

| Rule ID | Name | Checks |
|---------|------|--------|
| VEH-001 | VIN Match | VIN vs ORV |
| VEH-002 | SPZ Match | License plate vs ORV |
| VEH-003 | Owner Name | Keeper name on ORV |
| VEH-004 | Brand Match | Vehicle make vs ORV |
| VEH-005 | Model Match | Vehicle model vs ORV |
| VEH-006 | First Registration | Registration date vs ORV |
| VEH-007 | Engine Power | Power in kW vs ORV |

### 2. Physical Person Rules (`vendor_fo`)
Validate individual sellers against their ID card (OP).

| Rule ID | Name | Checks |
|---------|------|--------|
| VND-001 | Name Match | Seller name vs ID card |
| VND-002 | Personal ID | Rodné číslo vs ID card |
| VND-003 | Street Address | Address vs ID card |
| VND-004 | City Match | City vs ID card |
| VND-005 | Postal Code | PSČ vs ID card |
| VND-006 | Date of Birth | Birth date vs ID card |

### 3. Company Rules (`vendor_po`)
Validate company sellers against ARES and ADIS registries.

| Rule ID | Name | Checks |
|---------|------|--------|
| ARES-001 | Company Exists | Company found in ARES |
| ARES-002 | Company Name | Name matches ARES |
| ARES-003 | VAT ID Match | DIČ matches ARES |
| ARES-004 | Company Age | Company ≥1 year old |
| DPH-001 | VAT Status | Active VAT payer |
| DPH-002 | Unreliable Payer | Not on unreliable list |
| DPH-003 | Bank Account | Account in VAT registry |

### 4. Cross-Entity Rules (`cross`)
Validate relationships between different entities.

| Rule ID | Name | Checks |
|---------|------|--------|
| XV-001 | Owner = Vendor | Vehicle owner matches seller |
| VTP-004 | VTP Owner Name | Owner on VTP matches vendor |

### 5. VTP Rules (Technical Certificate)
Additional checks when VTP document is provided.

| Rule ID | Name | Checks |
|---------|------|--------|
| VTP-001 | VTP SPZ | License plate on VTP |
| VTP-002 | VTP VIN | VIN on VTP |
| VTP-003 | VTP IČO | Company ID on VTP (for companies) |

---

## Severity Levels

Each rule has a **severity level** that determines how failures are handled:

### 🔴 CRITICAL
**Transaction BLOCKED if mismatch.**

Used for core identity verification where a mismatch indicates potential fraud or error that cannot proceed.

**Examples:**
- VIN doesn't match document
- Company doesn't exist in ARES
- Vendor is an unreliable VAT payer

### 🟠 WARNING
**Manual review required if mismatch.**

Used for important checks where differences might be acceptable with explanation.

**Examples:**
- Brand name has minor spelling difference
- Address doesn't exactly match (moved recently?)
- Company is less than 1 year old

### ℹ️ INFO
**Logged only, no action required.**

Used for informational checks that don't affect the transaction.

**Examples:**
- Date of birth verification

---

## Validation Status (Traffic Light System)

The overall validation result uses a **traffic light system**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATUS DETERMINATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔴 RED (Blocked)                                                │
│  ─────────────────                                               │
│  IF any CRITICAL rule has MISMATCH                              │
│                                                                  │
│  → Transaction cannot proceed                                    │
│  → Must resolve the issue before continuing                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🟠 ORANGE (Manual Review)                                       │
│  ─────────────────────────                                       │
│  IF any WARNING rule has MISMATCH                               │
│  OR any CRITICAL rule has MISSING data                          │
│                                                                  │
│  → Supervisor review required                                    │
│  → Can proceed with approval                                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🟢 GREEN (Approved)                                             │
│  ───────────────────                                             │
│  All other cases                                                 │
│                                                                  │
│  → Transaction can proceed automatically                        │
│  → No manual intervention needed                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Rule Results Explained

| Result | Meaning |
|--------|---------|
| `MATCH` | Source and target values match (after transforms) |
| `MISMATCH` | Source and target values don't match |
| `MISSING` | Required data is not available (document not uploaded, field empty) |
| `SKIPPED` | Rule conditions weren't met (e.g., FO rule for PO vendor) |
| `ERROR` | Technical error during validation |

---

## Which Rules Apply When?

Not all rules run for every transaction. Rules are **filtered based on context**:

### By Vendor Type

| Vendor Type | Rules That Apply |
|-------------|------------------|
| **Physical Person (FO)** | VEH-*, VND-*, XV-001, VTP-001, VTP-002, VTP-004 |
| **Company (PO)** | VEH-*, ARES-*, DPH-*, XV-001, VTP-* (including VTP-003) |

### By Documents Uploaded

| Documents | Additional Rules |
|-----------|------------------|
| ORV only | VEH-001 to VEH-007 |
| ORV + OP (ID card) | + VND-001 to VND-006 |
| ORV + VTP | + VTP-001 to VTP-004 |

### By Buying Type

| Buying Type | Notes |
|-------------|-------|
| **BRANCH** | All MVP rules apply |
| **MOBILE_BUYING** | (Phase 2 - additional rules may apply) |

### Example Scenarios

**Scenario 1: Individual selling car at branch**
- Documents: ORV + OP
- Rules executed: VEH-001 to VEH-007, VND-001 to VND-006, XV-001
- Total: ~13 rules

**Scenario 2: Company selling car at branch**
- Documents: ORV + VTP
- Rules executed: VEH-001 to VEH-007, ARES-001 to ARES-004, DPH-001 to DPH-003, VTP-001 to VTP-003, XV-001
- Total: ~15 rules

---

## Working with the Rules UI

### Accessing the Rules Management

Navigate to: `https://secure-deal-ai-web.vercel.app/rules`

### Viewing Rules

The rules list shows:
- **Rule ID** (e.g., ARES-003)
- **Name** (e.g., VAT ID Match)
- **Category** (vehicle, vendor_fo, vendor_po, cross)
- **Severity** (CRITICAL, WARNING, INFO)
- **Status** (Active/Draft/Inactive)

### Editing a Rule

Navigate to: `/rules/{RULE_ID}/edit` (e.g., `/rules/ARES-003/edit`)

**Editable Fields:**
- Name and description
- Severity level
- Enabled/disabled status
- Source and target configuration
- Transforms to apply
- Comparison settings
- Conditions for execution
- Error messages (localized)

### Rule Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  DRAFT   │────▶│  ACTIVE  │────▶│ INACTIVE │────▶│ ARCHIVED │
│          │     │          │     │          │     │          │
│ Can edit │     │ In use   │     │ Disabled │     │ Deleted  │
│ freely   │     │ Versioned│     │ Can react│     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

**Important:**
- Draft rules can be edited freely
- Active rules create a new version when edited
- A rule cannot be both active AND draft simultaneously

---

## Current MVP Rules

### Summary by Category

| Category | Count | Critical | Warning | Info |
|----------|-------|----------|---------|------|
| Vehicle | 7 | 3 | 4 | 0 |
| Vendor FO | 6 | 2 | 3 | 1 |
| Vendor PO | 7 | 5 | 2 | 0 |
| Cross | 2 | 1 | 1 | 0 |
| VTP | 4 | 3 | 1 | 0 |
| **Total** | **26** | **14** | **11** | **1** |

### Critical Rules (Block Transaction)

These rules MUST pass or the transaction is blocked:

1. **VEH-001** - VIN must match ORV
2. **VEH-002** - SPZ must match ORV
3. **VEH-003** - Owner name must match ORV
4. **VND-001** - Seller name must match ID card (FO)
5. **VND-002** - Personal ID must match ID card (FO)
6. **ARES-001** - Company must exist in ARES (PO)
7. **ARES-003** - VAT ID must match ARES (PO)
8. **DPH-001** - Must be active VAT payer (PO)
9. **DPH-002** - Must NOT be unreliable payer (PO)
10. **XV-001** - Vehicle owner must match vendor
11. **VTP-001** - SPZ must match VTP (if VTP provided)
12. **VTP-002** - VIN must match VTP (if VTP provided)
13. **VTP-003** - Company IČO must match VTP (PO + VTP)

---

## Examples

### Example 1: Successful Validation (GREEN)

```
Buying Opportunity: 5L94454
Vendor Type: Physical Person
Documents: ORV, OP

Rule Results:
├── VEH-001 (VIN Match)       ✅ MATCH    → GREEN
├── VEH-002 (SPZ Match)       ✅ MATCH    → GREEN
├── VEH-003 (Owner Name)      ✅ MATCH    → GREEN
├── VEH-004 (Brand)           ✅ MATCH    → GREEN
├── VEH-005 (Model)           ✅ MATCH    → GREEN
├── VND-001 (Name)            ✅ MATCH    → GREEN
├── VND-002 (RC)              ✅ MATCH    → GREEN
├── VND-003 (Address)         ✅ MATCH    → GREEN
└── XV-001 (Owner=Vendor)     ✅ MATCH    → GREEN

Overall Status: 🟢 GREEN (Approved)
```

### Example 2: Failed Critical Check (RED)

```
Buying Opportunity: 2AB1234
Vendor Type: Company
Documents: ORV, VTP

Rule Results:
├── VEH-001 (VIN Match)       ✅ MATCH     → GREEN
├── VEH-002 (SPZ Match)       ✅ MATCH     → GREEN
├── ARES-001 (Company Exists) ✅ MATCH     → GREEN
├── ARES-003 (VAT ID)         ❌ MISMATCH  → RED ⚠️
├── DPH-001 (VAT Status)      ⏭️ SKIPPED   → GREEN
└── ...

Overall Status: 🔴 RED (Blocked)
Reason: VAT ID (DIČ) doesn't match ARES registry
Action: Cannot proceed - verify company DIČ
```

### Example 3: Warning Requires Review (ORANGE)

```
Buying Opportunity: 1XY9876
Vendor Type: Physical Person
Documents: ORV, OP

Rule Results:
├── VEH-001 (VIN Match)       ✅ MATCH     → GREEN
├── VEH-002 (SPZ Match)       ✅ MATCH     → GREEN
├── VND-001 (Name)            ✅ MATCH     → GREEN
├── VND-003 (Address)         ❌ MISMATCH  → ORANGE ⚠️
│   Source: "Hlavní 123, Praha"
│   Target: "Hlavni 123/A, Praha 1"
│   Similarity: 72% (threshold: 60%)
└── ...

Overall Status: 🟠 ORANGE (Manual Review)
Reason: Address doesn't match ID card (possibly moved?)
Action: Supervisor must approve or reject
```

---

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Solution |
|-------|----------------|----------|
| Rule not executing | Conditions not met | Check if required documents are uploaded |
| Unexpected MISMATCH | Data entry error | Verify manual input matches documents |
| MISSING data | Document not processed | Re-upload and process OCR |
| Rule SKIPPED | Wrong vendor type | Verify vendor is FO or PO as expected |

### Checking Rule Execution

1. Open the validation result details
2. Look at `field_validations` array
3. Each entry shows: rule ID, result, severity, values compared

### Getting Help

- **Technical issues**: Contact development team
- **Rule configuration**: Contact operations team
- **Business logic questions**: Contact product team

---

## Appendix: Rule Priority Order

Rules execute in priority order (lower number = first):

| Priority | Rules |
|----------|-------|
| 1-3 | VEH-001, VEH-002, VEH-003 (Core vehicle identity) |
| 4 | XV-001 (Owner = Vendor) |
| 5-8 | ARES-001, ARES-003, DPH-001, DPH-002 (Critical company checks) |
| 10-11 | VND-001, VND-002 (Critical FO checks) |
| 20-23 | VEH-004 to VEH-007 (Warning vehicle checks) |
| 25-27 | ARES-002, ARES-004, DPH-003 (Warning company checks) |
| 30-32 | VND-003 to VND-005 (Warning FO checks) |
| 40 | VND-006 (Info checks) |
| 60-63 | VTP-001 to VTP-004 (Conditional VTP checks) |

---

*This documentation is maintained by the SecureDealAI team. For updates or corrections, please submit a pull request or contact the development team.*
