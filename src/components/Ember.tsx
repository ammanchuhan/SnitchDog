import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import { PART_SIZE, PART_SRC, PartName } from './emberParts';

/** Ember, the coach — assembled, not drawn.
 *
 * Image models can't keep a character identical from one picture to the next, so Ember is a rig:
 * one generated body, with generated eyes, mouths and arms placed on it (parts cut by
 * scripts/cut-rig.py, prompts in docs/ILLUSTRATION_STYLE.md). Every mood is the same body with a
 * different face and arms, so Ember looks the same on every screen. Blinking swaps the eyes; the
 * wave rotates the arm at the shoulder; a single head bop greets each new mood. All motion stops under Reduce Motion.
 *
 * On the dark theme Ember's black marker features would sink into the background, so it sits in a
 * soft glow of its own colour — a flame in the dark, which is what it is. */

type Arm = { part: PartName; flip?: boolean };

type Recipe = {
  eyes: PartName;
  mouth: PartName;
  /** Screen-left and screen-right arms. The art is drawn for one side; `flip` mirrors it. */
  arms: [Arm, Arm];
  /** Worried Ember shrinks a little. */
  scale?: number;
};

const DOWN: [Arm, Arm] = [{ part: 'arm-down' }, { part: 'arm-down', flip: true }];
const UP: [Arm, Arm] = [{ part: 'arm-up', flip: true }, { part: 'arm-up' }];

const MOODS = {
  hello: { eyes: 'eyes-open', mouth: 'mouth-smile', arms: [{ part: 'arm-down' }, { part: 'arm-wave' }] },
  happy: { eyes: 'eyes-open', mouth: 'mouth-smile', arms: DOWN },
  proud: { eyes: 'eyes-open', mouth: 'mouth-laugh', arms: UP },
  laugh: { eyes: 'eyes-happy', mouth: 'mouth-laugh', arms: UP },
  worried: { eyes: 'eyes-worried', mouth: 'mouth-frown', arms: DOWN, scale: 0.94 },
  sleepy: { eyes: 'eyes-sleepy', mouth: 'mouth-yawn', arms: DOWN },
  determined: { eyes: 'eyes-determined', mouth: 'mouth-half', arms: [{ part: 'arm-hip' }, { part: 'arm-hip', flip: true }] },
} satisfies Record<string, Recipe>;

export type EmberMood = keyof typeof MOODS;

/** Where things sit on the body, as fractions of the body's width and height. */
const ANCHOR = {
  eyes: { x: 0.5, y: 0.6 },
  mouth: { x: 0.5, y: 0.71 },
  shoulders: [{ x: 0.06, y: 0.66 }, { x: 0.94, y: 0.66 }],
};
/** The limb sheet was drawn a little large for the body. */
const LIMB_SCALE = 0.85;

const BODY = PART_SIZE.body;
/** The canvas leaves room around the body for arms thrown out and arms hanging below. */
const CANVAS = { w: BODY.w * 1.9, h: BODY.h * 1.1 };
const BODY_AT = { x: (CANVAS.w - BODY.w) / 2, y: 0 };
const ASPECT = CANVAS.w / CANVAS.h;

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
    const h = room ? Math.min(room.h, room.w / ASPECT) : 0;
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
  const s = height / CANVAS.h; // points per source pixel
  const bodyW = BODY.w * s;
  const bodyH = BODY.h * s;
  const bodyX = BODY_AT.x * s;
  const bodyY = BODY_AT.y * s;
  const [reduce, setReduce] = useState(false);
  const moving = !still && !reduce;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  // Head bop: one nod to each side with a small bounce, pivoting at the base — once, when Ember
  // appears or its mood changes, like a reaction. Continuous bopping was distracting.
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!moving) return;
    beat.setValue(0);
    const once = Animated.timing(beat, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
    once.start();
    return () => once.stop();
  }, [moving, mood, beat]);

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

  // Wave: the raised arm swings at the shoulder, a few quick swings then a rest.
  const swing = useRef(new Animated.Value(0)).current;
  const waving = recipe.arms.some((a) => a.part === 'arm-wave');
  useEffect(() => {
    if (!moving || !waving) return;
    const one = (to: number) => Animated.timing(swing, { toValue: to, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([one(1), one(-0.4), one(1), one(-0.4), one(0), Animated.delay(1800)]));
    loop.start();
    return () => loop.stop();
  }, [moving, waving, swing]);

  /** A feature centred on an anchor on the body, sized from its source pixels. */
  const place = (name: PartName, at: { x: number; y: number }, visible = true, scale = 1) => {
    const size = PART_SIZE[name];
    const w = size.w * s * scale;
    const h = size.h * s * scale;
    return (
      <Image
        key={name}
        source={PART_SRC[name]}
        style={{ position: 'absolute', left: bodyX + at.x * bodyW - w / 2, top: bodyY + at.y * bodyH - h / 2, width: w, height: h, opacity: visible ? 1 : 0 }}
        resizeMode="stretch"
        accessible={false}
      />
    );
  };

  /** An arm hung from its shoulder by its pivot, rotating around that pivot when it waves. */
  const arm = ({ part, flip }: Arm, side: 0 | 1) => {
    const size = PART_SIZE[part] as { w: number; h: number; pivot: { x: number; y: number } };
    const w = size.w * LIMB_SCALE * s;
    const h = size.h * LIMB_SCALE * s;
    const px = (flip ? size.w - size.pivot.x : size.pivot.x) * LIMB_SCALE * s;
    const py = size.pivot.y * LIMB_SCALE * s;
    const at = ANCHOR.shoulders[side];
    const rotate =
      part === 'arm-wave' && moving
        ? [{ rotate: swing.interpolate({ inputRange: [-1, 1], outputRange: ['14deg', '-14deg'] }) }]
        : [];
    return (
      <Animated.View
        key={`${part}-${side}`}
        style={{
          position: 'absolute',
          left: bodyX + at.x * bodyW - px,
          top: bodyY + at.y * bodyH - py,
          width: w,
          height: h,
          // Rotate around the shoulder: move the pivot to the centre, rotate, move it back.
          transform: [{ translateX: px - w / 2 }, { translateY: py - h / 2 }, ...rotate, { translateX: w / 2 - px }, { translateY: h / 2 - py }],
        }}
      >
        <Image source={PART_SRC[part]} style={{ width: w, height: h, transform: flip ? [{ scaleX: -1 }] : [] }} resizeMode="stretch" accessible={false} />
      </Animated.View>
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
        {/* Arms first, so the body covers the shoulder ends. */}
        {arm(recipe.arms[0], 0)}
        {arm(recipe.arms[1], 1)}
        <Image source={PART_SRC.body} style={{ position: 'absolute', left: bodyX, top: bodyY, width: bodyW, height: bodyH }} resizeMode="stretch" accessible={false} />
        {/* Both eye states are always mounted and swapped by opacity, so a blink is instant. */}
        {place(recipe.eyes, ANCHOR.eyes, !blinking)}
        {/* The closed eyes are drawn a touch wide on the sheet; smaller reads as a blink, not a squint. */}
        {recipe.eyes === 'eyes-open' && place('eyes-blink', ANCHOR.eyes, blinking, 0.75)}
        {place(recipe.mouth, ANCHOR.mouth)}
      </Animated.View>
    </View>
  );
}
