import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DeliveryRiderBottomNav,
  type DeliveryRiderTab,
} from '@/components/driver/DeliveryRiderChrome';
import { PrimaryButton } from '@/components/ui/controls';
import { useAuth } from '@/contexts/AuthContext';
import { useDeliveryRiderOperationalLocation } from '@/hooks/useDeliveryRiderOperationalLocation';
import {
  acceptDeliveryOffer,
  declineDeliveryOffer,
  getDeliveryRiderDashboard,
  setDeliveryRiderAvailability,
  startDelivery,
  submitDeliveredWithProof,
  type DeliveryAssignment,
  type DeliveryProofPhoto,
  type DeliveryRiderDashboard,
} from '@/lib/deliveryRiderApi';
import { DeliveryCompletedScreen, DeliveryProofScreen } from '@/screens/driver/DeliveryProofScreen';
import {
  DeliveryRiderDeliveryScreen,
  DeliveryRiderHomeScreen,
  DeliveryRiderProfileScreen,
} from '@/screens/driver/DeliveryRiderScreens';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type DriverRoute = 'tabs' | 'proof' | 'complete';

export function DeliveryRiderApp() {
  const { signOut } = useAuth();
  const [dashboard, setDashboard] = useState<DeliveryRiderDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<DeliveryRiderTab>('home');
  const [route, setRoute] = useState<DriverRoute>('tabs');
  const [completedAssignment, setCompletedAssignment] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locationEnabled = dashboard?.deliveryRider.availability === 'Available'
    || dashboard?.deliveryRider.availability === 'On Delivery';
  const operationalLocation = useDeliveryRiderOperationalLocation(locationEnabled);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setDashboard(await getDeliveryRiderDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Delivery Rider workspace is unavailable.');
    } finally {
      refresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runDashboardAction = async (action: () => Promise<DeliveryRiderDashboard>) => {
    setBusy(true);
    setError('');
    try {
      setDashboard(await action());
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The request could not be completed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading Delivery Rider workspace…</Text>
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.centered}>
        <View style={styles.unavailableIcon}><Feather name="wifi-off" size={34} color={colors.danger} /></View>
        <Text style={styles.title}>Workspace unavailable</Text>
        <Text style={styles.body}>{error || 'The Delivery Rider service could not be reached.'}</Text>
        <PrimaryButton label="Try again" onPress={() => void load()} style={styles.fullButton} />
        <Pressable onPress={() => void signOut()} hitSlop={8}>
          <Text style={styles.textAction}>Sign out</Text>
        </Pressable>
        <Text style={styles.failClosed}>No delivery action is available until the branch-scoped service responds.</Text>
      </View>
    );
  }

  const assignment = dashboard.activeDelivery;

  if (route === 'proof' && assignment) {
    return (
      <DeliveryProofScreen
        assignment={assignment}
        busy={busy}
        submitError={error}
        onBack={() => {
          setError('');
          setRoute('tabs');
          setActiveTab('delivery');
        }}
        onSubmit={(photo: DeliveryProofPhoto) => {
          const completing = assignment;
          setBusy(true);
          setError('');
          void submitDeliveredWithProof(assignment.serviceRequestId, photo)
            .then((next) => {
              setDashboard(next);
              setCompletedAssignment(completing);
              setRoute('complete');
            })
            .catch((submitError: unknown) => {
              setError(submitError instanceof Error ? submitError.message : 'Could not submit the delivery proof.');
            })
            .finally(() => setBusy(false));
        }}
      />
    );
  }

  if (route === 'complete' && completedAssignment) {
    return (
      <DeliveryCompletedScreen
        assignment={completedAssignment}
        onDone={() => {
          setCompletedAssignment(null);
          setRoute('tabs');
          setActiveTab('home');
        }}
      />
    );
  }

  const renderTab = () => {
    if (activeTab === 'delivery') {
      return (
        <DeliveryRiderDeliveryScreen
          assignment={assignment}
          busy={busy}
          error={error}
          locationMessage={operationalLocation.message}
          locationActive={operationalLocation.state === 'tracking'}
          onStart={() => {
            if (!assignment) return;
            void runDashboardAction(() => startDelivery(assignment.serviceRequestId));
          }}
          onProof={() => {
            setError('');
            setRoute('proof');
          }}
        />
      );
    }
    if (activeTab === 'profile') {
      return <DeliveryRiderProfileScreen dashboard={dashboard} onSignOut={() => void signOut()} />;
    }
    return (
      <DeliveryRiderHomeScreen
        dashboard={dashboard}
        busy={busy}
        error={error}
        locationMessage={operationalLocation.message}
        locationActive={operationalLocation.state === 'tracking'}
        refreshing={refreshing}
        onRefresh={() => void load(true)}
        onAvailability={(available) => {
          void (async () => {
            if (available && !(await operationalLocation.ensurePermission())) return;
            await runDashboardAction(() => setDeliveryRiderAvailability(available));
          })();
        }}
        onAcceptOffer={() => {
          if (!dashboard.currentOffer) return;
          void runDashboardAction(() => acceptDeliveryOffer(dashboard.currentOffer!.offerId)).then((accepted) => {
            if (accepted) setActiveTab('delivery');
          });
        }}
        onDeclineOffer={() => {
          if (!dashboard.currentOffer) return;
          void runDashboardAction(() => declineDeliveryOffer(dashboard.currentOffer!.offerId));
        }}
        onOpenDelivery={() => setActiveTab('delivery')}
      />
    );
  };

  return (
    <View style={styles.app}>
      {renderTab()}
      <DeliveryRiderBottomNav
        active={activeTab}
        onChange={(tab) => {
          setError('');
          setActiveTab(tab);
        }}
      />
    </View>
  );
}

export function UnsupportedMobileRoleScreen({
  message,
}: {
  message: string;
}) {
  const { signOut } = useAuth();
  return (
    <View style={styles.centered}>
      <View style={styles.unavailableIcon}><Feather name="lock" size={34} color={colors.warning} /></View>
      <Text style={styles.title}>Mobile access unavailable</Text>
      <Text style={styles.body}>{message}</Text>
      <PrimaryButton label="Sign out" onPress={() => void signOut()} style={styles.fullButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 28, backgroundColor: colors.authBg },
  unavailableIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  loadingText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.darkNavy, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  fullButton: { width: '100%' },
  textAction: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  failClosed: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 15, color: colors.textMuted, textAlign: 'center' },
});
