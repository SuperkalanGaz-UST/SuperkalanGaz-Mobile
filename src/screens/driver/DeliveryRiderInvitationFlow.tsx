import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { OtpInput, PrimaryButton, TextField } from '@/components/ui/controls';
import { useAuth } from '@/contexts/AuthContext';
import {
  acceptDeliveryRiderInvitation,
  createDeliveryRiderAccount,
  getDeliveryRiderInvitation,
  resendDeliveryRiderMobileCode,
  verifyDeliveryRiderMobile,
  type DeliveryRiderInvitation,
} from '@/lib/deliveryRiderApi';
import { deliveryRiderInvitationToken } from '@/lib/deliveryRiderInvitationLink';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow } from '@/theme/metrics';

type InvitationStep =
  | 'details'
  | 'password'
  | 'account-created'
  | 'mobile-code'
  | 'review'
  | 'success';

function displayMobile(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^63/, '');
  return digits.length === 10
    ? `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : value;
}

function maskMobile(value: string): string {
  const shown = displayMobile(value);
  return shown.length > 4 ? `${shown.slice(0, -4)}••••` : shown;
}

function LockedField({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.lockedField}>
      <View style={styles.lockIcon}>
        <Feather name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.lockCopy}>
        <Text style={styles.lockLabel}>{label}</Text>
        <Text style={styles.lockValue}>{value}</Text>
      </View>
      <Feather name="lock" size={15} color={colors.textMuted} />
    </View>
  );
}

function StepHeader({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <View style={styles.headerCopy}>
      <Text style={styles.eyebrow}>{step}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{body}</Text>
    </View>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Feather name="alert-circle" size={17} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function DeliveryRiderInvitationFlow({
  token,
  onBack,
  onToken,
  onComplete,
}: {
  token: string | null;
  onBack: () => void;
  onToken: (token: string) => void;
  onComplete?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { signInDeliveryRider } = useAuth();
  const [invitation, setInvitation] = useState<DeliveryRiderInvitation | null>(null);
  const [step, setStep] = useState<InvitationStep>('details');
  const [loading, setLoading] = useState(Boolean(token));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [invitationLink, setInvitationLink] = useState('');

  const loadInvitation = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setInvitation(await getDeliveryRiderInvitation(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'This invitation is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvitation();
  }, [token]);

  const createAccount = async () => {
    if (!token || !invitation) return;
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createDeliveryRiderAccount(token, password);
      setStep('account-created');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  const verifyMobile = async () => {
    if (!token) return;
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter the complete 6-digit verification code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyDeliveryRiderMobile(token, code);
      setInvitation((current) => current ? { ...current, mobileVerified: true } : current);
      setStep('review');
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify the mobile number.');
    } finally {
      setBusy(false);
    }
  };

  const acceptInvitation = async () => {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await acceptDeliveryRiderInvitation(token);
      setStep('success');
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Could not activate the account.');
    } finally {
      setBusy(false);
    }
  };

  const openWorkspace = async () => {
    if (!invitation) return;
    setBusy(true);
    setError('');
    const result = await signInDeliveryRider(invitation.email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onComplete?.();
  };

  if (!token) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
          <Feather name="arrow-left" size={21} color={colors.darkNavy} />
        </Pressable>
        <View style={styles.centeredState}>
          <View style={styles.heroIcon}>
            <Feather name="mail" size={36} color={colors.primary} />
          </View>
          <Text style={styles.stateTitle}>Open your secure invitation</Text>
          <Text style={styles.stateBody}>
            Delivery Rider registration is invitation-only. Open the single-use link sent to your verified email by the Branch Owner.
          </Text>
          <View style={styles.infoCard}>
            <Feather name="shield" size={18} color={colors.primary} />
            <Text style={styles.infoText}>Your role and branch are assigned by the invitation and cannot be changed here.</Text>
          </View>
          <View style={styles.linkFallback}>
            <TextField
              label="Invitation link"
              value={invitationLink}
              onChangeText={(value) => {
                setInvitationLink(value);
                setError('');
              }}
              placeholder="Paste the link from your email"
              error={error || undefined}
            />
            <PrimaryButton
              label="Continue registration"
              onPress={() => {
                const invitationToken = deliveryRiderInvitationToken(invitationLink);
                if (!invitationToken) {
                  setError('Paste the complete Delivery Rider invitation link from your email.');
                  return;
                }
                setError('');
                onToken(invitationToken);
              }}
              disabled={!invitationLink.trim()}
            />
          </View>
          <PrimaryButton label="Back to sign in" onPress={onBack} style={styles.fullButton} />
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centeredPage}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Checking secure invitation…</Text>
      </View>
    );
  }

  if (!invitation) {
    return (
      <View style={[styles.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
          <Feather name="arrow-left" size={21} color={colors.darkNavy} />
        </Pressable>
        <View style={styles.centeredState}>
          <View style={[styles.heroIcon, styles.unavailableIcon]}>
            <Feather name="link-2" size={36} color={colors.danger} />
          </View>
          <Text style={styles.stateTitle}>Invitation unavailable</Text>
          <Text style={styles.stateBody}>This link may be invalid, expired, revoked, already used, or the service may be unavailable.</Text>
          {error ? <InlineError message={error} /> : null}
          <PrimaryButton label="Try again" onPress={() => void loadInvitation()} style={styles.fullButton} />
          <Pressable onPress={onBack} hitSlop={8}>
            <Text style={styles.textAction}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }]}
        keyboardShouldPersistTaps="handled"
      >
        {step !== 'success' ? (
          <Pressable onPress={step === 'details' ? onBack : () => { setError(''); setStep('details'); }} style={styles.backButton} hitSlop={8}>
            <Feather name="arrow-left" size={21} color={colors.darkNavy} />
          </Pressable>
        ) : null}

        {step === 'details' ? (
          <View style={styles.card}>
            <StepHeader
              step="Secure invitation"
              title="Register as Delivery Rider"
              body="Review the invitation authorized by your Branch Owner. These identity and branch details are locked."
            />
            <View style={styles.verifiedPill}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={styles.verifiedText}>Email invitation verified</Text>
            </View>
            <View style={styles.fields}>
              <LockedField icon="user" label="Delivery Rider" value={invitation.recipientName} />
              <LockedField icon="mail" label="Email address" value={invitation.email} />
              <LockedField icon="phone" label="PH mobile number" value={displayMobile(invitation.mobile)} />
              <LockedField icon="map-pin" label="Authorized branch" value={invitation.branchName} />
            </View>
            {error ? <InlineError message={error} /> : null}
            <PrimaryButton
              label="Continue"
              onPress={() => {
                if (!invitation.emailVerified) {
                  setError('Open the verified email invitation before continuing.');
                  return;
                }
                setError('');
                setStep(
                  invitation.mobileVerified
                    ? 'review'
                    : invitation.accountCreated
                      ? 'account-created'
                      : 'password',
                );
              }}
            />
            <Text style={styles.finePrint}>The Branch Owner will never see or set your password.</Text>
          </View>
        ) : null}

        {step === 'password' ? (
          <View style={styles.card}>
            <StepHeader
              step="Step 1 of 3"
              title="Create your password"
              body={`Your email link is verified. Set a private password for ${invitation.email}.`}
            />
            <View style={styles.fields}>
              <TextField label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secure />
              <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter password again" secure />
            </View>
            {error ? <InlineError message={error} /> : null}
            <PrimaryButton label={busy ? 'Creating account…' : 'Create account'} onPress={() => void createAccount()} disabled={busy} />
          </View>
        ) : null}

        {step === 'account-created' ? (
          <View style={styles.card}>
            <View style={styles.successIcon}>
              <Feather name="user-check" size={34} color={colors.success} />
            </View>
            <StepHeader
              step="Step 2 of 3"
              title="Account created"
              body="Your password is saved. Verify the invitation-bound PH mobile number before the account can access deliveries."
            />
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={styles.progressText}>Email verified</Text>
              </View>
              <View style={styles.progressRow}>
                <Feather name="clock" size={18} color={colors.warning} />
                <Text style={styles.progressText}>Mobile verification pending</Text>
              </View>
              <View style={styles.progressRow}>
                <Feather name="lock" size={18} color={colors.textMuted} />
                <Text style={styles.progressText}>Delivery access locked</Text>
              </View>
            </View>
            {error ? <InlineError message={error} /> : null}
            <PrimaryButton
              label={busy ? 'Sending code…' : 'Verify PH mobile number'}
              disabled={busy}
              onPress={() => {
                setBusy(true);
                setError('');
                void resendDeliveryRiderMobileCode(token)
                  .then(() => setStep('mobile-code'))
                  .catch((sendError: unknown) => setError(sendError instanceof Error ? sendError.message : 'Could not send the verification code.'))
                  .finally(() => setBusy(false));
              }}
            />
          </View>
        ) : null}

        {step === 'mobile-code' ? (
          <View style={styles.card}>
            <StepHeader
              step="Step 2 of 3"
              title="Verify your PH mobile"
              body={`Enter the 6-digit code sent to ${maskMobile(invitation.mobile)}.`}
            />
            <View style={styles.fixedPrefixNote}>
              <Text style={styles.fixedPrefix}>+63</Text>
              <Text style={styles.fixedNumber}>{displayMobile(invitation.mobile).replace(/^\+63\s?/, '')}</Text>
              <Feather name="lock" size={15} color={colors.textMuted} />
            </View>
            <OtpInput value={otp} onChange={setOtp} />
            {error ? <InlineError message={error} /> : null}
            <PrimaryButton label={busy ? 'Verifying…' : 'Verify number'} onPress={() => void verifyMobile()} disabled={busy} />
            <Pressable
              disabled={busy}
              onPress={() => {
                setBusy(true);
                setError('');
                void resendDeliveryRiderMobileCode(token)
                  .catch((sendError: unknown) => setError(sendError instanceof Error ? sendError.message : 'Could not resend the code.'))
                  .finally(() => setBusy(false));
              }}
            >
              <Text style={styles.textAction}>Resend code</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'review' ? (
          <View style={styles.card}>
            <StepHeader
              step="Step 3 of 3"
              title="Accept branch invitation"
              body="Both identity checks are complete. Accepting activates one Delivery Rider membership for the branch below."
            />
            <View style={styles.fields}>
              <LockedField icon="user" label="Role" value="Delivery Rider" />
              <LockedField icon="map-pin" label="Branch" value={invitation.branchName} />
            </View>
            <View style={styles.verifiedPill}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={styles.verifiedText}>Email and PH mobile verified</Text>
            </View>
            {error ? <InlineError message={error} /> : null}
            <PrimaryButton label={busy ? 'Activating…' : 'Accept invitation'} onPress={() => void acceptInvitation()} disabled={busy} />
            <Text style={styles.finePrint}>No second Branch Manager approval is required.</Text>
          </View>
        ) : null}

        {step === 'success' ? (
          <View style={[styles.card, styles.successCard]}>
            <View style={styles.successIcon}>
              <Feather name="check" size={38} color={colors.success} />
            </View>
            <StepHeader
              step="Activation complete"
              title="You're now a Delivery Rider"
              body={`Your account is active for ${invitation.branchName}. You begin Offline and without a vehicle assignment.`}
            />
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <View style={styles.offlineDot} />
                <Text style={styles.progressText}>Availability: Offline</Text>
              </View>
              <View style={styles.progressRow}>
                <Feather name="truck" size={18} color={colors.textMuted} />
                <Text style={styles.progressText}>Vehicle: Unassigned</Text>
              </View>
            </View>
            {error ? <InlineError message={error} /> : null}
            <PrimaryButton label={busy ? 'Opening…' : 'Open Delivery Rider app'} onPress={() => void openWorkspace()} disabled={busy} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  page: { flex: 1, backgroundColor: colors.authBg, paddingHorizontal: 20 },
  centeredPage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 18, ...cardShadow },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 50 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  unavailableIcon: { backgroundColor: '#FDECEA' },
  stateTitle: { fontFamily: fonts.bold, fontSize: 23, color: colors.darkNavy, textAlign: 'center' },
  stateBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textMuted, textAlign: 'center', maxWidth: 330 },
  infoCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 14, alignItems: 'flex-start', width: '100%' },
  linkFallback: { width: '100%', gap: 12 },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.text },
  fullButton: { width: '100%' },
  loadingText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 22, gap: 20, ...cardShadow },
  successCard: { alignItems: 'stretch' },
  headerCopy: { gap: 7 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.primary },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 31, color: colors.darkNavy },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.textMuted },
  fields: { gap: 11 },
  lockedField: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 13, backgroundColor: colors.surfaceMuted },
  lockIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  lockCopy: { flex: 1 },
  lockLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  lockValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginTop: 2 },
  verifiedPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, backgroundColor: '#E9F8F2' },
  verifiedText: { fontFamily: fonts.medium, fontSize: 11, color: colors.success },
  finePrint: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 16, color: colors.textMuted, textAlign: 'center' },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 12, padding: 12, backgroundColor: '#FDECEA' },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.danger },
  successIcon: { width: 72, height: 72, alignSelf: 'center', borderRadius: 36, backgroundColor: '#E9F8F2', alignItems: 'center', justifyContent: 'center' },
  progressCard: { gap: 12, borderRadius: 14, padding: 15, backgroundColor: colors.surfaceMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  fixedPrefixNote: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  fixedPrefix: { fontFamily: fonts.semibold, fontSize: 14, color: colors.darkNavy, paddingHorizontal: 13, paddingVertical: 14, backgroundColor: colors.primaryTint },
  fixedNumber: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text, paddingHorizontal: 12 },
  textAction: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary, textAlign: 'center' },
  offlineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.textMuted, marginHorizontal: 3 },
});
