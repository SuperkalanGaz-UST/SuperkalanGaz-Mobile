import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { BottomTabBar } from '@/screens/home/homeShared';
import { PasswordResetSheet } from '@/screens/profile/PasswordResetSheet';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Customer profile (Figma "My Profile"). Shows the account's personal details
 * over the shared blue banner + avatar hero, with a Personal Details / Account
 * Preferences tab switch and an Edit toggle that unlocks the fields. Reuses the
 * app's BottomTabBar with "Profile" active so it reads as one product.
 *
 * SCAFFOLD: fields are seeded from the Supabase session's user metadata (set at
 * sign-up) and fall back to the Figma sample values. Saving, the avatar photo
 * upload, and Reset Password are visual for now — wire them to the customer
 * profile endpoint of the shared API (src/lib/api.ts) once it lands (AGENTS.md §4).
 */
interface ProfileScreenProps {
  /** Return to the previous screen (back arrow + Home tab). */
  onBack?: () => void;
  /** Sign out of the account (kept available while testing). */
  onSignOut?: () => void;
}

type ProfileTab = 'details' | 'preferences';

export function ProfileScreen({ onBack, onSignOut }: ProfileScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  const [tab, setTab] = useState<ProfileTab>('details');
  const [editing, setEditing] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);

  // SCAFFOLD: notification/security preferences are local for now — persist them
  // to the customer profile endpoint of the shared API once it lands (AGENTS.md §4).
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [phoneNotifs, setPhoneNotifs] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  // Seed from sign-up metadata; the Figma sample values stand in when empty.
  const [firstName, setFirstName] = useState(str(meta.first_name) || 'Juan');
  const [lastName, setLastName] = useState(str(meta.last_name) || 'Dela Cruz');
  const [email, setEmail] = useState(str(session?.user?.email) || '');
  const [contact, setContact] = useState(str(session?.user?.phone) || '');
  const [address, setAddress] = useState(str(meta.address) || '');

  const fullName = `${firstName} ${lastName}`.trim() || 'Customer';
  // TODO: replace with the customer's real ID from the profile endpoint.
  const customerId = 'CUST-1234';

  const toggleEdit = () => {
    // TODO: on save, PATCH the edited fields to the customer profile endpoint.
    setEditing((v) => !v);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.page}>
        {/* Fixed header — stays put while the content below scrolls. */}
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <Pressable hitSlop={10} onPress={onBack} accessibilityLabel="Go back">
            <Feather name="chevron-left" size={28} color={colors.heading} />
          </Pressable>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 108 }}
        >
          {/* Hero: blue banner + white card, with the avatar overlapping both */}
          <View style={styles.hero}>
            <View style={styles.banner} />

            <View style={styles.card}>
              <Text style={styles.name}>{fullName}</Text>
              <Text style={styles.customerId}>CUSTOMER ID: {customerId}</Text>

              {/* Tabs */}
              <View style={styles.tabRow}>
                <ProfileTabButton label="Personal Details" active={tab === 'details'} onPress={() => setTab('details')} />
                <ProfileTabButton
                  label="Account Preferences"
                  active={tab === 'preferences'}
                  onPress={() => setTab('preferences')}
                />
              </View>

              {tab === 'details' ? (
                <>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Personal Details</Text>
                    <Pressable
                      onPress={toggleEdit}
                      style={({ pressed }) => [styles.editBtn, editing && styles.editBtnActive, pressed && styles.pressedDim]}
                    >
                      <Feather name="edit-2" size={14} color={editing ? EDIT_ACTIVE_FG : '#FFFFFF'} />
                      <Text style={[styles.editBtnText, editing && styles.editBtnTextActive]}>EDIT</Text>
                    </Pressable>
                  </View>

                  <Field label="First Name" value={firstName} onChangeText={setFirstName} editing={editing} placeholder="Juan" />
                  <Field label="Last Name" value={lastName} onChangeText={setLastName} editing={editing} placeholder="Dela Cruz" />
                  <Field
                    label="Email (If Applicable)"
                    value={email}
                    onChangeText={setEmail}
                    editing={editing}
                    placeholder="juandelacruz@email.com"
                    keyboardType="email-address"
                  />
                  <Field
                    label="Contact Number"
                    value={contact}
                    onChangeText={setContact}
                    editing={editing}
                    placeholder="09123456789"
                    keyboardType="phone-pad"
                  />
                  <Field
                    label="Address"
                    value={address}
                    onChangeText={setAddress}
                    editing={editing}
                    placeholder="123 Main St., Metro Manila"
                  />

                  {/* Password is never editable inline — it's changed via reset. */}
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      value="••••••••••"
                      editable={false}
                      secureTextEntry
                    />
                  </View>
                  <Pressable hitSlop={6} style={styles.resetWrap} onPress={() => setResetVisible(true)}>
                    <Text style={styles.resetLink}>Reset Password</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.preferences}>
                  <Text style={styles.sectionTitle}>Account Preferences</Text>
                  <PreferenceRow label="Email Notifications" value={emailNotifs} onValueChange={setEmailNotifs} />
                  <PreferenceRow label="Phone Notifications" value={phoneNotifs} onValueChange={setPhoneNotifs} />
                  <PreferenceRow label="2FA Security" value={twoFactor} onValueChange={setTwoFactor} />

                  {onSignOut && (
                    <Pressable
                      onPress={onSignOut}
                      style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressedDim]}
                    >
                      <Feather name="log-out" size={16} color={colors.danger} />
                      <Text style={styles.signOutText}>Sign out</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {/* Avatar sits above the banner/card seam, centered. */}
            <View style={styles.avatarWrap} pointerEvents="box-none">
              <View style={styles.avatar}>
                <Ionicons name="person" size={64} color="#FFFFFF" />
              </View>
              <Pressable style={styles.cameraBadge} accessibilityLabel="Change photo">
                <Feather name="camera" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <BottomTabBar active="profile" onHome={onBack} />
      </View>

      <PasswordResetSheet visible={resetVisible} onClose={() => setResetVisible(false)} />
    </KeyboardAvoidingView>
  );
}

function ProfileTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.tabBtn} onPress={onPress}>
      <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>{label}</Text>
      <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
    </Pressable>
  );
}

/** A labelled profile field — read-only until Edit is toggled on. */
function Field({
  label,
  value,
  onChangeText,
  editing,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  editing: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, !editing && styles.inputReadOnly]}
          value={value}
          onChangeText={onChangeText}
          editable={editing}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          autoCorrect={false}
        />
      </View>
    </>
  );
}

/** A labelled preference row with a right-aligned toggle (Figma). */
function PreferenceRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>{label}</Text>
      <Switch
        style={styles.prefSwitch}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: TRACK_OFF }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={TRACK_OFF}
      />
    </View>
  );
}

// Local palette for shades specific to this screen (kept beside the styles that
// use them, matching the login screen's local-shadow convention).
const AVATAR_GRAY = '#9E9E9E';
const FIELD_BORDER = '#CBD2D8';
const PLACEHOLDER = '#9AA0A6';
const AVATAR = 132;
// Edit button's active (editing) state — a flat gray chip (Figma).
const EDIT_ACTIVE_BG = '#D6D6D6';
const EDIT_ACTIVE_FG = '#7A7A7A';
// Preference rows: light gray fill + gray "off" toggle track (Figma).
const PREF_ROW_BG = '#F1F2F3';
const TRACK_OFF = '#9A9A9A';

const cardShadow = {
  shadowColor: '#0A2540',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 16,
  elevation: 5,
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.surface },
  pressedDim: { opacity: 0.85 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontFamily: fonts.bold, color: colors.heading },

  // Hero (blue banner + white card + overlapping avatar)
  hero: { paddingHorizontal: 16 },
  banner: {
    height: 130,
    backgroundColor: colors.primary,
    borderRadius: 24,
    marginTop: AVATAR * 0.42,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginTop: -70,
    paddingTop: AVATAR * 0.5 + 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
    ...cardShadow,
  },

  // Avatar
  avatarWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: AVATAR_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  cameraBadge: {
    position: 'absolute',
    right: '50%',
    bottom: 4,
    marginRight: -AVATAR / 2 + 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },

  // Name + ID
  name: { fontSize: 24, fontFamily: fonts.bold, color: colors.heading, textAlign: 'center' },
  customerId: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.navInactive,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 4,
  },

  // Tabs
  tabRow: { flexDirection: 'row', marginTop: 18, marginBottom: 8 },
  tabBtn: { flex: 1, alignItems: 'center' },
  tabText: { fontSize: 14, fontFamily: fonts.semibold, paddingBottom: 8 },
  tabTextActive: { color: colors.primary },
  tabTextInactive: { color: colors.textMuted },
  tabUnderline: { height: 2, alignSelf: 'stretch', backgroundColor: colors.border },
  tabUnderlineActive: { backgroundColor: colors.primary },

  // Section header + Edit
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  sectionTitle: { fontSize: 20, fontFamily: fonts.bold, color: colors.primary },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 8,
    ...cardShadow,
  },
  editBtnActive: { backgroundColor: EDIT_ACTIVE_BG, shadowOpacity: 0, elevation: 0 },
  editBtnText: { fontSize: 13, fontFamily: fonts.semibold, color: '#FFFFFF' },
  editBtnTextActive: { color: EDIT_ACTIVE_FG },

  // Fields
  fieldLabel: { fontSize: 14, fontFamily: fonts.semibold, color: colors.label, marginTop: 18, marginBottom: 8 },
  inputWrap: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  input: { height: 52, paddingHorizontal: 16, fontSize: 15, fontFamily: fonts.regular, color: colors.label },
  inputReadOnly: { color: PLACEHOLDER },

  resetWrap: { marginTop: 14 },
  resetLink: { fontSize: 14, fontFamily: fonts.semibold, color: colors.primary },

  // Account Preferences
  preferences: { paddingTop: 4 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PREF_ROW_BG,
    borderRadius: 12,
    paddingHorizontal: 20,
    // Content height (label + switch) rather than a fixed height, so neither
    // child can float within leftover vertical slack.
    minHeight: 64,
    paddingVertical: 12,
    marginTop: 16,
  },
  prefLabel: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  prefSwitch: { alignSelf: 'center' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    marginTop: 32,
  },
  signOutText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.danger },
});
