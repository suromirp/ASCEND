// ASCEND: de tekst voor Strava bij een gedane training (engine/activityText.ts):
// de titel die zegt wat voor training het was, hooguit één regel waarom, en een
// knop per stuk dat je kopieert. ASCEND schrijft niet naar Strava (geen server);
// je plakt zelf. Staat uit met de schakelaar "Tekst voor Strava" bij Koppelingen;
// "Wat erin staat" kiest tussen alleen de titel en titel met regel. Na een tik
// staat er een paar seconden "Gekopieerd"; lukt kopiëren niet, dan staat er een melding.

import { useEffect, useState } from 'react';
import type { SessionLog, SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { resolveStravaTextParts, stravaCopyText, stravaGoalName, stravaText, type StravaTextParts } from '../engine/activityText';
import { copyText } from '../utils/shareText';
import { TextButton } from './TextButton';
import { Icon } from './icons';

const COPIED_MS = 3000;
const FAILED_MS = 6000;

export function StravaTextButton({ log, template }: { log: SessionLog; template: SessionTemplate | undefined }) {
  const { settings, plannedSessions, program, trainingGoals, goalMilestones } = useAppData();
  const [state, setState] = useState<'idle' | StravaTextParts | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), state === 'failed' ? FAILED_MS : COPIED_MS);
    return () => clearTimeout(timer);
  }, [state]);

  if (settings.stravaText === false) return null;

  const planned = log.plannedSessionId ? plannedSessions.find((s) => s.id === log.plannedSessionId) : undefined;
  const text = stravaText({ log, template, planned, program, goalName: stravaGoalName(trainingGoals, goalMilestones) });
  const withLine = resolveStravaTextParts(settings.stravaTextParts) === 'title-line' && text.line !== undefined;

  async function copy(parts: StravaTextParts) {
    const ok = await copyText(stravaCopyText(text, parts));
    setState(ok ? parts : 'failed');
  }

  const button = (parts: StravaTextParts, label: string) => (
    <TextButton tone="dim" onClick={() => void copy(parts)}>
      {state === parts ? (
        <>
          <Icon name="vinkje" size={16} />
          Gekopieerd
        </>
      ) : label}
    </TextButton>
  );

  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Voor Strava</p>
      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{text.title}</p>
      {withLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{text.line}</p>}
      <div className="flex flex-wrap gap-x-5">
        {button('title', 'Titel kopiëren')}
        {withLine && button('title-line', 'Titel en regel kopiëren')}
      </div>
      <p role="status" className="text-xs" style={{ color: 'var(--color-warning)' }}>
        {state === 'failed' ? 'Kopiëren lukte niet. Probeer het nog eens.' : ''}
      </p>
    </div>
  );
}
