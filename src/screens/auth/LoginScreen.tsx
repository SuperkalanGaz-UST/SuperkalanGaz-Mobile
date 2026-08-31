import { useState } from 'react';
import {
  Image,
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
import { useAuth } from '@/contexts/AuthContext';
import { normalizePhMobile } from '@/lib/phMobile';
import { images } from '@/lib/assets';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow } from '@/theme/metrics';
import {
  AccountTypeTabs,
  EmailPhoneToggle,
  PhoneField,
  PrimaryButton,
  TextField,
} from '@/components/ui/controls';
import type { AccountType, InputMode } from '@/navigation/types';

/**
 * Login (Figma "LogInProcess"). Wired to the real Supabase session: a successful
 * sign-in flips the session and RootNavigator swaps in the signed-in app. The
 * Household/Commercial tab is the account-type source of truth (see AuthContext).
 */
export function LoginScreen({
  account,
  input,
  notice,
  onAccountChange,
  onInputChange,
  onForgot,
  onSignUp,
}: {
  account: AccountType;
  input: InputMode;
  notice?: string;
  onAccountChange: (v: AccountType) => void;
  onInputChange: (v: InputMode) => void;
  onForgot: () => void;
  onSignUp: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithPhone, signInDeliveryRider } = useAuth();
  const [deliveryRiderMode, setDeliveryRiderMode] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; phone?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    const e: typeof errors = {};
    if ((deliveryRiderMode || input === 'email') && !email.trim()) e.email = 'Email is required';
    if (!deliveryRiderMode && input === 'phone' && !phone.trim()) e.phone = 'Phone number is required';
    if (!password.trim()) e.password = 'Password is required';

    let normalizedPhone: string | null = null;
    if (!deliveryRiderMode && input === 'phone' && phone.trim()) {
      normalizedPhone = normalizePhMobile(phone);
      if (!normalizedPhone) e.phone = 'Enter a valid PH mobile number';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setBusy(true);
    const { error } = deliveryRiderMode
      ? await signInDeliveryRider(email.trim(), password)
      : input === 'email'
        ? await signIn(email.trim(), password, account)
        : await signInWithPhone(normalizedPhone as string, password, account);
    setBusy(false);
    if (error) setErrors({ form: error });
    // On success the auth listener flips the session; RootNavigator handles nav.
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.card}>
          <View style={styles.headings}>
            <Text style={styles.title}>
              {deliveryRiderMode ? 'Delivery Rider Login' : 'Welcome back!'}
            </Text>
            <Text style={styles.subtitle}>
              {deliveryRiderMode
                ? 'Sign in with your Delivery Rider account'
                : 'Sign in to continue to your account'}
            </Text>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </View>

          {!deliveryRiderMode ? (
            <AccountTypeTabs value={account} onChange={onAccountChange} />
          ) : null}

          {!deliveryRiderMode ? (
            <EmailPhoneToggle
              value={input}
              onChange={(v) => {
                onInputChange(v);
                setErrors({});
              }}
            />
          ) : null}

          <View style={{ gap: 16 }}>
            {deliveryRiderMode || input === 'email' ? (
              <TextField
                label="Email Address"
                placeholder="Email Address"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
              />
            ) : (
              <PhoneField
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                error={errors.phone}
              />
            )}

            <View style={{ gap: 4 }}>
              <TextField
                label="Password"
                placeholder="Password"
                secure
                value={password}
                onChangeText={setPassword}
                error={errors.password}
              />
              <Pressable onPress={onForgot} style={styles.forgotWrap} hitSlop={6}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
            </View>
          </View>

          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

          <PrimaryButton label={busy ? 'Signing in…' : 'Sign in'} onPress={handleSignIn} disabled={busy} />

          <Pressable
            onPress={() => {
              setDeliveryRiderMode((current) => !current);
              setErrors({});
            }}
            style={({ pressed }) => [styles.driverLogin, pressed && styles.pressed]}
          >
            <View style={styles.driverIcon}>
              <Feather name={deliveryRiderMode ? 'user' : 'truck'} size={19} color={colors.primary} />
            </View>
            <View style={styles.driverCopy}>
              <Text style={styles.driverTitle}>
                {deliveryRiderMode ? 'Back to Customer Login' : 'Login as Delivery Rider'}
              </Text>
              <Text style={styles.driverSubtitle}>
                {deliveryRiderMode
                  ? 'Use your Household or Commercial account'
                  : 'Use the account created from your Branch Owner invitation'}
              </Text>
            </View>
            <Feather name="chevron-right" size={19} color={colors.primary} />
          </Pressable>

          {!deliveryRiderMode ? (
            <Text style={styles.signupRow}>
              Don't have an account?{' '}
              <Text style={styles.signupLink} onPress={onSignUp}>
                Sign Up
              </Text>
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  logoWrap: { alignItems: 'center', paddingVertical: 24 },
  logo: { width: 190, height: 90 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 20,
    ...cardShadow,
  },
  headings: { alignItems: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.heading },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.heading, marginTop: 4 },
  notice: { fontFamily: fonts.medium, fontSize: 12, color: colors.success, marginTop: 8, textAlign: 'center' },
  forgotWrap: { alignSelf: 'flex-end', marginTop: 4 },
  forgot: { fontFamily: fonts.regular, fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },
  formError: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, textAlign: 'center' },
  driverLogin: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#CFE7F6', backgroundColor: colors.primaryTint },
  driverIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  driverCopy: { flex: 1 },
  driverTitle: { fontFamily: fonts.semibold, fontSize: 12, color: colors.darkNavy },
  driverSubtitle: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  pressed: { opacity: 0.85 },
  signupRow: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 11, color: colors.footerText },
  signupLink: { fontFamily: fonts.regular, fontSize: 11, color: colors.signupLink, textDecorationLine: 'underline' },
});
