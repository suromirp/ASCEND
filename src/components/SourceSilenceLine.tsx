// Een rustige regel op Vandaag als er van je horloge niets meer binnenkomt terwijl de koppeling
// werkt (engine/sourceWatch.ts). Geen kaart, geen gevulde knop: één zin, een tik naar de
// koppeling, en "Begrepen" verbergt deze stilte tot er een nieuwe is.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { dismissSourceSilence, readSourceSilence } from '../storage/sourceWatch';
import { onWatchChange } from '../storage/externalActivities';
import type { SourceSilence } from '../engine/sourceWatch';
import { todayISO } from '../utils/dates';
import { TextButton } from './TextButton';
import { Icon } from './icons';

export function SourceSilenceLine() {
  const { sessionLogs, settings } = useAppData();
  const navigate = useNavigate();
  const [silence, setSilence] = useState<SourceSilence | undefined>();
  const off = settings.watchSilence === false;

  useEffect(() => {
    let alive = true;
    const load = () => void readSourceSilence(sessionLogs, { watchSilence: !off }, todayISO()).then((s) => alive && setSilence(s));
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, [sessionLogs, off]);

  if (!silence) return null;
  return (
    <div className="flex items-center gap-2 px-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
      <button type="button" onClick={() => navigate('/koppelen/garmin')} className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left active:opacity-70">
        <span className="min-w-0 flex-1">{silence.text}</span>
        <span className="shrink-0"><Icon name="verder" size={16} /></span>
      </button>
      <TextButton tone="dim" onClick={() => void dismissSourceSilence(silence).then(() => setSilence(undefined))}>Begrepen</TextButton>
    </div>
  );
}
