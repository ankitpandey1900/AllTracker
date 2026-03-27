/**
 * Supabase client initialization
 *
 * Reads credentials from environment variables (set in .env file).
 * Falls back gracefully if credentials are not configured.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseClient: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized.');
} else {
  console.warn(
    'Supabase credentials not set. Cloud sync will not work.\n' +
    'Copy .env.example to .env and fill in your Supabase project details.',
  );
}

export { supabaseClient };
