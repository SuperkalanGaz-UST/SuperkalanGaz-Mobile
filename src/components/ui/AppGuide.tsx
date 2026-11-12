import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewInstance,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { Mascot, type MascotPose } from './Mascot';

export type GuideRect = { x: number; y: number; width: number; height: number };
type GuideTarget = 'rewards' | 'active-orders' | 'reorder' | 'quick' | 'nav' | 'help';
export type GuideSpotlight = GuideRect & { target: GuideTarget };

type Step = { pose: MascotPose; title: string; body: string; target: GuideTarget | null };
export const GUIDE_STEPS: readonly Step[] = [
  { pose: 'thumbs-up', title: 'Hi! Welcome to Superkalan Gaz App', body: "I'm here to guide you in this app, let me show you some cool things here that will help you.", target: null },
  { pose: 'celebrating', title: 'Loyalty Rewards', body: 'Track your current loyalty progress and open the rewards available for your account type.', target: 'rewards' },
  { pose: 'wink-and-point', title: 'Active Orders', body: 'Open History and choose Active Orders to check the status of your current deliveries.', target: 'active-orders' },
  { pose: 'thumbs-up-smile', title: 'Ordering Again?', body: 'Choose a cylinder from Order again to start a new order.', target: 'reorder' },
  { pose: 'confident', title: 'Quick Order', body: 'Quick orders can be viewed also here! You can choose from a wide variety of high-quality gas tanks.', target: 'quick' },
  { pose: 'wink-and-point', title: 'Navigate with Ease!', body: 'Use the bar to open Home, Rewards, Order, History, or More.', target: 'nav' },
  { pose: 'thinking', title: 'Need Help?', body: 'Tap the question mark on Home or open More → App Guide to revisit this tour.', target: 'help' },
];

