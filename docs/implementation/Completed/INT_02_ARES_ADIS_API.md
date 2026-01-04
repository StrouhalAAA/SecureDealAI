# Integration Document: ARES / ADIS API

> **Status**: ✅ COMPLETE
> **Required For**: Task 2.4 (ARES Lookup), Task 2.7 (ARES Validate)
> **Last Updated**: 2026-01-02

---

## Overview

This document contains the integration specification for Czech government APIs:
- **ARES** - Administrativní registr ekonomických subjektů (Company Registry)
- **ADIS** - Automatizovaný daňový informační systém (Tax/VAT Registry)

---

## ARES API

### Endpoint Information

| Item | Value | Status |
|------|-------|--------|
| API Base URL | `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty` | ✅ Known |
| Documentation | [ARES API Docs](https://ares.gov.cz/stranky/dokumentace) | ✅ Available |
| Authentication | None (public API) | ✅ Confirmed |
| Rate Limits | ~100 requests/minute (soft limit) | ⚠️ Verify |

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/{ico}` | GET | Get company by IČO |
| `/hledat` | GET | Search companies |

### Request: Get Company by IČO

```
GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
Accept: application/json
```

### Response: Company Data

```json
{
  "ico": "27074358",
  "obchodniJmeno": "OSIT s.r.o.",
  "sidlo": {
    "kodStatu": "CZ",
    "nazevStatu": "Česká republika",
    "kodKraje": 51,
    "nazevKraje": "Liberecký kraj",
    "kodOkresu": 5103,
    "nazevOkresu": "Liberec",
    "kodObce": 563889,
    "nazevObce": "Liberec",
    "kodUlice": 461393,
    "nazevUlice": "Mrštíkova",
    "cisloDomovni": 399,
    "cisloOrientacni": 2,
    "cisloOrientacniPismeno": "a",
    "psc": 46007,
    "textovaAdresa": "Mrštíkova 399/2a, Liberec III-Jeřáb, 460 07 Liberec"
  },
  "pravniForma": {
    "kod": 112,
    "nazev": "Společnost s ručením omezeným"
  },
  "datumVzniku": "2004-05-14",
  "datumZaniku": null,
  "dic": "CZ27074358",
  "financniUrad": {
    "kod": 460,
    "nazev": "Finanční úřad pro Liberecký kraj"
  },
  "seznamRegistraci": [
    {
      "stavZdrojeVr": "AKTIVNI",
      "nazevZdroje": "res"
    }
  ],
  "primarniZdroj": "res",
  "czNace": ["62010", "62020", "63110"]
}
```

### Field Mapping

| ARES Field | Our Field | Notes |
|------------|-----------|-------|
| ico | company_id | 8-digit string |
| obchodniJmeno | name | Official name |
| dic | vat_id | DIČ (if registered) |
| sidlo.nazevUlice + cisloDomovni | address_street | Combine |
| sidlo.nazevObce | address_city | |
| sidlo.psc | address_postal_code | |
| datumVzniku | date_founded | YYYY-MM-DD |
| pravniForma.nazev | legal_form | s.r.o., a.s., etc. |

---

## ADIS API (DPH Registry)

### Endpoint Information

| Item | Value | Status |
|------|-------|--------|
| WSDL URL | `https://adisrws.mfcr.cz/adistc/axis2/services/RpswsPublic?wsdl` | ✅ Verified |
| Protocol | SOAP 1.1 | ✅ Confirmed |
| Authentication | None (public API) | ✅ Confirmed |
| Namespace | `http://adis.mfcr.cz/rozhraniCRPDPH/` | ✅ Confirmed |

### Purpose

Check:
1. Is company a VAT payer? (`statusPlatce`)
2. Is company marked as "nespolehlivý plátce" (unreliable payer)? (`nespolehlivyPlatce`)
3. Which bank accounts are registered with tax authority? (`SeznamBankovnichUctu`)

### Web Verification (Manual Fallback)

For manual verification of VAT payer status:
```
https://adisspr.mfcr.cz/dpr/DphReg?id=1&pocet=1&fu=&OK=+Search+&ZPRAC=RDPHI1&dic={dic}
```
Example: https://adisspr.mfcr.cz/dpr/DphReg?id=1&pocet=1&fu=&OK=+Search+&ZPRAC=RDPHI1&dic=CZ26835746

---

### Operation 1: StatusNespolehlivyPlatce (VAT Status Check)

**Purpose**: Check if company is VAT payer and if marked as unreliable

#### SOAP Request

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

#### SOAP Response

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

#### Response Field Mapping

| XML Field | Type | Values | Usage |
|-----------|------|--------|-------|
| `statusPlatce` | string | `AKTIVNI`, `NEAKTIVNI`, `NEREGISTROVAN` | DPH-001 rule |
| `nespolehlivyPlatce` | string | `ANO`, `NE` | DPH-002 rule (CRITICAL) |
| `datumZverejneniNespolehlivosti` | date | ISO date or empty | Show in UI if unreliable |
| `cisloFu` | string | 3-digit code | Tax office identifier |

---

### Operation 2: SeznamBankovnichUctu (Bank Accounts List)

**Purpose**: Get list of bank accounts registered with tax authority for VAT payer

#### SOAP Request

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

#### SOAP Response

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

#### Response Field Mapping

| XML Field | Type | Description |
|-----------|------|-------------|
| `cisloUctu` | string | Account number (without prefix) |
| `kodBanky` | string | 4-digit bank code |
| `predcisliUctu` | string | Account prefix (optional) |
| `datumZverejneni` | date | Date when account was registered |

#### Bank Account Format Normalization

Czech bank accounts have format: `[předčíslí-]číslo/kód`

```typescript
function formatBankAccount(ucet: { predcisliUctu?: string; cisloUctu: string; kodBanky: string }): string {
  if (ucet.predcisliUctu) {
    return `${ucet.predcisliUctu}-${ucet.cisloUctu}/${ucet.kodBanky}`;
  }
  return `${ucet.cisloUctu}/${ucet.kodBanky}`;
}

// Examples:
// { cisloUctu: "123456789", kodBanky: "0800" } → "123456789/0800"
// { predcisliUctu: "19", cisloUctu: "987654321", kodBanky: "2010" } → "19-987654321/2010"
```

---

## Validation Rules Using APIs

### ARES Rules

| Rule ID | Check | API Call | Pass Condition |
|---------|-------|----------|----------------|
| ARES-001 | Company exists | GET /{ico} | HTTP 200 |
| ARES-002 | Name matches | Compare obchodniJmeno | Fuzzy >= 80% |
| ARES-003 | DIČ matches | Compare dic | Exact match |
| ARES-004 | Company age | Check datumVzniku | > 1 year ago |

### ADIS Rules

| Rule ID | Check | API Call | Pass Condition |
|---------|-------|----------|----------------|
| DPH-001 | Is VAT payer | Query by DIČ | platceDph = true |
| DPH-002 | Not unreliable | Query by DIČ | nespolehlivy = false |
| DPH-003 | Bank registered | Check bankovniUcty | Account in list |

---

## Error Handling

### ARES Errors

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Parse response |
| 404 | IČO not found | Return not_found |
| 429 | Rate limited | Wait and retry |
| 500 | Server error | Return error, use cache |
| Timeout | API slow | Return cached or error |

### ADIS Errors

| Error | Meaning | Action |
|-------|---------|--------|
| Not found | Not a VAT payer | Return is_vat_payer: false |
| Timeout | Service unavailable | Skip DPH checks, log warning |

---

## Caching Strategy

| Data Type | Cache Duration | Invalidation |
|-----------|----------------|--------------|
| ARES company data | 24 hours | Manual refresh |
| ADIS DPH status | 1 hour | Manual refresh |
| Bank accounts list | 1 hour | Manual refresh |

---

## Implementation Notes

### ARES Integration

1. ARES API is public and free
2. No authentication required
3. Returns JSON by default
4. UTF-8 encoding for Czech characters
5. Handles diacritics properly

### ADIS Integration (SOAP in Deno)

Since ADIS uses SOAP/XML, here's the recommended approach for Deno Edge Functions:

#### 1. Building SOAP Request

```typescript
function buildSoapEnvelope(operation: string, dic: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:roz="http://adis.mfcr.cz/rozhraniCRPDPH/">
  <soap:Body>
    <roz:${operation}Request>
      <roz:dic>${dic}</roz:dic>
    </roz:${operation}Request>
  </soap:Body>
</soap:Envelope>`;
}
```

#### 2. Making SOAP Request

```typescript
const ADIS_ENDPOINT = 'https://adisrws.mfcr.cz/adistc/axis2/services/RpswsPublic';

