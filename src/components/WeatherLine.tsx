// ASCEND: one calm line with the weather for a training, e.g.
// "14 graden, droog, licht tot 18.12". Not a widget: nothing at all when the
// training happens indoors, when no place is chosen yet, or when the forecast
// does not reach that day. Offline or when the forecast is old it says when
// it was last updated ("bijgewerkt om 13.05").
//
// Placed on the mission card of Today and in the training explanation; the
// engine (engine/weather.ts) does all the work.

import type { SessionTemplate } from '../models/training';
import { useAppData } from '../state/AppDataContext';
import { resolveEffectiveFullDuration } from '../engine/substitutions';
import { isForecastStale, updatedLabel, weatherForTraining } from '../engine/weather';

const TONE = { prima: 'var(--color-ink-dim)', let_op: 'var(--color-warning)', slecht: 'var(--color-danger-text)' } as const;

export function WeatherLine({ template, date, minutes, className = '' }: { template: SessionTemplate; date: string; minutes?: number; className?: string }) {
  const { weather, sessionLogs, program } = useAppData();
  const now = new Date();
  const w = weatherForTraining({
    forecast: weather.forecast,
    template,
    logs: sessionLogs,
    date,
    durationMinutes: minutes ?? resolveEffectiveFullDuration(template, date, program),
    now,
  });
  if (!w || !weather.forecast) return null;

  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const stale = offline || isForecastStale(weather.forecast.fetchedAt, now);
  const lead = w.verdict === 'slecht' ? 'Slecht weer: ' : w.verdict === 'let_op' ? 'Let op: ' : '';
  return (
    <p className={`text-xs leading-snug ${className}`} style={{ color: TONE[w.verdict] }}>
      {lead}{w.line}
      {stale && <span style={{ color: 'var(--color-ink-dim)' }}> · {updatedLabel(weather.forecast.fetchedAt)}</span>}
    </p>
  );
}
