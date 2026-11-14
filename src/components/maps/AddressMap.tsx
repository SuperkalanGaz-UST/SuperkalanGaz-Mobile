import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { createMapHtml, isMapMessage, type AddressMapProps } from './addressMapDocument';

/**
 * Expo Go-compatible map: MapLibre GL JS renders OpenFreeMap in a WebView,
 * while coordinates cross a small validated JSON bridge into React Native.
 */
export function AddressMap({ center, pin, onPinChange }: AddressMapProps) {
  const webViewRef = useRef<WebView<unknown>>(null);
  const [source] = useState(() => ({ html: createMapHtml(center, pin), baseUrl: 'https://openfreemap.org' }));
  const [mapError, setMapError] = useState(false);

  const { longitude: centerLng, latitude: centerLat } = center;
  const { longitude: pinLng, latitude: pinLat } = pin;
  const syncMapPosition = useCallback(() => {
    webViewRef.current?.injectJavaScript(`
      if (window.setAddressMapPosition) {
        window.setAddressMapPosition(${centerLng}, ${centerLat}, ${pinLng}, ${pinLat});
      }
      true;
    `);
  }, [centerLng, centerLat, pinLng, pinLat]);

  useEffect(() => {
    syncMapPosition();
  }, [syncMapPosition]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (!isMapMessage(message)) return;

      if (message.type === 'ready') {
        syncMapPosition();
      } else if (message.type === 'pinChange') {
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
    <WebView<unknown>
      ref={webViewRef}
      style={styles.map}
      source={source}
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
