import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { cylinderFor, images } from '@/lib/assets';
import { AppHeader } from '@/components/ui/AppHeader';
import { BottomNav } from '@/components/ui/BottomNav';
import { SideMenu } from '@/components/ui/SideMenu';
import { LogoutConfirmModal } from '@/components/ui/overlays';
import type { MainScreen, MainTab } from '@/navigation/types';

/**
 * Orders (Figma "MyOrders"): active/past tabs, order details, and the two-step
 * post-delivery CSAT feedback (rate rider → rate branch + comment).
 *
 * SCAFFOLD: order data is Figma mock. Wire to the SRD endpoints; surface delivery
 * status MILESTONES only — never live GPS (AGENTS.md §7).
 */
type Sub = 'list' | 'details' | 'feedback-rate' | 'feedback-comment';

const ACTIVE_ORDERS = [{ id: '12345', size: '11 KG', qty: 2, price: '₱ 1,000' }];
const PAST_ORDERS = [{ id: '12345', size: '11 KG', qty: 2, price: '₱ 1,000', date: 'October 10, 2025' }];

function Stars({ value, onRate }: { value: number; onRate: (n: number) => void }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onRate(n)} hitSlop={4}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={48} color={n <= value ? colors.primary : colors.cardBorder} />
        </Pressable>
      ))}
    </View>
  );
}

