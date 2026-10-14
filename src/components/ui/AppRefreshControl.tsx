import { Platform, RefreshControl } from 'react-native';
import { colors } from '@/theme/colors';

export function AppRefreshControl({
  refreshing,
  onRefresh,
  enabled = true,
  onPrimary = false,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  enabled?: boolean;
  /** Keeps the iOS spinner visible when the top of the screen is blue. */
  onPrimary?: boolean;
}) {
  const indicatorColor = onPrimary && Platform.OS === 'ios' ? '#fff' : colors.primary;

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      enabled={enabled}
      colors={[indicatorColor]}
      tintColor={indicatorColor}
      progressBackgroundColor="#fff"
      accessibilityLabel="Refresh content"
    />
  );
}
