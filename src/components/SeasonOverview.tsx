import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { buildSeasonPlan, type SeasonPhase, type SeasonWeek } from '../engine/seasonPlan';
import { programAnchorDate } from '../engine/programLayout';
import { PHASE_COLOR } from '../data/phaseColors';
import { daysBetween, formatDateNL, formatHoursMinutesNL, todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';
import { Icon } from './icons';

// Week → Jaaroverzicht: the whole road to the main goal. Phases as cards
// (the current one open), and inside each phase its weeks with the
// sessions that matter. Tapping a week opens it in the week view.
export function SeasonOverview({ onSelectWeek }: { onSelectWeek: (weekStart: string) => void }) {
  const { program, plannedSessions, sessionLogs, templates, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  const phases = useMemo(
    () => (program ? buildSeasonPlan(program, plannedSessions, sessionLogs, templates, today) : []),
    [program, plannedSessions, sessionLogs, templates, today],
  );
  const [open, setOpen] = useState<string | undefined>(() => phases.find((p) => p.current)?.id);
  if (!program || phases.length === 0) return null;

  const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
  const ladder = new Set(goalMilestones.map((m) => m.goalId));
  const mainGoal = trainingGoals.find((g) => g.status === 'active' && ladder.has(g.id));
  const totalWeeks = phases.reduce((n, p) => n + p.weeks.length, 0);
  const weeksLeft = goalDate ? Math.max(0, Math.ceil(daysBetween(today, goalDate) / 7)) : undefined;
  const nowIndex = phases.flatMap((p) => p.weeks).findIndex((w) => w.current);

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3" texture>
        <Eyebrow>JOUW JAAR</Eyebrow>
        <p className="font-display text-xl leading-snug" style={{ color: 'var(--color-ink)' }}>
          {mainGoal ? mainGoal.name : 'Je programma'}
        </p>
        {goalDate && (
          <p className="-mt-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
            {formatDateNL(goalDate)} · nog {weeksLeft} {weeksLeft === 1 ? 'week' : 'weken'}
          </p>
        )}
        <div className="relative flex h-3 overflow-hidden rounded-full" role="img" aria-label="Je fases tot aan het doel">
          {phases.map((p) => (
            <span key={p.id} style={{ flexGrow: p.weeks.length, flexBasis: 0, background: PHASE_COLOR[p.id] ?? 'var(--color-stone)', opacity: p.current ? 1 : 0.6 }} />
          ))}
          {nowIndex >= 0 && <span className="absolute inset-y-0 w-0.5" style={{ left: `${((nowIndex + 0.5) / totalWeeks) * 100}%`, background: 'var(--color-ink)' }} aria-hidden="true" />}
        </div>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          Elke fase gaat in golven van vier weken: wennen, opbouw, zwaarste week, rustweek. Tik op een fase voor de weken, en op een week om hem te openen.
        </p>
      </Card>

      {phases.map((p) => (
        <PhaseCard key={p.id} phase={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? undefined : p.id)} onSelectWeek={onSelectWeek} />
      ))}
    </div>
  );
}

function PhaseCard({ phase, open, onToggle, onSelectWeek }: { phase: SeasonPhase; open: boolean; onToggle: () => void; onSelectWeek: (weekStart: string) => void }) {
  const color = PHASE_COLOR[phase.id] ?? 'var(--color-stone)';
  const past = phase.weeks.every((w) => w.past);
  return (
    <Card className="flex flex-col gap-3">
      <button onClick={onToggle} className="flex items-start justify-between gap-3 text-left" aria-expanded={open}>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: past ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
            {phase.name}
            {phase.current && <span className="text-xs font-normal" style={{ color: 'var(--color-gold)' }}>nu</span>}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {formatDateNL(phase.from)} tot {formatDateNL(phase.until)} · {phase.weeks.length} {phase.weeks.length === 1 ? 'week' : 'weken'}
          </p>
        </div>
        <span className="text-xs" style={{ color: 'var(--color-ink-dim)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} aria-hidden="true"><Icon name="omlaag" size={16} /></span>
      </button>

      {(open || phase.current) && phase.description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{phase.description}</p>
      )}
      {phase.changes.length > 0 && (
        <ul className="flex flex-col gap-1">
          {phase.changes.map((c) => (
            <li key={c} className="flex gap-2 text-xs leading-snug" style={{ color: c.startsWith('Wedstrijd') ? 'var(--color-gold)' : 'var(--color-ink)' }}>
              <span aria-hidden="true" style={{ color }}>{c.startsWith('Wedstrijd') ? <Icon name="vlag" size={14} /> : '·'}</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="flex flex-col">
          {phase.weeks.map((w) => <WeekRow key={w.weekStart} week={w} onSelect={() => onSelectWeek(w.weekStart)} />)}
        </div>
      )}
    </Card>
  );
}

function WeekRow({ week, onSelect }: { week: SeasonWeek; onSelect: () => void }) {
  const rest = week.waveLabel === 'Rustweek';
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-1 border-t py-2.5 text-left"
      style={{ borderColor: 'var(--color-card-border)', opacity: week.past ? 0.6 : 1 }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm" style={{ color: week.current ? 'var(--color-gold)' : 'var(--color-ink)' }}>
          Week {week.number} · {formatDateNL(week.weekStart)}
          {week.current && <span className="text-xs"> · nu</span>}
        </p>
        <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
          {week.done ? `${week.done.done} van ${week.done.planned} gedaan` : week.totalMinutes > 0 ? formatHoursMinutesNL(week.totalMinutes) : ''}
        </span>
      </div>
      <p className="text-xs" style={{ color: rest ? 'var(--color-alpine)' : 'var(--color-ink-dim)' }}>{week.waveLabel}</p>
      {week.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {week.items.map((i, n) => (
            <span
              key={`${n}-${i.label}`}
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: i.kind === 'race' || i.kind === 'test' ? 'var(--color-bronze)' : 'var(--color-card-border)',
                color: i.kind === 'race' ? 'var(--color-gold)' : 'var(--color-ink)',
                background: 'var(--color-charcoal)',
              }}
            >
              {i.kind === 'race' && <Icon name="vlag" size={14} className="inline align-[-2px]" />}{i.kind === 'race' ? ' ' : ''}{i.label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
