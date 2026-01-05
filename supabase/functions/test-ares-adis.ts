/**
 * Test script to fetch company data from ARES and ADIS
 *
 * Usage: deno run --allow-net test-ares-adis.ts [ICO]
 * Default ICO: 25026534
 */

// =============================================================================
// ARES API CALL
// =============================================================================

async function fetchFromAres(ico: string): Promise<any> {
  const url = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`;

  console.log(`\n📡 Calling ARES API: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    return { error: 'Company not found in ARES' };
  }

  if (!response.ok) {
    throw new Error(`ARES API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// =============================================================================
// ADIS API CALL
// =============================================================================

async function fetchFromAdis(dic: string): Promise<any> {
  // Normalize DIČ - ensure it starts with CZ
  const normalizedDic = dic.toUpperCase().startsWith('CZ') ? dic : `CZ${dic}`;
  const url = `https://adisreg.mfcr.cz/cgi-bin/adis/idph/int_dp_prij.cgi?dic=${encodeURIComponent(normalizedDic)}&jazyk=cz&typ=json`;

  console.log(`\n📡 Calling ADIS API: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    return { error: 'DIČ not found in ADIS - not a VAT payer' };
  }

  if (!response.ok) {
    throw new Error(`ADIS API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  // Try to parse as JSON, handle HTML error pages
  try {
    return JSON.parse(text);
  } catch {
    // ADIS sometimes returns HTML for errors
    if (text.includes('Chyba') || text.includes('error')) {
      return { error: 'ADIS returned error page', raw: text.substring(0, 500) };
    }
    return { error: 'Invalid JSON response', raw: text.substring(0, 500) };
  }
}

// =============================================================================
// MAIN TEST
// =============================================================================

async function main() {
  const ico = Deno.args[0] || '25026534';

  console.log('═'.repeat(70));
  console.log(`🔍 Testing ARES & ADIS Integration for IČO: ${ico}`);
  console.log('═'.repeat(70));

  // Step 1: Fetch from ARES
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: ARES - Company Registry                                     │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  let aresData: any;
  let dic: string | null = null;

  try {
    aresData = await fetchFromAres(ico);

    if (aresData.error) {
      console.log(`\n❌ ARES Error: ${aresData.error}`);
    } else {
      dic = aresData.dic || null;

      console.log('\n✅ ARES Response:');
      console.log('─'.repeat(50));
      console.log(`  IČO:           ${aresData.ico}`);
      console.log(`  Company Name:  ${aresData.obchodniJmeno}`);
      console.log(`  DIČ:           ${aresData.dic || 'N/A (not a VAT payer)'}`);
      console.log(`  Legal Form:    ${aresData.pravniForma || 'N/A'}`);
      console.log(`  Founded:       ${aresData.datumVzniku || 'N/A'}`);
      console.log(`  Status:        ${aresData.stavSubjektu || 'N/A'}`);

      if (aresData.sidlo) {
        const s = aresData.sidlo;
        const street = s.nazevUlice
          ? `${s.nazevUlice} ${s.cisloDomovni || ''}${s.cisloOrientacni ? '/' + s.cisloOrientacni : ''}`
          : s.textovaAdresa || 'N/A';
        console.log(`  Address:       ${street.trim()}`);
        console.log(`  City:          ${s.nazevObce || 'N/A'}`);
        console.log(`  Postal Code:   ${s.psc || 'N/A'}`);
      }
    }
  } catch (error) {
    console.log(`\n❌ ARES Error: ${error}`);
  }

  // Step 2: Fetch from ADIS (if we have DIČ)
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: ADIS - VAT Registry (DPH Status & Bank Accounts)           │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');

  if (!dic) {
    console.log('\n⚠️  No DIČ available from ARES - skipping ADIS check');
    console.log('   (Company may not be a VAT payer)');
  } else {
    try {
      const adisData = await fetchFromAdis(dic);

      if (adisData.error) {
        console.log(`\n❌ ADIS Error: ${adisData.error}`);
        if (adisData.raw) {
          console.log(`   Raw response: ${adisData.raw}`);
        }
      } else {
        // ADIS may return array or object
        const record = Array.isArray(adisData) ? adisData[0] : adisData;

        console.log('\n✅ ADIS Response:');
        console.log('─'.repeat(50));
        console.log(`  DIČ:                ${record.dic || dic}`);
        console.log(`  Is VAT Payer:       ✅ Yes (found in registry)`);
        console.log(`  Unreliable Payer:   ${record.nespolehlivy ? '⚠️  YES - UNRELIABLE!' : '✅ No'}`);

        if (record.datumZverejneniNespolehlivosti || record.datumZverejneni) {
          console.log(`  Unreliable Since:   ${record.datumZverejneniNespolehlivosti || record.datumZverejneni}`);
        }

        const accounts = record.bankovniUcty || record.ucty || [];
        console.log(`\n  📋 Registered Bank Accounts (${accounts.length}):`);
        console.log('─'.repeat(50));

        if (accounts.length === 0) {
          console.log('     (No bank accounts registered)');
        } else {
          accounts.forEach((account: string, index: number) => {
            console.log(`     ${index + 1}. ${account}`);
          });
        }

        // Show raw response for debugging
        console.log('\n  📦 Raw ADIS Response:');
        console.log('─'.repeat(50));
        console.log(JSON.stringify(record, null, 2));
      }
    } catch (error) {
      console.log(`\n❌ ADIS Error: ${error}`);
    }
  }

  // Summary
  console.log('\n═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));

  if (aresData && !aresData.error) {
    console.log(`
Company:    ${aresData.obchodniJmeno}
IČO:        ${aresData.ico}
DIČ:        ${aresData.dic || 'Not a VAT payer'}
Status:     ${aresData.stavSubjektu || 'Unknown'}
Founded:    ${aresData.datumVzniku || 'Unknown'}
`);
  }

  console.log('═'.repeat(70));
}

// Run
main().catch(console.error);
