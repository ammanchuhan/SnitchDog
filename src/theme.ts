/** SnitchDog's design language.
 *
 * Two emotions run this product: commitment, which should feel calm, and consequence, which
 * should feel hot. So the interface is almost entirely warm neutral and only ever raises its
 * voice in one colour — ember, reserved for pressure (a check-in going stale, a countdown, a
 * witness about to hear about it). Green appears only to mark a day that was kept.
 *
 * The palette is built as one design inverted, not two themes, so light and dark stay in sync.
 */
import { useColorScheme } from 'react-native';

const ember = {
  base: '#E8552F',
  bright: '#FF6A45',
};

const light = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceHigh: '#F2EFE9',
  line: '#E4DFD6',
  lineSoft: '#EFEBE3',

  text: '#16150F',
  textDim: '#6B665C',
  textFaint: '#9C978C',

  /** The brand's own colour, and what a primary action is made of. Ember is no longer it. */
  ink: '#16150F',
  onInk: '#FAF7F2',
  /** Tertiary. Quiet warm fill for anything that needs to sit back. */
  clay: '#C8B9A0',
  claySoft: '#EDE5D9',

  ember: ember.base,
  emberSoft: '#FDE8E1',
  onEmber: '#FFFFFF',

  good: '#157F55',
  goodSoft: '#DDF0E6',
  warn: '#B77400',

  scrim: 'rgba(22,21,15,0.06)',
};

const dark: typeof light = {
  bg: '#121211',
  surface: '#1A1A18',
  surfaceHigh: '#24241F',
  line: '#33332D',
  lineSoft: '#242420',

  text: '#F6F4EF',
  textDim: '#A09A8F',
  textFaint: '#6E6960',

  // Inverted, not re-picked: on a dark ground the "ink" that carries a primary action is light.
  ink: '#F6F4EF',
  onInk: '#121211',
  clay: '#4A4237',
  claySoft: '#2A251E',

  ember: ember.bright,
  emberSoft: '#3A1A12',
  onEmber: '#FFFFFF',

  good: '#48D394',
  goodSoft: '#12301F',
  warn: '#E8A72B',

  scrim: 'rgba(0,0,0,0.4)',
};

export type Palette = typeof light;

export const palettes = { light, dark };

export function useTheme(): Palette & { scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...palettes[scheme], scheme };
}

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

/** 4pt grid. space(4) === 16. */
export const space = (n: number) => n * 4;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  /** Fraunces carries the headlines and Ember's voice. Its soft terminals are the nearest a
   *  typeface gets to the scissor-cut paper Ember is drawn from. */
  serif: 'Fraunces_400Regular',
  serifMedium: 'Fraunces_500Medium',
  serifBold: 'Fraunces_600SemiBold',
} as const;

/** Numbers carry this product, so they get their own scale and tabular figures. */
export const type = {
  // `hero` is the weigh-in number and nothing else — it stays sans so it keeps tabular figures
  // and does not shift width as it changes.
  hero: { fontFamily: font.extrabold, fontSize: 60, letterSpacing: -2.5 },
  display: { fontFamily: font.serifBold, fontSize: 38, letterSpacing: -0.6 },
  title: { fontFamily: font.serifBold, fontSize: 26, letterSpacing: -0.3 },
  // Sans: `heading` labels stat cards and numbers as often as it heads anything.
  heading: { fontFamily: font.semibold, fontSize: 19, letterSpacing: -0.3 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: font.semibold, fontSize: 14 },
  micro: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2 },
} as const;

export const tabular = { fontVariant: ['tabular-nums' as const] };
