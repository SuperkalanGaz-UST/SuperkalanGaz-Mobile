import { useCallback, useEffect, useRef, useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { formatPeso, usePricing } from '@/contexts/PricingContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cylinderFor } from '@/lib/assets';
import { apiFetch } from '@/lib/api';
import { AppHeader } from '@/components/ui/AppHeader';
import { BottomNav } from '@/components/ui/BottomNav';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { AppGuideOverlay, GUIDE_STEP_COUNT, type GuideRect } from '@/components/ui/AppGuide';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RewardsScreen } from '@/screens/home/RewardsScreen';
import type { MainNavigateOptions, MainScreen, MainTab } from '@/navigation/types';

/**
 * Customer Home: integrated loyalty hero, delivery progress, and borderless
 * reorder shelf. The Rewards tab swaps the body for the Rewards surface
 * while keeping this header + bottom nav.
 *
 * Greeting, Service Request milestones, and the account's track-specific loyalty
 * summary are loaded from the authenticated session and NestJS API.
 */
// App-guide step → the Home element it spotlights (null = full dim). Kept in sync
// with the copy in `AppGuide.tsx` STEPS by index.
const GUIDE_TARGETS = [null, 'rewards', 'active', 'reorder', 'quick', 'nav', 'help'] as const;

/** Minimal instance shape we need off a ref, given the degraded RN types. */
type Measurable = { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };

type LoyaltyCatalogItem = { id: string; branch_id: string; name: string; points_cost: number };
type HouseholdAccountRow = { branch_id: string; points_balance: number };
type HouseholdHistoryRow = { id: string; type: string; points_delta: number; created_at: string };
type LoyaltyRedemptionRow = {
  id: string;
  catalog_item_name: string | null;
  points_spent: number | null;
  redemption_code: string | null;
  status: string;
};
type CommercialAccountRow = {
  branch_id: string;
  branch_name: string | null;
  current_cycle_count: number;
  completed_cycles: number;
};
type CommercialPurchaseRow = {
  id: string;
  service_request_id: string;
  cycle_number: number;
  counted_at: string;
  created_at: string;
};
type CustomerLoyaltyPayload = {
  points_balance?: number;
  household_transactions?: HouseholdHistoryRow[];
  household_accounts?: HouseholdAccountRow[];
  commercial_accounts?: CommercialAccountRow[];
  commercial_purchases?: CommercialPurchaseRow[];
  active_redemptions?: LoyaltyRedemptionRow[];
};

