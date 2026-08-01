import { useCallback, useRef, useState } from 'react';

/**
 * Keeps React Native's refresh indicator aligned with one real async reload.
 * The ref closes the small gap before state updates, preventing two pulls from
 * starting overlapping requests.
 */
export function usePullToRefresh(
  reload: () => Promise<void>,
  enabled = true,
): { refreshing: boolean; onRefresh: () => void } {
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const onRefresh = useCallback(() => {
    if (!enabled || inFlight.current) return;

    inFlight.current = true;
    setRefreshing(true);
    // Screen loaders surface their own errors; this guard ensures an unexpected
    // rejection still releases the spinner instead of becoming unhandled.
    void reload()
      .catch(() => undefined)
      .finally(() => {
        inFlight.current = false;
        setRefreshing(false);
      });
  }, [enabled, reload]);

  return { refreshing, onRefresh };
}
