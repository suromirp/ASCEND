// ASCEND — Goal Setup Wizard (Technical Architecture v0.3.1 REVISED,
// Phase 7 — "Goal Setup & Plan Preview UX bovenop de bestaande locked
// engines").
//
// Built entirely on existing engines — never a new decision-making formula:
// engine/goalSetupAssist.ts for "what does ASCEND still need to ask",
// engine/goalRoute.ts for turning route totals into a typical day,
// engine/goalActivation.ts for the actual Plan Preview and the
// single-transaction activation. Used both to create a brand-new goal and
// to edit an existing one — one flow, not two.
//
// Goal-flow redesign (Fase 1): a multi-day trip is entered as a route
// (GoalRouteEditor), capacity is asked once via the hardest recent activity
// (GoalCapacityStep), and the preview mirrors the input structure and
// compares capability against a typical day, never against route totals.

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { TrainingGoal, GoalRequirement } from '../models/goals';
import type { CapabilityEvidence, GapStatus, Confidence, CapabilityGap } from '../models/capability';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability, TrainingGuardrail } from '../models/goalEngineConfig';
import type { GoalActivationPlan } from '../models/planChange';
import type { Unit } from '../models/units';
import { UNIT_LABEL, formatCapabilityValue } from '../models/units';
import { DISCIPLINE_LABEL, DISCIPLINE_OPTIONS } from '../models/disciplines';
import { computeGoalActivationPlan } from '../engine/goalActivation';
import { identifyBaselineNeeds } from '../engine/goalSetupAssist';
import { extractEvidenceFromLogs, keyId } from '../engine/capability';
import { routeDayParts, routeDayWord, routeTotal, eventDaysRequirement, isMultiDayGoal, longestStageDays, routeGoalComplete, routeDiscipline, ROUTE_KINDS } from '../engine/goalRoute';
import { capabilityKeyLabel } from '../data/baselineQuestions';
import { todayISO, formatDateNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { formatNumberNL } from '../utils/number';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { FEASIBILITY_LABEL } from './GoalFocusCard';
import { Portal } from './Portal';
import { NumberField } from './NumberField';
import { GoalRouteEditor } from './GoalRouteEditor';
import { GoalCapacityStep } from './GoalCapacityStep';
import { useSheetClose } from '../utils/useSheetClose';

const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

type EditableRequirementKind = Exclude<GoalRequirement['kind'], 'manual'>;

const REQUIREMENT_KIND_META: Record<EditableRequirementKind, { label: string; unit: Unit; scope: GoalRequirement['scope']; needsDiscipline?: boolean; decimals: number }> = {
  distance: { label: 'Afstand', unit: 'km', scope: 'TOTAL_EVENT', needsDiscipline: true, decimals: 1 },
  elevationGain: { label: 'Stijging (D+)', unit: 'm_elevation_gain', scope: 'TOTAL_EVENT', decimals: 0 },
  elevationLoss: { label: 'Daling (D−)', unit: 'm_elevation_loss', scope: 'TOTAL_EVENT', decimals: 0 },
  duration: { label: 'Duur', unit: 'min', scope: 'TOTAL_EVENT', needsDiscipline: true, decimals: 0 },
  targetTime: { label: 'Doeltijd', unit: 'min', scope: 'SINGLE_EVENT', needsDiscipline: true, decimals: 0 },
  packWeight: { label: 'Rugzak', unit: 'kg', scope: 'SINGLE_EVENT', decimals: 1 },
  consecutiveDays: { label: 'Dagen achter elkaar', unit: 'days', scope: 'CONSECUTIVE_DAYS', decimals: 0 },
  eventDays: { label: 'Aantal dagen', unit: 'days', scope: 'TOTAL_EVENT', decimals: 0 },
};
// What "+ EIS TOEVOEGEN" offers on a single-day goal. Day counts are not in
// it: making a goal multi-day switches to the route editor instead.
const ADDABLE_KINDS: EditableRequirementKind[] = ['distance', 'elevationGain', 'elevationLoss', 'duration', 'targetTime', 'packWeight'];
const MAKE_MULTI_DAY = '__multi_day__';

const GAP_STATUS_LABEL: Record<GapStatus, string> = {
  exceeds: 'OVERTREFT', meets: 'VOLDOET', near: 'BIJNA', gap: 'GAT', major_gap: 'GROOT GAT', unknown: 'ONBEKEND',
};
const GAP_STATUS_COLOR: Record<GapStatus, string> = {
  exceeds: 'var(--color-success)', meets: 'var(--color-success)', near: 'var(--color-warning)',
  gap: 'var(--color-warning)', major_gap: 'var(--color-danger)', unknown: 'var(--color-ink-dim)',
};
const GAP_SEVERITY_ORDER: Record<GapStatus, number> = { major_gap: 4, gap: 3, near: 2, unknown: 1, meets: 0, exceeds: 0 };
const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'hoog', medium: 'gemiddeld', low: 'laag', unknown: 'onbekend' };
const CONFIDENCE_EXPLANATION: Record<Confidence, string> = {
  high: 'meerdere recente metingen die elkaar bevestigen',
  medium: 'een paar recente metingen',
  low: 'één meting, of alleen oudere gegevens',
  unknown: 'nog geen gegevens',
};

