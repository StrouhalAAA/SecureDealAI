# ARES Validation Scope - SecureDeal AI MVP

> **Version**: 1.0
> **Created**: 2025-12-30
> **Status**: ✅ APPROVED - součást MVP
> **Purpose**: Kompletní specifikace ARES/ADIS validace pro právnické osoby (COMPANY)

---

## 1. Executive Summary

Tento dokument definuje scope automatické validace firem (právnických osob) pomocí veřejných registrů:
- **ARES** (Administrativní registr ekonomických subjektů) - existence firmy, základní údaje
- **Registr DPH / ADIS** (Finanční správa) - status plátce DPH, nespolehlivost, bankovní účty

### Klíčové cíle
1. Automaticky ověřit existenci firmy podle IČO
2. Ověřit shodu DIČ s ARES záznamy
3. **Detekovat nespolehlivé plátce DPH** (kritická kontrola)
4. Ověřit registrované bankovní účty
5. Varovat při mladých firmách (< 1 rok)

### Business Impact
- **Snížení rizika**: Blokace transakcí s nespolehlivými plátci DPH
- **Automatizace**: 10 sekund vs 2 minuty manuální kontroly
- **Audit trail**: Kompletní historie validací

---

## 2. Validační kontroly

### 2.1 Přehled kontrol

| ID | Kontrola | Zdroj | Severity | Status při selhání |
|----|----------|-------|----------|-------------------|
| **ARES-001** | Existence firmy | ARES REST API | CRITICAL | RED |
| **ARES-002** | Shoda názvu firmy | ARES REST API | WARNING | ORANGE |
| **ARES-003** | Shoda DIČ | ARES REST API | CRITICAL | RED |
| **ARES-004** | Stáří firmy ≥ 1 rok | ARES REST API | WARNING | ORANGE |
| **DPH-001** | Je aktivní plátce DPH | ADIS SOAP/REST | CRITICAL | RED |
| **DPH-002** | Není nespolehlivý plátce | ADIS SOAP/REST | **CRITICAL** | **RED** |
| **DPH-003** | Bankovní účet registrován | ADIS SOAP/REST | WARNING | ORANGE |

### 2.2 Detailní specifikace kontrol

#### ARES-001: Existence firmy v ARES

```yaml
ID: ARES-001
Name: Existence firmy
Description: Ověření, že firma s daným IČO existuje v ARES
Input: ico (8 číslic)
API: GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
Success: HTTP 200, response obsahuje data
Failure: HTTP 404 (firma neexistuje)
Severity: CRITICAL
On_Fail: RED - transakce blokována
Message_Success: "Firma {obchodniJmeno} nalezena v ARES"
Message_Fail: "Firma s IČO {ico} nenalezena v ARES"
```

#### ARES-002: Shoda názvu firmy

```yaml
ID: ARES-002
Name: Shoda názvu firmy
Description: Porovnání zadaného názvu s ARES záznamem
Input: name (zadaný uživatelem), obchodniJmeno (z ARES)
Algorithm: Fuzzy match (Levenshtein similarity ≥ 80%)
Severity: WARNING
On_Fail: ORANGE - manuální review
Message_Success: "Název firmy odpovídá ARES záznamu"
Message_Fail: "Název '{name}' se liší od ARES záznamu '{obchodniJmeno}' (shoda {similarity}%)"
```

#### ARES-003: Shoda DIČ

```yaml
ID: ARES-003
Name: Shoda DIČ
Description: Ověření, že zadané DIČ odpovídá ARES záznamu
Input: vat_id (zadaný uživatelem), dic (z ARES)
Algorithm: EXACT match po normalizaci (uppercase, bez mezer)
Severity: CRITICAL
On_Fail: RED - transakce blokována
Message_Success: "DIČ {vat_id} odpovídá ARES záznamu"
Message_Fail: "DIČ {vat_id} neodpovídá ARES záznamu {dic}"
Special_Cases:
  - Firma není plátce DPH (dic = null): Přejít na DPH-001
  - DIČ nezadáno uživatelem: Skip kontrola, poznámka "DIČ nebylo zadáno"
```

#### ARES-004: Stáří firmy

