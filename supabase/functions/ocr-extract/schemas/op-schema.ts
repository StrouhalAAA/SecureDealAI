/**
 * JSON Schema for OP (Občanský průkaz)
 * Czech Personal ID Card
 *
 * Used with Mistral OCR API's document_annotation_format for structured extraction.
 * Note: OP has two sides - front contains personal info, back contains permanent stay,
 * rodné číslo (personal number), and issuing authority.
 */

export const OP_EXTRACTION_SCHEMA = {
  name: "OP_EXTRACTION",
  schema: {
    type: "object",
    properties: {
      // Front Side - Personal Identity
      firstName: {
        type: "string",
        description: "JMÉNO / GIVEN NAMES - First name(s) of the person"
      },
      lastName: {
        type: "string",
        description: "PŘÍJMENÍ / SURNAME - Last name/surname of the person"
      },
      dateOfBirth: {
        type: "string",
        description: "DATUM NAROZENÍ / DATE OF BIRTH - Birth date in format DD.MM.YYYY"
      },
      placeOfBirth: {
        type: "string",
        description: "MÍSTO NAROZENÍ / PLACE OF BIRTH - City and district of birth"
      },
      nationality: {
        type: "string",
        description: "STÁTNÍ OBČANSTVÍ / NATIONALITY - Citizenship (e.g., 'ČESKÁ REPUBLIKA')"
      },
      sex: {
        type: "string",
        description: "POHLAVÍ / SEX - Gender, either 'M' (male) or 'F' (female)"
      },

      // Back Side - Additional Info
      personalNumber: {
        type: "string",
        description: "RODNÉ ČÍSLO / PERSONAL NO. - Czech birth number in format ######/#### (e.g., '800415/2585')"
      },
      permanentStay: {
        type: "string",
        description: "TRVALÝ POBYT / PERMANENT STAY - Full permanent address including street, city, district"
      },
      issuingAuthority: {
        type: "string",
        description: "VYDAL / AUTHORITY - Issuing authority name (e.g., 'Magistrát města LIBEREC')"
      },

      // Document Information
      documentNumber: {
        type: "string",
        description: "ČÍSLO DOKLADU / DOCUMENT NO. - ID card number (e.g., '217215163')"
      },
      dateOfIssue: {
        type: "string",
        description: "DATUM VYDÁNÍ / DATE OF ISSUE - Issue date in format DD.MM.YYYY"
      },
      dateOfExpiry: {
        type: "string",
        description: "PLATNOST DO / DATE OF EXPIRY - Expiry date in format DD.MM.YYYY"
      }
    },
    required: [
      "firstName",
      "lastName",
      "dateOfBirth",
      "sex",
      "personalNumber",
      "permanentStay",
      "documentNumber",
      "dateOfIssue",
      "dateOfExpiry"
    ]
  }
} as const;

export type OPExtractionResult = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  sex?: string;
  personalNumber?: string;
  permanentStay?: string;
  issuingAuthority?: string;
  documentNumber?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
};
