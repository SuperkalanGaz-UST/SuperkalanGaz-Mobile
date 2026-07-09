/**
 * PH mobile number normalization — shared convention (AGENTS.md §12). This is an
 * IDENTICAL copy of the web app's util; keep the two byte-for-byte in sync. The
 * `+63` shown in the UI is a fixed prefix element, never placeholder text.
 *
 * Frontend normalization is convenience only and is bypassable — the API's DTOs
 * independently enforce `@Matches(/^\+639\d{9}$/)` as the real integrity boundary.
 */

/**
 * Normalizes any PH mobile input to canonical E.164 (`+639XXXXXXXXX`), or null
 * if it isn't a valid PH mobile number. Run before validating or storing.
 */
export function normalizePhMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, ''); // strip +, spaces, dashes
  let n = digits;
  if (n.startsWith('63')) n = n.slice(2); // full country code pasted
  else if (n.startsWith('0')) n = n.slice(1); // reflexive 0917... entry
  if (!/^9\d{9}$/.test(n)) return null; // must be 9 + 9 digits
  return '+63' + n; // canonical E.164
}
