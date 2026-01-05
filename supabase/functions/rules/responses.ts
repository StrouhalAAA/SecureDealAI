// supabase/functions/rules/responses.ts

/**
 * Standard API response helpers
 */

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Success response (200)
 */
export function success<T>(data: T): Response {
  return jsonResponse({
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }, 200);
}

/**
 * Created response (201)
 */
export function created<T>(data: T): Response {
  return jsonResponse({
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  }, 201);
}

/**
 * No content response (204)
 */
export function noContent(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Bad request response (400)
 */
export function badRequest(message: string, details?: unknown): Response {
  return jsonResponse({
    error: {
      code: 'BAD_REQUEST',
      message,
      details,
    },
  }, 400);
}

/**
 * Unauthorized response (401)
 */
export function unauthorized(message = 'Authentication required'): Response {
  return jsonResponse({
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
  }, 401);
}

/**
 * Forbidden response (403)
 */
export function forbidden(message = 'Insufficient permissions'): Response {
  return jsonResponse({
    error: {
      code: 'FORBIDDEN',
      message,
    },
  }, 403);
}

/**
 * Not found response (404)
 */
export function notFound(resource = 'Resource'): Response {
  return jsonResponse({
    error: {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
    },
  }, 404);
}

/**
 * Conflict response (409)
 */
export function conflict(message: string, details?: unknown): Response {
  return jsonResponse({
    error: {
      code: 'CONFLICT',
      message,
      details,
    },
  }, 409);
}

/**
 * Unprocessable entity response (422)
 */
export function unprocessable(message: string, details?: unknown): Response {
  return jsonResponse({
    error: {
      code: 'UNPROCESSABLE_ENTITY',
      message,
      details,
    },
  }, 422);
}

/**
 * Internal server error response (500)
 */
export function serverError(message = 'Internal server error'): Response {
  return jsonResponse({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  }, 500);
}

/**
 * CORS preflight response
 */
export function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Method not allowed response (405)
 */
export function methodNotAllowed(allowed: string[]): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method not allowed. Allowed: ${allowed.join(', ')}`,
      },
    }),
    {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Allow': allowed.join(', '),
      },
    }
  );
}
