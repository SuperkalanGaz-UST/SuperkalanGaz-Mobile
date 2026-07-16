import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DarkButton, OtpInput } from '@/components/ui/controls';
import type { OtpVariant, SignupDraft } from '@/navigation/types';

const TITLES: Record<OtpVariant, string> = {
  email: "We've sent a code to your email!",
  phone: "We've sent a code to your phone number!",
  sms: "We've sent a code to your SMS!",
};
const DESCS: Record<OtpVariant, string> = {
  email: 'Enter the six digit code sent to your email.',
  phone: 'Enter the six digit code sent to your phone.',
  sms: 'Enter the six digit code sent to your SMS.',
};

/**
 * OTP verification (Figma "LogInProcess" OTP). On Verify we actually create the
 * account via Supabase using the collected draft. A project requiring email/SMS
 * confirmation returns no session — we bounce back to Login with a notice.
 *
 * SCAFFOLD: the six-digit entry is presentational; real OTP delivery/verification
 * is wired when the API exposes it. Account creation itself is real.
 */
export function OtpScreen({
  variant,
  draft,
  onBack,
  onNeedsConfirmation,
}: {
  variant: OtpVariant;
  draft: SignupDraft | null;
  onBack: () => void;
  onNeedsConfirmation: (message: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const filled = digits.every((d) => d !== '');

  const handleVerify = async () => {
    if (!filled || !draft) return;
    setBusy(true);
    setError('');
    const { error: err, needsConfirmation } = await signUp({
      method: draft.input,
      identifier: draft.contact,
      password: draft.password,
      firstName: draft.firstName,
      lastName: draft.lastName,
      address: draft.address,
      accountType: draft.accountType,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (needsConfirmation) {
      onNeedsConfirmation('Account created. Please verify, then sign in.');
    }
    // Otherwise the session flips and RootNavigator swaps to the app.
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.back} onPress={onBack} hitSlop={8}>
        <Feather name="chevron-left" size={26} color={colors.heading} />
      </Pressable>

      <Text style={styles.title}>{TITLES[variant]}</Text>
      <Text style={styles.desc}>{DESCS[variant]}</Text>

      <View style={{ marginBottom: 24 }}>
        <OtpInput value={digits} onChange={setDigits} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.resend}>
        Didn't get the code?{' '}
        <Text style={styles.resendLink}>Resend code</Text>
      </Text>

      <View style={{ marginTop: 40 }}>
        <DarkButton label={busy ? 'Verifying…' : 'Verify'} onPress={handleVerify} disabled={!filled || busy} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: { alignSelf: 'flex-start', marginBottom: 24 },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.heading, textAlign: 'center', marginBottom: 40 },
  desc: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 32 },
  error: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, textAlign: 'center', marginBottom: 12 },
  resend: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.grayText },
  resendLink: { color: colors.signupLink, textDecorationLine: 'underline' },
});
