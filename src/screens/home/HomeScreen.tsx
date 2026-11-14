import { cylinderSummary, type ServiceRequestItem } from '@/lib/serviceRequestItems';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Image,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
  type ViewInstance,
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
import { API_URL } from '@/constants/config';
import { AccountMenuButton, AppHeader } from '@/components/ui/AppHeader';
import { BottomNav } from '@/components/ui/BottomNav';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { AppGuideOverlay, GUIDE_STEPS, GUIDE_TRANSITION_DURATION, type GuideRect, type GuideSpotlight } from '@/components/ui/AppGuide';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RewardsScreen } from '@/screens/home/RewardsScreen';
import { OrdersScreen } from '@/screens/orders/OrdersScreen';
import type { MainNavigateOptions, MainScreen, MainTab } from '@/navigation/types';
import { useIsFocused } from '@react-navigation/native';
import { latestActiveOrder, orderProgress } from '@/lib/orderProgress';
import { OrderProgressTracker } from '@/components/orders/OrderProgressTracker';

/**
 * Customer Home: integrated loyalty hero, delivery progress, and borderless
 * reorder shelf. The Rewards tab swaps the body for the Rewards surface
 * while keeping this header + bottom nav.
 *
 * Greeting, Service Request milestones, and the account's track-specific loyalty
 * summary are loaded from the authenticated session and NestJS API.
 */
type LoyaltyCatalogItem = { id: string; branch_id: string; branch_name: string | null; name: string; points_cost: number; stock_qty: number };
type HouseholdAccountRow = { branch_id: string; points_balance: number };
type HouseholdHistoryRow = { id: string; type: string; points_delta: number; created_at: string };
type LoyaltyRedemptionRow = {
  id: string;
  catalog_item_name: string | null;
  branch_name: string | null;
  rejected_reason: string | null;
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
  recent_redemptions?: LoyaltyRedemptionRow[];
};

function requestFailureMessage(label: string, reason: unknown): string {
  if (reason instanceof Error && reason.message.includes('session expired')) {
    return reason.message;
  }
  return `${label} unavailable. Check the API at ${API_URL}.`;
}

