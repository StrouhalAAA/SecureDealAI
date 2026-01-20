/**
 * Contact Types
 *
 * Types for the Contact entity representing the person who brings
 * a buying opportunity. Can be FO (individual), OSVČ (self-employed),
 * or Firma (company).
 */

/**
 * Contact type enum values
 */
export type ContactType = 'PHYSICAL_PERSON' | 'BUSINESS_PERSON' | 'COMPANY';

/**
 * Contact person information for COMPANY type contacts
 */
export interface ContactPerson {
  first_name: string;
  last_name: string;
  phone_prefix?: string;
  phone_number?: string;
  email?: string;
}

/**
 * Full Contact entity from database
 */
export interface Contact {
  id: string;
  buying_opportunity_id: string;
  contact_type: ContactType;

  // Common fields
  country: string;
  country_code: string;
  phone_prefix: string | null;
  phone_number: string | null;
  email: string | null;

  // Name fields (PHYSICAL_PERSON, BUSINESS_PERSON)
  first_name: string | null;
  last_name: string | null;

  // Business fields (BUSINESS_PERSON, COMPANY)
  company_name: string | null;
  company_id: string | null;
  is_vat_payer: boolean;
  vat_id: string | null;

  // Personal fields (PHYSICAL_PERSON)
  personal_id: string | null;
  date_of_birth: string | null;

  // ARES verification
  ares_verified: boolean;
  ares_verified_at: string | null;
  ares_data: Record<string, unknown> | null;

  // Company contact person (COMPANY type only)
  contact_person: ContactPerson | null;

  // Vendor relationship
  vendor_is_same_as_contact: boolean | null;

  // Metadata
  data_source: 'MANUAL' | 'ARES';
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new contact
 */
export interface CreateContactInput {
  buying_opportunity_id: string;
  contact_type: ContactType;

  // Common fields
  country?: string;
  country_code?: string;
  phone_prefix?: string;
  phone_number?: string;
  email?: string;

  // Name fields (PHYSICAL_PERSON, BUSINESS_PERSON)
  first_name?: string;
  last_name?: string;

  // Business fields (BUSINESS_PERSON, COMPANY)
  company_name?: string;
  company_id?: string;
  is_vat_payer?: boolean;
  vat_id?: string;

  // Personal fields (PHYSICAL_PERSON)
  personal_id?: string;
  date_of_birth?: string;

  // ARES verification
  ares_verified?: boolean;
  ares_verified_at?: string;
  ares_data?: Record<string, unknown>;

  // Company contact person (COMPANY type only)
  contact_person?: ContactPerson;

  // Metadata
  data_source?: 'MANUAL' | 'ARES';
}

/**
 * Input for updating a contact
 */
export interface UpdateContactInput extends Partial<Omit<CreateContactInput, 'buying_opportunity_id'>> {
  vendor_is_same_as_contact?: boolean;
}

/**
 * Contact form state used in ContactForm.vue
 */
export interface ContactFormState {
  contact_type: ContactType;

  // Common fields
  country: string;
  country_code: string;
  phone_prefix: string;
  phone_number: string;
  email: string;

  // PHYSICAL_PERSON fields
  first_name: string;
  last_name: string;
  personal_id: string;
  date_of_birth: string;

  // BUSINESS_PERSON / COMPANY fields
  company_name: string;
  company_id: string;
  is_vat_payer: boolean;
  vat_id: string;

  // COMPANY contact person
  contact_person_first_name: string;
  contact_person_last_name: string;
  contact_person_phone_prefix: string;
  contact_person_phone_number: string;
  contact_person_email: string;
}

/**
 * Labels for contact types in Czech
 */
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  PHYSICAL_PERSON: 'Fyzicka osoba (FO)',
  BUSINESS_PERSON: 'OSVC',
  COMPANY: 'Firma',
};

/**
 * Get display name for a contact
 */
export function getContactDisplayName(contact: Contact): string {
  if (contact.contact_type === 'PHYSICAL_PERSON') {
    return `${contact.first_name} ${contact.last_name}`.trim();
  }
  return contact.company_name || '';
}

/**
 * Get contact identifier (IČO or RČ)
 */
export function getContactIdentifier(contact: Contact): string | null {
  if (contact.contact_type === 'PHYSICAL_PERSON') {
    return contact.personal_id;
  }
  return contact.company_id;
}
