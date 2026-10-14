import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DarkButton, OtpInput } from '@/components/ui/controls';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const RESEND_COOLDOWN_SECONDS = 60;

export function SignUpOtpScreen({
  email,
  onBack,
}: {
  email: string;
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
  const filled = digits.every((digit) => digit !== '');

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

  const verify = async () => {
    if (!filled) return;
    setBusy(true);
    setError('');
    setNotice('');
    const result = await verifySignUpOtp(email, digits.join(''));
    setBusy(false);
    if (result.error) setError(result.error);
  };

  const resend = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    setError('');
    setNotice('');
    const result = await resendSignUpOtp(email);
    setResending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDigits(Array(6).fill(''));
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice('A new code has been sent to your email.');
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.back} onPress={onBack} hitSlop={8}>
        <Feather name="chevron-left" size={26} color={colors.heading} />
      </Pressable>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.desc}>Enter the six-digit code we sent to:</Text>
      <Text style={styles.email}>{email}</Text>

      <View style={styles.code}>
        <OtpInput value={digits} onChange={setDigits} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <Text style={styles.resend}>
        Didn’t get the code?{' '}
        <Text
          style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}
          onPress={resendCooldown === 0 && !resending ? () => void resend() : undefined}
          suppressHighlighting
        >
          {resending
            ? 'Sending…'
            : resendCooldown > 0
              ? 'Resend in ' + resendCooldown + 's'
              : 'Resend code'}
        </Text>
      </Text>

      <View style={styles.button}>
        <DarkButton
          label={busy ? 'Verifying…' : 'Verify email'}
          onPress={() => void verify()}
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
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.heading,
    textAlign: 'center',
    marginBottom: 12,
  },
  desc: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  email: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.heading,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  code: { marginBottom: 24 },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 12,
  },
  notice: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.success,
    textAlign: 'center',
    marginBottom: 12,
  },
  resend: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  resendLink: { color: colors.primary, textDecorationLine: 'underline' },
  resendLinkDisabled: { color: colors.textMuted, textDecorationLine: 'none' },
  button: { marginTop: 40 },
});
