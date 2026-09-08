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
// Expo Go exposes the computer's host as debuggerHost; the CLI may expose the
// same value as expoConfig.hostUri. Use either value so the API follows the
// machine running Expo without forcing every developer to edit .env.
function ipv4FromExpoHost(value: string | undefined): string | undefined {
  const candidate = value?.replace(/^[^/]+:\/\//, '').split('/')[0].split(':')[0];
  return candidate && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate) ? candidate : undefined;
}

const expoDevHost =
  ipv4FromExpoHost(Constants.expoConfig?.hostUri) ??
  ipv4FromExpoHost(Constants.expoGoConfig?.debuggerHost);
const isLanIpv4 = expoDevHost !== undefined;
const mobileReachableApiUrl =
  __DEV__ && isLanIpv4
    ? configuredApiUrl.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)/, `$1${expoDevHost}`)
    : configuredApiUrl;

/** Base URL of the NestJS API. The API client appends `/api` to this. */
export const API_URL = mobileReachableApiUrl;
