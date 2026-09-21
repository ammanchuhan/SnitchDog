import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { font, useTheme } from '../../src/theme';

/** Four places, one job each. Today is only what's due; everything you'd browse lives elsewhere.
 *  The native tab bar on purpose: it should feel like a phone app, not a website in a frame. */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <NativeTabs
      tintColor={t.text}
      iconColor={{ default: t.textFaint, selected: t.text }}
      labelStyle={{ fontFamily: font.semibold, fontSize: 11, color: t.textFaint }}
    >
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' }} />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach">
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} />
        <NativeTabs.Trigger.Label>Coach</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }} />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
