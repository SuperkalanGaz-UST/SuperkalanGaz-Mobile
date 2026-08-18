import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { images } from '@/lib/assets';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Rewards surface (Figma "MyRewards / AllRewards / ActiveCodes"). Rendered inside
 * Home when the Rewards tab is active, so it shares Home's header + bottom nav.
 *
 * SCAFFOLD: reward progress, history, and redemption codes are mock data. Wire
 * each account type to its separate Loyalty endpoint when those endpoints land.
 */
type Sub = 'my' | 'all' | 'activeCodes';
type Reward = { name: string; shortName: string; pts: number; img: number };
type CommercialHistoryRow = {
  type: 'purchase' | 'reward';
  label: string;
  date: string;
};

const POINTS = 163;
const REWARD_ITEMS: Reward[] = [
  { name: 'Get Free Notebook and pen for 10 Points', shortName: 'Free Notebook and Pen', pts: 10, img: images.rewardNotebook },
  { name: 'Get Free Desk Calendar for 20 Points', shortName: 'Get Your Free Desk Calendar', pts: 20, img: images.rewardCalendar },
  { name: 'Get Free Umbrella for 30 Points', shortName: 'Get Your Free Umbrella', pts: 30, img: images.rewardUmbrella },
  { name: 'Get Free Mug for 40 Points', shortName: 'Get Your Free Mug', pts: 40, img: images.rewardMug },
];
const HISTORY = [
  { type: 'Earned', pts: '+10', date: '2025-01-02' },
  { type: 'Earned', pts: '+10', date: '2024-12-23' },
  { type: 'Used', pts: '-10', date: '2024-11-10' },
  { type: 'Earned', pts: '+10', date: '2024-10-15' },
];
const ACTIVE_CODE = { shortName: 'Free Notebook and Pen', pts: 10, img: images.rewardNotebook, code: 'SG-1234', validUntil: '10-10-2025' };

// Keep these mock values aligned with the commercial summary on Home until the
// purchase-count ledger is available from the Loyalty API.
const COMMERCIAL_PURCHASE_COUNT = 23;
const COMMERCIAL_PURCHASE_TARGET = 30;
const COMMERCIAL_HISTORY: CommercialHistoryRow[] = [
  { type: 'purchase', label: 'Qualifying purchase', date: '2025-05-02' },
  { type: 'purchase', label: 'Qualifying purchase', date: '2025-04-18' },
  { type: 'reward', label: 'Free cylinder claimed', date: '2025-03-12' },
  { type: 'purchase', label: 'Qualifying purchase', date: '2025-02-27' },
  { type: 'purchase', label: 'Qualifying purchase', date: '2025-02-10' },
];

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

