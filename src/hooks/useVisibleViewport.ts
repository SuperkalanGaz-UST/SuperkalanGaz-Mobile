import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

function readViewport() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const viewport = window.visualViewport;
  if (!viewport) return null;
  return {
    x: viewport.offsetLeft,
    y: viewport.offsetTop,
    width: viewport.width,
    height: viewport.height,
  };
}

export function useVisibleViewport(enabled: boolean) {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;
    const visualViewport = window.visualViewport;
    const update = () => setViewport(readViewport());
    update();
    visualViewport?.addEventListener('resize', update);
    visualViewport?.addEventListener('scroll', update);
    return () => {
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
    };
  }, [enabled]);

  return viewport;
}
