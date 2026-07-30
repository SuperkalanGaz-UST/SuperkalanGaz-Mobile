import { type Ref } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

/**
 * The shared blue greeting header used by every signed-in surface (Home, Orders,
 * Profile, Rewards). Safe-area aware — never hardcodes the status-bar offset.
 */
export function AppHeader({
  onHelp,
  onProfile,
  helpRef,
}: {
  onHelp?: () => void;
  onProfile?: () => void;
  /** Ref on the help (?) icon, so the app guide can spotlight it. */
  helpRef?: Ref<View>;
}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const metadata = session?.user.user_metadata;
  const firstName = metadata?.first_name;
  const lastName = metadata?.last_name;
  const greetingName =
    typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'Customer';
  const profileInitials = [firstName, lastName]
    .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2) || 'CU';
  const avatarUrl = typeof metadata?.avatar_url === 'string' && metadata.avatar_url.trim()
    ? metadata.avatar_url.trim()
    : null;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <View>
        <Text style={styles.hello}>
          Hello, <Text style={styles.helloName}>{greetingName}</Text>!
        </Text>
        <Text style={styles.sub}>What can we do for you today?</Text>
      </View>
      <View style={styles.actions}>
        <Pressable ref={helpRef} onPress={onHelp} hitSlop={8}>
          <Feather name="help-circle" size={24} color="#fff" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          disabled={!onProfile}
          onPress={onProfile}
          hitSlop={8}
          style={styles.profileButton}
        >
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
            : <Text style={styles.profileInitials}>{profileInitials}</Text>}
        </Pressable>
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
  hello: { fontFamily: fonts.bold, fontSize: 24, color: '#fff' },
  helloName: { color: colors.helloAccent },
  sub: { fontFamily: fonts.medium, fontSize: 12, color: '#fff', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
});
