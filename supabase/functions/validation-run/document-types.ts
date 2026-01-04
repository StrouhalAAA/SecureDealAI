// =============================================================================
// SecureDealAI - Document Types Constants
// =============================================================================
// Defines Document Type IDs from the system and logical document groups
// for use in validation rule filtering.
// =============================================================================

/**
 * Document Type IDs from the system.
 * These IDs correspond to the Document Type ID in the source system.
 */
export const DocumentTypeId = {
  // Technical Documents
  TECHNICKY_PRUKAZ: 21,           // Technický průkaz (Document Scan)
  TECHNICKY_PRUKAZ_BG: 116,       // Technický průkaz (Buying Guide)
  MALY_TECHNICKY_PRUKAZ: 63,      // Malý technický průkaz (ORV)
  COC_LIST: 76,                   // COC list

  // Identity Documents
  OBCANSKY_PRUKAZ: 1,             // Občanský průkaz (OP)

  // Purchase Documents
  SMLOUVA_VYKUP: 2,               // Smlouva Výkup
  VYKUPNI_PROTOKOL: 72,           // Výkupní protokol
  FAKTURA_NAKUP: 59,              // Faktura Nákup

  // Legal Documents
  PLNA_MOC: 25,                   // Plná moc
  PROHLASENI_DPH: 67,             // Prohlášení o DPH
  REJSTRIK_ZASTAV: 203,           // Rejstřík zástav

  // EV Documents
  TEST_EV_BATERIE: 150,           // Test EV Baterie
  EV_CHECKLIST: 195,              // EV checklist
} as const;

/**
 * Type for Document Type ID values
 */
export type DocumentTypeIdValue = typeof DocumentTypeId[keyof typeof DocumentTypeId];

/**
 * Document metadata with Czech names
 */
export const DocumentTypeMetadata: Record<DocumentTypeIdValue, { name: string; nameCs: string }> = {
  [DocumentTypeId.TECHNICKY_PRUKAZ]: { name: 'Technical Certificate', nameCs: 'Technický průkaz' },
  [DocumentTypeId.TECHNICKY_PRUKAZ_BG]: { name: 'Technical Certificate (BG)', nameCs: 'Technický průkaz (BG)' },
  [DocumentTypeId.MALY_TECHNICKY_PRUKAZ]: { name: 'Small Technical Certificate', nameCs: 'Malý technický průkaz' },
  [DocumentTypeId.COC_LIST]: { name: 'COC List', nameCs: 'COC list' },
  [DocumentTypeId.OBCANSKY_PRUKAZ]: { name: 'ID Card', nameCs: 'Občanský průkaz' },
  [DocumentTypeId.SMLOUVA_VYKUP]: { name: 'Purchase Agreement', nameCs: 'Smlouva Výkup' },
  [DocumentTypeId.VYKUPNI_PROTOKOL]: { name: 'Purchase Protocol', nameCs: 'Výkupní protokol' },
  [DocumentTypeId.FAKTURA_NAKUP]: { name: 'Purchase Invoice', nameCs: 'Faktura Nákup' },
  [DocumentTypeId.PLNA_MOC]: { name: 'Power of Attorney', nameCs: 'Plná moc' },
  [DocumentTypeId.PROHLASENI_DPH]: { name: 'VAT Declaration', nameCs: 'Prohlášení o DPH' },
  [DocumentTypeId.REJSTRIK_ZASTAV]: { name: 'Pledge Registry', nameCs: 'Rejstřík zástav' },
  [DocumentTypeId.TEST_EV_BATERIE]: { name: 'EV Battery Test', nameCs: 'Test EV Baterie' },
  [DocumentTypeId.EV_CHECKLIST]: { name: 'EV Checklist', nameCs: 'EV checklist' },
};

/**
 * Document Groups - logical groupings of equivalent document types.
 * A rule using a group will match if ANY document in the group is present.
 */
export const DocumentGroups = {
  /** Technický průkaz - matches either Document Scan (21) or Buying Guide (116) variant */
  VTP: [DocumentTypeId.TECHNICKY_PRUKAZ, DocumentTypeId.TECHNICKY_PRUKAZ_BG] as const,

  /** Malý technický průkaz (ORV) */
  ORV: [DocumentTypeId.MALY_TECHNICKY_PRUKAZ] as const,

  /** Občanský průkaz */
  OP: [DocumentTypeId.OBCANSKY_PRUKAZ] as const,
} as const;

/**
 * Type for Document Group keys
 */
export type DocumentGroupKey = keyof typeof DocumentGroups;

/**
 * Helper function to check if a document ID matches a group
 */
export function documentMatchesGroup(documentId: number, group: DocumentGroupKey): boolean {
  return (DocumentGroups[group] as readonly number[]).includes(documentId);
}

/**
 * Helper function to get all document IDs in a group
 */
export function getDocumentIdsForGroup(group: DocumentGroupKey): readonly number[] {
  return DocumentGroups[group];
}

/**
 * Helper function to check if any required document is present
 * @param presentDocumentIds - Array of document IDs that are present
 * @param requiredDocumentIds - Array of required document IDs (all must be present)
 */
export function hasRequiredDocuments(
  presentDocumentIds: number[],
  requiredDocumentIds: number[]
): boolean {
  return requiredDocumentIds.every(id => presentDocumentIds.includes(id));
}

/**
 * Helper function to check if any document from a group is present
 * @param presentDocumentIds - Array of document IDs that are present
 * @param group - Document group key
 */
export function hasDocumentFromGroup(
  presentDocumentIds: number[],
  group: DocumentGroupKey
): boolean {
  const groupIds = DocumentGroups[group] as readonly number[];
  return groupIds.some(id => presentDocumentIds.includes(id));
}
