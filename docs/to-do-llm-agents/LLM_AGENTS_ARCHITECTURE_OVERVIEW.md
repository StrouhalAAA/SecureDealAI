# SecureDeal AI - LLM Agents Architecture Overview

> **Purpose**: Management presentation - Where AI/LLM agents add value
> **Audience**: Leadership, Product, Business stakeholders
> **Created**: 2026-01-26
> **Status**: PROPOSAL

---

## Executive Summary

SecureDeal's validation engine is built on **deterministic rules** - and this is intentional. Rules-based validation provides:
- Predictable, auditable decisions
- Legal defensibility
- Zero hallucination risk

However, there are specific points in our process where **unstructured data** must be converted to structured data before our rules engine can process it. **This is where LLM agents excel.**

### The Key Insight

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   LLMs are NOT replacing our validation logic.                          │
│   LLMs are FEEDING structured data INTO our validation logic.           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. High-Level Architecture

### 1.1 Current State vs. Proposed State

```
CURRENT STATE (Without LLM Agents)
══════════════════════════════════════════════════════════════════════════

  Unstructured Data              Manual Processing           Rules Engine
  ┌─────────────┐               ┌─────────────────┐         ┌───────────┐
  │ ARES Text   │──────────────▶│  Human reads &  │────────▶│           │
  │ "způsob     │   ⏱️ 2-5 min   │  interprets     │         │ Validate  │
  │ jednání"    │               └─────────────────┘         │           │
  └─────────────┘                                           │           │
                                                            │           │
  ┌─────────────┐               ┌─────────────────┐         │           │
  │ Restraint   │──────────────▶│  Human reads &  │────────▶│ Determine │
  │ Reason      │   ⏱️ 1-2 min   │  categorizes    │         │           │
  │ Code 99     │               └─────────────────┘         │  Status   │
  └─────────────┘                                           │           │
                                                            │           │
  ┌─────────────┐               ┌─────────────────┐         │           │
  │ Power of    │──────────────▶│  Human reviews  │────────▶│           │
  │ Attorney    │   ⏱️ 3-5 min   │  & validates    │         │           │
  │ Document    │               └─────────────────┘         └───────────┘
  └─────────────┘


PROPOSED STATE (With LLM Agents)
══════════════════════════════════════════════════════════════════════════

  Unstructured Data              LLM Agents                  Rules Engine
  ┌─────────────┐               ┌─────────────────┐         ┌───────────┐
  │ ARES Text   │──────────────▶│  Acting Method  │────────▶│           │
  │ "způsob     │   ⚡ 200ms     │  Parser Agent   │ JSON    │ Validate  │
  │ jednání"    │               └─────────────────┘         │           │
  └─────────────┘                                           │           │
                                                            │           │
  ┌─────────────┐               ┌─────────────────┐         │           │
  │ Restraint   │──────────────▶│  Reason         │────────▶│ Determine │
  │ Reason      │   ⚡ 150ms     │  Classifier     │ Code    │           │
  │ Code 99     │               └─────────────────┘         │  Status   │
  └─────────────┘                                           │           │
                                                            │           │
  ┌─────────────┐               ┌─────────────────┐         │           │
  │ Power of    │──────────────▶│  PoA Validator  │────────▶│           │
  │ Attorney    │   ⚡ 500ms     │  Agent          │ JSON    │           │
  │ Document    │               └─────────────────┘         └───────────┘
  └─────────────┘

  ⚡ = Automated    ⏱️ = Manual effort
```

---