export function OrdersScreen({ onNavigate }: { onNavigate: (screen: MainScreen, opts?: { tab?: MainTab }) => void }) {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [sub, setSub] = useState<Sub>('list');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const showFeedback = sub === 'feedback-rate' || sub === 'feedback-comment';

  const orderCard = (o: { id: string; size: string; qty: number; price: string; date?: string }, past: boolean) => (
    <View key={o.id} style={styles.orderCard}>
      {past && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>COMPLETED</Text>
        </View>
      )}
      <View style={styles.orderBody}>
        <Image source={cylinderFor(o.size)} style={styles.orderCyl} resizeMode="contain" />
        <View style={styles.orderInfo}>
          <Text style={styles.cylSize}>{o.size}</Text>
          <Text style={styles.cylQty}>Qty: {o.qty}</Text>
          <Text style={styles.cylPrice}>{o.price}</Text>
        </View>
      </View>
      <View style={[styles.orderFooter, { height: past ? 50 : 30 }]}>
        <View>
          <Pressable onPress={() => setSub('details')}>
            <Text style={styles.footerLink}>View Order Details</Text>
          </Pressable>
          {past && o.date ? <Text style={styles.footerDate}>Order Date: {o.date}</Text> : null}
        </View>
        {past && (
          <Pressable style={styles.rateBtn} onPress={() => { setRating(0); setComment(''); setSub('feedback-rate'); }}>
            <Text style={styles.rateBtnText}>Rate this order</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderList = () => {
    const orders = tab === 'active' ? ACTIVE_ORDERS : PAST_ORDERS;
    return (
      <>
        <Text style={[styles.title, { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }]}>My Orders</Text>
        <View style={styles.tabsWrap}>
          <View style={{ flexDirection: 'row' }}>
            {(['active', 'past'] as const).map((t) => (
              <Pressable key={t} style={styles.tabItem} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.muted }]}>
                  {t === 'active' ? `Active Orders (${ACTIVE_ORDERS.length})` : 'Past Orders'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.tabTrack}>
            <View style={[styles.tabUnderline, { left: tab === 'active' ? '0%' : '50%' }]} />
          </View>
        </View>
        <View style={{ paddingTop: 16 }}>
          {orders.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyBox}>
                <Image source={images.logo} style={{ width: 160, height: 120 }} resizeMode="contain" />
              </View>
              <Text style={styles.emptyText}>You have no active orders.</Text>
            </View>
          ) : (
            orders.map((o) => orderCard(o, tab === 'past'))
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
          <Text style={styles.orderPillText}>ORDER# 12345</Text>
        </View>
        <Text style={styles.helpLink}>Get help with this order</Text>
        <Text style={styles.metaText}>Order Date: 10 October 2025, 10:00 AM</Text>

        <View style={styles.locRow}>
          <Feather name="map-pin" size={24} color={colors.primary} />
          <View>
            <Text style={styles.locLabel}>Ordered From</Text>
            <Text style={styles.locValue}>Superkalan Gaz - Manila Branch</Text>
          </View>
        </View>
        <View style={styles.locRow}>
          <Feather name="map-pin" size={24} color="#CFCFCF" />
          <View>
            <Text style={styles.locLabel}>Delivery Address</Text>
            <Text style={styles.locValue}>123 Main St, Metro Manila</Text>
          </View>
        </View>
        <View style={[styles.locRow, { alignItems: 'center' }]}>
          <Feather name="credit-card" size={24} color={colors.primary} />
          <Text style={styles.locValue}>Cash On Delivery</Text>
        </View>
      </View>

      <View style={styles.productCard}>
        <Image source={cylinderFor('11 KG')} style={{ width: 82, height: 120, marginHorizontal: 24 }} resizeMode="contain" />
        <View style={styles.productInfo}>
          <Text style={styles.productSize}>11 KG</Text>
          <Text style={styles.cylQty}>Qty: 2</Text>
          <Text style={styles.productPrice}>₱ 1,000</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.flex}>
      <AppHeader onMenu={() => setMenuOpen(true)} />

      <ScrollView style={styles.sheet} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {sub === 'list' && renderList()}
        {sub === 'details' && renderDetails()}
        {showFeedback && (tab === 'past' ? renderList() : renderDetails())}
      </ScrollView>

      {/* Feedback sheet */}
      <Modal visible={showFeedback} transparent animationType="slide" onRequestClose={() => setSub('list')}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSub('list')} />
        <View style={styles.feedbackSheet}>
          <View style={styles.progressRow}>
            {sub === 'feedback-comment' ? (
              <>
                <View style={styles.dot} />
                <View style={styles.dash} />
              </>
            ) : (
              <>
                <View style={styles.dash} />
                <View style={styles.dot} />
              </>
            )}
          </View>
          {sub === 'feedback-rate' && (
            <View style={styles.fbAvatarWrap}>
              <View style={styles.fbAvatar}>
                <Feather name="user" size={42} color="#fff" />
              </View>
            </View>
          )}
          <Text style={styles.fbTitle}>How was your experience?</Text>
          <Text style={styles.fbSub}>
            {sub === 'feedback-comment'
              ? 'Help us improve your delivery experience by rating our branch.'
              : 'Help us improve your delivery experience by rating your rider.'}
          </Text>
          <Stars value={rating} onRate={setRating} />
          {sub === 'feedback-comment' && (
            <TextInput
              style={styles.commentBox}
              placeholder="Write your thoughts..."
              placeholderTextColor={colors.muted}
              multiline
              value={comment}
              onChangeText={setComment}
            />
          )}
          <Pressable
            style={[styles.fbBtn, { backgroundColor: rating > 0 ? colors.primary : colors.disabledBlue }]}
            disabled={rating === 0}
            onPress={() => {
              if (sub === 'feedback-rate') setSub('feedback-comment');
              else { setSub('list'); setTab('past'); }
            }}
          >
            <Text style={styles.fbBtnText}>{sub === 'feedback-comment' ? 'Submit Feedback' : 'Next'}</Text>
          </Pressable>
        </View>
      </Modal>

      <BottomNav active="orders" onNavigate={onNavigate} />
      <SideMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onProfile={() => onNavigate('profile', { tab: 'profile' })}
        onOrders={() => setSub('list')}
        onFaqs={() => onNavigate('faqs')}
        onGuide={() => onNavigate('home', { tab: 'home' })}
        onLogout={() => setLogoutConfirm(true)}
      />
      <LogoutConfirmModal visible={logoutConfirm} onConfirm={() => { setLogoutConfirm(false); signOut(); }} onCancel={() => setLogoutConfirm(false)} />
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

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  feedbackSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, minHeight: 420 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  dash: { width: 40, height: 8, borderRadius: 4, backgroundColor: colors.muted },
  fbAvatarWrap: { alignItems: 'center', marginBottom: 12 },
  fbAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.avatarGray, alignItems: 'center', justifyContent: 'center' },
  fbTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading, marginBottom: 4 },
  fbSub: { fontFamily: fonts.regular, fontSize: 15, color: colors.grayText, marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  commentBox: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radii.chip, padding: 12, height: 100, fontFamily: fonts.regular, fontSize: 15, color: colors.label, textAlignVertical: 'top', marginBottom: 16 },
  fbBtn: { height: 47, borderRadius: radii.card, alignItems: 'center', justifyContent: 'center' },
  fbBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff' },
});
