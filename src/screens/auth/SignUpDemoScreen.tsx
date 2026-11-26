import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const sampleDetails = [
  { label: 'Name', value: 'Mika Demo' },
  { label: 'Email', value: 'customer@example.invalid' },
  { label: 'Address', value: '123 Sample Street' },
  { label: 'Account type', value: 'Household' },
];

const steps = {
  notice: {
    title: 'Demo privacy notice',
    description: 'During live signup, we ask for your name, email, and address to create your account and help process your orders. This demo uses fictional details only.',
    button: 'I understand',
    next: 'details',
  },
  details: {
    title: 'Sample registration details',
    description: 'Review the fictional details used in this demo.',
    button: 'Finish demo',
    next: 'complete',
  },
  complete: {
    title: 'Demo complete',
    description: 'You’ve finished the sample signup. No account was created.',
    button: 'Restart demo',
    next: 'notice',
  },
} as const;

export function SignUpDemoScreen({ onExit }: { onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<keyof typeof steps>('notice');
  const { title, description, button, next } = steps[stage];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <View style={styles.content}>
        <Pressable accessibilityRole="button" onPress={onExit} style={styles.back}>
          <Text style={styles.backText}>‹ Back to sign in</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>Customer signup demo</Text>
        <View style={styles.card}>
          <View accessibilityLiveRegion="polite" style={styles.intro}>
            <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
            <Text style={styles.body}>{description}</Text>
          </View>
          {stage === 'details' && (
            <View style={styles.details}>
              {sampleDetails.map(({ label, value }) => (
                <View key={label} style={styles.detail}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.body}>{value}</Text>
                </View>
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => setStage(next)}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>{button}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.authBg },
  scroll: { alignItems: 'center', paddingHorizontal: 20 },
  content: { width: '100%', maxWidth: 460, gap: 14 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { color: colors.primaryDark, fontFamily: fonts.medium, fontSize: 14 },
  title: { color: colors.heading, fontFamily: fonts.bold, fontSize: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 22, gap: 20 },
  intro: { gap: 6 },
  heading: { color: colors.heading, fontFamily: fonts.bold, fontSize: 18 },
  body: { color: colors.label, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  details: { backgroundColor: colors.authBg, borderRadius: 12, padding: 16, gap: 12 },
  detail: { gap: 2 },
  label: { color: colors.heading, fontFamily: fonts.medium, fontSize: 13 },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    minHeight: 48,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: colors.surface, fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },
});
