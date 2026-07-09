import Constants from 'expo-constants';

/**
 * Runtime configuration. Prefer EXPO_PUBLIC_* env vars (inlined at build time);
 * fall back to the `extra` block in app.json, then a local-dev default.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

/** Base URL of the NestJS API. The API client appends `/api` to this. */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  extra.apiUrl ??
  'http://localhost:3001'
).replace(/\/$/, '');
