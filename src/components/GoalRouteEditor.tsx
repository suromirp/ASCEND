// ASCEND — route editor for a multi-day goal (goal-flow redesign, Fase 1).
//
// Mirrors how a trip is actually planned: how it's undertaken (one unbroken
// push or in stages), the route totals, what one stage asks, and — derived,
// never typed twice — what an average day looks like. Separately, and only
// if wanted, a training day: a heavier, representative day ASCEND trains
// toward, without overwriting the computed average. All conversion logic
// lives in engine/goalRoute.ts; this file only edits requirements and
// renders what that module computes.

import { useState, useRef } from 'react';
import type { TrainingGoal, GoalRequirement, GoalExecution } from '../models/goals';
import type { Unit } from '../models/units';
import {
  averageDayValue,
  hasTrainingDay,
  routeDayParts,
  routeDayWord,
  normalizeRouteRequirements,
  routeDiscipline,
  ROUTE_KINDS,
  type RouteKind,
} from '../engine/goalRoute';
import { formatNumberNL } from '../utils/number';
import { makeId } from '../utils/id';
import { NumberField } from './NumberField';
import { useAppData } from '../state/AppDataContext';
import { packSharePct } from '../engine/bodyWeight';
import { Eyebrow } from './ui';

const ROUTE_UNIT: Record<RouteKind, Unit> = { distance: 'km', elevationGain: 'm_elevation_gain', elevationLoss: 'm_elevation_loss' };
const ROUTE_SUFFIX: Record<RouteKind, string> = { distance: 'km', elevationGain: 'm D+', elevationLoss: 'm D−' };
const OVERRIDE_LABEL: Record<RouteKind, string> = { distance: 'Afstand', elevationGain: 'Stijging', elevationLoss: 'Daling' };

const ROUTE_SPORTS: { value: string; label: string; dayWord: string; verb: string }[] = [
  { value: 'hiking', label: 'Hiken', dayWord: 'loopdagen', verb: 'lopen' },
  { value: 'cycling', label: 'Fietsen', dayWord: 'fietsdagen', verb: 'fietsen' },
];

function isPerDay(r: GoalRequirement): boolean {
  return r.scope === 'PER_DAY';
}

// Sets (or clears) one requirement, identified by kind + whether it's a
// per-day override. An empty day count keeps its requirement without a
// target: the goal stays multi-day, just not filled in yet.
function setRequirement(
  requirements: GoalRequirement[],
  kind: GoalRequirement['kind'],
  perDay: boolean,
  amount: number | undefined,
  unit: Unit,
  scope: GoalRequirement['scope'],
  discipline?: string,
): GoalRequirement[] {
  const existing = requirements.find((r) => r.kind === kind && isPerDay(r) === perDay);
  const others = requirements.filter((r) => r !== existing);
  const keepEmpty = kind === 'eventDays';
  if (amount === undefined || amount <= 0) {
    return keepEmpty ? [...others, { ...(existing ?? { id: makeId('req'), kind, scope }), target: undefined, discipline }] : others;
  }
  return [...others, { ...(existing ?? { id: makeId('req'), kind, scope }), scope, target: { amount, unit }, ...(discipline !== undefined ? { discipline } : {}) }];
}

function amountOf(requirements: GoalRequirement[], kind: GoalRequirement['kind'], perDay = false): number | undefined {
  return requirements.find((r) => r.kind === kind && isPerDay(r) === perDay)?.target?.amount;
}

