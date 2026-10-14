import { Platform, RefreshControl, type RefreshControlProps } from 'react-native';
import { colors } from '@/theme/colors';

export function AppRefreshControl({
  refreshing,
  onRefresh,
  enabled = true,
  onPrimary = false,
  children,
  style,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  enabled?: boolean;
  /** Keeps the iOS spinner visible when the top of the screen is blue. */
  onPrimary?: boolean;
  children?: React.ReactNode;
  style?: RefreshControlProps['style'];
}) {
  const indicatorColor = onPrimary && Platform.OS === 'ios' ? '#fff' : colors.primary;

  // Web ScrollView injects its content and layout into this wrapper.
  // Forward both so the screen remains visible and fills its viewport.
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      enabled={enabled}
      colors={[indicatorColor]}
      tintColor={indicatorColor}
      progressBackgroundColor="#fff"
      accessibilityLabel="Refresh content"
      style={style}
    >
      {children}
    </RefreshControl>
  );
}
