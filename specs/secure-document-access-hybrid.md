# Secure Document Access - Hybrid Implementation Plan

## Overview

**Problem**: The current document upload system stores files in a private Supabase Storage bucket but generates public URLs. When the OCR extraction Edge Function passes these URLs to Mistral's API, Mistral cannot access them because the bucket is private, resulting in error 400: "File could not be fetched from url".

**Solution**: Implement a hybrid security model that uses:
1. **Base64 encoding** for OCR extraction (Mistral never needs external access)
2. **Signed URLs** for frontend document preview (time-limited, authenticated access)

---

## Current State Analysis

### Storage Configuration
- **File**: `supabase/migrations/003_storage_bucket.sql`
- **Bucket**: `documents` (private, `public = false`)
- **Structure**: `documents/{spz}/{document_type}/{timestamp}.{extension}`

### Document Upload Flow
- **File**: `supabase/functions/document-upload/index.ts`
- **Issue at line 230-232**: Uses `getPublicUrl()` which generates a public URL format even for private buckets
- **Stored URL format**: `https://{project}.supabase.co/storage/v1/object/public/documents/...`

### OCR Extraction Flow
- **File**: `supabase/functions/ocr-extract/index.ts`
- **Issue at line 294-296**: Passes the stored URL directly to Mistral
- **Existing unused function**: `extractDocumentFromBase64()` in `mistral-client.ts:179-186`

### Mistral Client
- **File**: `supabase/functions/ocr-extract/mistral-client.ts`
- **Supports two methods**:
  - `extractDocument(url)` - requires Mistral to fetch URL externally
  - `extractDocumentFromBase64(base64)` - embeds file data in request (no external fetch)

---

## Implementation Tasks

### Task 1: Modify Document Upload to Store File Path Instead of Public URL

**File**: `supabase/functions/document-upload/index.ts`

**Current code (lines 229-238)**:
```typescript
// Get public URL (or use path for signed URL generation later)
const { data: urlData } = supabase.storage
  .from(STORAGE_BUCKET)
  .getPublicUrl(filePath);

return {
  success: true,
  filePath: data.path,
  publicUrl: urlData.publicUrl,
};
```

**Change to**:
```typescript
// Store the file path only - URLs will be generated on demand
return {
  success: true,
  filePath: data.path,
};
```

**Additional changes in same file**:

1. Update `UploadResult` interface (around line 198):
```typescript
interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}
```

2. Update `createOcrExtractionRecord` function call (around line 368-373):
```typescript
// Change parameter from publicUrl to filePath
const recordResult = await createOcrExtractionRecord(
  supabase,
  spz!,
  documentType!,
  uploadResult.filePath!  // Store path, not URL
);
```

3. Update `createOcrExtractionRecord` function (around line 296-326):
```typescript
async function createOcrExtractionRecord(
  supabase: SupabaseClient,
  spz: string,
  documentType: DocumentType,
  documentFilePath: string  // Renamed parameter
): Promise<CreateRecordResult> {
  try {
    const { data, error } = await supabase
      .from('ocr_extractions')
      .insert({
        spz,
        document_type: documentType,
        document_file_path: documentFilePath,  // New column name
        ocr_status: 'PENDING',
        ocr_provider: 'MISTRAL',
      })
      .select('id, spz, document_type, document_file_path, ocr_status, created_at')
      .single();
    // ... rest of function
  }
}
```

4. Update `DocumentUploadResponse` interface (around line 26):
```typescript
interface DocumentUploadResponse {
  id: string;
  spz: string;
  document_type: DocumentType;
  document_file_path: string;  // Changed from document_file_url
  ocr_status: 'PENDING';
  created_at: string;
}
```

---

### Task 2: Database Migration - Rename Column

**Create new file**: `supabase/migrations/007_rename_document_url_to_path.sql`

