import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { cylinderFor, images } from '@/lib/assets';
import { AppHeader } from '@/components/ui/AppHeader';
import { BottomNav } from '@/components/ui/BottomNav';
import { apiErrorMessage, apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { loadReviewedOrderIds, OrderFeedbackModal } from './OrderFeedbackModal';
import type { MainNavigateOptions, MainScreen } from '@/navigation/types';

/**
 * Orders (Figma "MyOrders"): active/past tabs, order details, and the two-step
 * post-delivery CSAT feedback (rate rider → rate branch + comment).
 *
 * SCAFFOLD: order data is Figma mock. Wire to the SRD endpoints; surface delivery
 * status MILESTONES only — never live GPS (AGENTS.md §7).
 */
type Sub = 'list' | 'details';

type OrderRow = {
  id: string;
  branch_id: string;
  status: 'Pending' | 'Dispatched' | 'En Route' | 'Delivered' | 'Completed' | 'Cancelled' | 'Under Review';
  customer_name: string;
  delivery_address: string;
  cylinder_size: string;
  quantity: number;
  requested_at: string;
  dispatched_at: string | null;
  delivered_at: string | null;
  total_amount: number | null;
  payment_method: 'Cash on Delivery' | 'PayMongo';
  payment_status: 'Unpaid' | 'Pending' | 'Paid';
  payment_paid_at: string | null;
};

type PaymentResponse = {
  method: OrderRow['payment_method'];
  status: OrderRow['payment_status'];
  paidAt: string | null;
  checkoutUrl?: string | null;
};

WebBrowser.maybeCompleteAuthSession();

export function OrdersScreen({ onNavigate }: { onNavigate: (screen: MainScreen, opts?: MainNavigateOptions) => void }) {
  const { session } = useAuth();
  const customerId = session?.user.id ?? null;
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [sub, setSub] = useState<Sub>('list');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    void loadReviewedOrderIds(customerId).then((ids) => {
      if (active) setReviewedOrderIds(ids);
    });
    return () => { active = false; };
  }, [customerId]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/service-requests/me');
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Failed to load orders'));
      setOrders((data.serviceRequests as OrderRow[]) ?? []);
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'Delivered' && order.status !== 'Completed' && order.status !== 'Cancelled'),
    [orders],
  );
  const pastOrders = useMemo(
    () => orders.filter((order) => order.status === 'Delivered' || order.status === 'Completed'),
    [orders],
  );

  const formatMoney = (value: number | null) => (value === null
    ? '₱ 0'
    : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value));
  const formatDate = (iso: string) => new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(iso));

  const detailOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];

  const openFeedback = (orderId: string) => {
    if (reviewedOrderIds.has(orderId)) return;
    setRatingOrderId(orderId);
  };

  const closeFeedback = () => {
    setRatingOrderId(null);
  };

  const updatePayment = (orderId: string, payment: PaymentResponse) => {
    setOrders((current) => current.map((order) => order.id === orderId
      ? {
          ...order,
          payment_method: payment.method,
          payment_status: payment.status,
          payment_paid_at: payment.paidAt,
        }
      : order));
  };

  const refreshPayment = async (orderId: string): Promise<PaymentResponse | null> => {
    const response = await apiFetch(`/service-requests/${orderId}/payment?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(apiErrorMessage(data, 'Could not confirm payment'));
    const payment = data.payment as PaymentResponse;
    updatePayment(orderId, payment);
    return payment;
  };

  const retryPayment = async (order: OrderRow) => {
    if (retryingOrderId) return;
    setRetryingOrderId(order.id);
    setPaymentMessage(null);
    try {
      const response = await apiFetch(`/service-requests/${order.id}/payment/checkout`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(apiErrorMessage(data, 'Could not start online payment'));
      const payment = data.payment as PaymentResponse;
      updatePayment(order.id, payment);
      if (payment.status === 'Paid') {
        setPaymentMessage('Payment confirmed.');
        return;
      }
      if (!payment.checkoutUrl) throw new Error('PayMongo did not return a checkout link');

      await WebBrowser.openAuthSessionAsync(payment.checkoutUrl, 'superkalan://payments/return');
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const confirmed = await refreshPayment(order.id);
        if (confirmed?.status === 'Paid') {
          setPaymentMessage('Payment confirmed.');
          return;
        }
        if (attempt < 5) await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
      }
      setPaymentMessage('Payment is still awaiting confirmation. You can retry safely.');
    } catch (err) {
      setPaymentMessage(err instanceof Error ? err.message : 'Could not start online payment');
    } finally {
      setRetryingOrderId(null);
    }
  };

  const orderCard = (o: OrderRow, past: boolean) => (
    <View key={o.id} style={styles.orderCard}>
      {past && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>COMPLETED</Text>
        </View>
      )}
      <View style={styles.orderBody}>
        <Image source={cylinderFor(o.cylinder_size)} style={styles.orderCyl} resizeMode="contain" />
        <View style={styles.orderInfo}>
          <Text style={styles.cylSize}>{o.cylinder_size.toUpperCase()}</Text>
          <Text style={styles.cylQty}>Qty: {o.quantity}</Text>
          <Text style={styles.cylPrice}>{formatMoney(o.total_amount)}</Text>
          <Text style={styles.orderStatus}>Status: {o.status}</Text>
          <Text style={styles.orderStatus}>
            Payment: {o.payment_method === 'Cash on Delivery'
              ? 'Cash on Delivery'
              : o.payment_status === 'Paid' ? 'Paid' : 'Awaiting payment'}
          </Text>
          {o.payment_method === 'PayMongo' && o.payment_status !== 'Paid' && (
            <Pressable
              style={[styles.retryPaymentBtn, retryingOrderId !== null && styles.disabledBtn]}
              disabled={retryingOrderId !== null}
              onPress={() => void retryPayment(o)}
            >
              <Text style={styles.retryPaymentText}>
                {retryingOrderId === o.id ? 'Opening PayMongo…' : 'Retry payment'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={[styles.orderFooter, { height: past ? 50 : 30 }]}>
        <View>
          <Pressable onPress={() => { setSelectedOrderId(o.id); setSub('details'); }}>
            <Text style={styles.footerLink}>View Order Details</Text>
          </Pressable>
          <Text style={styles.footerDate}>Order Date: {formatDate(o.requested_at)}</Text>
        </View>
        {past && (
          <Pressable style={styles.rateBtn} disabled={reviewedOrderIds.has(o.id)} onPress={() => openFeedback(o.id)}>
            <Text style={styles.rateBtnText}>{reviewedOrderIds.has(o.id) ? 'Feedback submitted' : 'Rate this order'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderList = () => {
    const visibleOrders = tab === 'active' ? activeOrders : pastOrders;
    return (
      <>
        <Text style={[styles.title, { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }]}>My Orders</Text>
        <View style={styles.tabsWrap}>
          <View style={{ flexDirection: 'row' }}>
            {(['active', 'past'] as const).map((t) => (
              <Pressable key={t} style={styles.tabItem} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.muted }]}>
                  {t === 'active' ? `Active Orders (${activeOrders.length})` : 'Past Orders'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.tabTrack}>
            <View style={[styles.tabUnderline, { left: tab === 'active' ? '0%' : '50%' }]} />
          </View>
        </View>
        <View style={{ paddingTop: 16 }}>
          {paymentMessage && <Text style={styles.paymentMessage}>{paymentMessage}</Text>}
          {loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyBox}>
                <Image source={images.logo} style={{ width: 160, height: 120 }} resizeMode="contain" />
              </View>
              <Text style={styles.emptyText}>Loading your orders…</Text>
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <View style={styles.emptyBox}>
                <Image source={images.logo} style={{ width: 160, height: 120 }} resizeMode="contain" />
              </View>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : visibleOrders.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyBox}>
                <Image source={images.logo} style={{ width: 160, height: 120 }} resizeMode="contain" />
              </View>
              <Text style={styles.emptyText}>{tab === 'active' ? 'You have no active orders.' : 'You have no completed orders yet.'}</Text>
            </View>
          ) : (
            visibleOrders.map((o) => orderCard(o, tab === 'past'))
          )}
        </View>
      </>
    );
  };

  const renderDetails = () => (
    <View style={{ paddingBottom: 20 }}>
      <View style={styles.detailsHead}>
        <Pressable onPress={() => setSub('list')} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.detailsTitle}>Order Details</Text>
      </View>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.orderPill}>
          <Text style={styles.orderPillText}>ORDER# {detailOrder?.id.slice(0, 8).toUpperCase() ?? 'PENDING'}</Text>
        </View>
        <Text style={styles.helpLink}>Get help with this order</Text>
        <Text style={styles.metaText}>Order Date: {detailOrder ? new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(detailOrder.requested_at)) : '—'}</Text>

        <View style={styles.locRow}>
          <Feather name="map-pin" size={24} color={colors.primary} />
          <View>
            <Text style={styles.locLabel}>Ordered From</Text>
            <Text style={styles.locValue}>{detailOrder?.branch_id ?? 'Your selected branch'}</Text>
          </View>
        </View>
        <View style={styles.locRow}>
          <Feather name="map-pin" size={24} color="#CFCFCF" />
          <View>
            <Text style={styles.locLabel}>Delivery Address</Text>
            <Text style={styles.locValue}>{detailOrder?.delivery_address ?? '—'}</Text>
          </View>
        </View>
        <View style={[styles.locRow, { alignItems: 'center' }]}>
          <Feather name="credit-card" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.locValue}>{detailOrder?.payment_method ?? 'Cash on Delivery'}</Text>
            <Text style={styles.metaText}>
              {detailOrder?.payment_method === 'PayMongo'
                ? detailOrder.payment_status === 'Paid' ? 'Paid' : 'Awaiting payment'
                : detailOrder?.payment_status === 'Paid' ? 'Paid on delivery' : 'Pay on delivery'}
            </Text>
            {detailOrder?.payment_method === 'PayMongo' && detailOrder.payment_status !== 'Paid' && (
              <Pressable
                style={[styles.retryPaymentBtn, retryingOrderId !== null && styles.disabledBtn]}
                disabled={retryingOrderId !== null}
                onPress={() => void retryPayment(detailOrder)}
              >
                <Text style={styles.retryPaymentText}>
                  {retryingOrderId === detailOrder.id ? 'Opening PayMongo…' : 'Retry payment'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <View style={styles.productCard}>
        <Image source={cylinderFor(detailOrder?.cylinder_size ?? '11 KG')} style={{ width: 82, height: 120, marginHorizontal: 24 }} resizeMode="contain" />
        <View style={styles.productInfo}>
          <Text style={styles.productSize}>{detailOrder?.cylinder_size ?? '11 KG'}</Text>
          <Text style={styles.cylQty}>Qty: {detailOrder?.quantity ?? 1}</Text>
          <Text style={styles.productPrice}>{formatMoney(detailOrder?.total_amount ?? null)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      <AppHeader onProfile={() => onNavigate('profile', { profileSection: 'personal' })} />

      <ScrollView style={styles.sheet} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {sub === 'list' && renderList()}
        {sub === 'details' && renderDetails()}
      </ScrollView>

      <OrderFeedbackModal
        orderId={ratingOrderId}
        customerId={customerId}
        onClose={closeFeedback}
        onReviewed={(orderId) => {
          setReviewedOrderIds((current) => new Set([...current, orderId]));
          setTab('past');
        }}
      />

      <BottomNav active="orders" onNavigate={onNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24 },
  title: { fontFamily: fonts.semibold, fontSize: 20, color: colors.label },

  tabsWrap: { paddingHorizontal: 24 },
  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 8 },
  tabText: { fontFamily: fonts.semibold, fontSize: 13 },
  tabTrack: { height: 1, backgroundColor: colors.divider },
  tabUnderline: { position: 'absolute', top: 0, height: 1, width: '50%', backgroundColor: colors.primary },

  empty: { alignItems: 'center', paddingVertical: 48, marginHorizontal: 16 },
  emptyBox: { width: 250, height: 193, borderRadius: radii.card, backgroundColor: 'rgba(0,123,193,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },

  orderCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: radii.card, borderWidth: 1, borderColor: colors.activeCardBorder, backgroundColor: '#fff', overflow: 'hidden', ...cardShadow },
  completedBadge: { position: 'absolute', top: 10, right: 10, zIndex: 1, backgroundColor: colors.green, height: 17, width: 67, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center' },
  completedText: { fontFamily: fonts.medium, fontSize: 8, color: '#c2dfbe' },
  orderBody: { flexDirection: 'row', alignItems: 'center', minHeight: 130 },
  orderCyl: { width: 72, height: 110, marginLeft: 36, marginRight: 8 },
  orderInfo: { flex: 1, justifyContent: 'center', paddingVertical: 12, gap: 2 },
  cylSize: { fontFamily: fonts.semibold, fontSize: 20, color: colors.label },
  cylQty: { fontFamily: fonts.medium, fontSize: 12, color: colors.grayText },
  cylPrice: { fontFamily: fonts.semibold, fontSize: 20, color: colors.primary },
  orderStatus: { fontFamily: fonts.medium, fontSize: 11, color: colors.grayText },
  retryPaymentBtn: { alignSelf: 'flex-start', marginTop: 5, borderRadius: radii.chip, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5 },
  retryPaymentText: { fontFamily: fonts.semibold, fontSize: 11, color: '#fff' },
  disabledBtn: { opacity: 0.55 },
  paymentMessage: { marginHorizontal: 20, marginBottom: 12, fontFamily: fonts.medium, fontSize: 12, color: colors.primary },
  orderFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: colors.activeFooter },
  footerLink: { fontFamily: fonts.semibold, fontSize: 12, color: colors.heading },
  footerDate: { fontFamily: fonts.medium, fontSize: 10, color: colors.grayText },
  rateBtn: { backgroundColor: colors.primary, borderRadius: radii.card, paddingHorizontal: 12, paddingVertical: 4 },
  rateBtnText: { fontFamily: fonts.medium, fontSize: 11, color: '#fff' },

  detailsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  detailsTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.label },
  orderPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,123,193,0.15)', borderRadius: radii.card, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 8 },
  orderPillText: { fontFamily: fonts.medium, fontSize: 14, color: colors.primary },
  helpLink: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textDecorationLine: 'underline', marginBottom: 4 },
  metaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.grayText },
  locRow: { flexDirection: 'row', gap: 16, marginTop: 20 },
  locLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.grayText },
  locValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.label },
  productCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 20, borderRadius: 12, borderWidth: 1, borderColor: colors.activeCardBorder, backgroundColor: '#fff', minHeight: 140, ...cardShadow },
  productInfo: { flex: 1, alignItems: 'center', gap: 2 },
  productSize: { fontFamily: fonts.bold, fontSize: 22, color: colors.label },
  productPrice: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginTop: 4 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }, // kept for reference; backdrop is now absoluteFill

});
