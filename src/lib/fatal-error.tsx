import { useEffect, useState, type ReactNode } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ScrollView, StyleSheet, Text } from 'react-native';

/**
 * Release buildben egy végzetes JS hiba azonnal bezárja az appot ("az alkalmazás leállt").
 * Ez a kezelő elkapja, és a hibaüzenetet mutatja a képernyőn, hogy látszódjon, mi a baj.
 */
type Listener = (error: Error) => void;

let lastError: Error | null = null;
const listeners = new Set<Listener>();

type ErrorUtilsType = {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};
const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsType }).ErrorUtils;

if (errorUtils) {
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (!isFatal) {
      previous(error, isFatal);
      return;
    }
    lastError = error instanceof Error ? error : new Error(String(error));
    listeners.forEach((listener) => listener(lastError!));
    console.error(error);
  });
}

export function FatalErrorScreen({ children }: { children: ReactNode }) {
  const [error, setError] = useState<Error | null>(lastError);

  useEffect(() => {
    listeners.add(setError);
    return () => {
      listeners.delete(setError);
    };
  }, []);

  useEffect(() => {
    if (error) SplashScreen.hideAsync().catch(() => {});
  }, [error]);

  if (!error) return children;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Hiba történt</Text>
      <Text selectable style={styles.message}>
        {error.message}
      </Text>
      <Text selectable style={styles.stack}>
        {error.stack}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0d12' },
  content: { padding: 24, paddingTop: 64, gap: 12 },
  title: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  message: { color: '#ff9b9b', fontSize: 16 },
  stack: { color: '#b0b4ba', fontSize: 11 },
});
