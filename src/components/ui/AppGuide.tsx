import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { images } from '@/lib/assets';

/**
 * First-run app tour (DESIGN adaptation of the Figma "AppGuide" spotlight).
 * The web version dims specific regions of the Home screen; on native we present
 * the same seven guidance cards over a dimmed backdrop with a mascot, which
 * carries the identical copy and step flow without pixel-pinned spotlights.
 */
const STEPS = [
  {
    img: images.mascotWave,
    title: 'Hi! Welcome to Superkalan Gaz App',
    body: "I'm here to guide you in this app, let me show you some cool things here that will help you.",
  },
  {
    img: images.mascotRewards,
    title: 'Rewards & Points',
    body: 'You can view your accumulated points and claim awesome rewards from our Rewards Shop!',
  },
  {
    img: images.mascotRewards,
    title: 'Active Orders',
    body: 'Here you can see your active orders as of the moment. You can view it anytime.',
  },
  {
    img: images.mascotOrder,
    title: 'Ordering Again?',
    body: "Ordering again made easier! Just one click away and you're all set for another order.",
  },
  {
    img: images.mascotQuick,
    title: 'Quick Order',
    body: 'Quick orders can be viewed also here! You can choose from a wide variety of high-quality gas tanks.',
  },
  {
    img: images.mascotOrder,
    title: 'Navigate with Ease!',
    body: 'Our navigation bar gives everything you need from Rewards, checking your active and past orders and viewing your profile.',
  },
  {
    img: images.mascotWave,
    title: 'Need Help?',
    body: "Just click 'Guide' to see this app guide again if ever you feel lost.",
  },
];

export function AppGuideOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const data = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const close = () => {
    setStep(0);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.cardWrap}>
          <Image source={data.img} style={styles.mascot} resizeMode="contain" />
          <View style={styles.card}>
            <Pressable style={styles.close} onPress={close} hitSlop={8}>
              <Feather name="x" size={20} color={colors.grayText} />
            </Pressable>
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
              ))}
            </View>
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.body}>{data.body}</Text>
            <View style={styles.actions}>
              {step > 0 ? (
                <Pressable style={styles.back} onPress={() => setStep((s) => s - 1)}>
                  <Feather name="chevron-left" size={16} color={colors.label} />
                  <Text style={styles.backText}>BACK</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable
                style={styles.next}
                onPress={() => (isLast ? close() : setStep((s) => s + 1))}
              >
                <Text style={styles.nextText}>{isLast ? 'DONE' : 'NEXT'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingBottom: 90,
    paddingHorizontal: 16,
  },
  cardWrap: { position: 'relative' },
  mascot: { position: 'absolute', top: -100, alignSelf: 'center', width: 110, height: 120, zIndex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 20 },
  close: { position: 'absolute', top: 12, right: 16, zIndex: 2 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 16, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d9d9d9' },
  dotActive: { width: 28, backgroundColor: colors.primary },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.label, marginBottom: 8 },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.grayText, marginBottom: 20, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontFamily: fonts.medium, fontSize: 13, color: colors.label },
  next: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8 },
  nextText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
});
