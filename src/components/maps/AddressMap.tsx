import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

export type AddressMapCoordinate = {
  latitude: number;
  longitude: number;
};

export type AddressMapProps = {
  center: AddressMapCoordinate;
  pin: AddressMapCoordinate;
  onPinChange: (coordinate: AddressMapCoordinate) => void;
};

type MapMessage =
  | { type: 'ready' }
  | { type: 'mapError' }
  | { type: 'pinChange'; latitude: number; longitude: number };

const OPENFREEMAP_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

function createMapHtml(center: AddressMapCoordinate, pin: AddressMapCoordinate) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css" rel="stylesheet" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body { background: #e8f3f8; }
      #error {
        display: none;
        position: absolute;
        inset: 0;
        z-index: 10;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        color: #075783;
        background: #e8f3f8;
        font: 600 13px -apple-system, BlinkMacSystemFont, sans-serif;
        text-align: center;
      }
      .maplibregl-ctrl-attrib { font-size: 9px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="error">Map unavailable. Check your internet connection and try again.</div>
    <script>
      function sendToApp(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      function showMapError() {
        document.getElementById('error').style.display = 'flex';
        sendToApp({ type: 'mapError' });
      }
    </script>
    <script src="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js" onerror="showMapError()"></script>
    <script>
      try {
        if (!window.maplibregl) throw new Error('MapLibre GL JS did not load');

        const map = new maplibregl.Map({
          container: 'map',
          style: '${OPENFREEMAP_LIBERTY_STYLE}',
          center: [${center.longitude}, ${center.latitude}],
          zoom: 15,
          attributionControl: true,
          dragRotate: false,
          pitchWithRotate: false
        });

        map.touchZoomRotate.disableRotation();

        const marker = new maplibregl.Marker({ color: '#087eb9', draggable: true })
          .setLngLat([${pin.longitude}, ${pin.latitude}])
          .addTo(map);

        function publishPin(coordinate) {
          sendToApp({
            type: 'pinChange',
            latitude: coordinate.lat,
            longitude: coordinate.lng
          });
        }

        map.on('click', function (event) {
          marker.setLngLat(event.lngLat);
          publishPin(event.lngLat);
        });

        marker.on('dragend', function () {
          publishPin(marker.getLngLat());
        });

        map.on('load', function () {
          map.resize();
          sendToApp({ type: 'ready' });
        });

        window.setAddressMapPosition = function (centerLng, centerLat, pinLng, pinLat) {
          marker.setLngLat([pinLng, pinLat]);
          map.easeTo({ center: [centerLng, centerLat], zoom: 15, duration: 350 });
          map.resize();
        };
      } catch (error) {
        showMapError();
      }
    </script>
  </body>
</html>`;
}

function isMapMessage(value: unknown): value is MapMessage {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  const message = value as { type?: unknown; latitude?: unknown; longitude?: unknown };

  if (message.type === 'ready' || message.type === 'mapError') return true;
  return message.type === 'pinChange'
    && typeof message.latitude === 'number'
    && Number.isFinite(message.latitude)
    && typeof message.longitude === 'number'
    && Number.isFinite(message.longitude);
}

/**
 * Expo Go-compatible map: MapLibre GL JS renders OpenFreeMap in a WebView,
 * while coordinates cross a small validated JSON bridge into React Native.
 */
export function AddressMap({ center, pin, onPinChange }: AddressMapProps) {
  const webViewRef = useRef<WebView>(null);
  const initialHtml = useRef(createMapHtml(center, pin));
  const [mapError, setMapError] = useState(false);

  const syncMapPosition = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.setAddressMapPosition) {
        window.setAddressMapPosition(${center.longitude}, ${center.latitude}, ${pin.longitude}, ${pin.latitude});
      }
      true;
    `);
  };

  useEffect(() => {
    syncMapPosition();
  }, [center.latitude, center.longitude, pin.latitude, pin.longitude]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (!isMapMessage(message)) return;

      if (message.type === 'ready') {
        syncMapPosition();
      } else if (message.type === 'mapError') {
        setMapError(true);
      } else {
        onPinChange({ latitude: message.latitude, longitude: message.longitude });
      }
    } catch {
      // Ignore messages that do not belong to the coordinate bridge.
    }
  };

  if (mapError) {
    return (
      <View style={styles.errorState}>
        <Feather name="wifi-off" size={25} color={colors.primary} />
        <Text style={styles.errorTitle}>Map unavailable</Text>
        <Text style={styles.errorText}>Check your internet connection and reopen this address form.</Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      style={styles.map}
      source={{ html: initialHtml.current, baseUrl: 'https://openfreemap.org' }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      overScrollMode="never"
      mixedContentMode="never"
      setSupportMultipleWindows={false}
      javaScriptCanOpenWindowsAutomatically={false}
      onMessage={handleMessage}
      onError={() => setMapError(true)}
    />
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%', backgroundColor: colors.redeemPale },
  errorState: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 30,
    backgroundColor: colors.redeemPale,
  },
  errorTitle: { marginTop: 5, fontFamily: fonts.semibold, fontSize: 12, color: colors.heading },
  errorText: { marginTop: 2, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, color: colors.gray, textAlign: 'center' },
});
