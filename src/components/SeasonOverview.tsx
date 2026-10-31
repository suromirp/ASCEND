import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { leftOutOfCount } from '../engine/weekLogs';
import { buildSeasonPlan, type SeasonPhase, type SeasonWeek } from '../engine/seasonPlan';
import { programAnchorDate } from '../engine/programLayout';
import { PHASE_COLOR } from '../data/phaseColors';
import { formatDateNL, formatHoursMinutesNL, todayISO } from '../utils/dates';
import { Card, StatusPill } from './ui';
import { Icon, type IconName } from './icons';
import { mainGoal as findMainGoal } from '../engine/mainGoal';

// Week → Jaaroverzicht: the whole road to the main goal. A schematic climb on
// top (phases as stretches of one mountain line), then the phases as cards
// (the current one open), and inside each phase its weeks with the sessions
// that matter. Tapping a week opens it in the week view.

const phaseWeeks = (p: SeasonPhase) => (p.weeks.length === 1 ? 'week' : 'weken');

function sentenceCase(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function SeasonOverview({ onSelectWeek }: { onSelectWeek: (weekStart: string) => void }) {
  const { program, plannedSessions, sessionLogs, templates, trainingGoals, goalMilestones, planChangeLog, settings } = useAppData();
  const today = todayISO();
  const phases = useMemo(
    () => (program ? buildSeasonPlan(program, plannedSessions, sessionLogs, templates, today, leftOutOfCount(plannedSessions, planChangeLog, settings.illnessEpisodes, today, program.startDate)) : []),
    [program, plannedSessions, sessionLogs, templates, today, planChangeLog, settings.illnessEpisodes],
  );
  const [open, setOpen] = useState<string | undefined>(() => phases.find((p) => p.current)?.id);
  if (!program || phases.length === 0) return null;

  const goalDate = programAnchorDate(trainingGoals, goalMilestones, today);
  const ladder = new Set(goalMilestones.map((m) => m.goalId));
  const mainGoal = findMainGoal(trainingGoals, ladder);

  // Tap on the profile: open that phase and bring it into view.
  function jumpTo(id: string) {
    setOpen(id);
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => document.getElementById(`fase-${id}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }));
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-3">
        <ClimbProfile phases={phases} goalName={mainGoal?.name} goalDate={goalDate} onPick={jumpTo} />
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {phases.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PHASE_COLOR[p.id] ?? 'var(--color-ink-dim)' }} aria-hidden="true" />
              {sentenceCase(p.name)}
            </li>
          ))}
        </ul>
      </Card>

      {phases.map((p) => (
        <PhaseCard key={p.id} phase={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? undefined : p.id)} onSelectWeek={onSelectWeek} />
      ))}
    </div>
  );
}

// The year as a climb: a schematic elevation profile, not data. Each phase is
// one stretch of the line, as long as its weeks, and climbs a fixed step.
const W = 296;
const H = 150;
const PAD_L = 8;
const PAD_R = 14;
const BASE_Y = 128;
const TOP_Y = 44;

function ClimbProfile({ phases, goalName, goalDate, onPick }: { phases: SeasonPhase[]; goalName?: string; goalDate?: string; onPick: (id: string) => void }) {
  const weeks = phases.flatMap((p) => p.weeks);
  const total = weeks.length;
  const plotW = W - PAD_L - PAD_R;
  const xOf = (weekPos: number) => PAD_L + (weekPos / total) * plotW;
  const yAt = (k: number, f: number) => BASE_Y - ((k + f) / phases.length) * (BASE_Y - TOP_Y);

  const stretches = phases.map((p, k) => {
    const at = phases.slice(0, k).reduce((n, q) => n + q.weeks.length, 0);
    return { p, k, x0: xOf(at), x1: xOf(at + p.weeks.length), at };
  });
  // The y of the line at a (fractional) week position.
  const yAtWeek = (pos: number) => {
    const s = stretches.find((st) => pos <= st.at + st.p.weeks.length) ?? stretches[stretches.length - 1];
    return yAt(s.k, Math.min(1, Math.max(0, (pos - s.at) / s.p.weeks.length)));
  };
  const nowIndex = weeks.findIndex((w) => w.current);
  const raceIndex = weeks.findIndex((w) => w.items.some((i) => i.kind === 'race'));
  const nowX = nowIndex >= 0 ? xOf(nowIndex + 0.5) : undefined;
  const nowY = nowIndex >= 0 ? yAtWeek(nowIndex + 0.5) : undefined;
  const nowPhase = phases.find((p) => p.current);

  const label =
    `Je weg naar ${goalName ?? 'je doel'}${goalDate ? ` op ${formatDateNL(goalDate)}` : ''}: ` +
    phases.map((p) => `${sentenceCase(p.name)}, ${p.weeks.length} ${phaseWeeks(p)}`).join('; ') +
    `. ${nowPhase ? `Je zit nu in ${sentenceCase(nowPhase.name)}.` : 'Je zit nu niet in een fase.'}` +
    (raceIndex >= 0 ? ' Onderweg staat een wedstrijd.' : '');
  const first = goalName ? goalName.split(' ')[0] : 'Doel';
  // Keep the "nu" label inside the picture.
  const nowLabelX = nowX === undefined ? 0 : Math.min(Math.max(nowX, PAD_L + 14), W - 22);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="group" aria-label={label}>
      {stretches.map(({ p, k, x0, x1 }) => {
        const color = PHASE_COLOR[p.id] ?? 'var(--color-ink-dim)';
        const y0 = yAt(k, 0);
        const y1 = yAt(k, 1);
        return (
          <g
            key={p.id}
            role="button"
            tabIndex={0}
            className="[&:focus-visible>rect]:stroke-[var(--color-status)]"
            aria-label={`${sentenceCase(p.name)}, ${p.weeks.length} ${phaseWeeks(p)}. Open deze fase`}
            onClick={() => onPick(p.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(p.id); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            {/* Het vlak is het tikdoel en bij Tab-focus de ring (ijs), binnen het beeld zodat hij niet wordt afgeknipt. */}
            <rect x={x0 + 1} y={1} width={Math.max(0, x1 - x0 - 2)} height={H - 2} rx={8} fill="transparent" stroke="transparent" strokeWidth={2} />
            <polygon points={`${x0},${BASE_Y + 8} ${x0},${y0} ${x1},${y1} ${x1},${BASE_Y + 8}`} fill={color} opacity={p.current ? 0.32 : 0.16} />
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={3.5} strokeLinecap="round" opacity={p.current || p.weeks.every((w) => w.past) ? 1 : 0.75} />
          </g>
        );
      })}
      {stretches.slice(1).map(({ p, x0 }) => (
        <line key={`d-${p.id}`} x1={x0} x2={x0} y1={BASE_Y - 2} y2={BASE_Y + 8} stroke="var(--color-card)" strokeWidth={2} />
      ))}
      <line x1={PAD_L} x2={W - PAD_R} y1={BASE_Y + 8} y2={BASE_Y + 8} stroke="var(--color-card-border)" strokeWidth={1} />

      {raceIndex >= 0 && (() => {
        const x = xOf(raceIndex + 0.5);
        const y = yAtWeek(raceIndex + 0.5);
        return (
          <g aria-hidden="true">
            <line x1={x} y1={y} x2={x} y2={y - 20} stroke="var(--color-ink)" strokeWidth={1.6} strokeLinecap="round" />
            <path d={`M${x} ${y - 20} L${x + 11} ${y - 16} L${x} ${y - 12} Z`} fill="var(--color-ink)" />
          </g>
        );
      })()}

      <g aria-hidden="true">
        <circle cx={W - PAD_R} cy={TOP_Y} r={4.5} fill="var(--color-ink)" />
        <text x={W - PAD_R + 2} y={TOP_Y - 22} textAnchor="end" fontSize={13} fontWeight={600} fill="var(--color-ink)" fontFamily="var(--font-sans)">{first}</text>
        {goalDate && <text x={W - PAD_R + 2} y={TOP_Y - 8} textAnchor="end" fontSize={12} fill="var(--color-ink-dim)" fontFamily="var(--font-sans)">{formatDateNL(goalDate)}</text>}
      </g>

      {nowX !== undefined && nowY !== undefined && (
        <g aria-hidden="true">
          <circle cx={nowX} cy={nowY} r={9} fill="var(--color-status)" opacity={0.25} />
          <circle cx={nowX} cy={nowY} r={5} fill="var(--color-status)" stroke="var(--color-card)" strokeWidth={2} />
          <rect x={nowLabelX - 14} y={nowY - 36} width={28} height={20} rx={10} fill="var(--color-status)" />
          <text x={nowLabelX} y={nowY - 22} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-on-status)" fontFamily="var(--font-sans)">nu</text>
        </g>
      )}
    </svg>
  );
}

function changeIcon(c: string): IconName {
  if (c.startsWith('Wedstrijd:')) return 'vlag';
  if (c.startsWith('Wedstrijdblok') || c.startsWith('Testloop')) return 'timer';
  if (c.startsWith('Zaterdag')) return 'week';
  if (/berg|wandel|hike/i.test(c)) return 'wandelen';
  return 'lopen';
}

function PhaseCard({ phase, open, onToggle, onSelectWeek }: { phase: SeasonPhase; open: boolean; onToggle: () => void; onSelectWeek: (weekStart: string) => void }) {
  const color = PHASE_COLOR[phase.id] ?? 'var(--color-ink-dim)';
  const total = phase.weeks.length;
  const passed = phase.weeks.filter((w) => w.past).length;
  const past = passed === total;
  const showProgress = phase.current || past;
  const currentWeek = phase.weeks.find((w) => w.current);
  const weekNow = currentWeek?.weekInPhase ?? passed;
  const progressValue = past ? 1 : (passed + (currentWeek ? 1 : 0)) / total;
  return (
    <div
      id={`fase-${phase.id}`}
      className="scroll-mt-4 rounded-2xl"
      style={{ boxShadow: phase.current ? '0 0 0 1px color-mix(in srgb, var(--color-action) 50%, transparent)' : undefined }}
    >
      <Card className="flex flex-col gap-3">
        <button onClick={onToggle} className="flex min-h-[44px] items-center justify-between gap-3 text-left" aria-expanded={open}>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-semibold" style={{ color: past ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
              <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
              {sentenceCase(phase.name)}
              {phase.current && <StatusPill tone="status">Nu</StatusPill>}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              {formatDateNL(phase.from)} tot {formatDateNL(phase.until)} · {total} {phaseWeeks(phase)}
            </p>
          </div>
          <span className="shrink-0" style={{ color: 'var(--color-ink-dim)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} aria-hidden="true"><Icon name="omlaag" size={18} /></span>
        </button>

        {showProgress && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-track)' }} role="img" aria-label={past ? 'Fase afgerond' : `Week ${weekNow} van ${total}`}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(progressValue * 100)}%`, background: color }} />
            </div>
            <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
              {past ? 'Afgerond' : `Week ${weekNow} van ${total}`}
            </span>
          </div>
        )}

        {open && phase.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{phase.description}</p>
        )}
        {phase.changes.length > 0 && (
          <ul className="flex flex-col gap-2">
            {phase.changes.map((c) => (
              <li key={c} className="flex items-start gap-2.5 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--color-ink-dim)' }} aria-hidden="true"><Icon name={changeIcon(c)} size={16} /></span>
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
    </div>
  );
}

function WeekRow({ week, onSelect }: { week: SeasonWeek; onSelect: () => void }) {
  const rest = week.waveLabel === 'Rustweek';
  const allDone = week.done !== undefined && week.done.done === week.done.planned;
  return (
    <button
      onClick={onSelect}
      className="flex min-h-[52px] flex-col justify-center gap-1.5 border-t py-2.5 text-left"
      style={{ borderColor: 'var(--color-card-border)', opacity: week.past ? 0.7 : 1 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium tabular-nums" style={{ color: 'var(--color-ink)' }}>
            Week {week.number} · {formatDateNL(week.weekStart)}
            {week.current && <StatusPill tone="status">Nu</StatusPill>}
          </p>
          <p className="text-xs" style={{ color: rest ? 'var(--color-sage)' : 'var(--color-ink-dim)' }}>{week.waveLabel}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums" style={{ color: allDone ? 'var(--color-success-text)' : 'var(--color-ink-dim)' }}>
          {allDone && <Icon name="vinkje" size={14} />}
          {week.done ? `${week.done.done} van ${week.done.planned} gedaan` : week.totalMinutes > 0 ? formatHoursMinutesNL(week.totalMinutes) : ''}
        </span>
      </div>
      {week.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {week.items.map((i, n) => (
            <span
              key={`${n}-${i.label}`}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              style={{
                borderColor: i.kind === 'race' || i.kind === 'test' ? 'var(--color-control-border)' : 'var(--color-card-border)',
                color: 'var(--color-ink)',
                background: 'var(--color-charcoal)',
              }}
            >
              {i.kind === 'race' && <Icon name="vlag" size={13} />}{i.label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
