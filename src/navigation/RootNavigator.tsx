import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { AuthFlow } from '@/navigation/AuthFlow';
import { HouseholdHomeScreen } from '@/screens/home/HouseholdHomeScreen';
import { CommercialHomeScreen } from '@/screens/home/CommercialHomeScreen';
import { colors } from '@/theme/colors';

/**
 * Top-level navigation gate. Chooses between the auth flow (signed out) and the
 * customer app (signed in), or a splash while the session restores.
 *
 * Signed in, the app opens the rewards home for the customer's account type:
 * Household (points) vs Commercial (30+1 exchange). The account type comes from
 * the login tab (see AuthContext); an unknown type defaults to Household.
 *
 * SCAFFOLD: each account type currently shows a single home screen. Introduce
 * React Navigation here when the customer tabs land —
 *   <NavigationContainer>
 *     {session ? <AppTabs /> : <AuthStack />}
 *   </NavigationContainer>
 * with these customer-only surfaces (no staff/admin):
 *   - AuthStack   → screens/auth      (LoginScreen · register)
 *   - AppTabs
 *       · Home    → screens/home      (dashboard / reorder)
 *       · Orders  → screens/orders    (place order · track delivery MILESTONES only)
 *       · Loyalty → screens/loyalty   (points / rewards)
 *       · Profile → screens/profile   (CIM: profile, addresses, purchase history)
 *   - Feedback    → screens/feedback  (CSAT rating · complaint) — reached post-delivery
 */
export function RootNavigator() {
  const { session, accountType, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <AuthFlow />;
  }

  // Signed in — route to the rewards home for this account type.
  return accountType === 'commercial' ? <CommercialHomeScreen /> : <HouseholdHomeScreen />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.loginBackground,
    padding: 24,
  },
});
