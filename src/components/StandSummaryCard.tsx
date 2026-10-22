import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { useLegFatigueInputs } from './LegFatigueCard';
import { fatigueWord, legFatigueOn } from '../engine/legFatigue';
import { LOAD_JUMP, loadVersusBefore, weeklyLoad } from '../engine/standing';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { mondayOfWeek } from '../utils/dates';
import { ChevronGlyph } from './vandaag/glyphs';

// Vandaag → one quiet line to Je stand (pages/Standing.tsx): your legs,
// the week and the load, the rest one tap away.

export function StandSummaryCard() {
  const navigate = useNavigate();
  const { sessionLogs, plannedSessions, templates, templateById, sessionsForWeek } = useAppData();
  const inputs = useLegFatigueInputs();
  const today = inputs.today;
  const legs = useMemo(() => legFatigueOn(today, inputs), [today, inputs]);
  const jump = useMemo(() => loadVersusBefore(weeklyLoad({ logs: sessionLogs, plannedSessions, templates, today, minutesOf: inputs.minutesOf }, 4, 0)), [sessionLogs, plannedSessions, templates, today, inputs.minutesOf]);
  const week = sessionsForWeek(mondayOfWeek(today)).filter((s) => templateById.get(s.templateId)?.type !== 'recovery');
  const done = week.filter((s) => deriveSessionStatus(s, sessionLogs).status === 'completed').length;
  const { word, level } = fatigueWord(legs.index);
  // A jump that is only planned so far is information, not yet a warning.
  const heavy = !!jump && jump.doneRatio > LOAD_JUMP;
  const weekWord = !jump
    ? undefined
    : jump.ratio > LOAD_JUMP
      ? `${Math.round((jump.ratio - 1) * 100)}% zwaarder dan de 4 weken ervoor`
      : jump.ratio < 0.7
        ? 'lichter dan de 4 weken ervoor'
        : 'zoals de 4 weken ervoor';

  // Colour only on the verdict: a warning for tired legs or a heavy week.
  return (
    <button
      onClick={() => navigate('/stand')}
      aria-label="Je stand openen"
      className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
    >
      <span className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        Benen <span style={{ color: level >= 2 ? 'var(--color-warning)' : 'var(--color-ink)' }}>{word.toLowerCase()}</span>
        {' · '}
        <span className="tabular-nums" style={{ color: 'var(--color-ink)' }}>{done} van {week.length}</span> gedaan
        {weekWord && <>{' · '}week <span style={{ color: heavy ? 'var(--color-warning)' : 'var(--color-ink)' }}>{weekWord}</span></>}
      </span>
      <span className="shrink-0" style={{ color: 'var(--color-ink-dim)' }}><ChevronGlyph /></span>
    </button>
  );
}
