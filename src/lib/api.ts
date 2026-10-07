import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/constants/config';

function isSessionExpired(session: Session | null): boolean {
  if (!session?.expires_at) return false;
  return Date.now() >= session.expires_at * 1000 - 30_000;
}

function nativeMultipartFetch(url: string, init: RequestInit, headers: Headers): Promise<Response> {
  // Expo 57's fetch converter rejects React Native { uri, name, type } parts.
  // Native XHR reads these files and generates the multipart boundary itself.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => init.signal?.removeEventListener('abort', abort);
    xhr.open(init.method ?? 'GET', url);
    xhr.timeout = 60_000;
    headers.forEach((value, name) => xhr.setRequestHeader(name, value));
    xhr.onload = () => {
      cleanup();
      const responseHeaders = new Headers();
      xhr.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach((line) => {
        const separator = line.indexOf(':');
        if (separator > 0) responseHeaders.append(line.slice(0, separator), line.slice(separator + 1).trim());
      });
      resolve(new Response(xhr.status === 204 ? null : xhr.responseText, {
        status: xhr.status,
        headers: responseHeaders,
      }));
    };
    xhr.onerror = () => { cleanup(); reject(new Error('Could not upload the photo. Check your connection and try again.')); };
    xhr.ontimeout = () => { cleanup(); reject(new Error('Photo upload timed out. Please try again.')); };
    xhr.onabort = () => { cleanup(); reject(new Error('Photo upload was cancelled.')); };
    if (init.signal?.aborted) {
      reject(new Error('Photo upload was cancelled.'));
      return;
    }
    init.signal?.addEventListener('abort', abort, { once: true });
    xhr.send(init.body as FormData);
  });
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
  if (isMultipart) headers.delete('Content-Type');
  if (init.body && !isMultipart && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_URL}/api${path}`;
  if (isMultipart && Platform.OS !== 'web') return nativeMultipartFetch(url, init, headers);
  return fetch(url, { ...init, headers });
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
