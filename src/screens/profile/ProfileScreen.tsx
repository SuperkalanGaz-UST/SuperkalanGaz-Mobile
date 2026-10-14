import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { radii } from '@/theme/metrics';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { BottomNav } from '@/components/ui/BottomNav';
import { PhoneField } from '@/components/ui/controls';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { normalizePhMobile } from '@/lib/phMobile';
import type { MainNavigateOptions, MainScreen, ProfileSection } from '@/navigation/types';

function metadataText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toSubscriberNumber(value: string): string {
  return normalizePhMobile(value)?.slice(3) ?? '';
}

/**
 * Profile (Figma "MyProfile"): personal details (view/edit), reset-password sheet,
 * and account preferences toggles. Maps to the CIM module (AGENTS.md §8).
 *
 * Customer-facing profile fields come from the active Supabase user. Name,
 * address, optional contact number, and avatar live in user metadata until the
 * customer CIM profile endpoint lands; the immutable customer identity comes
 * from the authenticated user's UUID.
 */
export function ProfileScreen({
  initialSection = 'personal',
  onNavigate,
}: {
  initialSection?: ProfileSection;
  onNavigate: (screen: MainScreen, opts?: MainNavigateOptions) => void;
}) {
  const { session, refreshProfile, updateProfile } = useAuth();
  const [tab, setTab] = useState<ProfileSection>(initialSection);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  const metadata = session?.user.user_metadata;
  const sessionFirstName = metadataText(metadata?.first_name);
  const sessionLastName = metadataText(metadata?.last_name);
  const sessionAddress = metadataText(metadata?.address);
  const sessionContact = metadataText(metadata?.contact_number) || session?.user.phone || '';
  const sessionEmail = session?.user.email ?? '';
  const avatarUrl = metadataText(metadata?.avatar_url);

  const [firstName, setFirstName] = useState(sessionFirstName);
  const [lastName, setLastName] = useState(sessionLastName);
  const [contact, setContact] = useState(() => toSubscriberNumber(sessionContact));
  const [address, setAddress] = useState(sessionAddress);

  const [emailNotif, setEmailNotif] = useState(true);
  const [phoneNotif, setPhoneNotif] = useState(false);
  const [twoFA, setTwoFA] = useState(true);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (editMode) return;
    setFirstName(sessionFirstName);
    setLastName(sessionLastName);
    setContact(toSubscriberNumber(sessionContact));
    setAddress(sessionAddress);
  }, [editMode, sessionFirstName, sessionLastName, sessionContact, sessionAddress]);

  const fields: { label: string; value: string; set: (v: string) => void }[] = [
    { label: 'First Name', value: firstName, set: setFirstName },
    { label: 'Last Name', value: lastName, set: setLastName },
  ];

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Customer';
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'CU';
  const displayContact = contact ? `+63${contact}` : 'Not provided';

  const reloadProfile = useCallback(async () => {
    setProfileError('');
    setProfileMessage('');
    const { error } = await refreshProfile();
    if (error) setProfileError(error);
  }, [refreshProfile]);
  const pullToRefresh = usePullToRefresh(reloadProfile, !editMode && !saving);

  const handleEdit = async () => {
    setProfileError('');
    setProfileMessage('');
    if (!editMode) {
      setEditMode(true);
      return;
    }

    setSaving(true);
    const { error } = await updateProfile({
      firstName,
      lastName,
      address,
      contactNumber: contact,
    });
    setSaving(false);
    if (error) {
      setProfileError(error);
      return;
    }
    setEditMode(false);
    setProfileMessage('Profile updated');
  };

  return (
    <View style={styles.flex}>
      <AppHeader />

      <ScrollView
        style={styles.sheet}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        refreshControl={(
          <AppRefreshControl
            refreshing={pullToRefresh.refreshing}
            onRefresh={pullToRefresh.onRefresh}
            enabled={!editMode && !saving}
          />
        )}
      >
        {/* Avatar banner */}
        <View style={styles.banner}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                : <Text style={styles.avatarInitials}>{initials}</Text>}
            </View>
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.bannerName}>{fullName}</Text>
          <Text style={styles.bannerId} numberOfLines={1}>CUSTOMER ID: {session?.user.id ?? 'Unavailable'}</Text>
        </View>

        {/* Sub-tabs */}
        <View style={styles.tabsWrap}>
          <View style={{ flexDirection: 'row' }}>
            {(['personal', 'preferences'] as const).map((t) => (
              <Pressable key={t} style={styles.tabItem} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.muted }]}>
                  {t === 'personal' ? 'Personal Details' : 'Account Preferences'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.tabTrack}>
            <View style={[styles.tabUnderline, { left: tab === 'personal' ? '0%' : '50%' }]} />
          </View>
        </View>

        {tab === 'personal' ? (
          <View style={styles.body}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Personal Details</Text>
              <Pressable
                disabled={saving}
                style={[styles.editBtn, { backgroundColor: colors.primary }, saving ? styles.editBtnDisabled : null]}
                onPress={() => void handleEdit()}
              >
                <Feather name={editMode ? 'check' : 'edit-2'} size={11} color="#fff" />
                <Text style={[styles.editText, { color: '#fff' }]}>{saving ? 'SAVING…' : editMode ? 'SAVE' : 'EDIT'}</Text>
              </Pressable>
            </View>
            {fields.map((f) => (
              <View key={f.label} style={{ marginBottom: 12 }}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                {editMode ? (
                  <TextInput style={styles.fieldInput} value={f.value} onChangeText={f.set} />
                ) : (
                  <View style={styles.fieldBox}>
                    <Text style={styles.fieldValue}>{f.value || 'Not provided'}</Text>
                  </View>
                )}
              </View>
            ))}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Email (If Applicable)</Text>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldValue}>{sessionEmail || 'Not provided'}</Text>
              </View>
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Contact Number</Text>
              {editMode ? (
                <PhoneField value={contact} onChangeText={setContact} />
              ) : (
                <View style={styles.fieldBox}>
                  <Text style={styles.fieldValue}>{displayContact}</Text>
                </View>
              )}
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>Address</Text>
              {editMode ? (
                <TextInput style={styles.fieldInput} value={address} onChangeText={setAddress} />
              ) : (
                <View style={styles.fieldBox}>
                  <Text style={styles.fieldValue}>{address || 'Not provided'}</Text>
                </View>
              )}
            </View>
            {profileError ? <Text style={styles.profileError}>{profileError}</Text> : null}
            {profileMessage ? <Text style={styles.profileMessage}>{profileMessage}</Text> : null}
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldValue}>••••••••••</Text>
            </View>
            <Pressable onPress={() => setResetOpen(true)}>
              <Text style={styles.resetLink}>Reset Password</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.body}>
            <Text style={styles.sectionTitle}>Account Preferences</Text>
            {[
              { label: 'Email Notifications', value: emailNotif, set: setEmailNotif },
              { label: 'Phone Notifications', value: phoneNotif, set: setPhoneNotif },
              { label: '2FA Security', value: twoFA, set: setTwoFA },
            ].map((p) => (
              <View key={p.label} style={styles.prefRow}>
                <Text style={styles.prefLabel}>{p.label}</Text>
                <Switch
                  value={p.value}
                  onValueChange={p.set}
                  trackColor={{ true: colors.primary, false: '#ccc' }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Reset password sheet */}
      <Modal visible={resetOpen} transparent animationType="slide" onRequestClose={() => setResetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setResetOpen(false)} />
        <View style={styles.resetSheet}>
          <View style={styles.resetHead}>
            <Text style={styles.resetTitle}>Password reset</Text>
            <Pressable onPress={() => setResetOpen(false)} hitSlop={8}>
              <Feather name="x" size={16} color={colors.gray} />
            </Pressable>
          </View>
          <Text style={styles.fieldLabel}>Current Password</Text>
          <View style={styles.pwRow}>
            <TextInput style={styles.pwInput} secureTextEntry={!showCurrent} value={currentPw} onChangeText={setCurrentPw} />
            <Pressable onPress={() => setShowCurrent((s) => !s)} hitSlop={8}>
              <Feather name={showCurrent ? 'eye' : 'eye-off'} size={20} color={colors.grayText} />
            </Pressable>
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>New Password</Text>
          <View style={styles.pwRow}>
            <TextInput style={styles.pwInput} secureTextEntry={!showNew} value={newPw} onChangeText={setNewPw} />
            <Pressable onPress={() => setShowNew((s) => !s)} hitSlop={8}>
              <Feather name={showNew ? 'eye' : 'eye-off'} size={20} color={colors.grayText} />
            </Pressable>
          </View>
          <View style={styles.resetBtns}>
            <Pressable style={[styles.resetBtn, { backgroundColor: colors.cardBorder }]} onPress={() => setResetOpen(false)}>
              <Text style={[styles.resetBtnText, { color: colors.muted }]}>CANCEL</Text>
            </Pressable>
            <Pressable style={[styles.resetBtn, { backgroundColor: colors.primary }]} onPress={() => { setResetOpen(false); setCurrentPw(''); setNewPw(''); }}>
              <Text style={[styles.resetBtnText, { color: '#fff' }]}>CONFIRM</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <BottomNav active="more" onNavigate={onNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  sheet: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24 },

  banner: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', paddingVertical: 16 },
  avatarWrap: { marginTop: 8 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.avatarGray, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.border, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { fontFamily: fonts.semibold, fontSize: 28, color: '#fff' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bannerName: { fontFamily: fonts.bold, fontSize: 18, color: '#fff', marginTop: 8 },
  bannerId: { fontFamily: fonts.regular, fontSize: 10, color: colors.navInactive, marginTop: 2 },

  tabsWrap: { paddingHorizontal: 24, marginTop: 16 },
  tabItem: { flex: 1, alignItems: 'center', paddingBottom: 8 },
  tabText: { fontFamily: fonts.semibold, fontSize: 11 },
  tabTrack: { height: 1, backgroundColor: colors.divider },
  tabUnderline: { position: 'absolute', top: 0, height: 2, width: '50%', backgroundColor: colors.primary },

  body: { paddingHorizontal: 24, marginTop: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radii.chip },
  editBtnDisabled: { opacity: 0.65 },
  editText: { fontFamily: fonts.bold, fontSize: 10 },
  fieldLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.label, marginBottom: 4 },
  fieldBox: { height: 38, borderWidth: 1, borderColor: colors.muted, borderRadius: radii.card, paddingHorizontal: 12, justifyContent: 'center' },
  fieldValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  fieldInput: { height: 38, borderWidth: 1, borderColor: colors.muted, borderRadius: radii.card, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.heading },
  profileError: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger, marginBottom: 8 },
  profileMessage: { fontFamily: fonts.regular, fontSize: 11, color: colors.success, marginBottom: 8 },
  resetLink: { fontFamily: fonts.regular, fontSize: 10, color: colors.primary, marginTop: 4 },

  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.prefRowBg, borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 8 },
  prefLabel: { fontFamily: fonts.semibold, fontSize: 12, color: '#000' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  resetSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  resetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  resetTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.heading },
  pwRow: { flexDirection: 'row', alignItems: 'center', height: 38, borderWidth: 1, borderColor: colors.muted, borderRadius: radii.card, paddingHorizontal: 12 },
  pwInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.heading, padding: 0 },
  resetBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetBtn: { flex: 1, height: 38, borderRadius: radii.button, alignItems: 'center', justifyContent: 'center' },
  resetBtnText: { fontFamily: fonts.bold, fontSize: 12 },
});
