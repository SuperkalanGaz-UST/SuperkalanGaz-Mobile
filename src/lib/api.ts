import { supabase } from '@/lib/supabase';
import { API_URL } from '@/constants/config';

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
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
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