```sql
-- ============================================================================
-- SecureDealAI - Rename document_file_url to document_file_path
-- ============================================================================
-- Version: 1.0.0
-- Created: 2026-01-04
-- Purpose: Store file paths instead of URLs for better security
-- ============================================================================

-- Rename the column
ALTER TABLE ocr_extractions
RENAME COLUMN document_file_url TO document_file_path;

-- Add comment explaining the change
COMMENT ON COLUMN ocr_extractions.document_file_path IS
  'Storage path to document file (e.g., 5L94454/orv/1704367200000.pdf). URLs are generated on-demand using signed URLs for security.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
```

---

### Task 3: Modify OCR Extract to Use Base64

**File**: `supabase/functions/ocr-extract/index.ts`

**Add new helper function** (after line 210, before MAIN HANDLER section):

```typescript
// =============================================================================
// FILE DOWNLOAD & BASE64 CONVERSION
// =============================================================================

async function downloadAndConvertToBase64(
  supabase: SupabaseClient,
  filePath: string
): Promise<{ success: boolean; base64?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (error) {
      console.error('[Storage] Download error:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'No data returned from storage' };
    }

    // Convert Blob to base64
    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64 string
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);

    return { success: true, base64 };
  } catch (error) {
    console.error('[Storage] Unexpected download error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
```

**Modify `OcrExtractionRecord` interface** (around line 46):
```typescript
interface OcrExtractionRecord {
  id: string;
  spz: string;
  document_type: DocumentType;
  document_file_path: string;  // Changed from document_file_url
  ocr_status: string;
  extracted_data: Record<string, unknown> | null;
  extraction_confidence: number | null;
  completed_at: string | null;
  errors: Record<string, unknown> | null;
  created_at: string;
}
```

**Modify `handleOcrExtract` function** (around line 287-310):

Replace:
```typescript
console.log(
  `[OCR] Starting extraction for ${ocrRecord.document_type}: ${ocrRecord.document_file_url}`
);

// Call Mistral OCR API with retry
let extractionResult: ExtractionResult;
try {
  extractionResult = await extractDocumentWithRetry(
    ocrRecord.document_file_url,
    ocrRecord.document_type
  );
}
```

With:
```typescript
console.log(
  `[OCR] Starting extraction for ${ocrRecord.document_type}: ${ocrRecord.document_file_path}`
);

// Download file and convert to base64
const downloadResult = await downloadAndConvertToBase64(
  supabase,
  ocrRecord.document_file_path
);

if (!downloadResult.success) {
  const errorMessage = downloadResult.error || 'Failed to download document';
  console.error('[OCR] Download failed:', errorMessage);

  await updateOcrExtractionFailed(supabase, ocr_extraction_id, errorMessage);

  return errorResponse(
    `Document download failed: ${errorMessage}`,
    'DOWNLOAD_ERROR',
    500
  );
}

// Call Mistral OCR API with base64 data
let extractionResult: ExtractionResult;
try {
  extractionResult = await extractDocumentFromBase64(
    downloadResult.base64!,
    ocrRecord.document_type
  );
}
```

**Update import statement** at top of file (around line 31):
```typescript
import {
  extractDocumentFromBase64,  // Changed from extractDocumentWithRetry
  type ExtractionResult
} from "./mistral-client.ts";
```

---

### Task 4: Create New Edge Function for Document URL Generation

**Create new directory and file**: `supabase/functions/get-document-url/index.ts`

