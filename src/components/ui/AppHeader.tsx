import { type Ref, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { LogoutConfirmModal } from '@/components/ui/overlays';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * Shared account trigger for every customer header. Keeping the menu here
 * makes logout available even on screens that do not render the More tab.
 */
export function AccountMenuButton({
  onProfile,
  variant = 'default',
}: {
  onProfile?: () => void;
  variant?: 'default' | 'home';
}) {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const metadata = session?.user.user_metadata;
  const firstName = metadata?.first_name;
  const lastName = metadata?.last_name;
  const profileInitials = [firstName, lastName]
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'CU';
  const avatarUrl = typeof metadata?.avatar_url === 'string' && metadata.avatar_url.trim()
    ? metadata.avatar_url.trim()
    : null;

  const openProfile = () => {
    setMenuOpen(false);
    onProfile?.();
  };

  const requestLogout = () => {
    setMenuOpen(false);
    setLogoutConfirmOpen(true);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open account menu"
        accessibilityState={{ expanded: menuOpen }}
        onPress={() => setMenuOpen(true)}
        hitSlop={8}
        style={[styles.profileButton, variant === 'home' && styles.homeProfileButton]}
      >
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
          : <Text style={styles.profileInitials}>{profileInitials}</Text>}
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.menuBackdrop}>
          <Pressable
            accessibilityLabel="Close account menu"
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuOpen(false)}
          />
          <View style={[styles.accountMenu, { top: insets.top + (variant === 'home' ? 62 : 72) }]}>
            {onProfile ? (
              <Pressable
                accessibilityRole="button"
                onPress={openProfile}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              >
                <Feather name="user" size={17} color={colors.primary} />
                <Text style={styles.menuItemText}>My Profile</Text>
              </Pressable>
            ) : null}
            {onProfile ? <View style={styles.menuDivider} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={requestLogout}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              <Feather name="log-out" size={17} color={colors.danger} />
              <Text style={styles.menuLogoutText}>Log Out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <LogoutConfirmModal
        visible={logoutConfirmOpen}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          void signOut();
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </>
  );
}

/**
 * The shared blue greeting header used by every signed-in surface (Home, Orders,
 * Profile, Rewards). Safe-area aware — never hardcodes the status-bar offset.
 */
export function AppHeader({
  onHelp,
  onProfile,
  helpRef,
  variant = 'default',
}: {
  onHelp?: () => void;
  onProfile?: () => void;
  /** Ref on the help (?) icon, so the app guide can spotlight it. */
  helpRef?: Ref<View>;
  variant?: 'default' | 'home';
}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const metadata = session?.user.user_metadata;
  const firstName = metadata?.first_name;
  const greetingName =
    typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'Customer';

  return (
    <View
      style={[
        styles.header,
        variant === 'home' && styles.homeHeader,
        { paddingTop: insets.top + (variant === 'home' ? 10 : 20) },
      ]}
    >
      <View>
        <Text style={[styles.hello, variant === 'home' && styles.homeHello]}>
          Hello,{' '}
          <Text style={[styles.helloName, variant === 'home' && styles.homeHelloName]}>
            {greetingName}
          </Text>
          !
        </Text>
        <Text style={[styles.sub, variant === 'home' && styles.homeSub]}>
          What can we do for you today?
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable ref={helpRef} onPress={onHelp} hitSlop={8}>
          <Feather name="help-circle" size={24} color="#fff" />
        </Pressable>
        <AccountMenuButton onProfile={onProfile} variant={variant} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.headerBlue,
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeHeader: { paddingBottom: 40 },
  hello: { fontFamily: fonts.bold, fontSize: 24, color: '#fff' },
  homeHello: { fontSize: 24 },
  helloName: { color: colors.helloAccent },
  homeHelloName: { color: '#fff' },
  sub: { fontFamily: fonts.medium, fontSize: 12, color: '#fff', marginTop: 2 },
  homeSub: { fontSize: 12, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBackdrop: { flex: 1 },
  accountMenu: {
    position: 'absolute',
    right: 20,
    minWidth: 170,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#001B33',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  menuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  menuItemPressed: { backgroundColor: '#F2F8FC' },
  menuItemText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.heading },
  menuLogoutText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.danger },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    backgroundColor: colors.dividerStrong,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImage: { width: '100%', height: '100%' },
  profileInitials: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  homeProfileButton: { width: 38, height: 38, borderRadius: 19 },
});
