// ASCEND: "Weer volgt je locatie", de haak. Bij het openen van de app en als
// de app weer naar voren komt, werkt hij de plek "Mijn locatie" bij. Wat er mag
// gebeuren staat in engine/weatherLocation.ts, het uitvoeren in
// storage/weatherLocation.ts (nooit een venster, hoogstens eens per uur).
// Eenmaal gebruikt, door AppDataProvider.

import { useEffect, useRef } from 'react';
import type { AppSettings } from '../storage/database';
import { followLocation } from '../storage/weatherLocation';
import { followsLocation, needsWeather } from '../engine/overviewSettings';

export function useFollowLocation(
  settings: AppSettings,
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>,
  ready: boolean,
): void {
  // Altijd de laatste stand, zonder de effecten telkens opnieuw te starten.
  const latest = useRef({ settings, updateSettings });
  useEffect(() => {
    latest.current = { settings, updateSettings };
  });
  const running = useRef(false);

  useEffect(() => {
    if (!ready) return;
    const run = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const { settings: s, updateSettings: update } = latest.current;
        const result = await followLocation({ enabled: needsWeather(s.overviews) && followsLocation(s.overviews), place: s.homeLocation });
        if (result.status === 'updated') await update({ homeLocation: result.place });
      } catch {
        // De plek blijft zoals ze was; de app gaat gewoon door.
      } finally {
        running.current = false;
      }
    };
    void run();
    const onVisible = () => { if (document.visibilityState === 'visible') void run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [ready]);
}
