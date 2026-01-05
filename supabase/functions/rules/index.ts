// supabase/functions/rules/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsResponse,
  badRequest,
  unauthorized,
  notFound,
  methodNotAllowed,
  serverError,
} from './responses.ts';

// Handler imports (tasks 6.3-6.5 - CRUD, lifecycle, and import/export handlers)
import {
  listRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
  activateRule,
  deactivateRule,
  cloneRule,
  exportRules,
  importRules,
} from './handlers.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Parse route from URL path
 * Routes:
 *   GET    /rules                    -> listRules
 *   GET    /rules/:rule_id           -> getRule
 *   POST   /rules                    -> createRule
 *   PUT    /rules/:rule_id           -> updateRule
 *   DELETE /rules/:rule_id           -> deleteRule
 *   POST   /rules/:rule_id/activate  -> activateRule
 *   POST   /rules/:rule_id/deactivate -> deactivateRule
 *   POST   /rules/:rule_id/clone     -> cloneRule
 *   GET    /rules/export             -> exportRules
 *   POST   /rules/import             -> importRules
 */
function parseRoute(url: URL): { action: string; ruleId?: string } {
  const path = url.pathname.replace('/rules', '').replace(/^\/+|\/+$/g, '');
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { action: 'list' };
  }

  if (segments[0] === 'export') {
    return { action: 'export' };
  }

  if (segments[0] === 'import') {
    return { action: 'import' };
  }

  if (segments.length === 1) {
    return { action: 'single', ruleId: segments[0] };
  }

  if (segments.length === 2) {
    const ruleId = segments[0];
    const subAction = segments[1];

    if (subAction === 'activate') {
      return { action: 'activate', ruleId };
    }
    if (subAction === 'deactivate') {
      return { action: 'deactivate', ruleId };
    }
    if (subAction === 'clone') {
      return { action: 'clone', ruleId };
    }
  }

  return { action: 'unknown' };
}

/**
 * Get authenticated user from JWT token
 * Supports both Supabase auth users and custom JWT tokens (from verify-access-code)
 * Also accepts service_role tokens for administrative access
 */
async function getUser(req: Request): Promise<{ id: string; role: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // For custom JWT tokens (from verify-access-code or service_role), decode manually
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'authenticated') {
        return { id: payload.sub || 'system', role: 'authenticated' };
      }
      // Accept service_role tokens for administrative access
      if (payload.role === 'service_role') {
        return { id: 'service_role', role: 'service_role' };
      }
      return null;
    }

    return { id: user.id, role: user.role || 'authenticated' };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  const url = new URL(req.url);
  const route = parseRoute(url);
  const method = req.method;

  // Authenticate request
  const user = await getUser(req);
  if (!user) {
    return unauthorized();
  }

  // Create Supabase client with service role for DB operations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Route handling
    switch (route.action) {
      case 'list':
        if (method === 'GET') {
          return listRules(supabase, url.searchParams);
        }
        if (method === 'POST') {
          const body = await req.json();
          return createRule(supabase, body, user.id);
        }
        return methodNotAllowed(['GET', 'POST']);

      case 'single':
        if (!route.ruleId) {
          return badRequest('Rule ID is required');
        }
        if (method === 'GET') {
          return getRule(supabase, route.ruleId);
        }
        if (method === 'PUT') {
          const body = await req.json();
          return updateRule(supabase, route.ruleId, body, user.id);
        }
        if (method === 'DELETE') {
          return deleteRule(supabase, route.ruleId, user.id);
        }
        return methodNotAllowed(['GET', 'PUT', 'DELETE']);

      case 'activate':
        if (method !== 'POST') {
          return methodNotAllowed(['POST']);
        }
        return activateRule(supabase, route.ruleId!, user.id);

      case 'deactivate':
        if (method !== 'POST') {
          return methodNotAllowed(['POST']);
        }
        return deactivateRule(supabase, route.ruleId!, user.id);

      case 'clone':
        if (method !== 'POST') {
          return methodNotAllowed(['POST']);
        }
        const cloneBody = await req.json();
        return cloneRule(supabase, route.ruleId!, cloneBody, user.id);

      case 'export':
        if (method !== 'GET') {
          return methodNotAllowed(['GET']);
        }
        return exportRules(supabase, url.searchParams, user.id);

      case 'import':
        if (method !== 'POST') {
          return methodNotAllowed(['POST']);
        }
        const importBody = await req.json();
        return importRules(supabase, importBody, user.id);

      default:
        return notFound('Endpoint');
    }
  } catch (error) {
    console.error('Rules API error:', error);
    if (error instanceof SyntaxError) {
      return badRequest('Invalid JSON in request body');
    }
    return serverError();
  }
});
