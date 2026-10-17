import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let isConfigured = false;

/**
 * Returns true if Supabase PostgreSQL environment variables are provided
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  return Boolean(url && url.trim() && key && key.trim());
}

/**
 * Returns the singleton Supabase server-side client with service_role permissions
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    ''
  ).trim();

  if (!url || !key) {
    return null;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    isConfigured = true;
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase] Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Verifies Supabase connection and returns detailed diagnostics
 */
export async function verifySupabaseConnection(): Promise<{
  connected: boolean;
  url?: string;
  tablesVerified?: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      error: 'Supabase credentials not configured (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required).'
    };
  }

  try {
    const { count, error } = await client
      .from('rides')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return {
        connected: false,
        url: process.env.SUPABASE_URL,
        tablesVerified: false,
        error: error.message
      };
    }

    return {
      connected: true,
      url: process.env.SUPABASE_URL,
      tablesVerified: true
    };
  } catch (err: any) {
    return {
      connected: false,
      url: process.env.SUPABASE_URL,
      tablesVerified: false,
      error: err.message || 'Unknown Supabase connection failure'
    };
  }
}
