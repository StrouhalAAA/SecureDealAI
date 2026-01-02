/**
 * Test script for Mistral OCR extraction (Node.js)
 *
 * Usage:
 *   node test-mistral-ocr.mjs        # Test ORV (default)
 *   node test-mistral-ocr.mjs ORV    # Test ORV
 *   node test-mistral-ocr.mjs OP     # Test OP
 *   node test-mistral-ocr.mjs VTP    # Test VTP
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr";
const MISTRAL_MODEL = "mistral-ocr-latest";

// Get document type from command line argument
const DOC_TYPE = process.argv[2]?.toUpperCase() || "ORV";

// Document paths
const DOC_PATHS = {
  ORV: 'Mistral/5L94454_ORV.pdf',
  OP: 'Mistral/5L94454_OP_Kusko.pdf',
  VTP: 'Mistral/5L94454_VTP.pdf'
};

// ORV Schema
const ORV_EXTRACTION_SCHEMA = {
  name: "ORV_EXTRACTION",
  schema: {
    type: "object",
    properties: {
      registrationPlateNumber: {
        type: "string",
        description: "A. REGISTRAČNÍ ZNAČKA - Vehicle license plate number"
      },
      vin: {
        type: "string",
        description: "E. IDENTIFIKAČNÍ ČÍSLO (VIN) - 17-character Vehicle Identification Number"
      },
      firstRegistrationDate: {
        type: "string",
        description: "B. DATUM PRVNÍ REGISTRACE - First registration date in format DD.MM.YYYY"
      },
      keeperName: {
        type: "string",
        description: "C.1.1./C.1.2. PROVOZOVATEL - Name of the vehicle keeper/operator"
      },
      keeperAddress: {
        type: "string",
        description: "C.1.3. ADRESA POBYTU/SÍDLO - Address of the keeper"
      },
      make: {
        type: "string",
        description: "D.1. TOVÁRNÍ ZNAČKA - Vehicle manufacturer/brand"
      },
      model: {
        type: "string",
        description: "D.3. OBCHODNÍ OZNAČENÍ - Commercial model name"
      },
      fuelType: {
        type: "string",
        description: "P.3. PALIVO - Fuel type code"
      },
      engineCcm: {
        type: "number",
        description: "P.1. ZDVIHOVÝ OBJEM [cm³] - Engine displacement"
      },
      maxPower: {
        type: "string",
        description: "P.2. MAX. VÝKON [kW] / OT. - Maximum power"
      },
      seats: {
        type: "number",
        description: "S.1. POČET MÍST K SEZENÍ - Number of seats"
      },
      color: {
        type: "string",
        description: "R. BARVA - Vehicle color"
      },
      vehicleType: {
        type: "string",
        description: "J. DRUH VOZIDLA - Vehicle type"
      },
      maxSpeed: {
        type: "number",
        description: "T. NEJVYŠŠÍ RYCHLOST [km/h] - Maximum speed"
      }
    },
    required: ["registrationPlateNumber", "vin", "firstRegistrationDate", "keeperName", "make", "model"]
  }
};

// OP Schema (Občanský průkaz - Personal ID Card)
const OP_EXTRACTION_SCHEMA = {
  name: "OP_EXTRACTION",
  schema: {
    type: "object",
    properties: {
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
        description: "STÁTNÍ OBČANSTVÍ / NATIONALITY - Citizenship"
      },
      sex: {
        type: "string",
        description: "POHLAVÍ / SEX - Gender, either 'M' (male) or 'F' (female)"
      },
      personalNumber: {
        type: "string",
        description: "RODNÉ ČÍSLO / PERSONAL NO. - Czech birth number in format ######/####"
      },
      permanentStay: {
        type: "string",
        description: "TRVALÝ POBYT / PERMANENT STAY - Full permanent address"
      },
      issuingAuthority: {
        type: "string",
        description: "VYDAL / AUTHORITY - Issuing authority name"
      },
      documentNumber: {
        type: "string",
        description: "ČÍSLO DOKLADU / DOCUMENT NO. - ID card number"
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
    required: ["firstName", "lastName", "dateOfBirth", "sex", "personalNumber", "documentNumber"]
  }
};

// VTP Schema (Technický průkaz - Technical Certificate Part II)
const VTP_EXTRACTION_SCHEMA = {
  name: "VTP_EXTRACTION",
  schema: {
    type: "object",
    properties: {
      registrationPlateNumber: {
        type: "string",
        description: "A. Registrační značka vozidla - Vehicle license plate number"
      },
      firstRegistrationDate: {
        type: "string",
        description: "B. Datum první registrace vozidla - First registration date in format DD.MM.YYYY"
      },
      vtpDocumentNumber: {
        type: "string",
        description: "Document serial number (e.g., 'UJ 41A767')"
      },
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
        description: "C.2.3. Adresa pobytu/sídlo - Owner's address"
      },
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
      vehicleCategory: {
        type: "string",
        description: "J. Kategorie vozidla - Vehicle category code (e.g., 'M1')"
      },
      bodyType: {
        type: "string",
        description: "2. Karoserie - Body type"
      },
      vehicleType: {
        type: "string",
        description: "J. Druh vozidla - Vehicle type description"
      },
      color: {
        type: "string",
        description: "R. Barva - Vehicle color in Czech"
      },
      fuelType: {
        type: "string",
        description: "P.3. Palivo - Fuel type code"
      },
      engineCcm: {
        type: "number",
        description: "P.1. Zdvih. objem [cm³] - Engine displacement"
      },
      maxPowerKw: {
        type: "number",
        description: "P.2. Max. výkon [kW] - Maximum power in kilowatts"
      },
      operatingWeight: {
        type: "number",
        description: "G. Provozní hmotnost - Operating weight in kilograms"
      },
      maxPermittedWeight: {
        type: "number",
        description: "F.2. Povolená hmotnost - Maximum permitted weight"
      },
      maxSpeed: {
        type: "number",
        description: "T. Nejvyšší rychlost [km/h] - Maximum speed"
      },
      seats: {
        type: "number",
        description: "S.1. Počet míst k sezení - Number of seats"
      },
      lastInspectionDate: {
        type: "string",
        description: "OSVĚDČENÍ O TECHNICKÉ ZPŮSOBILOSTI - Last inspection date"
      },
      nextInspectionDue: {
        type: "string",
        description: "Platí do - Next inspection due date"
      }
    },
    required: ["registrationPlateNumber", "vin", "ownerName", "make", "commercialName"]
  }
};

// Schema map
const SCHEMAS = {
  ORV: ORV_EXTRACTION_SCHEMA,
  OP: OP_EXTRACTION_SCHEMA,
  VTP: VTP_EXTRACTION_SCHEMA
};

async function testExtraction() {
  // Validate document type
  if (!DOC_PATHS[DOC_TYPE] || !SCHEMAS[DOC_TYPE]) {
    console.error(`❌ Unknown document type: ${DOC_TYPE}`);
    console.error("   Valid types: ORV, OP, VTP");
    process.exit(1);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`TESTING: ${DOC_TYPE} Document Extraction`);
  console.log(`${"=".repeat(60)}\n`);

  // Load API key from .env (parent directory)
  const envPath = resolve(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const apiKeyMatch = envContent.match(/MISTRAL_API_KEY=(.+)/);
  const apiKey = apiKeyMatch?.[1]?.trim();

  if (!apiKey) {
    console.error("❌ MISTRAL_API_KEY not found in .env");
    process.exit(1);
  }

  console.log("✅ API Key loaded");

  // Read the PDF file
  const pdfPath = resolve(__dirname, DOC_PATHS[DOC_TYPE]);
  console.log(`📄 Reading PDF: ${pdfPath}`);

  const pdfBytes = readFileSync(pdfPath);
  const base64Pdf = pdfBytes.toString('base64');

  console.log(`📊 PDF size: ${pdfBytes.length} bytes`);

  // Build the request - use document_url with data URI for base64 PDF
  const dataUri = `data:application/pdf;base64,${base64Pdf}`;
  const schema = SCHEMAS[DOC_TYPE];
  const requestBody = {
    model: MISTRAL_MODEL,
    document: {
      type: "document_url",
      document_url: dataUri
    },
    include_image_base64: false,
    document_annotation_format: {
      type: "json_schema",
      json_schema: schema
    }
  };

  console.log("\n🚀 Calling Mistral OCR API...\n");

  const startTime = Date.now();

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}: ${errorText}`);
      process.exit(1);
    }

    const result = await response.json();

    console.log(`✅ Success! (${duration}ms)\n`);
    console.log("=".repeat(60));
    console.log("EXTRACTED DATA (document_annotation):");
    console.log("=".repeat(60));
    console.log(JSON.stringify(result.document_annotation, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("USAGE INFO:");
    console.log("=".repeat(60));
    console.log(`Pages processed: ${result.usage_info?.pages_processed}`);
    console.log(`Document size: ${result.usage_info?.doc_size_bytes} bytes`);

    console.log("\n" + "=".repeat(60));
    console.log("RAW MARKDOWN (first 1500 chars):");
    console.log("=".repeat(60));
    const markdown = result.pages?.map((p) => p.markdown).join("\n---\n") || "";
    console.log(markdown.substring(0, 1500) + (markdown.length > 1500 ? "\n..." : ""));

  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

testExtraction();
