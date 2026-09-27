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
import { useTheme } from '../src/theme';

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
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            {/* No swipe back out of sign-in: there is nothing behind it. */}
            <Stack.Screen name="auth" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="plan" />
            <Stack.Screen name="log" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
        </PlanProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
