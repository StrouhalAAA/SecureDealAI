# Task 2.5: Document Upload API

> **Phase**: 2 - Backend API
> **Status**: [x] Implemented
> **Priority**: High
> **Depends On**: 1.3 Storage Bucket
> **Estimated Effort**: Medium

---

## Objective

Create a Supabase Edge Function for uploading documents (ORV, VTP, OP) to Supabase Storage and creating records in `ocr_extractions` table.

**Supported Document Types:**
| Document | Required | Purpose |
|----------|----------|---------|
| **ORV** | Yes | Vehicle registration (SPZ, VIN, keeper) |
| **VTP** | No | Technical certificate with owner IČO for ARES |
| **OP** | Yes (FO) | Personal ID for vendor validation |

---

## Prerequisites

- [ ] Task 1.0 completed (test infrastructure setup)
- [ ] Task 1.1 completed (database schema applied)
- [ ] Task 1.3 completed (storage bucket created)

---

## Test-First Development

### Required Tests (Write Before Implementation)

Create test file: `MVPScope/supabase/functions/tests/document-upload.test.ts`

```typescript
import { assertEquals, assertExists } from "@std/assert";
import { getTestClient, generateTestSpz, cleanupTestData } from "./test-utils.ts";

const BASE_URL = "http://localhost:54321/functions/v1/document-upload";

// Helper to create FormData with test file
function createTestFormData(spz: string, documentType: string, fileContent: Uint8Array, mimeType: string) {
  const formData = new FormData();
  const blob = new Blob([fileContent], { type: mimeType });
  formData.append("file", blob, "test.pdf");
  formData.append("spz", spz);
  formData.append("document_type", documentType);
  return formData;
}

Deno.test("POST uploads PDF document successfully", async () => {
  const spz = generateTestSpz();
  const testPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF magic bytes

  const res = await fetch(BASE_URL, {
    method: "POST",
    body: createTestFormData(spz, "ORV", testPdf, "application/pdf")
  });

  assertEquals(res.status, 201);
  const json = await res.json();
  assertExists(json.id);
  assertEquals(json.ocr_status, "PENDING");
  assertEquals(json.document_type, "ORV");

  await cleanupTestData(spz);
});

Deno.test("POST uploads JPEG document successfully", async () => {
  const spz = generateTestSpz();
  const testJpeg = new Uint8Array([0xFF, 0xD8, 0xFF]); // JPEG magic bytes

  const res = await fetch(BASE_URL, {
    method: "POST",
    body: createTestFormData(spz, "OP", testJpeg, "image/jpeg")
  });

  assertEquals(res.status, 201);
  await cleanupTestData(spz);
});

Deno.test("POST rejects file exceeding size limit", async () => {
  const spz = generateTestSpz();
  const largeFile = new Uint8Array(11 * 1024 * 1024); // 11 MB (exceeds 10 MB limit)

  const res = await fetch(BASE_URL, {
    method: "POST",
    body: createTestFormData(spz, "ORV", largeFile, "application/pdf")
  });

  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.errors.some((e: string) => e.includes("too large")), true);
});

Deno.test("POST rejects invalid file type", async () => {
  const spz = generateTestSpz();
  const textFile = new TextEncoder().encode("not a valid document");

  const formData = new FormData();
  formData.append("file", new Blob([textFile], { type: "text/plain" }), "test.txt");
  formData.append("spz", spz);
  formData.append("document_type", "ORV");

  const res = await fetch(BASE_URL, { method: "POST", body: formData });

  assertEquals(res.status, 400);
});

Deno.test("POST rejects invalid document_type", async () => {
  const spz = generateTestSpz();
  const testPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

  const res = await fetch(BASE_URL, {
    method: "POST",
    body: createTestFormData(spz, "INVALID", testPdf, "application/pdf")
  });

  assertEquals(res.status, 400);
});
```

### Test-First Workflow

1. **RED**: Write tests above, run them - they should FAIL
2. **GREEN**: Implement the function until tests PASS
3. **REFACTOR**: Clean up code while keeping tests green

```bash
# Run tests (should fail before implementation)
cd MVPScope/supabase && deno task test -- --filter="document-upload"
```

---

## API Specification

### Endpoint
```
POST /functions/v1/document-upload
```

### Request (multipart/form-data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Document file (PDF, JPEG, PNG) |
| `spz` | string | Yes | License plate (links to buying opportunity) |
| `document_type` | string | Yes | `ORV`, `VTP`, or `OP` |

