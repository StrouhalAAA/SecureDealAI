# Implementation Plan: ADIS SOAP API Integration

> **Status**: Pending Implementation
> **Priority**: High
> **Created**: 2025-01-05
> **Author**: Research conducted with Claude Code
> **Affects**: DPH-001, DPH-002, DPH-003 validation rules

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Research Findings](#research-findings)
4. [Technical Specification](#technical-specification)
5. [Implementation Plan](#implementation-plan)
6. [Code Examples](#code-examples)
7. [Testing Strategy](#testing-strategy)
8. [Migration Checklist](#migration-checklist)

---

## Executive Summary

The current ADIS (Czech VAT Registry) integration is **non-functional** because the API endpoints have changed. This document provides complete technical specifications for the correct SOAP-based API that retrieves:

- VAT payer status
- Unreliable payer flag
- Registered bank accounts
- Company name and address

**Impact**: Rules DPH-001, DPH-002, and DPH-003 cannot execute without a working ADIS integration.

---

## Problem Statement

### Current State (Broken)

| Component | Current Implementation | Status |
|-----------|----------------------|--------|
| CGI Endpoint | `https://adisreg.mfcr.cz/cgi-bin/adis/idph/int_dp_prij.cgi` | ❌ Returns HTML, not JSON |
| SOAP Endpoint | `https://adisrws.mfcr.cz/adistc/axis2/services/RpswsPublic` | ❌ 404 Not Found |
| DIČ Format | `CZ25026534` | ⚠️ Wrong format for SOAP |

### Affected Files

```
supabase/functions/ares-validate/adis-client.ts  ← Main file to update
supabase/functions/ares-validate/validator.ts    ← Uses ADIS data
supabase/functions/ares-validate/index.ts        ← Entry point
```

### Affected Validation Rules

| Rule ID | Name | Current Status |
|---------|------|----------------|
| DPH-001 | VAT Payer Status | ❌ Cannot verify via ADIS |
| DPH-002 | Unreliable Payer Check | ❌ Cannot verify via ADIS |
| DPH-003 | Bank Account Registration | ❌ Cannot verify via ADIS |

**Note**: DPH-001 can partially work via ARES (`seznamRegistraci.stavZdrojeDph`), but DPH-002 and DPH-003 **require** ADIS.

---

## Research Findings

### Correct API Endpoint (Verified Working)

| Property | Value |
|----------|-------|
| **WSDL URL** | `https://adisrws.mfcr.cz/adistc/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP?wsdl` |
| **SOAP Endpoint** | `https://adisrws.mfcr.cz/dpr/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP` |
| **Namespace** | `http://adis.mfcr.cz/rozhraniCRPDPH/` |
| **Protocol** | SOAP 1.1 |
| **Authentication** | None required (public API) |
| **Rate Limits** | Not documented, but service for third-party software |
| **Maintenance Window** | Sundays 3:00-4:00 CET |

### Available SOAP Operations

| Operation | Description | Use Case |
|-----------|-------------|----------|
| `getStatusNespolehlivyPlatce` | Basic check: unreliable status + bank accounts + tax office | Simple validation |
| `getStatusNespolehlivyPlatceRozsireny` | Extended: + company name and address | Better for logging |
| **`getStatusNespolehlivySubjektRozsirenyV2`** | **Latest**: includes identified persons, most complete | **Recommended** |
| `getSeznamNespolehlivyPlatce` | List ALL unreliable payers in Czech Republic | Batch processing |

### Input Format

**Important**: DIČ must be **numeric only**, without the `CZ` prefix.

| Input | Correct | Wrong |
|-------|---------|-------|
| DIČ | `25026534` | `CZ25026534` |
| Max per request | 100 DIČ values | - |

### Response Structure

```xml
<statusSubjektu
    typSubjektu="PLATCE_DPH"           <!-- PLATCE_DPH | IDENTIFIKOVANA_OSOBA | NESPOLEHLIVY -->
    dic="25026534"
    nespolehlivyPlatce="NE"            <!-- ANO | NE | NENALEZEN -->
    cisloFu="457"                      <!-- Tax office number -->
    datumZverejneniNespolehlivosti=""  <!-- Only if nespolehlivyPlatce="ANO" -->
>
    <zverejneneUcty>
        <ucet datumZverejneni="2013-04-01">
            <standardniUcet cislo="256423568" kodBanky="0300"/>
        </ucet>
        <ucet datumZverejneni="2019-05-17">
            <nestandardniUcet cislo="CZ1603000000000256423568"/>  <!-- IBAN format -->
        </ucet>
    </zverejneneUcty>
    <nazevSubjektu>OSIT S.R.O.</nazevSubjektu>
    <adresa>
        <uliceCislo>Mrštíkova 399/2a</uliceCislo>
        <castObce>LIBEREC III-JEŘÁB</castObce>
        <mesto>LIBEREC</mesto>
        <psc>46007</psc>
        <stat>Česká republika</stat>
    </adresa>
</statusSubjektu>
```

### Bank Account Formats

| Type | XML Element | Example | Output Format |
|------|-------------|---------|---------------|
| Standard Czech | `<standardniUcet cislo="X" kodBanky="Y"/>` | `cislo="256423568" kodBanky="0300"` | `256423568/0300` |
| IBAN | `<nestandardniUcet cislo="X"/>` | `cislo="CZ1603000000000256423568"` | `CZ1603000000000256423568` |
| With prefix | `<standardniUcet predcisli="X" cislo="Y" kodBanky="Z"/>` | `predcisli="19" cislo="987654321" kodBanky="2010"` | `19-987654321/2010` |

### Test Results (IČO 25026534)

```
Company:         OSIT S.R.O.
DIČ:             25026534
Subject Type:    PLATCE_DPH (VAT Payer)
Unreliable:      NE (No - Reliable)
Tax Office:      457
Address:         Mrštíkova 399/2a, 46007 LIBEREC

Bank Accounts:
  1. 256423568/0300           (published: 2013-04-01)
  2. 232544541/0300           (published: 2013-04-01)
  3. CZ1603000000000256423568  (IBAN, published: 2019-05-17)
```

---

## Technical Specification

### SOAP Request Template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:roz="http://adis.mfcr.cz/rozhraniCRPDPH/">
    <soapenv:Header/>
    <soapenv:Body>
        <roz:StatusNespolehlivySubjektRozsirenyV2Request>
            <roz:dic>25026534</roz:dic>
            <!-- Can include up to 100 DIČ elements -->
        </roz:StatusNespolehlivySubjektRozsirenyV2Request>
    </soapenv:Body>
</soapenv:Envelope>
```

### HTTP Headers

```http
POST /dpr/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP HTTP/1.1
Host: adisrws.mfcr.cz
Content-Type: text/xml;charset=UTF-8
SOAPAction: http://adis.mfcr.cz/rozhraniCRPDPH/getStatusNespolehlivySubjektRozsirenyV2
```

### Response Status Codes

| `nespolehlivyPlatce` | Meaning | DPH-002 Result |
|----------------------|---------|----------------|
| `ANO` | Unreliable payer | ❌ MISMATCH (RED) |
| `NE` | Reliable payer | ✅ MATCH (GREEN) |
| `NENALEZEN` | Not found in registry | ⚠️ MISSING (depends on context) |

### Type Mapping

```typescript
interface AdisResponse {
  dic: string;
  typSubjektu: 'PLATCE_DPH' | 'IDENTIFIKOVANA_OSOBA' | 'NESPOLEHLIVY_SUBJEKT';
  nespolehlivyPlatce: 'ANO' | 'NE' | 'NENALEZEN';
  datumZverejneniNespolehlivosti?: string;  // ISO date if unreliable
  cisloFu?: string;  // Tax office number
  nazevSubjektu?: string;
  adresa?: {
    uliceCislo: string;
    castObce?: string;
    mesto: string;
    psc: string;
    stat: string;
  };
  zverejneneUcty: BankAccount[];
}

interface BankAccount {
  type: 'standard' | 'iban';
  account: string;  // Formatted: "123456789/0300" or IBAN
  prefix?: string;  // Optional prefix: "19-"
  datumZverejneni: string;  // ISO date
}
```

---

## Implementation Plan

### Phase 1: Create New SOAP Client

**File**: `supabase/functions/ares-validate/adis-soap-client.ts`

```
Tasks:
1. Create SOAP envelope builder function
2. Implement HTTP POST with correct headers
3. Create XML response parser
4. Map to existing DphStatus interface
5. Add error handling for SOAP faults
6. Implement timeout and retry logic
```

### Phase 2: Update Existing Client

**File**: `supabase/functions/ares-validate/adis-client.ts`

```
Tasks:
1. Replace CGI endpoint with SOAP endpoint
2. Update checkDphStatus() to use SOAP
3. Update transformAdisResponse() for new XML structure
4. Fix DIČ format (remove CZ prefix before sending)
5. Update isBankAccountRegistered() if needed
```

### Phase 3: Update Validator

**File**: `supabase/functions/ares-validate/validator.ts`

```
Tasks:
1. Verify DPH-001 validation still works
2. Verify DPH-002 validation with new response
3. Verify DPH-003 bank account matching
4. Update error messages if needed
```

### Phase 4: Testing

```
Tasks:
1. Unit tests for SOAP client
2. Integration tests with real API
3. Test edge cases (unreliable payer, no accounts, etc.)
4. Performance testing (response times)
```

---

## Code Examples

### New SOAP Client Implementation

```typescript
// adis-soap-client.ts

const ADIS_SOAP_ENDPOINT = 'https://adisrws.mfcr.cz/dpr/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP';
const ADIS_NAMESPACE = 'http://adis.mfcr.cz/rozhraniCRPDPH/';
const ADIS_TIMEOUT_MS = 15000;

export interface AdisSOAPResponse {
  dic: string;
  typSubjektu: string;
  nespolehlivyPlatce: 'ANO' | 'NE' | 'NENALEZEN';
  datumZverejneniNespolehlivosti?: string;
  cisloFu?: string;
  nazevSubjektu?: string;
  adresa?: {
    uliceCislo: string;
    castObce?: string;
    mesto: string;
    psc: string;
    stat: string;
  };
  bankAccounts: Array<{
    account: string;
    type: 'standard' | 'iban';
    datumZverejneni: string;
  }>;
}

/**
 * Build SOAP envelope for ADIS request
 */
function buildSOAPRequest(dic: string): string {
  // Remove CZ prefix if present
  const numericDic = dic.replace(/^CZ/i, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:roz="${ADIS_NAMESPACE}">
  <soapenv:Header/>
  <soapenv:Body>
    <roz:StatusNespolehlivySubjektRozsirenyV2Request>
      <roz:dic>${numericDic}</roz:dic>
    </roz:StatusNespolehlivySubjektRozsirenyV2Request>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Parse SOAP response XML to structured object
 */
function parseSOAPResponse(xml: string): AdisSOAPResponse | null {
  // Check for SOAP fault
  if (xml.includes('soap:Fault') || xml.includes('soapenv:Fault')) {
    const faultMatch = xml.match(/<faultstring>([^<]+)<\/faultstring>/);
    throw new Error(`SOAP Fault: ${faultMatch?.[1] || 'Unknown error'}`);
  }

  // Check if DIČ was found
  const statusMatch = xml.match(/nespolehlivyPlatce="([^"]+)"/);
  if (!statusMatch || statusMatch[1] === 'NENALEZEN') {
    return null;
  }

  // Parse main attributes
  const dicMatch = xml.match(/dic="(\d+)"/);
  const typSubjektuMatch = xml.match(/typSubjektu="([^"]+)"/);
  const cisloFuMatch = xml.match(/cisloFu="(\d+)"/);
  const datumNespolehlivostiMatch = xml.match(/datumZverejneniNespolehlivosti="([^"]+)"/);

  // Parse company info
  const nazevMatch = xml.match(/<[^:]*:?nazevSubjektu>([^<]+)<\/[^:]*:?nazevSubjektu>/);
  const uliceMatch = xml.match(/<[^:]*:?uliceCislo>([^<]+)<\/[^:]*:?uliceCislo>/);
  const castObceMatch = xml.match(/<[^:]*:?castObce>([^<]+)<\/[^:]*:?castObce>/);
  const mestoMatch = xml.match(/<[^:]*:?mesto>([^<]+)<\/[^:]*:?mesto>/);
  const pscMatch = xml.match(/<[^:]*:?psc>([^<]+)<\/[^:]*:?psc>/);
  const statMatch = xml.match(/<[^:]*:?stat>([^<]+)<\/[^:]*:?stat>/);

  // Parse bank accounts
  const bankAccounts: AdisSOAPResponse['bankAccounts'] = [];

  // Standard accounts: <standardniUcet predcisli="X" cislo="Y" kodBanky="Z"/>
  const stdAccountRegex = /<ucet[^>]*datumZverejneni="([^"]+)"[^>]*>[\s\S]*?<standardniUcet(?:\s+predcisli="(\d+)")?\s+cislo="(\d+)"\s+kodBanky="(\d+)"[^>]*\/>/g;
  let match;
  while ((match = stdAccountRegex.exec(xml)) !== null) {
    const [, date, prefix, cislo, kodBanky] = match;
    const account = prefix ? `${prefix}-${cislo}/${kodBanky}` : `${cislo}/${kodBanky}`;
    bankAccounts.push({ account, type: 'standard', datumZverejneni: date });
  }

  // IBAN accounts: <nestandardniUcet cislo="CZ..."/>
  const ibanRegex = /<ucet[^>]*datumZverejneni="([^"]+)"[^>]*>[\s\S]*?<nestandardniUcet\s+cislo="([^"]+)"[^>]*\/>/g;
  while ((match = ibanRegex.exec(xml)) !== null) {
    const [, date, iban] = match;
    bankAccounts.push({ account: iban, type: 'iban', datumZverejneni: date });
  }

  return {
    dic: dicMatch?.[1] || '',
    typSubjektu: typSubjektuMatch?.[1] || '',
    nespolehlivyPlatce: statusMatch[1] as 'ANO' | 'NE',
    datumZverejneniNespolehlivosti: datumNespolehlivostiMatch?.[1],
    cisloFu: cisloFuMatch?.[1],
    nazevSubjektu: nazevMatch?.[1]?.trim(),
    adresa: uliceMatch ? {
      uliceCislo: uliceMatch[1].trim(),
      castObce: castObceMatch?.[1]?.trim(),
      mesto: mestoMatch?.[1]?.trim() || '',
      psc: pscMatch?.[1]?.trim() || '',
      stat: statMatch?.[1]?.trim() || 'Česká republika',
    } : undefined,
    bankAccounts,
  };
}

/**
 * Fetch DPH status from ADIS SOAP API
 */
export async function fetchFromAdisSoap(dic: string): Promise<AdisSOAPResponse | null> {
  const soapRequest = buildSOAPRequest(dic);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ADIS_TIMEOUT_MS);

  try {
    const response = await fetch(ADIS_SOAP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': `${ADIS_NAMESPACE}getStatusNespolehlivySubjektRozsirenyV2`,
      },
      body: soapRequest,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ADIS SOAP error: ${response.status} ${response.statusText}`);
    }

    const xmlResponse = await response.text();
    return parseSOAPResponse(xmlResponse);

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ADIS SOAP API timeout');
    }
    throw error;
  }
}

/**
 * Transform ADIS SOAP response to existing DphStatus interface
 * (for backward compatibility with existing code)
 */
export function transformToLegacyFormat(adis: AdisSOAPResponse | null): DphStatus {
  if (!adis) {
    return {
      is_vat_payer: false,
      is_unreliable: false,
      registered_accounts: [],
      checked_at: new Date().toISOString(),
    };
  }

  return {
    is_vat_payer: adis.typSubjektu === 'PLATCE_DPH' || adis.typSubjektu === 'IDENTIFIKOVANA_OSOBA',
    is_unreliable: adis.nespolehlivyPlatce === 'ANO',
    unreliable_since: adis.datumZverejneniNespolehlivosti,
    registered_accounts: adis.bankAccounts.map(acc => acc.account),
    checked_at: new Date().toISOString(),
  };
}
```

### Updated checkDphStatus Function

```typescript
// In adis-client.ts - replace the existing checkDphStatus function

import { fetchFromAdisSoap, transformToLegacyFormat } from './adis-soap-client.ts';

export async function checkDphStatus(dic: string): Promise<AdisRawResponse | null> {
  console.log(`[ADIS Client] Checking DPH status via SOAP for DIČ: ${dic}`);

  const soapResponse = await fetchFromAdisSoap(dic);

  if (!soapResponse) {
    console.log(`[ADIS Client] DIČ ${dic} not found in VAT registry`);
    return null;
  }

  // Convert to legacy format for backward compatibility
  return {
    dic: `CZ${soapResponse.dic}`,
    nespolehlivy: soapResponse.nespolehlivyPlatce === 'ANO',
    datumZverejneni: soapResponse.datumZverejneniNespolehlivosti,
    bankovniUcty: soapResponse.bankAccounts.map(acc => acc.account),
  };
}
```

---

## Testing Strategy

### Test Cases

| Test Case | DIČ | Expected Result |
|-----------|-----|-----------------|
| Valid VAT payer with accounts | 25026534 | `nespolehlivyPlatce=NE`, 3 bank accounts |
| Non-existent DIČ | 99999999 | `nespolehlivyPlatce=NENALEZEN` |
| Unreliable payer | (find one) | `nespolehlivyPlatce=ANO` + date |
| Invalid format | ABC123 | SOAP fault or validation error |

### Test Script Location

The working test script is located at:
```
supabase/functions/test-mfcr-soap.ts
```

Run with:
```bash
deno run --allow-net supabase/functions/test-mfcr-soap.ts 25026534
```

### Integration Test Checklist

- [ ] SOAP request builds correctly
- [ ] HTTP headers are correct (Content-Type, SOAPAction)
- [ ] XML response parses without errors
- [ ] Standard bank accounts extracted correctly
- [ ] IBAN bank accounts extracted correctly
- [ ] Prefix bank accounts (19-xxx) handled correctly
- [ ] Unreliable payer flag detected
- [ ] Company name and address extracted
- [ ] Timeout handling works
- [ ] Error handling for SOAP faults
- [ ] Backward compatibility with existing DphStatus interface

---

## Migration Checklist

### Pre-Migration

- [ ] Review this document
- [ ] Run test script to verify API is accessible
- [ ] Back up current `adis-client.ts`
- [ ] Identify all files that import from `adis-client.ts`

### Implementation

- [ ] Create `adis-soap-client.ts` with new SOAP implementation
- [ ] Update `adis-client.ts` to use new SOAP client
- [ ] Update type definitions if needed
- [ ] Run unit tests
- [ ] Run integration tests

### Validation

- [ ] Test DPH-001 rule (VAT payer status)
- [ ] Test DPH-002 rule (unreliable payer check)
- [ ] Test DPH-003 rule (bank account registration)
- [ ] Verify error handling and logging
- [ ] Test with multiple DIČ values

### Deployment

- [ ] Deploy to staging environment
- [ ] Run validation on test company (IČO 25026534)
- [ ] Monitor for errors
- [ ] Deploy to production
- [ ] Verify in production

---

## References

### Official Documentation

- **MFCR Web Service Info**: https://adisspr.mfcr.cz/adistc/adis/idpr_pub/dpr_info/ws_spdph.faces
- **MFCR VAT Registry Portal**: https://financnisprava.gov.cz/cs/dane/dane-elektronicky/danovy-portal/registr-dph
- **WSDL Definition**: https://adisrws.mfcr.cz/adistc/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP?wsdl

### Service Monitoring

- **Hlídač státu API Status**: https://www.hlidacstatu.cz/statniweby/info/100

### Related Files in Codebase

- `supabase/functions/ares-validate/adis-client.ts` - Current (broken) implementation
- `supabase/functions/ares-validate/validator.ts` - Uses ADIS data for validation
- `supabase/functions/test-mfcr-soap.ts` - Working test script
- `docs/architecture/ARES_VALIDATION_SCOPE.md` - Original specification

---

## Appendix: Full SOAP Response Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <StatusNespolehlivySubjektRozsirenyResponse xmlns="http://adis.mfcr.cz/rozhraniCRPDPH/">
      <status odpovedGenerovana="2025-01-05" statusCode="0" statusText="OK"/>
      <statusSubjektu typSubjektu="PLATCE_DPH" dic="25026534" nespolehlivyPlatce="NE" cisloFu="457">
        <zverejneneUcty>
          <ucet datumZverejneni="2013-04-01">
            <standardniUcet cislo="256423568" kodBanky="0300"/>
          </ucet>
          <ucet datumZverejneni="2013-04-01">
            <standardniUcet cislo="232544541" kodBanky="0300"/>
          </ucet>
          <ucet datumZverejneni="2019-05-17">
            <nestandardniUcet cislo="CZ1603000000000256423568"/>
          </ucet>
        </zverejneneUcty>
        <nazevSubjektu>OSIT S.R.O.</nazevSubjektu>
        <adresa>
          <uliceCislo>Mrštíkova 399/2a</uliceCislo>
          <castObce>LIBEREC III-JEŘÁB</castObce>
          <mesto>LIBEREC</mesto>
          <psc>46007</psc>
          <stat>Česká republika</stat>
        </adresa>
      </statusSubjektu>
    </StatusNespolehlivySubjektRozsirenyResponse>
  </soapenv:Body>
</soapenv:Envelope>
```

---

*Document created from research conducted on 2025-01-05. Verified working with test IČO 25026534.*
