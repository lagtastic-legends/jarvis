import { createClient } from '@supabase/supabase-js';

// ZERO-SECRET LOCK:
// Only public, anonymous credentials with strict Row Level Security (RLS)
// are permitted in client bundles. Service role keys must NEVER appear here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dev_anon_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