export function GoalRouteEditor({ goal, onChange }: { goal: TrainingGoal; onChange: (goal: TrainingGoal) => void }) {
  const reqs = goal.requirements;
  const discipline = routeDiscipline(goal);
  const sport = ROUTE_SPORTS.find((s) => s.value === discipline) ?? ROUTE_SPORTS[0];
  const execution: GoalExecution = goal.execution ?? 'stages';
  // A rucksack is a hiking demand; bike bags aren't load carriage
  // (engine/demand.ts never asks it of a cycling goal).
  const carriesPack = discipline !== 'cycling';
  const trainingDaySet = hasTrainingDay(reqs);
  const [editingDay, setEditingDay] = useState(false);
  const dayWord = routeDayWord(discipline);

  function commit(next: GoalRequirement[], nextExecution: GoalExecution = execution) {
    onChange({ ...goal, execution: nextExecution, requirements: normalizeRouteRequirements(next, nextExecution), updatedAt: new Date().toISOString() });
  }

  function setTotal(kind: RouteKind, amount: number | undefined) {
    commit(setRequirement(reqs, kind, false, amount, ROUTE_UNIT[kind], 'TOTAL_EVENT', kind === 'distance' ? discipline : undefined));
  }

  function setOverride(kind: RouteKind, amount: number | undefined) {
    commit(setRequirement(reqs, kind, true, amount, ROUTE_UNIT[kind], 'PER_DAY', kind === 'distance' ? discipline : undefined));
  }

  function setExecution(next: GoalExecution) {
    // Switching to stages starts the longest stage empty rather than
    // silently keeping the whole-trip value continuous mode wrote there.
    const base = next === 'stages' && execution === 'continuous' ? reqs.filter((r) => r.kind !== 'consecutiveDays') : reqs;
    commit(base, next);
  }

  function resetOverrides() {
    commit(reqs.filter((r) => !(isPerDay(r) && ROUTE_KINDS.includes(r.kind as RouteKind))));
    setEditingDay(false);
  }

  const days = amountOf(reqs, 'eventDays');
  const longest = amountOf(reqs, 'consecutiveDays');
  const averageParts = routeDayParts(reqs, 'average', carriesPack);
  const trainingParts = routeDayParts(reqs, 'training', carriesPack);

  const { settings } = useAppData();
  const packKg = amountOf(reqs, 'packWeight');
  const lastPackKg = useRef<number | undefined>(undefined);
  const packShare = packKg ? packSharePct(packKg, settings.weightEntries) : undefined;

  const packField = (
    <NumberField
      label="Rugzak"
      unit="kg"
      decimals={1}
      value={amountOf(reqs, 'packWeight')}
      onChange={(v) => commit(setRequirement(reqs, 'packWeight', false, v, 'kg', 'SINGLE_EVENT'))}
      helper={`Wat je gemiddeld op je rug hebt, inclusief water en eten.${packShare !== undefined ? ` Dat is ${packShare}% van je lichaamsgewicht${packShare > 20 ? '; boven de 20% wordt het zwaar voor rug en voeten' : ''}.` : ''}`}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      {ROUTE_SPORTS.length > 1 && (
        <Segmented
          label="Sport"
          value={discipline}
          options={ROUTE_SPORTS.map((s) => ({ value: s.value, label: s.label }))}
          onChange={(value) => {
            // Cycling has no pack; switching back restores the weight you
            // had filled in instead of losing it.
            if (value === 'cycling' && packKg) lastPackKg.current = packKg;
            let next = reqs.map((r) => (r.kind === 'eventDays' || r.kind === 'distance' ? { ...r, discipline: value } : r)).filter((r) => value !== 'cycling' || r.kind !== 'packWeight');
            if (value !== 'cycling' && !packKg && lastPackKg.current) next = setRequirement(next, 'packWeight', false, lastPackKg.current, 'kg', 'SINGLE_EVENT');
            commit(next);
          }}
        />
      )}

      <Segmented
        label="Uitvoering"
        value={execution}
        options={[
          { value: 'continuous', label: 'Aaneengesloten' },
          { value: 'stages', label: 'Meerdere etappes' },
        ]}
        onChange={(value) => setExecution(value as GoalExecution)}
        helper={execution === 'continuous' ? 'De hele tocht in één keer, dag na dag.' : 'De tocht in delen, met tijd thuis of rust ertussen.'}
      />

      <section className="flex flex-col gap-3">
        <Eyebrow>TOTALE TOCHT</Eyebrow>
        <NumberField label="Afstand" unit="km" decimals={1} value={amountOf(reqs, 'distance')} onChange={(v) => setTotal('distance', v)} placeholder="600" />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Stijging" unit="m D+" value={amountOf(reqs, 'elevationGain')} onChange={(v) => setTotal('elevationGain', v)} placeholder="30.000" />
          <NumberField label="Daling" unit="m D−" value={amountOf(reqs, 'elevationLoss')} onChange={(v) => setTotal('elevationLoss', v)} placeholder="30.000" />
        </div>
        <p className="-mt-1 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Alle hoogtemeters omhoog en omlaag over de volledige tocht.</p>
        <NumberField
          label={`Aantal ${sport.dayWord}`}
          unit="dagen"
          value={days}
          onChange={(v) => commit(setRequirement(reqs, 'eventDays', false, v, 'days', 'TOTAL_EVENT', discipline))}
          helper="Alleen de dagen dat je echt onderweg bent, rustdagen niet meegeteld."
        />
        {execution === 'continuous' && carriesPack && packField}
      </section>

      {execution === 'stages' && (
        <section className="flex flex-col gap-3">
          <Eyebrow>PER ETAPPE</Eyebrow>
          <NumberField
            label="Langste etappe"
            unit="dagen"
            value={longest}
            onChange={(v) => commit(setRequirement(reqs, 'consecutiveDays', false, v, 'days', 'CONSECUTIVE_DAYS'))}
            helper={`Het maximale aantal dagen dat je tijdens één etappe achter elkaar verwacht te ${sport.verb}.`}
          />
          {longest !== undefined && days !== undefined && longest > days && (
            <p className="-mt-2 text-[11px]" style={{ color: 'var(--color-warning)' }}>De langste etappe kan niet langer zijn dan de hele tocht.</p>
          )}
          {carriesPack && packField}
        </section>
      )}

      <section className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
        <span className="text-[11px] font-medium tracking-[0.18em]" style={{ color: 'var(--color-ink-dim)' }}>
          GEMIDDELDE {dayWord.singular.toUpperCase()} · berekend
        </span>
        {averageParts.length > 0 ? (
          <>
            <p className="mt-1.5 text-sm font-medium" style={{ color: trainingDaySet ? 'var(--color-ink)' : 'var(--color-gold)' }}>{averageParts.join(' · ')}</p>
            {days !== undefined && days > 1 && (
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>Gebaseerd op {formatNumberNL(days, 0)} {dayWord.plural}.</p>
            )}
          </>
        ) : (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Vul de afstand en het aantal {dayWord.plural} in, dan rekent ASCEND een gemiddelde {dayWord.singular} voor je uit.</p>
        )}

        <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
          {trainingDaySet || editingDay ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium tracking-[0.18em]" style={{ color: 'var(--color-ink-dim)' }}>TRAININGSDAG · zelf gekozen</span>
                {editingDay ? (
                  <button onClick={() => setEditingDay(false)} className="text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>klaar</button>
                ) : (
                  <button onClick={() => setEditingDay(true)} className="text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>wijzigen</button>
                )}
              </div>
              {trainingParts.length > 0 && (
                <p className="mt-1.5 text-sm font-medium" style={{ color: 'var(--color-gold)' }}>{trainingParts.join(' · ')}</p>
              )}
              {editingDay && (
                <div className="mt-3 flex flex-col gap-2">
                  {ROUTE_KINDS.map((k) => {
                    const average = averageDayValue(reqs, k);
                    return (
                      <NumberField
                        key={k}
                        label={OVERRIDE_LABEL[k]}
                        unit={ROUTE_SUFFIX[k]}
                        decimals={k === 'distance' ? 1 : 0}
                        compact
                        value={amountOf(reqs, k, true)}
                        onChange={(v) => setOverride(k, v)}
                        placeholder={average ? formatNumberNL(average.value.amount, k === 'distance' ? 1 : 0) : undefined}
                      />
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                ASCEND richt je training op deze dag. Wat je leeg laat, komt uit de gemiddelde {dayWord.singular}. Het gemiddelde zelf blijft gewoon berekend.
              </p>
              {trainingDaySet && (
                <button onClick={resetOverrides} className="mt-2 text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>Trainingsdag verwijderen</button>
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                ASCEND traint nu richting de gemiddelde {dayWord.singular}. Wil je je voorbereiden op een zwaardere dag uit de tocht, stel die dan in als trainingsdag.
              </p>
              <button onClick={() => setEditingDay(true)} className="mt-2 text-xs font-medium underline" style={{ color: 'var(--color-gold)' }}>Trainingsdag instellen</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function Segmented({
  label,
  value,
  options,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</p>
      <div className="mt-1 flex gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all active:scale-[0.98]"
              style={selected ? { background: 'var(--color-card)', color: 'var(--color-gold)', boxShadow: 'inset 0 0 0 1px var(--color-card-border)' } : { color: 'var(--color-ink-dim)' }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {helper && <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{helper}</p>}
    </div>
  );
}
