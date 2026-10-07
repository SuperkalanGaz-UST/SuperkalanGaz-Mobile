import { useEffect, useRef, useState } from 'react';
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
import { PrimaryButton } from '@/components/ui/controls';
import { useAuth } from '@/contexts/AuthContext';
import {
  confirmDeliveryRiderDetails,
  getDeliveryRiderDetails,
  type DeliveryRiderInvitation,
} from '@/lib/deliveryRiderApi';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow } from '@/theme/metrics';

function displayMobile(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^63/, '');
  return digits.length === 10
    ? `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : value;
}

export function DeliveryRiderMobileVerificationScreen() {
  const insets = useSafeAreaInsets();
  const { refreshSession, signOut } = useAuth();
  const [account, setAccount] = useState<DeliveryRiderInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    void getDeliveryRiderDetails()
      .then((loaded) => {
        if (!current) return;
        setAccount(loaded);
      })
      .catch((loadError: unknown) => {
        if (current) {
          setError(loadError instanceof Error ? loadError.message : 'Mobile verification is unavailable.');
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  const confirmDetails = async () => {
    if (saving.current || !account) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await confirmDeliveryRiderDetails();
      const refreshed = await refreshSession();
      if (refreshed.error) throw new Error(refreshed.error);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not confirm your details.',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading your details…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="smartphone" size={31} color={colors.primary} />
          </View>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>ONE LAST STEP</Text>
            <Text style={styles.title}>Confirm your details</Text>
            <Text style={styles.body}>
              Please check that your name and mobile number are correct.
            </Text>
          </View>

          {account ? (
            <View style={styles.accountCard}>
              <View>
                <Text style={styles.accountLabel}>Delivery Rider</Text>
                <Text style={styles.accountValue}>{account.recipientName}</Text>
              </View>
              <View style={styles.divider} />
              <View>
                <Text style={styles.accountLabel}>PH mobile number</Text>
                <Text style={styles.accountValue}>{displayMobile(account.mobile)}</Text>
              </View>
            </View>
          ) : null}

          {account ? <Text style={styles.signOut}>Wrong details? Contact your branch manager.</Text> : null}
          {error ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={17} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton label={busy ? 'Confirming…' : 'Confirm and continue'} onPress={() => void confirmDetails()} disabled={busy || !account} />

          <Pressable disabled={busy} onPress={() => void signOut()} hitSlop={8}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.authBg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.authBg },
  loadingText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  card: { gap: 20, padding: 24, borderRadius: 22, backgroundColor: colors.surface, ...cardShadow },
  iconWrap: { width: 66, height: 66, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 33, backgroundColor: colors.primaryTint },
  header: { alignItems: 'center', gap: 7 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.9 },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.darkNavy, textAlign: 'center' },
  body: { maxWidth: 320, fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, color: colors.textMuted, textAlign: 'center' },
  accountCard: { gap: 12, padding: 15, borderRadius: 14, backgroundColor: colors.authBg },
  accountLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted },
  accountValue: { marginTop: 3, fontFamily: fonts.semibold, fontSize: 13, color: colors.darkNavy },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 12, backgroundColor: '#FDECEA' },
  errorText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.danger },
  signOut: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
