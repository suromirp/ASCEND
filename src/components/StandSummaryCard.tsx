import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { useLegFatigueInputs } from './LegFatigueCard';
import { fatigueWord, legFatigueOn } from '../engine/legFatigue';
import { LOAD_JUMP, loadVersusBefore, weeklyLoad } from '../engine/standing';
import { deriveSessionStatus } from '../engine/sessionStatus';
import { mondayOfWeek } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { Card, Eyebrow } from './ui';

// Vandaag → one quiet line to Je stand (pages/Standing.tsx): your legs,
// the week and the load, the rest one tap away.

const LEVEL_COLOR = ['var(--color-alpine)', 'var(--color-gold)', 'var(--color-warning)'];

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
  const load = !jump ? '–' : jump.ratio > LOAD_JUMP ? `+${Math.round((jump.ratio - 1) * 100)}%` : jump.ratio < 0.7 ? 'licht' : 'normaal';
  // A jump that is only planned so far is information, not yet a warning.

  const items = [
    { label: 'Benen', value: <><span style={{ color: LEVEL_COLOR[level] }}>{word}</span> <span className="tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{formatNumberNL(legs.index, 1)}</span></> },
    { label: 'Week', value: <span className="tabular-nums">{done} / {week.length}</span> },
    { label: 'Belasting', value: <span style={{ color: jump && jump.doneRatio > LOAD_JUMP ? 'var(--color-warning)' : undefined }}>{load}</span>, hint: jump ? 'tegen de 4 weken ervoor' : undefined },
  ];

  return (
    <button onClick={() => navigate('/stand')} className="block w-full text-left" aria-label="Je stand openen">
      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <Eyebrow>JE STAND</Eyebrow>
          <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>alles bekijken ›</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {items.map((it) => (
            <div key={it.label}>
              <p className="text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>{it.label}</p>
              <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{it.value}</p>
              {'hint' in it && it.hint && <p className="text-[10px] leading-tight" style={{ color: 'var(--color-ink-dim)' }}>{it.hint}</p>}
            </div>
          ))}
        </div>
      </Card>
    </button>
  );
}
