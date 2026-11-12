import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

export type MascotPose = 'thumbs-up' | 'celebrating' | 'wink-and-point' | 'thumbs-up-smile' | 'confident' | 'thinking' | 'sad';

const poses: Readonly<Partial<Record<MascotPose, string>>> = require('../../../assets/images/superkalan-gaz-mascot-sheet-png-traced.svg');

export const Mascot = memo(function Mascot({ pose, style }: {
  pose: MascotPose;
  style: StyleProp<ViewStyle>;
}) {
  // Fast Refresh can load a new pose name before Metro has rebuilt the sheet.
  const xml = poses[pose] ?? poses['thumbs-up'] ?? null;
  return (
    <View style={style} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={`mascot-${pose}`}>
      <SvgXml xml={xml} override={{ width: '100%', height: '100%', preserveAspectRatio: 'xMidYMid meet' }} />
    </View>
  );
});
