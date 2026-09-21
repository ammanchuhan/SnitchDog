import { Image, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme';

/** Ember, the coach, in one of its moods.
 *
 * The poses are cut from the model sheet (docs/ILLUSTRATION_STYLE.md) and keyed onto
 * transparency. On the dark theme Ember's black marker arms and legs would vanish, so it sits in
 * a soft glow of its own colour — a flame in the dark, which is what it is. */
const POSES = {
  happy: require('../../assets/illustrations/ember-happy.png'),
  proud: require('../../assets/illustrations/ember-proud.png'),
  worried: require('../../assets/illustrations/ember-worried.png'),
  sleepy: require('../../assets/illustrations/ember-sleepy.png'),
  determined: require('../../assets/illustrations/ember-determined.png'),
  laugh: require('../../assets/illustrations/ember-laugh.png'),
  front: require('../../assets/illustrations/ember-front.png'),
} as const;

/** Width ÷ height of each pose, from the keyed files, so every size keeps its shape. */
const ASPECT: Record<EmberMood, number> = {
  happy: 322 / 452,
  proud: 374 / 455,
  worried: 329 / 454,
  sleepy: 405 / 452,
  determined: 325 / 449,
  laugh: 406 / 449,
  front: 519 / 733,
};

export type EmberMood = keyof typeof POSES;

export function Ember({ mood = 'happy', height, style }: { mood?: EmberMood; height: number; style?: ViewStyle }) {
  const t = useTheme();
  const width = height * ASPECT[mood];
  return (
    <View style={[{ width, height, alignItems: 'center', justifyContent: 'center' }, style]}>
      {t.scheme === 'dark' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: height * 1.05,
            height: height * 1.05,
            borderRadius: height,
            backgroundColor: t.ember,
            opacity: 0.16,
            shadowColor: t.ember,
            shadowOpacity: 0.9,
            shadowRadius: height * 0.35,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      )}
      <Image
        source={POSES[mood]}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    </View>
  );
}
