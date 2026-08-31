import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/ui/controls';
import { DeliveryRiderHeader } from '@/components/driver/DeliveryRiderChrome';
import type {
  DeliveryAssignment,
  DeliveryOffer,
  DeliveryRiderDashboard,
} from '@/lib/deliveryRiderApi';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow } from '@/theme/metrics';

function dateTime(value: string | null): string {
  if (!value) return 'Pending';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Feather name="alert-circle" size={17} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function AssignmentDetails({ assignment }: { assignment: DeliveryAssignment | DeliveryOffer['assignment'] }) {
  return (
    <View style={styles.detailsCard}>
      <DetailRow icon="hash" label="Service Request" value={assignment.srCode} />
      <DetailRow icon="user" label="Customer" value={assignment.customerName} />
      <DetailRow icon="map-pin" label="Delivery address" value={assignment.deliveryAddress} />
      <DetailRow icon="box" label="Order" value={`${assignment.quantity} × ${assignment.cylinderSize}`} />
      <DetailRow icon="truck" label="Assigned vehicle" value={assignment.vehicleLabel} />
    </View>
  );
}

function OfferSheet({
  offer,
  busy,
  error,
  onAccept,
  onDecline,
}: {
  offer: DeliveryOffer | null;
  busy: boolean;
  error: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(offer)} transparent animationType="slide" onRequestClose={() => undefined}>
      <View style={styles.modalRoot}>
        <View style={[styles.offerSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.offerHeadingRow}>
            <View style={styles.offerIcon}>
              <Feather name="bell" size={22} color={colors.primary} />
            </View>
            <View style={styles.offerHeadingCopy}>
              <Text style={styles.offerEyebrow}>Assigned by Branch Manager</Text>
              <Text style={styles.offerTitle}>New delivery offer</Text>
            </View>
          </View>
          {offer ? (
            <>
              <AssignmentDetails assignment={offer.assignment} />
              <View style={styles.expiryRow}>
                <Feather name="clock" size={15} color={colors.warning} />
                <Text style={styles.expiryText}>Respond before {dateTime(offer.expiresAt)}</Text>
              </View>
            </>
          ) : null}
          {error ? <InlineError message={error} /> : null}
          <View style={styles.offerActions}>
            <Pressable disabled={busy} onPress={onDecline} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, busy && styles.disabled]}>
              <Text style={styles.secondaryButtonText}>Decline</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={onAccept} style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed, busy && styles.disabled]}>
              <Text style={styles.acceptButtonText}>{busy ? 'Responding…' : 'Accept delivery'}</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetFinePrint}>Acceptance is confirmed by the server before the Service Request is dispatched.</Text>
        </View>
      </View>
    </Modal>
  );
}

export function DeliveryRiderHomeScreen({
  dashboard,
  busy,
  error,
  locationMessage,
  locationActive,
  refreshing,
  onRefresh,
  onAvailability,
  onAcceptOffer,
  onDeclineOffer,
  onOpenDelivery,
}: {
  dashboard: DeliveryRiderDashboard;
  busy: boolean;
  error: string;
  locationMessage: string;
  locationActive: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAvailability: (available: boolean) => void;
  onAcceptOffer: () => void;
  onDeclineOffer: () => void;
  onOpenDelivery: () => void;
}) {
  const profile = dashboard.deliveryRider;
  const vehicleReady = Boolean(profile.vehicle?.healthy);
  const canGoAvailable = profile.availability === 'Offline' && vehicleReady;
  const canGoOffline = profile.availability === 'Available' && !dashboard.currentOffer;
  const statusColor = profile.availability === 'Available'
    ? colors.success
    : profile.availability === 'On Delivery'
      ? colors.primary
      : profile.availability === 'Maintenance Due'
        ? colors.warning
        : colors.textMuted;

  return (
    <View style={styles.screen}>
      <DeliveryRiderHeader title={`Hello, ${profile.displayName}`} subtitle={profile.branchName} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.screenScroll}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusTop}>
            <View>
              <Text style={styles.cardEyebrow}>Availability</Text>
              <View style={styles.statusNameRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.statusName}>{profile.availability}</Text>
              </View>
            </View>
            <View style={[styles.statusIcon, { backgroundColor: `${statusColor}18` }]}>
              <Feather name={profile.availability === 'On Delivery' ? 'navigation' : 'power'} size={23} color={statusColor} />
            </View>
          </View>
          <Text style={styles.statusBody}>
            {profile.availability === 'Offline'
              ? vehicleReady
                ? 'Go available when you are ready to receive an assigned delivery offer.'
                : 'A healthy branch vehicle must be assigned before you can go available.'
              : profile.availability === 'Available'
                ? 'You are ready to receive offers assigned by your Branch Manager.'
                : profile.availability === 'On Delivery'
                  ? 'You have one active assigned delivery.'
                  : 'Vehicle readiness must be resolved before accepting deliveries.'}
          </Text>
          {profile.availability === 'On Delivery' ? (
            <PrimaryButton label="View active delivery" onPress={onOpenDelivery} />
          ) : (
            <PrimaryButton
              label={profile.availability === 'Available' ? (busy ? 'Updating…' : 'Go Offline') : (busy ? 'Updating…' : 'Go Available')}
              disabled={busy || (!canGoAvailable && !canGoOffline)}
              onPress={() => onAvailability(profile.availability !== 'Available')}
            />
          )}
        </View>

        {error ? <InlineError message={error} /> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicle readiness</Text>
          <Text style={[styles.readinessLabel, { color: vehicleReady ? colors.success : colors.warning }]}>{vehicleReady ? 'Ready' : 'Action needed'}</Text>
        </View>
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIcon}>
            <Feather name="truck" size={24} color={vehicleReady ? colors.primary : colors.textMuted} />
          </View>
          <View style={styles.vehicleCopy}>
            <Text style={styles.vehicleTitle}>{profile.vehicle?.label ?? 'No vehicle assigned'}</Text>
            <Text style={styles.vehicleBody}>
              {profile.vehicle
                ? `${profile.vehicle.model ?? 'Branch vehicle'} · ${profile.vehicle.healthy ? 'Healthy' : 'Not ready'}`
                : 'Your Branch Manager assigns a same-branch vehicle. Registration is not done in mobile.'}
            </Text>
          </View>
          <Feather name={vehicleReady ? 'check-circle' : 'alert-circle'} size={20} color={vehicleReady ? colors.success : colors.warning} />
        </View>

        <View style={styles.infoNote}>
          <Feather name="navigation" size={18} color={locationActive ? colors.success : colors.primary} />
          <Text style={styles.infoNoteText}>{locationMessage}</Text>
        </View>

        <View style={styles.infoNote}>
          <Feather name="shield" size={18} color={colors.primary} />
          <Text style={styles.infoNoteText}>Only assigned offers appear here. You cannot browse or claim unoffered Service Requests.</Text>
        </View>
      </ScrollView>
      <OfferSheet offer={dashboard.currentOffer} busy={busy} error={error} onAccept={onAcceptOffer} onDecline={onDeclineOffer} />
    </View>
  );
}