```yaml
ID: ARES-004
Name: Stáří firmy
Description: Kontrola, že firma existuje déle než 1 rok
Input: datumVzniku (z ARES)
Algorithm: (TODAY - datumVzniku) >= 365 dní
Severity: WARNING
On_Fail: ORANGE - manuální review (firma mladší než 1 rok)
Threshold: 365 dní (1 rok)
Message_Success: "Firma založena {datumVzniku} ({years} let)"
Message_Fail: "Firma mladší než 1 rok (založena {datumVzniku}, {days} dní)"
```

#### DPH-001: Aktivní plátce DPH

```yaml
ID: DPH-001
Name: Je aktivní plátce DPH
Description: Ověření, že firma je registrovaná jako plátce DPH
Input: dic (DIČ ve formátu CZxxxxxxxx)
API: ADIS SOAP - StatusNespolehlivyPlatceRequest
Response_Field: statusPlatce
Success_Values: ["AKTIVNI"]
Failure_Values: ["NEAKTIVNI", "NEREGISTROVAN"]
Severity: CRITICAL
On_Fail: RED - transakce blokována
Message_Success: "Firma je aktivní plátce DPH"
Message_Fail: "Firma není plátce DPH (status: {statusPlatce})"
```

#### DPH-002: Nespolehlivý plátce DPH

```yaml
ID: DPH-002
Name: Nespolehlivý plátce DPH
Description: KRITICKÁ kontrola - firma NESMÍ být nespolehlivý plátce
Input: dic (DIČ ve formátu CZxxxxxxxx)
API: ADIS SOAP - StatusNespolehlivyPlatceRequest
Response_Field: nespolehlivyPlatce
Success_Value: "NE"
Failure_Value: "ANO"
Severity: CRITICAL (highest priority)
On_Fail: RED - transakce BLOKOVÁNA, eskalace na RBM
Message_Success: "Údaje o nespolehlivém plátci DPH: NE"
Message_Fail: "⚠️ POZOR: Firma je NESPOLEHLIVÝ PLÁTCE DPH od {datumZverejneniNespolehlivosti}"
Web_Verification: https://adisspr.mfcr.cz/dpr/DphReg?dic={dic}
```

#### DPH-003: Registrovaný bankovní účet

```yaml
ID: DPH-003
Name: Bankovní účet registrován
Description: Ověření, že zadaný bankovní účet je v seznamu registrovaných účtů plátce DPH
Input:
  - dic (DIČ)
  - bank_account (zadaný uživatelem, formát: číslo/kód nebo předčíslí-číslo/kód)
API: ADIS SOAP - SeznamBankovnichUctuRequest
Algorithm:
  1. Získat seznam účtů z ADIS
  2. Normalizovat zadaný účet (odstranit mezery, standardizovat formát)
  3. Porovnat se seznamem (exact match po normalizaci)
Severity: WARNING
On_Fail: ORANGE - manuální review (účet není v seznamu)
Message_Success: "Bankovní účet {bank_account} je registrován u plátce DPH"
Message_Fail: "Bankovní účet {bank_account} NENÍ v seznamu registrovaných účtů"
Message_NoAccounts: "Firma nemá zveřejněné bankovní účty v registru DPH"
```

---

## 3. API Integrace

### 3.1 ARES REST API

**Base URL**: `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest`

#### Endpoint: Základní informace o firmě

```http
GET /ekonomicke-subjekty/{ico}
Accept: application/json
```

**Příklad request:**
```bash
curl -X GET "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/26835746" \
  -H "Accept: application/json"
```

**Příklad response:**
```json
{
  "ico": "26835746",
  "obchodniJmeno": "AURES Holdings, a.s.",
  "sidlo": {
    "kodStatu": "CZ",
    "nazevObce": "Praha",
    "nazevUlice": "Türkova",
    "cisloDomovni": 2319,
    "psc": "14900",
    "textovaAdresa": "Türkova 2319/5b, Chodov, 149 00 Praha 4"
  },
  "pravniForma": {
    "kod": "121",
    "nazev": "Akciová společnost"
  },
  "dic": "CZ26835746",
  "datumVzniku": "2004-03-15",
  "datumZaniku": null,
  "seznamRegistraci": [
    {
      "zdrojRegistr": "DPH",
      "stavZdrojeDph": "PLATCE"
    }
  ]
}
```

**Mapování na validace:**

| Response pole | Validace | Použití |
|---------------|----------|---------|
| `ico` | ARES-001 | Potvrzení existence |
| `obchodniJmeno` | ARES-002 | Porovnání názvu |
| `dic` | ARES-003 | Porovnání DIČ |
| `datumVzniku` | ARES-004 | Výpočet stáří |

