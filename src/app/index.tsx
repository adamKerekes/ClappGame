import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { generateMaze } from '@/game/maze';
import { stepBall, type Ball } from '@/game/physics';
import { createScene } from '@/game/scene';
import { useTilt } from '@/game/use-tilt';

const maze = generateMaze();

function newBall(): Ball {
  return { x: maze.start.x, y: maze.start.y, vx: 0, vy: 0 };
}

/** Kör alakú 3D labirintus: a telefon döntésével kell a golyót középre juttatni. */
export default function Game() {
  const { tilt, status, start, calibrate } = useTilt();
  const ball = useRef<Ball>(newBall());
  const playing = useRef(false);
  const frame = useRef<number | null>(null);
  const [won, setWon] = useState(false);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  function onContextCreate(gl: ExpoWebGLRenderingContext) {
    const scene = createScene(gl, maze);
    let last = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing.current && stepBall(ball.current, maze.walls, tilt.current.x, tilt.current.y, dt)) {
        playing.current = false;
        setWon(true);
      }
      scene.render(ball.current, tilt.current);
      frame.current = requestAnimationFrame(loop);
    };
    loop();
  }

  async function onStart() {
    ball.current = newBall();
    setWon(false);
    await start();
    playing.current = true;
  }

  const started = status !== 'idle';
  const keyboardHint = Platform.OS === 'web' && (status === 'unavailable' || status === 'denied');

  return (
    <View style={styles.screen}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.top} pointerEvents="none">
          <Text style={styles.title}>Labirintus</Text>
          <Text style={styles.hint}>
            {keyboardHint
              ? 'Nincs dőlésérzékelő: használd a nyilakat'
              : status === 'denied'
                ? 'A mozgásérzékelő engedélye nélkül nem megy a döntés'
                : 'Döntsd a telefont, és juttasd a golyót középre!'}
          </Text>
        </View>

        <View style={styles.bottom} pointerEvents="box-none">
          {!started || won ? (
            <Pressable
              accessibilityRole="button"
              onPress={onStart}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <Text style={styles.buttonText}>{won ? 'Célba értél! Újra' : 'Indítás'}</Text>
            </Pressable>
          ) : status === 'running' ? (
            <Pressable
              accessibilityRole="button"
              onPress={calibrate}
              style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
              <Text style={styles.smallButtonText}>Ez legyen a vízszintes</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0d12' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  top: { alignItems: 'center', paddingTop: 12, gap: 4 },
  title: { color: Colors.dark.text, fontSize: 28, fontWeight: '700' },
  hint: { color: Colors.dark.textSecondary, fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  bottom: { alignItems: 'center', paddingBottom: 24 },
  button: {
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 32,
    backgroundColor: '#208AEF',
  },
  buttonText: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  smallButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  smallButtonText: { color: Colors.dark.text, fontSize: 14 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
