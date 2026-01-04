/**
 * Test script for Mistral OCR extraction - All Document Types
 *
 * Usage:
 *   deno run --allow-read --allow-net --allow-env test-all-documents.ts [document_type] [pdf_path]
 *
 * Examples:
 *   deno run --allow-read --allow-net --allow-env test-all-documents.ts ORV ../../../docs/Files\&PDFs/5L94454_ORV.pdf
 *   deno run --allow-read --allow-net --allow-env test-all-documents.ts OP ../../../docs/Files\&PDFs/5L94454_OP_Kusko.pdf
 *   deno run --allow-read --allow-net --allow-env test-all-documents.ts VTP ../../../docs/Files\&PDFs/5L94454_VTP.pdf
 *
 * Document Types:
 *   ORV - Vehicle Registration Certificate Part I (Osvědčení o registraci vozidla)
 *   OP  - Personal ID Card (Občanský průkaz)
 *   VTP - Technical Certificate Part II (Technický průkaz)
 */

import { ORV_EXTRACTION_SCHEMA } from "./schemas/orv-schema.ts";
import { OP_EXTRACTION_SCHEMA } from "./schemas/op-schema.ts";
import { VTP_EXTRACTION_SCHEMA } from "./schemas/vtp-schema.ts";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr";
const MISTRAL_MODEL = "mistral-ocr-latest";

type DocumentType = "ORV" | "OP" | "VTP";

const SCHEMAS: Record<DocumentType, { name: string; schema: Record<string, unknown> }> = {
  ORV: ORV_EXTRACTION_SCHEMA,
  OP: OP_EXTRACTION_SCHEMA,
  VTP: VTP_EXTRACTION_SCHEMA,
};

async function loadApiKey(): Promise<string> {
  // Try multiple .env locations
  const envPaths = [
    "../../../.env",
    "../../.env",
    "../.env",
    ".env",
  ];

  for (const envPath of envPaths) {
    try {
      const envContent = await Deno.readTextFile(envPath);
      const apiKeyMatch = envContent.match(/MISTRAL_API_KEY=(.+)/);
      if (apiKeyMatch?.[1]?.trim()) {
        console.log(`✅ API Key loaded from ${envPath}`);
        return apiKeyMatch[1].trim();
      }
    } catch {
      // Try next path
    }
  }

  // Also check environment variable
  const envKey = Deno.env.get("MISTRAL_API_KEY");
  if (envKey) {
    console.log("✅ API Key loaded from environment");
    return envKey;
  }

  throw new Error("❌ MISTRAL_API_KEY not found in any .env file or environment");
}

async function testExtraction(documentType: DocumentType, pdfPath: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`📋 TESTING ${documentType} EXTRACTION`);
  console.log("=".repeat(70));

  const apiKey = await loadApiKey();

  // Read the PDF file
  console.log(`\n📄 Reading PDF: ${pdfPath}`);

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await Deno.readFile(pdfPath);
  } catch (error) {
    console.error(`❌ Failed to read file: ${error}`);
    Deno.exit(1);
  }

  // Base64 encode (chunked to avoid stack overflow with large files)
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < pdfBytes.length; i += chunkSize) {
    const chunk = pdfBytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64Pdf = btoa(binary);
  console.log(`📊 PDF size: ${pdfBytes.length} bytes (${(pdfBytes.length / 1024).toFixed(1)} KB)`);

  // Get the schema for this document type
  const schema = SCHEMAS[documentType];
  console.log(`📋 Using schema: ${schema.name}`);

  // Build the request
  const dataUri = `data:application/pdf;base64,${base64Pdf}`;
  const requestBody = {
    model: MISTRAL_MODEL,
    document: {
      type: "document_url",
      document_url: dataUri,
    },
    include_image_base64: false,
    document_annotation_format: {
      type: "json_schema",
      json_schema: schema,
    },
  };

  console.log("\n🚀 Calling Mistral OCR API...\n");
  const startTime = Date.now();

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}: ${errorText}`);
      Deno.exit(1);
    }

    const result = await response.json();

    console.log(`✅ Success! (${duration}ms)\n`);

    // Display extracted data
    console.log("=".repeat(70));
    console.log("📦 EXTRACTED DATA (document_annotation):");
    console.log("=".repeat(70));
    console.log(JSON.stringify(result.document_annotation, null, 2));

    // Display usage info
    console.log("\n" + "=".repeat(70));
    console.log("📈 USAGE INFO:");
    console.log("=".repeat(70));
    console.log(`Pages processed: ${result.usage_info?.pages_processed}`);
    console.log(`Document size: ${result.usage_info?.doc_size_bytes} bytes`);

    // Display raw markdown (truncated)
    console.log("\n" + "=".repeat(70));
    console.log("📝 RAW MARKDOWN (first 2000 chars):");
    console.log("=".repeat(70));
    const markdown =
      result.pages?.map((p: { markdown: string | null }) => p.markdown).join("\n---PAGE BREAK---\n") || "";
    console.log(markdown.substring(0, 2000) + (markdown.length > 2000 ? "\n\n... [truncated]" : ""));

    // Summary of extracted fields
    console.log("\n" + "=".repeat(70));
    console.log("📊 FIELD SUMMARY:");
    console.log("=".repeat(70));
    if (result.document_annotation) {
      const fields = Object.entries(result.document_annotation);
      const filled = fields.filter(([_, v]) => v !== null && v !== "");
      const empty = fields.filter(([_, v]) => v === null || v === "");

      console.log(`\n✅ Filled fields (${filled.length}):`);
      filled.forEach(([k, v]) => console.log(`   ${k}: ${JSON.stringify(v)}`));

      console.log(`\n⚠️  Empty/null fields (${empty.length}):`);
      empty.forEach(([k]) => console.log(`   ${k}`));

      console.log(`\nConfidence estimate: ${Math.round((filled.length / fields.length) * 100)}%`);
    }

    // Save full result to file
    const outputPath = `./test-output-${documentType}-${Date.now()}.json`;
    await Deno.writeTextFile(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full result saved to: ${outputPath}`);

  } catch (error) {
    console.error(`❌ Error: ${error}`);
    Deno.exit(1);
  }
}

// Parse command line arguments
const args = Deno.args;

if (args.length < 2) {
  console.log(`
Usage: deno run --allow-read --allow-net --allow-env test-all-documents.ts <document_type> <pdf_path>

Document Types:
  ORV - Vehicle Registration Certificate Part I
  OP  - Personal ID Card
  VTP - Technical Certificate Part II

Examples:
  deno run --allow-read --allow-net --allow-env test-all-documents.ts ORV "../../../docs/Files&PDFs/5L94454_ORV.pdf"
  deno run --allow-read --allow-net --allow-env test-all-documents.ts OP "../../../docs/Files&PDFs/5L94454_OP_Kusko.pdf"
  deno run --allow-read --allow-net --allow-env test-all-documents.ts VTP "../../../docs/Files&PDFs/5L94454_VTP.pdf"
`);
  Deno.exit(1);
}

const documentType = args[0].toUpperCase() as DocumentType;
const pdfPath = args[1];

if (!SCHEMAS[documentType]) {
  console.error(`❌ Unknown document type: ${args[0]}`);
  console.error(`   Valid types: ORV, OP, VTP`);
  Deno.exit(1);
}

await testExtraction(documentType, pdfPath);
