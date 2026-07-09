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

// Backdrop is a full-screen tap target whose opacity we animate.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  // Drive the open/close animation ourselves (0 = closed, 1 = open) instead of
  // Modal's animationType="slide", which would slide the backdrop up with the
  // sheet. `mounted` keeps the Modal alive through the closing animation.
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setMounted(false);
        },
      );
    }
  }, [visible, progress]);

  // Sheet slides up from below; backdrop only fades. Both driven off `progress`.
  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_MAX_HEIGHT, 0],
  });

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
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {/* Static full-screen backdrop over the login screen: frosted blur + dark
            tint. Only its opacity animates (fade) — it never moves with the sheet.
            The whole thing is one Pressable so a tap anywhere outside the sheet
            dismisses; the blur + tint are pointerEvents="none" so they don't
            swallow the touch. The tint sits ON TOP of the blur so it still dims on
            Android, where the BlurView is weak. */}
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, { opacity: progress }]}
          onPress={onClose}
          accessibilityLabel="Close sign up"
        >
          <BlurView
            intensity={BACKDROP_BLUR_INTENSITY}
            tint="dark"
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.backdrop} pointerEvents="none" />
        </AnimatedPressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, { maxHeight: SHEET_MAX_HEIGHT, transform: [{ translateY: sheetTranslateY }] }]}
          >
            <ScrollView
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Header: title only — dismiss by tapping the backdrop outside the sheet. */}
              <View style={styles.header}>
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
          </Animated.View>
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
  // Tap-to-dismiss layer + dark tint, sitting on top of the BlurView.
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
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