function uniqueCatalogItems(items: LoyaltyCatalogItem[]): LoyaltyCatalogItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.branch_id}:${item.name.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function HomeScreen({
  initialTab = 'home',
  showGuide = false,
  onNavigate,
}: {
  initialTab?: MainTab;
  showGuide?: boolean;
  onNavigate: (screen: MainScreen, opts?: MainNavigateOptions) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { accountType, session } = useAuth();
  const { prices, loading: pricesLoading, error: pricesError, refresh: refreshPrices } = usePricing();
  const { refreshing, onRefresh } = usePullToRefresh(refreshPrices);
  const priceLabel = (cylinderSize: '11kg' | '2.7kg') => {
    const price = prices[cylinderSize];
    if (price !== undefined) return formatPeso(price);
    if (pricesLoading) return 'Loading price…';
    return 'Tap to retry';
  };
  const orderAgain = [
    { size: '11 KG', price: priceLabel('11kg') },
    { size: '2.7 KG', price: priceLabel('2.7kg') },
  ];

  // Fetch real active order from the API
  type ActiveOrderRow = {
    id: string;
    status: string;
    cylinder_size: string;
    quantity: number;
  };
  const [activeOrder, setActiveOrder] = useState<ActiveOrderRow | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`/service-requests/me?_t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        const orders: ActiveOrderRow[] = data.serviceRequests ?? [];
        const active = orders.find(
          (o) => o.status === 'Pending' || o.status === 'Dispatched' || o.status === 'En Route',
        );
        setActiveOrder(active ?? null);
      } catch {
        // ignore
      }
    };
    void load();
    // Poll every 10s so the card updates in near-real-time
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Sync Loyalty State
  const [points, setPoints] = useState(0);
  const [catalog, setCatalog] = useState<LoyaltyCatalogItem[]>([]);
  const [history, setHistory] = useState<HouseholdHistoryRow[]>([]);
  const [householdAccounts, setHouseholdAccounts] = useState<HouseholdAccountRow[]>([]);
  const [activeCodes, setActiveCodes] = useState<LoyaltyRedemptionRow[]>([]);
  const [commercialAccounts, setCommercialAccounts] = useState<CommercialAccountRow[]>([]);
  const [commercialPurchases, setCommercialPurchases] = useState<CommercialPurchaseRow[]>([]);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  const loadLoyalty = useCallback(async () => {
    if (!accountType) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const [catResult, meResult] = await Promise.allSettled([
        apiFetch('/loyalty/catalog', { signal: controller.signal }),
        apiFetch('/loyalty/me', { signal: controller.signal }),
      ]);
      clearTimeout(timeout);

      const errors: string[] = [];

      if (catResult.status === 'fulfilled' && catResult.value.ok) {
        const catData = (await catResult.value.json()) as { catalogItems?: LoyaltyCatalogItem[] };
        setCatalog(uniqueCatalogItems(catData.catalogItems ?? []));
      } else if (catResult.status === 'fulfilled') {
        errors.push(`Catalog ${catResult.value.status}`);
      } else {
        errors.push('Catalog unreachable');
      }

      if (meResult.status === 'fulfilled' && meResult.value.ok) {
        const meData = (await meResult.value.json()) as CustomerLoyaltyPayload;
        setPoints(meData.points_balance ?? 0);
        setHistory(meData.household_transactions ?? []);
        setHouseholdAccounts(meData.household_accounts ?? []);
        setCommercialAccounts(meData.commercial_accounts ?? []);
        setCommercialPurchases(meData.commercial_purchases ?? []);
        setActiveCodes(meData.active_redemptions ?? []);
      } else if (meResult.status === 'fulfilled') {
        errors.push(`Rewards ${meResult.value.status}`);
      } else {
        errors.push('Rewards unavailable');
      }

      setLoyaltyError(errors.length > 0 ? errors.join(', ') : null);
    } catch (e: unknown) {
      clearTimeout(timeout);
      console.error('Failed to load loyalty data:', e);
      setLoyaltyError('Rewards temporarily unavailable');
    }
  }, [accountType]);

  useEffect(() => {
    loadLoyalty();
    // Poll every 15s so points refresh automatically after a delivery completes
    const interval = setInterval(loadLoyalty, 15_000);
    return () => clearInterval(interval);
  }, [loadLoyalty]);

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [rewardsSub, setRewardsSub] = useState<'my' | 'all'>('my');
  const [guideOpen, setGuideOpen] = useState(showGuide);
  const [guideStep, setGuideStep] = useState(0);
  const [guideRect, setGuideRect] = useState<GuideRect | null>(null);
  const commercial = accountType === 'commercial';
  const commercialPurchaseTarget = 30;
  const commercialAccount = [...commercialAccounts].sort(
    (a, b) =>
      b.completed_cycles - a.completed_cycles ||
      b.current_cycle_count - a.current_cycle_count,
  )[0];
  const commercialPurchaseCount = commercialAccount?.current_cycle_count ?? 0;
  const commercialPurchasesRemaining = commercialPurchaseTarget - commercialPurchaseCount;
  const commercialProgress: `${number}%` = `${
    (commercialPurchaseCount / commercialPurchaseTarget) * 100
  }%`;
  const metadata = session?.user.user_metadata;
  const firstName = metadata?.first_name;
  const lastName = metadata?.last_name;
  const greetingName =
    typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'Customer';
  const profileInitials = [firstName, lastName]
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'CU';
  const avatarUrl =
    typeof metadata?.avatar_url === 'string' && metadata.avatar_url.trim()
      ? metadata.avatar_url.trim()
      : null;
  const heroHeight = insets.top + 290;

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
  const navRect = (): GuideRect => ({ x: 12, y: winH - insets.bottom - 6 - 64, width: winW - 24, height: 64 });

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
      {activeTab === 'rewards' ? (
        <>
          <AppHeader
            variant="home"
            helpRef={helpRef}
            onHelp={openGuide}
            onProfile={() => onNavigate('profile', { profileSection: 'personal' })}
          />
          <RewardsScreen 
            initialSub={rewardsSub} 
            onExit={() => setActiveTab('home')} 
            points={points}
            catalog={catalog}
            history={history}
            householdAccounts={householdAccounts}
            activeCodes={activeCodes}
            commercialAccounts={commercialAccounts}
            commercialPurchases={commercialPurchases}
            loyaltyError={loyaltyError}
            onRefresh={loadLoyalty}
          />
        </>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.sheet}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} onPrimary />}
        >
          {/*
           * Home hero — greeting and loyalty content intentionally share one
           * coordinate system. This keeps the decorative orbit and product
           * image away from ScrollView clipping boundaries.
           */}
          <View
            style={[
              styles.homeHero,
              { height: heroHeight, paddingTop: insets.top + 10 },
            ]}
          >
            <Svg
              pointerEvents="none"
              width={winW}
              height={heroHeight}
              viewBox="0 0 1000 400"
              preserveAspectRatio="none"
              style={styles.heroBackground}
            >
              <Path
                d="M0 0 H1000 V300 C820 350 690 385 500 385 C310 385 145 360 0 325 Z"
                fill={colors.primary}
              />
            </Svg>
            <View style={styles.homeHeaderRow}>
              <View>
                <Text style={styles.homeHello}>
                  Hello, <Text style={styles.homeHelloName}>{greetingName}</Text>!
                </Text>
                <Text style={styles.homeSub}>What can we do for you today?</Text>
              </View>
              <View style={styles.homeActions}>
                <Pressable ref={helpRef} onPress={openGuide} hitSlop={8}>
                  <Feather name="help-circle" size={24} color="#fff" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  onPress={() => onNavigate('profile', { profileSection: 'personal' })}
                  hitSlop={8}
                  style={styles.homeProfileButton}
                >
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.homeProfileImage} />
                  ) : (
                    <Text style={styles.homeProfileInitials}>{profileInitials}</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* The two loyalty tracks remain separate by design. */}
            <Pressable
              ref={rewardsRef}
              onLayout={captureY('rewards')}
              style={styles.rewardTapArea}
              onPress={() => openRewards('my')}
            >
              <View style={styles.heroCopy}>
                {commercial ? (
                  <>
                    <Text style={styles.heroLabel}>Commercial reward</Text>
                    <View style={styles.heroValueRow}>
                      <Text style={[styles.heroValue, styles.heroValueCommercial]}>
                        {commercialPurchaseCount} / {commercialPurchaseTarget}
                      </Text>
                    </View>
                    <View style={[styles.heroProgressBlock, styles.heroProgressBlockCommercial]}>
                      <Text style={styles.heroProgressLabel}>
                        {commercialPurchasesRemaining} more purchases to your free cylinder
                      </Text>
                      <View style={styles.heroProgressTrack}>
                        <View style={[styles.heroProgressFill, { width: commercialProgress }]} />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.heroValueRow}>
                      <Text style={styles.heroValue}>{points}</Text>
                      <Text style={styles.heroUnit}>points</Text>
                    </View>
                    <Text style={styles.heroLabel}>Household rewards</Text>
                    <View style={styles.heroProgressBlock}>
                      <Text style={styles.heroProgressLabel}>{points > 0 ? 'Use points for rewards' : 'Earn points with every delivery'}</Text>
                      <View style={styles.heroProgressTrack}>
                        <View style={[styles.heroProgressFill, { width: points > 0 ? '100%' : '0%' }]} />
                      </View>
                    </View>
                  </>
                )}
              </View>
            </Pressable>
            <View
              pointerEvents="none"
              style={[styles.heroOrbit, { top: insets.top + 65 }]}
            />
            <View pointerEvents="none" style={[styles.heroCylinder, { top: insets.top + 80 }]}>
              <Image
                source={cylinderFor('11 KG')}
                style={styles.heroCylinderImage}
                resizeMode="contain"
              />
            </View>
            {/*
             * The reference artwork places the cylinder behind the white
             * foreground. Reusing the exact curve from the blue path makes
             * this a clean mask instead of a separate straight-edged panel.
             */}
            <Svg
              pointerEvents="none"
              width={winW}
              height={heroHeight}
              viewBox="0 0 1000 400"
              preserveAspectRatio="none"
              style={styles.heroForeground}
            >
              <Path
                d="M0 325 C145 360 310 385 500 385 C690 385 820 350 1000 300 V400 H0 Z"
                fill="#fff"
              />
            </Svg>
          </View>

          {/* Active order — only shown when a real in-flight order exists */}
          <View style={styles.content}>
            {activeOrder ? (
              <>
                <View style={styles.section} onLayout={captureY('active')}>
                  <Text style={styles.sectionTitle}>Active order</Text>
                  <Pressable
                    ref={activeRef}
                    style={styles.activeOrder}
                    onPress={() => onNavigate('orders', { tab: 'orders' })}
                  >
                    <View style={styles.activeTopRow}>
                      <View style={styles.activeProduct}>
                        <Image
                          source={cylinderFor(activeOrder.cylinder_size)}
                          style={styles.activeCylinder}
                          resizeMode="contain"
                        />
                        <Text style={styles.activeProductText}>{activeOrder.cylinder_size.toUpperCase()} × {activeOrder.quantity}</Text>
                      </View>
                      <Text style={styles.activeStatus}>
                        {activeOrder.status === 'En Route' ? 'Out for delivery'
                          : activeOrder.status === 'Dispatched' ? 'Preparing'
                          : 'Order Confirmed'}
                      </Text>
                    </View>

                    <View style={styles.timeline}>
                      <View style={styles.timelineBase} />
                      <View style={[
                        styles.timelineDone,
                        { width: activeOrder.status === 'En Route' ? '66%'
                          : activeOrder.status === 'Dispatched' ? '33%'
                          : '5%' },
                      ]} />
                      <View style={[styles.timelineDot, styles.timelineDotStart]} />
                      <View style={[styles.timelineDot, styles.timelineDotMiddle]} />
                      <View style={[styles.timelineDot, styles.timelineDotEnd]} />
                    </View>
                    <View style={styles.timelineLabels}>
                      <Text style={styles.timelineLabel}>Confirmed</Text>
                      <Text style={styles.timelineLabel}>On the way</Text>
                      <Text style={[styles.timelineLabel, activeOrder.status !== 'En Route' && styles.timelineLabelMuted]}>Delivered</Text>
                    </View>
                  </Pressable>
                </View>

                <View style={styles.divider} />
              </>
            ) : null}

            {/* Order again */}
            <View
              ref={reorderRef}
              style={styles.orderAgainSection}
              onLayout={captureY('reorder')}
            >
              <Text style={styles.sectionTitle}>Order again</Text>
              <View style={styles.productShelf}>
                {orderAgain.map((item) => (
                  <Pressable
                    key={item.size}
                    style={styles.product}
                    onPress={() => {
                      if (pricesError) {
                        void refreshPrices();
                        return;
                      }
                      onNavigate('order-process');
                    }}
                  >
                    <Image
                      source={cylinderFor(item.size)}
                      style={[
                        styles.productCylinder,
                        item.size === '2.7 KG' && styles.productCylinderSmall,
                      ]}
                      resizeMode="contain"
                    />
                    <Text style={styles.productSize}>{item.size}</Text>
                    <View style={styles.productPriceRow}>
                      <Text style={styles.productPrice}>{item.price}</Text>
                      <Feather name="arrow-right" size={21} color={colors.primary} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Quick order */}
            <Pressable
              ref={quickRef}
              style={styles.quickOrder}
              onLayout={captureY('quick')}
              onPress={() => onNavigate('order-process')}
            >
              <View style={styles.quickIcon}>
                <Feather name="zap" size={22} color={colors.primary} fill={colors.primary} />
              </View>
              <Text style={styles.quickLabel}>Quick order</Text>
              <Feather name="arrow-right" size={24} color={colors.primary} />
            </Pressable>
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
  sheet: { flex: 1, backgroundColor: colors.primary },
  scrollContent: { paddingBottom: 130, backgroundColor: '#fff' },

  homeHero: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    zIndex: 2,
    overflow: 'hidden',
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroForeground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  homeHeaderRow: {
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeHello: { fontFamily: fonts.bold, fontSize: 24, color: '#fff' },
  homeHelloName: { color: '#fff' },
  homeSub: { fontFamily: fonts.medium, fontSize: 12, color: '#fff', marginTop: 3 },
  homeActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  homeProfileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  homeProfileImage: { width: '100%', height: '100%' },
  homeProfileInitials: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  rewardTapArea: { zIndex: 4, width: '58%', marginTop: 27 },
  heroCopy: { width: '100%' },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroValue: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 46, color: '#fff' },
  heroValueCommercial: { fontSize: 34, lineHeight: 42, marginTop: 2 },
  heroUnit: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
  heroLabel: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff', marginTop: 2 },
  heroProgressBlock: { marginTop: 30, width: '95%' },
  heroProgressBlockCommercial: { marginTop: 18 },
  heroProgressLabel: { fontFamily: fonts.medium, fontSize: 10, color: '#fff', marginBottom: 7 },
  heroProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  heroProgressFill: { height: '100%', borderRadius: 2, backgroundColor: '#fff' },
  heroOrbit: {
    position: 'absolute',
    right: 4,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderStyle: 'dotted',
    borderColor: 'rgba(255,255,255,0.44)',
    zIndex: 2,
  },
  heroCylinder: {
    position: 'absolute',
    right: 12,
    width: 138,
    height: 205,
    zIndex: 10,
    transform: [{ scaleX: 1.06 }],
  },
  heroCylinderImage: { width: '100%', height: '100%' },

  content: { paddingHorizontal: 24, paddingTop: 18, zIndex: 1 },
  section: { paddingTop: 4 },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.heading,
    marginBottom: 8,
  },
  activeOrder: { paddingBottom: 8 },
  activeTopRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeProduct: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeCylinder: { width: 28, height: 44 },
  activeProductText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  activeStatus: { fontFamily: fonts.semibold, fontSize: 12, color: colors.success },
  timeline: { height: 18, marginHorizontal: 12, marginTop: 6, justifyContent: 'center' },
  timelineBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.cardBorder,
  },
  timelineDone: {
    position: 'absolute',
    left: 0,
    width: '50%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
  timelineDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    top: 3,
    borderWidth: 3,
    backgroundColor: '#fff',
  },
  timelineDotStart: { left: -1, borderColor: colors.success, backgroundColor: '#BDE8D8' },
  timelineDotMiddle: { left: '48%', borderColor: colors.success, backgroundColor: colors.success },
  timelineDotEnd: { right: -1, borderColor: colors.cardBorder },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timelineLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.heading },
  timelineLabelMuted: { color: colors.muted },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.dividerStrong,
    marginVertical: 10,
  },
  orderAgainSection: { minHeight: 142 },
  productShelf: { flexDirection: 'row', justifyContent: 'space-around', gap: 22 },
  product: { flex: 1, alignItems: 'center' },
  productCylinder: { width: 70, height: 98 },
  productCylinderSmall: { width: 62, height: 98 },
  productSize: { fontFamily: fonts.semibold, fontSize: 14, color: colors.heading },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 3,
  },
  productPrice: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },

  quickOrder: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
});
