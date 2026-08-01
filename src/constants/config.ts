import Constants from 'expo-constants';

/**
 * Runtime configuration. Prefer EXPO_PUBLIC_* env vars (inlined at build time);
 * fall back to the `extra` block in app.json, then a local-dev default.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };

const configuredApiUrl = (
  process.env.EXPO_PUBLIC_API_URL ??
  extra.apiUrl ??
  'http://localhost:3001'
).replace(/\/$/, '');

// On a physical phone, localhost is the phone itself. During LAN development,
// Expo exposes the computer's IPv4 host in hostUri, so reuse it for the API
// without forcing every developer to edit .env when their LAN address changes.
const expoDevHost = Constants.expoConfig?.hostUri?.split(':')[0];
const isLanIpv4 = expoDevHost !== undefined && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(expoDevHost);
const mobileReachableApiUrl =
  __DEV__ && isLanIpv4
    ? configuredApiUrl.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)/, `$1${expoDevHost}`)
    : configuredApiUrl;

/** Base URL of the NestJS API. The API client appends `/api` to this. */
export const API_URL = mobileReachableApiUrl;
