#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Manual ARES Lookup Test Script
 *
 * Fetches all available company data from ARES and ADIS registries using DIČ.
 *
 * Usage:
 *   deno run --allow-net --allow-env supabase/tests/manual/test-ares-by-dic.ts CZ27074358
 *   deno run --allow-net --allow-env supabase/tests/manual/test-ares-by-dic.ts 27074358
 *
 * Or make executable:
 *   chmod +x supabase/tests/manual/test-ares-by-dic.ts
 *   ./supabase/tests/manual/test-ares-by-dic.ts CZ27074358
 */

// =============================================================================
// TYPES
// =============================================================================

interface AresCompanyData {
  ico: string;
  name: string;
  dic: string | null;
  address: {
    street: string | null;
    city: string;
    postal_code: string;
    country: string;
  };
  legal_form: string | null;
  date_founded: string | null;
  date_terminated: string | null;
  is_active: boolean;
  registered_bank_accounts?: string[];
}

interface DphStatus {
  is_vat_payer: boolean;
  is_unreliable: boolean;
  unreliable_since?: string;
  registered_accounts: string[];
  checked_at: string;
}

interface FullCompanyData {
  source_dic: string;
  extracted_ico: string;
  ares_data: AresCompanyData | null;
  dph_status: DphStatus | null;
  errors: string[];
  fetched_at: string;
}

// =============================================================================
// ARES CLIENT (Direct API calls)
// =============================================================================

const ARES_API_URL = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';

async function fetchFromAres(ico: string): Promise<Record<string, unknown> | null> {
  const url = `${ARES_API_URL}/${ico}`;
  console.log(`\n📡 Fetching from ARES: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      console.log(`   ❌ Company not found in ARES (404)`);
      return null;
    }

    if (!response.ok) {
      throw new Error(`ARES API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`   ✅ Company found in ARES`);
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ARES API timeout (15s)');
    }
    throw error;
  }
}

function transformAresResponse(ares: Record<string, unknown>): AresCompanyData {
  const sidlo = ares.sidlo as Record<string, unknown> | undefined;

  // Build city name
  let city = '';
  if (sidlo) {
    const nazevObce = sidlo.nazevObce as string || '';
    const mestskaCast = sidlo.nazevMestskeCastiObvodu as string || '';
    city = mestskaCast ? `${nazevObce} - ${mestskaCast}` : nazevObce;
  }

  // Build street address
  let street: string | null = null;
  if (sidlo?.nazevUlice) {
    const ulice = sidlo.nazevUlice as string;
    const cislo = sidlo.cisloDomovni as number | undefined;
    const orientacni = sidlo.cisloOrientacni as number | undefined;

    if (cislo && orientacni) {
      street = `${ulice} ${cislo}/${orientacni}`;
    } else if (cislo) {
      street = `${ulice} ${cislo}`;
    } else {
      street = ulice;
    }
  }

  return {
    ico: ares.ico as string,
    name: ares.obchodniJmeno as string,
    dic: (ares.dic as string) || null,
    address: {
      street,
      city,
      postal_code: String(sidlo?.psc || ''),
      country: (sidlo?.kodStatu as string) || 'CZ',
    },
    legal_form: (ares.pravniForma as string) || null,
    date_founded: (ares.datumVzniku as string) || null,
    date_terminated: (ares.datumZaniku as string) || null,
    is_active: (ares.stavSubjektu as string) === 'AKTIVNÍ',
  };
}

// =============================================================================
// ADIS CLIENT (SOAP Web Service for DPH/VAT status)
// =============================================================================

const ADIS_SOAP_URL = 'https://adisrws.mfcr.cz/dpr/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP';
const ADIS_NAMESPACE = 'http://adis.mfcr.cz/rozhraniCRPDPH/';
const ADIS_SOAP_ACTION = 'http://adis.mfcr.cz/rozhraniCRPDPH/getStatusNespolehlivyPlatce';

function buildSoapRequest(dicDigits: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <StatusNespolehlivyPlatceRequest xmlns="${ADIS_NAMESPACE}">
      <dic>${dicDigits}</dic>
    </StatusNespolehlivyPlatceRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function extractBankAccountsFromXml(xml: string): string[] {
  const accounts: string[] = [];

  // Find all <ucet> elements
  const ucetMatches = xml.matchAll(/<ucet[^>]*>([\s\S]*?)<\/ucet>/gi);

  for (const ucetMatch of ucetMatches) {
    const ucetContent = ucetMatch[1];

    // Try standard account format: <standardniUcet cislo="..." kodBanky="..."/>
    const standardniMatch = ucetContent.match(/<standardniUcet[^>]*cislo="([^"]*)"[^>]*kodBanky="([^"]*)"/);
    if (standardniMatch) {
      const cislo = standardniMatch[1];
      const kod = standardniMatch[2];
      if (cislo && kod) {
        accounts.push(`${cislo}/${kod}`);
      }
      continue;
    }

    // Try alternative attribute order: <standardniUcet kodBanky="..." cislo="..."/>
    const standardniAltMatch = ucetContent.match(/<standardniUcet[^>]*kodBanky="([^"]*)"[^>]*cislo="([^"]*)"/);
    if (standardniAltMatch) {
      const kod = standardniAltMatch[1];
      const cislo = standardniAltMatch[2];
      if (cislo && kod) {
        accounts.push(`${cislo}/${kod}`);
      }
      continue;
    }

    // Try non-standard account format (IBAN): <nestandardniUcet cislo="..."/>
    const nestandardniMatch = ucetContent.match(/<nestandardniUcet[^>]*cislo="([^"]*)"/);
    if (nestandardniMatch) {
      const cislo = nestandardniMatch[1];
      if (cislo) {
        accounts.push(cislo);
      }
      continue;
    }
  }

  return accounts;
}

