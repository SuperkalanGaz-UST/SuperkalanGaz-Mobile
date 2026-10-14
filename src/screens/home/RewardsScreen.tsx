import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { images } from '@/lib/assets';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, apiErrorMessage } from '@/lib/api';

/**
 * Rewards surface (Figma "MyRewards / AllRewards / ActiveCodes"). Rendered inside
 * Home when the Rewards tab is active, so it shares Home's header + bottom nav.
 */
type Sub = 'my' | 'all' | 'activeCodes';
type Reward = { name: string; shortName: string; pts: number; img: number };
type CatalogItem = {
  id: string;
  branch_id: string;
  name: string;
  points_cost: number;
};
type HouseholdAccount = { branch_id: string; points_balance: number };
type CommercialAccount = {
  branch_id: string;
  branch_name: string | null;
  current_cycle_count: number;
  completed_cycles: number;
};
type CommercialPurchase = {
  id: string;
  service_request_id: string;
  cycle_number: number;
  counted_at: string;
  created_at: string;
};
type HistoryRow = {
  id: string;
  type: string;
  points_delta: number;
  created_at: string;
};
type ActiveRedemption = {
  id: string;
  catalog_item_name: string | null;
  points_spent: number | null;
  redemption_code: string | null;
  status: string;
};

/** Map reward catalog names to bundled images. Falls back to notebook. */
const REWARD_IMAGES: Record<string, number> = {
  notebook: images.rewardNotebook,
  calendar: images.rewardCalendar,
  umbrella: images.rewardUmbrella,
  mug: images.rewardMug,
};
function rewardImageFor(name: string): number {
  const lower = name.toLowerCase();
  for (const [key, img] of Object.entries(REWARD_IMAGES)) {
    if (lower.includes(key)) return img;
  }
  return images.rewardNotebook;
}

const COMMERCIAL_PURCHASE_TARGET = 30;

function RewardCard({ item, onPress, dim }: { item: Reward; onPress?: () => void; dim?: boolean }) {
  return (
    <Pressable style={[styles.rewardCard, dim && { opacity: 0.3 }]} onPress={onPress} disabled={!onPress}>
      <Image source={item.img} style={styles.rewardImg} resizeMode="contain" />
      <View style={styles.ptsPill}>
        <Text style={styles.ptsPillText}>{item.pts} pts</Text>
      </View>
      <Text style={styles.rewardName}>{item.name}</Text>
    </Pressable>
  );
}

