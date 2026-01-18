/**
 * Data Transformer for OCR Extraction
 *
 * Transforms and normalizes raw OCR data into structured formats.
 * Handles Czech document conventions (date formats, rodné číslo, IČO, etc.)
 */

import type { ORVExtractionResult } from "./schemas/orv-schema.ts";
import type { OPExtractionResult } from "./schemas/op-schema.ts";
import type { VTPExtractionResult } from "./schemas/vtp-schema.ts";
import {
  parseKeeperNameIdentifier,
  detectVendorType,
  validateRodneCislo,
  validateIco,
} from "./vendor-parser.ts";

// =============================================================================
// EXTENDED VEHICLE DATA TYPES (Phase 7)
// =============================================================================

/**
 * Extended vehicle data structure for database persistence
 * Maps OCR extraction results to database columns
 */
export interface VehicleDataExtended {
  // Existing fields (Phase 1-6)
  spz?: string;
  vin?: string;
  znacka?: string;
  model?: string;
  datum_1_registrace?: string;
  majitel?: string;
  vykon_kw?: number;

  // Phase 7.1: Fraud detection
  tachometer_km?: number;
  datum_posledni_preregistrace?: string;

  // Phase 7.2: OCR-extractable (ORV + VTP)
  barva?: string;
  palivo?: string;
  objem_motoru?: number;
  pocet_mist?: number;
  max_rychlost?: number;
  kategorie_vozidla?: string;

  // Phase 7.3: Extended VTP data
  karoserie?: string;
  cislo_motoru?: string;
  provozni_hmotnost?: number;
  povolena_hmotnost?: number;
  delka?: number;
  sirka?: number;
  vyska?: number;
  rozvor?: number;
  emise_co2?: string;
  spotreba_paliva?: string;
  emisni_norma?: string;
  datum_stk?: string;
  stk_platnost?: string;
}

// =============================================================================
// NORMALIZATION HELPERS
// =============================================================================

/**
 * Normalize SPZ (license plate) - remove spaces, uppercase
 */
function normalizeSpz(spz: string | undefined | null): string {
  if (!spz) return "";
  return spz.replace(/\s+/g, "").toUpperCase();
}

/**
 * Normalize VIN - remove spaces, uppercase, validate 17 chars
 */
function normalizeVin(vin: string | undefined | null): string {
  if (!vin) return "";
  const normalized = vin.replace(/\s+/g, "").toUpperCase();
  // VIN should be 17 characters, but we accept whatever comes
  return normalized;
}

/**
 * Normalize IČO - pad to 8 digits with leading zeros
 */
function normalizeIco(ico: string | undefined | null): string | undefined {
  if (!ico) return undefined;
  const digits = ico.replace(/\D/g, "");
  if (digits.length === 0) return undefined;
  return digits.padStart(8, "0");
}

/**
 * Normalize Rodné číslo - ensure format ######/#### or ##########
 */
function normalizeRodneCislo(rc: string | undefined | null): string {
  if (!rc) return "";
  const digits = rc.replace(/\D/g, "");
  if (digits.length >= 9 && digits.length <= 10) {
    return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  }
  return rc.trim();
}

/**
 * Normalize date - convert various formats to YYYY-MM-DD
 * Handles: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
 */
