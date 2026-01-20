# Feature: Contact Entity and Enhanced Vendor Flow

## Feature Description

Create a new "Contact" entity that represents the person who brings a buying opportunity to the system. This is a fundamental change to the opportunity creation flow where the Contact is entered **first**, before vehicle and vendor data.

The Contact can be one of three types:
1. **FO (Fyzická osoba)** - Individual person (no IČO, no DIČ)
2. **OSVČ (Podnikatel)** - Business Person/Self-employed (has IČO, optional DIČ, VAT status)
3. **Firma (Company)** - Legal entity (has IČO, DIČ, VAT status, contact person)

A key feature is that the Contact may or may not be the same as the Vendor (seller). The system will help users identify discrepancies between the Contact, OCR-extracted owner (Majitel/Provozovatel), and the final Vendor selection.

## User Story

As a vehicle buyer
I want to enter the contact person first when creating a buying opportunity
So that I can track who brought the deal and easily determine if they are also the seller

## Problem Statement

Currently, the vendor (seller) is created either from OCR data or manually entered after vehicle data. There's no concept of a "contact person" who brings the deal, which may be different from the legal owner/seller. This creates confusion when:
- The person presenting the vehicle is not the registered owner
- A company representative brings a vehicle but the seller is a different legal entity
- Business persons (OSVČ) need to be tracked differently from individuals

## Solution Statement

Introduce a new `contacts` table and reorganize the opportunity creation flow:
1. **Step 1 (NEW)**: Enter/search Contact information (FO/OSVČ/Firma)
2. **Step 2**: Enter vehicle information & scan ORV
3. **Step 3**: Determine if vendor is same as contact, or enter different vendor

The system will:
- Compare OCR-extracted Majitel/Provozovatel against the Contact and warn if different
- Allow copying Contact data to Vendor when they are the same entity
- Support the new BUSINESS_PERSON (OSVČ) type for both contacts and vendors

## Business Use Cases

The Contact and Vendor are **independent entities** that may or may not be the same. The `vendor_is_same_as_contact` flag only indicates whether to **copy** contact data to vendor - it does NOT restrict vendor type.

### Use Case Matrix

| Contact Type | Vendor Type | Example Scenario |
|--------------|-------------|------------------|
| **Firma A** | **Firma A** (same) | Company sells their own fleet vehicle |
| **Firma A** | **Firma B** (different) | Broker/intermediary brings deal, different company is the legal seller |
| **Firma A** | **PHYSICAL_PERSON** | Company schedules appointment, but an individual employee is the legal seller |
| **Firma A** | **OSVČ** | Company schedules appointment, self-employed person is the seller |
| **OSVČ** | **OSVČ** (same) | Self-employed person sells their own vehicle |
| **OSVČ** | **Firma** | OSVČ brings a deal for a company sale |
| **OSVČ** | **PHYSICAL_PERSON** | OSVČ contact, but selling as private person (not business) |
| **FO** | **FO** (same) | Individual sells their own personal vehicle |
| **FO** | **Firma** | Individual brings a deal for a company (e.g., family business) |
| **FO** | **OSVČ** | Individual contact, but seller is a self-employed person |

### Key Principles

1. **Contact ≠ Vendor by default** - The contact is who brought the deal; the vendor is the legal seller
2. **Any combination is valid** - Contact type does not restrict vendor type options
3. **`contact_person` in Firma is for communication only** - It is NOT auto-populated as the vendor
4. **`vendor_is_same_as_contact = true`** - Copies contact data to vendor (same legal entity)
5. **`vendor_is_same_as_contact = false`** - Opens full VendorForm with ALL type options

