import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, type AccountType } from '@/contexts/AuthContext';
import { normalizePhMobile } from '@/lib/phMobile';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/** Register identifier: email/password or phone/password (both via Supabase Auth). */
type SignUpMethod = 'email' | 'phone';

// Cap the sheet at 90% of the screen so tall forms scroll instead of running off
// the bottom. Must be a fixed number — a `%` maxHeight can't resolve against the
// auto-sized sheet container, which would let the sheet overflow (hiding "Next").
const SHEET_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.9);

// Backdrop = a frosted-glass blur under a dark tint (colors.scrim). Blur intensity
// is the one knob here; the tint colour lives in the theme so both stay in one place.
const BACKDROP_BLUR_INTENSITY = 24;
// Sheet slides; backdrop only fades. Kept snappy so the two read as one motion.
const OPEN_MS = 260;
const CLOSE_MS = 220;

interface SignUpSheetProps {
  /** Whether the sheet is open. */
  visible: boolean;
  /** Household or Commercial — carried over from the login tab. */
  accountType: AccountType;
  /** Dismiss the sheet (back arrow, backdrop tap, or Android back). */
  onClose: () => void;
}

/**
 * Customer registration — a bottom sheet that slides up over the login screen
 * (Figma "Create a … Account"). Same form for both account types; only the
 * labels change: Household collects an "Address", Commercial a "Business
 * Address" (and a "Business Phone Number" on the phone method). Submits through
 * AuthContext.signUp; on success the auth listener routes to the rewards home.
 */
export function SignUpSheet({ visible, accountType, onClose }: SignUpSheetProps) {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [method, setMethod] = useState<SignUpMethod>('email');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isEmail = method === 'email';
  const isCommercial = accountType === 'commercial';

  const title = isCommercial ? 'Create a Commercial Account' : 'Create a Household Account';
  const addressLabel = isCommercial ? 'Business Address' : 'Address';
  const contactLabel = isEmail
    ? 'Email Address'
    : isCommercial
      ? 'Business Phone Number'
      : 'Phone Number';

  const handleNext = async () => {
    if (submitting) return;
    setError(null);
    setNotice(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name.');
      return;
    }
    if (!address.trim()) {
      setError(`Enter your ${addressLabel.toLowerCase()}.`);
      return;
    }

    // Resolve the identifier: a plain email, or a normalized PH mobile.
    let identifier: string;
    if (isEmail) {
      const email = contact.trim().toLowerCase();
      if (!email.includes('@') || !email.includes('.')) {
        setError('Enter a valid email address.');
        return;
      }
      identifier = email;
    } else {
      const phone = normalizePhMobile(contact);
      if (!phone) {
        setError('Enter a valid PH mobile number (e.g. 0917 123 4567).');
        return;
      }
      identifier = phone;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const { error: signUpError, needsConfirmation } = await signUp({
      method,
      identifier,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address: address.trim(),
      accountType,
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }
    // On an active session the auth listener swaps the whole auth flow out.
    // Otherwise the account needs verification first.
    if (needsConfirmation) {
      setNotice(
        isEmail
          ? 'Account created. Check your email to verify, then sign in.'
          : 'Account created. Check your SMS to verify, then sign in.',
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {/* Dimmed backdrop over the login screen — tap to dismiss. */}
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close sign up" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          <View style={[styles.sheet, { maxHeight: SHEET_MAX_HEIGHT }]}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Header: back arrow + title */}
              <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={onClose} hitSlop={10} accessibilityLabel="Go back">
                  <Feather name="chevron-left" size={24} color={colors.heading} />
                </Pressable>
                <Text style={styles.title}>{title}</Text>
              </View>

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
                        setNotice(null);
                      }}
                    >
                      <Text
                        style={[styles.segmentText, active ? styles.segmentTextActive : styles.segmentTextInactive]}
                      >
                        {m === 'email' ? 'Email' : 'Phone'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* First / Last name */}
              <View style={styles.nameRow}>
                <View style={styles.nameCol}>
                  <Text style={styles.label}>First Name</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Juan"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <View style={styles.nameCol}>
                  <Text style={styles.label}>Last Name</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Dela Cruz"
                      placeholderTextColor={colors.placeholder}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              {/* Address / Business Address */}
              <Text style={[styles.label, styles.labelSpaced]}>{addressLabel}</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="123 Main St., Metro Manila"
                  placeholderTextColor={colors.placeholder}
                />
              </View>

              {/* Email Address / Phone Number */}
              <Text style={[styles.label, styles.labelSpaced]}>{contactLabel}</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={contact}
                  onChangeText={setContact}
                  placeholder={isEmail ? 'juandelacruz@email.com' : '09123456789'}
                  placeholderTextColor={colors.placeholder}
                  keyboardType={isEmail ? 'email-address' : 'phone-pad'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isEmail ? 'email' : 'tel'}
                />
              </View>

              {/* Password */}
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
                  autoComplete="password-new"
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

              {error && <Text style={styles.error}>{error}</Text>}
              {notice && <Text style={styles.notice}>{notice}</Text>}

              <Pressable
                style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
                onPress={handleNext}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.nextText}>Next</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const softShadow = {
  shadowColor: '#0A2540',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

const styles = StyleSheet.create({
  // Overlay: sheet pinned to the bottom, dim scrim filling the rest.
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2,20,34,0.45)' },
  sheetContainer: { width: '100%' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  backBtn: { position: 'absolute', left: 0, padding: 4 },
  title: { fontSize: 20, fontFamily: fonts.bold, color: colors.heading, textAlign: 'center' },

  // Segmented control
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.segmentTrack,
    borderRadius: 12,
    padding: 5,
    ...softShadow,
  },
  segmentItem: { flex: 1, paddingVertical: 12, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: colors.primary, ...softShadow },
  segmentText: { fontSize: 16, fontFamily: fonts.bold },
  segmentTextActive: { color: '#FFFFFF' },
  segmentTextInactive: { color: colors.primary },

  // Name row
  nameRow: { flexDirection: 'row', gap: 16, marginTop: 20 },
  nameCol: { flex: 1 },

  // Fields
  label: { fontSize: 14, fontFamily: fonts.regular, color: colors.label, marginBottom: 8 },
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
  input: { height: 52, paddingHorizontal: 16, fontSize: 14, fontFamily: fonts.regular, color: colors.label },
  inputWithIcon: { paddingRight: 52 },
  eyeButton: { position: 'absolute', right: 14, height: '100%', justifyContent: 'center' },

  error: { marginTop: 14, fontSize: 12, fontFamily: fonts.regular, color: colors.danger, textAlign: 'center' },
  notice: { marginTop: 14, fontSize: 12, fontFamily: fonts.regular, color: colors.success, textAlign: 'center' },

  // Next
  nextBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    ...softShadow,
  },
  nextBtnPressed: { backgroundColor: colors.primaryDark },
  nextText: { fontSize: 14, fontFamily: fonts.semibold, color: '#FFFFFF' },
});
