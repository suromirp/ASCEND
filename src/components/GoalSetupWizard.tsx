// ASCEND — Goal Setup Wizard (Technical Architecture v0.3.1 REVISED,
// Phase 7 — "Goal Setup & Plan Preview UX bovenop de bestaande locked
// engines").
//
// Built entirely on existing, unchanged engines — never a new
// decision-making formula: engine/goalSetupAssist.ts (Phase 7, itself only
// a composition of the Demand/Capability engines) for "what does ASCEND
// still need to ask", engine/goalActivation.ts (Phase 5) for the actual
// Plan Preview and the single-transaction activation. Used both to create
// a brand-new goal and to edit an existing one (GR5, Marathon, or a custom
// goal) — one flow, not two.
//
// Step order mirrors the phase's own ask: interpret the goal → ask only
// what's genuinely missing → show a real Plan Preview (interpretation,
// confidence, gaps, feasibility, expected plan impact) → activate.

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { TrainingGoal, GoalRequirement } from '../models/goals';
import type { CapabilityEvidence, CapabilityKey, GapStatus, Confidence } from '../models/capability';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { TrainingAvailability, TrainingGuardrail } from '../models/goalEngineConfig';
import type { GoalActivationPlan } from '../models/planChange';
import type { Unit } from '../models/units';
import { UNIT_LABEL, formatMeasuredValue } from '../models/units';
import { DISCIPLINE_LABEL, DISCIPLINE_OPTIONS, disciplineLabel } from '../models/disciplines';
import { computeGoalActivationPlan } from '../engine/goalActivation';
import { identifyBaselineNeeds, identifyKnownCapabilities, type BaselineCapabilityStatus } from '../engine/goalSetupAssist';
import { extractEvidenceFromLogs, keyId } from '../engine/capability';
import { DIMENSION_META, capabilityKeyLabel } from '../data/baselineQuestions';
import { todayISO, formatDateNL } from '../utils/dates';
import { makeId } from '../utils/id';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { FEASIBILITY_LABEL } from './GoalFocusCard';
import { Portal } from './Portal';
import { useSheetClose } from '../utils/useSheetClose';

const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

type EditableRequirementKind = Exclude<GoalRequirement['kind'], 'manual'>;

const REQUIREMENT_KIND_META: Record<EditableRequirementKind, { label: string; unit: Unit; scope: GoalRequirement['scope']; needsDiscipline?: boolean }> = {
  distance: { label: 'Afstand', unit: 'km', scope: 'TOTAL_EVENT', needsDiscipline: true },
  elevationGain: { label: 'Hoogtemeters omhoog (D+)', unit: 'm_elevation_gain', scope: 'TOTAL_EVENT' },
  elevationLoss: { label: 'Hoogtemeters omlaag (D-)', unit: 'm_elevation_loss', scope: 'TOTAL_EVENT' },
  duration: { label: 'Duur', unit: 'min', scope: 'TOTAL_EVENT', needsDiscipline: true },
  targetTime: { label: 'Doeltijd', unit: 'min', scope: 'SINGLE_EVENT', needsDiscipline: true },
  packWeight: { label: 'Rugzakgewicht', unit: 'kg', scope: 'SINGLE_EVENT' },
  consecutiveDays: { label: 'Opeenvolgende dagen', unit: 'days', scope: 'CONSECUTIVE_DAYS' },
};
const REQUIREMENT_KIND_ORDER = Object.keys(REQUIREMENT_KIND_META) as EditableRequirementKind[];

const GAP_STATUS_LABEL: Record<GapStatus, string> = {
  exceeds: 'OVERTREFT', meets: 'VOLDOET', near: 'BIJNA', gap: 'GAT', major_gap: 'GROOT GAT', unknown: 'ONBEKEND',
};
const GAP_STATUS_COLOR: Record<GapStatus, string> = {
  exceeds: 'var(--color-success)', meets: 'var(--color-success)', near: 'var(--color-warning)',
  gap: 'var(--color-warning)', major_gap: 'var(--color-danger)', unknown: 'var(--color-ink-dim)',
};
const GAP_SEVERITY_ORDER: Record<GapStatus, number> = { major_gap: 4, gap: 3, near: 2, unknown: 1, meets: 0, exceeds: 0 };
const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'hoog', medium: 'gemiddeld', low: 'laag', unknown: 'onbekend' };

