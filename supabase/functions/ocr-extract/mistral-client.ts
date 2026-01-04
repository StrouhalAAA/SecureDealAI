/**
 * Mistral OCR API Client
 *
 * Handles communication with Mistral's OCR API for document extraction.
 * Uses JSON Schema extraction via document_annotation_format for structured output.
 */

import { buildAnnotationFormat, type DocumentType } from "./schemas/index.ts";

// =============================================================================
// TYPES
// =============================================================================

export interface MistralOcrRequest {
  model: string;
  document: {
    type: "document_url";
    document_url: string;  // Can be HTTPS URL or data:application/pdf;base64,...
  };
  include_image_base64?: boolean;
  document_annotation_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      schema: Record<string, unknown>;
    };
  };
}

export interface MistralOcrPage {
  index: number;
  markdown: string | null;
  images: Array<{
    id: string;
    top_left_x: number;
    top_left_y: number;
    bottom_right_x: number;
    bottom_right_y: number;
    image_base64?: string;
  }>;
  dimensions: {
    dpi: number;
    height: number;
    width: number;
  };
  tables: unknown[];
  hyperlinks: unknown[];
  header: string | null;
  footer: string | null;
}

export interface MistralOcrResponse {
  model: string;
  pages: MistralOcrPage[];
  document_annotation: Record<string, unknown> | null;
  usage_info: {
    pages_processed: number;
    doc_size_bytes: number | null;
  };
}

export interface ExtractionResult {
  success: boolean;
  data: Record<string, unknown> | null;
  rawMarkdown: string;
  pagesProcessed: number;
  error?: string;
}

// =============================================================================
// CLIENT
// =============================================================================

const MISTRAL_API_URL = "https://api.mistral.ai/v1/ocr";
const MISTRAL_MODEL = "mistral-ocr-latest";
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds for multi-page PDFs

/**
 * Extract structured data from a document using Mistral OCR API.
 *
 * @param documentUrl - Public URL to the document (must be accessible by Mistral)
 * @param documentType - Type of document (ORV, OP, VTP)
 * @returns Extraction result with structured data or error
 */
export async function extractDocument(
  documentUrl: string,
  documentType: DocumentType
): Promise<ExtractionResult> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");

  if (!apiKey) {
    return {
      success: false,
      data: null,
      rawMarkdown: "",
      pagesProcessed: 0,
      error: "MISTRAL_API_KEY not configured",
    };
  }

  const requestBody: MistralOcrRequest = {
    model: MISTRAL_MODEL,
    document: {
      type: "document_url",
      document_url: documentUrl,
    },
    include_image_base64: false,
    document_annotation_format: buildAnnotationFormat(documentType),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        data: null,
        rawMarkdown: "",
        pagesProcessed: 0,
        error: `Mistral API error ${response.status}: ${errorText}`,
      };
    }

    const result: MistralOcrResponse = await response.json();

    // Combine markdown from all pages
    const rawMarkdown = result.pages
      .map((page) => page.markdown || "")
      .join("\n\n---\n\n");

    return {
      success: true,
      data: result.document_annotation,
      rawMarkdown,
      pagesProcessed: result.usage_info.pages_processed,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        data: null,
        rawMarkdown: "",
        pagesProcessed: 0,
        error: `Request timeout after ${REQUEST_TIMEOUT_MS / 1000}s`,
      };
    }

    return {
      success: false,
      data: null,
      rawMarkdown: "",
      pagesProcessed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract structured data from a base64-encoded PDF using Mistral OCR API.
 *
 * @param base64Data - Base64-encoded PDF content (without the data URI prefix)
 * @param documentType - Type of document (ORV, OP, VTP)
 * @returns Extraction result with structured data or error
 */
export async function extractDocumentFromBase64(
  base64Data: string,
  documentType: DocumentType
): Promise<ExtractionResult> {
  // Convert base64 data to data URI format
  const dataUri = `data:application/pdf;base64,${base64Data}`;
  return extractDocument(dataUri, documentType);
}

/**
 * Extract document with retry logic.
 *
 * @param documentUrl - Public URL to the document or data URI
 * @param documentType - Type of document (ORV, OP, VTP)
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Extraction result
 */
export async function extractDocumentWithRetry(
  documentUrl: string,
  documentType: DocumentType,
  maxRetries: number = 3
): Promise<ExtractionResult> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await extractDocument(documentUrl, documentType);

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry on auth errors or bad requests
    if (result.error?.includes("401") || result.error?.includes("400")) {
      return result;
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    data: null,
    rawMarkdown: "",
    pagesProcessed: 0,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
  };
}
