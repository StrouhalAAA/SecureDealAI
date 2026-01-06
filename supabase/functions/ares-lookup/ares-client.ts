/**
 * SecureDealAI MVP - ARES API Client
 *
 * Handles communication with the Czech ARES registry
 * for company information lookup.
 *
 * ARES API Documentation:
 * https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Raw response from ARES API
 * Czech field names as returned by the API
 */
export interface AresRawResponse {
  ico: string;
  obchodniJmeno: string;
  dic?: string;
  sidlo: {
    kodStatu?: string;
    nazevStatu?: string;
    kodObce?: number;
    nazevObce?: string;
    kodMestskehoObvodu?: number;
    nazevMestskehoObvodu?: string;
    kodMestskeCastiObvodu?: number;
    nazevMestskeCastiObvodu?: string;
    kodUlice?: number;
    nazevUlice?: string;
    cisloDomovni?: number;
    kodCastiObce?: number;
    cisloOrientacni?: number;
    cisloOrientacniPismeno?: string;
    nazevCastiObce?: string;
    psc?: number;
    textovaAdresa?: string;
  };
  pravniForma?: string;
  datumVzniku?: string;
  datumZaniku?: string;
  stavSubjektu?: string;
}

/**
 * Transformed company data for our API response
 */
export interface AresCompanyData {
  ico: string;
  name: string;
  dic: string | null;
  address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  legal_form: string;
  date_founded: string;
  is_active: boolean;
  /** Registered bank accounts from ADIS (VAT registry) - populated during lookup if DIČ available */
  registered_bank_accounts?: string[];
}

// =============================================================================
// ARES CLIENT
// =============================================================================

const DEFAULT_ARES_URL = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty';

/**
 * Fetch company data from ARES API
 *
 * @param ico - 8-digit Czech company ID
 * @returns Raw ARES response or null if not found
 * @throws Error on API failures
 */
export async function fetchFromAres(ico: string): Promise<AresRawResponse | null> {
  const aresUrl = Deno.env.get('ARES_API_URL') || DEFAULT_ARES_URL;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`${aresUrl}/${ico}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`ARES API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ARES API timeout');
    }
    console.error('[ARES Client] Fetch error:', error);
    throw error;
  }
}

/**
 * Transform ARES raw response to our standardized format
 *
 * @param ares - Raw ARES API response
 * @returns Standardized company data
 */
export function transformAresResponse(ares: AresRawResponse): AresCompanyData {
  const sidlo = ares.sidlo;

  // Build street address from components
  let street = '';
  if (sidlo.nazevUlice) {
    street = sidlo.nazevUlice;
    if (sidlo.cisloDomovni) {
      street += ` ${sidlo.cisloDomovni}`;
    }
    if (sidlo.cisloOrientacni) {
      street += `/${sidlo.cisloOrientacni}`;
      if (sidlo.cisloOrientacniPismeno) {
        street += sidlo.cisloOrientacniPismeno;
      }
    }
  } else if (sidlo.cisloDomovni) {
    // Rural address without street name
    if (sidlo.nazevCastiObce) {
      street = `${sidlo.nazevCastiObce} ${sidlo.cisloDomovni}`;
    } else {
      street = `č.p. ${sidlo.cisloDomovni}`;
    }
  } else if (sidlo.textovaAdresa) {
    // Fallback to text address
    street = sidlo.textovaAdresa;
  }

  // Build city from components (prefer mestska cast > cast obce > obec)
  let city = sidlo.nazevObce || '';
  if (sidlo.nazevMestskeCastiObvodu) {
    city = `${city} - ${sidlo.nazevMestskeCastiObvodu}`;
  } else if (sidlo.nazevCastiObce && sidlo.nazevCastiObce !== sidlo.nazevObce) {
    city = `${city} - ${sidlo.nazevCastiObce}`;
  }

  return {
    ico: ares.ico,
    name: ares.obchodniJmeno,
    dic: ares.dic || null,
    address: {
      street: street.trim(),
      city: city.trim(),
      postal_code: sidlo.psc ? String(sidlo.psc).padStart(5, '0') : '',
      country: sidlo.kodStatu || 'CZ',
    },
    legal_form: ares.pravniForma || '',
    date_founded: ares.datumVzniku || '',
    is_active: ares.stavSubjektu === 'AKTIVNÍ' || ares.stavSubjektu === 'AKTIVNI',
  };
}