### Vendor Decision Step (Step 3) UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Je dodavatel stejný jako kontakt?                               │
│                                                                 │
│ Kontakt: Firma AAA s.r.o. (IČO: 12345678)                      │
│                                                                 │
│ ○ Ano - Firma AAA s.r.o. je prodávající                        │
│   └── Contact data will be copied to vendor                     │
│                                                                 │
│ ○ Ne - Prodávající je jiný subjekt                             │
│   └── Opens VendorForm with type selection:                     │
│       • Fyzická osoba (PHYSICAL_PERSON)                         │
│       • OSVČ (BUSINESS_PERSON)                                  │
│       • Firma (COMPANY) ← Can be a DIFFERENT company            │
└─────────────────────────────────────────────────────────────────┘
```

### OCR Comparison Logic

When OCR extracts Majitel/Provozovatel from ORV document:

| OCR Majitel | Contact | Vendor Decision | Warning |
|-------------|---------|-----------------|---------|
| Jan Novák | Jan Novák (FO) | Same as contact | ✅ No warning |
| Jan Novák | Firma AAA s.r.o. | Different vendor | ⚠️ "OCR Majitel differs from Contact" |
| Firma BBB s.r.o. | Firma AAA s.r.o. | Different vendor | ⚠️ "OCR Majitel differs from Contact" |
| Firma AAA s.r.o. | Firma AAA s.r.o. | Same as contact | ✅ No warning |

The warning helps users identify when the registered owner differs from the contact, prompting them to verify the correct vendor.

## Relevant Files

### Existing Files to Modify

- `supabase/migrations/` - Add new migration for contacts table
  - Currently ends at `018_mvcr_document_validations.sql`

- `apps/web/src/types/index.ts` - Add Contact TypeScript types
  - Currently defines Vendor, VendorOCRData interfaces

- `apps/web/src/components/shared/CreateOpportunityWizard.vue` - Major refactor for new flow
  - Currently handles choice → upload-orv/manual-entry → create
  - Needs: contact step → vehicle step → vendor decision step

- `apps/web/src/components/forms/VendorForm.vue` - Add VAT payer support
  - Currently supports PHYSICAL_PERSON and COMPANY only
  - Add `is_vat_payer` toggle (Plátce DPH: Ano/Ne) for COMPANY
  - Show DIČ field conditionally based on VAT payer status
  - Future: Extend to support BUSINESS_PERSON type

- `apps/web/src/composables/useDetailData.ts` - Add contact data loading
  - Currently loads vendor, vehicle, OCR data

- `apps/web/src/pages/Detail.vue` - Add contact display section
  - Show contact info and comparison with vendor

### New Files to Create

- `supabase/migrations/019_contacts_table.sql` - Contacts table schema
- `supabase/migrations/020_vendor_vat_payer.sql` - Add is_vat_payer to vendors
- `apps/web/src/components/forms/ContactForm.vue` - Contact entry form
- `apps/web/src/types/contact.ts` - Contact TypeScript types

## Implementation Plan

### Phase 1: Foundation (Database & Types)

1. Create the `contacts` table with support for all three contact types
2. Add RLS policies following existing patterns
3. Create TypeScript types for Contact entity
4. Update vendor_type to support BUSINESS_PERSON in a future migration

### Phase 2: Core Implementation (Backend & Forms)

1. Create ContactForm.vue component with:
   - Contact type selector (FO / OSVČ / Firma)
   - Dynamic form fields based on type
   - ARES integration for OSVČ and Firma
   - Contact person sub-form for Firma

2. Update CreateOpportunityWizard.vue to:
   - Add contact step as first step
   - Move vehicle/ORV steps to step 2
   - Add vendor decision step as step 3

### Phase 3: Integration (Comparison & Validation)

1. Compare Contact vs OCR Majitel/Provozovatel and display warnings
2. Implement "vendor is same as contact" copy functionality
3. Add Contact display to Detail page
4. Update validation preview to include Contact data

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Create Migration for Contacts Table

- Create `supabase/migrations/019_contacts_table.sql`
- Define contacts table with all required columns
- Add CHECK constraints for contact type validation
- Add RLS policies for authenticated users
- Add indexes for common queries
- Create `copy_contact_to_vendor()` helper function

### Step 2: Create TypeScript Types

- Create `apps/web/src/types/contact.ts`
- Define ContactType, ContactPerson, Contact interfaces
- Define CreateContactInput interface
- Export from `apps/web/src/types/index.ts`

### Step 3: Create ContactForm Component

- Create `apps/web/src/components/forms/ContactForm.vue`
- Implement contact type selector (FO/OSVČ/Firma tabs)
- Add common fields: country, phone prefix/number, email
- Add FO fields: first_name, last_name
- Add OSVČ/Firma fields: company_name, IČO, Plátce DPH toggle, DIČ
- Add Firma contact person sub-section
- Integrate ARES lookup for IČO validation
- Add form validation and error handling

### Step 4: Refactor CreateOpportunityWizard

- Change flow to: contact → choice → upload-orv/manual → vendor-decision
- Add contact step that creates Contact record first
- Modify vehicle creation to link to existing Contact
- Add vendor decision step with two options:
  - **"Ano"** (vendor_is_same_as_contact = true): Copy contact data to vendor
  - **"Ne"** (vendor_is_same_as_contact = false): Show full VendorForm with ALL type options
- **Important**: VendorForm must allow ANY vendor type (FO, OSVČ, Firma) regardless of contact type
- When "Ne" selected and contact is Firma, user can still select a DIFFERENT Firma as vendor
- Implement contact-to-vendor copy function that maps:
  - Contact PHYSICAL_PERSON → Vendor PHYSICAL_PERSON
  - Contact BUSINESS_PERSON → Vendor COMPANY (until vendor supports BUSINESS_PERSON)
  - Contact COMPANY → Vendor COMPANY
- Show warning if OCR Majitel differs from Contact (see OCR Comparison Logic above)

### Step 5: Update useDetailData Composable

- Add contact loading from Supabase
- Add computed property for contact data
- Add comparison logic between contact and OCR Majitel/Provozovatel

### Step 6: Update Detail Page

- Add Contact section to Detail page
- Display contact information with type badge
- Show comparison status with vendor
- Add edit capability for contact

### Step 7: Update VendorForm for VAT Payer Support

- Create migration `020_vendor_vat_payer.sql`:
  ```sql
  ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_vat_payer BOOLEAN DEFAULT false;
  ```
- Update VendorForm.vue to add VAT payer toggle for COMPANY type:
  - Add radio buttons: "Plátce DPH" (Ano / Ne)
  - Show DIČ field only when `is_vat_payer = true`
  - DIČ becomes required when `is_vat_payer = true`
- Update vendor TypeScript types to include `is_vat_payer: boolean`

### Step 8: Future - Update Vendor to Support BUSINESS_PERSON

- Create migration `021_vendor_business_person.sql` (optional, separate scope)
- Update VendorForm to support BUSINESS_PERSON type with VAT payer toggle
- Update vendor validation rules for BUSINESS_PERSON

### Step 9: Run Validation Commands

- Test database connection and migration
- Build frontend
- Run type checking

## Database Changes

### Schema Changes

**Modified Table: `vendors`**

| Column | Type | Purpose |
|--------|------|---------|
| is_vat_payer | BOOLEAN | Plátce DPH flag (default false) |

```sql
-- Migration: 020_vendor_vat_payer.sql
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_vat_payer BOOLEAN DEFAULT false;

