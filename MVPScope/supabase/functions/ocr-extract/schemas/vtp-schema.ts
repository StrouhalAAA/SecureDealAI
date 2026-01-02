/**
 * JSON Schema for VTP (Technický průkaz - Část II)
 * Vehicle Technical Certificate Part II
 *
 * Used with Mistral OCR API's document_annotation_format for structured extraction.
 *
 * CRITICAL: VTP contains the owner's IČO (company ID) which is essential for ARES
 * company validation. This is different from the ORV keeper information.
 *
 * Note: VTP is a multi-page document:
 * - Page 1: Registration and owner info
 * - Page 3 (TECHNICKÝ POPIS VOZIDLA): Detailed technical specifications
 */

export const VTP_EXTRACTION_SCHEMA = {
  name: "VTP_EXTRACTION",
  schema: {
    type: "object",
    properties: {
      // === Basic Registration ===
      registrationPlateNumber: {
        type: "string",
        description: "A. Registrační značka vozidla - Vehicle license plate number"
      },
      firstRegistrationDate: {
        type: "string",
        description: "B. Datum první registrace vozidla - First registration date in format DD.MM.YYYY"
      },
      firstRegistrationDateCZ: {
        type: "string",
        description: "Datum první registrace v ČR - First registration date in Czech Republic"
      },
      vtpDocumentNumber: {
        type: "string",
        description: "Document serial number (e.g., 'UJ 41A767')"
      },

      // === Owner Info - CRITICAL for ARES validation ===
      ownerName: {
        type: "string",
        description: "C.2.1./C.2.2. Vlastník - Owner name (person or company name)"
      },
      ownerIco: {
        type: "string",
        description: "RČ/IČ - Company ID number (IČO) for ARES validation, 8 digits. CRITICAL for company verification."
      },
      ownerAddress: {
        type: "string",
        description: "C.2.3. Adresa pobytu/sídlo - Owner's address (street, city, postal code)"
      },

      // === Vehicle Identity ===
      vin: {
        type: "string",
        description: "E. Identifikační číslo vozidla (VIN) - 17-character Vehicle Identification Number"
      },
      make: {
        type: "string",
        description: "D.1. Tovární značka - Vehicle manufacturer/brand"
      },
      type: {
        type: "string",
        description: "D.2. Typ - Vehicle type code"
      },
      variant: {
        type: "string",
        description: "Varianta - Vehicle variant code"
      },
      version: {
        type: "string",
        description: "Verze - Vehicle version code"
      },
      commercialName: {
        type: "string",
        description: "D.3. Obchodní označení - Commercial model name"
      },
      manufacturer: {
        type: "string",
        description: "3. Výrobce vozidla - Full manufacturer name and location"
      },

      // === Technical Specs ===
      vehicleCategory: {
        type: "string",
        description: "J. Kategorie vozidla - Vehicle category code (e.g., 'M1' for passenger car)"
      },
      bodyType: {
        type: "string",
        description: "2. Karoserie - Body type (e.g., 'AC KOMBI', 'AB SEDAN')"
      },
      vehicleType: {
        type: "string",
        description: "J. Druh vozidla - Vehicle type description (e.g., 'OSOBNÍ AUTOMOBIL')"
      },
      engineType: {
        type: "string",
        description: "5. Typ motoru - Engine type code"
      },
      color: {
        type: "string",
        description: "R. Barva - Vehicle color in Czech"
      },
      fuelType: {
        type: "string",
        description: "P.3. Palivo - Fuel type code (BA, NM, EL, etc.)"
      },
      engineCcm: {
        type: "number",
        description: "P.1. Zdvih. objem [cm³] - Engine displacement in cubic centimeters"
      },
      maxPowerKw: {
        type: "number",
        description: "P.2. Max. výkon [kW] - Maximum power in kilowatts"
      },
      maxPowerRpm: {
        type: "number",
        description: "P.4. ot. [min⁻¹] - RPM at maximum power"
      },

      // === Dimensions (mm) ===
      length: {
        type: "number",
        description: "12. Celková délka - Total length in millimeters"
      },
      width: {
        type: "number",
        description: "13. Celková šířka - Total width in millimeters"
      },
      height: {
        type: "number",
        description: "14. Celková výška - Total height in millimeters"
      },
      wheelbase: {
        type: "number",
        description: "M. Rozvor - Wheelbase in millimeters"
      },

      // === Weights (kg) ===
      operatingWeight: {
        type: "number",
        description: "G. Provozní hmotnost - Operating weight in kilograms"
      },
      maxPermittedWeight: {
        type: "number",
        description: "F.2. Povolená hmotnost - Maximum permitted weight in kilograms"
      },
      trailerWeightBraked: {
        type: "number",
        description: "O.1. Hmotnost přívěsu brzděného - Braked trailer weight in kg"
      },
      trailerWeightUnbraked: {
        type: "number",
        description: "O.2. Hmotnost přívěsu nebrzděného - Unbraked trailer weight in kg"
      },
      combinedWeight: {
        type: "number",
        description: "F.3. Hmotnost soupravy - Combined weight (vehicle + trailer) in kg"
      },

      // === Performance ===
      maxSpeed: {
        type: "number",
        description: "T. Nejvyšší rychlost [km/h] - Maximum speed in km/h"
      },
      seats: {
        type: "number",
        description: "S.1. Počet míst k sezení - Number of seats"
      },
      standingPlaces: {
        type: "number",
        description: "S.2. Počet míst k stání - Number of standing places"
      },

      // === Environmental ===
      co2Emissions: {
        type: "string",
        description: "V.7 CO₂ [g/km] - CO2 emissions (may be multiple values like '232/155/183')"
      },
      fuelConsumption: {
        type: "string",
        description: "25. Spotřeba paliva - Fuel consumption (may be multiple values like '10.0/6.7/7.9')"
      },
      emissionStandard: {
        type: "string",
        description: "Předpis EHS/ES/EU - Emission standard reference"
      },

      // === Technical Inspection ===
      lastInspectionDate: {
        type: "string",
        description: "OSVĚDČENÍ O TECHNICKÉ ZPŮSOBILOSTI - Last inspection date in format DD.MM.YYYY"
      },
      nextInspectionDue: {
        type: "string",
        description: "Platí do - Next inspection due date in format DD.MM.YYYY"
      }
    },
    required: [
      "registrationPlateNumber",
      "vin",
      "ownerName",
      "make",
      "commercialName"
    ]
  }
} as const;