## 2. Complete Process Flow with LLM Integration Points

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        SECUREDEAL VALIDATION PROCESS                            │
└─────────────────────────────────────────────────────────────────────────────────┘

     STEP 1: VEHICLE                    STEP 2: VENDOR
     ════════════════                   ═══════════════

     ┌───────────────┐                  ┌───────────────┐
     │   VIN / SPZ   │                  │   IČO / RČ    │
     │   Entry       │                  │   Entry       │
     └───────┬───────┘                  └───────┬───────┘
             │                                  │
             ▼                                  ▼
     ┌───────────────┐                  ┌───────────────┐
     │  OCR Engine   │                  │   ARES API    │
     │  (Mistral)    │                  │   Lookup      │
     └───────┬───────┘                  └───────┬───────┘
             │                                  │
             │                                  ├──────────────────────┐
             │                                  │                      │
             │                                  ▼                      ▼
             │                          ┌─────────────┐        ┌─────────────┐
             │                          │ Basic Data  │        │ VR Data     │
             │                          │ (name,addr) │        │ (directors) │
             │                          └─────────────┘        └──────┬──────┘
             │                                  │                      │
             │                                  │               ┌──────▼──────┐
             │                                  │               │             │
             │                                  │               │  🤖 LLM     │
             │                                  │               │  AGENT #1   │
             │                                  │               │             │
             │                                  │               │  Acting     │
             │                                  │               │  Method     │
             │                                  │               │  Parser     │
             │                                  │               │             │
             │                                  │               └──────┬──────┘
             │                                  │                      │
             ▼                                  ▼                      ▼
     ┌─────────────────────────────────────────────────────────────────────┐
     │                                                                     │
     │                    DETERMINISTIC VALIDATION ENGINE                  │
     │                                                                     │
     │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
     │   │ VIN Match   │  │ ARES Exists │  │ VAT Check   │  │ Acting    │  │
     │   │ Rules       │  │ Rules       │  │ Rules       │  │ Method    │  │
     │   │             │  │             │  │             │  │ Rules     │  │
     │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
     │                                                                     │
     │   IF critical_fail → RED                                            │
     │   ELSE IF warning → ORANGE                                          │
     │   ELSE → GREEN                                                      │
     │                                                                     │
     └──────────────────────────────┬──────────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │                     │
                         │  🟢 GREEN           │
                         │  🟡 ORANGE          │
                         │  🔴 RED             │
                         │                     │
                         └─────────────────────┘
```

---

## 3. LLM Agent Opportunities - Summary

### 3.1 Overview Matrix

| # | Agent Name | Input | Output | Business Value | Priority |
|---|------------|-------|--------|----------------|----------|
| 1 | **Acting Method Parser** | ARES "způsob jednání" text | Structured authorization rule | Prevents void contracts | 🔴 HIGH |
| 2 | **Restraint Reason Classifier** | Free-text reason (code 99) | Standard category code | Reduces manual categorization | 🟡 MEDIUM |
| 3 | **Power of Attorney Validator** | PoA document scan | Structured validation result | Automates PoA review | 🟡 MEDIUM |
| 4 | **OCR Confidence Resolver** | Low-confidence OCR fields | Corrected/validated values | Reduces OCR errors | 🟢 LOW |

### 3.2 Visual: Where Each Agent Fits

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATA SOURCES          LLM AGENTS              RULES ENGINE      OUTPUT    │
│  ────────────          ──────────              ────────────      ──────    │
│                                                                             │
│  ┌─────────┐                                                                │
│  │  ARES   │─────┐                                                          │
│  │ Basic   │     │     (no LLM needed)                                      │
│  └─────────┘     │                              ┌──────────┐                │
│                  ├─────────────────────────────▶│ Company  │                │
│  ┌─────────┐     │                              │ Exists?  │                │
│  │  ARES   │─────┤                              │ VAT OK?  │                │
│  │   VR    │     │                              │ Age OK?  │                │
│  └─────────┘     │                              └────┬─────┘                │
│       │          │                                   │                      │
│       │          │                                   │                      │
│       ▼          │                                   │                      │
│  ┌─────────┐     │     ┌─────────────────┐          │                      │
│  │ způsob  │─────┼────▶│  🤖 AGENT #1    │──────────┤                      │
│  │ jednání │     │     │  Acting Method  │  JSON    │      ┌──────────┐    │
│  │ (text)  │     │     │  Parser         │  Rule    │      │          │    │
│  └─────────┘     │     └─────────────────┘          ├─────▶│  STATUS  │    │
│                  │                                   │      │          │    │
│  ┌─────────┐     │                                   │      │  🟢 🟡 🔴  │    │
│  │  ADIS   │─────┤     (no LLM needed)              │      │          │    │
│  │  DPH    │     ├─────────────────────────────────▶│      └──────────┘    │
│  └─────────┘     │                                   │                      │
│                  │                                   │                      │
│  ┌─────────┐     │                                   │                      │
│  │ Cebia   │─────┤     (no LLM needed)              │                      │
│  │ Checks  │     ├─────────────────────────────────▶│                      │
│  └─────────┘     │                              ┌────┴─────┐                │
│                  │                              │ Exec OK? │                │
│  ┌─────────┐     │     ┌─────────────────┐      │ Liens?   │                │
│  │ Plná    │─────┼────▶│  🤖 AGENT #3    │─────▶│ PoA OK?  │                │
│  │ moc     │     │     │  PoA Validator  │ JSON │ Signer   │                │
│  │ (scan)  │     │     └─────────────────┘      │ Auth?    │                │
│  └─────────┘     │                              └──────────┘                │
│                  │                                                          │
│  ┌─────────┐     │     ┌─────────────────┐                                  │
│  │Restraint│─────┴────▶│  🤖 AGENT #2    │─────▶ Analytics / Reporting     │
│  │Code 99  │           │  Reason         │ Code                             │
│  │(text)   │           │  Classifier     │                                  │
│  └─────────┘           └─────────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

  Legend:
  ────────
  🤖 = LLM Agent (AI-powered parsing)
  ─▶ = Data flow
  JSON/Code = Structured output from LLM
```

