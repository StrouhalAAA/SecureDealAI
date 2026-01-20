-- ============================================================================
-- Migration: Create Contacts Table
-- ============================================================================
-- This migration creates the contacts table for storing contact information
-- linked to buying opportunities. Contacts represent the person who brings
-- a buying opportunity and can be one of three types:
-- - PHYSICAL_PERSON (FO): Individual person
-- - BUSINESS_PERSON (OSVČ): Self-employed business person
-- - COMPANY (Firma): Legal entity with contact person
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONTACTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buying_opportunity_id UUID NOT NULL REFERENCES buying_opportunities(id) ON DELETE CASCADE,

    -- Contact type: PHYSICAL_PERSON (FO), BUSINESS_PERSON (OSVČ), COMPANY (Firma)
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
    company_id VARCHAR(15),  -- IČO (8 digits)
    is_vat_payer BOOLEAN DEFAULT false,
    vat_id VARCHAR(15),  -- DIČ (CZxxxxxxxx)

    -- Personal fields (PHYSICAL_PERSON)
    personal_id VARCHAR(15),  -- Rodné číslo (######/####)
    date_of_birth DATE,

    -- ARES verification
    ares_verified BOOLEAN DEFAULT false,
    ares_verified_at TIMESTAMPTZ,
    ares_data JSONB,

    -- Company contact person (COMPANY type only)
    -- Structure: { first_name, last_name, phone_prefix, phone_number, email }
    contact_person JSONB,

    -- Vendor relationship flag (set in wizard step 3)
    vendor_is_same_as_contact BOOLEAN,

    -- Metadata
    data_source VARCHAR(20) DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'ARES')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One contact per buying opportunity
    UNIQUE(buying_opportunity_id),

    -- Ensure required fields based on contact type
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

    -- VAT ID is required when is_vat_payer is true
    CONSTRAINT contact_vat_check CHECK (
        (is_vat_payer = false) OR (is_vat_payer = true AND vat_id IS NOT NULL)
    ),

    -- Contact person is required for COMPANY type
    CONSTRAINT contact_person_check CHECK (
        contact_type != 'COMPANY' OR contact_person IS NOT NULL
    )
);

COMMENT ON TABLE contacts IS 'Contact information for buying opportunities - the person who brings the deal';
COMMENT ON COLUMN contacts.contact_type IS 'PHYSICAL_PERSON (FO), BUSINESS_PERSON (OSVČ), or COMPANY (Firma)';
COMMENT ON COLUMN contacts.contact_person IS 'Contact person details for COMPANY type: {first_name, last_name, phone_prefix, phone_number, email}';
COMMENT ON COLUMN contacts.vendor_is_same_as_contact IS 'When true, contact data should be copied to vendor; when false, vendor is a different entity';

-- ----------------------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX idx_contacts_buying_opp ON contacts(buying_opportunity_id);
CREATE INDEX idx_contacts_company_id ON contacts(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_contacts_type ON contacts(contact_type);
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_phone ON contacts(phone_prefix, phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_contacts_contact_person ON contacts USING GIN (contact_person jsonb_path_ops) WHERE contact_person IS NOT NULL;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Following pattern from 013_authenticated_rls_policies.sql
CREATE POLICY "contacts_auth_select" ON contacts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "contacts_auth_insert" ON contacts
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contacts_auth_update" ON contacts
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "contacts_auth_delete" ON contacts
    FOR DELETE TO authenticated USING (true);

COMMENT ON POLICY "contacts_auth_select" ON contacts IS
    'Allow authenticated users to read contacts';

-- ----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS tr_contacts_updated ON contacts;
CREATE TRIGGER tr_contacts_updated
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- HELPER FUNCTION: Copy contact data to vendor
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION copy_contact_to_vendor(p_contact_id UUID)
RETURNS UUID AS $$
DECLARE
    v_contact contacts%ROWTYPE;
    v_vendor_id UUID;
    v_vendor_type VARCHAR(20);
    v_vendor_name VARCHAR(200);
BEGIN
    -- Get contact data
    SELECT * INTO v_contact FROM contacts WHERE id = p_contact_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contact not found: %', p_contact_id;
    END IF;

    -- Determine vendor type and name based on contact type
    CASE v_contact.contact_type
        WHEN 'PHYSICAL_PERSON' THEN
            v_vendor_type := 'PHYSICAL_PERSON';
            v_vendor_name := UPPER(v_contact.first_name || ' ' || v_contact.last_name);
        WHEN 'BUSINESS_PERSON' THEN
            -- Map BUSINESS_PERSON to COMPANY until vendor supports BUSINESS_PERSON
            v_vendor_type := 'COMPANY';
            v_vendor_name := UPPER(v_contact.company_name);
        WHEN 'COMPANY' THEN
            v_vendor_type := 'COMPANY';
            v_vendor_name := UPPER(v_contact.company_name);
    END CASE;

    -- Upsert vendor (create or update)
    INSERT INTO vendors (
        buying_opportunity_id,
        vendor_type,
        name,
        personal_id,
        company_id,
        vat_id,
        phone,
        email,
        data_source,
        ares_verified,
        ares_verified_at
    )
    VALUES (
        v_contact.buying_opportunity_id,
        v_vendor_type,
        v_vendor_name,
        CASE WHEN v_contact.contact_type = 'PHYSICAL_PERSON' THEN v_contact.personal_id ELSE NULL END,
        CASE WHEN v_contact.contact_type IN ('BUSINESS_PERSON', 'COMPANY') THEN v_contact.company_id ELSE NULL END,
        CASE WHEN v_contact.contact_type IN ('BUSINESS_PERSON', 'COMPANY') AND v_contact.is_vat_payer THEN v_contact.vat_id ELSE NULL END,
        CASE WHEN v_contact.phone_number IS NOT NULL THEN v_contact.phone_prefix || ' ' || v_contact.phone_number ELSE NULL END,
        v_contact.email,
        'MANUAL',
        v_contact.ares_verified,
        v_contact.ares_verified_at
    )
    ON CONFLICT (buying_opportunity_id)
    DO UPDATE SET
        vendor_type = EXCLUDED.vendor_type,
        name = EXCLUDED.name,
        personal_id = EXCLUDED.personal_id,
        company_id = EXCLUDED.company_id,
        vat_id = EXCLUDED.vat_id,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        ares_verified = EXCLUDED.ares_verified,
        ares_verified_at = EXCLUDED.ares_verified_at
    RETURNING id INTO v_vendor_id;

    -- Update contact to mark vendor relationship
    UPDATE contacts
    SET vendor_is_same_as_contact = true
    WHERE id = p_contact_id;

    RETURN v_vendor_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION copy_contact_to_vendor IS
    'Copies contact data to create/update vendor when contact and vendor are the same entity';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