async function callAdis(operation: string, dic: string): Promise<string> {
  const soapEnvelope = buildSoapEnvelope(operation, dic);

  const response = await fetch(ADIS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `"${operation}"`,
    },
    body: soapEnvelope,
  });

  if (!response.ok) {
    throw new Error(`ADIS API error: ${response.status}`);
  }

  return await response.text();
}
```

#### 3. Parsing XML Response (Deno)

```typescript
// Deno has built-in DOMParser
function parseVatStatus(xmlText: string): {
  statusPlatce: string;
  nespolehlivyPlatce: string;
  datumZverejneniNespolehlivosti: string | null;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const status = doc.querySelector('status');
  if (!status) {
    throw new Error('Invalid ADIS response: missing status element');
  }

  return {
    statusPlatce: status.querySelector('statusPlatce')?.textContent ?? 'UNKNOWN',
    nespolehlivyPlatce: status.querySelector('nespolehlivyPlatce')?.textContent ?? 'UNKNOWN',
    datumZverejneniNespolehlivosti: status.querySelector('datumZverejneniNespolehlivosti')?.textContent || null,
  };
}

function parseBankAccounts(xmlText: string): Array<{
  cisloUctu: string;
  kodBanky: string;
  predcisliUctu: string | null;
  datumZverejneni: string;
}> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const accounts: Array<{
    cisloUctu: string;
    kodBanky: string;
    predcisliUctu: string | null;
    datumZverejneni: string;
  }> = [];

  const ucetElements = doc.querySelectorAll('ucet');
  ucetElements.forEach((ucet) => {
    accounts.push({
      cisloUctu: ucet.querySelector('cisloUctu')?.textContent ?? '',
      kodBanky: ucet.querySelector('kodBanky')?.textContent ?? '',
      predcisliUctu: ucet.querySelector('predcisliUctu')?.textContent || null,
      datumZverejneni: ucet.querySelector('datumZverejneni')?.textContent ?? '',
    });
  });

  return accounts;
}
```

#### 4. Complete ADIS Client

```typescript
// adis-client.ts
export interface VatStatus {
  isVatPayer: boolean;
  isUnreliable: boolean;
  unreliableSince: string | null;
  rawStatus: string;
}

