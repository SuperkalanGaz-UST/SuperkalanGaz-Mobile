import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { DarkButton, OtpInput, TextField } from '@/components/ui/controls';

/**
 * Forgot-password flow (Figma steps 1–3 + success). Presentational for now — the
 * Supabase password-reset email/verify is wired when in scope. Screens keep the
 * shared navy header + "Confirm" pattern from the auth surface.
 */

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

export function ForgotPasswordScreen({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  return (
    <Shell>
      <Header title="Forgot Password" onBack={onBack} />
      <Text style={styles.caption}>Please enter your email to reset your password.</Text>
      <View style={{ marginTop: 24 }}>
        <TextField
          label="Email Address or Phone Number"
          placeholder="Email Address or Phone Number"
          value={contact}
          onChangeText={(v) => {
            setContact(v);
            setError('');
          }}
          error={error}
          bare
        />
      </View>
      <View style={{ marginTop: 32 }}>
        <DarkButton
          label="Confirm"
          onPress={() => (contact.trim() ? onNext() : setError('Email or phone is required'))}
        />
      </View>
    </Shell>
  );
}

export function ForgotCheckScreen({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  return (
    <Shell>
      <Header title="Forgot Password" onBack={onBack} />
      <Text style={styles.strong}>Check your email</Text>
      <Text style={styles.caption}>We sent a reset link to your registered contact.</Text>
      <Text style={[styles.caption, { marginTop: 24, marginBottom: 16 }]}>
        Enter the six digit code sent to your email.
      </Text>
      <OtpInput value={digits} onChange={setDigits} />
      <View style={{ marginTop: 32 }}>
        <DarkButton label="Confirm" onPress={onNext} />
      </View>
      <Text style={styles.resend}>
        Haven't got the email yet? <Text style={styles.resendLink}>Resend email</Text>
      </Text>
    </Shell>
  );
}

export function SetPasswordScreen({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errors, setErrors] = useState<{ newPass?: string; confirmPass?: string }>({});

  const confirm = () => {
    const e: typeof errors = {};
    if (!newPass.trim()) e.newPass = 'New password is required';
    if (!confirmPass.trim()) e.confirmPass = 'Please confirm your password';
    else if (confirmPass !== newPass) e.confirmPass = '*Password does not match';
    setErrors(e);
    if (Object.keys(e).length === 0) onNext();
  };

  return (
    <Shell>
      <Header title="Forgot Password" onBack={onBack} />
      <Text style={styles.strong}>Set a new password</Text>
      <Text style={styles.caption}>
        Create a new password. Make sure it is different from the previous ones.
      </Text>
      <View style={{ marginTop: 16, gap: 16 }}>
        <TextField label="New Password" placeholder="Enter new password" secure bare value={newPass} onChangeText={setNewPass} error={errors.newPass} />
        <TextField label="Confirm Password" placeholder="Confirm new password" secure bare value={confirmPass} onChangeText={setConfirmPass} error={errors.confirmPass} />
      </View>
      <View style={{ marginTop: 32 }}>
        <DarkButton label="Confirm" onPress={confirm} />
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
