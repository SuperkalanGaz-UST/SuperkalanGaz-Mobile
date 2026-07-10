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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

// Mirrors SignUpSheet's slide-up: the sheet translates, the backdrop only fades.
const SHEET_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.9);
const BACKDROP_BLUR_INTENSITY = 24;
const OPEN_MS = 260;
const CLOSE_MS = 220;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PasswordResetSheetProps {
  /** Whether the sheet is open. */
  visible: boolean;
  /** Dismiss the sheet (X, Cancel, backdrop tap, or Android back). */
  onClose: () => void;
}

/**
 * Password reset — a bottom sheet that slides up over the Profile screen (Figma
 * "Password reset"), matching the sign-up sheet's motion. Verifies the current
 * password by re-authenticating the session's identifier, then updates it via
 * Supabase Auth. On success the sheet closes.
 *
 * SCAFFOLD: current-password verification is done client-side here for feedback;
 * enforce it server-side too once the customer profile endpoint lands (AGENTS.md §4).
 */
export function PasswordResetSheet({ visible, onClose }: PasswordResetSheetProps) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  // Drive the open/close animation ourselves (0 = closed, 1 = open); `mounted`
  // keeps the Modal alive through the closing animation.
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

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_MAX_HEIGHT, 0],
  });

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Reset the fields whenever the sheet is opened afresh.
  useEffect(() => {
    if (visible) {
      setCurrent('');
      setNext('');
      setShowCurrent(false);
      setShowNext(false);
      setError(null);
      setNotice(null);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (submitting) return;
    setError(null);
    setNotice(null);

    if (!current) {
      setError('Enter your current password.');
      return;
    }
    if (next.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (next === current) {
      setError('New password must be different from the current one.');
      return;
    }

    // Verify the current password by re-authenticating the session's identifier.
    const identifier = session?.user?.email
      ? { email: session.user.email, password: current }
      : session?.user?.phone
        ? { phone: session.user.phone, password: current }
        : null;
    if (!identifier) {
      setError('No account identifier on file. Please sign in again.');
      return;
    }

    setSubmitting(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword(identifier);
    if (verifyError) {
      setSubmitting(false);
      setError('Current password is incorrect.');
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNotice('Password updated.');
    setTimeout(onClose, 900);
  };

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        {/* Static full-screen backdrop: frosted blur + dark tint. Only its opacity
            animates; a tap anywhere outside the sheet dismisses. */}
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, { opacity: progress }]}
          onPress={onClose}
          accessibilityLabel="Close password reset"
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
              {/* Header: title left, close X right */}
              <View style={styles.header}>
                <Text style={styles.title}>Password reset</Text>
                <Pressable hitSlop={10} onPress={onClose} accessibilityLabel="Close">
                  <Feather name="x" size={24} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Current Password */}
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  value={current}
                  onChangeText={setCurrent}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowCurrent((v) => !v)}
                  hitSlop={8}
                  accessibilityLabel={showCurrent ? 'Hide password' : 'Show password'}
                >
                  <Feather name={showCurrent ? 'eye' : 'eye-off'} size={20} color={colors.tabInactive} />
                </Pressable>
              </View>

              {/* New Password */}
              <Text style={[styles.label, styles.labelSpaced]}>New Password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  value={next}
                  onChangeText={setNext}
                  secureTextEntry={!showNext}
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowNext((v) => !v)}
                  hitSlop={8}
                  accessibilityLabel={showNext ? 'Hide password' : 'Show password'}
                >
                  <Feather name={showNext ? 'eye' : 'eye-off'} size={20} color={colors.tabInactive} />
                </Pressable>
              </View>

              {error && <Text style={styles.error}>{error}</Text>}
              {notice && <Text style={styles.notice}>{notice}</Text>}

              {/* Cancel / Confirm */}
              <View style={styles.btnRow}>
                <Pressable
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressedDim]}
                  onPress={onClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelText}>CANCEL</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
                  onPress={handleConfirm}
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>CONFIRM</Text>}
                </Pressable>
              </View>
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

// Cancel chip fill (Figma) — a flat light gray, matching the disabled Edit chip.
const CANCEL_BG = '#E3E3E3';
const CANCEL_FG = '#8A8A8A';

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
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
  pressedDim: { opacity: 0.85 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 24, fontFamily: fonts.bold, color: colors.heading },

  // Fields
  label: { fontSize: 15, fontFamily: fonts.semibold, color: colors.label, marginBottom: 8 },
  labelSpaced: { marginTop: 20 },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    ...softShadow,
  },
  input: { height: 52, paddingHorizontal: 16, fontSize: 15, fontFamily: fonts.regular, color: colors.label },
  inputWithIcon: { paddingRight: 52 },
  eyeButton: { position: 'absolute', right: 14, height: '100%', justifyContent: 'center' },

  error: { marginTop: 14, fontSize: 12, fontFamily: fonts.regular, color: colors.danger, textAlign: 'center' },
  notice: { marginTop: 14, fontSize: 12, fontFamily: fonts.regular, color: colors.success, textAlign: 'center' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 16, marginTop: 32 },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    backgroundColor: CANCEL_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontFamily: fonts.bold, color: CANCEL_FG, letterSpacing: 0.5 },
  confirmBtn: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow,
  },
  confirmBtnPressed: { backgroundColor: colors.primaryDark },
  confirmText: { fontSize: 14, fontFamily: fonts.bold, color: '#FFFFFF', letterSpacing: 0.5 },
});
