# ARES Statutory Body Data Research

> **Version**: 1.0
> **Created**: 2026-01-20
> **Status**: 📋 RESEARCH COMPLETE - Pending Review
> **Purpose**: Document findings on ARES API capability to retrieve statutory body (jednatel) information and "způsob jednání" (manner of representation)

---

## 1. Executive Summary

### Research Question
Can we retrieve information about company directors (jednatelé/statutární orgán) from ARES, including:
- Number of directors and their identities
- How they sign contracts (způsob jednání)
- Whether all directors must sign together or can act individually

### Answer: ✅ YES

The ARES API provides complete statutory body information through the **VR (Veřejný rejstřík / Public Registry) endpoint**. This data includes:
- Full list of statutory body members with names and birth dates
- Their functions and tenure dates
- The legally binding "způsob jednání" (manner of representation)
- Supervisory board (dozorčí rada) members

### Business Value
- **Contract validity verification**: Ensure contracts are signed by authorized representatives
- **Fraud prevention**: Detect when unauthorized persons claim signing authority
- **Due diligence**: Complete vendor verification including governance structure

---

## 2. ARES API Endpoints Comparison

### 2.1 Current Implementation (Basic Endpoint)

```
GET /ekonomicke-subjekty/{ico}
```

**What it provides:**
| Field | Available |
|-------|-----------|
| IČO | ✅ |
| Company name | ✅ |
| DIČ | ✅ |
| Address | ✅ |
| Legal form | ✅ |
| Date founded | ✅ |
| Active status | ✅ |
| **Statutory body members** | ❌ |
| **Způsob jednání** | ❌ |

### 2.2 VR Endpoint (Extended Data)

```
GET /ekonomicke-subjekty-vr/{ico}
```

**What it provides:**
| Field | Available |
|-------|-----------|
| All basic fields | ✅ |
| **Statutory body members** | ✅ |
| **Member names & titles** | ✅ |
| **Birth dates** | ✅ |
| **Functions (jednatel, předseda, etc.)** | ✅ |
| **Function start/end dates** | ✅ |
| **Addresses** | ✅ |
| **Způsob jednání** | ✅ |
| **Supervisory board** | ✅ |
| **Historical changes** | ✅ |

---

## 3. Data Structure from VR Endpoint

### 3.1 Statutory Body (Statutární orgán)

```json
{
  "statutarniOrgany": [
    {
      "nazev": "Statutární orgán",
      "pocetClenu": 3,
      "zpusobJednani": "Společnost zastupují vždy 2 (dva) jednatelé společně.",
      "datumZapisuZpusobuJednani": "2023-04-26",
      "clenove": [
        {
          "jmeno": "Lukáš",
          "prijmeni": "Cankař",
          "titulPred": null,
          "titulZa": null,
          "datumNarozeni": "1980-05-04",
          "funkce": "jednatel",
          "datumVznikuFunkce": "2023-01-01",
          "datumZanikuFunkce": null,
          "adresa": {
            "ulice": "Vrbová",
            "cisloPopisne": "639",
            "obec": "Příbram",
            "psc": "26101"
          }
        }
      ]
    }
  ]
}
```

### 3.2 Key Fields Explained

| Field | Czech Name | Description |
|-------|------------|-------------|
| `nazev` | Název orgánu | "Statutární orgán", "Představenstvo", "Dozorčí rada" |
| `pocetClenu` | Počet členů | Number of members in the body |
| `zpusobJednani` | Způsob jednání | **Critical**: How representatives sign for the company |
| `datumZapisuZpusobuJednani` | Datum zápisu | Date this representation rule was registered |
| `clenove[]` | Členové | Array of individual members |
| `jmeno` | Jméno | First name |
| `prijmeni` | Příjmení | Surname |
| `titulPred` | Titul před | Title before name (Ing., Mgr., etc.) |
| `titulZa` | Titul za | Title after name (Ph.D., MBA, etc.) |
| `datumNarozeni` | Datum narození | Birth date |
| `funkce` | Funkce | Function: jednatel, předseda, místopředseda, člen |
| `datumVznikuFunkce` | Datum vzniku | Start date of function |
| `datumZanikuFunkce` | Datum zániku | End date (null if still active) |

