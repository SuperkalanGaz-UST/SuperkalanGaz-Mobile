import { type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  onMenu,
  helpRef,
}: {
  onHelp?: () => void;
  onMenu?: () => void;
  /** Ref on the help (?) icon, so the app guide can spotlight it. */
  helpRef?: Ref<View>;
}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const firstName = session?.user.user_metadata?.first_name;
  const greetingName =
    typeof firstName === 'string' && firstName.trim() ? firstName.trim() : 'Customer';

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
        <Pressable onPress={onMenu} hitSlop={8}>
          <Feather name="menu" size={24} color="#fff" />
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
});
