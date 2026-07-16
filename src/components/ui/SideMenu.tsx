import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { images } from '@/lib/assets';

type FeatherName = keyof typeof Feather.glyphMap;

/**
 * Right-hand slide-out drawer shared by the signed-in screens. Behaviour-only
 * items (Settings / Contact Us) are wired as no-ops until their screens land.
 */
export function SideMenu({
  visible,
  name = 'Juan Dela Cruz',
  onClose,
  onProfile,
  onOrders,
  onFaqs,
  onGuide,
  onLogout,
}: {
  visible: boolean;
  name?: string;
  onClose: () => void;
  onProfile?: () => void;
  onOrders?: () => void;
  onFaqs?: () => void;
  onGuide?: () => void;
  onLogout: () => void;
}) {
  const insets = useSafeAreaInsets();

  const item = (label: string, icon: FeatherName, onPress?: () => void) => (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
      onPress={() => {
        onClose();
        onPress?.();
      }}
    >
      <Text style={styles.itemText}>{label}</Text>
      <Feather name={icon} size={16} color="#fff" />
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.drawer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.logoRow}>
          <Image source={images.logo} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Feather name="user" size={24} color="#fff" />
          </View>
          <Text style={styles.name}>{name}</Text>
        </View>

        <View style={styles.divider} />
        {item('Profile', 'user', onProfile)}
        {item('My Orders', 'shopping-bag', onOrders)}
        {item('Settings', 'settings')}

        <View style={styles.divider} />
        {item('App Guide', 'book-open', onGuide)}
        {item('Contact Us', 'phone')}
        {item('FAQs', 'help-circle', onFaqs)}

        <View style={{ flex: 1 }} />
        <View style={styles.divider} />
        <Pressable style={styles.logoutRow} onPress={() => { onClose(); onLogout(); }}>
          <Text style={styles.itemText}>Log Out</Text>
          <Feather name="log-out" size={18} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 210,
    backgroundColor: colors.darkNavy,
  },
  logoRow: { alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 8 },
  logo: { width: 50, height: 36, tintColor: '#fff' },
  profileRow: { alignItems: 'flex-end', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.avatarGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
  divider: { height: 1, backgroundColor: '#0F67A5', marginVertical: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  itemText: { fontFamily: fonts.regular, fontSize: 14, color: '#fff' },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
