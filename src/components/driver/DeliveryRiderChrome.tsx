import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { navShadow } from '@/theme/metrics';

export type DeliveryRiderTab = 'home' | 'delivery' | 'profile';

const tabs: Array<{
  key: DeliveryRiderTab;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'delivery', label: 'Delivery', icon: 'package' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

export function DeliveryRiderHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.headerButton} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={colors.surface} />
        </Pressable>
      ) : (
        <View style={styles.brandMark}>
          <Feather name="truck" size={19} color={colors.primary} />
        </View>
      )}
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.rolePill}>
        <Text style={styles.roleText}>DR</Text>
      </View>
    </View>
  );
}

export function DeliveryRiderBottomNav({
  active,
  onChange,
}: {
  active: DeliveryRiderTab;
  onChange: (tab: DeliveryRiderTab) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navWrap, { bottom: insets.bottom + 7 }]}>
      <View style={styles.navBar}>
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const color = selected ? colors.primary : colors.navInactive;
          return (
            <Pressable key={tab.key} style={styles.navItem} onPress={() => onChange(tab.key)}>
              <Feather name={tab.icon} size={20} color={color} />
              <Text style={[styles.navText, { color }, selected && styles.navTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 18, backgroundColor: colors.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.surface },
  headerSubtitle: { fontFamily: fonts.regular, fontSize: 10, color: '#D9F0FF', marginTop: 2 },
  rolePill: { minWidth: 36, height: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  roleText: { fontFamily: fonts.bold, fontSize: 11, color: colors.surface },
  navWrap: { position: 'absolute', left: 18, right: 18 },
  navBar: { height: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 25, backgroundColor: colors.surface, ...navShadow },
  navItem: { minWidth: 80, alignItems: 'center', gap: 4 },
  navText: { fontFamily: fonts.regular, fontSize: 10 },
  navTextActive: { fontFamily: fonts.bold },
});