type Step =
  | { kind: 'type' }
  | { kind: 'interpret'; draft: TrainingGoal }
  | { kind: 'baseline'; draft: TrainingGoal }
  | { kind: 'preview'; draft: TrainingGoal }
  | { kind: 'applying' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

type Preset = 'trek' | 'race' | 'custom';

const PRESET_LABEL: Record<Preset, { label: string; note: string }> = {
  trek: { label: 'Meerdaagse tocht', note: 'Wandelen of fietsen over meerdere dagen, aaneengesloten of in etappes. Zoals de GR5.' },
  race: { label: 'Hardloopwedstrijd', note: 'Eén vaste afstand, optioneel een doeltijd.' },
  custom: { label: 'Ander doel', note: 'Stel zelf samen wat dit doel vraagt, bijvoorbeeld een zware dagtocht.' },
};

function applyPreset(preset: Preset, base: TrainingGoal): TrainingGoal {
  if (preset === 'trek') {
    return {
      ...base,
      name: base.name || 'Meerdaagse tocht',
      execution: 'stages',
      requirements: [{ id: makeId('req'), kind: 'eventDays', scope: 'TOTAL_EVENT', discipline: 'hiking' }],
    };
  }
  if (preset === 'race') {
    return { ...base, name: base.name || 'Hardloopwedstrijd', requirements: [{ id: makeId('req'), kind: 'distance', scope: 'SINGLE_EVENT', target: { amount: 42.2, unit: 'km' }, discipline: 'running' }] };
  }
  return base;
}

export function GoalSetupWizard({
  initialGoal,
  mode,
  onClose,
}: {
  initialGoal: TrainingGoal;
  mode: 'create' | 'edit';
  onClose: () => void;
}) {
  const { sessionLogs, capabilityEvidence, plannedSessions, templates, goalEngineConfig, activateGoal } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose);
  const [step, setStep] = useState<Step>(mode === 'create' ? { kind: 'type' } : { kind: 'interpret', draft: initialGoal });

  const asOf = todayISO();
  const logEvidence = useMemo(() => extractEvidenceFromLogs(sessionLogs), [sessionLogs]);
  const allEvidence = useMemo(() => [...logEvidence, ...capabilityEvidence], [logEvidence, capabilityEvidence]);

  async function handleConfirm(plan: GoalActivationPlan) {
    setStep({ kind: 'applying' });
    const result = await activateGoal(plan);
    if (!result.applied) {
      setStep({ kind: 'error', message: 'Er is intussen iets veranderd (nieuwe training of evidence). Open dit doel opnieuw om verder te gaan met de actuele situatie.' });
      return;
    }
    setStep({ kind: 'done' });
  }

  function goToNextAfterInterpret(draft: TrainingGoal) {
    const needs = identifyBaselineNeeds(draft.requirements, allEvidence, asOf);
    setStep(needs.length > 0 ? { kind: 'baseline', draft } : { kind: 'preview', draft });
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={step.kind === 'applying' ? undefined : requestClose}
      >
        <div
          className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="rounded-b-none border-b-0 pb-6">
            <Eyebrow>{mode === 'create' ? 'NIEUW DOEL' : 'DOEL AANPASSEN'}</Eyebrow>

            {step.kind === 'type' && (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Waar werk je naartoe?</p>
                {(['trek', 'race', 'custom'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setStep({ kind: 'interpret', draft: applyPreset(preset, initialGoal) })}
                    className="rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{PRESET_LABEL[preset].label}</p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{PRESET_LABEL[preset].note}</p>
                  </button>
                ))}
                <SecondaryButton onClick={requestClose}>ANNULEREN</SecondaryButton>
              </div>
            )}

            {step.kind === 'interpret' && (
              <InterpretStep
                draft={step.draft}
                allowBack={mode === 'create'}
                onBack={() => setStep({ kind: 'type' })}
                onCancel={requestClose}
                onNext={goToNextAfterInterpret}
              />
            )}

            {step.kind === 'baseline' && (
              <GoalCapacityStep
                draft={step.draft}
                allEvidence={allEvidence}
                logEvidence={logEvidence}
                asOf={asOf}
                onBack={() => setStep({ kind: 'interpret', draft: step.draft })}
                onNext={() => setStep({ kind: 'preview', draft: step.draft })}
              />
            )}

            {step.kind === 'preview' && (
              <PreviewStep
                draft={step.draft}
                allEvidence={allEvidence}
                plannedSessions={plannedSessions}
                templates={templates}
                availability={goalEngineConfig.availability}
                guardrails={goalEngineConfig.guardrails}
                asOf={asOf}
                onBack={() => setStep({ kind: 'interpret', draft: step.draft })}
                onConfirm={handleConfirm}
              />
            )}

            {step.kind === 'applying' && (
              <p className="mt-4 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Bezig met activeren…</p>
            )}

            {step.kind === 'done' && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-success-text)' }}>Doel geactiveerd.</p>
                <PrimaryButton onClick={requestClose}>SLUITEN</PrimaryButton>
              </div>
            )}

            {step.kind === 'error' && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-danger-text)' }}>{step.message}</p>
                <PrimaryButton onClick={requestClose}>SLUITEN</PrimaryButton>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}

