/**
 * Document Extraction Schemas for Mistral OCR API
 *
 * These JSON Schemas are used with Mistral's document_annotation_format
 * to extract structured data from Czech documents.
 *
 * Supported document types:
 * - ORV: Vehicle Registration Certificate Part I (Osvědčení o registraci vozidla)
 * - OP:  Personal ID Card (Občanský průkaz)
 * - VTP: Technical Certificate Part II (Technický průkaz)
 */

export { ORV_EXTRACTION_SCHEMA, type ORVExtractionResult } from "./orv-schema.ts";
export { OP_EXTRACTION_SCHEMA, type OPExtractionResult } from "./op-schema.ts";
export { VTP_EXTRACTION_SCHEMA, type VTPExtractionResult } from "./vtp-schema.ts";

import { ORV_EXTRACTION_SCHEMA } from "./orv-schema.ts";
import { OP_EXTRACTION_SCHEMA } from "./op-schema.ts";
import { VTP_EXTRACTION_SCHEMA } from "./vtp-schema.ts";

export type DocumentType = "ORV" | "OP" | "VTP";

/**
 * Get the extraction schema for a specific document type.
 * Used when making Mistral OCR API requests.
 *
 * @param documentType - The type of document (ORV, OP, or VTP)
 * @returns The JSON schema object for document_annotation_format
 */
export function getExtractionSchema(documentType: DocumentType): {
  name: string;
  schema: Record<string, unknown>;
} {
  switch (documentType) {
    case "ORV":
      return ORV_EXTRACTION_SCHEMA;
    case "OP":
      return OP_EXTRACTION_SCHEMA;
    case "VTP":
      return VTP_EXTRACTION_SCHEMA;
    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }
}

/**
 * Build the document_annotation_format object for Mistral API request.
 *
 * @param documentType - The type of document to extract
 * @returns The complete document_annotation_format object
 */
export function buildAnnotationFormat(documentType: DocumentType): {
  type: "json_schema";
  json_schema: {
    name: string;
    schema: Record<string, unknown>;
  };
} {
  const schema = getExtractionSchema(documentType);
  return {
    type: "json_schema",
    json_schema: schema,
  };
}

/**
 * Schema metadata for reference
 */
export const SCHEMA_METADATA = {
  ORV: {
    name: "Vehicle Registration Certificate Part I",
    czechName: "Osvědčení o registraci vozidla - Část I",
    requiredFields: ["registrationPlateNumber", "vin", "firstRegistrationDate", "keeperName", "make", "model"],
    criticalFields: ["vin", "registrationPlateNumber"],
  },
  OP: {
    name: "Personal ID Card",
    czechName: "Občanský průkaz",
    requiredFields: ["firstName", "lastName", "dateOfBirth", "personalNumber", "documentNumber"],
    criticalFields: ["personalNumber", "documentNumber"],
    notes: "Two-sided document: front has personal info, back has permanent address and rodné číslo",
  },
  VTP: {
    name: "Technical Certificate Part II",
    czechName: "Technický průkaz - Část II",
    requiredFields: ["registrationPlateNumber", "vin", "ownerName", "make", "commercialName"],
    criticalFields: ["ownerIco", "vin"],
    notes: "CRITICAL: Contains owner IČO required for ARES company validation",
  },
} as const;
