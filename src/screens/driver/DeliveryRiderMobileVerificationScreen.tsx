import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OtpInput, PrimaryButton } from '@/components/ui/controls';
import { useAuth } from '@/contexts/AuthContext';
import {
  completeDeliveryRiderPlaceholderVerification,
  getDeliveryRiderMobileVerification,
  sendDeliveryRiderMobileVerificationCode,
  verifyDeliveryRiderMobileForSession,
  type DeliveryRiderMobileVerification,
} from '@/lib/deliveryRiderApi';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow } from '@/theme/metrics';

function displayMobile(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^63/, '');
  return digits.length === 10
    ? `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : value;
}

function maskMobile(value: string): string {
  const shown = displayMobile(value);
  return shown.length > 4 ? `${shown.slice(0, -4)}••••` : shown;
}

export function DeliveryRiderMobileVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { refreshSession, signOut } = useAuth();
  const [account, setAccount] = useState<DeliveryRiderMobileVerification | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    setBusy(true);
    setError('');
    try {
      await sendDeliveryRiderMobileVerificationCode();
      setOtp(['', '', '', '', '', '']);
      setCodeSent(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send the verification code.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let current = true;
    void getDeliveryRiderMobileVerification()
      .then(async (loaded) => {
        if (!current) return;
        setAccount(loaded);
        if (loaded.verificationMode === 'sms') await sendCode();
      })
      .catch((loadError: unknown) => {
        if (current) {
          setError(loadError instanceof Error ? loadError.message : 'Mobile verification is unavailable.');
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  const verify = async () => {
    const code = otp.join('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the complete 6-digit verification code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyDeliveryRiderMobileForSession(code);
      const refreshed = await refreshSession();
      if (refreshed.error) throw new Error(refreshed.error);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify the PH mobile number.');
    } finally {
      setBusy(false);
    }
  };

  const continueWithPlaceholder = async () => {
    setBusy(true);
    setError('');
    try {
      await completeDeliveryRiderPlaceholderVerification();
      const refreshed = await refreshSession();
      if (refreshed.error) throw new Error(refreshed.error);
    } catch (placeholderError) {
      setError(
        placeholderError instanceof Error
          ? placeholderError.message
          : 'Could not complete the temporary verification step.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Preparing mobile verification…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="smartphone" size={31} color={colors.primary} />
          </View>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>One last step</Text>
            <Text style={styles.title}>Verify your PH mobile number</Text>
            <Text style={styles.body}>
              {account?.verificationMode === 'placeholder'
                ? 'SMS verification is temporarily in demo mode while the sender ID is awaiting approval.'
                : account && codeSent
                ? `Enter the 6-digit code sent to ${maskMobile(account.mobile)}.`
                : 'Send a verification code to the number registered with your account.'}
            </Text>
          </View>

          {account ? (
            <View style={styles.accountCard}>
              <View>
                <Text style={styles.accountLabel}>Delivery Rider</Text>
                <Text style={styles.accountValue}>{account.recipientName}</Text>
              </View>
              <View style={styles.divider} />
              <View>
                <Text style={styles.accountLabel}>PH mobile number</Text>
                <Text style={styles.accountValue}>{displayMobile(account.mobile)}</Text>
              </View>
            </View>
          ) : null}

          {account?.verificationMode === 'placeholder' ? (
            <View style={styles.placeholderBanner}>
              <Feather name="info" size={18} color={colors.primary} />
              <Text style={styles.placeholderText}>
                No SMS will be sent. Continue below to activate this test account. Real PH mobile verification must be enabled before production use.
              </Text>
            </View>
          ) : codeSent ? <OtpInput value={otp} onChange={setOtp} /> : null}
          {error ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={17} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {account?.verificationMode === 'placeholder' ? (
            <PrimaryButton
              label={busy ? 'Continuing…' : 'Continue in demo mode'}
              onPress={() => void continueWithPlaceholder()}
              disabled={busy}
            />
          ) : codeSent ? (
            <>
              <PrimaryButton label={busy ? 'Verifying…' : 'Verify and continue'} onPress={() => void verify()} disabled={busy} />
              <Pressable disabled={busy} onPress={() => void sendCode()} hitSlop={8}>
                <Text style={styles.textAction}>Resend code</Text>
              </Pressable>
            </>
          ) : (
            <PrimaryButton label={busy ? 'Sending code…' : 'Send verification code'} onPress={() => void sendCode()} disabled={busy || !account} />
          )}

          <Pressable disabled={busy} onPress={() => void signOut()} hitSlop={8}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.authBg },
  loadingText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  card: { gap: 20, padding: 24, borderRadius: 22, backgroundColor: colors.surface, ...cardShadow },
  iconWrap: { width: 66, height: 66, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 33, backgroundColor: colors.primaryTint },
  header: { alignItems: 'center', gap: 7 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.9 },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.darkNavy, textAlign: 'center' },
  body: { maxWidth: 320, fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },
  accountCard: { gap: 12, padding: 15, borderRadius: 14, backgroundColor: colors.authBg },
  accountLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  accountValue: { marginTop: 3, fontFamily: fonts.semibold, fontSize: 13, color: colors.darkNavy },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 12, backgroundColor: '#FDECEA' },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.danger },
  placeholderBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 12, backgroundColor: colors.primaryTint },
  placeholderText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.darkNavy },
  textAction: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary, textAlign: 'center' },
  signOut: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
