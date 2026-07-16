import { type ComponentType, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { images } from '@/lib/assets';

/**
 * First-run app tour (Figma "AppGuide" spotlight), controlled by the host screen.
 *
 * The host (Home) measures the real element for each step and passes its window
 * `rect`; the overlay dims everything except a padded box around that rect, so the
 * spotlight always matches the actual UI (never a guessed offset) and hugs the
 * element with a side margin instead of spanning edge-to-edge. `rect = null` =
 * full dim (welcome / "need help" steps). Between steps the box + card morph.
 */
export type GuideRect = { x: number; y: number; width: number; height: number };

const GUIDE_DARK = 'rgba(0,0,0,0.62)';
const PAD = 10; // padding around the highlighted element
const MORPH_MS = 460; // spotlight/card morph duration
const CARD_BOTTOM_GAP = 100; // space kept above the floating nav for a bottom-anchored card

// The installed RN/React type combo degrades `Animated.View`'s props to `{}` (the
// same root as the environmental "View is not a valid JSX component" errors), so
// its `style` prop won't typecheck. Alias to a permissive component — runtime is
// unaffected; Metro/Babel strip types.
const AView = Animated.View as unknown as ComponentType<any>;

type Anchor = 'top' | 'bottom';
type Step = { img: number; title: string; body: string; anchor: Anchor };

const STEPS: Step[] = [
  { img: images.mascotWave, title: 'Hi! Welcome to Superkalan Gaz App', body: "I'm here to guide you in this app, let me show you some cool things here that will help you.", anchor: 'bottom' },
  { img: images.mascotRewards, title: 'Rewards & Points', body: 'You can view your accumulated points and claim awesome rewards from our Rewards Shop!', anchor: 'bottom' },
  { img: images.mascotRewards, title: 'Active Orders', body: 'Here you can see your active orders as of the moment. You can view it anytime.', anchor: 'bottom' },
  { img: images.mascotOrder, title: 'Ordering Again?', body: "Ordering again made easier! Just one click away and you're all set for another order.", anchor: 'bottom' },
  { img: images.mascotQuick, title: 'Quick Order', body: 'Quick orders can be viewed also here! You can choose from a wide variety of high-quality gas tanks.', anchor: 'bottom' },
  { img: images.mascotOrder, title: 'Navigate with Ease!', body: 'Our navigation bar gives everything you need from Rewards, checking your active and past orders and viewing your profile.', anchor: 'top' },
  { img: images.mascotWave, title: 'Need Help?', body: "Just click 'Guide' to see this app guide again if ever you feel lost.", anchor: 'top' },
];

export const GUIDE_STEP_COUNT = STEPS.length;

export function AppGuideOverlay({
  visible,
  step,
  rect,
  onNext,
  onBack,
  onClose,
}: {
  visible: boolean;
  step: number;
  rect: GuideRect | null;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [cardH, setCardH] = useState(200);
  const data = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  // Where the spotlight box + card should sit for the current step.
  const targets = () => {
    if (!rect) {
      const cardY = data.anchor === 'top' ? insets.top + 84 : height - insets.bottom - CARD_BOTTOM_GAP - cardH;
      // Collapse the box so the padded panels meet exactly (no leftover hole) →
      // a true full dim. `-PAD*2` cancels the PAD added back into the box edges.
      return { sx: width / 2, sy: height / 2, sw: -PAD * 2, sh: -PAD * 2, ring: 0, cardY };
    }
    const below = rect.y + rect.height + PAD + 16;
    const roomBelow = below + cardH + insets.bottom + CARD_BOTTOM_GAP <= height;
    const rawCardY = roomBelow ? below : rect.y - PAD - 16 - cardH;
    const cardY = clamp(rawCardY, insets.top + 8, height - cardH - insets.bottom - CARD_BOTTOM_GAP);
    return { sx: rect.x, sy: rect.y, sw: rect.width, sh: rect.height, ring: 1, cardY };
  };

  const t0 = targets();
  const sx = useRef(new Animated.Value(t0.sx)).current;
  const sy = useRef(new Animated.Value(t0.sy)).current;
  const sw = useRef(new Animated.Value(t0.sw)).current;
  const sh = useRef(new Animated.Value(t0.sh)).current;
  const ring = useRef(new Animated.Value(t0.ring)).current;
  const cardY = useRef(new Animated.Value(t0.cardY)).current;
  const opacity = useRef(new Animated.Value(0)).current; // card fly-in opacity
  const fly = useRef(new Animated.Value(0)).current; // card fly-in translateY
  const prevSig = useRef('');

  const sig = () => `${step}:${rect ? `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}` : 'null'}`;

  // Fly the card in ONCE whenever the guide (re)opens.
  useEffect(() => {
    if (!visible) {
      prevSig.current = '';
      return;
    }
    const t = targets();
    sx.setValue(t.sx); sy.setValue(t.sy); sw.setValue(t.sw); sh.setValue(t.sh);
    ring.setValue(t.ring); cardY.setValue(t.cardY);
    prevSig.current = sig();
    opacity.setValue(0);
    fly.setValue(30);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(fly, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Morph the spotlight + card on a real step/rect change; snap on a size-only
  // change (measured card height / rotation) so it never jitters.
  useEffect(() => {
    if (!visible) return;
    const t = targets();
    const s = sig();
    if (prevSig.current === s) {
      cardY.setValue(t.cardY);
      return;
    }
    prevSig.current = s;
    Animated.parallel([
      Animated.timing(sx, { toValue: t.sx, duration: MORPH_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(sy, { toValue: t.sy, duration: MORPH_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(sw, { toValue: t.sw, duration: MORPH_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(sh, { toValue: t.sh, duration: MORPH_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(ring, { toValue: t.ring, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(cardY, { toValue: t.cardY, duration: MORPH_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, rect, cardH, width, height, visible]);

  // Derived spotlight-box edges.
  const boxLeft = Animated.subtract(sx, PAD);
  const boxTop = Animated.subtract(sy, PAD);
  const boxW = Animated.add(sw, PAD * 2);
  const boxH = Animated.add(sh, PAD * 2);
  const boxRight = Animated.add(sx, Animated.add(sw, PAD));
  const boxBottom = Animated.add(sy, Animated.add(sh, PAD));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Four dark panels around the clear box */}
        <AView style={[styles.panel, { top: 0, left: 0, right: 0, height: boxTop }]} />
        <AView style={[styles.panel, { left: 0, right: 0, bottom: 0, top: boxBottom }]} />
        <AView style={[styles.panel, { top: boxTop, height: boxH, left: 0, width: boxLeft }]} />
        <AView style={[styles.panel, { top: boxTop, height: boxH, left: boxRight, right: 0 }]} />
        {/* Highlight ring */}
        <AView style={[styles.ring, { top: boxTop, left: boxLeft, width: boxW, height: boxH, opacity: ring }]} />

        {/* Card */}
        <AView style={[styles.cardWrap, { top: cardY, opacity, transform: [{ translateY: fly }] }]}>
          <Image source={data.img} style={styles.mascot} resizeMode="contain" />
          <View style={styles.card} onLayout={(e: LayoutChangeEvent) => setCardH(e.nativeEvent.layout.height)}>
            <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
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
                <Pressable style={styles.back} onPress={onBack}>
                  <Feather name="chevron-left" size={16} color={colors.label} />
                  <Text style={styles.backText}>BACK</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable style={styles.next} onPress={onNext}>
                <Text style={styles.nextText}>{isLast ? 'DONE' : 'NEXT'}</Text>
              </Pressable>
            </View>
          </View>
        </AView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: { position: 'absolute', backgroundColor: GUIDE_DARK },
  ring: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 12 },
  cardWrap: { position: 'absolute', left: 16, right: 16 },
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
