# Task 1.3: Create Storage Bucket

> **Phase**: 1 - Infrastructure Setup
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 1.1 Database Schema
> **Estimated Effort**: Low

---

## Objective

Create a Supabase Storage bucket for storing uploaded documents (ORV, OP images/PDFs).

---

## Prerequisites

- [ ] Task 1.1 completed (Supabase project configured)

---

## Bucket Configuration

| Property | Value |
|----------|-------|
| **Bucket Name** | `documents` |
| **Public Access** | No (private) |
| **File Size Limit** | 10 MB |
| **Allowed MIME Types** | image/jpeg, image/png, application/pdf |

---

## Implementation Steps

### Step 1: Create Bucket via Dashboard

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `documents`
4. Toggle OFF "Public bucket"
5. Click "Create bucket"

### Step 2: Configure Bucket Policies (RLS)

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow users to read their own documents
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow service role full access (for Edge Functions)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'documents');
```

### Step 3: Create Folder Structure

Recommended folder structure within the bucket:
```
documents/
├── {spz}/
│   ├── orv/
│   │   └── {timestamp}_{filename}.pdf
│   └── op/
│       └── {timestamp}_{filename}.pdf
```

### Step 4: Verify Bucket Created

```bash
# Via Supabase CLI
supabase storage ls
```

Or check in Dashboard → Storage → Buckets list

---

## File Naming Convention

```
{spz}_{document_type}_{timestamp}.{extension}

Example:
5L94454_ORV_20260101120000.pdf
5L94454_OP_20260101120100.jpg
```

---

## Usage in Edge Functions

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`${spz}/orv/${filename}`, file, {
    contentType: 'application/pdf',
    upsert: false
  });

// Get signed URL (temporary access)
const { data: urlData } = await supabase.storage
  .from('documents')
  .createSignedUrl(`${spz}/orv/${filename}`, 3600); // 1 hour
```

---

## Validation Criteria

- [ ] Bucket `documents` created
- [ ] Bucket is private (not public)
- [ ] RLS policies applied
- [ ] Test upload works from authenticated context
- [ ] Test download with signed URL works

---

## Notes

- Documents are linked via SPZ (business key) matching ACBS pattern
- Signed URLs provide temporary access for OCR processing
- Consider lifecycle policies for document retention (future)

---

## Completion Checklist

- [ ] Bucket created
- [ ] RLS policies configured
- [ ] Test upload/download verified
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
