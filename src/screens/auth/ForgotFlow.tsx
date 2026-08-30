import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DarkButton, OtpInput, TextField } from '@/components/ui/controls';

/**
 * Forgot-password flow (Figma steps 1–3 + success). Supabase owns recovery-code
 * generation, expiry, verification, and the authenticated password update.
 */

const RESEND_COOLDOWN_SECONDS = 60;

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
        <Feather name="chevron-left" size={26} color={colors.heading} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function ForgotPasswordScreen({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: (email: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address');
      return;
    }

    setBusy(true);
    setError('');
    const submitError = await onNext(normalizedEmail);
    setBusy(false);
    if (submitError) setError(submitError);
  };

  return (
    <Shell>
      <Header title="Forgot Password" onBack={onBack} />
      <Text style={styles.caption}>Please enter your email to reset your password.</Text>
      <View style={{ marginTop: 24 }}>
        <TextField
          label="Email Address"
          placeholder="Email Address"
          keyboardType="email-address"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError('');
          }}
          error={error}
          bare
        />
      </View>
      <View style={{ marginTop: 32 }}>
        <DarkButton
          label={busy ? 'Sending…' : 'Confirm'}
          onPress={() => void confirm()}
          disabled={busy}
        />
      </View>
    </Shell>
  );
}

export function ForgotCheckScreen({
  onBack,
  onNext,
  onResend,
}: {
  onBack: () => void;
  onNext: (token: string) => Promise<string | null>;
  onResend: () => Promise<string | null>;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const filled = digits.every((digit) => digit !== '');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const confirm = async () => {
    if (!filled || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const submitError = await onNext(digits.join(''));
    setBusy(false);
    if (submitError) setError(submitError);
  };

  const resend = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    setError('');
    setNotice('');
    const submitError = await onResend();
    setResending(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setDigits(Array(6).fill(''));
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setNotice('A new reset code has been sent.');
  };

  return (
    <Shell>
      <Header title="Forgot Password" onBack={onBack} />
      <Text style={styles.strong}>Check your email</Text>
      <Text style={styles.caption}>Enter the 6-digit password reset code sent to your email.</Text>
      <Text style={[styles.caption, { marginTop: 24, marginBottom: 16 }]}>
        Enter the six digit code sent to your email.
      </Text>
      <OtpInput value={digits} onChange={setDigits} />
      {error ? <Text style={styles.formError}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={{ marginTop: 32 }}>
        <DarkButton
          label={busy ? 'Verifying…' : 'Confirm'}
          onPress={() => void confirm()}
          disabled={!filled || busy || resending}
        />
      </View>
      <Text style={styles.resend}>
        Haven't got the email yet?{' '}
        <Text
          style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}
          onPress={resendCooldown === 0 && !resending ? () => void resend() : undefined}
          suppressHighlighting
        >
          {resending
            ? 'Sending…'
            : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend code'}
        </Text>
      </Text>
    </Shell>
  );
}

export function SetPasswordScreen({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: (password: string) => Promise<string | null>;
}) {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errors, setErrors] = useState<{ newPass?: string; confirmPass?: string }>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    const e: typeof errors = {};
    if (!newPass.trim()) e.newPass = 'New password is required';
    else if (newPass.length < 6) e.newPass = 'Password must be at least 6 characters';
    if (!confirmPass.trim()) e.confirmPass = 'Please confirm your password';
    else if (confirmPass !== newPass) e.confirmPass = '*Password does not match';
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length > 0) return;

    setBusy(true);
    const submitError = await onNext(newPass);
    setBusy(false);
    if (submitError) setFormError(submitError);
  };

  return (
    <Shell>
      <Header title="Forgot Password" onBack={onBack} />
      <Text style={styles.strong}>Set a new password</Text>
      <Text style={styles.caption}>
        Create a new password. Make sure it is different from the previous ones.
      </Text>
      <View style={{ marginTop: 16, gap: 16 }}>
        <TextField
          label="New Password"
          placeholder="Enter new password"
          secure
          bare
          value={newPass}
          onChangeText={(value) => {
            setNewPass(value);
            setErrors((current) => ({ ...current, newPass: undefined }));
            setFormError('');
          }}
          error={errors.newPass}
        />
        <TextField
          label="Confirm Password"
          placeholder="Confirm new password"
          secure
          bare
          value={confirmPass}
          onChangeText={(value) => {
            setConfirmPass(value);
            setErrors((current) => ({ ...current, confirmPass: undefined }));
            setFormError('');
          }}
          error={errors.confirmPass}
        />
      </View>
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      <View style={{ marginTop: 32 }}>
        <DarkButton
          label={busy ? 'Updating…' : 'Confirm'}
          onPress={() => void confirm()}
          disabled={busy}
        />
      </View>
    </Shell>
  );
}

export function SuccessScreen({ onDone }: { onDone: () => void }) {
  return (
    <Shell>
      <View style={styles.successBody}>
        <View style={styles.thumbCircle}>
          <Feather name="thumbs-up" size={56} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Successful!</Text>
        <Text style={styles.successCaption}>
          Congratulations! Your password has been changed. Click confirm to login.
        </Text>
        <View style={{ width: '100%', marginTop: 8 }}>
          <DarkButton label="Confirm" onPress={onDone} />
        </View>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { marginLeft: -4 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.regular, fontSize: 20, color: colors.heading },
  caption: { fontFamily: fonts.regular, fontSize: 12, color: colors.grayText, textAlign: 'center' },
  strong: { fontFamily: fonts.semibold, fontSize: 16, color: colors.label, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  resend: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.grayText, marginTop: 12 },
  resendLink: { color: colors.signupLink, textDecorationLine: 'underline' },
  resendLinkDisabled: { color: colors.grayText, textDecorationLine: 'none' },
  formError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 12,
  },
  notice: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.success,
    textAlign: 'center',
    marginTop: 12,
  },
  successBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 },
  thumbCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.label },
  successCaption: { fontFamily: fonts.regular, fontSize: 13, color: colors.grayText, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
});
