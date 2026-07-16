import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii } from '@/theme/metrics';
import type { InputMode } from '@/navigation/types';

/* ─────────────────────────────────────────────
   Buttons
───────────────────────────────────────────── */

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && { backgroundColor: colors.muted },
        pressed && !disabled && styles.pressedDim,
        style,
      ]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

/** Navy pill button used across the auth flow (Verify / Confirm). */
export function DarkButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.darkBtn,
        disabled && { backgroundColor: colors.muted },
        pressed && !disabled && styles.pressedDim,
      ]}
    >
      <Text style={styles.darkBtnText}>{label}</Text>
    </Pressable>
  );
}

/* ─────────────────────────────────────────────
   Text fields
───────────────────────────────────────────── */

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secure,
  keyboardType,
  autoCapitalize = 'none',
  bare,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  secure?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  /** Auth-flow variant: pale-blue fill, lighter border (forgot / set-password). */
  bare?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secure && !show}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            bare && styles.inputBare,
            secure && { paddingRight: 40 },
            focused && { borderColor: colors.primary },
            !!error && { borderColor: colors.danger },
          ]}
        />
        {secure ? (
          <Pressable onPress={() => setShow((s) => !s)} style={styles.eyeBtn} hitSlop={8}>
            <Feather name={show ? 'eye' : 'eye-off'} size={18} color="#8B979E" />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/**
 * PH mobile field. Renders a FIXED, non-editable `+63` prefix inside the border
 * per AGENTS.md §16 — the user types only the 10-digit subscriber number. Never
 * use placeholder text for the `+63` (that reintroduces the `0917…` bug).
 */
export function PhoneField({
  label,
  value,
  onChangeText,
  error,
  bare,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  bare?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View
        style={[
          styles.phoneRow,
          bare && styles.inputBare,
          focused && { borderColor: colors.primary },
          !!error && { borderColor: colors.danger },
        ]}
      >
        <Text style={styles.phonePrefix}>+63</Text>
        <TextInput
          value={value}
          onChangeText={(t: string) => onChangeText(t.replace(/\D/g, '').slice(0, 10))}
          placeholder="9XX XXX XXXX"
          placeholderTextColor={colors.placeholder}
          keyboardType="phone-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.phoneInput}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/* ─────────────────────────────────────────────
   Segmented controls
───────────────────────────────────────────── */

export function EmailPhoneToggle({
  value,
  onChange,
  height = 54,
}: {
  value: InputMode;
  onChange: (v: InputMode) => void;
  height?: number;
}) {
  return (
    <View style={[styles.segTrack, { height }]}>
      <View style={[styles.segThumb, { left: value === 'email' ? 0 : '50%' }]} />
      {(['email', 'phone'] as const).map((m) => (
        <Pressable key={m} style={styles.segItem} onPress={() => onChange(m)}>
          <Text style={[styles.segText, { color: value === m ? '#fff' : colors.primary }]}>
            {m === 'email' ? 'Email' : 'Phone'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AccountTypeTabs({
  value,
  onChange,
}: {
  value: 'household' | 'commercial';
  onChange: (v: 'household' | 'commercial') => void;
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {(['household', 'commercial'] as const).map((t) => (
          <Pressable key={t} style={styles.tabItem} onPress={() => onChange(t)}>
            <Text
              style={[styles.tabText, { color: value === t ? colors.primary : colors.muted }]}
            >
              {t === 'household' ? 'Household' : 'Commercial'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.tabTrack}>
        <View style={[styles.tabUnderline, { left: value === 'household' ? '0%' : '50%' }]} />
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   OTP 6-box input
───────────────────────────────────────────── */

export function OtpInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  // Minimal focusable shape so imperative focus stays typed regardless of the
  // installed RN type variant.
  const refs = useRef<Array<{ focus: () => void } | null>>([]);

  const handleChange = (idx: number, ch: string) => {
    const digit = ch.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx: number, key: string) => {
    if (key === 'Backspace' && !value[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  return (
    <View style={styles.otpRow}>
      {Array.from({ length: 6 }).map((_, i) => (
        <TextInput
          key={i}
          ref={(el: TextInput | null) => {
            refs.current[i] = el as unknown as { focus: () => void } | null;
          }}
          value={value[i] ?? ''}
          onChangeText={(t: string) => handleChange(i, t)}
          onKeyPress={(e: { nativeEvent: { key: string } }) => handleKey(i, e.nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
          style={styles.otpBox}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pressedDim: { opacity: 0.85 },

  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: radii.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: fonts.semibold, fontSize: 18, color: '#fff' },

  darkBtn: {
    width: '100%',
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.darkNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtnText: { fontFamily: fonts.medium, fontSize: 14, color: '#fff' },

  fieldWrap: { gap: 4 },
  fieldLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.label },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    height: 38,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.label,
  },
  inputBare: { backgroundColor: colors.authBg, borderColor: colors.placeholder },
  eyeBtn: { position: 'absolute', right: 12, height: 38, justifyContent: 'center' },
  fieldError: { fontFamily: fonts.light, fontSize: 11, color: colors.danger },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.input,
    paddingHorizontal: 12,
  },
  phonePrefix: { fontFamily: fonts.regular, fontSize: 14, color: colors.label, marginRight: 6 },
  phoneInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.label, padding: 0 },

  segTrack: {
    position: 'relative',
    backgroundColor: colors.segmentBg,
    borderRadius: radii.card,
    flexDirection: 'row',
    overflow: 'hidden',
    ...cardShadow,
  },
  segThumb: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: '50%',
    backgroundColor: colors.primary,
    borderRadius: radii.card,
  },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.bold, fontSize: 16 },

  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 12 },
  tabText: { fontFamily: fonts.semibold, fontSize: 16 },
  tabTrack: { height: 1, backgroundColor: colors.divider },
  tabUnderline: {
    position: 'absolute',
    top: 0,
    height: 2,
    width: '50%',
    backgroundColor: colors.primary,
  },

  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: '#fcfeff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.placeholder,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 28,
    color: '#000',
  },
});