---

## 4. "Způsob jednání" - Legal Analysis

### 4.1 What is "Způsob jednání"?

"Způsob jednání" (manner of representation) defines **how statutory body members can legally bind the company**. This is recorded in the Commercial Register and is legally binding on third parties.

### 4.2 Common Patterns

| Pattern | Meaning | Contract Requirements |
|---------|---------|----------------------|
| **"každý jednatel samostatně"** | Each director independently | Single director signature sufficient |
| **"jednatelé společně"** | Directors jointly | All directors must sign |
| **"vždy 2 jednatelé společně"** | Always 2 directors together | Any 2 directors must sign |
| **"předseda samostatně"** | Chairman independently | Chairman's signature alone valid |
| **"předseda samostatně nebo 2 členové společně"** | Chairman alone OR 2 members | Either option valid |

### 4.3 Real-World Examples

#### Example 1: Global Repair Centres, s.r.o. (IČO: 09925953)

**Statutory Body:**
| Name | Birth Date | Function | Since |
|------|------------|----------|-------|
| Lukáš Cankař | 1980-05-04 | jednatel | 2023-01-01 |
| Libor Holý, Ing. | 1964-01-11 | jednatel | 2021-02-16 |
| Marcel Slouka | 1976-10-29 | jednatel | 2021-05-01 |

**Způsob jednání:** *"Společnost zastupují vždy 2 (dva) jednatelé společně."*

**Interpretation:**
- ✅ Lukáš Cankař + Libor Holý = Valid
- ✅ Libor Holý + Marcel Slouka = Valid
- ✅ Marcel Slouka + Lukáš Cankař = Valid
- ❌ Only Lukáš Cankař = **INVALID**
- ❌ Only Marcel Slouka = **INVALID**

#### Example 2: Louda Auto a.s. (IČO: 46358714)

**Statutory Body (Představenstvo):**
| Name | Birth Date | Function | Since |
|------|------------|----------|-------|
| Pavel Louda | 1974-01-23 | Předseda představenstva | 2014-09-30 |
| Vlastimil Bažant, Ing. | 1970-11-25 | Místopředseda | 2022-01-01 |
| Martin Feller, Bc. | 1972-11-04 | Člen | (multiple periods) |
| Robert Imling | 1982-06-02 | Člen | 2022-07-20 |
| Petr Štuksa, Mgr. | 1981-08-08 | Člen | 2024-04-01 |

**Způsob jednání:** *"Společnost zastupuje samostatně předseda představenstva nebo společně dva členové představenstva."*

**Interpretation:**
- ✅ Pavel Louda alone = Valid (he is Chairman)
- ✅ Vlastimil Bažant + Martin Feller = Valid (2 members)
- ✅ Robert Imling + Petr Štuksa = Valid (2 members)
- ❌ Only Vlastimil Bažant = **INVALID** (Vice-Chairman ≠ Chairman)
- ❌ Only Martin Feller = **INVALID**

### 4.4 Legal Consequences of Invalid Representation

According to Czech law (§ 164 Občanský zákoník):

> **Contracts signed in violation of "způsob jednání" are INVALID and do not bind the company.**

Key legal points:
1. Third parties **cannot rely** on contracts signed by unauthorized persons
2. The representation rule is **publicly accessible** in the Commercial Register
3. Ignorance of the rule is **not an excuse** - parties are expected to verify
4. This differs from **internal limitations** which are not effective against third parties

**Case Law Reference:**
> "Smlouvu o koupi cenného papíru uzavřel jménem společnosti její jednatel, který dle zápisu v obchodním rejstříku nebyl oprávněn činit jménem společnosti právní úkony samostatně, ale pouze spolu s dalším jednatelem. Jestliže tedy učinil projev vůle směřující k uzavření smlouvy sám, nelze takový projev vůle považovat za projev vůle společnosti."

