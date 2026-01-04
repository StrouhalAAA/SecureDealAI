/**
 * Test script for Mistral OCR extraction
 *
 * Usage: deno run --allow-read --allow-net --allow-env test-extraction.ts
 */

import { ORV_EXTRACTION_SCHEMA } from "./schemas/orv-schema.ts";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr";
const MISTRAL_MODEL = "mistral-ocr-latest";

async function testORVExtraction() {
  // Load API key from .env file
  const envContent = await Deno.readTextFile("../../../.env");
  const apiKeyMatch = envContent.match(/MISTRAL_API_KEY=(.+)/);
  const apiKey = apiKeyMatch?.[1]?.trim();

  if (!apiKey) {
    console.error("❌ MISTRAL_API_KEY not found in .env");
    Deno.exit(1);
  }

  console.log("✅ API Key loaded");

  // Read the ORV PDF file
  const pdfPath = "../../Mistral/5L94454_ORV.pdf";
  console.log(`📄 Reading PDF: ${pdfPath}`);

  const pdfBytes = await Deno.readFile(pdfPath);
  const base64Pdf = btoa(String.fromCharCode(...pdfBytes));

  console.log(`📊 PDF size: ${pdfBytes.length} bytes`);

  // Build the request - use document_url with data URI for base64 PDF
  const dataUri = `data:application/pdf;base64,${base64Pdf}`;
  const requestBody = {
    model: MISTRAL_MODEL,
    document: {
      type: "document_url",
      document_url: dataUri
    },
    include_image_base64: false,
    document_annotation_format: {
      type: "json_schema",
      json_schema: ORV_EXTRACTION_SCHEMA
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
      Deno.exit(1);
    }

    const result = await response.json();

    console.log(`✅ Success! (${duration}ms)\n`);
    console.log("=" .repeat(60));
    console.log("EXTRACTED DATA (document_annotation):");
    console.log("=" .repeat(60));
    console.log(JSON.stringify(result.document_annotation, null, 2));

    console.log("\n" + "=" .repeat(60));
    console.log("USAGE INFO:");
    console.log("=" .repeat(60));
    console.log(`Pages processed: ${result.usage_info?.pages_processed}`);
    console.log(`Document size: ${result.usage_info?.doc_size_bytes} bytes`);

    console.log("\n" + "=" .repeat(60));
    console.log("RAW MARKDOWN (first 1000 chars):");
    console.log("=" .repeat(60));
    const markdown = result.pages?.map((p: any) => p.markdown).join("\n---\n") || "";
    console.log(markdown.substring(0, 1000) + (markdown.length > 1000 ? "..." : ""));

  } catch (error) {
    console.error(`❌ Error: ${error}`);
    Deno.exit(1);
  }
}

testORVExtraction();
