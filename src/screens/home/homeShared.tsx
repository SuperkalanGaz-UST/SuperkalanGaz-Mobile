import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const logo = require('../../../assets/images/superkalan-gaz.png');
const navCylinder = require('../../../assets/images/gas-cylinder nav button.png');

/** Product photos, keyed by cylinder size (added under assets/images). */
const CYLINDER_IMAGES: Record<string, ReturnType<typeof require>> = {
  '2.7 KG': require('../../../assets/images/2.7kg.png'),
  '5 KG': require('../../../assets/images/5kg.png'),
  '11 KG': require('../../../assets/images/11kg.png'),
  '22 KG': require('../../../assets/images/22kg.png'),
  '50 KG': require('../../../assets/images/50kg.png'),
};

/** Quick Order catalogue (Figma). */
const PRODUCTS: { size: string; desc: string }[] = [
  {
    size: '2.7 KG',
    desc: 'Our most portable variant and ideal for outdoor use, serving the Filipino consumer for over 30 years. The most affordable, easy to use product for those shifting to our clean burning LPG cooking gas.',
  },
  { size: '5 KG', desc: 'Lighter weight, lower priced alternative to our 11kg variant for smaller families.' },
  { size: '11 KG', desc: 'The standard size for the average Filipino home.' },
  { size: '22 KG', desc: 'Typically used in bakeries and small-medium restaurants/food outlets.' },
  {
    size: '50 KG',
    desc: 'Ideal for large restaurants, laundry business, poultry farms, hotels, factories and other commercial establishments.',
  },
];

/** Previous purchases surfaced under "Order again". */
const REORDERS: { size: string; date: string }[] = [
  { size: '11 KG', date: '10-10-2025' },
  { size: '2.7 KG', date: '10-20-2024' },
  { size: '11 KG', date: '09-02-2024' },
];

/** A cylinder product photo, scaled to fit (contain) inside a w×h box. */
export function Cylinder({ size, w, h }: { size: string; w: number; h: number }) {
  const source = CYLINDER_IMAGES[size];
  if (!source) return null;
  return <Image source={source} style={{ width: w, height: h }} resizeMode="contain" />;
}

/**
 * The gradient loyalty card shell shared by both home screens (Figma). Title +
 * logo header, a body (points balance or exchange progress), and the Details /
 * Claim Reward button row — so Household and Commercial read as one product.
 */
