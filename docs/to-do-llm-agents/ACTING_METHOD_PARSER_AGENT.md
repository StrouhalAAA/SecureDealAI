# Acting Method Parser Agent (Způsob jednání)

> **Status**: 📋 DESIGN PHASE
> **Created**: 2026-01-26
> **Author**: SecureDeal AI Team
> **Related**: [ARES_STATUTORY_BODY_RESEARCH.md](../architecture/ARES_STATUTORY_BODY_RESEARCH.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context](#2-business-context)
3. [Problem Definition](#3-problem-definition)
4. [Solution Overview](#4-solution-overview)
5. [Technical Feasibility](#5-technical-feasibility)
6. [Data Analysis](#6-data-analysis)
7. [Agent Architecture](#7-agent-architecture)
8. [Input/Output Specification](#8-inputoutput-specification)
9. [Evaluation Strategy](#9-evaluation-strategy)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Risk Assessment](#11-risk-assessment)
12. [Appendices](#appendices)

---

## 1. Executive Summary

### The Problem

The ARES Public Registry returns a free-text field called **`zpusobJednani`** (manner of representation) that describes how company directors can legally bind a company to contracts. This text is:

- **Written in natural Czech legal language**
- **Not standardized** across companies
- **Critical for contract validity** - contracts signed incorrectly are legally VOID

### The Opportunity

An LLM agent can parse this unstructured legal text into **structured validation rules** that feed into our deterministic validation engine. This enables:

- **Automated authorization checking** - Is this person authorized to sign alone?
- **Fraud prevention** - Detect unauthorized signers before contract execution
- **Reduced manual review** - Currently requires human interpretation

### Why an LLM?

| Approach | Feasibility | Accuracy | Maintenance |
|----------|-------------|----------|-------------|
| Regex patterns | ❌ Hundreds of patterns needed | ~60% | High (new patterns emerge) |
| Rule-based NLP | ⚠️ Possible but brittle | ~75% | Medium |
| **LLM Agent** | ✅ **Handles variations naturally** | **~95%+** | **Low** |

---

## 2. Business Context

### 2.1 What is "Způsob jednání"?

**Způsob jednání** (manner of representation) is a legally binding description recorded in the Czech Commercial Register that defines **how statutory body members can legally bind a company**.

This is NOT an internal policy - it has **external legal effect** on third parties.

### 2.2 Legal Consequences

According to Czech law (§ 164 Občanský zákoník):

> **Contracts signed in violation of "způsob jednání" are INVALID and do not bind the company.**

Key legal points:
1. Third parties **cannot rely** on contracts signed by unauthorized persons
2. The representation rule is **publicly accessible** - ignorance is no excuse
3. This differs from internal limitations which are not effective against third parties

### 2.3 Real Case Law Example

> "Smlouvu o koupi cenného papíru uzavřel jménem společnosti její jednatel, který dle zápisu v obchodním rejstříku nebyl oprávněn činit jménem společnosti právní úkony samostatně, ale pouze spolu s dalším jednatelem. Jestliže tedy učinil projev vůle směřující k uzavření smlouvy sám, nelze takový projev vůle považovat za projev vůle společnosti."

**Translation**: A securities purchase contract signed by a single director, when the Commercial Register required joint action with another director, cannot be considered the company's expression of will. **Contract void.**

### 2.4 Business Impact for SecureDeal

| Scenario | Without Parser | With Parser |
|----------|----------------|-------------|
| **Detection of invalid signer** | Manual review required | ✅ Automatic RED flag |
| **Time to validate** | 2-5 minutes per company | ~100ms |
| **Risk of contract void** | Moderate (human error) | Minimal |
| **Audit trail** | "Manually verified" | Structured rule + confidence score |

---

## 3. Problem Definition

### 3.1 Input: Unstructured Legal Text

The ARES VR endpoint returns `zpusobJednani` as free-text. Examples from real Czech companies:

```
"Jednatelé zastupují společnost v plném rozsahu samostatně."

"Společnost zastupují vždy 2 (dva) jednatelé společně."

"Společnost zastupuje samostatně předseda představenstva nebo společně dva členové představenstva."

"Za společnost jedná jednatel. Je-li jednatelů více, jedná za společnost každý z nich samostatně."

"Podepisování za společnost se děje tak, že k vytištěné nebo napsané obchodní firmě společnosti připojí svůj podpis jednatel nebo prokurista."

"Jménem společnosti jednají vždy společně nejméně dva členové představenstva, přičemž alespoň jeden z nich musí být předseda nebo místopředseda představenstva."

"Za společnost jedná každý jednatel. Pro právní jednání, kterým společnost nabývá nemovité věci nebo kterým společnost věci nemovité zcizuje, zavazuje nebo zatěžuje, a pro právní jednání přesahující částku 5.000.000,- Kč jednají vždy alespoň dva jednatelé společně."
```

### 3.2 Why This Is Hard

| Challenge | Description |
|-----------|-------------|
| **Vocabulary variation** | "samostatně", "sám", "jednotlivě", "nezávisle" all mean "independently" |
| **Sentence structure** | Same meaning expressed in many different grammatical structures |
| **Conditional rules** | Some rules have conditions (price thresholds, asset types) |
| **Negation** | "bez dalších jednatelů" (without other directors) |
| **Historical language** | Older registrations use archaic Czech legal terms |
| **Combined rules** | "Chairman alone OR 2 members together" |
| **Role-specific rules** | Different rules for Chairman vs. Vice-Chairman vs. Member |
| **Amount limits** | Some rules change above certain transaction values |

### 3.3 Output Requirement

We need **structured data** that our deterministic validation engine can evaluate:

```typescript
interface ActingMethodRule {
  // Core rule
  canActAlone: boolean;
  actorType: 'any_director' | 'chairman_only' | 'specific_role';

  // If joint action required
  jointAction?: {
    minimumActors: number;
    requiredRoles?: ('chairman' | 'vice_chairman' | 'director' | 'board_member' | 'procurator')[];
    roleConstraints?: string; // e.g., "at least one must be chairman or vice-chairman"
  };

  // Conditional rules (if applicable)
  conditions?: {
    amountThreshold?: number;  // Above this amount, different rules apply
    transactionTypes?: string[];  // e.g., "real estate", "over 5M CZK"
    alternativeRule?: ActingMethodRule;  // Rule that applies when condition is met
  };

  // Procurator rules (if mentioned)
  procuratorCanSign?: boolean;

  // Confidence & audit
  confidence: number;  // 0.0 - 1.0
  originalText: string;
  parsedAt: string;
}
```

---

## 4. Solution Overview

### 4.1 Agent Role in Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ARES VR API                                   │
│                    GET /ekonomicke-subjekty-vr/{ico}                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   zpusobJednani       │
                        │   (free text)         │
                        │                       │
                        │   "Společnost         │
                        │   zastupují vždy      │
                        │   2 jednatelé         │
                        │   společně."          │
                        └───────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ACTING METHOD PARSER AGENT                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  LLM (Claude) with specialized prompt:                          │    │
│  │  - Czech legal vocabulary                                       │    │
│  │  - Structural patterns                                          │    │
│  │  - Edge case handling                                           │    │
│  │  - Confidence assessment                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   Structured Rule     │
                        │   {                   │
                        │     canActAlone: false│
                        │     jointAction: {    │
                        │       minimumActors: 2│
                        │     }                 │
                        │     confidence: 0.98  │
                        │   }                   │
                        └───────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 DETERMINISTIC VALIDATION ENGINE                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  IF seller.role == 'director' AND                               │    │
│  │     rule.canActAlone == false AND                               │    │
│  │     presentDirectors.length < rule.jointAction.minimumActors    │    │
│  │  THEN                                                           │    │
│  │     status = RED                                                │    │
│  │     message = "Requires 2 directors to sign jointly"            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         🔴 RED / 🟡 ORANGE / 🟢 GREEN
```

### 4.2 Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| **LLM for parsing only** | Agent outputs structured data, not decisions |
| **Deterministic decisions** | Rule engine makes pass/fail decisions |
| **Confidence thresholds** | Low confidence → human review |
| **Fallback to manual** | Agent can say "I'm not sure" |
| **Audit trail** | Store original text + parsed rule + confidence |

---

## 5. Technical Feasibility

### 5.1 Why LLMs Excel Here

| Factor | Assessment |
|--------|------------|
| **Czech language support** | ✅ Claude has strong Czech capabilities |
| **Legal terminology** | ✅ Pre-trained on legal documents |
| **Structured output** | ✅ Excellent JSON generation |
| **Few-shot learning** | ✅ Can learn patterns from examples |
| **Reasoning about rules** | ✅ Can handle conditional logic |

### 5.2 Why This Is a Good LLM Use Case

✅ **Bounded input** - Single text field, typically 1-3 sentences
✅ **Clear output schema** - Well-defined JSON structure
✅ **Verifiable** - Can validate output against known test cases
✅ **Non-destructive** - Parsing errors don't cause harm (triggers manual review)
✅ **High value** - Saves significant manual effort
✅ **Rare variations** - Once parsed, result can be cached

### 5.3 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM hallucination | Confidence score + human review below threshold |
| New pattern not recognized | Monitor unknown patterns, add to training set |
| Incorrect parsing | Validation against known company rules |
| Latency | Cache results (rules rarely change) |
| Cost | Small input, can use smaller model (Haiku) |

### 5.4 Latency & Cost Estimates

| Metric | Estimate |
|--------|----------|
| Input tokens | ~50-100 tokens (prompt + text) |
| Output tokens | ~100-200 tokens (JSON) |
| Latency (Claude Haiku) | ~200-400ms |
| Cost per parse | ~$0.0001-0.0002 |
| Cache hit rate | ~95% (same company = same rule) |

---

## 6. Data Analysis

### 6.1 Pattern Categories

Based on analysis of Czech Commercial Register entries, we identified these categories:

| Category | % of Companies | Complexity | Example |
|----------|----------------|------------|---------|
| **Simple Solo** | ~45% | Low | "Jednatel jedná samostatně" |
| **Simple Joint** | ~25% | Low | "Dva jednatelé společně" |
| **Role-Based** | ~15% | Medium | "Předseda sám, ostatní ve dvou" |
| **Conditional** | ~10% | High | "Nad 5M Kč dva jednatelé" |
| **Complex/Hybrid** | ~5% | High | Multiple rules combined |

### 6.2 Vocabulary Mapping

Common terms that express the same concept:

**"Can act alone":**
- samostatně, sám, jednotlivě, nezávisle, každý z nich, bez dalších

**"Must act jointly":**
- společně, spolu, ve dvou, alespoň dva, nejméně dva, vždy dva

**"Director":**
- jednatel, člen statutárního orgánu, člen představenstva

**"Chairman":**
- předseda, předseda představenstva, předseda jednatelů

**"Procurator":**
- prokurista

### 6.3 Real Data Examples

#### Example 1: Simple Solo

**Input:**
```
"Jednatelé zastupují společnost v plném rozsahu samostatně."
```

**Expected Output:**
```json
{
  "canActAlone": true,
  "actorType": "any_director",
  "jointAction": null,
  "conditions": null,
  "procuratorCanSign": false,
  "confidence": 0.99,
  "originalText": "Jednatelé zastupují společnost v plném rozsahu samostatně."
}
```

#### Example 2: Simple Joint

**Input:**
```
"Společnost zastupují vždy 2 (dva) jednatelé společně."
```

**Expected Output:**
```json
{
  "canActAlone": false,
  "actorType": "any_director",
  "jointAction": {
    "minimumActors": 2,
    "requiredRoles": null,
    "roleConstraints": null
  },
  "conditions": null,
  "procuratorCanSign": false,
  "confidence": 0.98,
  "originalText": "Společnost zastupují vždy 2 (dva) jednatelé společně."
}
```

#### Example 3: Role-Based

**Input:**
```
"Společnost zastupuje samostatně předseda představenstva nebo společně dva členové představenstva."
```

**Expected Output:**
```json
{
  "canActAlone": true,
  "actorType": "chairman_only",
  "jointAction": {
    "minimumActors": 2,
    "requiredRoles": ["board_member"],
    "roleConstraints": null
  },
  "conditions": null,
  "procuratorCanSign": false,
  "confidence": 0.97,
  "originalText": "Společnost zastupuje samostatně předseda představenstva nebo společně dva členové představenstva.",
  "interpretation": "Chairman can act alone. Alternatively, any 2 board members can act together."
}
```

#### Example 4: Conditional (Complex)

**Input:**
```
"Za společnost jedná každý jednatel. Pro právní jednání, kterým společnost nabývá nemovité věci nebo kterým společnost věci nemovité zcizuje, zavazuje nebo zatěžuje, a pro právní jednání přesahující částku 5.000.000,- Kč jednají vždy alespoň dva jednatelé společně."
```

**Expected Output:**
```json
{
  "canActAlone": true,
  "actorType": "any_director",
  "jointAction": null,
  "conditions": {
    "amountThreshold": 5000000,
    "transactionTypes": ["real_estate_acquisition", "real_estate_disposal", "encumbrance"],
    "alternativeRule": {
      "canActAlone": false,
      "actorType": "any_director",
      "jointAction": {
        "minimumActors": 2
      }
    }
  },
  "procuratorCanSign": false,
  "confidence": 0.92,
  "originalText": "Za společnost jedná každý jednatel...",
  "interpretation": "Default: any director alone. For real estate transactions OR amounts over 5,000,000 CZK: minimum 2 directors jointly."
}
```

#### Example 5: With Procurator

**Input:**
```
"Podepisování za společnost se děje tak, že k vytištěné nebo napsané obchodní firmě společnosti připojí svůj podpis jednatel nebo prokurista."
```

**Expected Output:**
```json
{
  "canActAlone": true,
  "actorType": "any_director",
  "jointAction": null,
  "conditions": null,
  "procuratorCanSign": true,
  "confidence": 0.96,
  "originalText": "Podepisování za společnost...",
  "interpretation": "Any director OR procurator can sign alone."
}
```

---

## 7. Agent Architecture

### 7.1 System Prompt Design

```markdown
# Acting Method Parser Agent

You are a specialized parser for Czech company representation rules ("způsob jednání").

## Your Task
Parse the input text into a structured JSON rule that can be used by a validation engine.

## Input
A Czech text describing how company representatives can legally bind the company.

## Output
A JSON object following this schema:
{
  "canActAlone": boolean,          // Can a single person sign?
  "actorType": string,             // "any_director" | "chairman_only" | "specific_role"
  "jointAction": {                 // Required if canActAlone is false (or as alternative)
    "minimumActors": number,
    "requiredRoles": string[],     // Optional: specific roles required
    "roleConstraints": string      // Optional: e.g., "at least one chairman"
  } | null,
  "conditions": {                  // Optional: for conditional rules
    "amountThreshold": number,
    "transactionTypes": string[],
    "alternativeRule": {...}       // Rule that applies when condition met
  } | null,
  "procuratorCanSign": boolean,
  "confidence": number,            // 0.0 to 1.0
  "interpretation": string         // Plain English explanation
}

## Vocabulary Reference

### "Can act alone" indicators:
- samostatně, sám, jednotlivě, nezávisle, každý z nich, bez dalších

### "Must act jointly" indicators:
- společně, spolu, ve dvou, alespoň dva, nejméně dva, vždy dva

### Roles:
- jednatel → director
- člen představenstva → board_member
- předseda → chairman
- místopředseda → vice_chairman
- prokurista → procurator

## Rules
1. If text says directors can act "samostatně" or "sám" → canActAlone: true
2. If text requires "dva" or "společně" → canActAlone: false, specify jointAction
3. If text has "nebo" (or) between options, capture both possibilities
4. If text mentions conditions (amounts, types), capture in conditions
5. Set confidence based on clarity:
   - Clear simple rule: 0.95-1.0
   - Role-based rule: 0.90-0.95
   - Conditional rule: 0.85-0.92
   - Ambiguous/complex: 0.70-0.85
   - Very unclear: below 0.70
6. If confidence is below 0.70, add "needsHumanReview": true
```

### 7.2 Few-Shot Examples in Prompt

Include 5-8 representative examples covering:
- Simple solo
- Simple joint
- Role-based
- Conditional
- With procurator
- Edge case (unclear)

### 7.3 Error Handling

| Scenario | Agent Response |
|----------|----------------|
| Empty input | `{ "error": "empty_input", "needsHumanReview": true }` |
| Non-Czech text | `{ "error": "language_not_supported", "needsHumanReview": true }` |
| Unrecognizable pattern | `{ "confidence": 0.4, "needsHumanReview": true, "interpretation": "..." }` |
| Very long text | Parse primary rule, flag complexity |

---

## 8. Input/Output Specification

### 8.1 Agent Input

```typescript
interface ActingMethodParserInput {
  // Required
  zpusobJednani: string;  // The raw text from ARES

  // Context (optional, for better parsing)
  companyName?: string;
  ico?: string;
  legalForm?: string;  // "s.r.o.", "a.s.", etc.
  directorCount?: number;

  // Control
  requireHighConfidence?: boolean;  // Default: true
  confidenceThreshold?: number;     // Default: 0.85
}
```

### 8.2 Agent Output

```typescript
interface ActingMethodParserOutput {
  // Parsed rule
  rule: ActingMethodRule;

  // Meta
  success: boolean;
  needsHumanReview: boolean;

  // Audit
  inputHash: string;      // For cache lookup
  parsedAt: string;       // ISO timestamp
  agentVersion: string;   // For tracking changes

  // Debug (optional)
  reasoning?: string;     // LLM's reasoning chain
}
```

### 8.3 Integration with Validation Engine

```typescript
// In validation-run/engine.ts

async function validateCorporateAuthorization(
  company: Company,
  presentDirectors: Director[],
  seller: Person
): Promise<ValidationResult> {

  // 1. Get the representation rule
  const rule = await getActingMethodRule(company.ico);

  // 2. Check if rule needs human review
  if (rule.needsHumanReview) {
    return {
      status: 'ORANGE',
      message: 'Acting method rule requires manual review',
      data: { rule, reason: 'low_confidence' }
    };
  }

  // 3. Validate against the rule
  if (rule.canActAlone && rule.actorType === 'any_director') {
    if (isDirector(seller, company)) {
      return { status: 'GREEN', message: 'Director can act alone' };
    }
  }

  if (rule.canActAlone && rule.actorType === 'chairman_only') {
    if (isChairman(seller, company)) {
      return { status: 'GREEN', message: 'Chairman can act alone' };
    }
    // Check joint action alternative
    if (rule.jointAction && presentDirectors.length >= rule.jointAction.minimumActors) {
      return { status: 'GREEN', message: 'Joint action quorum met' };
    }
    return {
      status: 'RED',
      message: `Only chairman can act alone. ${rule.jointAction?.minimumActors} directors needed for joint action.`
    };
  }

  if (!rule.canActAlone && rule.jointAction) {
    if (presentDirectors.length >= rule.jointAction.minimumActors) {
      return { status: 'GREEN', message: 'Joint action quorum met' };
    }
    return {
      status: 'RED',
      message: `Requires ${rule.jointAction.minimumActors} directors. Only ${presentDirectors.length} present.`
    };
  }

  // Fallback
  return { status: 'ORANGE', message: 'Complex rule - manual review required' };
}
```

---

## 9. Evaluation Strategy

### 9.1 Test Dataset

Create a golden dataset of 100+ examples:

| Category | Count | Source |
|----------|-------|--------|
| Simple Solo | 30 | ARES sample |
| Simple Joint | 25 | ARES sample |
| Role-Based | 20 | ARES sample |
| Conditional | 15 | ARES sample |
| Complex | 10 | Manual collection |

### 9.2 Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| **Accuracy** | >95% | Correct parsing on golden dataset |
| **Precision** | >98% | When confident, be correct |
| **Recall** | >90% | Correctly identify patterns |
| **False Positives** | <1% | Confidently wrong |
| **False Negatives** | <5% | Missed patterns (will go to human review) |
| **Confidence Calibration** | ±5% | Confidence matches actual accuracy |

### 9.3 Evaluation Script

```typescript
interface EvaluationResult {
  totalExamples: number;
  correctParses: number;
  accuracy: number;

  // By confidence bracket
  highConfidenceAccuracy: number;   // conf >= 0.95
  mediumConfidenceAccuracy: number; // 0.85 <= conf < 0.95
  lowConfidenceAccuracy: number;    // conf < 0.85

  // Failure analysis
  falsePositives: Example[];
  falseNegatives: Example[];
  confidenceMiscalibrations: Example[];
}
```

### 9.4 Continuous Monitoring

```yaml
Production Monitoring:
  - Track confidence distribution
  - Alert on confidence drop
  - Log human corrections
  - Weekly accuracy review
  - Pattern drift detection
```

---

## 10. Implementation Roadmap

### Phase 1: Prototype (1-2 days)

- [ ] Create prompt with few-shot examples
- [ ] Test against 20 hand-picked examples
- [ ] Iterate on prompt based on failures
- [ ] Validate JSON output schema

### Phase 2: Golden Dataset (2-3 days)

- [ ] Collect 100+ real ARES examples
- [ ] Manually annotate expected outputs
- [ ] Create automated evaluation script
- [ ] Achieve >90% accuracy

### Phase 3: Integration (2-3 days)

- [ ] Create Edge Function wrapper
- [ ] Add caching layer
- [ ] Integrate with validation engine
- [ ] Add confidence-based routing

### Phase 4: Production Hardening (2-3 days)

- [ ] Add monitoring and alerting
- [ ] Implement human review queue
- [ ] Create feedback loop for corrections
- [ ] Performance optimization

### Phase 5: Iteration (Ongoing)

- [ ] Monitor production accuracy
- [ ] Add new patterns to training set
- [ ] Adjust confidence thresholds
- [ ] Model updates

---

## 11. Risk Assessment

### 11.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM hallucination | Medium | High | Confidence scoring, human review |
| New pattern not handled | Medium | Medium | Monitor, add to training |
| Latency spike | Low | Medium | Caching, timeout handling |
| Model API outage | Low | High | Fallback to manual review |

### 11.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Incorrect validation allows fraud | Low | Very High | Conservative confidence thresholds |
| Too many manual reviews | Medium | Medium | Tune thresholds, improve prompt |
| Legal challenge on AI decision | Low | High | Audit trail, human in loop |

### 11.3 Confidence Threshold Strategy

```
Confidence >= 0.95: Automatic validation
Confidence 0.85-0.95: Validate with flag for audit
Confidence 0.70-0.85: ORANGE - Human review recommended
Confidence < 0.70: ORANGE - Human review required
```

---

## Appendices

### A. Glossary

| Czech Term | English | Description |
|------------|---------|-------------|
| Jednatel | Managing Director | Statutory representative of s.r.o. |
| Statutární orgán | Statutory Body | Legal representatives |
| Představenstvo | Board of Directors | Governing body in a.s. |
| Způsob jednání | Manner of Representation | How reps can bind company |
| Společně | Jointly | Must act together |
| Samostatně | Independently | Can act alone |
| Předseda | Chairman | Head of a board |
| Prokurista | Procurator | Person with prokura |

### B. ARES API Reference

**Endpoint:**
```
GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-vr/{ico}
```

**Relevant Response Fields:**
```json
{
  "statutarniOrgany": [
    {
      "nazev": "Statutární orgán",
      "zpusobJednani": "...",  // ← THE FIELD TO PARSE
      "pocetClenu": 3,
      "clenove": [...]
    }
  ]
}
```

### C. Test Companies

| IČO | Company | zpusobJednani Type |
|-----|---------|-------------------|
| 26835746 | AUTOMOTOLAND CZ | Solo |
| 09925953 | Global Repair Centres | Joint (2) |
| 46358714 | Louda Auto | Chairman OR 2 members |

### D. Related Documents

- [ARES_STATUTORY_BODY_RESEARCH.md](../architecture/ARES_STATUTORY_BODY_RESEARCH.md) - Full ARES VR research
- [ARES_VALIDATION_SCOPE.md](../architecture/ARES_VALIDATION_SCOPE.md) - Current validation rules
- [ExternalAPI.md](../ExternalAPI.md) - External registry integration guide

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-26 | Use LLM for parsing | Regex infeasible, LLM handles natural language variation |
| 2026-01-26 | Confidence thresholds | Conservative approach, human review for uncertain cases |
| 2026-01-26 | Cache parsed results | Rules rarely change, reduces cost and latency |

---

**Document Status:** Design Phase
**Next Steps:**
1. Create prototype prompt
2. Test against real ARES data
3. Build golden dataset
4. Review with legal team

---

*Created: 2026-01-26*
*Author: SecureDeal AI Team*
