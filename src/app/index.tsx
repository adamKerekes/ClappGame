import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

const ROUND_SECONDS = 10;

/** Helykitöltő játék: 10 másodperc alatt minél több koppintás. A valódi játék ide kerül. */
export default function Game() {
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = timeLeft > 0;

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
      setBest((b) => Math.max(b, score));
    }
  }, [timeLeft, score]);

  function onPress() {
    if (running) {
      setScore((s) => s + 1);
      return;
    }
    setScore(0);
    setTimeLeft(ROUND_SECONDS);
    timer.current = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Clapp Game</Text>
      <Text style={styles.info}>
        {running ? `${timeLeft} mp` : `Legjobb: ${best}`}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <Text style={styles.score}>{running ? score : 'Start'}</Text>
      </Pressable>
      <Text style={styles.hint}>
        {running ? 'Koppints, ahányszor csak tudsz!' : 'Koppints az indításhoz'}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: Colors.dark.background,
  },
  title: { color: Colors.dark.text, fontSize: 32, fontWeight: '700' },
  info: { color: Colors.dark.textSecondary, fontSize: 18 },
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#208AEF',
  },
  buttonPressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
  score: { color: '#ffffff', fontSize: 48, fontWeight: '800' },
  hint: { color: Colors.dark.textSecondary, fontSize: 16 },
});