### 3.2 Registr DPH (ADIS) API

**WSDL**: `https://adisrws.mfcr.cz/adistc/axis2/services/RpswsPublic?wsdl`

#### Operace 1: Ověření spolehlivosti plátce

**SOAP Request:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:roz="http://adis.mfcr.cz/rozhraniCRPDPH/">
  <soap:Body>
    <roz:StatusNespolehlivyPlatceRequest>
      <roz:dic>CZ26835746</roz:dic>
    </roz:StatusNespolehlivyPlatceRequest>
  </soap:Body>
</soap:Envelope>
```

**SOAP Response:**
```xml
<StatusNespolehlivyPlatceResponse>
  <status>
    <statusPlatce>AKTIVNI</statusPlatce>
    <nespolehlivyPlatce>NE</nespolehlivyPlatce>
    <datumZverejneniNespolehlivosti></datumZverejneniNespolehlivosti>
    <cisloFu>451</cisloFu>
  </status>
</StatusNespolehlivyPlatceResponse>
```

#### Operace 2: Seznam bankovních účtů

**SOAP Request:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:roz="http://adis.mfcr.cz/rozhraniCRPDPH/">
  <soap:Body>
    <roz:SeznamBankovnichUctuRequest>
      <roz:dic>CZ26835746</roz:dic>
    </roz:SeznamBankovnichUctuRequest>
  </soap:Body>
</soap:Envelope>
```

**SOAP Response:**
```xml
<SeznamBankovnichUctuResponse>
  <ucty>
    <ucet>
      <cisloUctu>123456789</cisloUctu>
      <kodBanky>0800</kodBanky>
      <predcisliUctu></predcisliUctu>
      <datumZverejneni>2020-01-15</datumZverejneni>
    </ucet>
    <ucet>
      <cisloUctu>987654321</cisloUctu>
      <kodBanky>2010</kodBanky>
      <predcisliUctu>19</predcisliUctu>
      <datumZverejneni>2022-06-01</datumZverejneni>
    </ucet>
  </ucty>
</SeznamBankovnichUctuResponse>
```

### 3.3 Webové ověření (manuální fallback)

Pro manuální ověření nespolehlivosti plátce DPH:

**URL**: `https://adisspr.mfcr.cz/dpr/DphReg?id=1&pocet=1&fu=&OK=+Search+&ZPRAC=RDPHI1&dic={dic}`

**Příklad**: https://adisspr.mfcr.cz/dpr/DphReg?id=1&pocet=1&fu=&OK=+Search+&ZPRAC=RDPHI1&dic=CZ26835746

---

## 4. Validační Workflow

### 4.1 Sekvenční diagram

```
┌─────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│  User   │     │  Validation  │     │   ARES   │     │   ADIS   │
│ Input   │     │   Engine     │     │   API    │     │   API    │
└────┬────┘     └──────┬───────┘     └────┬─────┘     └────┬─────┘
     │                 │                   │                │
     │ Submit Company  │                   │                │
     │ (IČO, DIČ,      │                   │                │
     │  bank_account)  │                   │                │
     │────────────────>│                   │                │
     │                 │                   │                │
     │                 │ GET /ekonomicke-  │                │
     │                 │ subjekty/{ico}    │                │
     │                 │──────────────────>│                │
     │                 │                   │                │
     │                 │ Company Data      │                │
     │                 │<──────────────────│                │
     │                 │                   │                │
     │                 │ ARES-001: Check existence          │
     │                 │ ARES-002: Check name               │
     │                 │ ARES-003: Check DIČ                │
     │                 │ ARES-004: Check age                │
     │                 │                   │                │
     │                 │                   │ StatusNespo-   │
     │                 │                   │ lehlivyPlatce  │
     │                 │───────────────────────────────────>│
     │                 │                   │                │
     │                 │                   │ VAT Status     │
     │                 │<───────────────────────────────────│
     │                 │                   │                │
     │                 │ DPH-001: Check VAT active          │
     │                 │ DPH-002: Check unreliable          │
     │                 │                   │                │
     │                 │                   │ SeznamBankov-  │
     │                 │                   │ nichUctu       │
     │                 │───────────────────────────────────>│
     │                 │                   │                │
     │                 │                   │ Bank Accounts  │
     │                 │<───────────────────────────────────│
     │                 │                   │                │
     │                 │ DPH-003: Check bank account        │
     │                 │                   │                │
     │ Validation      │                   │                │
     │ Result          │                   │                │
     │<────────────────│                   │                │
     │                 │                   │                │
```

