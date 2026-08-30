const INVITATION_TOKEN = /^[A-Za-z0-9_-]{32,256}$/;
const INVITATION_ROUTE = /(delivery-rider|driver-invitation)/i;
const NESTED_URL_KEYS = ['redirect_to', 'redirectTo', 'url', 'q'] as const;

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extract(value: string, depth: number): string | null {
  const candidate = value.trim();
  if (!candidate || depth > 3) return null;
  if (INVITATION_TOKEN.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);

    // Supabase verification links contain their own `token`; inspect the
    // application redirect first so that Auth's token is never mistaken for
    // the CRM invitation capability.
    for (const key of NESTED_URL_KEYS) {
      const nested = url.searchParams.get(key);
      if (nested) {
        const token = extract(decode(nested), depth + 1);
        if (token) return token;
      }
    }

    if (INVITATION_ROUTE.test(`${url.hostname}${url.pathname}`)) {
      const token = url.searchParams.get('token');
      return token && INVITATION_TOKEN.test(token) ? token : null;
    }
  } catch {
    // A copied link can be percent-encoded without being a complete URL.
  }

  const decoded = decode(candidate);
  return decoded !== candidate ? extract(decoded, depth + 1) : null;
}

/** Accepts either the raw capability or the complete link copied from email. */
export function deliveryRiderInvitationToken(value: string): string | null {
  return extract(value, 0);
}
