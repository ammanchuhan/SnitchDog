import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PlanProvider } from '../src/lib/store';
import { font, useTheme } from '../src/theme';

/** Pages one level in from a tab, each with a back button (NAV-2). */
const DRILL_DOWNS: [string, string][] = [
  ['profile/plan', 'Your plan'],
  ['profile/witnesses', 'Witnesses'],
  ['profile/witness', 'Witness'],
  ['profile/style', 'Snitch’s style'],
  ['profile/memories', 'What Snitch remembers'],
  ['profile/permissions', 'Permissions'],
  ['profile/legal', 'Privacy, terms and support'],
  ['profile/account', 'Account and data'],
  ['history', 'Every weigh-in'],
  ['reset', ''],
];

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const t = useTheme();
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlanProvider>
          <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: t.bg },
              animation: 'slide_from_right',
              // Drill-downs (NAV-2) turn the header on: a standard back button and a title.
              headerTintColor: t.text,
              headerStyle: { backgroundColor: t.bg },
              headerShadowVisible: false,
              headerTitleStyle: { fontFamily: font.semibold, color: t.text },
              headerBackButtonDisplayMode: 'minimal',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            {/* No swipe back out of sign-in or sign-up: there is nothing behind them (AUTH-6). */}
            <Stack.Screen name="auth" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="signup" options={{ gestureEnabled: false, animation: 'fade' }} />
            {/* Tasks, not places (NAV-3): they slide up and dismiss. */}
            <Stack.Screen name="log" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            {DRILL_DOWNS.map(([name, title]) => (
              <Stack.Screen key={name} name={name} options={{ headerShown: true, title }} />
            ))}
          </Stack>
        </PlanProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
