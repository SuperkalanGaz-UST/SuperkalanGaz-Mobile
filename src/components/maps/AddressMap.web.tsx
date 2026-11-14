import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { colors } from '@/theme/colors';
import { createMapHtml, isMapMessage, type AddressMapProps } from './addressMapDocument';

export function AddressMap({ center, pin, onPinChange }: AddressMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [html] = useState(() => createMapHtml(center, pin));
  const { longitude: centerLng, latitude: centerLat } = center;
  const { longitude: pinLng, latitude: pinLat } = pin;

  const syncPosition = useCallback(() => {
    // The sandbox gives srcDoc an opaque origin. Send only map coordinates.
    frame.current?.contentWindow?.postMessage({
      type: 'addressMapPosition', centerLng, centerLat, pinLng, pinLat,
    }, '*');
  }, [centerLng, centerLat, pinLng, pinLat]);
  const receiveMapMessage = useEffectEvent((event: MessageEvent<unknown>) => {
    if (event.origin !== 'null' || event.source !== frame.current?.contentWindow || !isMapMessage(event.data)) return;
    if (event.data.type === 'ready') syncPosition();
    if (event.data.type === 'pinChange') {
      onPinChange({ latitude: event.data.latitude, longitude: event.data.longitude });
    }
  });

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => receiveMapMessage(event);
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  useEffect(syncPosition, [syncPosition]);

  return (
    <iframe
      ref={frame}
      title="Delivery location map"
      sandbox="allow-scripts allow-popups"
      srcDoc={html}
      style={{ display: 'block', border: 0, width: '100%', height: '100%', backgroundColor: colors.redeemPale }}
    />
  );
}
