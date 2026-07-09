import { Alert, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { HomeScaffold, LoyaltyCard } from '@/screens/home/homeShared';

/**
 * Household customer home — the points rewards landing shown once a residential
 * customer signs in (Figma "Hello, Juan!"). Reuses the shared home scaffold; the
 * only account-specific piece is the points loyalty card.
 *
 * SCAFFOLD: the points balance is a placeholder. Wire it to the loyalty endpoint
 * of the shared API (via src/lib/api.ts) once it's available.
 */
export function HouseholdHomeScreen() {
  const { session, signOut } = useAuth();

  const firstName = (session?.user?.user_metadata?.first_name as string | undefined)?.trim() || 'there';

  // TODO: replace with the customer's real points balance from the API.
  const points = 163;

  const confirmSignOut = () =>
    Alert.alert('Sign out', 'Sign out of this account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <HomeScaffold
      firstName={firstName}
      onSignOut={confirmSignOut}
      loyaltyCard={
        <LoyaltyCard title="Superkalan Gaz Points">
          <Text style={styles.pointsValue}>{points.toLocaleString()}</Text>
        </LoyaltyCard>
      }
    />
  );
}

const styles = StyleSheet.create({
  pointsValue: { fontSize: 40, fontFamily: fonts.semibold, color: '#FFFFFF', marginTop: 6 },
});
