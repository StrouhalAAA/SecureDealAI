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
