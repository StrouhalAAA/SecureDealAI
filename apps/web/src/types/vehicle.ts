/**
 * Vehicle Types - Phase 7 Extended
 *
 * Separates vehicle-related types for better organization as we add
 * more fields from OCR extraction and external data sources.
 */

/**
 * Vehicle entity - Phase 7 Extended
 *
 * Contains all vehicle data fields including:
 * - Core identification (SPZ, VIN, etc.)
 * - Phase 7.1: Fraud detection (tachometer_km, datum_posledni_preregistrace)
 * - Phase 7.2: OCR-extractable basic fields (barva, palivo, etc.)
 * - Phase 7.3: Extended VTP data (karoserie, dimensions, emissions, etc.)
 */
export interface Vehicle {
  id?: string;
  buying_opportunity_id: string;

  // Core identification
  spz: string;
  vin?: string | null;
  znacka?: string | null;
  model?: string | null;
  rok_vyroby?: number | null;
  datum_1_registrace?: string | null;
  majitel?: string | null;
  motor?: string | null;
  vykon_kw?: number | null;

  // Phase 7.1: Fraud detection
  tachometer_km?: number | null;
  datum_posledni_preregistrace?: string | null;

  // Phase 7.2: OCR-extractable
  barva?: string | null;
  palivo?: string | null;
  objem_motoru?: number | null;
  pocet_mist?: number | null;
  max_rychlost?: number | null;
  kategorie_vozidla?: string | null;

  // Phase 7.3: Extended VTP data
  karoserie?: string | null;
  cislo_motoru?: string | null;
  provozni_hmotnost?: number | null;
  povolena_hmotnost?: number | null;
  delka?: number | null;
  sirka?: number | null;
  vyska?: number | null;
  rozvor?: number | null;
  emise_co2?: string | null;
  spotreba_paliva?: string | null;
  emisni_norma?: string | null;
  datum_stk?: string | null;
  stk_platnost?: string | null;

  // Metadata
  data_source?: 'MANUAL' | 'OCR' | 'BC_IMPORT';
  validation_status?: string | null;
  created_at?: string;
}

/**
 * Form input type (subset of Vehicle for form fields)
 * Only includes manually-editable fields
 */
export interface VehicleFormInput {
  spz: string;
  vin: string;
  znacka: string;
  model: string;
  rok_vyroby: number | null;
  datum_1_registrace: string;
  majitel: string;
  motor: string;
  vykon_kw: number | null;
  tachometer_km: number | null;  // Phase 7.1 - manual input
}

/**
 * OCR-extracted vehicle data
 * Fields populated from VTP/ORV document scanning
 */
export interface VehicleOCRData {
  // Basic OCR fields
  barva?: string | null;
  palivo?: string | null;
  objem_motoru?: number | null;
  pocet_mist?: number | null;
  max_rychlost?: number | null;
  kategorie_vozidla?: string | null;
  vykon_kw?: number | null;

  // Extended VTP data
  karoserie?: string | null;
  provozni_hmotnost?: number | null;
  povolena_hmotnost?: number | null;
  delka?: number | null;
  sirka?: number | null;
  vyska?: number | null;
  rozvor?: number | null;
  emise_co2?: string | null;
  spotreba_paliva?: string | null;
  emisni_norma?: string | null;
  stk_platnost?: string | null;
}

/**
 * Fuel type options for display
 * Czech standard fuel codes from vehicle registration
 */
export const FUEL_TYPE_OPTIONS = [
  { value: 'BA', label: 'Benzin' },
  { value: 'NM', label: 'Nafta (Diesel)' },
  { value: 'EL', label: 'Elektro' },
  { value: 'LPG', label: 'LPG' },
  { value: 'CNG', label: 'CNG' },
  { value: 'H', label: 'Vodik' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'BA/LPG', label: 'Benzin + LPG' },
  { value: 'EL/BA', label: 'Plug-in Hybrid (Benzin)' },
  { value: 'EL/NM', label: 'Plug-in Hybrid (Diesel)' },
] as const;

/**
 * Vehicle category options
 * EU vehicle category codes
 */
export const VEHICLE_CATEGORY_OPTIONS = [
  { value: 'M1', label: 'M1 - Osobni automobil' },
  { value: 'M2', label: 'M2 - Minibus (do 5t)' },
  { value: 'M3', label: 'M3 - Autobus (nad 5t)' },
  { value: 'N1', label: 'N1 - Lehke uzitkove (do 3.5t)' },
  { value: 'N2', label: 'N2 - Nakladni (3.5-12t)' },
  { value: 'N3', label: 'N3 - Tezke nakladni (nad 12t)' },
  { value: 'L1', label: 'L1 - Moped' },
  { value: 'L3', label: 'L3 - Motocykl' },
] as const;

/**
 * Get fuel type label from code
 */
export function getFuelTypeLabel(code: string | null | undefined): string {
  if (!code) return '-';
  const option = FUEL_TYPE_OPTIONS.find(o => o.value === code);
  return option?.label || code;
}

/**
 * Get vehicle category label from code
 */
export function getVehicleCategoryLabel(code: string | null | undefined): string {
  if (!code) return '-';
  const option = VEHICLE_CATEGORY_OPTIONS.find(o => o.value === code);
  return option?.label || code;
}