type Step =
  | { kind: 'type' }
  | { kind: 'interpret'; draft: TrainingGoal }
  | { kind: 'baseline'; draft: TrainingGoal }
  | { kind: 'preview'; draft: TrainingGoal }
  | { kind: 'applying' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

const PRESET_LABEL: Record<'gr5' | 'race' | 'custom', { label: string; note: string }> = {
  gr5: { label: 'Meerdaagse trektocht', note: 'Afstand + hoogtemeters over meerdere dagen — zoals de GR5.' },
  race: { label: 'Hardloopwedstrijd', note: 'Eén vaste afstand, optioneel een doeltijd.' },
  custom: { label: 'Aangepast doel', note: 'Stel zelf samen welke eisen dit doel meet.' },
};

function applyPreset(preset: 'gr5' | 'race' | 'custom', base: TrainingGoal): TrainingGoal {
  if (preset === 'gr5') {
    return { ...base, name: base.name || 'Trektocht', requirements: [{ id: makeId('req'), kind: 'distance', scope: 'TOTAL_EVENT', target: { amount: 600, unit: 'km' }, discipline: 'hiking' }] };
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
  const allEvidence = useMemo(() => [...extractEvidenceFromLogs(sessionLogs), ...capabilityEvidence], [sessionLogs, capabilityEvidence]);

  async function handleConfirm(plan: GoalActivationPlan) {
    setStep({ kind: 'applying' });
    const result = await activateGoal(plan);
    if (!result.applied) {
      setStep({ kind: 'error', message: 'Er is intussen iets veranderd (nieuwe training of evidence) — open dit doel opnieuw om verder te gaan met de actuele situatie.' });
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
                {(['gr5', 'race', 'custom'] as const).map((preset) => (
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
              <BaselineStep
                draft={step.draft}
                allEvidence={allEvidence}
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
                <p className="text-sm" style={{ color: 'var(--color-success)' }}>Doel geactiveerd.</p>
                <PrimaryButton onClick={requestClose}>SLUITEN</PrimaryButton>
              </div>
            )}

            {step.kind === 'error' && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{step.message}</p>
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
      requirements: [...g.requirements, { id: makeId('req'), kind, scope: meta.scope, target: { amount: 0, unit: meta.unit }, discipline: meta.needsDiscipline ? '' : undefined }],
    }));
  }

  function updateRequirement(id: string, patch: Partial<GoalRequirement>) {
    setLocal((g) => ({ ...g, requirements: g.requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }

  function removeRequirement(id: string) {
    setLocal((g) => ({ ...g, requirements: g.requirements.filter((r) => r.id !== id) }));
  }

  const availableKinds = REQUIREMENT_KIND_ORDER.filter((k) => !local.requirements.some((r) => r.kind === k));
  const canProceed = local.name.trim().length > 0 && local.requirements.length > 0 && local.requirements.every((r) => (r.target?.amount ?? 0) > 0);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Naam van dit doel</label>
        <input
          type="text"
          value={local.name}
          onChange={(e) => setLocal((g) => ({ ...g, name: e.target.value }))}
          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Datum</label>
        <input
          type="date"
          value={local.status === 'active' ? local.targetDate : ''}
          onChange={(e) => patchDate(e.target.value)}
          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
          style={inputStyle}
        />
        {local.status !== 'active' && (
          <p className="mt-1 text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>Zonder datum blijft dit doel gepauzeerd.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Eyebrow>EISEN</Eyebrow>
        {local.requirements.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Nog geen eisen — voeg er hieronder minstens één toe.</p>
        )}
        {local.requirements.map((r) => (
          <RequirementRow key={r.id} requirement={r} onChange={(patch) => updateRequirement(r.id, patch)} onRemove={() => removeRequirement(r.id)} />
        ))}
        {availableKinds.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addRequirement(e.target.value as EditableRequirementKind);
            }}
            className="rounded-lg border bg-transparent px-2 py-1.5 text-xs"
            style={inputStyle}
          >
            <option value="" style={{ background: 'var(--color-charcoal)' }}>+ EIS TOEVOEGEN</option>
            {availableKinds.map((k) => (
              <option key={k} value={k} style={{ background: 'var(--color-charcoal)' }}>{REQUIREMENT_KIND_META[k].label}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-2 flex gap-3">
        <SecondaryButton onClick={allowBack ? onBack : onCancel}>{allowBack ? 'TERUG' : 'ANNULEREN'}</SecondaryButton>
        <PrimaryButton onClick={() => onNext(local)} disabled={!canProceed}>VOLGENDE</PrimaryButton>
      </div>
    </div>
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
  // A discipline outside the known list (legacy data, or a deliberate
  // custom entry — models/disciplines.ts never forces a closed set) starts
  // in free-text mode so its value stays visible instead of silently
  // resetting to the dropdown's placeholder.
  const isKnownDiscipline = !requirement.discipline || (DISCIPLINE_OPTIONS as string[]).includes(requirement.discipline);
  const [customDiscipline, setCustomDiscipline] = useState(!isKnownDiscipline);
  if (!meta) return null; // 'manual' never appears in this generic editor

  return (
    <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>{meta.label}</span>
        <button onClick={onRemove} className="text-xs" style={{ color: 'var(--color-danger)' }}>verwijderen</button>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Waarde ({UNIT_LABEL[meta.unit]})</label>
          <input
            type="number"
            value={requirement.target?.amount ?? ''}
            onChange={(e) => onChange({ target: { amount: Number(e.target.value), unit: meta.unit } })}
            className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
            style={inputStyle}
          />
        </div>
        {meta.needsDiscipline && (
          <div className="flex-1">
            <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sport</label>
            {customDiscipline ? (
              <input
                type="text"
                value={requirement.discipline ?? ''}
                onChange={(e) => onChange({ discipline: e.target.value })}
                placeholder="bijv. alpineklimmen"
                className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                style={inputStyle}
              />
            ) : (
              <select
                value={requirement.discipline ?? ''}
                onChange={(e) => {
                  if (e.target.value === CUSTOM_DISCIPLINE) {
                    setCustomDiscipline(true);
                    onChange({ discipline: '' });
                  } else {
                    onChange({ discipline: e.target.value });
                  }
                }}
                className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                style={inputStyle}
              >
                <option value="" style={{ background: 'var(--color-charcoal)' }}>Kies sport</option>
                {DISCIPLINE_OPTIONS.map((d) => (
                  <option key={d} value={d} style={{ background: 'var(--color-charcoal)' }}>{DISCIPLINE_LABEL[d]}</option>
                ))}
                <option value={CUSTOM_DISCIPLINE} style={{ background: 'var(--color-charcoal)' }}>Andere sport…</option>
              </select>
            )}
            {customDiscipline && (
              <p className="mt-1 text-[10px] leading-tight" style={{ color: 'var(--color-ink-dim)' }}>
                Nog niet gekoppeld aan automatische voortgangsmeting uit je trainingsgeschiedenis.{' '}
                <button onClick={() => { setCustomDiscipline(false); onChange({ discipline: '' }); }} className="underline" style={{ color: 'var(--color-ink-dim)' }}>
                  terug naar lijst
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BaselineStep({
  draft,
  allEvidence,
  asOf,
  onBack,
  onNext,
}: {
  draft: TrainingGoal;
  allEvidence: CapabilityEvidence[];
  asOf: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const { addManualCapabilityEvidence } = useAppData();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const needs = useMemo(() => identifyBaselineNeeds(draft.requirements, allEvidence, asOf), [draft.requirements, allEvidence, asOf]);
  const known = useMemo(() => identifyKnownCapabilities(draft.requirements, allEvidence, asOf), [draft.requirements, allEvidence, asOf]);
  const remaining = needs.filter((n) => !skipped.has(keyId(n.key)));

  async function handleAnswer(key: CapabilityKey, amount: number, unit: Unit) {
    await addManualCapabilityEvidence({ key, measured: { amount, unit }, date: asOf });
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
        ASCEND gebruikt eerst wat het al weet uit je trainingsgeschiedenis. Hieronder alleen wat daarvoor nog ontbreekt.
      </p>

      {known.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Eyebrow>AL BEKEND</Eyebrow>
          {known.map((k) => {
            const meta = k.key.dimension === 'fatigue_resistance' ? undefined : DIMENSION_META[k.key.dimension];
            if (!meta) return null;
            const label = k.key.discipline ? `${meta.label} (${disciplineLabel(k.key.discipline)})` : meta.label;
            return (
              <div key={keyId(k.key)} className="flex items-center justify-between gap-3 text-xs">
                <span style={{ color: 'var(--color-ink)' }}>{label}</span>
                <span style={{ color: 'var(--color-ink-dim)' }}>vertrouwen: {CONFIDENCE_LABEL[k.confidence]}</span>
              </div>
            );
          })}
        </div>
      )}

      {remaining.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Eyebrow>NOG NODIG</Eyebrow>
          {remaining.map((need) => (
            <BaselineQuestionRow
              key={keyId(need.key)}
              need={need}
              onAnswer={handleAnswer}
              onSkip={() => setSkipped((s) => new Set(s).add(keyId(need.key)))}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geen aanvullende vragen nodig.</p>
      )}

      <div className="mt-2 flex gap-3">
        <SecondaryButton onClick={onBack}>TERUG</SecondaryButton>
        <PrimaryButton onClick={onNext}>VOLGENDE</PrimaryButton>
      </div>
    </div>
  );
}

function BaselineQuestionRow({
  need,
  onAnswer,
  onSkip,
}: {
  need: BaselineCapabilityStatus;
  onAnswer: (key: CapabilityKey, amount: number, unit: Unit) => Promise<void>;
  onSkip: () => void;
}) {
  const meta = need.key.dimension === 'fatigue_resistance' ? undefined : DIMENSION_META[need.key.dimension];
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  if (!meta) return null; // fatigue_resistance never asked — data/baselineQuestions.ts

  const label = need.key.discipline ? `${meta.label} (${disciplineLabel(need.key.discipline)})` : meta.label;

  async function handleSave() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || !meta) return;
    setSaving(true);
    await onAnswer(need.key, parsed, meta.unit);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{label}</p>
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{meta.question}</p>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={UNIT_LABEL[meta.unit]}
        className="rounded-lg border bg-transparent px-2 py-1.5 text-sm"
        style={inputStyle}
      />
      <div className="flex gap-3">
        <SecondaryButton onClick={onSkip}>OVERSLAAN</SecondaryButton>
        <PrimaryButton onClick={handleSave} disabled={saving || !amount}>OPSLAAN</PrimaryButton>
      </div>
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
  const sortedGaps = [...plan.gaps].sort((a, b) => GAP_SEVERITY_ORDER[b.status] - GAP_SEVERITY_ORDER[a.status]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <Eyebrow>DOELINTERPRETATIE</Eyebrow>
        <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{draft.name}</p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {draft.status === 'active' ? `Doeldatum: ${formatDateNL(draft.targetDate)}` : 'Geen datum — doel blijft gepauzeerd tot je er een instelt.'}
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-xs" style={{ color: 'var(--color-ink)' }}>
          {draft.requirements.map((r) => {
            const meta = REQUIREMENT_KIND_META[r.kind as EditableRequirementKind];
            return (
              <li key={r.id}>
                · {meta?.label ?? r.kind}: {r.target ? formatMeasuredValue(r.target) : '—'}{r.discipline ? ` (${DISCIPLINE_LABEL[r.discipline as keyof typeof DISCIPLINE_LABEL] ?? r.discipline})` : ''}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <Eyebrow>HAALBAARHEID</Eyebrow>
        <span className="text-[11px] font-medium tracking-wide" style={{ color: feasibilityBadge.color }}>{feasibilityBadge.label}</span>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{plan.feasibility.explanation}</p>
        {plan.feasibility.bestPossiblePreparation && (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-sky)' }}>{plan.feasibility.bestPossiblePreparation}</p>
        )}
      </div>

      {sortedGaps.length > 0 && (
        <div>
          <Eyebrow>CAPACITEIT VS. VRAAG</Eyebrow>
          <div className="mt-2 flex flex-col gap-2">
            {sortedGaps.map((g) => (
              <div key={keyId(g.key)} className="flex flex-col gap-0.5 border-t pt-2 text-xs" style={{ borderColor: 'var(--color-card-border)' }}>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--color-ink)' }}>{capabilityKeyLabel(g.key)}</span>
                  <span style={{ color: GAP_STATUS_COLOR[g.status] }}>{GAP_STATUS_LABEL[g.status]}</span>
                </div>
                <span style={{ color: 'var(--color-ink-dim)' }}>vertrouwen: {CONFIDENCE_LABEL[g.confidence]}</span>
                <span style={{ color: 'var(--color-ink-dim)' }}>{g.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Eyebrow>VERWACHTE PLANIMPACT</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{plan.consequences}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{plan.committedWeekChanges.consequences}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{plan.forecastChanges.consequences}</p>
      </div>

      <div className="mt-2 flex gap-3">
        <SecondaryButton onClick={onBack}>TERUG</SecondaryButton>
        <PrimaryButton onClick={() => onConfirm(plan)}>DOEL ACTIVEREN</PrimaryButton>
      </div>
    </div>
  );
}
