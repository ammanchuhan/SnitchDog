import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme';

/** Snitch, cut from the model sheet (scripts/cut-sheet.py). One picture per mood for now; more
 *  poses (curls, chest press, running) come later and slot in here (VIS-2). */
const ART = {
  stand: require('../../assets/snitch/stand.png'),
  turn: require('../../assets/snitch/stand-turn.png'),
  side: require('../../assets/snitch/side.png'),
  flex: require('../../assets/snitch/flex.png'),
  happy: require('../../assets/snitch/face-happy.png'),
  grin: require('../../assets/snitch/face-grin.png'),
  worried: require('../../assets/snitch/face-worried.png'),
  sly: require('../../assets/snitch/face-sly.png'),
};

/** Width over height of each cut, so a picture can be sized from its height alone. */
const ASPECT: Record<keyof typeof ART, number> = {
  stand: 133 / 220,
  turn: 123 / 220,
  side: 121 / 220,
  flex: 171 / 220,
  happy: 73 / 96,
  grin: 74 / 96,
  worried: 141 / 96,
  sly: 81 / 96,
};

export type SnitchMood =
  | 'hello' // turned towards you: sign-up, sign-in
  | 'ready' // square on: waiting for something
  | 'proud' // flexing: a verified workout, a kept week
  | 'calm' // side on, looking ahead: nothing due
  | 'happy'
  | 'grin'
  | 'worried' // the week is at risk
  | 'sly'; // a witness is about to hear

const PICTURE: Record<SnitchMood, keyof typeof ART> = {
  hello: 'turn',
  ready: 'stand',
  proud: 'flex',
  calm: 'side',
  happy: 'happy',
  grin: 'grin',
  worried: 'worried',
  sly: 'sly',
};

const LABEL: Record<SnitchMood, string> = {
  hello: 'Snitch, turned towards you',
  ready: 'Snitch, standing ready',
  proud: 'Snitch, flexing',
  calm: 'Snitch, looking ahead',
  happy: 'Snitch, tongue out',
  grin: 'Snitch, grinning',
  worried: 'Snitch, looking worried',
  sly: 'Snitch, with a sly look',
};

/** Snitch, at a given height. Pops in when the mood changes, unless Reduce Motion is on. */
export function Snitch({ mood, height, style }: { mood: SnitchMood; height: number; style?: StyleProp<ViewStyle> }) {
  const pop = useRef(new Animated.Value(0)).current;
  const art = PICTURE[mood];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((still) => {
      if (still) return pop.setValue(1);
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
    });
  }, [art, pop]);

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={LABEL[mood]}
      style={[
        {
          alignSelf: 'center',
          opacity: pop,
          transform: [
            { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
          ],
        },
        style,
      ]}
    >
      <Image source={ART[art]} style={{ height, width: height * ASPECT[art] }} resizeMode="contain" />
    </Animated.View>
  );
}

/** Snitch's face in a circle, like a contact photo, beside every message in chat (VIS-3). */
export function SnitchAvatar({ size = 32, mood = 'happy', style }: { size?: number; mood?: 'happy' | 'grin' | 'worried' | 'sly'; style?: StyleProp<ImageStyle> }) {
  const t = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: t.claySoft,
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <Image source={ART[mood]} style={[{ height: size * 1.05, width: size * 1.05 * ASPECT[mood], marginBottom: -size * 0.12 }, style]} resizeMode="contain" />
    </View>
  );
}