---

## 4. Agent #1: Acting Method Parser (HIGH PRIORITY)

### 4.1 The Problem

ARES returns legal text describing how company directors can sign contracts:

```
"Společnost zastupují vždy 2 (dva) jednatelé společně."
```

This text varies across 100,000+ Czech companies. Currently requires **human interpretation**.

### 4.2 The Solution

LLM parses text into structured rule:

```json
{
  "canActAlone": false,
  "minimumSigners": 2,
  "confidence": 0.98
}
```

### 4.3 Business Impact

| Metric | Before | After |
|--------|--------|-------|
| Time per validation | 2-5 min (human) | 200ms (automated) |
| Cost per validation | ~15 CZK (labor) | ~0.02 CZK (API) |
| Error rate | 2-5% (human error) | <1% (with review) |
| Audit trail | "Manually verified" | Full JSON + confidence |

### 4.4 Risk Mitigation

- **Low confidence → Human review** (no automated wrong decisions)
- **Cache results** (same company = same rule, rarely changes)
- **Audit trail** (original text + parsed rule stored)

---

## 5. Agent #2: Restraint Reason Classifier (MEDIUM PRIORITY)

### 5.1 The Problem

Payment restraints use code 99 ("Other") for **35% of cases** with free-text descriptions:

```
"Čekáme na potvrzení od leasingové společnosti o ukončení smlouvy"
```

Currently requires **manual categorization** for reporting.

### 5.2 The Solution

LLM classifies free text into standard categories:

| Input Text | Output Category |
|------------|-----------------|
| "Čekáme na potvrzení od leasingové..." | Code 3: Leasing documentation |
| "Nutná kontrola tachometru" | Code 4: Mileage verification |
| "Chybí druhý klíč" | Code 7: Second key delivery |

### 5.3 Business Impact

| Metric | Before | After |
|--------|--------|-------|
| Manual categorization | 100% of code 99 | ~5% (edge cases) |
| Reporting accuracy | Variable | Standardized |
| Analytics capability | Limited | Full breakdown |

---

## 6. Agent #3: Power of Attorney Validator (MEDIUM PRIORITY)

### 6.1 The Problem

Power of Attorney (Plná moc) documents must be validated:
- Is the grantor the registered owner?
- Is the grantee the person selling?
- Does the scope cover this specific vehicle?
- Is notarization current (<90 days)?

Documents have **no standard format**.

### 6.2 The Solution

LLM extracts structured data from PoA scan:

```json
{
  "grantor": "Jan Novák",
  "grantee": "Marie Svobodová",
  "vehicleVIN": "WBA12345678901234",
  "notaryDate": "2026-01-15",
  "scope": "sale_of_vehicle",
  "confidence": 0.92
}
```

### 6.3 Business Impact

| Metric | Before | After |
|--------|--------|-------|
| Review time | 3-5 min (human) | 500ms + quick verify |
| Consistency | Variable | Standardized checks |
| Fraud detection | Manual pattern recognition | Automated flags |

---

## 7. What LLMs Should NOT Do

### 7.1 The Golden Rule

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   LLMs PARSE unstructured data → structured data                        │
│   RULES ENGINE DECIDES based on structured data                         │
│                                                                         │
│   LLMs should NEVER make pass/fail decisions directly                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Keep Deterministic

| Task | Use LLM? | Why |
|------|----------|-----|
| Parse "způsob jednání" text | ✅ YES | Unstructured → Structured |
| Decide if signer is authorized | ❌ NO | Rule-based logic |
| Classify free-text reason | ✅ YES | NLP classification |
| Determine RED/ORANGE/GREEN | ❌ NO | Deterministic rules |
| Extract data from PoA scan | ✅ YES | Document understanding |
| Validate PoA is within 90 days | ❌ NO | Date comparison |
| Call ARES/ADIS APIs | ❌ NO | API orchestration |
| Store validation results | ❌ NO | Database operations |

---