export type VTPExtractionResult = {
  // Basic Registration
  registrationPlateNumber?: string;
  firstRegistrationDate?: string;
  firstRegistrationDateCZ?: string;
  vtpDocumentNumber?: string;

  // Owner Info
  ownerName?: string;
  ownerIco?: string;
  ownerAddress?: string;

  // Vehicle Identity
  vin?: string;
  make?: string;
  type?: string;
  variant?: string;
  version?: string;
  commercialName?: string;
  manufacturer?: string;

  // Technical Specs
  vehicleCategory?: string;
  bodyType?: string;
  vehicleType?: string;
  engineType?: string;
  color?: string;
  fuelType?: string;
  engineCcm?: number;
  maxPowerKw?: number;
  maxPowerRpm?: number;

  // Dimensions
  length?: number;
  width?: number;
  height?: number;
  wheelbase?: number;

  // Weights
  operatingWeight?: number;
  maxPermittedWeight?: number;
  trailerWeightBraked?: number;
  trailerWeightUnbraked?: number;
  combinedWeight?: number;

  // Performance
  maxSpeed?: number;
  seats?: number;
  standingPlaces?: number;

  // Environmental
  co2Emissions?: string;
  fuelConsumption?: string;
  emissionStandard?: string;

  // Technical Inspection
  lastInspectionDate?: string;
  nextInspectionDue?: string;
};