Translation: A securities purchase contract signed by a single director, when the Commercial Register required joint action with another director, cannot be considered the company's expression of will.

---

## 5. Supervisory Board (Dozorčí rada)

The VR endpoint also returns supervisory board data:

```json
{
  "dozorciRada": {
    "nazev": "Dozorčí rada",
    "clenove": [
      {
        "jmeno": "Martin",
        "prijmeni": "Laur",
        "titulPred": "Mgr.",
        "datumNarozeni": "1973-02-19",
        "funkce": "předseda dozorčí rady",
        "datumVznikuFunkce": "2025-03-12"
      }
    ]
  }
}
```

**Note:** Supervisory board members typically do NOT have signing authority. They oversee the statutory body but cannot represent the company externally.

---

## 6. Implementation Recommendations

### 6.1 Option A: Extend Existing ares-lookup

Add optional `includeVr=true` query parameter:

```
GET /functions/v1/ares-lookup/{ico}?includeVr=true
```

**Pros:**
- Backward compatible
- Single endpoint for all ARES data
- Optional - doesn't slow down basic lookups

**Cons:**
- Larger response payload
- VR data may not always be needed

### 6.2 Option B: New Dedicated Endpoint

```
GET /functions/v1/ares-lookup-vr/{ico}
```

**Pros:**
- Clean separation of concerns
- Clear purpose
- Can be called independently

**Cons:**
- Two API calls needed for full data
- More endpoints to maintain

### 6.3 Recommended Approach

**Option A with caching:**

1. Extend `ares-lookup` with `includeVr` parameter
2. Cache VR data separately (longer TTL - 24-48h as it changes rarely)
3. Return combined response when requested

### 6.4 Suggested Response Structure

```typescript
interface AresCompanyDataExtended extends AresCompanyData {
  // ... existing fields ...

  // New VR fields
  statutory_body?: {
    name: string;  // "Statutární orgán", "Představenstvo"
    member_count: number;
    representation_rule: string;  // "způsob jednání"
    representation_rule_since: string;  // date
    members: StatutoryMember[];
  };
  supervisory_board?: {
    members: SupervisoryMember[];
  };
}

interface StatutoryMember {
  first_name: string;
  last_name: string;
  title_before?: string;
  title_after?: string;
  birth_date: string;
  function: string;  // "jednatel", "předseda", "člen"
  function_since: string;
  function_until?: string;
  address?: Address;
}
```

### 6.5 New Validation Rules

| ID | Rule | Severity | Description |
|----|------|----------|-------------|
| VR-001 | Statutory body exists | WARNING | Company has registered statutory body |
| VR-002 | Representation rule defined | WARNING | "Způsob jednání" is specified |
| VR-003 | Signer has valid function | CRITICAL | Person signing has active function |
| VR-004 | Representation rule satisfied | CRITICAL | Contract signed per "způsob jednání" |

---

## 7. API Reference

### 7.1 ARES VR Endpoint

**URL:** `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-vr/{ico}`

**Method:** GET

**Headers:**
```
Accept: application/json
```

**Example Request:**
```bash
curl -X GET "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty-vr/09925953" \
  -H "Accept: application/json"
```

**Response:** Full company data including statutory body information

### 7.2 Rate Limits

| Time Period | Limit |
|-------------|-------|
| 08:00-18:00 | ~1000 requests/day |
| 18:00-08:00 | ~5000 requests/day |

**Recommendation:** Cache VR data for 24-48 hours as it changes infrequently.

### 7.3 Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Process data |
| 404 | IČO not found | Return "not found" |
| 429 | Rate limited | Retry with backoff |
| 503 | Service unavailable | Use cache or manual review |

---

## 8. Security & Privacy Considerations

### 8.1 Data Sensitivity

| Data | Sensitivity | Handling |
|------|-------------|----------|
| Director names | Public | Can store and display |
| Birth dates | Semi-public | Store, display with care |
| Addresses | Public (registered) | Can store and display |
| Function dates | Public | Can store and display |