### 4.2 Status Determination Logic

```typescript
function determineOverallStatus(validations: ValidationResult[]): OverallStatus {
  // 1. Any CRITICAL failure = RED
  const criticalFailures = validations.filter(
    v => v.severity === 'CRITICAL' && v.status === 'FAIL'
  );

  if (criticalFailures.length > 0) {
    return 'RED';
  }

  // 2. Any WARNING failure = ORANGE
  const warningFailures = validations.filter(
    v => v.severity === 'WARNING' && v.status === 'FAIL'
  );

  if (warningFailures.length > 0) {
    return 'ORANGE';
  }

  // 3. All passed = GREEN
  return 'GREEN';
}
```

### 4.3 Priority a pořadí kontrol

```
1. ARES-001 (Existence)     → Pokud RED, STOP (firma neexistuje)
2. ARES-003 (DIČ)           → Pokud RED, STOP (DIČ nesedí)
3. DPH-001 (Plátce DPH)     → Pokud RED, STOP (není plátce)
4. DPH-002 (Nespolehlivý)   → Pokud RED, STOP (nespolehlivý plátce)
5. ARES-002 (Název)         → ORANGE pokud nesedí
6. ARES-004 (Stáří)         → ORANGE pokud < 1 rok
7. DPH-003 (Účet)           → ORANGE pokud neregistrován
```

---

## 5. Error Handling & Fallback

### 5.1 Fallback strategie

| Chyba | Status | Akce | Zpráva |
|-------|--------|------|--------|
| ARES API nedostupný | ORANGE | Manuální review | "ARES dočasně nedostupný, nelze automaticky ověřit" |
| ARES rate limit (429) | ORANGE | Retry + manuální | "ARES přetížen, zkuste později" |
| ARES timeout | ORANGE | Retry 3x, pak manuální | "ARES neodpovídá" |
| ADIS nedostupný | ORANGE | Manuální review | "Registr DPH nedostupný" |
| Neplatné IČO formát | RED | Okamžité odmítnutí | "IČO musí mít 8 číslic" |
| Neplatné DIČ formát | RED | Okamžité odmítnutí | "DIČ musí být ve formátu CZxxxxxxxx" |

### 5.2 Retry policy

```yaml
ARES_API:
  max_retries: 3
  retry_delay: [1s, 2s, 4s]  # Exponential backoff
  timeout: 10s

ADIS_API:
  max_retries: 3
  retry_delay: [1s, 2s, 4s]
  timeout: 15s  # SOAP může být pomalejší
```

### 5.3 Rate Limiting

| API | Denní limit | Noční limit | Doporučení |
|-----|-------------|-------------|------------|
| ARES | 1000 req (08-18h) | 5000 req (18-08h) | Cache 24h |
| ADIS | Nespecifikován | Nespecifikován | Cache 4h |

---

## 6. Caching Strategy

### 6.1 Cache TTL

| Data | TTL | Důvod |
|------|-----|-------|
| ARES základní data | 24 hodin | Relativně stabilní |
| DPH status + nespolehlivost | 4 hodiny | Může se změnit |
| Bankovní účty | 12 hodin | Středně stabilní |

### 6.2 Cache Key Format

```
ares:ico:{ico}           → Základní data firmy
ares:vr:{ico}            → Data z veřejného rejstříku
dph:status:{dic}         → Status plátce + nespolehlivost
dph:accounts:{dic}       → Seznam bankovních účtů
```

---

## 7. Database Schema

### 7.1 Tabulka: ares_validations