function CommercialRewardsScreen({
  onExit,
  accounts,
  purchases,
  activeCodes,
  loyaltyError,
  onRefresh,
}: {
  onExit: () => void;
  accounts: CommercialAccount[];
  purchases: CommercialPurchase[];
  activeCodes: ActiveRedemption[];
  loyaltyError: string | null;
  onRefresh: () => void;
}) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const account = [...accounts].sort(
    (a, b) =>
      b.completed_cycles - a.completed_cycles ||
      b.current_cycle_count - a.current_cycle_count,
  )[0];
  const purchaseCount = account?.current_cycle_count ?? 0;
  const remaining = Math.max(0, COMMERCIAL_PURCHASE_TARGET - purchaseCount);
  const progressWidth: `${number}%` = `${Math.min(
    100,
    (purchaseCount / COMMERCIAL_PURCHASE_TARGET) * 100,
  )}%`;
  const history = showAllHistory ? purchases : purchases.slice(0, 3);
  const availableRewards = account?.completed_cycles ?? 0;

  const requestReward = async () => {
    if (!account || availableRewards < 1) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      const response = await apiFetch('/loyalty/me/commercial-redemptions', {
        method: 'POST',
        body: JSON.stringify({ branchId: account.branch_id }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setRedeemError(apiErrorMessage(data, 'Could not request the free cylinder.'));
        return;
      }
      onRefresh();
    } catch {
      setRedeemError('Rewards temporarily unavailable.');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.commercialPad}>
      <View style={styles.titleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          onPress={onExit}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.commercialTitle}>Commercial Rewards</Text>
      </View>

      {loyaltyError ? <Text style={styles.commercialApprovalNote}>{loyaltyError}</Text> : null}

      <View style={styles.commercialSummary}>
        <Text style={styles.commercialCount}>
          {purchaseCount}{' '}
          <Text style={styles.commercialCountOf}>of {COMMERCIAL_PURCHASE_TARGET}</Text>
        </Text>
        <Text style={styles.commercialCountLabel}>{account?.branch_name ?? 'No branch purchases yet'}</Text>
        <Text style={styles.commercialCountLabel}>qualifying purchases</Text>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${purchaseCount} of ${COMMERCIAL_PURCHASE_TARGET} qualifying purchases`}
          style={styles.commercialProgressTrack}
        >
          <View style={[styles.commercialProgressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.commercialRemaining}>{remaining} purchases remaining</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          numberOfLines={1}
          style={styles.commercialDescription}
        >
          Complete 30 qualifying purchases to earn 1 free cylinder.
        </Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          numberOfLines={1}
          style={styles.commercialApprovalNote}
        >
          Branch Manager approval applies when Dual Authorization is on.
        </Text>
      </View>

      <View style={styles.commercialDivider} />

      <View style={styles.commercialSectionRow}>
        <Text style={styles.commercialSectionTitle}>Purchase Progress</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAllHistory((current) => !current)}
          hitSlop={8}
        >
          <Text style={styles.link}>{showAllHistory ? 'Show Less' : 'View All'}</Text>
        </Pressable>
      </View>

      {history.length === 0 ? (
        <Text style={styles.commercialHistoryDate}>No counted purchases yet.</Text>
      ) : history.map((row, index) => (
        <View key={row.id}>
          <View style={styles.commercialHistoryRow}>
            <View
              style={[
                styles.commercialHistoryIcon,
              ]}
            >
              <Feather
                name="check"
                size={16}
                color="#fff"
              />
            </View>
            <View style={styles.commercialHistoryCopy}>
              <Text style={styles.commercialHistoryLabel}>Qualifying purchase</Text>
              <Text style={styles.commercialHistoryDate}>{new Date(row.counted_at).toLocaleDateString()}</Text>
            </View>
            <Text
              style={[
                styles.commercialHistoryValue,
              ]}
            >
              +1
            </Text>
          </View>
          {index < history.length - 1 && <View style={styles.hair} />}
        </View>
      ))}

      <Text style={styles.commercialRewardTitle}>Your Reward</Text>
      <View style={styles.commercialRewardCard}>
        <Text style={styles.commercialRewardName}>1 free cylinder</Text>
        <Text style={styles.commercialRewardDescription}>
          {availableRewards} free cylinder reward(s) available
        </Text>
        {redeemError ? <Text style={styles.commercialApprovalNote}>{redeemError}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: availableRewards < 1 || redeeming }}
          disabled={availableRewards < 1 || redeeming}
          style={styles.commercialRewardButton}
          onPress={requestReward}
        >
          <Text style={styles.commercialRewardButtonText}>
            {redeeming
              ? 'Requesting…'
              : availableRewards > 0
                ? 'Request free cylinder'
                : `${remaining} purchases remaining`}
          </Text>
        </Pressable>
        {activeCodes.length > 0 ? (
          <Text style={styles.commercialApprovalNote}>
            {activeCodes.length} active commercial redemption(s)
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

export function RewardsScreen({ 
  onExit, 
  initialSub = 'my',
  points,
  catalog,
  history,
  householdAccounts,
  activeCodes,
  commercialAccounts,
  commercialPurchases,
  loyaltyError,
  onRefresh,
}: { 
  onExit: () => void; 
  initialSub?: Sub;
  points: number;
  catalog: CatalogItem[];
  history: HistoryRow[];
  householdAccounts: HouseholdAccount[];
  activeCodes: ActiveRedemption[];
  commercialAccounts: CommercialAccount[];
  commercialPurchases: CommercialPurchase[];
  loyaltyError: string | null;
  onRefresh: () => void;
}) {
  const { accountType } = useAuth();
  const [sub, setSub] = useState<Sub>(initialSub);
  const [redeemItem, setRedeemItem] = useState<CatalogItem | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [successPending, setSuccessPending] = useState(false);
  const [viewCodeItem, setViewCodeItem] = useState<ActiveRedemption | null>(null);
  const [codeConfirmed, setCodeConfirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const availableFor = (item: CatalogItem) =>
    householdAccounts.find((account) => account.branch_id === item.branch_id)?.points_balance ?? 0;

  const handleRedeem = async () => {
    if (!redeemItem) return;
    setRedeemError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/loyalty/me/redemptions', {
        method: 'POST',
        body: JSON.stringify({ catalogItemId: redeemItem.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = apiErrorMessage(data, 'Redemption failed');
        setRedeemError(msg);
      } else {
        const code = data.redemption?.redemption_code as string | null | undefined;
        setSuccessPending(!code);
        setSuccessCode(code ?? 'Awaiting Branch Manager approval');
        onRefresh();
      }
    } catch (e) {
      setRedeemError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (accountType === 'commercial') {
    return (
      <View style={styles.sheet}>
        <CommercialRewardsScreen
          onExit={onExit}
          accounts={commercialAccounts}
          purchases={commercialPurchases}
          activeCodes={activeCodes}
          loyaltyError={loyaltyError}
          onRefresh={onRefresh}
        />
      </View>
    );
  }

  return (
    <View style={styles.sheet}>
      {/* ── My Rewards ── */}
      {sub === 'my' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad}>
          <View style={styles.titleRow}>
            <Pressable onPress={onExit} hitSlop={8}>
              <Feather name="chevron-left" size={24} color={colors.heading} />
            </Pressable>
            <Text style={styles.title}>My Rewards</Text>
          </View>
          {loyaltyError ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={16} color="#fff" />
              <Text style={styles.errorBannerText}>{loyaltyError}</Text>
              <Pressable onPress={onRefresh} hitSlop={8}>
                <Text style={styles.errorBannerRetry}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.pointsBig}>{points} points</Text>
          <Text style={styles.blurb}>
            Earn more points from ordering at Superkalan Gaz branches. Expect your points to reflect
            within 24 hours. Points expire 12 months after they were earned.
          </Text>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Points History</Text>
            <Pressable onPress={() => setSub('all')}>
              <Text style={styles.link}>View All</Text>
            </Pressable>
          </View>
          {history.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.medium, color: colors.grayText, fontSize: 14 }}>
                No points history yet. Order LPG to start earning!
              </Text>
            </View>
          ) : (
            history.slice(0, 4).map((row, i) => (
              <View key={row.id}>
                <View style={styles.histRow}>
                  <Feather
                    name={row.type === 'redeem' ? 'arrow-down' : 'arrow-up'}
                    size={18}
                    color={row.type === 'redeem' ? colors.danger : colors.greenBright}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histType}>{row.type === 'earn' ? 'Earned' : 'Used'}</Text>
                    <Text style={styles.histDate}>{new Date(row.created_at).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.histPts}>
                    {row.type === 'earn' ? '+' : '-'}{Math.abs(row.points_delta)}
                  </Text>
                </View>
                {i < Math.min(history.length, 4) - 1 && <View style={styles.hair} />}
              </View>
            ))
          )}

          <Text style={[styles.title, { marginTop: 24, marginBottom: 12 }]}>Claim Your Reward!</Text>
          {catalog.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.grayText }}>No rewards available yet. Check back soon!</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {catalog.map((item) => (
                <View key={item.id} style={{ width: 146 }}>
                  <RewardCard
                    item={{ name: item.name, shortName: item.name, pts: item.points_cost, img: rewardImageFor(item.name) }}
                    dim={item.points_cost > availableFor(item)}
                    onPress={() => {
                      if (item.points_cost > availableFor(item)) return;
                      setSub('all');
                      setRedeemItem(item);
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </ScrollView>
      )}

      {/* ── All Rewards ── */}
      {sub === 'all' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad}>
          <View style={styles.titleRowBetween}>
            <View style={styles.titleRow}>
              <Pressable onPress={() => { setSub('my'); setRedeemItem(null); setSuccessCode(null); }} hitSlop={8}>
                <Feather name="chevron-left" size={24} color={colors.heading} />
              </Pressable>
              <Text style={styles.title}>All Rewards</Text>
            </View>
            <Text style={styles.title}>{points} pts</Text>
          </View>
          <Text style={styles.redeemHead}>Redeem with your points</Text>
          {catalog.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.grayText }}>No rewards available yet. Check back soon!</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {catalog.map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <RewardCard
                    item={{ name: item.name, shortName: item.name, pts: item.points_cost, img: rewardImageFor(item.name) }}
                    dim={item.points_cost > availableFor(item)}
                    onPress={() => {
                      if (item.points_cost > availableFor(item)) return;
                      setRedeemItem(item);
                    }}
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Active Codes ── */}
      {sub === 'activeCodes' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad}>
          <View style={styles.titleRowBetween}>
            <View style={styles.titleRow}>
              <Pressable onPress={() => { setSub('all'); setViewCodeItem(null); setCodeConfirmed(false); }} hitSlop={8}>
                <Feather name="chevron-left" size={24} color={colors.heading} />
              </Pressable>
              <Text style={styles.title}>All Rewards</Text>
            </View>
            <Text style={styles.title}>{points} pts</Text>
          </View>
          <Text style={styles.redeemHead}>Redeem with your points</Text>
          <View style={styles.grid}>
            {catalog.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                <RewardCard item={{ name: item.name, shortName: item.name, pts: item.points_cost, img: rewardImageFor(item.name) }} dim={item.points_cost > availableFor(item)} />
              </View>
            ))}
          </View>
          <Text style={[styles.redeemHead, { marginTop: 24 }]}>My Active Redemptions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {activeCodes.map((code) => (
              <View key={code.id} style={{ width: 146 }}>
                <Pressable
                  style={[styles.rewardCard, codeConfirmed && { opacity: 0.3 }]}
                  onPress={() => !codeConfirmed && setViewCodeItem(code)}
                >
                  <Image source={rewardImageFor(code.catalog_item_name || '')} style={styles.rewardImg} resizeMode="contain" />
                  <View style={styles.ptsPill}>
                    <Text style={styles.ptsPillText}>{code.points_spent} pts</Text>
                  </View>
                  <Text style={[styles.rewardName, { color: colors.grayText }]}>Status: {code.status}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      )}

      {/* Redeem confirm sheet */}
      <Modal visible={!!redeemItem && !successCode} transparent animationType="slide" onRequestClose={() => { setRedeemItem(null); setRedeemError(null); }}>
        <Pressable style={styles.sheetBackdrop} onPress={() => { setRedeemItem(null); setRedeemError(null); }} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{redeemItem?.name}</Text>
            <Pressable onPress={() => { setRedeemItem(null); setRedeemError(null); }} hitSlop={8}>
              <Feather name="x" size={18} color={colors.gray} />
            </Pressable>
          </View>
          <View style={[styles.ptsPill, { alignSelf: 'flex-start', marginBottom: 20 }]}>
            <Text style={styles.ptsPillText}>{redeemItem?.points_cost} pts</Text>
          </View>
          {redeemError ? (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.danger, flex: 1 }}>{redeemError}</Text>
            </View>
          ) : null}
          <Pressable style={styles.solidBtn} onPress={handleRedeem} disabled={loading}>
            <Text style={styles.solidBtnText}>{loading ? 'REDEEMING...' : 'REDEEM'}</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Redeem success */}
      <Modal visible={!!successCode} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.successCard}>
            <Pressable
              style={styles.successClose}
              onPress={() => { setRedeemItem(null); setSuccessCode(null); setSuccessPending(false); setSub('activeCodes'); }}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={colors.grayText} />
            </Pressable>
            <View style={styles.successCircle}>
              <Feather name="check" size={44} color="#fff" />
            </View>
            <Text style={styles.successTitle}>{successPending ? 'Request Submitted' : 'Reward Approved!'}</Text>
            <Text style={styles.successCode}>{successCode}</Text>
            <Text style={styles.successNote}>
              {successPending
                ? 'A redemption code will be issued after Branch Manager approval.'
                : 'To claim your reward, show this code at the issuing Superkalan Gaz branch.'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* View code sheet */}
      <Modal visible={!!viewCodeItem} transparent animationType="slide" onRequestClose={() => setViewCodeItem(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setViewCodeItem(null)} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHead}>
            <View>
              <Text style={styles.sheetTitle}>{viewCodeItem?.catalog_item_name}</Text>
              <Text style={styles.codeBig}>{viewCodeItem?.redemption_code || '—'}</Text>
            </View>
            <Pressable onPress={() => setViewCodeItem(null)} hitSlop={8}>
              <Feather name="x" size={18} color={colors.gray} />
            </Pressable>
          </View>
          <View style={[styles.ptsPill, { alignSelf: 'flex-start', marginBottom: 20 }]}>
            <Text style={styles.ptsPillText}>{viewCodeItem?.points_spent} pts</Text>
          </View>
          <Pressable style={styles.solidBtn} onPress={() => { setViewCodeItem(null); setCodeConfirmed(true); }}>
            <Text style={styles.solidBtnText}>DONE</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24 },
  pad: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 130 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.semibold, fontSize: 20, color: colors.label },
  pointsBig: { fontFamily: fonts.semibold, fontSize: 32, color: colors.primary, marginTop: 8 },
  blurb: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray, marginTop: 12, lineHeight: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.primary },
  link: { fontFamily: fonts.regular, fontSize: 13, color: colors.primary, textDecorationLine: 'underline' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  histType: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray },
  histDate: { fontFamily: fonts.regular, fontSize: 10, color: '#c7c7c7' },
  histPts: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
  hair: { height: 1, backgroundColor: colors.cardBorder },
  redeemHead: { fontFamily: fonts.bold, fontSize: 22, color: colors.primary, marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 12 },
  rewardCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    alignItems: 'center',
    padding: 12,
    ...cardShadow,
  },
  rewardImg: { width: 85, height: 85, marginBottom: 8 },
  ptsPill: { borderWidth: 1, borderColor: colors.primary, borderRadius: radii.card, paddingHorizontal: 12, paddingVertical: 2, marginBottom: 8 },
  ptsPillText: { fontFamily: fonts.medium, fontSize: 10, color: colors.label },
  rewardName: { fontFamily: fonts.semibold, fontSize: 9, color: colors.label, textAlign: 'center' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E53935',
    borderRadius: radii.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  errorBannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: '#fff' },
  errorBannerRetry: { fontFamily: fonts.semibold, fontSize: 12, color: '#fff', textDecorationLine: 'underline' },

  commercialPad: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 130 },
  commercialTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 20, color: colors.label },
  commercialSummary: { marginTop: 28 },
  commercialCount: {
    fontFamily: fonts.semibold,
    fontSize: 44,
    lineHeight: 52,
    color: colors.primary,
  },
  commercialCountOf: { fontSize: 28 },
  commercialCountLabel: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.label,
    marginTop: -2,
  },
  commercialProgressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.inputBorder,
    marginTop: 20,
  },
  commercialProgressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  commercialRemaining: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.label,
    marginTop: 8,
  },
  commercialDescription: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.label,
    marginTop: 16,
  },
  commercialApprovalNote: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 15,
    color: colors.grayText,
    marginTop: 5,
  },
  commercialDivider: { height: 1, backgroundColor: colors.cardBorder, marginTop: 22 },
  commercialSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 4,
  },
  commercialSectionTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.label },
  commercialHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingVertical: 10,
  },
  commercialHistoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenBright,
  },
  commercialRewardHistoryIcon: { backgroundColor: colors.redeemPale },
  commercialHistoryCopy: { flex: 1 },
  commercialHistoryLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.label },
  commercialHistoryDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.grayText,
    marginTop: 2,
  },
  commercialHistoryValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.primary },
  commercialRewardHistoryValue: { fontFamily: fonts.medium, fontSize: 12, color: colors.grayText },
  commercialRewardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.label,
    marginTop: 24,
    marginBottom: 12,
  },
  commercialRewardCard: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    padding: 16,
  },
  commercialRewardName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.label },
  commercialRewardDescription: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.grayText,
    marginTop: 3,
  },
  commercialRewardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radii.button,
    backgroundColor: colors.redeemPale,
    marginTop: 16,
  },
  commercialRewardButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.disabledGray,
  },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading, flexShrink: 1 },
  codeBig: { fontFamily: fonts.semibold, fontSize: 32, color: colors.heading, marginTop: 4 },
  solidBtn: { backgroundColor: colors.primary, borderRadius: radii.card, paddingVertical: 12, alignItems: 'center' },
  solidBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff' },

  centerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  successCard: { width: 320, backgroundColor: '#fff', borderRadius: radii.card, paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center' },
  successClose: { position: 'absolute', top: 12, right: 12 },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.primary, marginBottom: 4 },
  successCode: { fontFamily: fonts.semibold, fontSize: 20, color: colors.primary, marginBottom: 12 },
  successNote: { fontFamily: fonts.semibold, fontSize: 10, color: colors.primary, textAlign: 'center' },
});
