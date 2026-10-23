import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { goalPlanRole, isRaceGoal, raceBlocks, RACE_BLOCK_WEEKS } from '../engine/raceBlock';
import { programAnchorDate } from '../engine/programLayout';
import { addDays, daysBetween, formatDateNL, mondayOfWeek, resolveProgramWeek, todayISO } from '../utils/dates';
import { Card, Eyebrow } from './ui';
import { PhaseEditor } from './PhaseEditor';
import { PHASE_COLOR } from '../data/phaseColors';
import type { TrainingGoal } from '../models/goals';
import { Icon } from './icons';
import { useHorizonChange } from './useHorizonChange';

// Doelen: the whole season on one card (production feedback: "het moet
// voelen dat je naar een groter doel toewerkt en ondertussen kleinere
// doelen meepakt"). The phases toward the main goal as one bar, every
// tussendoel as a flag on it with its tempo block shaded, what each goal
// does to the plan in one line, and the phases adjustable right here.
export function SeasonCard({ onOpenGoal }: { onOpenGoal?: (goal: TrainingGoal) => void }) {
  const { program, trainingGoals, goalMilestones, planGoalRole } = useAppData();
  const [editPhases, setEditPhases] = useState(false);
  // Tussendoel or Alleen volgen changes the planning: first the proposal,
  // stored only with Akkoord (components/useHorizonChange.tsx).
  const horizon = useHorizonChange();
  if (!program) return null;
  const pickRole = (goal: TrainingGoal, role: 'secondary' | 'track') =>
    void horizon.propose(() => planGoalRole(goal.id, role), { eyebrow: 'Rol in je plan', ask: 'always', declined: 'Je doel en je planning blijven zoals ze waren.' });
  const today = todayISO();
  const ladder = new Set(goalMilestones.map((m) => m.goalId));
  const main = trainingGoals.find((g) => g.status === 'active' && ladder.has(g.id));
  const anchor = programAnchorDate(trainingGoals, goalMilestones, today);
  const blocks = raceBlocks(trainingGoals, main?.id, anchor, today);
  const others = trainingGoals.filter((g) => g.status === 'active' && g.id !== main?.id && g.targetDate && g.targetDate >= today);

  const start = mondayOfWeek(program.startDate);
  const totalWeeks = program.phases.reduce((n, p) => n + p.weekCount, 0);
  const end = addDays(start, totalWeeks * 7);
  const at = (date: string) => Math.min(100, Math.max(0, (daysBetween(start, date) / Math.max(1, daysBetween(start, end))) * 100));
  const nowPos = position(program, today);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Eyebrow>JOUW SEIZOEN</Eyebrow>
        {main ? (
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>
            Naar <span style={{ color: 'var(--color-gold)' }}>{main.name}</span> op {formatDateNL(main.targetDate!)}.
            {nowPos ? ` Je zit nu in week ${nowPos.week} van ${totalWeeks}, ${nowPos.phase}.` : ''}
          </p>
        ) : (
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Geef je hoofddoel een datum, dan rekent ASCEND de fases ernaartoe uit.</p>
        )}
      </div>

      {/* The phases, the tempo blocks shaded on top, a flag per tussendoel. */}
      <div className="relative pt-5">
        <div className="relative flex h-3 overflow-hidden rounded-full" role="img" aria-label="Je fases tot aan je hoofddoel, met je tussendoelen">
          {program.phases.map((p) => (
            <span key={p.id} style={{ flexGrow: p.weekCount, flexBasis: 0, background: PHASE_COLOR[p.id] ?? 'var(--color-stone)', opacity: 0.85 }} />
          ))}
          {blocks.map((b) => (
            <span key={b.goalId} className="absolute inset-y-0" style={{ left: `${at(b.blockStart)}%`, width: `${at(b.raceDate) - at(b.blockStart)}%`, background: 'var(--color-ink)', opacity: 0.25 }} />
          ))}
          {at(today) > 0 && at(today) < 100 && <span className="absolute inset-y-0 w-0.5" style={{ left: `${at(today)}%`, background: 'var(--color-ink)' }} aria-hidden="true" />}
        </div>
        {blocks.map((b) => (
          <span key={b.goalId} className="absolute top-0 -translate-x-1/2 text-xs" style={{ left: `${at(b.raceDate)}%`, color: 'var(--color-gold)' }} aria-hidden="true"><Icon name="vlag" size={14} /></span>
        ))}
        <div className="mt-1.5 flex justify-between text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          <span>{formatDateNL(start)}</span>
          {main?.targetDate && <span>{formatDateNL(main.targetDate)}</span>}
        </div>
      </div>

      {/* Every other goal: where it falls and what it does to the plan. */}
      {others.length > 0 && (
        <div className="flex flex-col">
          {others.map((g) => {
            const role = goalPlanRole(g, main?.id);
            const race = isRaceGoal(g);
            const pos = position(program, g.targetDate!);
            const blockStart = addDays(mondayOfWeek(g.targetDate!), -7 * RACE_BLOCK_WEEKS);
            const afterMain = main?.targetDate && g.targetDate! >= main.targetDate;
            return (
              <div key={g.id} className="flex flex-col gap-1.5 border-t py-3" style={{ borderColor: 'var(--color-card-border)' }}>
                <button onClick={() => onOpenGoal?.(g)} className="flex items-baseline justify-between gap-3 text-left">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    {role === 'secondary' && <span style={{ color: 'var(--color-gold)' }}><Icon name="vlag" size={14} className="inline align-[-2px]" /> </span>}{g.name}
                  </span>
                  <span className="shrink-0 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{formatDateNL(g.targetDate!)}</span>
                </button>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                  {afterMain
                    ? 'Na je hoofddoel: ASCEND volgt het, je plan gaat er nog niet naartoe.'
                    : role === 'secondary'
                      ? `Tussendoel${pos ? `, in ${pos.phase} (week ${pos.week})` : ''}. Testloop in de week van ${formatDateNL(addDays(blockStart, -7))}, tempolopen vanaf de week van ${formatDateNL(blockStart)}, de wedstrijdweek afbouwen.`
                      : race
                        ? 'Alleen volgen: je planning verandert er niet voor.'
                        : 'ASCEND volgt dit doel; alleen een hardloopwedstrijd kan nu een eigen blok krijgen.'}
                </p>
                {race && !afterMain && (
                  <>
                  <div className="flex gap-2" role="radiogroup" aria-label={`Rol van ${g.name}`}>
                    {([['secondary', 'Tussendoel'], ['track', 'Alleen volgen']] as const).map(([value, label]) => (
                      <button
                        key={value}
                        role="radio"
                        aria-checked={role === value}
                        onClick={() => { if (role !== value) pickRole(g, value); }}
                        disabled={horizon.busy}
                        className="min-h-[44px] flex-1 rounded-lg border text-xs font-semibold"
                        style={{ borderColor: role === value ? 'var(--color-bronze)' : 'var(--color-card-border)', color: role === value ? 'var(--color-gold)' : 'var(--color-ink-dim)', background: 'var(--color-charcoal)' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                    <span style={{ color: 'var(--color-ink)' }}>Tussendoel:</span> ASCEND traint ervoor, met testlopen, tempolopen en een lichte wedstrijdweek. <span style={{ color: 'var(--color-ink)' }}>Alleen volgen:</span> je ziet hoe je ervoor staat, je planning verandert niet.
                  </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
        De lengte van de fases rekent ASCEND zelf uit vanaf je hoofddoel; aanpassen hoeft niet. Wil je eerder opbouwen, maak dan de Opbouw langer: de basis krijgt wat overblijft.
      </p>
      <button onClick={() => setEditPhases((v) => !v)} className="min-h-[44px] self-start text-xs underline underline-offset-2" style={{ color: 'var(--color-bronze)' }} aria-expanded={editPhases}>
        {editPhases ? 'Fases sluiten' : 'Fases aanpassen'}
      </button>
      {editPhases && <PhaseEditor goalDate={main?.targetDate} />}
      {horizon.note && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }} role="status">{horizon.note}</p>}
      {horizon.sheet}
    </Card>
  );
}

function position(program: NonNullable<ReturnType<typeof useAppData>['program']>, date: string): { week: number; phase: string } | undefined {
  const p = resolveProgramWeek(program, date);
  return p ? { week: p.weekInProgram, phase: p.phase.name.toLowerCase() } : undefined;
}
