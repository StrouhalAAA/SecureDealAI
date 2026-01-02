# Task 1.4: Environment Configuration

> **Phase**: 1 - Infrastructure Setup
> **Status**: [ ] Pending
> **Priority**: Critical
> **Depends On**: Supabase project created
> **Estimated Effort**: Low

---

## Objective

Configure all required environment variables for local development and production deployment.

---

## Prerequisites

- [x] Supabase project created
- [ ] Mistral API account (for OCR) - see INT_01
- [ ] Access to ARES/ADIS APIs - see INT_02

---

## Environment Variables

### Required for MVP

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SUPABASE_URL` | Project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | Public anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SECRET_KEY` | Service role key | Supabase Dashboard → Settings → API |

### Required for OCR (Phase 2.6)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `MISTRAL_API_KEY` | Mistral API key | See INT_01_MISTRAL_OCR_API.md |
| `MISTRAL_API_URL` | Mistral API endpoint | See INT_01_MISTRAL_OCR_API.md |

### Required for ARES (Phase 2.4, 2.7)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `ARES_API_URL` | ARES REST API endpoint | See INT_02_ARES_ADIS_API.md |
| `ADIS_API_URL` | ADIS (DPH registry) endpoint | See INT_02_ARES_ADIS_API.md |

---

## Implementation Steps

### Step 1: Create Local .env File

```bash
# In project root
cp .env.example .env
```

**.env** contents:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ...

# Mistral OCR (add when available)
# MISTRAL_API_KEY=
# MISTRAL_API_URL=

# ARES/ADIS (add when available)
# ARES_API_URL=https://ares.gov.cz/...
# ADIS_API_URL=https://adis.mfcr.cz/...
```

### Step 2: Create .env.local for Edge Functions

```bash
# In MVPScope/supabase/
touch .env.local
```

**.env.local** contents:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Step 3: Set Production Secrets

```bash
# Set secrets for deployed Edge Functions
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set MISTRAL_API_KEY=...

# Verify secrets
supabase secrets list
```

### Step 4: Update .gitignore

Ensure sensitive files are not committed:
```gitignore
# Environment files
.env
.env.local
.env.*.local

# Supabase
supabase/.env
```

---

## Verification

### Test Supabase Connection

```bash
npm run test:db
```

### Test Edge Function Locally

```bash
supabase functions serve validation-run --env-file .env.local
```

---

## Security Notes

- NEVER commit `.env` files to git
- Use `supabase secrets` for production values
- Service role key bypasses RLS - handle with care
- Rotate keys if exposed

---

## Validation Criteria

- [ ] .env file created with Supabase credentials
- [ ] .env.local created for Edge Functions
- [ ] .gitignore updated
- [ ] `npm run test:db` passes
- [ ] Secrets set in Supabase (for production)

---

## Completion Checklist

- [ ] Local environment configured
- [ ] Production secrets set
- [ ] Connection verified
- [ ] Update tracker: `00_IMPLEMENTATION_TRACKER.md`
