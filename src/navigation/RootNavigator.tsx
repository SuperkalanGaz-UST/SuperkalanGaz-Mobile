import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { AuthFlow } from '@/navigation/AuthFlow';
import { DeliveryRiderApp, UnsupportedMobileRoleScreen } from '@/navigation/DeliveryRiderApp';
import { MainApp } from '@/navigation/MainApp';
import { DeliveryRiderMobileVerificationScreen } from '@/screens/driver/DeliveryRiderMobileVerificationScreen';
import { colors } from '@/theme/colors';

/**
 * Top-level session and protected-role gate. Customers and Delivery Riders get
 * separate mobile state machines; staff web roles never fall through into the
 * customer experience.
 */
export function RootNavigator() {
  const { session, sessionRole, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) return <AuthFlow />;

  if (sessionRole === 'customer') {
    return (
      <PricingProvider>
        <MainApp />
      </PricingProvider>
    );
  }

  if (sessionRole === 'driver') {
    const metadata = session.user.app_metadata;
    const active = String(metadata.status ?? '').toLowerCase() === 'active';
    const awaitingMobileVerification =
      metadata.status === 'Pending' &&
      typeof metadata.delivery_rider_invitation_accepted_at === 'string';
    if (active) return <DeliveryRiderApp />;
    if (awaitingMobileVerification) return <DeliveryRiderMobileVerificationScreen />;
    return <UnsupportedMobileRoleScreen message="Finish creating and accepting your account from the invitation website first." />;
  }

  return (
    <UnsupportedMobileRoleScreen
      message={sessionRole === 'unsupported'
        ? 'This staff role uses the web dashboard.'
        : 'This account has no authorized mobile role. Sign out and use the correct invitation or customer account.'}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.authBg,
    padding: 24,
  },
});