const PAD = 6;
const GAP = 16;
const MASCOT_RISE = 100;
export const GUIDE_TRANSITION_DURATION = 310;
const CONTENT_TRANSITION_DURATION = 180;
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function AppGuideOverlay({ visible, step, rect, pageReady, reduceMotion, onNext, onBack, onClose }: {
  visible: boolean;
  step: number;
  rect: GuideSpotlight | null;
  pageReady: boolean;
  reduceMotion: boolean;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const overlayRef = useRef<ViewInstance>(null);
  const [viewport, setViewport] = useState<GuideRect | null>(null);
  const [cardHeight, setCardHeight] = useState(190);
  const [content, setContent] = useState<{ step: number; visible: boolean; previous: number | null }>({ step, visible, previous: null });
  const [contentProgress] = useState(() => new Animated.Value(1));
  const revealNewPage = useRef(false);
  const [spotlight] = useState(() => ({
    x: new Animated.Value(0), y: new Animated.Value(0),
    width: new Animated.Value(0), height: new Animated.Value(0), opacity: new Animated.Value(0),
  }));
  if (content.step !== step || content.visible !== visible) {
    setContent({ step, visible, previous: content.visible && visible && !reduceMotion ? content.step : null });
  }
  const data = GUIDE_STEPS[step] ?? GUIDE_STEPS[0];
  const previous = visible && !reduceMotion && content.previous !== null ? GUIDE_STEPS[content.previous] : null;
  const outgoingOpacity = contentProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const { width, height, x, y } = viewport ?? { width: window.width, height: window.height, x: 0, y: 0 };
  const safeTop = Math.max(0, insets.top - y);
  const safeBottom = Math.min(height, window.height - insets.bottom - y);
  const left = rect ? Math.max(2, rect.x - x - PAD) : width / 2;
  const top = rect ? Math.max(safeTop + 2, rect.y - y - PAD) : height / 2;
  const right = rect ? Math.min(width - 2, rect.x - x + rect.width + PAD) : left;
  const bottom = rect ? Math.min(safeBottom, height - 2, rect.y - y + rect.height + PAD) : top;

  const minCardY = safeTop + GAP + MASCOT_RISE;
  const maxCardY = safeBottom - GAP - cardHeight;
  const defaultCardY = safeBottom - 100 - cardHeight;
  const cardY = Math.max(minCardY, Math.min(maxCardY, rect?.target === 'nav'
    ? Math.min(defaultCardY, top - GAP - cardHeight)
    : Math.max(defaultCardY, rect ? bottom + GAP + MASCOT_RISE : minCardY)));
  // Reserve room for the whole card and its mascot. On short screens the hole
  // may show only the leading part of a tall target, keeping the controls clear.
  const holeTop = rect?.target === 'nav' ? Math.max(top, cardY + cardHeight + GAP) : top;
  const holeBottom = rect?.target === 'nav' ? bottom : Math.min(bottom, cardY - MASCOT_RISE - GAP);
  const holeWidth = Math.max(0, right - left);
  const holeHeight = Math.max(0, holeBottom - holeTop);
  const hasHole = rect !== null && holeWidth > 0 && holeHeight > 0;
  const [cardTop] = useState(() => new Animated.Value(cardY));
  const copyHeight = Math.min(height < 550 ? 80 : 112, Math.max(48, safeBottom - minCardY - 138));
  const duration = visible && !reduceMotion ? GUIDE_TRANSITION_DURATION : 0;

  useLayoutEffect(() => {
    if (!previous) {
      contentProgress.setValue(1);
      return;
    }
    contentProgress.setValue(0);
    const fade = Animated.timing(contentProgress, {
      toValue: 1, duration: CONTENT_TRANSITION_DURATION, easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true, isInteraction: false,
    });
    fade.start(({ finished }) => {
      if (finished) setContent(current => current.step === step ? { ...current, previous: null } : current);
    });
    return () => fade.stop();
  }, [contentProgress, previous, step]);

  useEffect(() => {
    if (!pageReady && duration > 0) return;
    const move = Animated.timing(cardTop, {
      toValue: cardY, duration, easing: Easing.inOut(Easing.cubic), useNativeDriver: false, isInteraction: false,
    });
    move.start();
    return () => move.stop();
  }, [cardTop, cardY, duration, pageReady]);

  useEffect(() => {
    const timing = (value: Animated.Value, toValue: number, ms = duration) => Animated.timing(value, {
      toValue, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: false, isInteraction: false,
    });
    if (!pageReady && duration > 0) {
      revealNewPage.current = true;
      const hide = timing(spotlight.opacity, 0, duration / 2);
      hide.start();
      return () => hide.stop();
    }

    if (revealNewPage.current && duration > 0) {
      if (!hasHole) return;
      // The old cutout is hidden while its geometry moves to the new page.
      spotlight.x.setValue(left);
      spotlight.y.setValue(holeTop);
      spotlight.width.setValue(holeWidth);
      spotlight.height.setValue(holeHeight);
      revealNewPage.current = false;
      const reveal = timing(spotlight.opacity, 1, duration / 2);
      reveal.start();
      return () => reveal.stop();
    }

    revealNewPage.current = false;
    const animation = Animated.parallel([
      timing(spotlight.x, hasHole ? left : width / 2),
      timing(spotlight.y, hasHole ? holeTop : height / 2),
      timing(spotlight.width, hasHole ? holeWidth : 0),
      timing(spotlight.height, hasHole ? holeHeight : 0),
      timing(spotlight.opacity, hasHole ? 1 : 0),
    ]);
    animation.start();
    return () => animation.stop();
  }, [duration, hasHole, height, holeHeight, holeTop, holeWidth, left, pageReady, spotlight, width]);

  return (
    <Modal visible={visible} transparent statusBarTranslucent navigationBarTranslucent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <View ref={overlayRef} style={styles.root} onLayout={() => {
        overlayRef.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) setViewport({ x, y, width, height });
        });
      }}>
        <Svg width="100%" height="100%" pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="app-guide-cutout" x="0" y="0" width="100%" height="100%" maskUnits="userSpaceOnUse">
              <Rect width="100%" height="100%" fill="white" />
              <AnimatedRect x={spotlight.x} y={spotlight.y} width={spotlight.width} height={spotlight.height} rx={12} fill="black" opacity={spotlight.opacity} />
            </Mask>
          </Defs>
          <Rect width="100%" height="100%" fill="rgba(0,0,0,0.62)" mask="url(#app-guide-cutout)" />
          <AnimatedRect testID="app-guide-spotlight" x={spotlight.x} y={spotlight.y} width={spotlight.width} height={spotlight.height} rx={12} fill="none" stroke="white" strokeWidth={2} opacity={spotlight.opacity} />
        </Svg>

        <Animated.View testID="app-guide-card" accessibilityViewIsModal style={[styles.cardWrap, { top: cardTop }]}>
          {previous && previous.pose !== data.pose && (
            <Animated.View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.mascot, { opacity: outgoingOpacity }]}>
              <Mascot pose={previous.pose} style={styles.mascotImage} />
            </Animated.View>
          )}
          <Animated.View pointerEvents="none" style={[styles.mascot, { opacity: previous?.pose === data.pose ? 1 : contentProgress }]}>
            <Mascot pose={data.pose} style={styles.mascotImage} />
          </Animated.View>
          <View style={styles.card} onLayout={event => setCardHeight(event.nativeEvent.layout.height)}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close guide" style={styles.close} onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={colors.grayText} />
            </Pressable>
            <View style={styles.dots} accessible accessibilityLabel={`Step ${step + 1} of ${GUIDE_STEPS.length}`}>
              {GUIDE_STEPS.map(({ title }, i) => (
                <View key={title} style={[styles.dot, i === step && styles.dotActive]} />
              ))}
            </View>
            <View style={{ height: copyHeight }}>
              {(previous ? [previous, data] : [data]).map(layer => {
                const outgoing = layer !== data;
                return (
                  <Animated.View
                    key={layer.title}
                    style={[StyleSheet.absoluteFill, { opacity: outgoing ? outgoingOpacity : contentProgress }]}
                    pointerEvents={outgoing ? 'none' : 'auto'}
                    aria-hidden={outgoing}
                    accessibilityElementsHidden={outgoing}
                    importantForAccessibility={outgoing ? 'no-hide-descendants' : 'auto'}
                  >
                    <ScrollView>
                      <Text accessibilityRole="header" accessibilityLiveRegion={outgoing ? 'none' : 'polite'} style={styles.title}>{layer.title}</Text>
                      <Text style={styles.body}>{layer.body}</Text>
                    </ScrollView>
                  </Animated.View>
                );
              })}
            </View>
            <View style={styles.actions}>
              {step > 0 ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.back} onPress={onBack}>
                  <Feather name="chevron-left" size={16} color={colors.label} />
                  <Text style={styles.backText}>BACK</Text>
                </Pressable>
              ) : <View />}
              <Pressable accessibilityRole="button" style={styles.next} onPress={onNext}>
                <Text style={styles.nextText}>{step === GUIDE_STEPS.length - 1 ? 'DONE' : 'NEXT'}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cardWrap: { position: 'absolute', left: 16, right: 16 },
  mascot: { position: 'absolute', top: -MASCOT_RISE, alignSelf: 'center', width: 110, height: 120, zIndex: 1 },
  mascotImage: { width: '100%', height: '100%' },
  card: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 20 },
  close: { position: 'absolute', top: 12, right: 16, zIndex: 2 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 16, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d9d9d9' },
  dotActive: { width: 28, backgroundColor: colors.primary },
  title: { fontFamily: fonts.bold, fontSize: 17, color: colors.label, marginBottom: 8 },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.grayText, lineHeight: 20 },
  actions: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontFamily: fonts.medium, fontSize: 13, color: colors.label },
  next: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8 },
  nextText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
});
