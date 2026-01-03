/**
 * Data Transformer for OCR Extraction
 *
 * Transforms and normalizes raw OCR data into structured formats.
 * Handles Czech document conventions (date formats, rodné číslo, IČO, etc.)
 */

import type { ORVExtractionResult } from "./schemas/orv-schema.ts";
import type { OPExtractionResult } from "./schemas/op-schema.ts";
import type { VTPExtractionResult } from "./schemas/vtp-schema.ts";

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
 * Transform raw ORV OCR data to normalized structure
 */
export function transformORVData(
  raw: Record<string, unknown>
): ORVExtractionResult {
  return {
    registrationPlateNumber: normalizeSpz(raw.registrationPlateNumber as string),
    vin: normalizeVin(raw.vin as string),
    firstRegistrationDate: normalizeDate(raw.firstRegistrationDate as string),
    keeperName: normalizeText(raw.keeperName as string),
    keeperAddress: normalizeText(raw.keeperAddress as string),
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
