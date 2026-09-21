import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { font, useTheme } from '../../src/theme';

/** Home in the middle, where the thumb rests: how you're doing and what's due. Analytics is for
 *  looking back; Coach is for talking. The plan is settings, so it hangs off Home instead.
 *  The native tab bar on purpose: it should feel like a phone app, not a website in a frame. */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <NativeTabs
      tintColor={t.text}
      iconColor={{ default: t.textFaint, selected: t.text }}
      labelStyle={{ fontFamily: font.semibold, fontSize: 11, color: t.textFaint }}
    >
      <NativeTabs.Trigger name="analytics">
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' }} />
        <NativeTabs.Trigger.Label>Analytics</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach">
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
