import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, ImageSourcePropType, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme';

/** Ember, the coach, in one of its moods — and alive: it bops, blinks and waves.
 *
 * The art is generated from docs/ILLUSTRATION_STYLE.md and keyed onto transparency with
 * scripts/key-illustration.py. On the dark theme Ember's black marker arms and legs would vanish,
 * so it sits in a soft glow of its own colour — a flame in the dark, which is what it is.
 *
 * Motion: the head bop is a transform, so every pose has it. Blinking and waving are frame swaps,
 * so they only happen for poses that have those frames (batch B in the illustration doc); add a
 * frame to BLINK or WAVE below and the pose picks it up. All of it stops under Reduce Motion. */
const POSES = {
  happy: require('../../assets/illustrations/ember-happy.png'),
  proud: require('../../assets/illustrations/ember-proud.png'),
  worried: require('../../assets/illustrations/ember-worried.png'),
  sleepy: require('../../assets/illustrations/ember-sleepy.png'),
  determined: require('../../assets/illustrations/ember-determined.png'),
  laugh: require('../../assets/illustrations/ember-laugh.png'),
  hello: require('../../assets/illustrations/ember-hello.png'),
} as const;

export type EmberMood = keyof typeof POSES;

/** Closed-eye frames, swapped in for a moment every few seconds. */
const BLINK: Partial<Record<EmberMood, ImageSourcePropType>> = {};
/** A second arm position, alternated with the pose to make a wave. */
const WAVE: Partial<Record<EmberMood, ImageSourcePropType>> = {};

const aspect = (m: EmberMood) => {
  const { width, height } = Image.resolveAssetSource(POSES[m]) ?? {};
  // Metro knows each image's size; if it ever doesn't, Ember's usual proportions are close enough.
  return width && height ? width / height : 0.72;
};

export function Ember({
  mood = 'happy',
  height,
  fill,
  still,
  style,
}: {
  mood?: EmberMood;
  /** A fixed height. Or pass `fill` to take all the room the parent gives it. */
  height?: number;
  fill?: boolean;
  /** No motion, for small repeated uses where a bopping crowd would be noise. */
  still?: boolean;
  style?: ViewStyle;
}) {
  const [room, setRoom] = useState<{ w: number; h: number } | null>(null);
  if (fill) {
    const h = room ? Math.min(room.h, room.w / aspect(mood)) : 0;
    return (
      <View
        style={[{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }, style]}
        onLayout={(e) => setRoom({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {h > 0 && <Figure mood={mood} height={h} still={still} />}
      </View>
    );
  }
  return <Figure mood={mood} height={height ?? 120} still={still} style={style} />;
}

function Figure({ mood, height, still, style }: { mood: EmberMood; height: number; still?: boolean; style?: ViewStyle }) {
  const t = useTheme();
  const width = height * aspect(mood);
  const [reduce, setReduce] = useState(false);
  const moving = !still && !reduce;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  // Head bop: a nod to one side and the other, with a small bounce on each, pivoting at the feet.
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!moving) return;
    const loop = Animated.loop(
      Animated.timing(beat, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    );
    beat.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [moving, beat]);

  // Blink: closed eyes for 150 ms, at a slightly irregular interval so it doesn't feel mechanical.
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (!moving || !BLINK[mood]) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlinking(true);
        timer = setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 150);
      }, 2400 + Math.random() * 2600);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [moving, mood]);

  // Wave: four quick swings, then a rest, then again.
  const [waveUp, setWaveUp] = useState(false);
  useEffect(() => {
    if (!moving || !WAVE[mood]) return;
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      n += 1;
      setWaveUp(n % 2 === 1);
      timer = setTimeout(tick, n % 8 === 0 ? 2600 : 260);
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [moving, mood]);

  const frame = blinking ? BLINK[mood] : waveUp ? WAVE[mood] : undefined;
  const pivot = height / 2; // rotate around the feet, not the middle

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
      <Animated.View
        style={{
          width,
          height,
          transform: moving
            ? [
                { translateY: pivot },
                { rotate: beat.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '2.5deg', '0deg', '-2.5deg', '0deg'] }) },
                { translateY: -pivot },
                { translateY: beat.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -height * 0.025, 0, -height * 0.025, 0] }) },
              ]
            : [],
        }}
      >
        {/* The pose, with any animation frame stacked on top and shown by opacity, so a swap is
            instant rather than waiting on an image load. */}
        <Image source={POSES[mood]} style={{ position: 'absolute', width, height, opacity: frame ? 0 : 1 }} resizeMode="contain" accessible={false} />
        {BLINK[mood] && (
          <Image source={BLINK[mood]!} style={{ position: 'absolute', width, height, opacity: blinking ? 1 : 0 }} resizeMode="contain" accessible={false} />
        )}
        {WAVE[mood] && (
          <Image
            source={WAVE[mood]!}
            style={{ position: 'absolute', width, height, opacity: !blinking && waveUp ? 1 : 0 }}
            resizeMode="contain"
            accessible={false}
          />
        )}
      </Animated.View>
    </View>
  );
}