```sql
CREATE TABLE ares_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id),

  -- Vstupní data
  ico VARCHAR(15) NOT NULL,
  dic VARCHAR(15),
  bank_account VARCHAR(50),
  vendor_name VARCHAR(200),

  -- ARES response cache
  ares_response JSONB,
  ares_fetched_at TIMESTAMPTZ,

  -- DPH Registry response cache
  dph_status_response JSONB,
  dph_accounts_response JSONB,
  dph_fetched_at TIMESTAMPTZ,

  -- Validační výsledky
  validation_checks JSONB NOT NULL,
  /*
  [
    {
      "check_id": "ARES-001",
      "check_name": "Existence firmy",
      "status": "PASS",
      "severity": "CRITICAL",
      "message": "Firma AURES Holdings nalezena",
      "data": { "obchodniJmeno": "AURES Holdings, a.s." }
    },
    {
      "check_id": "DPH-002",
      "check_name": "Nespolehlivý plátce",
      "status": "PASS",
      "severity": "CRITICAL",
      "message": "Údaje o nespolehlivém plátci DPH: NE",
      "data": { "nespolehlivyPlatce": "NE" }
    }
  ]
  */

  overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('GREEN', 'ORANGE', 'RED')),

  -- Fallback tracking
  fallback_reason VARCHAR(200),  -- Důvod pokud ORANGE kvůli nedostupnosti
  requires_manual_review BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by VARCHAR(100)  -- Kdo provedl manuální review (pokud ORANGE)
);

-- Indexy
CREATE INDEX idx_ares_val_buying_opp ON ares_validations(buying_opportunity_id);
CREATE INDEX idx_ares_val_ico ON ares_validations(ico);
CREATE INDEX idx_ares_val_status ON ares_validations(overall_status);
```

### 7.2 Rozšíření vendors tabulky

```sql
ALTER TABLE vendors ADD COLUMN ares_validation_id UUID REFERENCES ares_validations(id);
ALTER TABLE vendors ADD COLUMN ares_validated_at TIMESTAMPTZ;
```

---

## 8. Příklad kompletní validace

### 8.1 Vstup

```json
{
  "vendor_type": "COMPANY",
  "name": "AURES Holdings, a.s.",
  "company_id": "26835746",
  "vat_id": "CZ26835746",
  "bank_account": "123456789/0800",
  "address_street": "Türkova 2319/5b",
  "address_city": "Praha",
  "address_postal_code": "14900"
}
```

### 8.2 Validační výsledek

```json
{
  "buying_opportunity_id": "uuid-123",
  "ico": "26835746",
  "dic": "CZ26835746",
  "overall_status": "GREEN",
  "validation_checks": [
    {
      "check_id": "ARES-001",
      "check_name": "Existence firmy",
      "status": "PASS",
      "severity": "CRITICAL",
      "message": "Firma AURES Holdings, a.s. nalezena v ARES",
      "executed_at": "2025-12-30T10:15:00Z"
    },
    {
      "check_id": "ARES-002",
      "check_name": "Shoda názvu",
      "status": "PASS",
      "severity": "WARNING",
      "message": "Název odpovídá ARES záznamu (100% shoda)",
      "data": {
        "input": "AURES Holdings, a.s.",
        "ares": "AURES Holdings, a.s.",
        "similarity": 1.0
      }
    },
    {
      "check_id": "ARES-003",
      "check_name": "Shoda DIČ",
      "status": "PASS",
      "severity": "CRITICAL",
      "message": "DIČ CZ26835746 odpovídá ARES záznamu"
    },
    {
      "check_id": "ARES-004",
      "check_name": "Stáří firmy",
      "status": "PASS",
      "severity": "WARNING",
      "message": "Firma založena 2004-03-15 (20+ let)",
      "data": {
        "datumVzniku": "2004-03-15",
        "ageInDays": 7595,
        "ageInYears": 20
      }
    },
    {
      "check_id": "DPH-001",
      "check_name": "Aktivní plátce DPH",
      "status": "PASS",
      "severity": "CRITICAL",
      "message": "Firma je aktivní plátce DPH",
      "data": {
        "statusPlatce": "AKTIVNI"
      }
    },
    {
      "check_id": "DPH-002",
      "check_name": "Nespolehlivý plátce",
      "status": "PASS",
      "severity": "CRITICAL",
      "message": "Údaje o nespolehlivém plátci DPH: NE",
      "data": {
        "nespolehlivyPlatce": "NE",
        "verificationUrl": "https://adisspr.mfcr.cz/dpr/DphReg?dic=CZ26835746"
      }
    },
    {
      "check_id": "DPH-003",
      "check_name": "Bankovní účet",
      "status": "PASS",
      "severity": "WARNING",
      "message": "Bankovní účet 123456789/0800 je registrován",
      "data": {
        "accountChecked": "123456789/0800",
        "isRegistered": true,
        "registeredSince": "2020-01-15"
      }
    }
  ],
  "ares_fetched_at": "2025-12-30T10:15:00Z",
  "dph_fetched_at": "2025-12-30T10:15:01Z",
  "total_duration_ms": 1523
}
```

