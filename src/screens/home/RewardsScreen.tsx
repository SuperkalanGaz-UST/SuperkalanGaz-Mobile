import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import { images } from '@/lib/assets';

/**
 * Rewards surface (Figma "MyRewards / AllRewards / ActiveCodes"). Rendered inside
 * Home when the Rewards tab is active, so it shares Home's header + bottom nav.
 *
 * SCAFFOLD: points, history, and redemption codes are Figma mock data. Wire to
 * the Loyalty (LPM) endpoints — Household points ledger, 12-month expiry, and the
 * BM dual-authorization redemption gate (AGENTS.md §8a) — when they land.
 */
type Sub = 'my' | 'all' | 'activeCodes';
type Reward = { name: string; shortName: string; pts: number; img: number };

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

export function RewardsScreen({ onExit, initialSub = 'my' }: { onExit: () => void; initialSub?: Sub }) {
  const [sub, setSub] = useState<Sub>(initialSub);
  const [redeemItem, setRedeemItem] = useState<Reward | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [viewCode, setViewCode] = useState(false);
  const [codeConfirmed, setCodeConfirmed] = useState(false);

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