export function HomeScreen({
  initialTab = 'home',
  showGuide = false,
  onNavigate,
  initialRewardsSection = 'my',
}: {
  initialTab?: MainTab;
  showGuide?: boolean;
  onNavigate: (screen: MainScreen, opts?: MainNavigateOptions) => void;
  initialRewardsSection?: 'my' | 'all';
}) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
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
    items?: ServiceRequestItem[];
    quantity: number;
    created_at: string;
  };
  const [activeOrder, setActiveOrder] = useState<ActiveOrderRow | null>(null);
  const activeProgress = activeOrder ? orderProgress(activeOrder.status) : null;

  useEffect(() => {
    if (!focused) return;
    let current = true;
    const load = async () => {
      if (AppState.currentState && AppState.currentState !== 'active') return;
      try {
        const res = await apiFetch(`/service-requests/me?_t=${Date.now()}`);
        if (!res.ok) {
          if (current) setActiveOrder(null);
          return;
        }
        const data = await res.json();
        const orders: ActiveOrderRow[] = data.serviceRequests ?? [];
        if (current) setActiveOrder(latestActiveOrder(orders));
      } catch {
        if (current) setActiveOrder(null);
      }
    };
    void load();
    // Poll every 10s so the card updates in near-real-time
    const interval = setInterval(load, 10_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void load(); });
    return () => { current = false; clearInterval(interval); subscription.remove(); };
  }, [focused]);

  // Sync Loyalty State
  const [points, setPoints] = useState(0);
  const [catalog, setCatalog] = useState<LoyaltyCatalogItem[]>([]);
  const [history, setHistory] = useState<HouseholdHistoryRow[]>([]);
  const [householdAccounts, setHouseholdAccounts] = useState<HouseholdAccountRow[]>([]);
  const [activeCodes, setActiveCodes] = useState<LoyaltyRedemptionRow[]>([]);
  const [recentRedemptions, setRecentRedemptions] = useState<LoyaltyRedemptionRow[]>([]);
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
        setCatalog(catData.catalogItems ?? []);
      } else if (catResult.status === 'fulfilled') {
        errors.push(`Catalog ${catResult.value.status}`);
      } else {
        errors.push(requestFailureMessage('Catalog', catResult.reason));
      }

      if (meResult.status === 'fulfilled' && meResult.value.ok) {
        const meData = (await meResult.value.json()) as CustomerLoyaltyPayload;
        setPoints(meData.points_balance ?? 0);
        setHistory(meData.household_transactions ?? []);
        setHouseholdAccounts(meData.household_accounts ?? []);
        setCommercialAccounts(meData.commercial_accounts ?? []);
        setCommercialPurchases(meData.commercial_purchases ?? []);
        setActiveCodes(meData.active_redemptions ?? []);
        setRecentRedemptions(meData.recent_redemptions ?? []);
      } else if (meResult.status === 'fulfilled') {
        errors.push(`Rewards ${meResult.value.status}`);
      } else {
        errors.push(requestFailureMessage('Rewards', meResult.reason));
      }

      setLoyaltyError(errors.length > 0 ? errors.join(', ') : null);
    } catch (e: unknown) {
      clearTimeout(timeout);
      console.error('Failed to load loyalty data:', e);
      setLoyaltyError('Rewards temporarily unavailable');
    }
  }, [accountType]);

  useEffect(() => {
    if (!focused) return;
    loadLoyalty();
    // Poll every 15s so points refresh automatically after a delivery completes
    const interval = setInterval(loadLoyalty, 15_000);
    return () => clearInterval(interval);
  }, [focused, loadLoyalty]);

  const activeTab = initialTab;
  const [guideOpen, setGuideOpen] = useState(showGuide);
  const [guideStep, setGuideStep] = useState(0);
  const [guideRect, setGuideRect] = useState<GuideSpotlight | null>(null);
  const [reduceGuideMotion, setReduceGuideMotion] = useState(true);
  const [guideTransition, setGuideTransition] = useState<{ page: 'home' | 'history'; finished: boolean }>({ page: 'home', finished: true });
  const [historyOpacity] = useState(() => new Animated.Value(0));
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
  const greetingName =
    typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'Customer';
  const heroHeight = insets.top + 290;
  const compactWidth = winW < 360;
  const heroGutter = compactWidth ? 16 : 24;
  const orbitSize = Math.min(170, winW * 0.43);
  const cylinderWidth = Math.min(138, winW * 0.35);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollOffset = useRef(0);
  const updateScrolledSpotlight = useRef<((offset: number) => void) | null>(null);
  const rewardsRef = useRef<ViewInstance>(null);
  const activeOrdersRef = useRef<ViewInstance>(null);
  const reorderRef = useRef<ViewInstance>(null);
  const quickRef = useRef<ViewInstance>(null);
  const navRef = useRef<ViewInstance>(null);
  const helpRef = useRef<ViewInstance>(null);
  const guideTarget = GUIDE_STEPS[guideStep].target;
  const showingHistory = focused && guideOpen && guideTarget === 'active-orders';
  const guidePage = showingHistory ? 'history' : 'home';
  const animateGuidePage = focused && guideOpen && !reduceGuideMotion;
  if (guideTransition.page !== guidePage) {
    setGuideTransition({ page: guidePage, finished: !animateGuidePage });
  }
  const guidePageReady = !animateGuidePage || guideTransition.finished;
  // The outgoing History screen stays mounted while its opacity falls to zero.
  const keepHistoryMounted = showingHistory || !guidePageReady;
  const guideSpotlight = (guideRect?.target === 'active-orders') === showingHistory ? guideRect : null;
  const hasActiveOrder = activeOrder !== null;

  const openRewards = (sub: 'my' | 'all') => {
    onNavigate('rewards', { rewardsSection: sub });
  };

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceGuideMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceGuideMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    const fade = Animated.timing(historyOpacity, {
      toValue: showingHistory ? 1 : 0,
      duration: animateGuidePage ? GUIDE_TRANSITION_DURATION : 0,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true, isInteraction: false,
    });
    fade.start(({ finished }) => {
      if (finished) {
        setGuideTransition(current => current.page === guidePage && !current.finished
          ? { page: guidePage, finished: true }
          : current);
      }
    });
    return () => fade.stop();
  }, [animateGuidePage, guidePage, historyOpacity, showingHistory]);

  useEffect(() => {
    if (!guideOpen || !focused) return;
    const target = guideTarget && {
      rewards: rewardsRef,
      'active-orders': activeOrdersRef,
      reorder: reorderRef,
      quick: quickRef,
      nav: navRef,
      help: helpRef,
    }[guideTarget];
    let cancelled = false;
    let frame = 0;
    let attempts = 0;
    let previous: GuideRect | null = null;
    let scrollFallback: ReturnType<typeof setTimeout> | undefined;
    const scrollToTarget = guideTarget === 'reorder' || guideTarget === 'quick';
    const isScrollTarget = scrollToTarget || guideTarget === 'rewards' || guideTarget === 'help';
    if (!isScrollTarget && guideTarget !== 'active-orders') {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }

    function nextFrame() {
      if (cancelled) return;
      if (attempts < 24) frame = requestAnimationFrame(measure);
      else setGuideRect(null);
    }

    function measure() {
      attempts += 1;
      if (!guideTarget || !target) {
        setGuideRect(null);
        return;
      }
      const view = target.current;
      if (!view) {
        nextFrame();
        return;
      }
      if (isScrollTarget) {
        const scroll = scrollRef.current;
        const viewport = scroll?.getNativeScrollRef();
        const content = scroll?.getInnerViewRef();
        if (!scroll || !viewport || !content) {
          nextFrame();
          return;
        }

        if (Platform.OS === 'web') {
          // Use live browser rectangles for the target and the scrollport. The
          // scroll event updates the highlight after a queued scroll takes effect.
          const element = view as unknown as HTMLElement;
          const scrollport = viewport as unknown as HTMLElement;
          const publish = () => {
            if (cancelled || !element.isConnected) return;
            const { x, y, width, height } = element.getBoundingClientRect();
            setGuideRect({ x, y, width, height, target: guideTarget });
          };
          updateScrolledSpotlight.current = publish;
          const targetY = element.getBoundingClientRect().top - scrollport.getBoundingClientRect().top;
          const destination = scrollToTarget ? Math.max(0, scrollport.scrollTop + targetY - 22) : 0;
          if (Math.abs(scrollport.scrollTop - destination) <= 1) publish();
          else scrollFallback = setTimeout(publish, 450);
          scroll.scrollTo({ y: destination, animated: false });
          return;
        }

        viewport.measureInWindow((left, top, viewportWidth, viewportHeight) => {
          if (cancelled) return;
          if (viewportWidth <= 0 || viewportHeight <= 0) {
            nextFrame();
            return;
          }
          view.measureLayout(content, (x, y, width, height) => {
            if (cancelled) return;
            if (width <= 0 || height <= 0) {
              nextFrame();
              return;
            }

            // Window measurements of a scrolling child can lag behind the
            // rendered scroll. Use its content bounds and the reported offset.
            const destination = scrollToTarget ? Math.max(0, top + y - insets.top - 22) : 0;
            let lastOffset: number | undefined;
            const publish = (offset: number) => {
              if (lastOffset === offset) return;
              lastOffset = offset;
              clearTimeout(scrollFallback);
              setGuideRect({ x: left + x, y: top + y - offset, width, height, target: guideTarget });
            };
            updateScrolledSpotlight.current = publish;
            if (Math.abs(scrollOffset.current - destination) <= 1) {
              publish(scrollOffset.current);
            } else {
              // Keep the previous hole until the programmatic scroll reports
              // its position. A clamped scroll may emit no event at all.
              scrollFallback = setTimeout(() => publish(scrollOffset.current), 450);
            }
            // A rapid Back can arrive while the preceding step's scroll is queued.
            scroll.scrollTo({ y: destination, animated: false });
          }, nextFrame);
        });
        return;
      }
      view.measureInWindow((x, y, width, height) => {
        if (cancelled) return;
        if (width <= 0 || height <= 0) {
          nextFrame();
          return;
        }
        const bounds = { x, y, width, height };
        if ((previous && previous.x === x && previous.y === y && previous.width === width && previous.height === height) || attempts === 24) {
          setGuideRect({ ...bounds, target: guideTarget });
          return;
        }
        previous = bounds;
        nextFrame();
      });
    }

    // Keep the last measured hole while the next screen or scroll position settles.
    nextFrame();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(scrollFallback);
      updateScrolledSpotlight.current = null;
    };
  }, [guideOpen, guideTarget, focused, winW, winH, insets.top, insets.bottom, hasActiveOrder]);

  const openGuide = () => {
    if (activeTab === 'rewards') {
      onNavigate('home', { showGuide: true });
      return;
    }
    setGuideStep(0);
    setGuideRect(null);
    setGuideOpen(true);
  };
  const guideNext = () => {
    if (guideStep >= GUIDE_STEPS.length - 1) setGuideOpen(false);
    else setGuideStep(guideStep + 1);
  };
  const guideBack = () => setGuideStep(Math.max(0, guideStep - 1));

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
            initialSub={initialRewardsSection}
            onExit={() => onNavigate('home')}
            points={points}
            catalog={catalog}
            history={history}
            householdAccounts={householdAccounts}
            activeCodes={activeCodes}
            recentRedemptions={recentRedemptions}
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
          contentContainerStyle={[styles.scrollContent, guideOpen && { paddingBottom: winH }]}
          onScroll={event => {
            const offset = event.nativeEvent.contentOffset.y;
            scrollOffset.current = offset;
            updateScrolledSpotlight.current?.(offset);
          }}
          scrollEventThrottle={16}
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
              { height: heroHeight, paddingTop: insets.top + 10, paddingHorizontal: heroGutter },
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
              <View style={styles.homeGreeting}>
                <Text style={styles.homeHello}>
                  Hello, <Text style={styles.homeHelloName}>{greetingName}</Text>!
                </Text>
                <Text style={styles.homeSub}>What can we do for you today?</Text>
              </View>
              <View style={styles.homeActions}>
                <Pressable ref={helpRef} onPress={openGuide} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open app guide">
                  <Feather name="help-circle" size={24} color="#fff" />
                </Pressable>
                <AccountMenuButton
                  variant="home"
                  onProfile={() => onNavigate('profile', { profileSection: 'personal' })}
                />
              </View>
            </View>

            {/* The two loyalty tracks remain separate by design. */}
            <Pressable
              ref={rewardsRef}
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
                    <View style={[styles.heroProgressBlock, styles.heroProgressBlockCompact]}>
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
                    <View style={[styles.heroProgressBlock, compactWidth && styles.heroProgressBlockCompact]}>
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
              style={[styles.heroOrbit, { top: insets.top + 65, width: orbitSize, height: orbitSize, borderRadius: orbitSize / 2 }]}
            />
            <View pointerEvents="none" style={[styles.heroCylinder, { top: insets.top + 80, width: cylinderWidth }]}>
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
          <View style={[styles.content, { paddingHorizontal: heroGutter }]}>
            {activeOrder && activeProgress ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Active order</Text>
                  <Pressable
                    style={({ pressed }) => [styles.activeOrder, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                    accessibilityLabel="View active order status"
                    onPress={() => onNavigate('order-process', { orderId: activeOrder.id })}
                  >
                    <View style={styles.activeTopRow}>
                      <View style={styles.activeProduct}>
                        <Image
                          source={cylinderFor(activeOrder.cylinder_size)}
                          style={styles.activeCylinder}
                          resizeMode="contain"
                        />
                        <Text style={styles.activeProductText}>{cylinderSummary(activeOrder)}</Text>
                      </View>
                      <Text style={styles.activeStatus}>
                        {activeProgress.label}
                      </Text>
                    </View>

                    <OrderProgressTracker status={activeOrder.status} active={focused && activeTab === 'home'} />
                  </Pressable>
                </View>

                <View style={styles.divider} />
              </>
            ) : null}

            {/* Order again */}
            <View
              ref={reorderRef}
              style={styles.orderAgainSection}
              collapsable={false}
            >
              <Text style={styles.sectionTitle}>Order again</Text>
              <Text style={styles.pricingNote}>Default prices shown. Your selected branch determines the final price.</Text>
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
        onNavigate={onNavigate}
        guideRef={navRef}
      />

      {keepHistoryMounted && (
        <Animated.View
          testID="app-guide-history"
          style={[StyleSheet.absoluteFill, { opacity: reduceGuideMotion ? Number(showingHistory) : historyOpacity }]}
          pointerEvents="none"
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <OrdersScreen onNavigate={onNavigate} activeOrdersRef={activeOrdersRef} />
        </Animated.View>
      )}

      {focused && (
        <AppGuideOverlay
          visible={guideOpen}
          step={guideStep}
          rect={guideSpotlight}
          pageReady={guidePageReady}
          reduceMotion={reduceGuideMotion}
          onNext={guideNext}
          onBack={guideBack}
          onClose={() => setGuideOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  sheet: { flex: 1, backgroundColor: colors.primary },
  scrollContent: { paddingBottom: 130, backgroundColor: '#fff' },

  homeHero: {
    backgroundColor: '#fff',
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
  homeGreeting: { flex: 1, marginRight: 8 },
  homeHello: { fontFamily: fonts.bold, fontSize: 24, color: '#fff' },
  homeHelloName: { color: '#fff' },
  homeSub: { fontFamily: fonts.medium, fontSize: 12, color: '#fff', marginTop: 3 },
  homeActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardTapArea: { zIndex: 4, width: '58%', marginTop: 27 },
  heroCopy: { width: '100%' },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroValue: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 46, color: '#fff' },
  heroValueCommercial: { fontSize: 34, lineHeight: 42, marginTop: 2 },
  heroUnit: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
  heroLabel: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff', marginTop: 2 },
  heroProgressBlock: { marginTop: 30, width: '95%' },
  heroProgressBlockCompact: { marginTop: 18 },
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
    borderWidth: 2,
    borderStyle: 'dotted',
    borderColor: 'rgba(255,255,255,0.44)',
    zIndex: 2,
  },
  heroCylinder: {
    position: 'absolute',
    right: 12,
    height: 205,
    zIndex: 10,
    transform: [{ scaleX: 1.06 }],
  },
  heroCylinderImage: { width: '100%', height: '100%' },

  content: { paddingTop: 18, zIndex: 1 },
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
  timelineDotStart: { left: -1 },
  timelineDotMiddle: { left: '48%' },
  timelineDotEnd: { right: -1 },
  timelineDotCompleted: { borderColor: colors.success, backgroundColor: colors.success },
  timelineDotCurrent: { borderColor: '#BDE8D8', backgroundColor: colors.success },
  timelineDotUpcoming: { borderColor: colors.cardBorder, backgroundColor: '#fff' },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timelineLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.heading },
  timelineLabelMuted: { color: colors.muted },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.dividerStrong,
    marginVertical: 10,
  },
  orderAgainSection: { minHeight: 142 },
  pricingNote: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.grayText, marginBottom: 10 },
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
