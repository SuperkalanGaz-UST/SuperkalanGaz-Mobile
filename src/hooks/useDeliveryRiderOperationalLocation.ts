import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { updateDeliveryRiderOperationalLocation } from '@/lib/deliveryRiderApi';

export type OperationalLocationState =
  | 'inactive'
  | 'requesting'
  | 'locating'
  | 'paused'
  | 'tracking'
  | 'permission-denied'
  | 'error';

interface OperationalLocationStatus {
  state: OperationalLocationState;
  message: string;
  lastSyncedAt: Date | null;
  ensurePermission: () => Promise<boolean>;
  refreshForDispatch: () => Promise<void>;
}

const messages: Record<OperationalLocationState, string> = {
  inactive: 'Operational GPS starts when you go Available.',
  requesting: 'Requesting location permission…',
  locating: 'Waiting for a phone GPS reading…',
  paused: 'Operational GPS is paused. Return to the app to share your location.',
  tracking: 'Operational GPS is active for dispatch.',
  'permission-denied': 'Location permission is required before going Available.',
  error: 'Operational GPS could not sync. Keep the app open and check your connection.',
};

function sendPosition(position: Location.LocationObject) {
  return updateDeliveryRiderOperationalLocation({
    latitude: Number(position.coords.latitude.toFixed(8)),
    longitude: Number(position.coords.longitude.toFixed(8)),
    accuracyM: Number(Math.max(0, position.coords.accuracy ?? 1000).toFixed(2)),
    capturedAt: new Date(position.timestamp).toISOString(),
  });
}

/**
 * Foreground-only phone GPS for Service Request and dispatch operations. Expo
 * removes this watcher when the app is not in use; SinoTrack ST-901/Traccar stays
 * authoritative for vehicle geofencing and PMS.
 */
export function useDeliveryRiderOperationalLocation(
  enabled: boolean,
): OperationalLocationStatus {
  const [state, setState] = useState<OperationalLocationState>('inactive');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const listener = AppState.addEventListener('change', setAppState);
    return () => listener?.remove();
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    setState('requesting');
    try {
      const current = await Location.getForegroundPermissionsAsync();
      const permission = current.granted
        ? current
        : await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setState('permission-denied');
        return false;
      }
      setState(enabled ? 'locating' : 'inactive');
      return true;
    } catch {
      setState('error');
      return false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setState('inactive');
      setLastSyncedAt(null);
      return;
    }
    if (appState !== 'active') {
      setState('paused');
      return;
    }

    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const start = async () => {
      const granted = await ensurePermission();
      if (!granted || !active) return;

      try {
        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 15_000,
            distanceInterval: 25,
          },
          (position) => {
            if (!active || AppState.currentState !== 'active') return;
            void sendPosition(position)
              .then((result) => {
                if (!active || !result.recorded) return;
                setState('tracking');
                setLastSyncedAt(new Date(result.receivedAt ?? Date.now()));
              })
              .catch(() => {
                if (active) setState('error');
              });
          },
        );
        // A pending watcher may finish after Offline, backgrounding or logout.
        if (active) subscription = watcher;
        else watcher.remove();
      } catch {
        if (active) setState('error');
      }
    };

    void start();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [enabled, ensurePermission, appState]);

  const refreshForDispatch = async () => {
    if (!enabled || AppState.currentState !== 'active' || (lastSyncedAt && Date.now() - lastSyncedAt.getTime() < 20_000)) return;
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<void>(resolve => {
        timeout = setTimeout(() => { timedOut = true; resolve(); }, 3_000);
      });
      const refresh = async () => {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!timedOut && AppState.currentState === 'active') await sendPosition(position);
      };
      await Promise.race([refresh(), deadline]);
    } catch {
      // An unavailable phone fix can still lead to explicit plate confirmation.
    } finally {
      clearTimeout(timeout);
    }
  };

  return { state, message: messages[state], lastSyncedAt, ensurePermission, refreshForDispatch };
}
