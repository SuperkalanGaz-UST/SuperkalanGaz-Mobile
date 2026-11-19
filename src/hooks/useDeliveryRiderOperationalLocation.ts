import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import { markDeliveryRiderLocationPending, updateDeliveryRiderOperationalLocation } from '@/lib/deliveryRiderApi';

const STATIONARY_REFRESH_MS = 45_000;
const REFRESH_RETRY_MS = 15_000;

function isForeground() {
  return AppState.currentState === 'active' &&
    (typeof document === 'undefined' || document.visibilityState === 'visible');
}

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
  ensurePermission: () => Promise<boolean>;
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
      return;
    }
    if (appState !== 'active') {
      setState('paused');
      return;
    }

    let active = true;
    let subscription: Location.LocationSubscription | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let startedAt = 0;
    let lastPublishedAt = 0;
    let oneTimeFixPending = false;

    const publish = async (position: Location.LocationObject) => {
      if (!active || !isForeground() || position.timestamp < startedAt) return;
      try {
        const result = await sendPosition(position);
        if (!active || !result.recorded) return;
        lastPublishedAt = Date.now();
        setState('tracking');
      } catch {
        if (active) setState('error');
      }
    };

    const refreshStationaryPosition = async () => {
      if (!active || !isForeground() || oneTimeFixPending || Date.now() - lastPublishedAt < STATIONARY_REFRESH_MS) return;
      oneTimeFixPending = true;
      try {
        // Expo's browser provider otherwise permits an arbitrarily old cached fix.
        const options = { accuracy: Location.Accuracy.High,
          ...(Platform.OS === 'web' ? { maximumAge: 0, timeout: 20_000 } : {}) };
        await publish(await Location.getCurrentPositionAsync(options));
      } catch {
        if (active && Date.now() - lastPublishedAt >= STATIONARY_REFRESH_MS) setState('error');
      } finally {
        oneTimeFixPending = false;
      }
    };

    const start = async () => {
      const granted = await ensurePermission();
      if (!granted || !active) return;

      try {
        await markDeliveryRiderLocationPending();
      } catch {
        if (active) {
          setState('error');
          retry = setTimeout(() => void start(), REFRESH_RETRY_MS);
        }
        return;
      }
      try {
        if (!active || !isForeground()) return;
        startedAt = Date.now();
        void refreshStationaryPosition();
        timer = setInterval(() => void refreshStationaryPosition(), STATIONARY_REFRESH_MS);
        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 15_000,
            distanceInterval: 25,
          },
          (position) => { void publish(position); },
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
      clearInterval(timer);
      clearTimeout(retry);
    };
  }, [enabled, ensurePermission, appState]);

  return { state, message: messages[state], ensurePermission };
}
