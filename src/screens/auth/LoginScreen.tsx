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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePhMobile } from '@/lib/phMobile';
import { images } from '@/lib/assets';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow } from '@/theme/metrics';
import {
  PrimaryButton,
  TextField,
} from '@/components/ui/controls';

/**
 * Login (Figma "LogInProcess"). Wired to the real Supabase session: a successful
 * sign-in flips the session and RootNavigator swaps in the signed-in app. The
 * protected account claims determine the role and customer track after sign-in.
 */
export function LoginScreen({
  notice,
  onForgot,
}: {
  notice?: string;
  onForgot: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    const e: typeof errors = {};
    if (!identifier.trim()) e.identifier = 'Email is required';
    if (!password.trim()) e.password = 'Password is required';

    if (identifier.trim() && !identifier.includes('@') && !normalizePhMobile(identifier)) {
      e.identifier = 'Enter a valid email address';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setBusy(true);
    const { error } = await signIn(identifier, password);
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
          <Image
            source={images.logo}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Superkalan Gaz"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.headings}>
            <Text style={styles.title}>Welcome back!</Text>
            <Text style={styles.subtitle}>Sign in to continue to your account</Text>
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          </View>

          <View style={{ gap: 16 }}>
            <TextField
              label="Email Address"
              placeholder="Email Address"
              value={identifier}
              keyboardType="email-address"
              onChangeText={(value) => {
                setIdentifier(value);
                setErrors((current) => ({ ...current, identifier: undefined, form: undefined }));
              }}
              error={errors.identifier}
              autoCapitalize="none"
            />

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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  logoWrap: { alignItems: 'center', paddingTop: 20, paddingBottom: 24 },
  logo: { width: 220, height: 158 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 8,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 20,
    ...cardShadow,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  headings: { alignItems: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.heading },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.heading, marginTop: 4 },
  notice: { fontFamily: fonts.medium, fontSize: 12, color: colors.success, marginTop: 8, textAlign: 'center' },
  forgotWrap: { alignSelf: 'flex-end', marginTop: 4 },
  forgot: { fontFamily: fonts.regular, fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },
  formError: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, textAlign: 'center' },
});