```typescript
/**
 * SecureDealAI MVP - Get Document URL Edge Function
 *
 * Generates time-limited signed URLs for document preview.
 * Includes authorization check to ensure user can only access their own documents.
 *
 * Endpoint:
 * - POST /get-document-url
 *
 * Request:
 * {
 *   "spz": "5L94454",
 *   "document_type": "ORV" | "VTP" | "OP"
 * }
 *
 * Response:
 * {
 *   "url": "https://...signed-url...",
 *   "expires_in": 900
 * }
 *
 * Environment variables:
 * - SUPABASE_URL - Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY - Service role key for storage operations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// TYPES
// =============================================================================

type DocumentType = 'ORV' | 'VTP' | 'OP';

interface GetDocumentUrlRequest {
  spz: string;
  document_type: DocumentType;
}

interface GetDocumentUrlResponse {
  url: string;
  expires_in: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes
const STORAGE_BUCKET = 'documents';
const ALLOWED_DOCUMENT_TYPES: DocumentType[] = ['ORV', 'VTP', 'OP'];

// =============================================================================
// CORS HEADERS
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createSupabaseServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function createSupabaseUserClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables');
  }

  // Get the authorization header from the request
  const authHeader = req.headers.get('Authorization');

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, code: string, status: number): Response {
  const body: ErrorResponse = { error: message, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================================================
// AUTHORIZATION
// =============================================================================

async function verifyUserAccess(
  userClient: SupabaseClient,
  spz: string
): Promise<{ authorized: boolean; error?: string }> {
  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return { authorized: false, error: 'User not authenticated' };
    }

    // Check if user has access to this buying opportunity
    // This query will respect RLS policies
    const { data, error } = await userClient
      .from('buying_opportunities')
      .select('id')
      .eq('spz', spz)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Query error:', error);
      return { authorized: false, error: 'Failed to verify access' };
    }

    if (!data) {
      return { authorized: false, error: 'Buying opportunity not found or access denied' };
    }

    return { authorized: true };
  } catch (error) {
    console.error('[Auth] Unexpected error:', error);
    return { authorized: false, error: 'Authorization check failed' };
  }
}

// =============================================================================
// DOCUMENT URL GENERATION
// =============================================================================

async function getLatestDocumentPath(
  supabase: SupabaseClient,
  spz: string,
  documentType: DocumentType
): Promise<string | null> {
  // Query ocr_extractions to get the latest document path for this SPZ and type
  const { data, error } = await supabase
    .from('ocr_extractions')
    .select('document_file_path')
    .eq('spz', spz)
    .eq('document_type', documentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Database] Query error:', error);
    return null;
  }

  return data?.document_file_path || null;
}

async function generateSignedUrl(
  supabase: SupabaseClient,
  filePath: string
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    console.error('[Storage] Signed URL error:', error);
    return { error: error.message };
  }

  return { url: data.signedUrl };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

async function handleGetDocumentUrl(req: Request): Promise<Response> {
  // Parse request body
  let body: GetDocumentUrlRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 'INVALID_REQUEST', 400);
  }

  // Validate request
  const { spz, document_type } = body;

  if (!spz || typeof spz !== 'string') {
    return errorResponse('spz is required', 'VALIDATION_ERROR', 400);
  }

  if (!document_type || !ALLOWED_DOCUMENT_TYPES.includes(document_type)) {
    return errorResponse(
      `document_type must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // Normalize SPZ
  const normalizedSpz = spz.toUpperCase().replace(/\s/g, '');

  // Create clients
  let serviceClient: SupabaseClient;
  let userClient: SupabaseClient;
  try {
    serviceClient = createSupabaseServiceClient();
    userClient = createSupabaseUserClient(req);
  } catch (error) {
    console.error('[Init] Client error:', error);
    return errorResponse('Server configuration error', 'CONFIG_ERROR', 500);
  }

  // Verify user has access to this buying opportunity
  const authResult = await verifyUserAccess(userClient, normalizedSpz);

  if (!authResult.authorized) {
    return errorResponse(
      authResult.error || 'Access denied',
      'UNAUTHORIZED',
      403
    );
  }

  // Get the document file path
  const filePath = await getLatestDocumentPath(
    serviceClient,
    normalizedSpz,
    document_type
  );

  if (!filePath) {
    return errorResponse(
      'Document not found',
      'NOT_FOUND',
      404
    );
  }

  // Generate signed URL
  const urlResult = await generateSignedUrl(serviceClient, filePath);

  if (!urlResult.url) {
    return errorResponse(
      urlResult.error || 'Failed to generate URL',
      'STORAGE_ERROR',
      500
    );
  }

  const response: GetDocumentUrlResponse = {
    url: urlResult.url,
    expires_in: SIGNED_URL_EXPIRY_SECONDS,
  };

  return jsonResponse(response);
}

