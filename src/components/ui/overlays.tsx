import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { radii } from '@/theme/metrics';
import { images } from '@/lib/assets';
import { Mascot } from './Mascot';

export function BottomSheetModal({ visible, onClose, style, testID, children }: {
  visible: boolean;
  onClose: () => void;
  style: StyleProp<ViewStyle>;
  testID: string;
  children: ReactNode;
}) {
  const [retained, setRetained] = useState(visible);
  if (visible && !retained) setRetained(true);
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const { height } = useWindowDimensions();

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!retained) return;
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : visible ? 260 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    });
    // Start after the modal host mounts so the opening motion is visible.
    const frame = requestAnimationFrame(() => animation.start(({ finished }) => {
      if (finished && !visible) setRetained(false);
    }));
    return () => { cancelAnimationFrame(frame); animation.stop(); };
  }, [retained, progress, reduceMotion, visible]);

  return (
    <Modal visible={retained} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Animated.View testID={`${testID}-backdrop`} style={[styles.sheetScrim, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        </Animated.View>
        <Animated.View
          testID={`${testID}-panel`}
          accessibilityViewIsModal
          pointerEvents={visible ? 'auto' : 'none'}
          style={[style, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

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
          <Mascot pose="sad" style={styles.confirmMascot} />
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
  sheetRoot: { flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  sheetScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.3)' },
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
    paddingTop: 94, // Leave 16 points below the mascot before the title.
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