export interface BankAccount {
  accountNumber: string;  // Formatted: "[prefix-]number/bankCode"
  registeredSince: string;
}

export async function checkVatStatus(dic: string): Promise<VatStatus> {
  const xml = await callAdis('StatusNespolehlivyPlatce', dic);
  const parsed = parseVatStatus(xml);

  return {
    isVatPayer: parsed.statusPlatce === 'AKTIVNI',
    isUnreliable: parsed.nespolehlivyPlatce === 'ANO',
    unreliableSince: parsed.datumZverejneniNespolehlivosti,
    rawStatus: parsed.statusPlatce,
  };
}

export async function getRegisteredBankAccounts(dic: string): Promise<BankAccount[]> {
  const xml = await callAdis('SeznamBankovnichUctu', dic);
  const parsed = parseBankAccounts(xml);

  return parsed.map((acc) => ({
    accountNumber: acc.predcisliUctu
      ? `${acc.predcisliUctu}-${acc.cisloUctu}/${acc.kodBanky}`
      : `${acc.cisloUctu}/${acc.kodBanky}`,
    registeredSince: acc.datumZverejneni,
  }));
}
```

### Rate Limiting

| API | Soft Limit | Recommendation |
|-----|------------|----------------|
| ARES | ~100 req/min (08-18h), ~500 req/min (night) | Cache 24h |
| ADIS | Not specified | Cache 4h, implement retry |

- Implement client-side rate limiting
- Use exponential backoff on errors
- Cache responses in Supabase

### Retry Policy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  delays: [1000, 2000, 4000],  // Exponential backoff
  timeout: 15000,  // 15s for SOAP
};
```

---

## Action Items

- [x] Document ARES API endpoints
- [x] Document ARES request/response formats
- [x] Verify ADIS API access method (SOAP confirmed)
- [x] Document ADIS request/response formats
- [x] Add Deno implementation guidance
- [ ] Test ARES API with real IČOs (use test data below)
- [ ] Test ADIS API with real DIČs
- [ ] Implement caching layer in Supabase
- [ ] Test rate limits in production

---

## Test IČOs

| IČO | Company | Expected |
|-----|---------|----------|
| 27074358 | OSIT s.r.o. | Valid, active |
| 00000001 | - | Not found |
| 25596641 | Škoda Auto a.s. | Valid, large company |
| 45274649 | ČEZ, a.s. | Valid, with DIČ |

---

## References

- [ARES Portal](https://ares.gov.cz/)
- [ARES API Documentation](https://ares.gov.cz/stranky/dokumentace)
- [ADIS - Nespolehlivý plátce](https://adisreg.mfcr.cz/adis/jerrrs/online/nespolehlivy/nespolehlivy.htm)
- [Finanční správa](https://www.financnisprava.cz/)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-02 | **ADIS specification complete**: Added WSDL URL, SOAP request/response examples, field mappings, Deno implementation code, bank account formatting |
| 2026-01-01 | Initial document with ARES details |
