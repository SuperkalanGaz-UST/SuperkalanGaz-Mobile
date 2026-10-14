import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — AUTH ONLY. Sign-in, password recovery, and session handling
 * live here so the API client can attach the access token. Do NOT read or write
 * domain data through this client (AGENTS.md §4): all data access goes through
 * the branch-scoped NestJS API, or it would bypass the server-side tenancy guard.
 *
 * The session is persisted in AsyncStorage so logins survive app restarts.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// createClient throws on an empty URL, which would crash the whole app at
// startup before .env is configured. Fall back to a harmless placeholder so the
// UI still boots; only actual sign-in fails until real values are set.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY are not set — sign-in will fail until you configure .env.',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // No URL to parse for OAuth redirects in a native app.
      detectSessionInUrl: false,
    },
  },
);
