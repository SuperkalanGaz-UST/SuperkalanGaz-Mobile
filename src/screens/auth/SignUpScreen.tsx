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
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizePhMobile } from '@/lib/phMobile';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { EmailPhoneToggle, PhoneField, PrimaryButton, TextField } from '@/components/ui/controls';
import type { AccountType, InputMode, SignupDraft } from '@/navigation/types';

/**
 * Sign-up (Figma "Create a … Account"). Collects the CIM profile fields, then
 * hands a draft up for OTP verification + account creation. The blurred login
 * backdrop from the web mock is dropped on native as pure decoration.
 */
export function SignUpScreen({
  account,
  input,
  initialDraft,
  onInputChange,
  onBack,
  onNext,
}: {
  account: AccountType;
  input: InputMode;
  /** Restores the form when the customer returns from OTP; never persisted to storage. */
  initialDraft: SignupDraft | null;
  onInputChange: (v: InputMode) => void;
  onBack: () => void;
  onNext: (draft: SignupDraft) => Promise<string | null>;
}) {
  const insets = useSafeAreaInsets();
  const isCommercial = account === 'commercial';
  const isPhone = input === 'phone';

  const [firstName, setFirstName] = useState(initialDraft?.firstName ?? '');
  const [lastName, setLastName] = useState(initialDraft?.lastName ?? '');
  const [address, setAddress] = useState(initialDraft?.address ?? '');
  const [contact, setContact] = useState(initialDraft?.contact ?? '');
  const [password, setPassword] = useState(initialDraft?.password ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const handleNext = async () => {
    if (busy) return;

    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Required';
    if (!lastName.trim()) e.lastName = 'Required';
    if (!address.trim()) e.address = `${isCommercial ? 'Business address' : 'Address'} is required`;
    if (!contact.trim()) e.contact = isPhone ? 'Phone number is required' : 'Email is required';
    if (!password.trim()) e.password = 'Password is required';

    let normalized = contact.trim();
    if (isPhone && contact.trim()) {
      const n = normalizePhMobile(contact);
      if (!n) e.contact = 'Enter a valid PH mobile number';
      else normalized = n;
    } else if (contact.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) {
      e.contact = 'Enter a valid email address';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setBusy(true);
    const submitError = await onNext({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address: address.trim(),
      contact: isPhone ? normalized : normalized.toLowerCase(),
      password,
      accountType: account,
      input,
    });
    setBusy(false);
    if (submitError) setErrors({ form: submitError });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={onBack} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={colors.heading} />
          </Pressable>
          <Text style={styles.title}>Create a {isCommercial ? 'Commercial' : 'Household'} Account</Text>
        </View>

        <View style={styles.toggleWrap}>
          <EmailPhoneToggle
            value={input}
            onChange={(v) => {
              onInputChange(v);
              setErrors({});
            }}
            height={42}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <TextField label="First Name" placeholder="Juan" value={firstName} onChangeText={setFirstName} error={errors.firstName} autoCapitalize="words" />
          </View>
          <View style={styles.rowItem}>
            <TextField label="Last Name" placeholder="Dela Cruz" value={lastName} onChangeText={setLastName} error={errors.lastName} autoCapitalize="words" />
          </View>
        </View>

        <TextField
          label={isCommercial ? 'Business Address' : 'Address'}
          placeholder="123 Main St., Metro Manila"
          value={address}
          onChangeText={setAddress}
          error={errors.address}
          autoCapitalize="sentences"
        />

        {isPhone ? (
          <PhoneField
            label={isCommercial ? 'Business Phone Number' : 'Phone Number'}
            value={contact}
            onChangeText={setContact}
            error={errors.contact}
          />
        ) : (
          <TextField
            label="Email Address"
            placeholder="juandelacruz@email.com"
            keyboardType="email-address"
            value={contact}
            onChangeText={setContact}
            error={errors.contact}
          />
        )}

        <TextField label="Password" placeholder="••••••••••" secure value={password} onChangeText={setPassword} error={errors.password} />

        {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

        <PrimaryButton
          label={busy ? 'Sending code…' : 'Next'}
          onPress={() => void handleNext()}
          disabled={busy}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative', height: 32 },
  back: { position: 'absolute', left: 0 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.heading },
  toggleWrap: { marginHorizontal: 16 },
  row: { flexDirection: 'row', gap: 16 },
  rowItem: { flex: 1 },
  formError: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, textAlign: 'center' },
});