### 8.2 GDPR Considerations

- All data is **publicly available** in the Commercial Register
- Data is provided by the state for **public access**
- Processing is justified under **legitimate interest** for business verification
- No special consent required for public registry data

---

## 9. Testing & Verification

### 9.1 Test Companies

| IČO | Company | Type | Statutory Body |
|-----|---------|------|----------------|
| 09925953 | Global Repair Centres, s.r.o. | s.r.o. | 3 jednatelé, joint representation |
| 46358714 | Louda Auto a.s. | a.s. | 5-member board, chairman or 2 members |
| 26835746 | AURES Holdings, a.s. | a.s. | Board structure |

### 9.2 Manual Verification URLs

- **ARES Web UI:** `https://ares.gov.cz/ekonomicke-subjekty/ros/{ico}`
- **Justice.cz:** `https://or.justice.cz/ias/ui/rejstrik-firma.vysledky?subjektId={ico}`
- **Kurzy.cz:** `https://rejstrik-firem.kurzy.cz/hledej/?s={ico}`

---

## 10. References

### 10.1 Official Documentation

- [ARES Swagger UI](https://ares.gov.cz/swagger-ui/) - Complete API documentation
- [ARES Developer Info](https://ares.gov.cz/stranky/vyvojar-info) - Developer resources
- [ARES Open Data Portal](https://data.mf.gov.cz/topics/ares) - Open data information
- [MFCR Technical Documentation (PDF)](https://mfcr.cz/assets/attachments/2024-02-16_ARES-Technical-documentation-Catalog-of-public-services_v02.pdf)

### 10.2 Legal References

- [KPMG: Zastoupení společnosti jednateli](https://danovky.cz/cs/zastoupeni-spolecnosti-s-rucenim-omezenym-jednateli-a-jeho-limity) - Legal analysis
- [BusinessInfo: Zastoupení podnikatele](https://www.businessinfo.cz/navody/zastoupeni-podnikatele-ppbi/6/) - Official business guidance
- [epravo.cz: Způsob jednání jednatele](https://www.epravo.cz/top/clanky/blizsi-specifikace-urceni-zpusobu-jednani-jednatele-jmenem-spolecnosti-a-zastupovani-podnikatele-prokuristou-83683.html) - Detailed legal analysis

### 10.3 Related SecureDealAI Documentation

- [`ARES_VALIDATION_SCOPE.md`](./ARES_VALIDATION_SCOPE.md) - Current ARES validation rules
- [`INT_02_ARES_ADIS_API.md`](../implementation/Completed/INT_02_ARES_ADIS_API.md) - ARES/ADIS implementation

---

## Appendix A: Glossary

| Czech Term | English | Description |
|------------|---------|-------------|
| Jednatel | Managing Director | Statutory representative of s.r.o. |
| Statutární orgán | Statutory Body | Legal representatives of the company |
| Představenstvo | Board of Directors | Governing body in a.s. (joint-stock company) |
| Dozorčí rada | Supervisory Board | Oversight body (no signing authority) |
| Způsob jednání | Manner of Representation | How representatives can bind the company |
| Společně | Jointly | Must act together |
| Samostatně | Independently | Can act alone |
| Předseda | Chairman | Head of a board |
| Místopředseda | Vice-Chairman | Deputy head |
| Člen | Member | Regular board member |
| Veřejný rejstřík (VR) | Public Registry | Source of company registration data |

---

## Appendix B: Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-20 | Research initiated | Need to understand ARES capability for statutory body data |
| 2026-01-20 | VR endpoint identified | Basic endpoint lacks statutory data; VR endpoint provides it |
| 2026-01-20 | Legal analysis completed | "Způsob jednání" has binding legal effect on contract validity |

---

**Document Status:** Ready for Review
**Next Steps:**
1. Review and approve research findings
2. Decide on implementation approach (Option A vs B)
3. Create implementation spec if approved
4. Add to development backlog
