import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { AuthFlow } from '@/navigation/AuthFlow';
import { DeliveryRiderApp, UnsupportedMobileRoleScreen } from '@/navigation/DeliveryRiderApp';
import { MainApp } from '@/navigation/MainApp';
import { DeliveryRiderMobileVerificationScreen } from '@/screens/driver/DeliveryRiderMobileVerificationScreen';
import { colors } from '@/theme/colors';
import { PrimaryButton } from '@/components/ui/controls';
import { mobileLinking } from '@/navigation/linking';
import type { RootStack } from '@/navigation/types';
import type { Session } from '@supabase/supabase-js';

const Stack = createNativeStackNavigator<RootStack>();

function mobileDestination(session: Session | null): Exclude<keyof RootStack, 'NotFound'> {
  if (!session) return 'Auth';
  const metadata = session.user.app_metadata;
  const active = String(metadata.status ?? '').toLowerCase() === 'active';
  if (metadata.role === 'customer' && active) return 'Customer';
  if (metadata.role === 'driver' && active) return 'DeliveryRider';
  if (metadata.role === 'driver' && metadata.status === 'Pending'
    && typeof metadata.delivery_rider_invitation_accepted_at === 'string') return 'VerifyMobile';
  return 'Unavailable';
}

function CustomerApp() {
  return <PricingProvider><MainApp /></PricingProvider>;
}

function NotFoundScreen({ navigation }: NativeStackScreenProps<RootStack, 'NotFound'>) {
  const { session } = useAuth();
  return (
    <View style={styles.center}>
      <Text accessibilityRole="header">Page not found</Text>
      <Text>This link does not match a screen in the mobile app.</Text>
      <PrimaryButton label="Return to app" onPress={() => {
        navigation.reset({ index: 0, routes: [{ name: mobileDestination(session) }] });
      }} />
    </View>
  );
}

function UnavailableScreen() {
  const { sessionRole } = useAuth();
  return <UnsupportedMobileRoleScreen message={sessionRole === 'unsupported'
    ? 'This staff role uses the web dashboard.'
    : 'This account has no active mobile access. Complete your invitation or contact your branch.'} />;
}

/**
 * Top-level session and protected-role gate. Customers and Delivery Riders get
 * separate mobile state machines; staff web roles never fall through into the
 * customer experience.
 */
export function RootNavigator() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const destination = mobileDestination(session);

  return (
    <NavigationContainer linking={mobileLinking} fallback={<View style={styles.center}><ActivityIndicator color={colors.primary} /></View>}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }} UNSTABLE_routeNamesChangeBehavior="lastUnhandled">
        {/* A URL cannot register a role's screens. Only protected session claims
            choose the navigator; the API still enforces record/branch access. */}
        {destination === 'Auth' ? <Stack.Screen name="Auth" component={AuthFlow} />
          : destination === 'Customer' ? <Stack.Screen name="Customer" component={CustomerApp} navigationKey={session?.user.id} />
          : destination === 'DeliveryRider' ? <Stack.Screen name="DeliveryRider" component={DeliveryRiderApp} navigationKey={session?.user.id} />
          : destination === 'VerifyMobile' ? <Stack.Screen name="VerifyMobile" component={DeliveryRiderMobileVerificationScreen} />
          : <Stack.Screen name="Unavailable" component={UnavailableScreen} />}
        <Stack.Screen name="NotFound" component={NotFoundScreen} navigationKey={session?.user.id ?? 'guest'} />
      </Stack.Navigator>
    </NavigationContainer>
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
