import { useEffect } from 'react';

// Houdt het scherm aan zolang het workoutscherm open is (instelling "Scherm
// aan in de sportschool"). Een browser zonder Wake Lock of een geweigerd
// verzoek doet niets; na terugkomen in de app wordt het opnieuw gevraagd,
// want de browser laat het los zodra de app op de achtergrond gaat.
interface WakeLockLike {
  release: () => Promise<void>;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;
    const api = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }).wakeLock;
    if (!api) return;
    let lock: WakeLockLike | undefined;
    let stopped = false;
    const request = () => {
      if (document.visibilityState !== 'visible') return;
      api.request('screen').then(
        (l) => {
          if (stopped) void l.release().catch(() => undefined);
          else lock = l;
        },
        () => undefined,
      );
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
