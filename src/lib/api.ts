import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/constants/config';

function isSessionExpired(session: Session | null): boolean {
  if (!session?.expires_at) return false;
  return Date.now() >= session.expires_at * 1000 - 30_000;
}

/**
 * Thin client for the shared superkalan-crm-api backend (NestJS) — the SAME API
 * the web dashboard uses. This is not a backend; it just attaches the logged-in
 * customer's Supabase access token to each request. The API verifies the token
 * and derives role + branch scope server-side, so nothing here is trusted for
 * authorization.
 *
 * Mirrors the web app's `lib/api.ts` on purpose — same base path (`/api`) and
 * error shape — so the two clients stay legible side by side.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData.session;

  if (!session || isSessionExpired(session)) {
    const { data: refreshedData, error } = await supabase.auth.refreshSession();
    if (error || !refreshedData.session) {
      await supabase.auth.signOut();
      throw new Error('Your session expired. Please log in again.');
    }
    session = refreshedData.session;
  }

  const token = session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const isMultipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !isMultipart && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_URL}/api${path}`, { ...init, headers });
}

/**
 * NestJS reports errors as { message: string | string[] } (validation errors
 * arrive as an array); older-style handlers used { error }. Normalize both.
 */
export function apiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const { message, error } = data as { message?: string | string[]; error?: string };
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    if (typeof error === 'string') return error;
  }
  return fallback;
}
