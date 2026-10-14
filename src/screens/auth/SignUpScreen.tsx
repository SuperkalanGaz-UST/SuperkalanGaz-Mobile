import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneField, PrimaryButton, TextField } from '@/components/ui/controls';
import { normalizePhMobile } from '@/lib/phMobile';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import type { AccountType, SignupDraft } from '@/navigation/types';

export function SignUpScreen({
  account,
  initialDraft,
  onAccountChange,
  onBack,
  onNext,
}: {
  account: AccountType;
  initialDraft: SignupDraft | null;
  onAccountChange: (value: AccountType) => void;
  onBack: () => void;
  onNext: (draft: SignupDraft) => Promise<string | null>;
}) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState(initialDraft?.firstName ?? '');
  const [lastName, setLastName] = useState(initialDraft?.lastName ?? '');
  const [email, setEmail] = useState(initialDraft?.email ?? '');
  const [mobileNumber, setMobileNumber] = useState(initialDraft?.mobileNumber ?? '');
  const [address, setAddress] = useState(initialDraft?.address ?? '');
  const [password, setPassword] = useState(initialDraft?.password ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const nextErrors: Record<string, string> = {};
    if (!firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!address.trim()) {
      nextErrors.address = account === 'commercial'
        ? 'Business address is required'
        : 'Address is required';
    }
    if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters';
    if (password.length > 72) nextErrors.password = 'Password must be 72 characters or fewer';

    let normalizedMobile = '';
    if (mobileNumber.trim()) {
      const normalized = normalizePhMobile(mobileNumber);
      if (!normalized) nextErrors.mobileNumber = 'Enter a valid PH mobile number';
      else normalizedMobile = normalized;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    const error = await onNext({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      mobileNumber: normalizedMobile,
      address: address.trim(),
      password,
      accountType: account,
    });
    setBusy(false);
    if (error) setErrors({ form: error });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button">
          <Text style={styles.back}>‹  Back to sign in</Text>
        </Pressable>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Choose the customer account that fits you.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Account type</Text>
          <View style={styles.segment}>
            {(['household', 'commercial'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: account === value }}
                onPress={() => onAccountChange(value)}
                style={[styles.segmentItem, account === value && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, account === value && styles.segmentTextActive]}>
                  {value === 'household' ? 'Household' : 'Commercial'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextField
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              error={errors.firstName}
              autoCapitalize="words"
            />
            <TextField
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              error={errors.lastName}
              autoCapitalize="words"
            />
          </View>

          <TextField
            label="Email address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <PhoneField
            label="Mobile number (optional)"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            error={errors.mobileNumber}
          />

          <TextField
            label={account === 'commercial' ? 'Business address' : 'Address'}
            placeholder="Street, barangay, city"
            value={address}
            onChangeText={setAddress}
            error={errors.address}
            autoCapitalize="sentences"
          />

          <TextField
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secure
          />

          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
          <PrimaryButton
            label={busy ? 'Creating account…' : 'Create account'}
            onPress={() => void submit()}
            disabled={busy}
          />
          <Text style={styles.footnote}>
            Sign in with your email and password. Your mobile number is for contact only.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, gap: 12 },
  back: { color: colors.primary, fontFamily: fonts.medium, fontSize: 14 },
  title: { color: colors.heading, fontFamily: fonts.bold, fontSize: 24, marginTop: 8 },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 22, gap: 18 },
  field: { gap: 10 },
  label: { color: colors.label, fontFamily: fonts.medium, fontSize: 13 },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F1F6F9',
    gap: 4,
  },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  segmentItemActive: { backgroundColor: '#fff' },
  segmentText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 13 },
  segmentTextActive: { color: colors.primary },
  formError: { color: colors.danger, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center' },
  footnote: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center' },
});
