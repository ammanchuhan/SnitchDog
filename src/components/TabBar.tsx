import { BlurView } from 'expo-blur';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, radius, space, useTheme } from '../theme';
import { Text } from './Text';

/** A floating glass pill instead of the system tab bar.
 *
 * The native bar was the earlier choice, for feeling like a phone app rather than a website in a
 * frame. This trades that for a bar that sits *in* the page: content scrolls under it and the
 * blur lets the alarm banner or a chart tint it as it passes, so the app reads as one surface.
 *
 * Icons stay SF Symbols, so they still match the platform even though the bar no longer is one.
 */

/** Only what this bar actually touches. expo-router vendors @react-navigation/bottom-tabs
 *  internally rather than shipping it as a package, so there is nothing to import the real type
 *  from short of reaching into its build output. */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

const ICONS: Record<string, { on: SFSymbol; off: SFSymbol; label: string }> = {
  home: { on: 'house.fill', off: 'house', label: 'Home' },
  analytics: { on: 'chart.line.uptrend.xyaxis', off: 'chart.line.uptrend.xyaxis', label: 'Analytics' },
  coach: { on: 'bubble.left.fill', off: 'bubble.left', label: 'Coach' },
  profile: { on: 'person.crop.circle.fill', off: 'person.crop.circle', label: 'Profile' },
};

/** What a scrolling screen must leave clear at its bottom.
 *
 *  Measured from the PHYSICAL bottom of the screen, because the tab screens run their scroll
 *  views edge to edge (`edges={['top']}`): the home-indicator inset (~34) plus the pill (~74)
 *  plus room to breathe. Screens that do inset their bottom edge just get a little extra scroll
 *  room, which costs nothing. */
export const TAB_BAR_CLEARANCE = 124;

export function TabBar({ state, navigation }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: space(5),
        right: space(5),
        bottom: Math.max(insets.bottom, space(3)),
      }}
    >
      {/* Two views on purpose: iOS cannot clip and cast a shadow from the same layer — set
          overflow:hidden beside shadowColor and it draws the shadow as a second, unclipped
          rectangle behind the first. Outer casts, inner clips. */}
      <View
        style={{
          borderRadius: radius.pill,
          shadowColor: '#16150F',
          shadowOpacity: t.scheme === 'dark' ? 0.4 : 0.12,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
      <View
        style={{
          borderRadius: radius.pill,
          // Required for the blur to be clipped to the pill rather than filling its box.
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: t.scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(22,21,15,0.08)',
        }}
      >
        <BlurView
          // systemChromeMaterial follows the system light/dark, so the pill stays glass in both.
          tint={Platform.OS === 'ios' ? 'systemChromeMaterial' : t.scheme === 'dark' ? 'dark' : 'light'}
          intensity={Platform.OS === 'ios' ? 80 : 60}
          style={{ flexDirection: 'row', paddingHorizontal: space(2), paddingVertical: space(2) }}
        >
          {state.routes.map((route, i) => {
            const icon = ICONS[route.name];
            if (!icon) return null;
            const focused = state.index === i;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={icon.label}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 3,
                  paddingVertical: space(2),
                  borderRadius: radius.pill,
                  backgroundColor: focused
                    ? t.scheme === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(22,21,15,0.06)'
                    : 'transparent',
                }}
              >
                <SymbolView
                  name={focused ? icon.on : icon.off}
                  size={22}
                  tintColor={focused ? t.ink : t.textFaint}
                  weight={focused ? 'semibold' : 'regular'}
                  resizeMode="scaleAspectFit"
                  style={{ width: 24, height: 24 }}
                />
                <Text
                  style={{
                    fontFamily: font.semibold,
                    fontSize: 11,
                    color: focused ? t.ink : t.textFaint,
                  }}
                >
                  {icon.label}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
      </View>
    </View>
  );
}
