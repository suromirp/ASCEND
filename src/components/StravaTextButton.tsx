// ASCEND: "Tekst voor Strava kopiëren". Een kleine, rustige tekstknop die de
// korte beschrijving van een gedane training (engine/activityText.ts) op het
// klembord zet, om zelf in Strava te plakken. ASCEND schrijft niet naar
// Strava (geen server). Staat uit met de schakelaar "Tekst voor Strava" bij
// Koppelingen. Na een tik staat er een paar seconden "Gekopieerd"; lukt
// kopiëren niet, dan staat er een melding.

import { useEffect, useState } from 'react';
import type { SessionLog, SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { activityText } from '../engine/activityText';
import { copyText } from '../utils/shareText';
import { TextButton } from './TextButton';
import { Icon } from './icons';

const COPIED_MS = 3000;
const FAILED_MS = 6000;

export function StravaTextButton({ log, template, tone = 'dim' }: { log: SessionLog; template: SessionTemplate | undefined; tone?: 'action' | 'dim' }) {
  const { settings, plannedSessions, program } = useAppData();
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), state === 'copied' ? COPIED_MS : FAILED_MS);
    return () => clearTimeout(timer);
  }, [state]);

  if (settings.stravaText === false) return null;

  async function copy() {
    const planned = log.plannedSessionId ? plannedSessions.find((s) => s.id === log.plannedSessionId) : undefined;
    const ok = await copyText(activityText({ log, template, planned, program }));
    setState(ok ? 'copied' : 'failed');
  }

  return (
    <div>
      <TextButton tone={tone} onClick={() => void copy()}>
        {state === 'copied' ? (
          <>
            <Icon name="vinkje" size={16} />
            Gekopieerd
          </>
        ) : (
          'Tekst voor Strava kopiëren'
        )}
      </TextButton>
      <p role="status" className="text-xs" style={{ color: 'var(--color-warning)' }}>
        {state === 'failed' ? 'Kopiëren lukte niet. Probeer het nog eens.' : ''}
      </p>
    </div>
  );
}
