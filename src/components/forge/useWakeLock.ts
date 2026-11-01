import { useEffect } from 'react';
import { deviceShell } from '../../integrations/deviceShell';

// Houdt het scherm aan zolang het workoutscherm open is (instelling "Scherm aan tijdens je
// training"). In de browser met de Screen Wake Lock API, in de Android-app met de plugin Keep
// Awake (integrations/deviceShell.ts). Kan het niet, dan gebeurt er niets.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return deviceShell().holdScreen();
  }, [active]);
}
