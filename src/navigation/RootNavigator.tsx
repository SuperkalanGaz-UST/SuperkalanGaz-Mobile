import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Top-level navigation gate. Chooses between the auth flow (signed out) and the
 * customer app (signed in), or a splash while the session restores.
 *
 * SCAFFOLD: the signed-in branch is still a placeholder. Introduce React
 * Navigation here when the customer tabs land —
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
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  // Signed in — placeholder until the customer tabs are wired up.
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Superkalan Gaz</Text>
      <Text style={styles.subtitle}>Signed in — wire up the customer tabs.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.loginBackground,
    padding: 24,
  },
  title: { fontSize: 22, fontFamily: fonts.bold, color: colors.heading },
  subtitle: { marginTop: 8, fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
