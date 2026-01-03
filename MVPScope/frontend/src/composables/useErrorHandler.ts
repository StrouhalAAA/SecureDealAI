/**
 * Global error handler composable for consistent error handling across the application
 */
export function useErrorHandler() {
  /**
   * Translates various error types into user-friendly Czech messages
   */
  function handleError(error: unknown, context?: string): string {
    if (context) {
      console.error(`Error in ${context}:`, error);
    } else {
      console.error('Error:', error);
    }

    // Handle Supabase/API Response errors
    if (error instanceof Response) {
      switch (error.status) {
        case 400:
          return 'Neplatna data';
        case 401:
          return 'Pristup odepren - prihlaste se';
        case 403:
          return 'Nemate opravneni';
        case 404:
          return 'Zaznam nenalezen';
        case 409:
          return 'Zaznam jiz existuje';
        case 422:
          return 'Neplatny format dat';
        case 429:
          return 'Prilis mnoho pozadavku - zkuste to pozdeji';
        case 503:
          return 'Sluzba docasne nedostupna';
        default:
          if (error.status >= 500) {
            return 'Chyba serveru - zkuste to pozdeji';
          }
          return 'Chyba pri zpracovani pozadavku';
      }
    }

    // Handle network errors (fetch failures)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return 'Chyba pripojeni k serveru';
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return 'Pozadavek vyprsel - zkuste to znovu';
    }

    // Handle Supabase PostgrestError
    if (isPostgrestError(error)) {
      return handlePostgrestError(error);
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      // Check for common error messages
      if (error.message.includes('duplicate key')) {
        return 'Zaznam s touto hodnotou jiz existuje';
      }
      if (error.message.includes('violates foreign key')) {
        return 'Nelze smazat - zaznam je spojen s jinymi daty';
      }
      if (error.message.includes('violates check constraint')) {
        return 'Neplatna hodnota pole';
      }
      if (error.message.includes('network')) {
        return 'Chyba pripojeni k siti';
      }

      // Return the original message if it's short and informative
      if (error.message.length < 100) {
        return error.message;
      }
    }

    return 'Neznama chyba';
  }

  /**
   * Check if error is a Supabase PostgrestError
   */
  function isPostgrestError(error: unknown): error is PostgrestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'details' in error
    );
  }

  /**
   * Handle Supabase PostgrestError with specific error codes
   */
  function handlePostgrestError(error: PostgrestError): string {
    switch (error.code) {
      case '23505': // unique_violation
        return 'Zaznam s touto hodnotou jiz existuje';
      case '23503': // foreign_key_violation
        return 'Nelze provest - neplatny odkaz na jiny zaznam';
      case '23502': // not_null_violation
        return 'Povinne pole neni vyplneno';
      case '23514': // check_violation
        return 'Neplatna hodnota pole';
      case '22P02': // invalid_text_representation
        return 'Neplatny format dat';
      case 'PGRST116': // not found
        return 'Zaznam nenalezen';
      case 'PGRST301': // no rows returned
        return 'Zadna data nenalezena';
      default:
        return error.message || 'Chyba databaze';
    }
  }

  /**
   * Determine if an error should trigger a redirect
   */
  function shouldRedirect(error: unknown): { redirect: boolean; path?: string } {
    if (error instanceof Response) {
      if (error.status === 401 || error.status === 403) {
        return { redirect: true, path: '/login' };
      }
      if (error.status === 404) {
        return { redirect: true, path: '/' };
      }
    }
    return { redirect: false };
  }

  /**
   * Determine if an error is retryable
   */
  function isRetryable(error: unknown): boolean {
    // Network errors are retryable
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return true;
    }

    // Timeout errors are retryable
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }

    // Server errors (5xx) are retryable
    if (error instanceof Response && error.status >= 500) {
      return true;
    }

    // Rate limit errors are retryable
    if (error instanceof Response && error.status === 429) {
      return true;
    }

    return false;
  }

  return {
    handleError,
    shouldRedirect,
    isRetryable,
  };
}

// Type for PostgrestError from Supabase
interface PostgrestError {
  code: string;
  message: string;
  details: string | null;
  hint?: string | null;
}
