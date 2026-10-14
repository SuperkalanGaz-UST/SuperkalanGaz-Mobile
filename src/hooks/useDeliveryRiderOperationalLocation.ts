import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { updateDeliveryRiderOperationalLocation } from '@/lib/deliveryRiderApi';

export type OperationalLocationState =
  | 'inactive'
  | 'requesting'
  | 'tracking'
  | 'permission-denied'
  | 'error';

interface OperationalLocationStatus {
  state: OperationalLocationState;
  message: string;
  lastSyncedAt: Date | null;
  ensurePermission: () => Promise<boolean>;
}

const messages: Record<OperationalLocationState, string> = {
  inactive: 'Operational GPS starts when you go Available.',
  requesting: 'Requesting location permission…',
  tracking: 'Operational GPS is active for dispatch.',
  'permission-denied': 'Location permission is required before going Available.',
  error: 'Operational GPS could not sync. Keep the app open and check your connection.',
};

/**
 * Foreground-only phone GPS for Service Request and dispatch operations. Expo
 * stops this watcher when the app is not in use; SinoTrack ST-901/Traccar stays
 * authoritative for vehicle geofencing and PMS.
 */
export function useDeliveryRiderOperationalLocation(
  enabled: boolean,
): OperationalLocationStatus {
  const [state, setState] = useState<OperationalLocationState>('inactive');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

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
      setState(enabled ? 'tracking' : 'inactive');
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

    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const start = async () => {
      const granted = await ensurePermission();
      if (!granted || !active) return;

      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 15_000,
            distanceInterval: 25,
          },
          (position) => {
            if (!active) return;
            void updateDeliveryRiderOperationalLocation({
              latitude: Number(position.coords.latitude.toFixed(8)),
              longitude: Number(position.coords.longitude.toFixed(8)),
              accuracyM: Number(Math.max(0, position.coords.accuracy ?? 0).toFixed(2)),
              capturedAt: new Date(position.timestamp).toISOString(),
            })
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
      } catch {
        if (active) setState('error');
      }
    };

    void start();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [enabled, ensurePermission]);

  return { state, message: messages[state], lastSyncedAt, ensurePermission };
}
