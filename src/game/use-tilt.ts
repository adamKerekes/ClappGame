import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const GRAVITY = 9.80665;
const SMOOTHING = 0.25;

export type Tilt = { x: number; y: number };
export type TiltStatus = 'idle' | 'running' | 'unavailable' | 'denied';

/**
 * A telefon dőlése a képernyő síkjában, a gravitáció irányából számolva.
 * `tilt.current.x` > 0: jobbra lejt, `tilt.current.y` > 0: a képernyő alja felé lejt.
 * Az indításkori tartás számít vízszintesnek (kalibrálás), így nem kell laposan tartani.
 * Weben (és fejlesztéshez) a nyilakkal is lehet dönteni.
 */
export function useTilt() {
  const tilt = useRef<Tilt>({ x: 0, y: 0 });
  const [status, setStatus] = useState<TiltStatus>('idle');
  const gravity = useRef<Tilt | null>(null);
  const neutral = useRef<Tilt | null>(null);
  const keys = useRef({ x: 0, y: 0 });
  const hasMotion = useRef(false);
  /** Érkezett-e már mérés az érzékelőtől. */
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    // Weben elutasított engedélynél is figyelünk: ha mégis jönnek mérések, működik a döntés.
    if (status !== 'running' && !(Platform.OS === 'web' && status === 'denied')) return;

    const onGravity = (a: { x: number | null; y: number | null } | null | undefined) => {
      if (!a || a.x == null || a.y == null) return;
      // Natívan (iOS, Android) a vektor a gravitáció irányába mutat, a böngészőben ellenkezőleg.
      const sign = Platform.OS === 'web' ? -1 : 1;
      // Képernyő-koordinátákra váltás: a készülék y tengelye felfelé mutat, a képernyőé lefelé.
      const g = { x: (sign * a.x) / GRAVITY, y: (-sign * a.y) / GRAVITY };
      gravity.current = g;
      if (!neutral.current) neutral.current = g;
      const target = { x: g.x - neutral.current.x, y: g.y - neutral.current.y };
      tilt.current = {
        x: tilt.current.x + (target.x - tilt.current.x) * SMOOTHING,
        y: tilt.current.y + (target.y - tilt.current.y) * SMOOTHING,
      };
      if (!hasMotion.current) {
        hasMotion.current = true;
        setMotion(true);
      }
    };

    // Weben közvetlenül a böngésző eseményét figyeljük (az expo-sensors webes ellenőrzése túl szigorú).
    if (Platform.OS === 'web') {
      const handler = (e: DeviceMotionEvent) => onGravity(e.accelerationIncludingGravity);
      window.addEventListener('devicemotion', handler);
      return () => window.removeEventListener('devicemotion', handler);
    }

    DeviceMotion.setUpdateInterval(16);
    const sub = DeviceMotion.addListener((m: DeviceMotionMeasurement) => onGravity(m.accelerationIncludingGravity));
    return () => sub.remove();
  }, [status]);

  // Billentyűzetes vezérlés weben (asztali géphez).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-0.5, 0],
      ArrowRight: [0.5, 0],
      ArrowUp: [0, -0.5],
      ArrowDown: [0, 0.5],
    };
    const handle = (down: boolean) => (e: KeyboardEvent) => {
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      if (d[0]) keys.current.x = down ? d[0] : 0;
      if (d[1]) keys.current.y = down ? d[1] : 0;
      tilt.current = { ...keys.current };
    };
    const onDown = handle(true);
    const onUp = handle(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  /** Engedélykérés és indítás. Weben (iOS Safari) gombnyomásból kell hívni. */
  const start = useCallback(async () => {
    neutral.current = null;
    tilt.current = { x: 0, y: 0 };
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') {
        setStatus('unavailable');
        return;
      }
      // iOS Safari-n engedélyt kell kérni (gombnyomásból); Androidon nincs ilyen, vagy magától megadja.
      const motionEvent = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof motionEvent.requestPermission === 'function') {
        const result = await motionEvent.requestPermission().catch(() => 'denied');
        if (result !== 'granted') {
          setStatus('denied');
          return;
        }
      }
      setStatus('running');
      return;
    }
    if (!(await DeviceMotion.isAvailableAsync().catch(() => false))) {
      setStatus('unavailable');
      return;
    }
    const { granted } = await DeviceMotion.requestPermissionsAsync();
    setStatus(granted ? 'running' : 'denied');
  }, []);

  /** Az aktuális tartás legyen a vízszintes. */
  const calibrate = useCallback(() => {
    neutral.current = gravity.current;
    tilt.current = { x: 0, y: 0 };
  }, []);

  return { tilt, status, motion, start, calibrate };
}
