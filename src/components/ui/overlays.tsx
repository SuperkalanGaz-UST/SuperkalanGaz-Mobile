import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { radii } from '@/theme/metrics';
import { images } from '@/lib/assets';

/* ─────────────────────────────────────────────
   Log-out confirmation
───────────────────────────────────────────── */

export function LogoutConfirmModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.centerBackdrop}>
        <View style={styles.confirmCard}>
          <Image source={images.mascotSad} style={styles.confirmMascot} resizeMode="contain" />
          <Pressable style={styles.closeBtn} onPress={onCancel} hitSlop={8}>
            <Feather name="x" size={22} color={colors.grayText} />
          </Pressable>
          <Text style={styles.confirmTitle}>Are you sure you want to Log Out?</Text>
          <Pressable
            style={({ pressed }) => [styles.confirmYes, pressed && { opacity: 0.85 }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmYesText}>YES, LOG ME OUT</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.confirmCancel, pressed && { opacity: 0.85 }]}
            onPress={onCancel}
          >
            <Text style={styles.confirmCancelText}>CANCEL</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   First-time promo
───────────────────────────────────────────── */

export function PromoModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.centerBackdrop}>
        <View style={styles.promoCard}>
          <View style={styles.promoHead}>
            <Text style={styles.promoTitle}>First Time User Benefits!</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={colors.grayText} />
            </Pressable>
          </View>
          <Image source={images.promo} style={styles.promoImg} resizeMode="cover" />
          <Text style={styles.promoBody}>Get up to 10% discount on your first order!</Text>
          <Pressable
            style={({ pressed }) => [styles.promoBtn, pressed && { opacity: 0.85 }]}
            onPress={onClose}
          >
            <Text style={styles.promoBtnText}>ORDER NOW</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────
   Success toast (order-process changes)
───────────────────────────────────────────── */

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={styles.toast} pointerEvents="none">
      <View style={styles.toastCheck}>
        <Feather name="check" size={13} color="#fff" />
      </View>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  closeBtn: { position: 'absolute', top: 12, right: 16 },

  confirmCard: {
    width: 320,
    backgroundColor: '#fff',
    borderRadius: radii.card,
    paddingTop: 70,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
  },
  confirmMascot: { position: 'absolute', top: -52, width: 110, height: 130 },
  confirmTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary, textAlign: 'center' },
  confirmYes: {
    width: '100%',
    height: 38,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmYesText: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },
  confirmCancel: {
    width: '100%',
    height: 38,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },

  promoCard: { width: 320, backgroundColor: '#fff', borderRadius: radii.card, padding: 16, gap: 12 },
  promoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.primary },
  promoImg: { width: '100%', height: 123, borderRadius: 6 },
  promoBody: { fontFamily: fonts.semibold, fontSize: 10, color: colors.primary, textAlign: 'center' },
  promoBtn: {
    height: 38,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBtnText: { fontFamily: fonts.bold, fontSize: 12, color: '#fff' },

  toast: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100,
  },
  toastCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.greenToast,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 11, color: '#fff' },
});