### 8.3 Příklad s ORANGE výsledkem

```json
{
  "overall_status": "ORANGE",
  "validation_checks": [
    {
      "check_id": "DPH-003",
      "check_name": "Bankovní účet",
      "status": "FAIL",
      "severity": "WARNING",
      "message": "Bankovní účet 999999999/0100 NENÍ v seznamu registrovaných účtů",
      "data": {
        "accountChecked": "999999999/0100",
        "isRegistered": false,
        "registeredAccounts": [
          "123456789/0800",
          "19-987654321/2010"
        ]
      }
    }
  ],
  "requires_manual_review": true,
  "review_reason": "Bankovní účet není registrován v Registru DPH"
}
```

### 8.4 Příklad s RED výsledkem (nespolehlivý plátce)

```json
{
  "overall_status": "RED",
  "validation_checks": [
    {
      "check_id": "DPH-002",
      "check_name": "Nespolehlivý plátce",
      "status": "FAIL",
      "severity": "CRITICAL",
      "message": "⚠️ POZOR: Firma je NESPOLEHLIVÝ PLÁTCE DPH od 2024-06-15",
      "data": {
        "nespolehlivyPlatce": "ANO",
        "datumZverejneniNespolehlivosti": "2024-06-15",
        "verificationUrl": "https://adisspr.mfcr.cz/dpr/DphReg?dic=CZ12345678"
      }
    }
  ],
  "blocked": true,
  "escalation_required": true,
  "escalation_target": "RBM"
}
```

---

## 9. Integrace s MVP Workflow

### 9.1 Trigger validace

ARES validace se spustí automaticky když:
1. `vendor_type` = 'COMPANY'
2. Uživatel vyplní `company_id` (IČO)
3. Klikne na "Validovat" nebo přejde na další krok

### 9.2 UI zobrazení

```
┌─────────────────────────────────────────────────────────────┐
│ Validace firmy: AURES Holdings, a.s.                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ ARES-001  Existence firmy          PASS                 │
│  ✅ ARES-002  Shoda názvu              PASS (100%)          │
│  ✅ ARES-003  Shoda DIČ                PASS                 │
│  ✅ ARES-004  Stáří firmy              PASS (20+ let)       │
│  ✅ DPH-001   Aktivní plátce DPH       PASS                 │
│  ✅ DPH-002   Nespolehlivý plátce      NE ✓                 │
│  ⚠️ DPH-003   Bankovní účet            NEREGISTROVÁN        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Celkový status: 🟠 ORANGE                                   │
│  Důvod: Bankovní účet vyžaduje manuální ověření             │
│                                                              │
│  [Schválit manuálně]  [Zamítnout]  [Upravit data]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Bezpečnost a Compliance

### 10.1 Data Sensitivity

| Pole | Citlivost | Logování |
|------|-----------|----------|
| IČO | Veřejné | ✅ Lze logovat |
| DIČ | Veřejné | ✅ Lze logovat |
| Název firmy | Veřejné | ✅ Lze logovat |
| Bankovní účet | Citlivé | ⚠️ Maskovat v logech |

### 10.2 Audit Trail

Všechny validace musí být logovány:
- Kdo spustil validaci
- Kdy byla provedena
- Jaké byly výsledky
- Kdo případně schválil manuálně

---

## Appendix A: Reference

### A.1 Externí zdroje

- [ARES OpenAPI](https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/v3/api-docs)
- [ARES Swagger UI](https://ares.gov.cz/swagger-ui/)
- [Registr DPH - Finanční správa](https://financnisprava.gov.cz/cs/dane/dane-elektronicky/danovy-portal/registr-dph)
- [Vyhledání nespolehlivého plátce](https://adisspr.mfcr.cz/dpr/DphReg)

### A.2 Související dokumenty

- `Agents/ARES_INTEGRATION_GUIDE.md` - Technická implementace
- `Agents/ARES_Verification_Agent_Design.md` - Agent design
- `MVPScope/DATA_MODEL_VENDOR.md` - Datový model vendorů
- `MVPScope/SESSION.md` - Handoff dokument

---

**Dokument vytvořen**: 2025-12-30
**Autor**: AI osobní asistent
**Version**: 1.0
