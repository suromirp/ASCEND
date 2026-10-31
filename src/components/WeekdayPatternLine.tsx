// Een rustige zin op Week als je training op een weekdag duidelijk vaker wegvalt dan op de andere
// (engine/weekdayPattern.ts). Alleen een feit: de planning verandert er niet door. "Begrepen"
// verbergt hem voor deze weekdag tot het patroon opnieuw opduikt na acht weken.

import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { weekdayPattern } from '../engine/weekdayPattern';
import { leaveDays } from '../engine/leave';
import { isIllnessDay } from '../engine/illness';
import { signalOn } from '../engine/signalSettings';
import { MetaRepo } from '../storage/database';
import { addDays, todayISO } from '../utils/dates';
import { TextButton } from './TextButton';

const SEEN_KEY = 'weekdayPatternSeen';
interface Seen { weekday: number; on: string }

export function WeekdayPatternLine() {
  const { plannedSessions, sessionLogs, settings, templateById } = useAppData();
  const today = todayISO();
  const [seen, setSeen] = useState<Seen | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void MetaRepo.get<Seen>(SEEN_KEY).then((s) => alive && setSeen(s ?? null)).catch(() => alive && setSeen(null));
    return () => {
      alive = false;
    };
  }, []);
  const on = signalOn(settings, 'weekdayPattern');
  const pattern = useMemo(() => {
    if (!on) return undefined;
    const excludedDays = new Set(leaveDays(settings.leavePeriods).keys());
    for (let d = addDays(today, -56); d < today; d = addDays(d, 1)) if (isIllnessDay(d, settings.illnessEpisodes, today)) excludedDays.add(d);
    return weekdayPattern({ today, planned: plannedSessions, logs: sessionLogs, excludedDays, isRest: (s) => templateById.get(s.templateId)?.type === 'recovery' });
  }, [on, today, plannedSessions, sessionLogs, settings.leavePeriods, settings.illnessEpisodes, templateById]);

  if (!pattern || seen === undefined) return null;
  if (seen && seen.weekday === pattern.weekday && seen.on > addDays(today, -56)) return null;
  return (
    <div className="flex items-start gap-2 px-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
      <p className="min-w-0 flex-1 py-3">{pattern.text}</p>
      <TextButton tone="dim" onClick={() => {
        const next = { weekday: pattern.weekday, on: today };
        setSeen(next);
        void MetaRepo.set(SEEN_KEY, next).catch(() => undefined);
      }}>Begrepen</TextButton>
    </div>
  );
}
