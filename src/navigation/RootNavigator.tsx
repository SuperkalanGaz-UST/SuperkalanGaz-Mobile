import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { AuthFlow } from '@/navigation/AuthFlow';
import { MainApp } from '@/navigation/MainApp';
import { colors } from '@/theme/colors';

/**
 * Top-level session gate. The real Supabase session decides which state machine
 * is mounted: the signed-out auth flow (login/signup/OTP/forgot) or the signed-in
 * customer app (Home/Orders/Profile/Order flow/FAQs). A successful sign-in/up or
 * sign-out flips the session and swaps the whole tree.
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

  return session ? (
    <PricingProvider>
      <MainApp />
    </PricingProvider>
  ) : <AuthFlow />;
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