function CommercialRewardsScreen({ onExit }: { onExit: () => void }) {
  const [showAllHistory, setShowAllHistory] = useState(false);
  const remaining = Math.max(0, COMMERCIAL_PURCHASE_TARGET - COMMERCIAL_PURCHASE_COUNT);
  const progressWidth: `${number}%` = `${Math.min(
    100,
    (COMMERCIAL_PURCHASE_COUNT / COMMERCIAL_PURCHASE_TARGET) * 100,
  )}%`;
  const history = showAllHistory ? COMMERCIAL_HISTORY : COMMERCIAL_HISTORY.slice(0, 3);

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

      <View style={styles.commercialSummary}>
        <Text style={styles.commercialCount}>
          {COMMERCIAL_PURCHASE_COUNT}{' '}
          <Text style={styles.commercialCountOf}>of {COMMERCIAL_PURCHASE_TARGET}</Text>
        </Text>
        <Text style={styles.commercialCountLabel}>qualifying purchases</Text>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${COMMERCIAL_PURCHASE_COUNT} of ${COMMERCIAL_PURCHASE_TARGET} qualifying purchases`}
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

      {history.map((row, index) => (
        <View key={`${row.type}-${row.date}`}>
          <View style={styles.commercialHistoryRow}>
            <View
              style={[
                styles.commercialHistoryIcon,
                row.type === 'reward' && styles.commercialRewardHistoryIcon,
              ]}
            >
              <Feather
                name={row.type === 'purchase' ? 'check' : 'award'}
                size={16}
                color={row.type === 'purchase' ? '#fff' : colors.gray}
              />
            </View>
            <View style={styles.commercialHistoryCopy}>
              <Text style={styles.commercialHistoryLabel}>{row.label}</Text>
              <Text style={styles.commercialHistoryDate}>{row.date}</Text>
            </View>
            <Text
              style={[
                styles.commercialHistoryValue,
                row.type === 'reward' && styles.commercialRewardHistoryValue,
              ]}
            >
              {row.type === 'purchase' ? '+1' : 'Claimed'}
            </Text>
          </View>
          {index < history.length - 1 && <View style={styles.hair} />}
        </View>
      ))}

      <Text style={styles.commercialRewardTitle}>Your Reward</Text>
      <View style={styles.commercialRewardCard}>
        <Text style={styles.commercialRewardName}>1 free cylinder</Text>
        <Text style={styles.commercialRewardDescription}>
          Available after 30 qualifying purchases
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: remaining > 0 }}
          disabled={remaining > 0}
          style={styles.commercialRewardButton}
        >
          <Text style={styles.commercialRewardButtonText}>
            {remaining > 0 ? `${remaining} purchases remaining` : 'Reward available'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function RewardsScreen({ onExit, initialSub = 'my' }: { onExit: () => void; initialSub?: Sub }) {
  const { accountType } = useAuth();
  const [sub, setSub] = useState<Sub>(initialSub);
  const [redeemItem, setRedeemItem] = useState<Reward | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [viewCode, setViewCode] = useState(false);
  const [codeConfirmed, setCodeConfirmed] = useState(false);

  if (accountType === 'commercial') {
    return (
      <View style={styles.sheet}>
        <CommercialRewardsScreen onExit={onExit} />
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
          <Text style={styles.pointsBig}>{POINTS} points</Text>
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
          {HISTORY.map((row, i) => (
            <View key={i}>
              <View style={styles.histRow}>
                <Feather
                  name={row.type === 'Used' ? 'arrow-down' : 'arrow-up'}
                  size={18}
                  color={row.type === 'Used' ? colors.danger : colors.greenBright}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.histType}>{row.type}</Text>
                  <Text style={styles.histDate}>{row.date}</Text>
                </View>
                <Text style={styles.histPts}>{row.pts}</Text>
              </View>
              {i < HISTORY.length - 1 && <View style={styles.hair} />}
            </View>
          ))}

          <Text style={[styles.title, { marginTop: 24, marginBottom: 12 }]}>Claim Your Reward!</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {REWARD_ITEMS.map((item) => (
              <View key={item.pts} style={{ width: 146 }}>
                <RewardCard
                  item={item}
                  onPress={() => {
                    setSub('all');
                    setRedeemItem(item);
                  }}
                />
              </View>
            ))}
          </ScrollView>
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
            <Text style={styles.title}>{POINTS} pts</Text>
          </View>
          <Text style={styles.redeemHead}>Redeem with your points</Text>
          <View style={styles.grid}>
            {REWARD_ITEMS.map((item) => (
              <View key={item.pts} style={styles.gridItem}>
                <RewardCard item={item} onPress={() => setRedeemItem(item)} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Active Codes ── */}
      {sub === 'activeCodes' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pad}>
          <View style={styles.titleRowBetween}>
            <View style={styles.titleRow}>
              <Pressable onPress={() => { setSub('all'); setViewCode(false); setCodeConfirmed(false); }} hitSlop={8}>
                <Feather name="chevron-left" size={24} color={colors.heading} />
              </Pressable>
              <Text style={styles.title}>All Rewards</Text>
            </View>
            <Text style={styles.title}>{POINTS} pts</Text>
          </View>
          <Text style={styles.redeemHead}>Redeem with your points</Text>
          <View style={styles.grid}>
            {REWARD_ITEMS.map((item) => (
              <View key={item.pts} style={styles.gridItem}>
                <RewardCard item={item} dim={item.pts === 10} />
              </View>
            ))}
          </View>
          <Text style={[styles.redeemHead, { marginTop: 24 }]}>My Active Codes</Text>
          <View style={{ width: 146 }}>
            <Pressable
              style={[styles.rewardCard, codeConfirmed && { opacity: 0.3 }]}
              onPress={() => !codeConfirmed && setViewCode(true)}
            >
              <Image source={ACTIVE_CODE.img} style={styles.rewardImg} resizeMode="contain" />
              <View style={styles.ptsPill}>
                <Text style={styles.ptsPillText}>{ACTIVE_CODE.pts} pts</Text>
              </View>
              <Text style={[styles.rewardName, { color: colors.grayText }]}>Valid until: {ACTIVE_CODE.validUntil}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Redeem confirm sheet */}
      <Modal visible={!!redeemItem && !successCode} transparent animationType="slide" onRequestClose={() => setRedeemItem(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setRedeemItem(null)} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{redeemItem?.shortName}</Text>
            <Pressable onPress={() => setRedeemItem(null)} hitSlop={8}>
              <Feather name="x" size={18} color={colors.gray} />
            </Pressable>
          </View>
          <View style={[styles.ptsPill, { alignSelf: 'flex-start', marginBottom: 20 }]}>
            <Text style={styles.ptsPillText}>{redeemItem?.pts} pts</Text>
          </View>
          <Pressable style={styles.solidBtn} onPress={() => setSuccessCode('SG-1234')}>
            <Text style={styles.solidBtnText}>REDEEM</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Redeem success */}
      <Modal visible={!!successCode} transparent animationType="fade">
        <View style={styles.centerBackdrop}>
          <View style={styles.successCard}>
            <Pressable
              style={styles.successClose}
              onPress={() => { setRedeemItem(null); setSuccessCode(null); setSub('activeCodes'); }}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={colors.grayText} />
            </Pressable>
            <View style={styles.successCircle}>
              <Feather name="check" size={44} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Reward Redeemed!</Text>
            <Text style={styles.successCode}>{successCode}</Text>
            <Text style={styles.successNote}>
              To claim your reward, please show this code in any Superkalan Gaz Branches near you.
            </Text>
          </View>
        </View>
      </Modal>

      {/* View code sheet */}
      <Modal visible={viewCode} transparent animationType="slide" onRequestClose={() => setViewCode(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setViewCode(false)} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHead}>
            <View>
              <Text style={styles.sheetTitle}>{ACTIVE_CODE.shortName}</Text>
              <Text style={styles.codeBig}>{ACTIVE_CODE.code}</Text>
            </View>
            <Pressable onPress={() => setViewCode(false)} hitSlop={8}>
              <Feather name="x" size={18} color={colors.gray} />
            </Pressable>
          </View>
          <View style={[styles.ptsPill, { alignSelf: 'flex-start', marginBottom: 20 }]}>
            <Text style={styles.ptsPillText}>{ACTIVE_CODE.pts} pts</Text>
          </View>
          <Pressable style={styles.solidBtn} onPress={() => { setViewCode(false); setCodeConfirmed(true); }}>
            <Text style={styles.solidBtnText}>CONFIRM REDEMPTION</Text>
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
