import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { orderProgress } from '@/lib/orderProgress';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

const HOME_LABELS = ['Confirmed', 'On the way', 'Delivered'];
const STATUS_LABELS = ['Order Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

function ProgressLine({ fill, sweep, moving, green, gray, style }: {
  fill: Animated.AnimatedInterpolation<number>;
  sweep: Animated.Value;
  moving: boolean;
  green: string;
  gray: string;
  style: StyleProp<ViewStyle>;
}) {
  const [width, setWidth] = useState(0);
  const translation = { inputRange: [0, 1], outputRange: [-width / 2, 0] };
  return (
    <View style={[style, { backgroundColor: gray, overflow: 'hidden' }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && <Animated.View style={[styles.fill, {
        width, backgroundColor: green, transform: [{ translateX: fill.interpolate(translation) }, { scaleX: fill }],
      }]} />}
      {width > 0 && moving && <Animated.View style={[styles.fill, {
        width, backgroundColor: green, transform: [{ translateX: sweep.interpolate(translation) }, { scaleX: sweep }],
        opacity: sweep.interpolate({ inputRange: [0, 0.04, 0.87, 1], outputRange: [0, 1, 1, 0] }),
      }]} />}
    </View>
  );
}

/** Shared milestone state and animation for the home and tracking screens. */
export function OrderProgressTracker({ status, variant = 'home', active = true }: {
  status: string;
  variant?: 'home' | 'status';
  active?: boolean;
}) {
  const milestone = orderProgress(status);
  const labels = variant === 'home' ? HOME_LABELS : STATUS_LABELS;
  const current = variant === 'home' ? [0, 0, 1, 2][milestone.step] : milestone.step;
  const target = current / (labels.length - 1);
  const [fill] = useState(() => new Animated.Value(target));
  const [sweep] = useState(() => new Animated.Value(0));
  // Start static until the OS preference is known, avoiding a motion flash.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [foreground, setForeground] = useState(!AppState.currentState || AppState.currentState === 'active');

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const state = AppState.addEventListener('change', (next) => setForeground(next === 'active'));
    return () => { mounted = false; motion.remove(); state.remove(); };
  }, []);

  const moving = active && foreground && !reduceMotion && !milestone.complete
    && !['cancelled', 'under review'].includes(status.trim().toLowerCase());

  useEffect(() => {
    fill.stopAnimation();
    sweep.stopAnimation();
    sweep.setValue(0);
    if (!active || !foreground || reduceMotion) {
      fill.setValue(target);
      return;
    }
    const advance = Animated.timing(fill, {
      toValue: target, duration: 500, easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true, isInteraction: false,
    });
    const loop = Animated.loop(Animated.timing(sweep, {
      toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease),
      useNativeDriver: true, isInteraction: false,
    }));
    advance.start(({ finished }) => { if (finished && moving) loop.start(); });
    return () => { advance.stop(); loop.stop(); fill.stopAnimation(); sweep.stopAnimation(); };
  }, [active, foreground, reduceMotion, target, moving, fill, sweep]);

  const line = (index: number, green: string, gray: string, style: StyleProp<ViewStyle>) => (
    <ProgressLine
      key={labels[index]}
      fill={fill.interpolate({ inputRange: [index / (labels.length - 1), (index + 1) / (labels.length - 1)], outputRange: [0, 1], extrapolate: 'clamp' })}
      sweep={sweep} moving={moving && index === current}
      green={green} gray={gray} style={style}
    />
  );

  if (variant === 'home') {
    return (
      <View>
        <View style={styles.timeline}>
          <View style={styles.homeLines}>
            {line(0, colors.success, colors.cardBorder, styles.homeSegment)}
            {line(1, colors.success, colors.cardBorder, styles.homeSegment)}
          </View>
          {labels.map((label, index) => (
            <View key={label} style={[
              styles.timelineDot,
              index === 0 ? styles.dotStart : index === 1 ? styles.dotMiddle : styles.dotEnd,
              index < current || milestone.complete ? styles.dotCompleted : index === current ? styles.dotCurrent : styles.dotUpcoming,
            ]} />
          ))}
        </View>
        <View style={styles.timelineLabels}>
          {labels.map((label, index) => <Text key={label} style={[styles.timelineLabel, index > current && styles.labelMuted]}>{label}</Text>)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stepper}>
      <View style={styles.statusLines}>
        {labels.slice(1).map((_, index) => line(index, colors.greenBright, colors.stepIdle, styles.stepLine))}
      </View>
      {labels.map((label, index) => {
        const completed = index < current || milestone.complete;
        const selected = index === current && !milestone.complete;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.stepNode, {
              backgroundColor: completed ? colors.greenBright : '#fff',
              borderColor: completed ? colors.greenBright : selected ? '#8db5f6' : colors.stepIdle,
            }]}>
              {completed ? <Feather name="check" size={16} color="#fff" /> : <View style={[styles.stepDot, {
                backgroundColor: selected ? colors.greenBright : '#fff', borderColor: selected ? colors.greenBright : colors.stepIdle,
              }]} />}
            </View>
            <Text style={[styles.stepLabel, { color: selected ? '#143263' : '#8a8f99' }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  timeline: { height: 18, marginHorizontal: 12, marginTop: 6, justifyContent: 'center' },
  homeLines: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, overflow: 'hidden', flexDirection: 'row' },
  homeSegment: { flex: 1, height: 3 },
  timelineDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, top: 3, borderWidth: 3, backgroundColor: '#fff' },
  dotStart: { left: -1 }, dotMiddle: { left: '48%' }, dotEnd: { right: -1 },
  dotCompleted: { borderColor: colors.success, backgroundColor: colors.success },
  dotCurrent: { borderColor: '#BDE8D8', backgroundColor: colors.success },
  dotUpcoming: { borderColor: colors.cardBorder, backgroundColor: '#fff' },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  timelineLabel: { fontFamily: fonts.medium, fontSize: 10, color: colors.heading },
  labelMuted: { color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'flex-start' },
  // Start and end at the centers of the first and last of four equal columns.
  statusLines: { position: 'absolute', top: 17, left: '12.5%', right: '12.5%', flexDirection: 'row' },
  step: { flex: 1, minWidth: 0, paddingHorizontal: 2, alignItems: 'center' },
  stepNode: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  stepLine: { flex: 1, height: 2 },
  stepLabel: { alignSelf: 'stretch', marginTop: 6, fontFamily: fonts.semibold, fontSize: 11, textAlign: 'center', lineHeight: 16, includeFontPadding: false },
});
