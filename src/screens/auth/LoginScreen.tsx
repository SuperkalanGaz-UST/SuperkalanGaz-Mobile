import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const logo = require('../../../assets/images/superkalan-gaz.png');

/** Household = residential customers, Commercial = business accounts. */
type AccountTab = 'household' | 'commercial';
/** Sign-in identifier: email/password (wired) vs phone (not yet supported). */
type SignInMethod = 'email' | 'phone';

/**
 * Customer login (Figma node 175-1759). Email/password is wired to Supabase Auth
 * via AuthContext; the Household/Commercial tabs and the Phone method are UI per
 * the design — phone sign-in has no backend yet, so it's guarded with a notice.
 */
export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [tab, setTab] = useState<AccountTab>('household');
  const [method, setMethod] = useState<SignInMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmail = method === 'email';

  const handleSignIn = async () => {
    if (submitting) return;
    setError(null);

    if (!isEmail) {
      setError('Phone sign-in isn’t available yet — use your email address.');
      return;
    }
    if (!identifier.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    const { error: authError } = await signIn(identifier.trim().toLowerCase(), password);
    setSubmitting(false);
    // On success the auth listener swaps this screen out; only failures land here.
    if (authError) setError(authError);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.pageContent, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        <View style={styles.card}>
          {/* Household / Commercial tabs */}
          <View style={styles.tabRow}>
            {(['household', 'commercial'] as const).map((t) => {
              const active = tab === t;
              return (
                <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
                  <View style={[styles.tabInner, active && styles.tabInnerActive]}>
                    <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
                      {t === 'household' ? 'Household' : 'Commercial'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.heading}>Welcome back!</Text>
          <Text style={styles.subtitle}>Sign in to continue to your account</Text>

          {/* Email / Phone segmented control */}
          <View style={styles.segment}>
            {(['email', 'phone'] as const).map((m) => {
              const active = method === m;
              return (
                <Pressable
                  key={m}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => {
                    setMethod(m);
                    setError(null);
                  }}
                >
                  <Text style={[styles.segmentText, active ? styles.segmentTextActive : styles.segmentTextInactive]}>
                    {m === 'email' ? 'Email' : 'Phone'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Identifier field */}
          <Text style={styles.label}>{isEmail ? 'Email Address' : 'Phone Number'}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={isEmail ? 'Email Address' : 'Phone Number'}
              placeholderTextColor={colors.placeholder}
              keyboardType={isEmail ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isEmail ? 'email' : 'tel'}
            />
          </View>

          {/* Password field */}
          <Text style={[styles.label, styles.labelSpaced]}>Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color={colors.tabInactive} />
            </Pressable>
          </View>

          <Pressable style={styles.forgotWrap} hitSlop={6}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.signInBtn, pressed && styles.signInBtnPressed]}
            onPress={handleSignIn}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signInText}>Sign in</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don’t have an account? </Text>
            <Pressable hitSlop={6}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const cardShadow = {
  shadowColor: '#0A2540',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 24,
  elevation: 6,
};

const softShadow = {
  shadowColor: '#0A2540',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.loginBackground },
  pageContent: { paddingHorizontal: 20, paddingBottom: 40 },

  logo: { width: 200, height: 150, alignSelf: 'center', marginBottom: 24 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    ...cardShadow,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  tab: { flex: 1 },
  tabInner: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabInnerActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontFamily: fonts.semibold },
  tabTextActive: { color: colors.primary },
  tabTextInactive: { color: colors.tabInactive },

  // Headings
  heading: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.heading,
    textAlign: 'center',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.heading,
    textAlign: 'center',
    marginTop: 4,
  },

  // Segmented control
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.segmentTrack,
    borderRadius: 12,
    padding: 5,
    marginTop: 24,
    ...softShadow,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: { backgroundColor: colors.primary, ...softShadow },
  segmentText: { fontSize: 16, fontFamily: fonts.bold },
  segmentTextActive: { color: '#FFFFFF' },
  segmentTextInactive: { color: colors.primary },

  // Fields
  label: { fontSize: 14, fontFamily: fonts.regular, color: colors.label, marginTop: 24, marginBottom: 8 },
  labelSpaced: { marginTop: 16 },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    ...softShadow,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.label,
  },
  inputWithIcon: { paddingRight: 52 },
  eyeButton: { position: 'absolute', right: 14, height: '100%', justifyContent: 'center' },

  forgotWrap: { alignSelf: 'flex-end', marginTop: 12 },
  forgot: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  error: {
    marginTop: 14,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.danger,
    textAlign: 'center',
  },

  // Sign in
  signInBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...softShadow,
  },
  signInBtnPressed: { backgroundColor: colors.primaryDark },
  signInText: { fontSize: 14, fontFamily: fonts.semibold, color: '#FFFFFF' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 11, fontFamily: fonts.regular, color: colors.footerText },
  signupLink: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.signupLink,
    textDecorationLine: 'underline',
  },
});
