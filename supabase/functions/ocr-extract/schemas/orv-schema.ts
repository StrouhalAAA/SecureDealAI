/**
 * JSON Schema for ORV (Osvědčení o registraci vozidla - Část I)
 * Vehicle Registration Certificate Part I
 *
 * Used with Mistral OCR API's document_annotation_format for structured extraction.
 */

export const ORV_EXTRACTION_SCHEMA = {
  name: "ORV_EXTRACTION",
  schema: {
    type: "object",
    properties: {
      // Core Vehicle Identification
      registrationPlateNumber: {
        type: "string",
        description: "A. REGISTRAČNÍ ZNAČKA - Vehicle license plate number (e.g., '5L94454')"
      },
      vin: {
        type: "string",
        description: "E. IDENTIFIKAČNÍ ČÍSLO (VIN) - 17-character Vehicle Identification Number"
      },
      firstRegistrationDate: {
        type: "string",
        description: "B. DATUM PRVNÍ REGISTRACE - First registration date in format DD.MM.YYYY"
      },

      // Keeper/Operator Info
      keeperName: {
        type: "string",
        description: "C.1.1./C.1.2. PROVOZOVATEL - Name of the vehicle keeper/operator (person or company). Format may be 'NAME/IDENTIFIER' where identifier is Rodné číslo (8-10 digits) for physical person or IČO (8 digits) for company"
      },
      keeperAddress: {
        type: "string",
        description: "C.1.3. ADRESA POBYTU/SÍDLO - Address of the keeper (street, city, postal code)"
      },
      keeperIdentifier: {
        type: "string",
        description: "C.1.1./C.1.2. PROVOZOVATEL - The identifier after '/' in the keeper field. Rodné číslo (8-10 digits) for physical person (FO) or IČO (8 digits) for company (PO)"
      },

      // Vehicle Specifications
      make: {
        type: "string",
        description: "D.1. TOVÁRNÍ ZNAČKA - Vehicle manufacturer/brand (e.g., 'VOLVO', 'ŠKODA')"
      },
      model: {
        type: "string",
        description: "D.3. OBCHODNÍ OZNAČENÍ - Commercial model name (e.g., 'V90 CROSS COUNTRY')"
      },
      makeTypeVariantVersion: {
        type: "string",
        description: "D.1. + D.2. TYP, VARIANTA, VERZE - Combined type/variant/version code"
      },

      // Technical Specs
      fuelType: {
        type: "string",
        description: "P.3. PALIVO - Fuel type code (BA=benzín, NM=nafta, EL=elektro)"
      },
      engineCcm: {
        type: "number",
        description: "P.1. ZDVIHOVÝ OBJEM [cm³] - Engine displacement in cubic centimeters"
      },
      maxPower: {
        type: "string",
        description: "P.2. MAX. VÝKON [kW] / OT. - Maximum power in kW and RPM (e.g., '228/5700')"
      },
      seats: {
        type: "number",
        description: "S.1. POČET MÍST K SEZENÍ - Number of seats"
      },
      color: {
        type: "string",
        description: "R. BARVA - Vehicle color in Czech (e.g., 'MODRÁ', 'ČERNÁ')"
      },
      vehicleType: {
        type: "string",
        description: "J. DRUH VOZIDLA - Vehicle type (e.g., 'OSOBNÍ AUTOMOBIL')"
      },
      maxSpeed: {
        type: "number",
        description: "T. NEJVYŠŠÍ RYCHLOST [km/h] - Maximum speed in km/h"
      },

      // Document Info
      orvDocumentNumber: {
        type: "string",
        description: "Document serial number printed on the certificate (e.g., 'UAY 257818')"
      }
    },
    required: [
      "registrationPlateNumber",
      "vin",
      "firstRegistrationDate",
      "keeperName",
      "make",
      "model"
    ]
  }
} as const;

export type ORVExtractionResult = {
  registrationPlateNumber?: string;
  vin?: string;
  firstRegistrationDate?: string;
  keeperName?: string;
  keeperParsedName?: string;
  keeperAddress?: string;
  keeperIdentifier?: string;
  // Derived vendor fields (added by transformer)
  keeperVendorType?: 'PHYSICAL_PERSON' | 'COMPANY';
  keeperPersonalId?: string | null;
  keeperCompanyId?: string | null;
  keeperIdentifierValid?: boolean;
  make?: string;
  model?: string;
  makeTypeVariantVersion?: string;
  fuelType?: string;
  engineCcm?: number;
  maxPower?: string;
  seats?: number;
  color?: string;
  vehicleType?: string;
  maxSpeed?: number;
  orvDocumentNumber?: string;
};
