/**
 * Test MFCR VAT Registry SOAP API
 *
 * Correct endpoint discovered through research:
 * WSDL: https://adisrws.mfcr.cz/adistc/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP?wsdl
 * Endpoint: https://adisrws.mfcr.cz/dpr/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP
 *
 * Operations:
 * - getStatusNespolehlivyPlatce: Basic unreliable payer status + bank accounts
 * - getStatusNespolehlivyPlatceRozsireny: + name and address
 * - getStatusNespolehlivySubjektRozsirenyV2: Latest version, includes identified persons
 */

const dic = Deno.args[0] || '25026534';

// Remove CZ prefix if present - API expects numeric DIČ only
const numericDic = dic.replace(/^CZ/i, '');

console.log(`\n${'═'.repeat(70)}`);
console.log(`🔍 Testing MFCR VAT Registry SOAP API for DIČ: ${numericDic}`);
console.log(`${'═'.repeat(70)}\n`);

const SOAP_ENDPOINT = 'https://adisrws.mfcr.cz/dpr/axis2/services/rozhraniCRPDPH.rozhraniCRPDPHSOAP';

// Use the V2 extended operation for most complete data
const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:roz="http://adis.mfcr.cz/rozhraniCRPDPH/">
  <soapenv:Header/>
  <soapenv:Body>
    <roz:StatusNespolehlivySubjektRozsirenyV2Request>
      <roz:dic>${numericDic}</roz:dic>
    </roz:StatusNespolehlivySubjektRozsirenyV2Request>
  </soapenv:Body>
</soapenv:Envelope>`;

console.log('📡 Calling SOAP endpoint...');
console.log(`   URL: ${SOAP_ENDPOINT}`);
console.log(`   Operation: getStatusNespolehlivySubjektRozsirenyV2\n`);

try {
  const response = await fetch(SOAP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction': 'http://adis.mfcr.cz/rozhraniCRPDPH/getStatusNespolehlivySubjektRozsirenyV2',
    },
    body: soapRequest,
  });

  console.log(`   Status: ${response.status} ${response.statusText}`);

  const xmlResponse = await response.text();

  // Parse key fields from XML response
  console.log(`\n${'─'.repeat(70)}`);
  console.log('📄 RAW SOAP RESPONSE:');
  console.log(`${'─'.repeat(70)}`);

  // Pretty print XML
  const prettyXml = xmlResponse
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n');
  console.log(prettyXml);

  // Extract key values using regex
  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 PARSED DATA:');
  console.log(`${'═'.repeat(70)}\n`);

  // DIČ
  const dicMatch = xmlResponse.match(/dic="(\d+)"/);
  console.log(`DIČ: ${dicMatch ? dicMatch[1] : 'N/A'}`);

  // Unreliable payer status
  const nespolehlivyMatch = xmlResponse.match(/nespolehlivyPlatce="([^"]+)"/);
  const isUnreliable = nespolehlivyMatch?.[1];
  console.log(`Unreliable Payer: ${isUnreliable === 'ANO' ? '⚠️  YES - WARNING!' : isUnreliable === 'NE' ? '✅ No' : isUnreliable || 'N/A'}`);

  // Subject type
  const typSubjektuMatch = xmlResponse.match(/typSubjektu="([^"]+)"/);
  console.log(`Subject Type: ${typSubjektuMatch ? typSubjektuMatch[1] : 'N/A'}`);

  // Tax office number
  const cisloFuMatch = xmlResponse.match(/cisloFu="(\d+)"/);
  console.log(`Tax Office (FÚ): ${cisloFuMatch ? cisloFuMatch[1] : 'N/A'}`);

  // Company name
  const nazevMatch = xmlResponse.match(/<[^:]*:?nazevSubjektu>([^<]+)<\/[^:]*:?nazevSubjektu>/);
  console.log(`Company Name: ${nazevMatch ? nazevMatch[1] : 'N/A'}`);

  // Address
  const uliceMatch = xmlResponse.match(/<[^:]*:?uliceCislo>([^<]+)<\/[^:]*:?uliceCislo>/);
  const mestoMatch = xmlResponse.match(/<[^:]*:?mesto>([^<]+)<\/[^:]*:?mesto>/);
  const pscMatch = xmlResponse.match(/<[^:]*:?psc>([^<]+)<\/[^:]*:?psc>/);
  if (uliceMatch || mestoMatch) {
    console.log(`Address: ${uliceMatch?.[1] || ''}, ${pscMatch?.[1] || ''} ${mestoMatch?.[1] || ''}`);
  }

  // Bank accounts
  console.log(`\n${'─'.repeat(50)}`);
  console.log('📋 REGISTERED BANK ACCOUNTS:');
  console.log(`${'─'.repeat(50)}`);

  const accounts: { account: string; date: string; type: string }[] = [];

  // Parse standard accounts: <standardniUcet cislo="256423568" kodBanky="0300"/>
  const stdAccountMatches = xmlResponse.matchAll(/<ucet[^>]*datumZverejneni="([^"]+)"[^>]*>[\s\S]*?<standardniUcet\s+cislo="(\d+)"\s+kodBanky="(\d+)"[^>]*\/>/g);
  for (const match of stdAccountMatches) {
    const [, date, cislo, kodBanky] = match;
    accounts.push({
      account: `${cislo}/${kodBanky}`,
      date,
      type: 'standard',
    });
  }

  // Parse non-standard accounts (IBAN): <nestandardniUcet cislo="CZ1603000000000256423568"/>
  const nonStdAccountMatches = xmlResponse.matchAll(/<ucet[^>]*datumZverejneni="([^"]+)"[^>]*>[\s\S]*?<nestandardniUcet\s+cislo="([^"]+)"[^>]*\/>/g);
  for (const match of nonStdAccountMatches) {
    const [, date, iban] = match;
    accounts.push({
      account: iban,
      date,
      type: 'IBAN',
    });
  }

  if (accounts.length > 0) {
    accounts.forEach((acc, i) => {
      console.log(`  ${i + 1}. ${acc.account.padEnd(30)} (${acc.type}, published: ${acc.date})`);
    });

    console.log(`\n  ✅ Total: ${accounts.length} registered bank account(s)`);
  } else {
    console.log('  (No bank accounts found in response)');
    console.log('  Note: Company may not have registered any accounts');
  }

  // Date of publication if unreliable
  const datumNespolehlivostiMatch = xmlResponse.match(/datumZverejneniNespolehlivosti="([^"]+)"/);
  if (datumNespolehlivostiMatch) {
    console.log(`\n⚠️  Unreliable Since: ${datumNespolehlivostiMatch[1]}`);
  }

} catch (error) {
  console.log(`\n❌ Error: ${error}`);
}

console.log(`\n${'═'.repeat(70)}`);
console.log('✅ Test complete');
console.log(`${'═'.repeat(70)}\n`);
