import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { FatalErrorScreen } from '@/lib/fatal-error';

SplashScreen.preventAutoHideAsync();

/** Nincs alsó menü: az app egyből a játékkal indul, mindig sötét módban. */
export default function RootLayout() {
  return (
    <FatalErrorScreen>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.dark.background } }} />
      </ThemeProvider>
    </FatalErrorScreen>
  );
}
