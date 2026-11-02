import { useEffect, useRef } from 'react';
import { useAppData } from '../state/AppDataContext';
import { runAutoBackupIfDue } from '../storage/autoBackup';

// De automatische back-up (storage/autoBackup.ts): zodra de app klaar is en elke keer dat je
// terugkomt in de app kijkt dit of het moment voorbij is. In de Android-app schrijft de opslag het
// bestand dan stil; in de browser alleen naar een vaste map die zonder vragen open is, anders zet
// Vandaag een kaart neer. Tekent zelf niets.
export function AutoBackupHost({ ready }: { ready: boolean }) {
  const { settings, updateSettings } = useAppData();
  const save = useRef(updateSettings);
  useEffect(() => {
    save.current = updateSettings;
  }, [updateSettings]);
  const frequency = settings.autoBackup;
  const keep = settings.autoBackupKeep;

  useEffect(() => {
    if (!ready) return;
    const run = () => void runAutoBackupIfDue({ onSaved: (at) => save.current({ lastExportedAt: at }) }).catch(() => undefined);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    run();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [ready, frequency, keep]);

  return null;
}