-- Backfill: If vat_id exists, assume VAT payer
UPDATE vendors SET is_vat_payer = true WHERE vat_id IS NOT NULL AND vat_id != '';

COMMENT ON COLUMN vendors.is_vat_payer IS 'Whether vendor is VAT payer (Plátce DPH)';
```

**New Table: `contacts`**

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| buying_opportunity_id | UUID FK | Link to opportunity |
| contact_type | VARCHAR(20) | 'PHYSICAL_PERSON', 'BUSINESS_PERSON', 'COMPANY' |
| country | VARCHAR(100) | Default 'Ceska Republika' |
| country_code | VARCHAR(5) | Default 'CZ' |
| phone_prefix | VARCHAR(10) | Country code (+420) |
| phone_number | VARCHAR(20) | Phone without prefix |
| email | VARCHAR(100) | Contact email |
| first_name | VARCHAR(100) | For FO and OSVČ |
| last_name | VARCHAR(100) | For FO and OSVČ |
| company_name | VARCHAR(200) | For OSVČ and Company |
| company_id | VARCHAR(15) | IČO (8 digits) |
| is_vat_payer | BOOLEAN | Plátce DPH flag |
| vat_id | VARCHAR(15) | DIČ when VAT payer |
| personal_id | VARCHAR(15) | Rodné číslo (optional) |
| date_of_birth | DATE | Optional for validation |
| ares_verified | BOOLEAN | ARES lookup done |
| ares_verified_at | TIMESTAMPTZ | Verification time |
| ares_data | JSONB | Cached ARES response |
| contact_person | JSONB | Contact person for COMPANY |
| vendor_is_same_as_contact | BOOLEAN | Set in step 3 |
| data_source | VARCHAR(20) | 'MANUAL' or 'ARES' |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

### Migrations

```sql
-- Migration: 019_contacts_table.sql

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('PHYSICAL_PERSON', 'BUSINESS_PERSON', 'COMPANY')),

    -- Common fields
    country VARCHAR(100) DEFAULT 'Ceska Republika',
    country_code VARCHAR(5) DEFAULT 'CZ',
    phone_prefix VARCHAR(10) DEFAULT '+420',
    phone_number VARCHAR(20),
    email VARCHAR(100),

    -- Name fields (PHYSICAL_PERSON, BUSINESS_PERSON)
    first_name VARCHAR(100),
    last_name VARCHAR(100),

    -- Business fields (BUSINESS_PERSON, COMPANY)
    company_name VARCHAR(200),
    company_id VARCHAR(15),
    is_vat_payer BOOLEAN DEFAULT false,
    vat_id VARCHAR(15),

    -- Personal fields (PHYSICAL_PERSON)
    personal_id VARCHAR(15),
    date_of_birth DATE,

    -- ARES
    ares_verified BOOLEAN DEFAULT false,
    ares_verified_at TIMESTAMPTZ,
    ares_data JSONB,

    -- Company contact person
    contact_person JSONB,

    -- Vendor relationship
    vendor_is_same_as_contact BOOLEAN,

    -- Metadata
    data_source VARCHAR(20) DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'ARES')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(buying_opportunity_id),

    CONSTRAINT contact_name_check CHECK (
        CASE
            WHEN contact_type = 'PHYSICAL_PERSON' THEN
                first_name IS NOT NULL AND last_name IS NOT NULL
            WHEN contact_type = 'BUSINESS_PERSON' THEN
                company_name IS NOT NULL AND company_id IS NOT NULL
            WHEN contact_type = 'COMPANY' THEN
                company_name IS NOT NULL AND company_id IS NOT NULL
            ELSE false
        END
    ),

    CONSTRAINT contact_vat_check CHECK (
        (is_vat_payer = false) OR (is_vat_payer = true AND vat_id IS NOT NULL)
    ),

    CONSTRAINT contact_person_check CHECK (
        contact_type != 'COMPANY' OR contact_person IS NOT NULL
    )
);
```

### RLS Policies

```sql
-- Following pattern from 013_authenticated_rls_policies.sql
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_auth_select" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_auth_insert" ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contacts_auth_update" ON contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "contacts_auth_delete" ON contacts FOR DELETE TO authenticated USING (true);
```

### Indexes & Performance

```sql
CREATE INDEX idx_contacts_buying_opp ON contacts(buying_opportunity_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_contacts_type ON contacts(contact_type);
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_phone ON contacts(phone_prefix, phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_contacts_contact_person ON contacts USING GIN (contact_person jsonb_path_ops) WHERE contact_person IS NOT NULL;
```

## Testing Strategy

### Unit Tests

1. **Database constraints**:
   - PHYSICAL_PERSON requires first_name and last_name
   - BUSINESS_PERSON requires company_name and company_id
   - COMPANY requires company_name, company_id, and contact_person
   - VAT ID required when is_vat_payer = true

2. **ContactForm validation**:
   - Type switching clears irrelevant fields
   - ARES lookup populates correct fields
   - Form validates required fields per type

3. **copy_contact_to_vendor function**:
   - Correctly maps all contact types to vendor
   - Handles UPSERT for existing vendors

### Edge Cases

1. Contact with no phone number (should be allowed)
2. OSVČ without DIČ (Neplátce DPH)
3. Company with minimal contact_person data
4. OCR Majitel matches Contact exactly (no warning)
5. OCR Majitel completely different from Contact (warning shown)
6. User changes vendor_is_same_as_contact from true to false
7. ARES lookup fails - handle gracefully
8. **Contact is Firma A, Vendor is Firma B** (different company) - must allow full company entry
9. **Contact is Firma, Vendor is PHYSICAL_PERSON** - common broker scenario
10. **Contact is Firma, Vendor is OSVČ** - company appointment with self-employed seller
11. User selects "same as contact" then changes mind - must be able to switch and enter different vendor
12. Vendor type different from OCR Majitel type - show appropriate warning

## Acceptance Criteria

1. [ ] Contacts table created with all constraints and indexes
2. [ ] ContactForm supports all three contact types with correct field visibility
3. [ ] ARES lookup works for OSVČ and Firma contact types
4. [ ] CreateOpportunityWizard flow starts with Contact step
5. [ ] User can choose if vendor is same as contact in step 3
6. [ ] Contact data is copied to vendor when same entity selected
7. [ ] Warning shown when OCR Majitel differs from Contact
8. [ ] Detail page shows Contact information
9. [ ] All existing functionality continues to work (no regressions)
10. [ ] Frontend builds without TypeScript errors

### Contact vs Vendor Independence Criteria

11. [ ] When "vendor different from contact" selected, VendorForm shows ALL type options (FO, OSVČ, Firma)
12. [ ] Contact type does NOT restrict vendor type selection
13. [ ] User can enter Firma B as vendor when Contact is Firma A (different companies)
14. [ ] User can enter PHYSICAL_PERSON as vendor when Contact is Firma (broker scenario)
15. [ ] User can enter OSVČ as vendor when Contact is Firma (company appointment scenario)
16. [ ] `contact_person` in Firma contact is NOT auto-populated as vendor

### VendorForm VAT Payer Criteria

17. [ ] VendorForm shows "Plátce DPH" toggle (Ano/Ne) for COMPANY type
18. [ ] DIČ field is shown only when `is_vat_payer = true`
19. [ ] DIČ field is required when `is_vat_payer = true`
20. [ ] `is_vat_payer` column added to vendors table
21. [ ] Existing vendors with DIČ are backfilled with `is_vat_payer = true`

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions:

```bash
# Test Supabase connection
npm run test:db

# Apply migration locally
supabase db push

# Build frontend (type checking)
cd apps/web && npm run build
```

## Notes

- Database design reviewed by supabase-expert agent
- Key recommendation: Use JSONB for contact_person to allow flexibility
- BUSINESS_PERSON in vendor table deferred to separate migration to reduce scope
- Contact-to-vendor copy uses UPSERT to handle both new and existing vendors
- Phone split into prefix and number to match Figma design dropdown pattern
- Consider future: Contact search/autocomplete for returning contacts
