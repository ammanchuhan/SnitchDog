import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { font, radius, space, useTheme } from '../theme';
import { Text } from './Text';

const MS_PER_CHAR = 22;

/** Snitch's speech bubble: a comic-strip balloon with an ink outline, a hard offset shadow and a
 *  tail pointing down at Snitch.
 *
 * Each time what it says changes, the bubble pops in and the words type out, so a new line reads
 * as Snitch talking rather than a label changing. The full text is laid out from the first frame
 * (the untyped part is just invisible), so the bubble never grows or reflows while typing. Tap it
 * to finish the line; with Reduce Motion on, it appears whole. */
export function SpeechBubble({ lines, style }: { lines: string[]; style?: ViewStyle }) {
  const t = useTheme();
  const pop = useRef(new Animated.Value(0)).current;
  const said = lines.join('\n');
  const total = lines.reduce((n, l) => n + l.length, 0);
  const [shown, setShown] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill);
  }, []);

  useEffect(() => {
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 7, tension: 110, useNativeDriver: true }).start();
    if (still) {
      setShown(total);
      return;
    }
    setShown(0);
    const id = setInterval(() => {
      setShown((n) => {
        if (n >= total) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, MS_PER_CHAR);
    return () => clearInterval(id);
  }, [said, total, still, pop]);

  // How many characters of each line are visible so far.
  let left = shown;
  const visible = lines.map((l) => {
    const n = Math.max(0, Math.min(l.length, left));
    left -= l.length;
    return n;
  });

  return (
    <Animated.View
      style={[
        {
          alignSelf: 'stretch',
          opacity: pop,
          transform: [
            { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ],
        },
        style,
      ]}
    >
      <Pressable
        onPress={() => setShown(total)}
        accessibilityRole="text"
        accessibilityLabel={`Snitch: ${lines.join(' ')}`}
        style={{
          backgroundColor: t.surface,
          borderWidth: 2,
          borderColor: t.text,
          borderRadius: radius.lg + 6,
          paddingHorizontal: space(5),
          paddingVertical: space(4),
          gap: space(2),
          shadowColor: t.text,
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 4, height: 4 },
        }}
      >
        {lines.map((line, i) => (
          <Text
            key={i}
            style={{
              // Snitch's opening line is the character speaking, so it gets the serif; the
              // explanation under it stays sans, where longer text reads more easily small.
              fontFamily: i === 0 ? font.serifBold : font.medium,
              fontSize: i === 0 ? 22 : 16,
              lineHeight: i === 0 ? 29 : 23,
              letterSpacing: i === 0 ? -0.1 : 0,
              color: i === 0 ? t.text : t.textDim,
            }}
          >
            {line.slice(0, visible[i])}
            <Text style={{ color: 'transparent' }}>{line.slice(visible[i])}</Text>
          </Text>
        ))}
        {/* The tail, pointing down at Snitch. The short paper stroke hides the bubble's
            border where the tail joins it. */}
        <Svg width={36} height={28} viewBox="0 0 40 30" style={{ position: 'absolute', bottom: -24, left: '44%' }}>
          <Path d="M2 0 L10 26 L26 0" fill={t.surface} stroke={t.text} strokeWidth={2.5} strokeLinejoin="round" />
          <Path d="M0 -1.5 H28" stroke={t.surface} strokeWidth={4} />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}

/** Keeps a bubble from reacting to every keystroke: Snitch answers once you pause. */
export function useSettled<T>(value: T, ms = 600): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

