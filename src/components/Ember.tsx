import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, View, ViewStyle } from 'react-native';

import { useTheme } from '../theme';
import LAYOUT from './emberLayout.json';
import { PART_SIZE, PART_SRC, PartName } from './emberParts';

/** Ember, the coach — assembled, not drawn.
 *
 * Image models can't keep a character identical from one picture to the next, so Ember is a rig:
 * one generated body, with generated eyes, mouths, arms and legs placed on it (parts cut by
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

/** Shoulders, as fractions of the body's width and height. */
const ANCHOR = { shoulders: LAYOUT.shoulders };
/** The limb sheet was drawn a little large for the body. */
const LIMB_SCALE = LAYOUT.limbScale;

// Warm the image cache with every part as soon as Ember is first imported, so a new mood's eyes or
// arms are already decoded by the time they're needed.
for (const src of Object.values(PART_SRC)) {
  const { uri } = Image.resolveAssetSource(src) ?? {};
  if (uri?.startsWith('http')) Image.prefetch(uri).catch(() => {});
}

const BODY = PART_SIZE.body;
/** The canvas leaves room around the body for arms thrown out and arms hanging below. */
const CANVAS = { w: BODY.w * LAYOUT.canvas.w, h: BODY.h * LAYOUT.canvas.h };
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

  /** A face feature, aligned by its ink rather than its box: eyes sit on a line by their bottom
   *  edge, mouths hang from a line by their top edge, so a tall laughing mouth grows downward
   *  instead of into the eyes. Sizes and lines come from emberLayout.json, which the proof
   *  sheet (scripts/proof-rig.py) also reads. */
  const place = (name: PartName, visible = true) => {
    const size = PART_SIZE[name] as { w: number; h: number; ink: { x: number; y: number; w: number; h: number } };
    const k = (LAYOUT.scale as Record<string, number>)[name] ?? 1;
    const w = size.w * k * s;
    const h = size.h * k * s;
    const ink = { x: size.ink.x * k * s, y: size.ink.y * k * s, w: size.ink.w * k * s, h: size.ink.h * k * s };
    const eyes = name.startsWith('eyes');
    const left = bodyX + LAYOUT.centerX * bodyW - (ink.x + ink.w / 2);
    const top = eyes ? bodyY + LAYOUT.eyesBottom * bodyH - (ink.y + ink.h) : bodyY + LAYOUT.mouthTop * bodyH - ink.y;
    return (
      <Image
        key={name}
        source={PART_SRC[name]}
        onLoadEnd={() => mark(name)}
        style={{ position: 'absolute', left, top, width: w, height: h, opacity: visible ? 1 : 0 }}
        resizeMode="stretch"
        accessible={false}
      />
    );
  };

  /** Two legs, each hung from its hip. Split from one generated pair so the stance is adjustable. */
  const legs = () =>
    (['leg-left', 'leg-right'] as const).map((name, i) => {
      const size = PART_SIZE[name] as { w: number; h: number; pivot: { x: number; y: number } };
      const k = LAYOUT.legScale * s;
      const hip = LAYOUT.hips[i];
      return (
        <Image
          key={name}
          source={PART_SRC[name]}
          onLoadEnd={() => mark(name)}
          style={{
            position: 'absolute',
            left: bodyX + hip.x * bodyW - size.pivot.x * k,
            top: bodyY + hip.y * bodyH - size.pivot.y * k,
            width: size.w * k,
            height: size.h * k,
          }}
          resizeMode="stretch"
          accessible={false}
        />
      );
    });

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
        <Image
          source={PART_SRC[part]}
          onLoadEnd={() => mark(part)}
          style={{ width: w, height: h, transform: flip ? [{ scaleX: -1 }] : [] }}
          resizeMode="stretch"
          accessible={false}
        />
      </Animated.View>
    );
  };

  // Show Ember only once every part it's made of has loaded. Parts are separate images and load in
  // their own time; without this the small legs appear a moment before the body. Once shown it stays
  // shown: the parts are cached by then, so a change of mood swaps instantly.
  const needed: PartName[] = ['body', 'leg-left', 'leg-right', recipe.arms[0].part, recipe.arms[1].part, recipe.eyes, recipe.mouth];
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(new Set());
  const mark = (name: string) => setLoaded((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
  const [shown, setShown] = useState(false);
  // Never wait forever on an image that doesn't report back: show whatever has loaded after 1.5 s.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setWaited(true), 1500);
    return () => clearTimeout(id);
  }, []);
  const ready = shown || waited || needed.every((n) => loaded.has(n));
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready || shown) return;
    setShown(true);
    Animated.timing(appear, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [ready, shown, appear]);

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
          opacity: appear,
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
        {/* Legs and arms first, so the body covers the hip and shoulder ends. */}
        {legs()}
        {arm(recipe.arms[0], 0)}
        {arm(recipe.arms[1], 1)}
        <Image
          source={PART_SRC.body}
          onLoadEnd={() => mark('body')}
          style={{ position: 'absolute', left: bodyX, top: bodyY, width: bodyW, height: bodyH }}
          resizeMode="stretch"
          accessible={false}
        />
        {/* Both eye states are always mounted and swapped by opacity, so a blink is instant. */}
        {place(recipe.eyes, !blinking)}
        {recipe.eyes === 'eyes-open' && place('eyes-blink', blinking)}
        {place(recipe.mouth)}
      </Animated.View>
    </View>
  );
}
