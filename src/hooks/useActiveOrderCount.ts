import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

/** Closed Service Request statuses; everything else is still in progress. */
const CLOSED_STATUSES = new Set(['Delivered', 'Completed', 'Cancelled']);

// Screens can mount two tab bars at once (Home keeps the History screen behind
// its guide), so concurrent callers share one request instead of each fetching.
let inFlight: Promise<number | null> | null = null;

function fetchActiveOrderCount(): Promise<number | null> {
  inFlight ??= (async () => {
    try {
      const res = await apiFetch(`/service-requests/me?_t=${Date.now()}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { serviceRequests?: { status: string }[] };
      return (data.serviceRequests ?? []).filter((order) => !CLOSED_STATUSES.has(order.status)).length;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Number of the signed-in customer's in-progress orders, for the History tab
 * badge. Reloads each time the hosting screen gains focus, so a newly placed
 * order shows as soon as the customer returns to a screen with the tab bar.
 * A failed load keeps the last known count rather than hiding the badge.
 */
export function useActiveOrderCount(): number {
  const { session } = useAuth();
  const focused = useIsFocused();
  const [count, setCount] = useState(0);
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (!focused || !signedIn) return;
    let current = true;
    void fetchActiveOrderCount().then((next) => {
      if (current && next !== null) setCount(next);
    });
    return () => { current = false; };
  }, [focused, signedIn]);

  return signedIn ? count : 0;
}