function TimelineRow({
  label,
  value,
  complete,
  last,
}: {
  label: string;
  value: string | null;
  complete: boolean;
  last?: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineTrack}>
        <View style={[styles.timelineDot, complete && styles.timelineDotComplete]}>
          {complete ? <Feather name="check" size={12} color={colors.surface} /> : null}
        </View>
        {!last ? <View style={[styles.timelineLine, complete && styles.timelineLineComplete]} /> : null}
      </View>
      <View style={styles.timelineCopy}>
        <Text style={styles.timelineLabel}>{label}</Text>
        <Text style={styles.timelineValue}>{dateTime(value)}</Text>
      </View>
    </View>
  );
}

export function DeliveryRiderDeliveryScreen({
  assignment,
  busy,
  error,
  locationMessage,
  locationActive,
  onStart,
  onProof,
}: {
  assignment: DeliveryAssignment | null;
  busy: boolean;
  error: string;
  locationMessage: string;
  locationActive: boolean;
  onStart: () => void;
  onProof: () => void;
}) {
  return (
    <View style={styles.screen}>
      <DeliveryRiderHeader title="Assigned delivery" subtitle="Service Request milestones" />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        {!assignment ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Feather name="package" size={32} color={colors.primary} /></View>
            <Text style={styles.emptyTitle}>No active delivery</Text>
            <Text style={styles.emptyBody}>A delivery appears here only after you accept an offer assigned by your Branch Manager.</Text>
          </View>
        ) : (
          <>
            <View style={styles.referenceHeading}>
              <View>
                <Text style={styles.cardEyebrow}>Service Request</Text>
                <Text style={styles.referenceNumber}>{assignment.srCode}</Text>
              </View>
              <View style={styles.activePill}><Text style={styles.activePillText}>{assignment.inTransitAt ? 'In Transit' : 'Dispatched'}</Text></View>
            </View>
            <AssignmentDetails assignment={assignment} />
            <View style={styles.timelineCard}>
              <Text style={styles.sectionTitle}>Delivery timeline</Text>
              <TimelineRow label="Requested" value={assignment.requestedAt} complete />
              <TimelineRow label="Dispatched" value={assignment.dispatchedAt} complete />
              <TimelineRow label="In Transit" value={assignment.inTransitAt} complete={Boolean(assignment.inTransitAt)} />
              <TimelineRow label="Delivered" value={null} complete={false} last />
            </View>
            {error ? <InlineError message={error} /> : null}
            {assignment.inTransitAt ? (
              <PrimaryButton label="Add delivery proof" onPress={onProof} />
            ) : (
              <PrimaryButton label={busy ? 'Starting delivery…' : 'Start delivery'} onPress={onStart} disabled={busy} />
            )}
            <View style={styles.infoNote}>
              <Feather name="navigation" size={18} color={locationActive ? colors.success : colors.primary} />
              <Text style={styles.infoNoteText}>{locationMessage} SinoTrack ST-901 remains authoritative for vehicle geofencing and PMS.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function DeliveryRiderProfileScreen({
  dashboard,
  onSignOut,
}: {
  dashboard: DeliveryRiderDashboard;
  onSignOut: () => void;
}) {
  const profile = dashboard.deliveryRider;
  return (
    <View style={styles.screen}>
      <DeliveryRiderHeader title="Profile" subtitle="Invitation-authorized membership" />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <View style={styles.profileHero}>
          <View style={styles.profileAvatar}><Feather name="user" size={33} color={colors.surface} /></View>
          <Text style={styles.profileName}>{profile.displayName}</Text>
          <View style={styles.activePill}><Text style={styles.activePillText}>Delivery Rider</Text></View>
        </View>
        <View style={styles.detailsCard}>
          <DetailRow icon="mail" label="Email address" value={profile.email} />
          <DetailRow icon="phone" label="PH mobile number" value={profile.mobile} />
          <DetailRow icon="map-pin" label="Authorized branch" value={profile.branchName} />
          <DetailRow icon="activity" label="Availability" value={profile.availability} />
        </View>
        <View style={styles.infoNote}>
          <Feather name="lock" size={18} color={colors.primary} />
          <Text style={styles.infoNoteText}>Role and branch membership are protected. Contact the Branch Owner if account access must change.</Text>
        </View>
        <Pressable onPress={onSignOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Feather name="log-out" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenScroll: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 106, gap: 16 },
  cardEyebrow: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textMuted },
  statusCard: { borderRadius: 20, padding: 19, gap: 16, backgroundColor: colors.surface, ...cardShadow },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  statusName: { fontFamily: fonts.bold, fontSize: 22, color: colors.darkNavy },
  statusIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statusBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.textMuted },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.darkNavy },
  readinessLabel: { fontFamily: fonts.semibold, fontSize: 11 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.inputBorder },
  vehicleIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  vehicleCopy: { flex: 1 },
  vehicleTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  vehicleBody: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, color: colors.textMuted, marginTop: 3 },
  infoNote: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14, backgroundColor: colors.primaryTint },
  infoNoteText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.darkNavy },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 12, padding: 12, backgroundColor: '#FDECEA' },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.danger },
  detailsCard: { gap: 1, borderRadius: 18, paddingHorizontal: 15, backgroundColor: colors.surface, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 62, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  detailIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  detailCopy: { flex: 1 },
  detailLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted },
  detailValue: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, color: colors.text, marginTop: 2 },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.promoScrim },
  offerSheet: { paddingHorizontal: 20, paddingTop: 11, gap: 15, backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92%' },
  sheetHandle: { width: 45, height: 5, alignSelf: 'center', borderRadius: 3, backgroundColor: colors.border },
  offerHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  offerHeadingCopy: { flex: 1 },
  offerEyebrow: { fontFamily: fonts.medium, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, color: colors.primary },
  offerTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.darkNavy, marginTop: 2 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  expiryText: { fontFamily: fonts.medium, fontSize: 10, color: colors.warning },
  offerActions: { flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
  secondaryButtonText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  acceptButton: { flex: 1.5, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primary },
  acceptButtonText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.surface },
  sheetFinePrint: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, color: colors.textMuted, textAlign: 'center' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
  emptyState: { alignItems: 'center', gap: 11, marginTop: 65, borderRadius: 20, padding: 28, backgroundColor: colors.surface },
  emptyIcon: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.darkNavy },
  emptyBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  referenceHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  referenceNumber: { fontFamily: fonts.bold, fontSize: 20, color: colors.darkNavy, marginTop: 3 },
  activePill: { alignSelf: 'center', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E9F8F2' },
  activePillText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.success },
  timelineCard: { gap: 4, borderRadius: 18, padding: 17, backgroundColor: colors.surface },
  timelineRow: { minHeight: 63, flexDirection: 'row', gap: 12 },
  timelineTrack: { width: 24, alignItems: 'center' },
  timelineDot: { width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: colors.stepIdle, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  timelineDotComplete: { borderColor: colors.success, backgroundColor: colors.success },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.stepIdle },
  timelineLineComplete: { backgroundColor: colors.success },
  timelineCopy: { flex: 1, paddingTop: 1 },
  timelineLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  timelineValue: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, marginTop: 3 },
  profileHero: { alignItems: 'center', gap: 8, borderRadius: 20, padding: 22, backgroundColor: colors.surface },
  profileAvatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  profileName: { fontFamily: fonts.bold, fontSize: 19, color: colors.darkNavy },
  signOutButton: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 13, borderWidth: 1, borderColor: '#F2C4BE', backgroundColor: '#FFF8F7' },
  signOutText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.danger },
});
