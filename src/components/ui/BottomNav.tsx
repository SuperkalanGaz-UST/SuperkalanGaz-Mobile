import type { Ref } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { navShadow } from '@/theme/metrics';
import { images } from '@/lib/assets';
import { useActiveOrderCount } from '@/hooks/useActiveOrderCount';
import type { MainScreen, MainTab } from '@/navigation/types';

type FeatherName = keyof typeof Feather.glyphMap;

const TABS: { key: MainTab; label: string; icon: FeatherName; screen: MainScreen }[] = [
  { key: 'home', label: 'Home', icon: 'home', screen: 'home' },
  { key: 'rewards', label: 'Rewards', icon: 'gift', screen: 'rewards' },
  { key: 'orders', label: 'History', icon: 'clipboard', screen: 'orders' },
  { key: 'more', label: 'More', icon: 'more-horizontal', screen: 'more' },
];

/**
 * Floating bottom tab bar with a raised Order action (DESIGN.md §7). The four
 * destination tabs tint `primary` when active and `navInactive` otherwise.
 */
export function BottomNav({
  active,
  onNavigate,
  guideRef,
}: {
  active: MainTab;
  onNavigate: (screen: MainScreen, opts?: { tab?: MainTab }) => void;
  guideRef?: Ref<ViewInstance>;
}) {
  const insets = useSafeAreaInsets();
  const activeOrderCount = useActiveOrderCount();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const renderTab = (t: (typeof TABS)[number]) => {
    const on = active === t.key;
    const color = on ? colors.primary : colors.navInactive;
    // History shows a red count bubble while the customer has orders in progress.
    const badge = t.key === 'orders' && activeOrderCount > 0
      ? (activeOrderCount > 9 ? '9+' : String(activeOrderCount))
      : null;
    return (
      <Pressable
        key={t.key}
        accessibilityRole="button"
        accessibilityLabel={badge
          ? `${t.label}, ${activeOrderCount} active ${activeOrderCount === 1 ? 'order' : 'orders'}`
          : t.label}
        accessibilityState={{ selected: on }}
        style={styles.tab}
        onPress={() => onNavigate(t.screen, { tab: t.key })}
      >
        <View>
          <Feather name={t.icon} size={20} color={color} />
          {badge && (
            <View testID="history-badge" style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, { color, fontFamily: on ? fonts.bold : fonts.regular }]}>
          {t.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View ref={guideRef} collapsable={false} style={[styles.wrap, { bottom: insets.bottom + 6 }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {left.map(renderTab)}
        <View style={styles.fabSlot} />
        {right.map(renderTab)}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Order"
        style={styles.fabAction}
        onPress={() => onNavigate('order-process')}
      >
        <View style={styles.fabCircle}>
          <Image source={images.orderBag} style={styles.fabIcon} resizeMode="contain" />
        </View>
        <Text style={styles.fabLabel}>Order</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, paddingTop: 21, alignItems: 'center' },
  bar: {
    width: '100%',
    height: 64,
    backgroundColor: colors.navBarFill,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...navShadow,
  },
  tab: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 10 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.navBarFill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, lineHeight: 11, color: '#fff' },
  fabSlot: { width: 58 },
  fabAction: {
    position: 'absolute',
    alignSelf: 'center',
    top: 0,
    width: 58,
    alignItems: 'center',
  },
  fabCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...navShadow,
  },
  fabLabel: {
    marginTop: 3,
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.primary,
  },
  fabIcon: { width: 24, height: 34 },
});