async function checkDphStatus(dic: string): Promise<DphStatus | null> {
  // Remove CZ prefix for SOAP request
  const dicDigits = dic.toUpperCase().replace(/^CZ/, '');
  const normalizedDic = `CZ${dicDigits}`;

  console.log(`\n📡 Fetching from ADIS (DPH registry): ${normalizedDic}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const soapEnvelope = buildSoapRequest(dicDigits);

    const response = await fetch(ADIS_SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': ADIS_SOAP_ACTION,
      },
      body: soapEnvelope,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ADIS SOAP error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();

    // Parse SOAP response using regex (more reliable than DOM parsing for SOAP)
    // Check for SOAP fault
    const faultMatch = xml.match(/<(?:soapenv:)?Fault[^>]*>([\s\S]*?)<\/(?:soapenv:)?Fault>/i);
    if (faultMatch) {
      const faultStringMatch = faultMatch[1].match(/<faultstring[^>]*>([^<]*)<\/faultstring>/i);
      throw new Error(`ADIS SOAP fault: ${faultStringMatch?.[1] || 'Unknown SOAP fault'}`);
    }

    // Check status code
    const statusMatch = xml.match(/<status[^>]*statusCode="(\d)"[^>]*>/);
    const statusCode = statusMatch?.[1];

    if (statusCode === '2' || statusCode === '3') {
      console.log(`   ⚠️ ADIS service unavailable (status code: ${statusCode})`);
      return null;
    }

    // Find statusPlatceDPH element
    const statusPlatceMatch = xml.match(/<statusPlatceDPH([^>]*)>([\s\S]*?)<\/statusPlatceDPH>/);
    if (!statusPlatceMatch) {
      console.log(`   ℹ️ Not a VAT payer (no statusPlatceDPH found)`);
      return {
        is_vat_payer: false,
        is_unreliable: false,
        registered_accounts: [],
        checked_at: new Date().toISOString(),
      };
    }

    const statusPlatceAttrs = statusPlatceMatch[1];
    const statusPlatceContent = statusPlatceMatch[2];

    // Extract unreliable status from attributes
    const nespolehlivyMatch = statusPlatceAttrs.match(/nespolehlivyPlatce="([^"]*)"/);
    const nespolehlivy = nespolehlivyMatch?.[1]?.toUpperCase() === 'ANO';

    const datumMatch = statusPlatceAttrs.match(/datumZverejneniNespolehlivosti="([^"]*)"/);
    const datumZverejneni = datumMatch?.[1] || undefined;

    // Extract bank accounts
    const bankovniUcty = extractBankAccountsFromXml(statusPlatceContent);

    console.log(`   ✅ VAT payer found, ${bankovniUcty.length} registered bank accounts`);

    return {
      is_vat_payer: true,
      is_unreliable: nespolehlivy,
      unreliable_since: datumZverejneni,
      registered_accounts: bankovniUcty,
      checked_at: new Date().toISOString(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ADIS API timeout (15s)');
    }
    throw error;
  }
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

function extractIcoFromDic(dic: string): string {
  // Remove CZ prefix and any whitespace
  const cleaned = dic.replace(/\s+/g, '').toUpperCase();

  if (cleaned.startsWith('CZ')) {
    return cleaned.substring(2);
  }

  return cleaned;
}

function normalizeDic(dic: string): string {
  const cleaned = dic.replace(/\s+/g, '').toUpperCase();
  return cleaned.startsWith('CZ') ? cleaned : `CZ${cleaned}`;
}

async function lookupByDic(dic: string): Promise<FullCompanyData> {
  const normalizedDic = normalizeDic(dic);
  const ico = extractIcoFromDic(dic);
  const errors: string[] = [];

  console.log('\n' + '='.repeat(60));
  console.log(`🔍 ARES LOOKUP BY DIČ`);
  console.log('='.repeat(60));
  console.log(`   Input DIČ: ${dic}`);
  console.log(`   Normalized DIČ: ${normalizedDic}`);
  console.log(`   Extracted IČO: ${ico}`);

  // Validate IČO format
  if (!/^\d{8}$/.test(ico)) {
    errors.push(`Invalid IČO format: ${ico} (expected 8 digits)`);
    return {
      source_dic: normalizedDic,
      extracted_ico: ico,
      ares_data: null,
      dph_status: null,
      errors,
      fetched_at: new Date().toISOString(),
    };
  }

  // Validate IČO checksum
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(ico[i], 10) * weights[i];
  }
  const remainder = sum % 11;
  let expectedCheckDigit: number;
  if (remainder === 0) {
    expectedCheckDigit = 1;
  } else if (remainder === 1) {
    expectedCheckDigit = 0;
  } else {
    expectedCheckDigit = 11 - remainder;
  }

  if (parseInt(ico[7], 10) !== expectedCheckDigit) {
    console.log(`\n⚠️ Warning: IČO checksum invalid (expected last digit: ${expectedCheckDigit})`);
  }

  let aresData: AresCompanyData | null = null;
  let dphStatus: DphStatus | null = null;

  // Fetch from ARES
  try {
    const aresRaw = await fetchFromAres(ico);
    if (aresRaw) {
      aresData = transformAresResponse(aresRaw);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(`ARES error: ${msg}`);
    console.log(`   ❌ ARES error: ${msg}`);
  }

  // Fetch from ADIS (DPH status)
  try {
    dphStatus = await checkDphStatus(normalizedDic);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(`ADIS error: ${msg}`);
    console.log(`   ❌ ADIS error: ${msg}`);
  }

  // Merge bank accounts from ADIS into ARES data
  if (aresData && dphStatus?.registered_accounts) {
    aresData.registered_bank_accounts = dphStatus.registered_accounts;
  }

  return {
    source_dic: normalizedDic,
    extracted_ico: ico,
    ares_data: aresData,
    dph_status: dphStatus,
    errors,
    fetched_at: new Date().toISOString(),
  };
}

function printResults(result: FullCompanyData): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESULTS');
  console.log('='.repeat(60));

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    result.errors.forEach(err => console.log(`   - ${err}`));
  }

  if (result.ares_data) {
    const data = result.ares_data;
    console.log('\n📊 ARES DATA:');
    console.log(`   IČO:           ${data.ico}`);
    console.log(`   DIČ:           ${data.dic || '(not registered)'}`);
    console.log(`   Name:          ${data.name}`);
    console.log(`   Status:        ${data.is_active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`   Legal Form:    ${data.legal_form || '(unknown)'}`);
    console.log(`   Founded:       ${data.date_founded || '(unknown)'}`);
    if (data.date_terminated) {
      console.log(`   Terminated:    ${data.date_terminated}`);
    }
    console.log(`   Address:`);
    if (data.address.street) {
      console.log(`      Street:     ${data.address.street}`);
    }
    console.log(`      City:       ${data.address.city}`);
    console.log(`      Postal:     ${data.address.postal_code}`);
    console.log(`      Country:    ${data.address.country}`);
  } else {
    console.log('\n📊 ARES DATA: Not found');
  }

  if (result.dph_status) {
    const dph = result.dph_status;
    console.log('\n💰 DPH (VAT) STATUS:');
    console.log(`   VAT Payer:     ${dph.is_vat_payer ? '✅ YES' : '❌ NO'}`);
    if (dph.is_vat_payer) {
      console.log(`   Unreliable:    ${dph.is_unreliable ? '⚠️ YES - CAUTION!' : '✅ NO'}`);
      if (dph.unreliable_since) {
        console.log(`   Unreliable Since: ${dph.unreliable_since}`);
      }
      console.log(`   Registered Bank Accounts (${dph.registered_accounts.length}):`);
      if (dph.registered_accounts.length > 0) {
        dph.registered_accounts.forEach(acc => console.log(`      - ${acc}`));
      } else {
        console.log(`      (none registered)`);
      }
    }
    console.log(`   Checked At:    ${dph.checked_at}`);
  } else {
    console.log('\n💰 DPH (VAT) STATUS: Not available');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📄 FULL JSON OUTPUT:');
  console.log('='.repeat(60));
  console.log(JSON.stringify(result, null, 2));
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length === 0) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ARES Lookup by DIČ - Manual Test Script            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage:                                                      ║
║    deno run --allow-net supabase/tests/manual/test-ares-by-dic.ts <DIC>
║                                                              ║
║  Examples:                                                   ║
║    ... test-ares-by-dic.ts CZ27074358                        ║
║    ... test-ares-by-dic.ts 27074358                          ║
║    ... test-ares-by-dic.ts CZ00000001                        ║
║                                                              ║
║  The script will:                                            ║
║    1. Extract IČO from DIČ (remove CZ prefix)                ║
║    2. Fetch company data from ARES registry                  ║
║    3. Fetch DPH (VAT) status from ADIS registry              ║
║    4. Display all available data                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
    Deno.exit(1);
  }

  const dic = args[0];

  try {
    const result = await lookupByDic(dic);
    printResults(result);

    // Exit with error code if there were issues
    if (result.errors.length > 0 || !result.ares_data) {
      Deno.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}

// Run
main();
