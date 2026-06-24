import { createClient } from '@supabase/supabase-js';

// These two values are read at build time from Vite env vars — see
// .env.example for where to get them and where to set them for the live
// Cloudflare Pages deploy. Until they're set, the app still runs (the map,
// feed, saved list, etc. don't need auth), but anything account-related
// shows a friendly "not configured yet" state instead of crashing.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
