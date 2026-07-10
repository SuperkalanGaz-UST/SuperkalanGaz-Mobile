import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { HomeScaffold, LoyaltyCard } from '@/screens/home/homeShared';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';

/** Cylinders a commercial customer must buy to earn one free ("30 + 1"). */
const EXCHANGE_GOAL = 30;

/**
 * Commercial customer home — the "30 + 1" exchange landing shown once a business
 * customer signs in. Reuses the shared home scaffold; the only account-specific
 * piece is the exchange-progress loyalty card (vs Household's points card).
 *
 * SCAFFOLD: the purchased count is a placeholder. Wire it to the loyalty endpoint
 * of the shared API (via src/lib/api.ts) once it's available.
 */
export function CommercialHomeScreen() {
  const { session, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const firstName = (session?.user?.user_metadata?.first_name as string | undefined)?.trim() || 'there';

  // TODO: replace with the customer's real purchased-cylinder count from the API.
  const purchased = 0;
  const progress = Math.min(purchased / EXCHANGE_GOAL, 1);
  const remaining = Math.max(EXCHANGE_GOAL - purchased, 0);

  const confirmSignOut = () =>
    Alert.alert('Sign out', 'Sign out of this account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  if (showProfile) {
    return <ProfileScreen onBack={() => setShowProfile(false)} onSignOut={confirmSignOut} />;
  }

  return (
    <HomeScaffold
      firstName={firstName}
      onSignOut={confirmSignOut}
      onProfile={() => setShowProfile(true)}
      loyaltyCard={
        <LoyaltyCard title="Cylinder Exchange (30 + 1)">
          <Text style={styles.countValue}>
            {purchased}
            <Text style={styles.countGoal}> / {EXCHANGE_GOAL}</Text>
          </Text>
          <Text style={styles.countUnit}>
            {remaining > 0 ? `${remaining} more to your next free cylinder` : 'Free cylinder ready to claim!'}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
        </LoyaltyCard>
      }
    />
  );
}

const styles = StyleSheet.create({
  countValue: { fontSize: 40, fontFamily: fonts.semibold, color: '#FFFFFF', marginTop: 6 },
  countGoal: { fontSize: 24, fontFamily: fonts.semibold, color: '#D7EFFF' },
  countUnit: { fontSize: 12, fontFamily: fonts.regular, color: '#FCFEFF', marginTop: 2 },
  track: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999, backgroundColor: '#FFFFFF' },
});