export function LoyaltyCard({
  title,
  children,
  claimLabel = 'Claim Reward',
  onDetails,
  onClaim,
}: {
  title: string;
  children: ReactNode;
  claimLabel?: string;
  onDetails?: () => void;
  onClaim?: () => void;
}) {
  return (
    <LinearGradient
      colors={[colors.pointsTop, colors.pointsBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.loyaltyCard}
    >
      {/* Logo occupies the right of the card, vertically centered over the number. */}
      <Image source={logo} style={styles.loyaltyLogo} resizeMode="contain" />
      <View style={styles.loyaltyTopRow}>
        <Text style={styles.loyaltyTitle}>{title}</Text>
      </View>
      {children}
      <View style={styles.loyaltyBtnRow}>
        <Pressable onPress={onDetails} style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressedDim]}>
          <Text style={styles.detailsBtnText}>Details</Text>
        </Pressable>
        <Pressable onPress={onClaim} style={({ pressed }) => [styles.claimBtn, pressed && styles.pressedDim]}>
          <Text style={styles.claimBtnText}>{claimLabel}</Text>
          <Feather name="chevron-right" size={16} color={colors.heading} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

/**
 * Home layout scaffold shared by Household and Commercial: blue header greeting,
 * the account's loyalty card, Active Orders, Order again, Quick Order, and the
 * bottom tab bar. Only `loyaltyCard` differs between the two account types.
 *
 * SCAFFOLD: orders/reorders below are placeholders matching the design — wire to
 * the shared API (src/lib/api.ts) when the endpoints land. Tabs are visual until
 * React Navigation arrives; the menu icon + Profile tab sign out so account types
 * can be switched while testing.
 */
export function HomeScaffold({
  firstName,
  loyaltyCard,
  onSignOut,
}: {
  firstName: string;
  loyaltyCard: ReactNode;
  onSignOut: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        {/* Blue header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>
                Hello, <Text style={styles.helloName}>{firstName}!</Text>
              </Text>
              <Text style={styles.subGreeting}>What can we do for you today?</Text>
            </View>
            <Pressable hitSlop={8} style={styles.headerIcon} accessibilityLabel="Help">
              <Feather name="help-circle" size={24} color="#FFFFFF" />
            </Pressable>
            <Pressable hitSlop={8} style={styles.headerIcon} onPress={onSignOut} accessibilityLabel="Menu">
              <Feather name="menu" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* White rounded sheet */}
        <View style={styles.sheet}>
          {loyaltyCard}

          {/* Active Orders */}
          <Text style={styles.sectionTitle}>Active Orders</Text>
          <View style={styles.activeCard}>
            <View style={styles.activeBody}>
              <Cylinder size="11 KG" w={80} h={112} />
              <View style={styles.activeInfo}>
                <Text style={styles.activeSize}>11 KG</Text>
                <Text style={styles.activeQty}>Qty: 2</Text>
                <Text style={styles.activePrice}>₱ 1,000</Text>
              </View>
            </View>
            <Pressable style={({ pressed }) => [styles.activeFooter, pressed && styles.pressedDim]}>
              <Text style={styles.activeFooterText}>View Order Details</Text>
            </Pressable>
          </View>

          {/* Order again */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Order again</Text>
            <Feather name="chevron-right" size={22} color={colors.primary} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reorderRow}>
            {REORDERS.map((r, i) => (
              <Pressable key={i} style={({ pressed }) => [styles.reorderCard, pressed && styles.pressedDim]}>
                <Text style={styles.reorderDate} numberOfLines={1}>Order Date: {r.date}</Text>
                <View style={styles.reorderBody}>
                  <Cylinder size={r.size} w={60} h={78} />
                  <Text style={styles.reorderSize}>{r.size}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {/* Quick Order */}
          <Text style={styles.sectionTitle}>Quick Order</Text>
          {PRODUCTS.map((p) => (
            <Pressable key={p.size} style={({ pressed }) => [styles.productCard, pressed && styles.pressedDim]}>
              <View style={styles.productLeft}>
                <Text style={styles.productSize}>{p.size}</Text>
                <Cylinder size={p.size} w={72} h={76} />
              </View>
              <Text style={styles.productDesc}>{p.desc}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 10 }]}>
        <TabItem icon="home" label="Home" active />
        <TabItem icon="gift" label="Rewards" />
        <View style={styles.fabSlot}>
          <Pressable style={styles.fab} accessibilityLabel="Order gas">
            <Image source={navCylinder} style={styles.fabIcon} resizeMode="contain" />
          </Pressable>
        </View>
        <TabItem icon="shopping-bag" label="Orders" />
        <TabItem icon="user" label="Profile" onPress={onSignOut} />
      </View>
    </View>
  );
}

function TabItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const tint = active ? colors.primary : colors.navInactive;
  return (
    <Pressable style={styles.tabItem} onPress={onPress} hitSlop={6}>
      <Feather name={icon} size={22} color={tint} />
      <Text style={[styles.tabLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

// Figma: 0px 4px 4px rgba(0,0,0,0.25) on the cards.
const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 4,
};

// Horizontal content inset shared by the Active Orders card body and footer.
const CARD_INSET = 16;

/** Shared across both home screens. Loyalty-card body styles live per-screen. */
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.primary },
  pressedDim: { opacity: 0.85 },

  // Header (Figma: greeting 24/700, subtitle 12/500, both #FCFEFF)
  header: { backgroundColor: colors.primary, paddingHorizontal: 26, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  hello: { fontSize: 24, fontFamily: fonts.bold, color: '#FCFEFF' },
  helloName: { color: colors.helloAccent },
  subGreeting: { fontSize: 12, fontFamily: fonts.medium, color: '#FCFEFF', marginTop: 2 },
  headerIcon: { marginLeft: 16, paddingTop: 4 },

  // White sheet (Figma: borderRadius 30)
  sheet: {
    backgroundColor: colors.homeSheet,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -8,
    paddingHorizontal: 21,
    paddingTop: 16,
    minHeight: 600,
  },

  // Points/exchange card (Figma: 158 tall, radius 10, vertical gradient)
  loyaltyCard: { borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, ...cardShadow },
  loyaltyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loyaltyTitle: { flex: 1, fontSize: 13, fontFamily: fonts.medium, color: '#FFFFFF' },
  loyaltyLogo: { position: 'absolute', right: 19, top: '50%', width: 109, height: 72, transform: [{ translateY: -36 }], tintColor: '#FFFFFF' },
  loyaltyBtnRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  detailsBtn: {
    paddingHorizontal: 20,
    height: 24,
    borderRadius: 5,
    backgroundColor: colors.detailsBtn,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  detailsBtnText: { fontSize: 12, fontFamily: fonts.regular, color: '#FFFFFF' },
  claimBtn: {
    flex: 1,
    height: 24,
    borderRadius: 5,
    backgroundColor: colors.claimBtn,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...cardShadow,
  },
  claimBtnText: { fontSize: 12, fontFamily: fonts.medium, color: colors.heading },

  // Section headers (Figma: 20/600, #007BC1)
  sectionTitle: { fontSize: 20, fontFamily: fonts.semibold, color: colors.primary, marginTop: 24, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 2 },

  // Active order (Figma: radius 10, 1px #EAEAEA, footer #E5F2F9)
  activeCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.activeCardBorder,
    overflow: 'hidden',
    ...cardShadow,
  },
  activeBody: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: CARD_INSET, gap: 12 },
  activeInfo: { flex: 1, alignItems: 'center' },
  activeSize: { fontSize: 20, fontFamily: fonts.semibold, color: colors.label },
  activeQty: { fontSize: 12, fontFamily: fonts.medium, color: '#7D7F7E', marginTop: 2 },
  activePrice: { fontSize: 20, fontFamily: fonts.semibold, color: colors.primary, marginTop: 16 },
  activeFooter: { backgroundColor: colors.activeFooter, paddingVertical: 5, paddingHorizontal: CARD_INSET, alignItems: 'flex-start' },
  activeFooterText: { fontSize: 10, fontFamily: fonts.semibold, color: colors.heading },

  // Order again (Figma: 172x101 card, radius 10, 1px #007BC1)
  reorderRow: { gap: 12, paddingVertical: 2, paddingRight: 8 },
  reorderCard: {
    width: 172,
    height: 101,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: 12,
  },
  reorderDate: { position: 'absolute', top: 10, right: 12, fontSize: 7, fontFamily: fonts.medium, color: '#989898' },
  reorderBody: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  reorderSize: { fontSize: 20, fontFamily: fonts.semibold, color: colors.heading },

  // Quick Order (Figma: radius 10, 2px #007BC1, 90 tall)
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    minHeight: 91,
    gap: 10,
  },
  productLeft: { width: 96, alignItems: 'center' },
  productSize: { fontSize: 14, fontFamily: fonts.semibold, color: colors.heading, alignSelf: 'flex-start', marginBottom: 2 },
  productDesc: { flex: 1, fontSize: 10, fontFamily: fonts.light, color: colors.heading, lineHeight: 14, textAlign: 'center' },

  // Bottom tab bar (Figma: white, active #007BC1, inactive #9DB2CE)
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: colors.homeSheet,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 12, fontFamily: fonts.medium },
  fabSlot: { width: 72, alignItems: 'center' },
  fabIcon: { width: 26, height: 37 },
  fab: {
    width: 55,
    height: 55,
    borderRadius: 50,
    marginTop: -26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.homeSheet,
    ...cardShadow,
  },
});