// =============================================================================
// MAIN SERVER
// =============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    return await handleGetDocumentUrl(req);
  } catch (error) {
    console.error('[Server] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 'INTERNAL_ERROR', 500);
  }
});
```

---

### Task 5: Update Frontend - Document Preview Composable

**Create new file**: `src/composables/useDocumentPreview.ts`

```typescript
/**
 * Composable for fetching secure document preview URLs
 *
 * Uses signed URLs that expire after 15 minutes for security.
 * Automatically refreshes URLs before expiry when needed.
 */

import { ref, type Ref } from 'vue';
import { useSupabase } from './useSupabase';

interface DocumentPreviewState {
  url: string | null;
  loading: boolean;
  error: string | null;
  expiresAt: Date | null;
}

interface UseDocumentPreviewReturn {
  state: Ref<DocumentPreviewState>;
  fetchPreviewUrl: (spz: string, documentType: 'ORV' | 'VTP' | 'OP') => Promise<void>;
  clearPreview: () => void;
  isExpired: () => boolean;
}

export function useDocumentPreview(): UseDocumentPreviewReturn {
  const { supabase } = useSupabase();

  const state = ref<DocumentPreviewState>({
    url: null,
    loading: false,
    error: null,
    expiresAt: null,
  });

  async function fetchPreviewUrl(
    spz: string,
    documentType: 'ORV' | 'VTP' | 'OP'
  ): Promise<void> {
    state.value.loading = true;
    state.value.error = null;

    try {
      const { data, error } = await supabase.functions.invoke('get-document-url', {
        body: {
          spz,
          document_type: documentType,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get document URL');
      }

      if (!data?.url) {
        throw new Error('No URL returned from server');
      }

      state.value.url = data.url;
      state.value.expiresAt = new Date(Date.now() + (data.expires_in * 1000));
    } catch (err) {
      state.value.error = err instanceof Error ? err.message : 'Unknown error';
      state.value.url = null;
      state.value.expiresAt = null;
    } finally {
      state.value.loading = false;
    }
  }

  function clearPreview(): void {
    state.value.url = null;
    state.value.error = null;
    state.value.expiresAt = null;
  }

  function isExpired(): boolean {
    if (!state.value.expiresAt) return true;
    // Consider expired 30 seconds before actual expiry for safety
    return new Date() >= new Date(state.value.expiresAt.getTime() - 30000);
  }

  return {
    state,
    fetchPreviewUrl,
    clearPreview,
    isExpired,
  };
}
```

---

### Task 6: Update Frontend - Document Preview Component

**Create new file**: `src/components/ocr/DocumentPreview.vue`

```vue
<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { useDocumentPreview } from '@/composables/useDocumentPreview';

type DocumentType = 'ORV' | 'VTP' | 'OP';

interface Props {
  spz: string;
  documentType: DocumentType;
  autoLoad?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: false,
});

const emit = defineEmits<{
  (e: 'load'): void;
  (e: 'error', message: string): void;
}>();

const { state, fetchPreviewUrl, clearPreview, isExpired } = useDocumentPreview();
const showPreview = ref(false);

// Refresh URL before it expires (every 14 minutes if preview is open)
let refreshInterval: ReturnType<typeof setInterval> | null = null;

async function loadPreview(): Promise<void> {
  await fetchPreviewUrl(props.spz, props.documentType);

  if (state.value.url) {
    showPreview.value = true;
    emit('load');
    startRefreshInterval();
  } else if (state.value.error) {
    emit('error', state.value.error);
  }
}

function closePreview(): void {
  showPreview.value = false;
  clearPreview();
  stopRefreshInterval();
}

function startRefreshInterval(): void {
  stopRefreshInterval();
  // Refresh every 14 minutes (before 15 min expiry)
  refreshInterval = setInterval(async () => {
    if (showPreview.value && isExpired()) {
      await fetchPreviewUrl(props.spz, props.documentType);
    }
  }, 14 * 60 * 1000);
}

function stopRefreshInterval(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Auto-load if prop is set
watch(
  () => props.autoLoad,
  (shouldAutoLoad) => {
    if (shouldAutoLoad && !state.value.url) {
      loadPreview();
    }
  },
  { immediate: true }
);

// Cleanup on unmount
onUnmounted(() => {
  stopRefreshInterval();
});
</script>

<template>
  <div class="document-preview">
    <!-- Preview Button -->
    <button
      v-if="!showPreview"
      type="button"
      class="preview-button"
      :disabled="state.loading"
      @click="loadPreview"
    >
      <span v-if="state.loading" class="loading-spinner" />
      <span v-else>{{ $t('documents.preview') || 'Zobrazit dokument' }}</span>
    </button>

    <!-- Error Message -->
    <div v-if="state.error" class="preview-error">
      {{ state.error }}
    </div>

    <!-- Preview Modal/Panel -->
    <div v-if="showPreview && state.url" class="preview-modal">
      <div class="preview-header">
        <span class="preview-title">{{ documentType }}</span>
        <button type="button" class="close-button" @click="closePreview">
          &times;
        </button>
      </div>
      <div class="preview-content">
        <!-- PDF Preview -->
        <iframe
          v-if="state.url.includes('.pdf')"
          :src="state.url"
          class="preview-iframe"
          title="Document Preview"
        />
        <!-- Image Preview -->
        <img
          v-else
          :src="state.url"
          class="preview-image"
          :alt="`${documentType} document`"
        />
      </div>
      <div class="preview-footer">
        <a
          :href="state.url"
          target="_blank"
          rel="noopener noreferrer"
          class="download-link"
        >
          {{ $t('documents.openNewTab') || 'Otevrit v novem okne' }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-preview {
  position: relative;
}

.preview-button {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.preview-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff40;
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-error {
  color: #dc2626;
  font-size: 14px;
  margin-top: 8px;
}

.preview-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 900px;
  height: 80vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.preview-title {
  font-weight: 600;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}

.close-button:hover {
  color: #111827;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

.preview-iframe,
.preview-image {
  width: 100%;
  height: 100%;
  border: none;
  object-fit: contain;
}

.preview-footer {
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}

.download-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 14px;
}

.download-link:hover {
  text-decoration: underline;
}
</style>
```

---

### Task 7: Integrate Document Preview into DocumentUpload Component

**File to modify**: `src/components/ocr/DocumentUpload.vue`

**Add import** at top of `<script setup>`:
```typescript
import DocumentPreview from './DocumentPreview.vue';
```

**Add preview section** in template where document status is shown (after successful upload/OCR):
```vue
<!-- Add after the upload dropzone, when document exists -->
<div v-if="hasExistingDocument" class="document-actions">
  <DocumentPreview
    :spz="spz"
    :document-type="documentType"
  />
</div>
```

---

### Task 8: Update Existing OCR Extractions (Data Migration)

**Create new file**: `supabase/migrations/008_update_existing_document_paths.sql`

```sql
-- ============================================================================
-- SecureDealAI - Update existing document_file_path values
-- ============================================================================
-- Version: 1.0.0
-- Created: 2026-01-04
-- Purpose: Convert existing public URLs to file paths
-- ============================================================================

-- Update existing records that have public URLs to just file paths
-- URL format: https://{project}.supabase.co/storage/v1/object/public/documents/{path}
-- Target format: {path}

UPDATE ocr_extractions
SET document_file_path = regexp_replace(
  document_file_path,
  '^https://[^/]+/storage/v1/object/public/documents/',
  ''
)
WHERE document_file_path LIKE 'https://%/storage/v1/object/public/documents/%';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
```

---

### Task 9: Deploy Edge Functions

**Commands to run**:

```bash
# Deploy updated document-upload function
supabase functions deploy document-upload

# Deploy updated ocr-extract function
supabase functions deploy ocr-extract

# Deploy new get-document-url function
supabase functions deploy get-document-url

# Set required secrets (if not already set)
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

---

## Testing Checklist

### Unit Tests

1. **Document Upload**
   - [ ] Uploads file successfully and stores file path (not URL)
   - [ ] Returns correct `document_file_path` in response
   - [ ] File exists in storage at expected path

2. **OCR Extract**
   - [ ] Downloads file from storage using service role
   - [ ] Converts to base64 correctly
   - [ ] Sends base64 to Mistral API
   - [ ] Extraction completes successfully
   - [ ] Handles download errors gracefully

3. **Get Document URL**
   - [ ] Rejects unauthenticated requests
   - [ ] Rejects requests for documents user doesn't own
   - [ ] Returns valid signed URL for authorized users
   - [ ] Signed URL expires after 15 minutes
   - [ ] Handles missing documents gracefully

### Integration Tests

1. **Full Upload → OCR Flow**
   - [ ] Upload document via `document-upload`
   - [ ] Trigger OCR via `ocr-extract`
   - [ ] Verify Mistral receives and processes document
   - [ ] Verify extraction results stored correctly

2. **Frontend Preview Flow**
   - [ ] User can request preview URL after login
   - [ ] Preview loads in iframe/img
   - [ ] URL stops working after 15 minutes
   - [ ] Different user cannot access another user's documents

### Manual Testing

1. **Security Verification**
   - [ ] Attempt to access document with expired signed URL (should fail)
   - [ ] Attempt to access document without authentication (should fail)
   - [ ] Attempt to guess document path (should fail without signed URL)
   - [ ] Verify base64 method doesn't expose any URLs to Mistral

---

## Rollback Plan

If issues arise, rollback in this order:

1. **Revert Edge Functions**:
   ```bash
   git checkout HEAD~1 -- supabase/functions/document-upload/
   git checkout HEAD~1 -- supabase/functions/ocr-extract/
   supabase functions deploy document-upload
   supabase functions deploy ocr-extract
   ```

2. **Revert Database Migration**:
   ```sql
   ALTER TABLE ocr_extractions
   RENAME COLUMN document_file_path TO document_file_url;
   ```

3. **Re-add public URLs to existing records**:
   ```sql
   UPDATE ocr_extractions
   SET document_file_url =
     'https://bdmygmbxtdgujkytpxha.supabase.co/storage/v1/object/public/documents/' || document_file_url
   WHERE document_file_url NOT LIKE 'https://%';
   ```

---

## Security Considerations

1. **Base64 payload size**: Large PDFs (up to 10MB) will result in ~13.3MB base64 strings. Ensure Edge Function memory limits can handle this.

2. **Signed URL exposure**: While signed URLs are time-limited, they could be shared. The 15-minute window minimizes risk.

3. **RLS policies**: The `get-document-url` endpoint relies on RLS policies on `buying_opportunities` table. Ensure these are correctly configured.

4. **Service role key**: Never expose the service role key to the frontend. It should only be used in Edge Functions.

---

## Files Modified/Created Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/007_rename_document_url_to_path.sql` | CREATE | Rename column |
| `supabase/migrations/008_update_existing_document_paths.sql` | CREATE | Data migration |
| `supabase/functions/document-upload/index.ts` | MODIFY | Store path instead of URL |
| `supabase/functions/ocr-extract/index.ts` | MODIFY | Use base64 instead of URL |
| `supabase/functions/get-document-url/index.ts` | CREATE | New endpoint for signed URLs |
| `src/composables/useDocumentPreview.ts` | CREATE | Frontend composable |
| `src/components/ocr/DocumentPreview.vue` | CREATE | Preview component |
| `src/components/ocr/DocumentUpload.vue` | MODIFY | Integrate preview |

---

## Estimated Implementation Time

| Task | Estimated Time |
|------|----------------|
| Task 1: Modify document-upload | 30 min |
| Task 2: Database migration | 15 min |
| Task 3: Modify ocr-extract | 45 min |
| Task 4: Create get-document-url | 1 hour |
| Task 5: Frontend composable | 30 min |
| Task 6: Preview component | 45 min |
| Task 7: Integration | 15 min |
| Task 8: Data migration | 15 min |
| Task 9: Deployment | 30 min |
| Testing | 1 hour |
| **Total** | **~6 hours** |
