import { useEffect } from 'react';

// Houdt het scherm aan zolang het workoutscherm open is (instelling "Scherm
// aan in de sportschool"). Een browser zonder Wake Lock of een geweigerd
// verzoek doet niets; na terugkomen in de app wordt het opnieuw gevraagd,
// want de browser laat het los zodra de app op de achtergrond gaat.
interface WakeLockLike {
  release: () => Promise<void>;
  released?: boolean;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;
    const api = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }).wakeLock;
    if (!api) return;
    let lock: WakeLockLike | undefined;
    let stopped = false;
    let pending = false;
    const request = () => {
      // Nooit twee tegelijk: een lopende aanvraag of een lock die nog geldt is genoeg.
      if (document.visibilityState !== 'visible' || pending || (lock && !lock.released)) return;
      pending = true;
      api.request('screen').then(
        (l) => {
          pending = false;
          if (stopped) void l.release().catch(() => undefined);
          else lock = l;
        },
        () => {
          pending = false;
        },
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
