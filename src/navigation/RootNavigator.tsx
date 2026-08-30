import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { AuthFlow } from '@/navigation/AuthFlow';
import { DeliveryRiderApp, UnsupportedMobileRoleScreen } from '@/navigation/DeliveryRiderApp';
import { MainApp } from '@/navigation/MainApp';
import { DeliveryRiderInvitationFlow } from '@/screens/driver/DeliveryRiderInvitationFlow';
import { deliveryRiderInvitationToken } from '@/lib/deliveryRiderInvitationLink';
import { colors } from '@/theme/colors';

/**
 * Top-level session and protected-role gate. Customers and Delivery Riders get
 * separate mobile state machines; staff web roles never fall through into the
 * customer experience.
 */
export function RootNavigator() {
  const { session, sessionRole, initializing } = useAuth();
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  useEffect(() => {
    const receiveInvitation = (url: string | null) => {
      if (!url) return;
      const token = deliveryRiderInvitationToken(url);
      if (token) setInvitationToken(token);
    };

    void Linking.getInitialURL().then(receiveInvitation);
    const subscription = Linking.addEventListener('url', ({ url }) => receiveInvitation(url));
    return () => subscription.remove();
  }, []);

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Invitation links must work even when Expo restores a different persisted
  // session. The invitation remains server-validated and cannot alter scope.
  if (invitationToken) {
    return (
      <DeliveryRiderInvitationFlow
        token={invitationToken}
        onToken={setInvitationToken}
        onBack={() => setInvitationToken(null)}
        onComplete={() => setInvitationToken(null)}
      />
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
    const active = String(session.user.app_metadata.status ?? '').toLowerCase() === 'active';
    return active
      ? <DeliveryRiderApp />
      : <UnsupportedMobileRoleScreen message="Finish the secure Branch Owner invitation before accessing Delivery Rider operations." />;
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