function InterpretStep({
  draft,
  allowBack,
  onBack,
  onCancel,
  onNext,
}: {
  draft: TrainingGoal;
  allowBack: boolean;
  onBack: () => void;
  onCancel: () => void;
  onNext: (draft: TrainingGoal) => void;
}) {
  const [local, setLocal] = useState(draft);
  const isRoute = local.execution !== undefined;

  function patchDate(dateOrEmpty: string) {
    const now = new Date().toISOString();
    setLocal((g) =>
      dateOrEmpty
        ? { ...g, status: 'active', targetDate: dateOrEmpty, updatedAt: now }
        : { ...g, status: g.status === 'active' ? 'paused' : g.status, targetDate: undefined, updatedAt: now },
    );
  }

  function addRequirement(kind: EditableRequirementKind) {
    const meta = REQUIREMENT_KIND_META[kind];
    setLocal((g) => ({
      ...g,
      // No `target` yet — the field starts genuinely blank.
      requirements: [...g.requirements, { id: makeId('req'), kind, scope: meta.scope, discipline: meta.needsDiscipline ? '' : undefined }],
    }));
  }

  function makeMultiDay() {
    setLocal((g) => {
      const discipline = g.requirements.find((r) => r.discipline)?.discipline || 'hiking';
      const requirements: GoalRequirement[] = [
        ...g.requirements.filter((r) => r.kind !== 'targetTime' && r.kind !== 'duration'),
        { id: makeId('req'), kind: 'eventDays', scope: 'TOTAL_EVENT', discipline },
      ];
      return {
        ...g,
        execution: 'stages',
        requirements: requirements.map((r) => (r.kind === 'distance' ? { ...r, scope: 'TOTAL_EVENT' as const, discipline } : r)),
      };
    });
  }

  function updateRequirement(id: string, patch: Partial<GoalRequirement>) {
    setLocal((g) => ({ ...g, requirements: g.requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }

  function removeRequirement(id: string) {
    setLocal((g) => ({ ...g, requirements: g.requirements.filter((r) => r.id !== id) }));
  }

  // 'duration' and 'distance' can't coexist meaningfully: engine/demand.ts
  // only reads a bare 'duration' requirement when no 'distance' one exists.
  const hasDistance = local.requirements.some((r) => r.kind === 'distance');
  const hasDuration = local.requirements.some((r) => r.kind === 'duration');
  const availableKinds = ADDABLE_KINDS.filter((k) => {
    if (local.requirements.some((r) => r.kind === k)) return false;
    if (k === 'duration' && hasDistance) return false;
    if (k === 'distance' && hasDuration) return false;
    return true;
  });
  const canProceed = local.name.trim().length > 0 && (isRoute
    ? routeGoalComplete(local)
    : local.requirements.length > 0 && local.requirements.every((r) => (r.target?.amount ?? 0) > 0));

  return (
    <div className="mt-4 flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Naam</label>
          <input
            type="text"
            value={local.name}
            onChange={(e) => setLocal((g) => ({ ...g, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Doeldatum</label>
          <input
            type="date"
            value={local.status === 'active' ? local.targetDate : ''}
            onChange={(e) => patchDate(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
            style={inputStyle}
          />
          {local.status !== 'active' && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>Zonder datum blijft dit doel gepauzeerd.</p>
          )}
        </div>
      </div>

      {isRoute ? (
        <GoalRouteEditor goal={local} onChange={setLocal} />
      ) : (
        <div className="flex flex-col gap-3">
          <Eyebrow>WAT HET DOEL VRAAGT</Eyebrow>
          {local.requirements.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Voeg hieronder minstens één eis toe.</p>
          )}
          {local.requirements.map((r) => (
            <RequirementRow key={r.id} requirement={r} onChange={(patch) => updateRequirement(r.id, patch)} onRemove={() => removeRequirement(r.id)} />
          ))}
          <PaceHint requirements={local.requirements} />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value === MAKE_MULTI_DAY) makeMultiDay();
              else if (e.target.value) addRequirement(e.target.value as EditableRequirementKind);
            }}
            className="self-start rounded-lg border bg-transparent px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}
          >
            <option value="" style={{ background: 'var(--color-charcoal)' }}>+ EIS TOEVOEGEN</option>
            {availableKinds.map((k) => (
              <option key={k} value={k} style={{ background: 'var(--color-charcoal)' }}>{REQUIREMENT_KIND_META[k].label}</option>
            ))}
            <option value={MAKE_MULTI_DAY} style={{ background: 'var(--color-charcoal)' }}>Meerdere dagen (tocht)</option>
          </select>
        </div>
      )}

      <div className="mt-1 flex gap-3">
        <SecondaryButton onClick={allowBack ? onBack : onCancel}>{allowBack ? 'TERUG' : 'ANNULEREN'}</SecondaryButton>
        <PrimaryButton fullWidth={false} onClick={() => onNext(local)} disabled={!canProceed}>VOLGENDE</PrimaryButton>
      </div>
    </div>
  );
}

// A doeltijd on its own says nothing about whether that's realistic — the
// number that actually means something to a runner is pace per km.
function formatPacePerKm(totalMinutes: number, km: number): string {
  const paceMinPerKm = totalMinutes / km;
  let wholeMin = Math.floor(paceMinPerKm);
  let seconds = Math.round((paceMinPerKm - wholeMin) * 60);
  if (seconds === 60) {
    seconds = 0;
    wholeMin += 1;
  }
  return `${wholeMin}:${String(seconds).padStart(2, '0')} min/km`;
}

function PaceHint({ requirements }: { requirements: GoalRequirement[] }) {
  const pace = useMemo(() => {
    const distanceReq = requirements.find((r) => r.kind === 'distance' && r.target && r.target.amount > 0);
    const targetTimeReq = requirements.find(
      (r) => r.kind === 'targetTime' && r.target && r.target.amount > 0 && r.discipline === distanceReq?.discipline,
    );
    if (!distanceReq?.target || !targetTimeReq?.target) return null;
    return formatPacePerKm(targetTimeReq.target.amount, distanceReq.target.amount);
  }, [requirements]);

  if (!pace) return null;
  return (
    <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
      Dat is een tempo van <span className="font-semibold" style={{ color: 'var(--color-gold)' }}>{pace}</span>.
    </p>
  );
}

const CUSTOM_DISCIPLINE = '__custom__';

function RequirementRow({
  requirement,
  onChange,
  onRemove,
}: {
  requirement: GoalRequirement;
  onChange: (patch: Partial<GoalRequirement>) => void;
  onRemove: () => void;
}) {
  const meta = REQUIREMENT_KIND_META[requirement.kind as EditableRequirementKind];
  // A discipline outside the known list starts in free-text mode so its
  // value stays visible instead of silently resetting.
  const isKnownDiscipline = !requirement.discipline || (DISCIPLINE_OPTIONS as string[]).includes(requirement.discipline);
  const [customDiscipline, setCustomDiscipline] = useState(!isKnownDiscipline);
  if (!meta) return null; // 'manual' never appears in this generic editor

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <NumberField
            label={meta.label}
            unit={UNIT_LABEL[meta.unit]}
            decimals={meta.decimals}
            value={requirement.target?.amount}
            onChange={(v) => onChange({ target: v === undefined ? undefined : { amount: v, unit: meta.unit } })}
          />
        </div>
        {meta.needsDiscipline && (
          <div className="flex-1">
            {customDiscipline ? (
              <input
                type="text"
                aria-label="Sport"
                value={requirement.discipline ?? ''}
                onChange={(e) => onChange({ discipline: e.target.value })}
                placeholder="bijv. alpineklimmen"
                className="w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
                style={inputStyle}
              />
            ) : (
              <select
                aria-label="Sport"
                value={requirement.discipline ?? ''}
                onChange={(e) => {
                  if (e.target.value === CUSTOM_DISCIPLINE) {
                    setCustomDiscipline(true);
                    onChange({ discipline: '' });
                  } else {
                    onChange({ discipline: e.target.value });
                  }
                }}
                className="w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
                style={inputStyle}
              >
                <option value="" style={{ background: 'var(--color-charcoal)' }}>Kies sport</option>
                {DISCIPLINE_OPTIONS.map((d) => (
                  <option key={d} value={d} style={{ background: 'var(--color-charcoal)' }}>{DISCIPLINE_LABEL[d]}</option>
                ))}
                <option value={CUSTOM_DISCIPLINE} style={{ background: 'var(--color-charcoal)' }}>Andere sport…</option>
              </select>
            )}
          </div>
        )}
        <button onClick={onRemove} aria-label={`${meta.label} verwijderen`} className="px-1 pb-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>×</button>
      </div>
      {customDiscipline && (
        <p className="text-[10px] leading-tight" style={{ color: 'var(--color-ink-dim)' }}>
          Nog niet gekoppeld aan automatische voortgangsmeting uit je trainingsgeschiedenis.{' '}
          <button onClick={() => { setCustomDiscipline(false); onChange({ discipline: '' }); }} className="underline" style={{ color: 'var(--color-ink-dim)' }}>
            terug naar lijst
          </button>
        </p>
      )}
    </div>
  );
}

// --- Preview ----------------------------------------------------------------

const ROUTE_SUFFIX = { distance: 'km', elevationGain: 'm D+', elevationLoss: 'm D−' } as const;

function formatRouteValue(kind: keyof typeof ROUTE_SUFFIX, amount: number): string {
  return `${formatNumberNL(amount, kind === 'distance' ? 1 : 0)} ${ROUTE_SUFFIX[kind]}`;
}

const PER_DAY_DIMENSIONS = new Set(['endurance_duration', 'mechanical_tolerance', 'ascent_capacity', 'descent_tolerance']);

function RouteSummary({ goal }: { goal: TrainingGoal }) {
  const reqs = goal.requirements;
  const days = eventDaysRequirement(reqs)?.target?.amount;
  const dayWords = routeDayWord(routeDiscipline(goal));
  const dayWord = dayWords.plural;
  const totals = ROUTE_KINDS.flatMap((k) => {
    const t = routeTotal(reqs, k);
    return t ? [formatRouteValue(k, t.amount)] : [];
  });
  if (days) totals.push(`${formatNumberNL(days, 0)} ${dayWord}`);
  const average = routeDayParts(reqs, 'average', false);
  const training = routeDayParts(reqs, 'training', false);
  const longest = longestStageDays(reqs, goal.execution);
  const pack = reqs.find((r) => r.kind === 'packWeight')?.target?.amount;
  const stageBits = [
    goal.execution === 'continuous' ? `aaneengesloten${longest ? `, ${longest} dagen achter elkaar` : ''}` : longest ? `langste etappe ${longest} dagen` : undefined,
    pack ? `rugzak ${formatNumberNL(pack, 1)} kg` : undefined,
  ].filter(Boolean);

  return (
    <div className="mt-3 flex flex-col gap-2 text-xs">
      <div>
        <p style={{ color: 'var(--color-ink-dim)' }}>Totale tocht</p>
        <p className="mt-0.5" style={{ color: 'var(--color-ink)' }}>{totals.join(' · ')}</p>
      </div>
      <div>
        <p style={{ color: 'var(--color-ink-dim)' }}>Etappebelasting</p>
        {average.length > 0 && <p className="mt-0.5" style={{ color: 'var(--color-ink)' }}>Gemiddelde {dayWords.singular}: {average.join(' · ')}</p>}
        {training.length > 0 && <p className="mt-0.5" style={{ color: 'var(--color-ink)' }}>Trainingsdag: {training.join(' · ')}</p>}
        {stageBits.length > 0 && <p className="mt-0.5" style={{ color: 'var(--color-ink)' }}>{stageBits.join(' · ').replace(/^./, (c) => c.toUpperCase())}</p>}
      </div>
    </div>
  );
}

function GapRow({ gap, multiDay }: { gap: CapabilityGap; multiDay: boolean }) {
  const perDay = multiDay && PER_DAY_DIMENSIONS.has(gap.key.dimension);
  const isHikingTime = gap.demand.unit === 'min' && gap.key.discipline === 'hiking';
  const demandText = `${isHikingTime ? '± ' : ''}${formatCapabilityValue(gap.demand)}${isHikingTime ? ' onderweg' : ''}${perDay ? ' per dag' : ''}`;
  const unitMismatch = gap.status === 'unknown' && gap.currentEstimate !== undefined && gap.currentEstimate.unit !== gap.demand.unit;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{capabilityKeyLabel(gap.key)}</span>
        <span className="shrink-0 whitespace-nowrap text-[11px] font-medium tracking-wide" style={{ color: GAP_STATUS_COLOR[gap.status] }}>{GAP_STATUS_LABEL[gap.status]}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt style={{ color: 'var(--color-ink-dim)' }}>Vraag</dt>
        <dd style={{ color: 'var(--color-ink)' }}>{demandText}</dd>
        <dt style={{ color: 'var(--color-ink-dim)' }}>Aantoonbaar</dt>
        <dd style={{ color: 'var(--color-ink)' }}>{gap.currentEstimate && !unitMismatch ? formatCapabilityValue(gap.currentEstimate) : 'nog niets bekend'}</dd>
        <dt style={{ color: 'var(--color-ink-dim)' }}>Vertrouwen</dt>
        <dd style={{ color: 'var(--color-ink-dim)' }}>{CONFIDENCE_LABEL[gap.confidence]}, {CONFIDENCE_EXPLANATION[gap.confidence]}</dd>
      </dl>
      {unitMismatch && <p className="text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>{gap.explanation}</p>}
    </div>
  );
}

function PreviewStep({
  draft,
  allEvidence,
  plannedSessions,
  templates,
  availability,
  guardrails,
  asOf,
  onBack,
  onConfirm,
}: {
  draft: TrainingGoal;
  allEvidence: CapabilityEvidence[];
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  availability: TrainingAvailability;
  guardrails: TrainingGuardrail[];
  asOf: string;
  onBack: () => void;
  onConfirm: (plan: GoalActivationPlan) => void;
}) {
  const plan = useMemo(
    () => computeGoalActivationPlan({ goalDraft: draft, allEvidence, availability, guardrails, plannedSessions, templates, asOf }),
    [draft, allEvidence, availability, guardrails, plannedSessions, templates, asOf],
  );
  const feasibilityBadge = FEASIBILITY_LABEL[plan.feasibility.status];
  const seen = new Set<string>();
  const sortedGaps = [...plan.gaps]
    .filter((g) => (seen.has(keyId(g.key)) ? false : (seen.add(keyId(g.key)), true)))
    .sort((a, b) => GAP_SEVERITY_ORDER[b.status] - GAP_SEVERITY_ORDER[a.status]);
  const isRoute = draft.execution !== undefined;
  const multiDay = isMultiDayGoal(draft.requirements);
  const impact = [plan.consequences, plan.committedWeekChanges.consequences, plan.forecastChanges.consequences].filter((t) => t && t.trim().length > 0);

  return (
    <div className="mt-4 flex flex-col gap-6">
      <section>
        <Eyebrow>DOELINTERPRETATIE</Eyebrow>
        <p className="mt-1.5 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{draft.name}</p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {draft.status === 'active' ? `Doeldatum ${formatDateNL(draft.targetDate)}` : 'Geen datum, dus het doel blijft gepauzeerd tot je er een instelt.'}
        </p>
        {isRoute ? (
          <RouteSummary goal={draft} />
        ) : (
          <ul className="mt-2 flex flex-col gap-0.5 text-xs" style={{ color: 'var(--color-ink)' }}>
            {draft.requirements.map((r) => {
              const meta = REQUIREMENT_KIND_META[r.kind as EditableRequirementKind];
              return (
                <li key={r.id}>
                  {meta?.label ?? r.kind}: {r.target ? formatCapabilityValue(r.target) : '–'}{r.discipline ? ` (${DISCIPLINE_LABEL[r.discipline as keyof typeof DISCIPLINE_LABEL] ?? r.discipline})` : ''}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>HAALBAARHEID</Eyebrow>
          <span className="text-[11px] font-medium tracking-wide" style={{ color: feasibilityBadge.color }}>{feasibilityBadge.label}</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{plan.feasibility.explanation}</p>
        {plan.feasibility.bestPossiblePreparation && (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-sky)' }}>{plan.feasibility.bestPossiblePreparation}</p>
        )}
      </section>

      {sortedGaps.length > 0 && (
        <section>
          <Eyebrow>CAPACITEIT VS. VRAAG</Eyebrow>
          {multiDay && (
            <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Vergeleken met één dag van de tocht (je trainingsdag, of anders de gemiddelde loopdag), niet met de totalen.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-4">
            {sortedGaps.map((g) => <GapRow key={keyId(g.key)} gap={g} multiDay={multiDay} />)}
          </div>
        </section>
      )}

      {impact.length > 0 && (
        <section>
          <Eyebrow>VERWACHTE PLANIMPACT</Eyebrow>
          {impact.map((t, i) => (
            <p key={i} className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{t}</p>
          ))}
        </section>
      )}

      <div className="mt-1 flex gap-3">
        <SecondaryButton onClick={onBack}>TERUG</SecondaryButton>
        <PrimaryButton fullWidth={false} onClick={() => onConfirm(plan)}>DOEL ACTIVEREN</PrimaryButton>
      </div>
    </div>
  );
}