function normalizeDate(date: string | undefined | null): string {
  if (!date) return "";
  const trimmed = date.trim();

  // DD.MM.YYYY (Czech format)
  const czechPattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
  const czechMatch = trimmed.match(czechPattern);
  if (czechMatch) {
    const [, day, month, year] = czechMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD/MM/YYYY
  const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const slashMatch = trimmed.match(slashPattern);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Already YYYY-MM-DD
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (isoPattern.test(trimmed)) {
    return trimmed;
  }

  // Return as-is if no pattern matches
  return trimmed;
}

/**
 * Normalize text - uppercase, trim, normalize whitespace
 */
function normalizeText(text: string | undefined | null): string {
  if (!text) return "";
  return text.toUpperCase().trim().replace(/\s+/g, " ");
}

/**
 * Normalize optional text - return undefined if empty
 */
function normalizeOptionalText(
  text: string | undefined | null
): string | undefined {
  if (!text) return undefined;
  const normalized = text.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Normalize optional uppercase text
 */
function normalizeOptionalTextUpper(
  text: string | undefined | null
): string | undefined {
  const normalized = normalizeOptionalText(text);
  return normalized ? normalized.toUpperCase() : undefined;
}

/**
 * Normalize number - return undefined if not a valid number
 */
function normalizeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Normalize sex field - ensure M or F
 */
function normalizeSex(sex: string | undefined | null): "M" | "F" | string {
  if (!sex) return "";
  const upper = sex.toUpperCase().trim();
  if (upper === "M" || upper === "MUŽ" || upper === "MALE") return "M";
  if (upper === "F" || upper === "Ž" || upper === "ŽENA" || upper === "FEMALE")
    return "F";
  return upper;
}

// =============================================================================
// TRANSFORMERS
// =============================================================================

/**
 * Extract vendor data from ORV keeper information
 * Parses the keeper field to extract name, identifier, and vendor type
 */
function extractVendorDataFromORV(
  keeperName: string | null | undefined,
  keeperIdentifier: string | null | undefined
): {
  keeperVendorType: 'PHYSICAL_PERSON' | 'COMPANY';
  keeperPersonalId: string | null;
  keeperCompanyId: string | null;
  keeperIdentifierValid: boolean;
} {
  // First try to use the explicitly extracted keeperIdentifier
  let identifier = keeperIdentifier?.replace(/\D/g, '') || null;
  let name = keeperName || '';

  // If no explicit identifier, try parsing from keeperName format "NAME/IDENTIFIER"
  if (!identifier && keeperName) {
    const parsed = parseKeeperNameIdentifier(keeperName);
    if (parsed.identifier) {
      identifier = parsed.identifier;
      name = parsed.name;
    }
  }

  // Detect vendor type based on name patterns and identifier length
  const detection = detectVendorType(name, identifier);

  // Validate identifier based on detected type
  let personalId: string | null = null;
  let companyId: string | null = null;
  let identifierValid = false;

  if (identifier) {
    if (detection.vendorType === 'COMPANY') {
      const icoResult = validateIco(identifier);
      if (icoResult.valid) {
        companyId = icoResult.normalized;
        identifierValid = true;
      }
    } else {
      const rcResult = validateRodneCislo(identifier);
      if (rcResult.valid) {
        personalId = rcResult.normalized;
        identifierValid = true;
      }
    }
  }

  return {
    keeperVendorType: detection.vendorType,
    keeperPersonalId: personalId,
    keeperCompanyId: companyId,
    keeperIdentifierValid: identifierValid,
  };
}

/**
 * Transform raw ORV OCR data to normalized structure
 */
export function transformORVData(
  raw: Record<string, unknown>
): ORVExtractionResult {
  const keeperName = normalizeText(raw.keeperName as string);
  const keeperIdentifier = normalizeOptionalText(raw.keeperIdentifier as string);

  // Extract vendor data from keeper information
  const vendorData = extractVendorDataFromORV(keeperName, keeperIdentifier);

  return {
    registrationPlateNumber: normalizeSpz(raw.registrationPlateNumber as string),
    vin: normalizeVin(raw.vin as string),
    firstRegistrationDate: normalizeDate(raw.firstRegistrationDate as string),
    keeperName,
    keeperAddress: normalizeText(raw.keeperAddress as string),
    keeperIdentifier,
    // Vendor-related fields derived from keeper info
    keeperVendorType: vendorData.keeperVendorType,
    keeperPersonalId: vendorData.keeperPersonalId,
    keeperCompanyId: vendorData.keeperCompanyId,
    keeperIdentifierValid: vendorData.keeperIdentifierValid,
    make: normalizeOptionalText(raw.make as string),
    model: normalizeOptionalText(raw.model as string),
    makeTypeVariantVersion: normalizeOptionalText(
      raw.makeTypeVariantVersion as string
    ),
    fuelType: normalizeOptionalTextUpper(raw.fuelType as string),
    engineCcm: normalizeNumber(raw.engineCcm),
    maxPower: normalizeOptionalText(raw.maxPower as string),
    seats: normalizeNumber(raw.seats),
    color: normalizeOptionalTextUpper(raw.color as string),
    vehicleType: normalizeOptionalTextUpper(raw.vehicleType as string),
    maxSpeed: normalizeNumber(raw.maxSpeed),
    orvDocumentNumber: normalizeOptionalText(raw.orvDocumentNumber as string),
  };
}

/**
 * Transform raw OP OCR data to normalized structure
 */
export function transformOPData(
  raw: Record<string, unknown>
): OPExtractionResult {
  return {
    firstName: normalizeText(raw.firstName as string),
    lastName: normalizeText(raw.lastName as string),
    dateOfBirth: normalizeDate(raw.dateOfBirth as string),
    placeOfBirth: normalizeOptionalTextUpper(raw.placeOfBirth as string),
    nationality: normalizeOptionalTextUpper(raw.nationality as string),
    sex: normalizeSex(raw.sex as string),
    personalNumber: normalizeRodneCislo(raw.personalNumber as string),
    permanentStay: normalizeText(raw.permanentStay as string),
    issuingAuthority: normalizeOptionalTextUpper(raw.issuingAuthority as string),
    documentNumber: normalizeOptionalText(raw.documentNumber as string),
    dateOfIssue: normalizeDate(raw.dateOfIssue as string),
    dateOfExpiry: normalizeDate(raw.dateOfExpiry as string),
  };
}

/**
 * Transform raw VTP OCR data to normalized structure
 * CRITICAL: VTP contains owner IČO needed for ARES validation
 */
export function transformVTPData(
  raw: Record<string, unknown>
): VTPExtractionResult {
  return {
    // Basic Registration
    registrationPlateNumber: normalizeSpz(raw.registrationPlateNumber as string),
    firstRegistrationDate: normalizeDate(raw.firstRegistrationDate as string),
    firstRegistrationDateCZ: raw.firstRegistrationDateCZ
      ? normalizeDate(raw.firstRegistrationDateCZ as string)
      : undefined,
    vtpDocumentNumber: normalizeOptionalText(raw.vtpDocumentNumber as string),

    // Owner Info - CRITICAL for ARES
    ownerName: normalizeText(raw.ownerName as string),
    ownerIco: normalizeIco(raw.ownerIco as string),
    ownerAddress: normalizeText(raw.ownerAddress as string),

    // Vehicle Identity
    vin: normalizeVin(raw.vin as string),
    make: normalizeOptionalText(raw.make as string),
    type: normalizeOptionalText(raw.type as string),
    variant: normalizeOptionalText(raw.variant as string),
    version: normalizeOptionalText(raw.version as string),
    commercialName: normalizeOptionalText(raw.commercialName as string),
    manufacturer: normalizeOptionalText(raw.manufacturer as string),

    // Technical Specs
    vehicleCategory: normalizeOptionalText(raw.vehicleCategory as string),
    bodyType: normalizeOptionalText(raw.bodyType as string),
    vehicleType: normalizeOptionalTextUpper(raw.vehicleType as string),
    engineType: normalizeOptionalText(raw.engineType as string),
    color: normalizeOptionalTextUpper(raw.color as string),
    fuelType: normalizeOptionalTextUpper(raw.fuelType as string),
    engineCcm: normalizeNumber(raw.engineCcm),
    maxPowerKw: normalizeNumber(raw.maxPowerKw),
    maxPowerRpm: normalizeNumber(raw.maxPowerRpm),

    // Dimensions (mm)
    length: normalizeNumber(raw.length),
    width: normalizeNumber(raw.width),
    height: normalizeNumber(raw.height),
    wheelbase: normalizeNumber(raw.wheelbase),

    // Weights (kg)
    operatingWeight: normalizeNumber(raw.operatingWeight),
    maxPermittedWeight: normalizeNumber(raw.maxPermittedWeight),
    trailerWeightBraked: normalizeNumber(raw.trailerWeightBraked),
    trailerWeightUnbraked: normalizeNumber(raw.trailerWeightUnbraked),
    combinedWeight: normalizeNumber(raw.combinedWeight),

    // Performance
    maxSpeed: normalizeNumber(raw.maxSpeed),
    seats: normalizeNumber(raw.seats),
    standingPlaces: normalizeNumber(raw.standingPlaces),

    // Environmental
    co2Emissions: normalizeOptionalText(raw.co2Emissions as string),
    fuelConsumption: normalizeOptionalText(raw.fuelConsumption as string),
    emissionStandard: normalizeOptionalText(raw.emissionStandard as string),

    // Technical Inspection
    lastInspectionDate: raw.lastInspectionDate
      ? normalizeDate(raw.lastInspectionDate as string)
      : undefined,
    nextInspectionDue: raw.nextInspectionDue
      ? normalizeDate(raw.nextInspectionDue as string)
      : undefined,
  };
}

/**
 * Transform extracted data based on document type
 */
export function transformExtractedData(
  documentType: "ORV" | "OP" | "VTP",
  rawData: Record<string, unknown> | null
): ORVExtractionResult | OPExtractionResult | VTPExtractionResult | null {
  if (!rawData) return null;

  switch (documentType) {
    case "ORV":
      return transformORVData(rawData);
    case "OP":
      return transformOPData(rawData);
    case "VTP":
      return transformVTPData(rawData);
    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }
}

/**
 * Calculate extraction confidence based on required field completeness
 */
export function calculateConfidence(
  documentType: "ORV" | "OP" | "VTP",
  data: Record<string, unknown> | null
): number {
  if (!data) return 0;

  const requiredFields: Record<string, string[]> = {
    ORV: [
      "registrationPlateNumber",
      "vin",
      "firstRegistrationDate",
      "keeperName",
      "make",
      "model",
    ],
    OP: [
      "firstName",
      "lastName",
      "dateOfBirth",
      "personalNumber",
      "documentNumber",
    ],
    VTP: ["registrationPlateNumber", "vin", "ownerName", "make", "commercialName"],
  };

  const fields = requiredFields[documentType] || [];
  if (fields.length === 0) return 0;

  let filledCount = 0;
  for (const field of fields) {
    const value = data[field];
    if (value !== undefined && value !== null && value !== "") {
      filledCount++;
    }
  }

  return Math.round((filledCount / fields.length) * 100);
}

// =============================================================================
// VEHICLE DATA TRANSFORMERS (Phase 7)
// =============================================================================

/**
 * Extract power in kW from maxPower string
 * Handles formats like "228/5700" (kW/rpm) or just "228"
 */
function extractPowerKw(maxPower?: string | null): number | undefined {
  if (!maxPower) return undefined;
  const match = maxPower.match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : undefined;
}

/**
 * Transform ORV OCR extraction to vehicle data (extended)
 * Maps ORV fields to database column names
 */
export function transformORVToVehicle(orvData: ORVExtractionResult): VehicleDataExtended {
  return {
    // Core identification
    spz: orvData.registrationPlateNumber?.replace(/\s+/g, "").toUpperCase() || undefined,
    vin: orvData.vin?.replace(/\s+/g, "").toUpperCase() || undefined,
    znacka: orvData.make?.toUpperCase() || undefined,
    model: orvData.model?.toUpperCase() || undefined,
    datum_1_registrace: orvData.firstRegistrationDate
      ? normalizeDate(orvData.firstRegistrationDate)
      : undefined,
    majitel: orvData.keeperName?.toUpperCase() || undefined,
    vykon_kw: extractPowerKw(orvData.maxPower),

    // Phase 7.2: New OCR-extractable fields from ORV
    barva: orvData.color?.toUpperCase() || undefined,
    palivo: orvData.fuelType?.toUpperCase() || undefined,
    objem_motoru: orvData.engineCcm || undefined,
    pocet_mist: orvData.seats || undefined,
    max_rychlost: orvData.maxSpeed || undefined,
  };
}

/**
 * Transform VTP OCR extraction to vehicle data (extended)
 * Maps VTP fields to database column names
 * VTP contains more technical details than ORV
 */
export function transformVTPToVehicle(vtpData: VTPExtractionResult): VehicleDataExtended {
  // Determine if there's a re-registration (fraud detection)
  // If firstRegistrationDateCZ differs from firstRegistrationDate, it indicates re-registration
  let datumPosledniPreregistrace: string | undefined = undefined;
  if (vtpData.firstRegistrationDateCZ && vtpData.firstRegistrationDate) {
    const normalizedCZ = normalizeDate(vtpData.firstRegistrationDateCZ);
    const normalizedFirst = normalizeDate(vtpData.firstRegistrationDate);
    if (normalizedCZ && normalizedFirst && normalizedCZ !== normalizedFirst) {
      datumPosledniPreregistrace = normalizedCZ;
    }
  }

  return {
    // Core identification (same as ORV, for cross-validation)
    spz: vtpData.registrationPlateNumber?.replace(/\s+/g, "").toUpperCase() || undefined,
    vin: vtpData.vin?.replace(/\s+/g, "").toUpperCase() || undefined,
    znacka: vtpData.make?.toUpperCase() || undefined,
    model: vtpData.commercialName?.toUpperCase() || undefined,
    datum_1_registrace: vtpData.firstRegistrationDate
      ? normalizeDate(vtpData.firstRegistrationDate)
      : undefined,
    majitel: vtpData.ownerName?.toUpperCase() || undefined,
    vykon_kw: vtpData.maxPowerKw || undefined,

    // Phase 7.1: Fraud detection
    datum_posledni_preregistrace: datumPosledniPreregistrace,

    // Phase 7.2: OCR-extractable (also in ORV, VTP has priority for some)
    barva: vtpData.color?.toUpperCase() || undefined,
    palivo: vtpData.fuelType?.toUpperCase() || undefined,
    objem_motoru: vtpData.engineCcm || undefined,
    pocet_mist: vtpData.seats || undefined,
    max_rychlost: vtpData.maxSpeed || undefined,
    kategorie_vozidla: vtpData.vehicleCategory?.toUpperCase() || undefined,

    // Phase 7.3: Extended VTP-only fields
    karoserie: vtpData.bodyType?.toUpperCase() || undefined,
    cislo_motoru: vtpData.engineType?.toUpperCase() || undefined,
    provozni_hmotnost: vtpData.operatingWeight || undefined,
    povolena_hmotnost: vtpData.maxPermittedWeight || undefined,
    delka: vtpData.length || undefined,
    sirka: vtpData.width || undefined,
    vyska: vtpData.height || undefined,
    rozvor: vtpData.wheelbase || undefined,
    emise_co2: vtpData.co2Emissions || undefined,
    spotreba_paliva: vtpData.fuelConsumption || undefined,
    emisni_norma: vtpData.emissionStandard || undefined,
    datum_stk: vtpData.lastInspectionDate
      ? normalizeDate(vtpData.lastInspectionDate)
      : undefined,
    stk_platnost: vtpData.nextInspectionDue
      ? normalizeDate(vtpData.nextInspectionDue)
      : undefined,
  };
}

/**
 * Merge vehicle data from multiple OCR sources
 * Priority: VTP > ORV > Manual (for technical specs)
 *
 * VTP is considered the most authoritative source for technical
 * specifications since it's the official technical certificate.
 */
export function mergeVehicleData(
  orv?: VehicleDataExtended,
  vtp?: VehicleDataExtended,
  manual?: VehicleDataExtended
): VehicleDataExtended {
  // Start with manual data as base
  const merged: VehicleDataExtended = { ...manual };

  // Layer ORV data (overwrites manual for OCR-able fields)
  if (orv) {
    const keys = Object.keys(orv) as (keyof VehicleDataExtended)[];
    for (const key of keys) {
      const value = orv[key];
      if (value !== undefined && value !== null) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Layer VTP data (highest priority for technical specs)
  if (vtp) {
    const keys = Object.keys(vtp) as (keyof VehicleDataExtended)[];
    for (const key of keys) {
      const value = vtp[key];
      if (value !== undefined && value !== null) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  return merged;
}