## 8. Implementation Approach

### 8.1 Phased Rollout

```
PHASE 1 (Q1 2026)                    PHASE 2 (Q2 2026)
══════════════════                   ══════════════════

┌─────────────────────┐              ┌─────────────────────┐
│  🤖 Agent #1        │              │  🤖 Agent #2        │
│  Acting Method      │              │  Restraint Reason   │
│  Parser             │              │  Classifier         │
│                     │              │                     │
│  Priority: HIGH     │              │  Priority: MEDIUM   │
│  Effort: 2 weeks    │              │  Effort: 1 week     │
│  Impact: Contract   │              │  Impact: Reporting  │
│          validity   │              │          quality    │
└─────────────────────┘              └─────────────────────┘

PHASE 3 (Q3 2026)                    FUTURE
══════════════════                   ══════════════════

┌─────────────────────┐              ┌─────────────────────┐
│  🤖 Agent #3        │              │  🤖 Agent #4+       │
│  PoA Validator      │              │  OCR Enhancement    │
│                     │              │  User Guidance      │
│  Priority: MEDIUM   │              │  Anomaly Detection  │
│  Effort: 2 weeks    │              │                     │
│  Impact: PoA        │              │  Priority: LOW      │
│          automation │              │                     │
└─────────────────────┘              └─────────────────────┘
```

### 8.2 Success Metrics

| Agent | Success Metric | Target |
|-------|----------------|--------|
| Acting Method Parser | Parsing accuracy | >95% |
| Acting Method Parser | Time saved per validation | 2+ minutes |
| Restraint Classifier | Classification accuracy | >90% |
| Restraint Classifier | Manual review reduction | >80% |
| PoA Validator | Extraction accuracy | >90% |
| PoA Validator | Review time reduction | >50% |

---

## 9. Cost-Benefit Analysis

### 9.1 Costs

| Item | One-time | Monthly |
|------|----------|---------|
| Development (Agent #1) | 80 hours | - |
| Development (Agent #2) | 40 hours | - |
| Development (Agent #3) | 80 hours | - |
| LLM API costs | - | ~$50-100 |
| Monitoring & maintenance | - | 8 hours |

### 9.2 Benefits

| Item | Monthly Savings |
|------|-----------------|
| Reduced manual review (Acting Method) | ~40 hours |
| Reduced categorization (Restraint) | ~20 hours |
| Reduced PoA review | ~30 hours |
| Fewer contract errors | Risk mitigation |
| Better audit trail | Compliance value |

### 9.3 ROI Summary

```
Development Investment:  ~200 hours (one-time)
Monthly Time Savings:    ~90 hours
Monthly API Cost:        ~$75

Payback Period:          ~2-3 months
Annual Savings:          ~1000 hours + risk reduction
```

---

## 10. Key Takeaways for Management

### 10.1 Three Things to Remember

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  1. LLMs ENHANCE our rule-based system, they don't REPLACE it          │
│                                                                         │
│  2. LLMs handle UNSTRUCTURED → STRUCTURED conversion                    │
│     (the part humans currently do manually)                             │
│                                                                         │
│  3. All critical DECISIONS remain DETERMINISTIC and AUDITABLE          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Risk Profile

| Aspect | Assessment |
|--------|------------|
| Technical risk | LOW - proven technology, bounded use cases |
| Business risk | LOW - human fallback for uncertain cases |
| Legal risk | LOW - decisions remain rule-based, full audit trail |
| Cost risk | LOW - pay-per-use, can scale down if needed |

### 10.3 Recommendation

**Proceed with Phase 1 (Acting Method Parser)** as a pilot:
- Highest business value (contract validity)
- Well-defined scope
- Clear success metrics
- Low risk with human review fallback

---

## Appendix A: Detailed Agent Specifications

For technical details on each agent, see:
- [Acting Method Parser Agent](./ACTING_METHOD_PARSER_AGENT.md)
- Restraint Reason Classifier (to be created)
- PoA Validator Agent (to be created)

---

## Appendix B: Glossary for Non-Technical Readers

| Term | Meaning |
|------|---------|
| **LLM** | Large Language Model - AI that understands and generates text |
| **Deterministic** | Always produces the same output for the same input |
| **Parsing** | Converting unstructured text into structured data |
| **Způsob jednání** | Legal text describing how directors can sign for a company |
| **Confidence score** | How certain the AI is about its output (0-100%) |
| **Audit trail** | Record of all decisions and their reasoning |

---

*Document created: 2026-01-26*
*For questions, contact SecureDeal AI Team*
