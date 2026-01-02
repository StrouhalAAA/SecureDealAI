import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Server-side client with elevated privileges (bypasses RLS)
export const createServerClient = () => {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing SUPABASE_SECRET_KEY environment variable');
  }
  return createClient(supabaseUrl, secretKey);
};
