import { useId } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/ui/controls';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { cardShadow, radii, spacing } from '@/theme/metrics';

const noticeSections = [
  {
    heading: 'Account details',
    text: 'We use your name, email address and delivery address to set up your account and help process and deliver your orders.',
  },
  {
    heading: 'Contact and verification',
    text: 'A mobile number is optional and used for contact. We’ll send a verification code to the email address you enter.',
  },
];

export function SignUpPrivacyNoticeDialog({
  visible, reviewing, onAccept, onClose,
}: {
  visible: boolean;
  reviewing: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const titleId = useId();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      aria-labelledby={titleId}
    >
      <View style={[
        styles.backdrop,
        {
          paddingTop: Math.max(insets.top, spacing.lg),
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          paddingLeft: Math.max(insets.left, spacing.lg),
          paddingRight: Math.max(insets.right, spacing.lg),
        },
      ]}>
        <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.icon} aria-hidden>
              <Feather name="shield" size={22} color={colors.primaryDark} />
            </View>
            <View style={styles.headerCopy}>
              <Text nativeID={titleId} accessibilityRole="header" style={styles.title}>
                Registration privacy notice
              </Text>
              <Text style={styles.subtitle}>Temporary notice</Text>
            </View>
          </View>

          <ScrollView
            testID="signup-privacy-notice-body"
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator
          >
            {noticeSections.map(({ heading, text }) => (
              <View key={heading} style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>{heading}</Text>
                <Text style={styles.copy}>{text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            {!reviewing && (
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              >
                <Text style={styles.backLabel}>Back</Text>
              </Pressable>
            )}
            <PrimaryButton
              label={reviewing ? 'Done' : 'I understand'}
              onPress={onAccept}
              style={styles.continue}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.promoScrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    ...cardShadow,
    flexShrink: 1,
    width: '100%',
    maxWidth: 440,
    maxHeight: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.sheet,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inputBorder,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.card,
    backgroundColor: colors.primaryTint,
  },
  headerCopy: { flex: 1, gap: spacing.xs },
  title: { color: colors.heading, fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  subtitle: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12 },
  body: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  bodyContent: { padding: spacing.xl, gap: spacing.lg },
  section: { gap: spacing.xs },
  sectionTitle: { color: colors.primaryDark, fontFamily: fonts.semibold, fontSize: 14 },
  copy: { color: colors.label, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.inputBorder,
  },
  back: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: radii.card,
  },
  backLabel: { color: colors.primaryDark, fontFamily: fonts.semibold, fontSize: 14 },
  pressed: { opacity: 0.85 },
  continue: { flex: 1.65, width: 'auto' },
});
