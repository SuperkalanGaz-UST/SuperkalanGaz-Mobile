import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DarkButton, OtpInput } from '@/components/ui/controls';
import type { OtpVariant, SignupDraft } from '@/navigation/types';

const RESEND_COOLDOWN_SECONDS = 60;

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
 * OTP verification (Figma "LogInProcess" OTP). Supabase owns code generation,
 * expiry, delivery and verification; email delivery uses the custom SMTP
 * provider configured for the Supabase project.
 */
export function OtpScreen({
  variant,
  draft,
  onBack,
}: {
  variant: OtpVariant;
  draft: SignupDraft | null;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { verifySignUpOtp, resendSignUpOtp } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const filled = digits.every((d) => d !== '');

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (!filled || !draft) return;
    setBusy(true);
    setError('');
    setNotice('');
    const { error: err } = await verifySignUpOtp(draft.input, draft.contact, digits.join(''));
    setBusy(false);
    if (err) {
      setError(err);
    }
    // A successful verification creates the session; RootNavigator then swaps
    // this signed-out flow for the customer app.
  };

  const handleResend = async () => {
    if (!draft || resending || resendCooldown > 0) return;
    setResending(true);
    setError('');
    setNotice('');
    const { error: err } = await resendSignUpOtp(draft.input, draft.contact);
    setResending(false);
    if (err) {
      setError(err);
      return;
    }
    setDigits(Array(6).fill(''));
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice('A new code has been sent.');
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
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Text style={styles.resend}>
        Didn't get the code?{' '}
        <Text
          style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}
          onPress={resendCooldown === 0 && !resending ? () => void handleResend() : undefined}
          suppressHighlighting
        >
          {resending
            ? 'Sending…'
            : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : 'Resend code'}
        </Text>
      </Text>

      <View style={{ marginTop: 40 }}>
        <DarkButton
          label={busy ? 'Verifying…' : 'Verify'}
          onPress={() => void handleVerify()}
          disabled={!filled || busy || resending}
        />
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
  notice: { fontFamily: fonts.regular, fontSize: 12, color: colors.success, textAlign: 'center', marginBottom: 12 },
  resend: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.grayText },
  resendLink: { color: colors.signupLink, textDecorationLine: 'underline' },
  resendLinkDisabled: { color: colors.grayText, textDecorationLine: 'none' },
});
