import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { PART_SIZE, PART_SRC, PartName } from './emberParts';

/** Ember, the coach — assembled, not drawn.
 *
 * Image models can't keep a character identical from one picture to the next, so Ember is a rig:
 * one generated body, with generated eyes, mouths, arms and legs placed on it (parts cut by
 * scripts/cut-rig.py, prompts in docs/ILLUSTRATION_STYLE.md). Every mood is the same body with a
 * different face, so Ember looks the same on every screen. Blinking swaps the eyes; the head bop
 * is a transform. All motion stops under Reduce Motion.
 *
 * On the dark theme Ember's black marker features would sink into the background, so it sits in a
 * soft glow of its own colour — a flame in the dark, which is what it is. */

type Recipe = {
  eyes: PartName;
  mouth: PartName;
  /** Worried Ember shrinks a little. */
  scale?: number;
};

const MOODS = {
  hello: { eyes: 'eyes-open', mouth: 'mouth-smile' },
  happy: { eyes: 'eyes-open', mouth: 'mouth-smile' },
  proud: { eyes: 'eyes-open', mouth: 'mouth-laugh' },
  laugh: { eyes: 'eyes-happy', mouth: 'mouth-laugh' },
  worried: { eyes: 'eyes-worried', mouth: 'mouth-frown', scale: 0.94 },
  sleepy: { eyes: 'eyes-sleepy', mouth: 'mouth-yawn' },
  determined: { eyes: 'eyes-determined', mouth: 'mouth-half' },
} satisfies Record<string, Recipe>;

export type EmberMood = keyof typeof MOODS;

/** Where the features sit on the body, as fractions of the body's width and height. */
const ANCHOR = {
  eyes: { x: 0.5, y: 0.6 },
  mouth: { x: 0.5, y: 0.71 },
};

const BODY = PART_SIZE.body;
const ASPECT = BODY.w / BODY.h;

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
    // Never wider than about two thirds of the space: a full-width flame stops reading as a character.
    const h = room ? Math.min(room.h, (room.w * 0.66) / ASPECT) : 0;
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
  const recipe: Recipe = MOODS[mood];
  const width = height * ASPECT;
  const s = height / BODY.h; // points per source pixel
  const [reduce, setReduce] = useState(false);
  const moving = !still && !reduce;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  // Head bop: a nod to one side and the other, with a small bounce on each, pivoting at the base.
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

  // Blink: open eyes swap to closed for 150 ms, at a slightly irregular interval. Only for moods
  // with plain open eyes; the others already have their own eye shape.
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (!moving || recipe.eyes !== 'eyes-open') return;
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
  }, [moving, recipe.eyes]);

  /** A part centred on an anchor, sized from its source pixels. */
  const place = (name: PartName, at: { x: number; y: number }, visible = true) => {
    const size = PART_SIZE[name];
    const w = size.w * s;
    const h = size.h * s;
    return (
      <Image
        key={name}
        source={PART_SRC[name]}
        style={{ position: 'absolute', left: at.x * width - w / 2, top: at.y * height - h / 2, width: w, height: h, opacity: visible ? 1 : 0 }}
        resizeMode="stretch"
        accessible={false}
      />
    );
  };

  const pivot = height / 2;
  const scale = recipe.scale ?? 1;

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
          transform: [
            { translateY: pivot },
            ...(moving
              ? [{ rotate: beat.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '2.5deg', '0deg', '-2.5deg', '0deg'] }) }]
              : []),
            { scale },
            { translateY: -pivot },
            ...(moving
              ? [{ translateY: beat.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -height * 0.025, 0, -height * 0.025, 0] }) }]
              : []),
          ],
        }}
      >
        <Image source={PART_SRC.body} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="stretch" accessible={false} />
        {/* Both eye states are always mounted and swapped by opacity, so a blink is instant. */}
        {place(recipe.eyes, ANCHOR.eyes, !blinking)}
        {recipe.eyes === 'eyes-open' && place('eyes-blink', ANCHOR.eyes, blinking)}
        {place(recipe.mouth, ANCHOR.mouth)}
      </Animated.View>
    </View>
  );
}
