// ASCEND: the next tocht as one calm line on Vandaag and Ascend, when it comes
// before the GR5 (engine/trek.ts#nextTrek). Stone, no gold: the mission keeps
// the one gold accent of the screen. Tapping it opens the tochten on the
// Doelen page.

import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { programAnchorDate } from '../engine/programLayout';
import { nextTrek, trekFacts, whenText } from '../engine/trek';
import { describePeriodDates } from '../engine/leave';
import { todayISO } from '../utils/dates';
import { Icon } from './icons';
import { Eyebrow } from './ui';

export function NextTrekLine({ onlyWhenOn = false }: { onlyWhenOn?: boolean }) {
  const { leavePeriods, trainingGoals, goalMilestones, settings } = useAppData();
  const navigate = useNavigate();
  const today = todayISO();
  if (onlyWhenOn && settings.showNextTrek === false) return null;
  const next = nextTrek(leavePeriods, today, programAnchorDate(trainingGoals, goalMilestones, today));
  if (!next) return null;
  const when = whenText(next);

  return (
    <button
      onClick={() => navigate('/ascend/doelen')}
      className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
      aria-label={`Eerstvolgende tocht: ${next.trek.name}, ${when}`}
    >
      <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><Icon name="bivak" size={22} /></span>
      <span className="min-w-0 flex-1">
        <Eyebrow>Volgende tocht</Eyebrow>
        <span className="mt-0.5 block truncate font-display text-base" style={{ color: 'var(--color-ink)' }}>{next.trek.name}</span>
        <span className="block text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{describePeriodDates(next.period, true)}</span>
        <span className="block text-xs" style={{ color: 'var(--color-ink-dim)' }}>{trekFacts(next.period)}</span>
      </span>
      <span className="shrink-0 text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{when}</span>
    </button>
  );
}
