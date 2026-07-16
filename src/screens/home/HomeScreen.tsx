import { useRef, useState } from 'react';
import {
  Image,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { cylinderFor, images } from '@/lib/assets';
import { AppHeader } from '@/components/ui/AppHeader';
import { BottomNav } from '@/components/ui/BottomNav';
import { SideMenu } from '@/components/ui/SideMenu';
import { AppGuideOverlay, GUIDE_STEP_COUNT, type GuideRect } from '@/components/ui/AppGuide';
import { LogoutConfirmModal, PromoModal } from '@/components/ui/overlays';
import { RewardsScreen } from '@/screens/home/RewardsScreen';
import type { MainScreen, MainTab } from '@/navigation/types';

/**
 * Customer Home (Figma "Homepage"): points card, active order, reorder rail and
 * the quick-order catalog. The Rewards tab swaps the body for the Rewards surface
 * while keeping this header + bottom nav.
 *
 * SCAFFOLD: greeting name, points, and orders are Figma mock data — wire to the
 * session profile + SRD/LPM endpoints (AGENTS.md) when available.
 */
const QUICK_ORDER = [
  { size: '2.7 KG', desc: 'Our most portable variant and ideal for outdoor use. Great for camping, travel, and small cooking tasks.' },
  { size: '5 KG', desc: "Lighter weight, lower priced alternative that's perfect for small families and budget-conscious households." },
  { size: '11 KG', desc: 'The standard size for the average Filipino home. Best value for daily cooking needs.' },
  { size: '22 KG', desc: 'Typically used in bakeries and small-medium restaurants that require higher gas consumption.' },
  { size: '50 KG', desc: 'Ideal for large restaurants, laundry business, and commercial establishments with heavy usage.' },
];
const ORDER_AGAIN = [
  { size: '11 KG', date: '10-10-2025' },
  { size: '2.7 KG', date: '10-20-2024' },
  { size: '11 KG', date: '10-10-2025' },
];

// App-guide step → the Home element it spotlights (null = full dim). Kept in sync
// with the copy in `AppGuide.tsx` STEPS by index.
const GUIDE_TARGETS = [null, 'rewards', 'active', 'reorder', 'quick', 'nav', 'help'] as const;

/** Minimal instance shape we need off a ref, given the degraded RN types. */
type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

export function HomeScreen({
  initialTab = 'home',
  showGuide = false,
  onNavigate,
}: {
  initialTab?: MainTab;
  showGuide?: boolean;
  onNavigate: (screen: MainScreen, opts?: { tab?: MainTab }) => void;
}) {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [rewardsSub, setRewardsSub] = useState<'my' | 'all'>('my');
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [guideOpen, setGuideOpen] = useState(showGuide);
  const [guideStep, setGuideStep] = useState(0);
  const [guideRect, setGuideRect] = useState<GuideRect | null>(null);
  const [promoOpen, setPromoOpen] = useState(true);

  // Refs + content-relative offsets for the app-guide spotlight measurements.
  const scrollRef = useRef<ScrollView>(null);
  const rewardsRef = useRef<View>(null);
  const activeRef = useRef<View>(null);
  const reorderRef = useRef<View>(null);
  const quickRef = useRef<View>(null);
  const helpRef = useRef<View>(null);
  const layoutY = useRef<Record<string, number>>({});
  const refFor = { rewards: rewardsRef, active: activeRef, reorder: reorderRef, quick: quickRef };

  const openRewards = (sub: 'my' | 'all') => {
    setRewardsSub(sub);
    setActiveTab('rewards');
  };

  // The bottom nav is fixed, so its rect is computed rather than measured.
  const navRect = (): GuideRect => ({ x: 16, y: winH - insets.bottom - 10 - 68, width: winW - 32, height: 68 });

  const scrollTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  // Measure a ref's real window rect (after `delay` so any scroll settles) and set
  // it as the spotlight. A 16px side inset keeps the box off the screen edges.
  const applyRect = (ref: { current: unknown }, delay: number) => {
    setTimeout(() => {
      (ref.current as Measurable | null)?.measureInWindow((x, wy, w, h) => {
        const nx = Math.max(x, 16);
        const nw = Math.min(x + w, winW - 16) - nx;
        setGuideRect({ x: nx, y: wy, width: nw, height: h });
      });
    }, delay);
  };

  // Move each step's target into view, then spotlight it. Chrome steps (welcome,
  // nav, help) scroll to the top; content steps scroll to the element. Runs on
  // both Next and Back, so going back also scrolls onto the assigned spotlight.
  const prepareStep = (i: number) => {
    const key = GUIDE_TARGETS[i];
    if (!key) {
      scrollTop();
      setGuideRect(null);
      return;
    }
    if (key === 'nav') {
      scrollTop();
      setGuideRect(navRect());
      return;
    }
    if (key === 'help') {
      scrollTop();
      applyRect(helpRef, 80); // header is fixed — no need to wait for a scroll
      return;
    }
    const y = layoutY.current[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 28), animated: true });
    applyRect(refFor[key], 340);
  };

  const openGuide = () => {
    setActiveTab('home');
    setGuideStep(0);
    setGuideRect(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setGuideOpen(true);
  };
  const guideNext = () => {
    if (guideStep >= GUIDE_STEP_COUNT - 1) return setGuideOpen(false);
    const n = guideStep + 1;
    setGuideStep(n);
    prepareStep(n);
  };
  const guideBack = () => {
    const p = Math.max(0, guideStep - 1);
    setGuideStep(p);
    prepareStep(p);
  };

  const captureY = (key: string) => (e: LayoutChangeEvent) => {
    layoutY.current[key] = e.nativeEvent.layout.y;
  };

  return (
    <View style={styles.flex}>
      <AppHeader helpRef={helpRef} onHelp={openGuide} onMenu={() => setMenuOpen(true)} />

      {activeTab === 'rewards' ? (
        <RewardsScreen initialSub={rewardsSub} onExit={() => setActiveTab('home')} />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.sheet}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 130 }}
        >
          {/* Points card */}
          <View ref={rewardsRef} onLayout={captureY('rewards')} style={styles.pointsWrap}>
            <LinearGradient colors={[colors.pointsTop, colors.pointsBottom] as const} style={styles.pointsCard}>
              <Image source={images.logo} style={styles.pointsLogo} resizeMode="contain" />
              <Text style={styles.pointsLabel}>Superkalan Gaz Points</Text>
              <Text style={styles.pointsValue}>163</Text>
              <View style={styles.pointsBtnRow}>
                <Pressable style={styles.detailsBtn} onPress={() => openRewards('my')}>
                  <Text style={styles.detailsText}>Details</Text>
                </Pressable>
                <Pressable style={styles.claimBtn} onPress={() => openRewards('all')}>
                  <Text style={styles.claimText}>Claim Reward</Text>
                  <Feather name="chevron-right" size={14} color={colors.heading} />
                </Pressable>
              </View>
            </LinearGradient>
          </View>

          {/* Active Orders */}
          <View style={styles.section} onLayout={captureY('active')}>
            <Text style={styles.sectionTitle}>Active Orders</Text>
            <Pressable ref={activeRef} style={styles.activeCard} onPress={() => onNavigate('orders', { tab: 'orders' })}>
              <View style={styles.activeBody}>
                <Image source={cylinderFor('11 KG')} style={styles.activeCyl} resizeMode="contain" />
                <View style={styles.activeInfo}>
                  <Text style={styles.cylSize}>11 KG</Text>
                  <Text style={styles.cylQty}>Qty: 2</Text>
                  <Text style={styles.cylPrice}>₱ 1,000</Text>
                </View>
              </View>
              <View style={styles.activeFooter}>
                <Text style={styles.activeFooterText}>View Order Details</Text>
              </View>
            </Pressable>
          </View>

          {/* Order again */}
          <View ref={reorderRef} style={{ marginTop: 20 }} onLayout={captureY('reorder')}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Order again</Text>
              <Feather name="chevron-right" size={20} color={colors.primary} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reorderRow}>
              {ORDER_AGAIN.map((item, idx) => (
                <Pressable key={idx} style={styles.reorderCard} onPress={() => onNavigate('order-process')}>
                  <Text style={styles.reorderDate}>Order Date: {item.date}</Text>
                  <Image source={cylinderFor(item.size)} style={styles.reorderCyl} resizeMode="contain" />
                  <Text style={styles.reorderSize}>{item.size}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Quick Order */}
          <View style={styles.section} onLayout={captureY('quick')}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Quick Order</Text>
            {QUICK_ORDER.map((p, idx) => (
              <Pressable
                key={idx}
                ref={idx === 0 ? quickRef : undefined}
                style={styles.quickCard}
                onPress={() => onNavigate('order-process')}
              >
                <View style={styles.quickLeft}>
                  <Text style={styles.quickSize}>{p.size}</Text>
                  <Image source={cylinderFor(p.size)} style={styles.quickCyl} resizeMode="contain" />
                </View>
                <Text style={styles.quickDesc}>{p.desc}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <BottomNav
        active={activeTab}
        onNavigate={(screen, opts) => {
          if (screen === 'home') setActiveTab(opts?.tab ?? 'home');
          else onNavigate(screen, opts);
        }}
      />

      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onProfile={() => onNavigate('profile', { tab: 'profile' })}
        onOrders={() => onNavigate('orders', { tab: 'orders' })}
        onFaqs={() => onNavigate('faqs')}
        onGuide={openGuide}
        onLogout={() => setLogoutConfirm(true)}
      />

      <LogoutConfirmModal
        visible={logoutConfirm}
        onConfirm={() => {
          setLogoutConfirm(false);
          signOut();
        }}
        onCancel={() => setLogoutConfirm(false)}
      />

      <PromoModal visible={promoOpen && !guideOpen && activeTab === 'home'} onClose={() => setPromoOpen(false)} />
      <AppGuideOverlay
        visible={guideOpen}
        step={guideStep}
        rect={guideRect}
        onNext={guideNext}
        onBack={guideBack}
        onClose={() => setGuideOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24 },

  pointsWrap: { marginHorizontal: 16, marginTop: 16 },
  pointsCard: { height: 158, borderRadius: radii.card, padding: 16, ...cardShadow },
  pointsLogo: { position: 'absolute', right: 44, top: 22, width: 110, height: 80, tintColor: 'rgba(255,255,255,0.9)' },
  pointsLabel: { fontFamily: fonts.medium, fontSize: 13, color: '#fff' },
  pointsValue: { fontFamily: fonts.semibold, fontSize: 40, color: '#fff', flex: 1, textAlignVertical: 'center', marginTop: 8 },
  pointsBtnRow: { flexDirection: 'row', gap: 8 },
  detailsBtn: { backgroundColor: colors.detailsBtn, borderRadius: radii.chip, paddingHorizontal: 16, paddingVertical: 4, justifyContent: 'center' },
  detailsText: { fontFamily: fonts.regular, fontSize: 12, color: '#fff' },
  claimBtn: { flex: 1, backgroundColor: colors.claimBtn, borderRadius: radii.chip, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  claimText: { fontFamily: fonts.medium, fontSize: 12, color: colors.heading },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.primary, marginBottom: 12 },

  activeCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.activeCardBorder, borderRadius: radii.card, overflow: 'hidden', ...cardShadow },
  activeBody: { flexDirection: 'row', alignItems: 'center' },
  activeCyl: { width: 72, height: 110, marginLeft: 36, marginRight: 8 },
  activeInfo: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2 },
  cylSize: { fontFamily: fonts.semibold, fontSize: 20, color: colors.label },
  cylQty: { fontFamily: fonts.medium, fontSize: 12, color: colors.grayText },
  cylPrice: { fontFamily: fonts.semibold, fontSize: 20, color: colors.primary },
  activeFooter: { height: 22, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: colors.activeFooter },
  activeFooterText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.heading },

  reorderRow: { gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  reorderCard: { width: 172, height: 101, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary, borderRadius: radii.card, justifyContent: 'center' },
  reorderDate: { position: 'absolute', top: 6, right: 8, fontFamily: fonts.regular, fontSize: 7, color: colors.muted },
  reorderCyl: { position: 'absolute', left: 16, top: 14, width: 56, height: 78 },
  reorderSize: { position: 'absolute', right: 20, fontFamily: fonts.semibold, fontSize: 20, color: colors.heading },

  quickCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: colors.primary, borderRadius: radii.card, marginTop: 12, minHeight: 91, overflow: 'hidden', ...cardShadow },
  quickLeft: { width: 110, paddingLeft: 18, paddingRight: 4, paddingVertical: 8, alignSelf: 'stretch', justifyContent: 'space-between' },
  quickSize: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  quickCyl: { width: 56, height: 68, alignSelf: 'center' },
  quickDesc: { flex: 1, paddingRight: 12, paddingVertical: 12, fontFamily: fonts.light, fontSize: 9, color: colors.heading, lineHeight: 14 },
});
