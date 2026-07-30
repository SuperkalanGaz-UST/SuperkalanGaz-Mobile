import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { navShadow } from '@/theme/metrics';
import { images } from '@/lib/assets';
import type { MainScreen, MainTab } from '@/navigation/types';

type FeatherName = keyof typeof Feather.glyphMap;

const TABS: { key: MainTab; label: string; icon: FeatherName; screen: MainScreen }[] = [
  { key: 'home', label: 'Home', icon: 'home', screen: 'home' },
  { key: 'rewards', label: 'Rewards', icon: 'gift', screen: 'home' },
  { key: 'orders', label: 'Orders', icon: 'clipboard', screen: 'orders' },
  { key: 'more', label: 'More', icon: 'more-horizontal', screen: 'more' },
];

/**
 * Floating bottom tab bar with a central order FAB (DESIGN.md §7). Four tabs tint
 * `primary` when active, `navInactive` otherwise. The FAB opens the order flow.
 */
export function BottomNav({
  active,
  onNavigate,
}: {
  active: MainTab;
  onNavigate: (screen: MainScreen, opts?: { tab?: MainTab }) => void;
}) {
  const insets = useSafeAreaInsets();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const renderTab = (t: (typeof TABS)[number]) => {
    const on = active === t.key;
    const color = on ? colors.primary : colors.navInactive;
    return (
      <Pressable
        key={t.key}
        style={styles.tab}
        onPress={() => onNavigate(t.screen, { tab: t.key })}
      >
        <Feather name={t.icon} size={20} color={color} />
        <Text style={[styles.tabLabel, { color, fontFamily: on ? fonts.bold : fonts.regular }]}>
          {t.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 6 }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {left.map(renderTab)}
        <View style={styles.fabSlot} />
        {right.map(renderTab)}
      </View>
      <Pressable style={styles.fab} onPress={() => onNavigate('order-process')}>
        <Image source={images.orderBag} style={styles.fabIcon} resizeMode="contain" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
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
  tab: { alignItems: 'center', gap: 3, width: 64 },
  tabLabel: { fontSize: 10 },
  fabSlot: { width: 58 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -21,
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
  fabIcon: { width: 24, height: 34 },
});