### Response
```typescript
interface DocumentUploadResponse {
  id: string;                    // ocr_extractions record ID
  spz: string;
  document_type: 'ORV' | 'VTP' | 'OP';
  document_file_url: string;     // Storage URL
  ocr_status: 'PENDING';
  created_at: string;
}
```

---

## Implementation Steps

### Step 1: Create Function Directory

```bash
mkdir -p MVPScope/supabase/functions/document-upload
```

### Step 2: Implement index.ts

```typescript
// MVPScope/supabase/functions/document-upload/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const spz = formData.get("spz") as string | null;
    const documentType = formData.get("document_type") as string | null;

    // Validate inputs
    const errors: string[] = [];

    if (!file) {
      errors.push("file is required");
    } else {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB`);
      }
    }

    if (!spz) {
      errors.push("spz is required");
    }

    if (!documentType || !["ORV", "VTP", "OP"].includes(documentType)) {
      errors.push("document_type must be ORV, VTP, or OP");
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ errors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Generate file path
    const timestamp = Date.now();
    const extension = file!.name.split(".").pop() || "pdf";
    const filePath = `${spz}/${documentType!.toLowerCase()}/${timestamp}.${extension}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file!, {
        contentType: file!.type,
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL (or signed URL for private bucket)
    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    // Create ocr_extractions record
    const { data: ocrRecord, error: ocrError } = await supabase
      .from("ocr_extractions")
      .insert({
        spz: spz!,
        document_type: documentType!,
        document_file_url: urlData.publicUrl,
        ocr_status: "PENDING",
        ocr_provider: "MISTRAL",
      })
      .select()
      .single();

    if (ocrError) {
      // Rollback: delete uploaded file
      await supabase.storage.from("documents").remove([filePath]);

      return new Response(JSON.stringify({ error: ocrError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(ocrRecord), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### Step 3: Deploy Function

```bash
supabase functions deploy document-upload
```

---

## File Storage Structure

```
documents/
├── 5L94454/
│   ├── orv/
│   │   └── 1704067200000.pdf
│   ├── vtp/
│   │   └── 1704067250000.pdf
│   └── op/
│       └── 1704067300000.jpg
├── 1AB2345/
│   ├── orv/
│   │   └── 1704068000000.pdf
│   ├── vtp/
│   │   └── 1704068050000.pdf
│   └── op/
│       └── 1704068100000.png
```

---

## Workflow Integration

```
1. User uploads document via frontend
2. document-upload function:
   a. Validates file type and size
   b. Uploads to Supabase Storage
   c. Creates ocr_extractions record with status=PENDING
3. Frontend receives record ID
4. Frontend triggers OCR extraction (Task 2.6)
   OR automatic trigger via database webhook
```

---

## Validation Criteria

- [ ] File upload works for PDF, JPEG, PNG
- [ ] File size limit enforced (10 MB)
- [ ] Invalid file types rejected
- [ ] SPZ and document_type required
- [ ] ocr_extractions record created with PENDING status
- [ ] File stored in correct path structure
- [ ] Rollback on database insert failure

---

## Test Cases

```bash
# Upload ORV document
curl -X POST "https://[project].supabase.co/functions/v1/document-upload" \
  -H "Authorization: Bearer $ANON_KEY" \
  -F "file=@/path/to/orv.pdf" \
  -F "spz=5L94454" \
  -F "document_type=ORV"

# Upload VTP document (optional - contains owner IČO for ARES)
curl -X POST "https://[project].supabase.co/functions/v1/document-upload" \
  -H "Authorization: Bearer $ANON_KEY" \
  -F "file=@/path/to/vtp.pdf" \
  -F "spz=5L94454" \
  -F "document_type=VTP"

# Upload OP document
curl -X POST "https://[project].supabase.co/functions/v1/document-upload" \
  -H "Authorization: Bearer $ANON_KEY" \
  -F "file=@/path/to/op.jpg" \
  -F "spz=5L94454" \
  -F "document_type=OP"
```

---

## Error Handling

| Status | Condition | Response |
|--------|-----------|----------|
| 201 | Success | OCR extraction record |
| 400 | Missing/invalid fields | Validation errors |
| 400 | Invalid file type | File type error |
| 400 | File too large | Size limit error |
| 500 | Storage error | Upload failed |
| 500 | Database error | Record creation failed |

---

## Completion Checklist

- [ ] Function created and deployed
- [ ] File validation working
- [ ] Storage upload working
- [ ] Database record created
- [ ] Rollback on failure
- [ ] Tests pass
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
