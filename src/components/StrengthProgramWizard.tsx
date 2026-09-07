// ASCEND — Strength Program Wizard (Strength Program Strategy Addendum
// v0.1, Phase 8). Starts a new strength block or edits the active one:
// ASCEND-owned fields only (source, frequency, split, which existing
// SessionTemplates belong to it, block length, muscle priorities/
// maintenance, notes) — never exercise-level detail, which stays entirely
// MacroFactor Workouts' job (§1/§4). Mirrors GoalSetupWizard's sheet/step
// pattern for a consistent setup-flow feel across the app.

import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { StrengthProgramStrategy, StrengthProgramSource } from '../models/strengthProgram';
import { computeStrengthPlacementPlan, computeStrengthPlacementPlanForCommittedRange } from '../engine/strengthScheduling';
import { MUSCLE_GROUP_OPTIONS } from '../data/bodyAreas';
import { addDays, formatDateNL, mondayOfWeek, todayISO } from '../utils/dates';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { Portal } from './Portal';
import { useSheetClose } from '../utils/useSheetClose';

const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

const SOURCE_LABEL: Record<StrengthProgramSource, string> = {
  macrofactor_workouts: 'MacroFactor Workouts',
  manual: 'Handmatig bijgehouden',
  future_provider: 'Andere externe app',
};

// A menu of presets, never a closed type (StrengthProgramStrategy.splitType
// stays a plain string, deliberately — models/strengthProgram.ts) — "Anders"
// falls back to free text so a split outside this list is still just as
// storable as it was before this menu existed.
const SPLIT_PRESET_LABEL: Record<string, string> = {
  upper_lower: 'Upper / Lower',
  full_body: 'Full Body',
  push_pull_legs: 'Push / Pull / Legs',
};
const SPLIT_PRESETS = Object.keys(SPLIT_PRESET_LABEL);
const CUSTOM_SPLIT = '__custom__';

type Step =
  | { kind: 'sessions'; draft: StrengthProgramStrategy }
  | { kind: 'focus'; draft: StrengthProgramStrategy }
  | { kind: 'preview'; draft: StrengthProgramStrategy }
  | { kind: 'applying' }
  | { kind: 'done'; draft: StrengthProgramStrategy }
  | { kind: 'error'; message: string };

export function StrengthProgramWizard({
  initialStrategy,
  mode,
  onClose,
  onActivated,
}: {
  initialStrategy: StrengthProgramStrategy;
  mode: 'create' | 'edit';
  onClose: () => void;
  onActivated?: () => void;
}) {
  const { templates, plannedSessions, goalEngineConfig, activateStrengthProgram } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose);
  const [step, setStep] = useState<Step>({ kind: 'sessions', draft: initialStrategy });

  const strengthTemplates = useMemo(() => templates.filter((t) => t.type === 'strength'), [templates]);

  async function handleConfirm(draft: StrengthProgramStrategy) {
    setStep({ kind: 'applying' });
    await activateStrengthProgram(draft);
    onActivated?.();
    setStep({ kind: 'done', draft });
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
            <Eyebrow>{mode === 'create' ? 'NIEUW KRACHTBLOK' : 'KRACHTBLOK AANPASSEN'}</Eyebrow>

            {step.kind === 'sessions' && (
              <SessionsStep
                draft={step.draft}
                strengthTemplates={strengthTemplates}
                onCancel={requestClose}
                onNext={(draft) => setStep({ kind: 'focus', draft })}
              />
            )}

            {step.kind === 'focus' && (
              <FocusStep
                draft={step.draft}
                onBack={() => setStep({ kind: 'sessions', draft: step.draft })}
                onNext={(draft) => setStep({ kind: 'preview', draft })}
              />
            )}

            {step.kind === 'preview' && (
              <PreviewStep
                draft={step.draft}
                plannedSessions={plannedSessions}
                templates={templates}
                availability={goalEngineConfig.availability}
                onBack={() => setStep({ kind: 'focus', draft: step.draft })}
                onConfirm={() => void handleConfirm(step.draft)}
              />
            )}

            {step.kind === 'applying' && (
              <p className="mt-4 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Bezig met activeren…</p>
            )}

            {step.kind === 'done' && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-success)' }}>Krachtblok geactiveerd.</p>
                <CommittedRangeOptIn strategy={step.draft} onClose={requestClose} />
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

// Shown right after activation. By design, activateStrengthProgram above
// only ever reaches the forecast range (week +2 onward) — the committed
// range (this week + next week) is never silently touched, per the app's
// confirmation_horizon_respected invariant. That's still the recommended
// default (a krachtblok change appearing on you without warning, mid-week,
// is exactly what the invariant exists to prevent) — but a user who
// actively wants it sooner should get an explicit, reviewed way to ask for
// that, not just silently wait two weeks with no way to speed it up
// (production feedback: "ascend moet die optie bij de gebruiker leggen en
// wel zelf zijn voorkeur daarbij geven").
function CommittedRangeOptIn({ strategy, onClose }: { strategy: StrengthProgramStrategy; onClose: () => void }) {
  const { plannedSessions, templates, sessionLogs, goalEngineConfig, applyStrengthPlacementToCommittedRange } = useAppData();
  const [phase, setPhase] = useState<'idle' | 'preview' | 'applying' | 'applied' | 'no_changes'>('idle');

  const forecastStart = addDays(mondayOfWeek(todayISO()), 14);
  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  const committedProposal = useMemo(
    () => computeStrengthPlacementPlanForCommittedRange(strategy, plannedSessions, templates, goalEngineConfig.availability, sessionLogs, todayISO()),
    [strategy, plannedSessions, templates, goalEngineConfig.availability, sessionLogs],
  );

  async function confirmApply() {
    setPhase('applying');
    const applied = await applyStrengthPlacementToCommittedRange(strategy);
    setPhase(applied ? 'applied' : 'no_changes');
  }

  if (phase === 'applying') {
    return <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Bezig met toepassen…</p>;
  }

  if (phase === 'applied' || phase === 'no_changes') {
    return (
      <>
        <p className="text-sm" style={{ color: phase === 'applied' ? 'var(--color-success)' : 'var(--color-ink-dim)' }}>
          {phase === 'applied' ? 'Toegepast op deze en/of volgende week.' : 'Geen wijzigingen meer nodig voor deze/volgende week.'}
        </p>
        <PrimaryButton onClick={onClose}>SLUITEN</PrimaryButton>
      </>
    );
  }

  if (phase === 'preview') {
    const removed = committedProposal.changes.filter((c) => c.action === 'remove');
    const added = committedProposal.changes.filter((c) => c.action === 'add');
    return (
      <>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{committedProposal.consequences}</p>
        <div className="flex flex-col gap-2">
          {removed.map((c) => (
            <div key={c.plannedSessionId} className="text-xs" style={{ color: 'var(--color-danger)' }}>− {c.fromDate}: {c.reason}</div>
          ))}
          {added.map((c, i) => (
            <div key={i} className="text-xs" style={{ color: 'var(--color-success)' }}>
              + {c.newSessionDraft?.scheduledDate}: {templateById.get(c.newSessionDraft?.templateId ?? '')?.name ?? c.newSessionDraft?.templateId}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <SecondaryButton onClick={() => setPhase('idle')}>TERUG</SecondaryButton>
          <PrimaryButton onClick={() => void confirmApply()}>BEVESTIGEN</PrimaryButton>
        </div>
      </>
    );
  }

  const nothingToApply = committedProposal.changes.length === 0;
  const blocked = nothingToApply && committedProposal.issue === 'Kon niet volledig plaatsen';

  return (
    <>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        Dit begint automatisch vanaf {formatDateNL(forecastStart)} — je planning voor deze en volgende week blijft
        intact. Dat raden we ook aan, tenzij je hier nu al mee wil trainen.
      </p>
      {blocked && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-warning)' }}>
          {committedProposal.consequences}
        </p>
      )}
      <div className="flex gap-3">
        <SecondaryButton onClick={() => setPhase('preview')} disabled={nothingToApply}>
          NU AL TOEPASSEN
        </SecondaryButton>
        <PrimaryButton onClick={onClose}>SLUITEN</PrimaryButton>
      </div>
    </>
  );
}

// Step 1 — "wat train je": source, frequency, split, which session types
// make up the block. Kept separate from Step 2's focus/notes fields so
// neither screen is a wall of unrelated inputs.
function SessionsStep({
  draft,
  strengthTemplates,
  onCancel,
  onNext,
}: {
  draft: StrengthProgramStrategy;
  strengthTemplates: { id: string; name: string }[];
  onCancel: () => void;
  onNext: (draft: StrengthProgramStrategy) => void;
}) {
  const [local, setLocal] = useState(draft);
  const [customSplit, setCustomSplit] = useState(!SPLIT_PRESETS.includes(draft.splitType));

  // Always recomputed in the canonical template order, regardless of the
  // order templates were toggled in — otherwise the checked set drifts to
  // "click order" (production bug: re-toggling Upper A after Lower B left
  // it displayed last, "Upper A, Lower A, Upper B", even though the
  // checklist itself still showed the templates in their fixed order).
  function toggleTemplate(id: string) {
    setLocal((s) => {
      const wasChecked = s.sessionTemplateIds.includes(id);
      const nextIds = new Set(wasChecked ? s.sessionTemplateIds.filter((t) => t !== id) : [...s.sessionTemplateIds, id]);
      return { ...s, sessionTemplateIds: strengthTemplates.filter((t) => nextIds.has(t.id)).map((t) => t.id) };
    });
  }

  const canProceed = local.sessionTemplateIds.length > 0 && local.sessionsPerWeek > 0 && local.splitType.trim().length > 0;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Bron</label>
        <select
          value={local.source}
          onChange={(e) => setLocal((s) => ({ ...s, source: e.target.value as StrengthProgramSource }))}
          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
          style={inputStyle}
        >
          {(Object.keys(SOURCE_LABEL) as StrengthProgramSource[]).map((src) => (
            <option key={src} value={src} style={{ background: 'var(--color-charcoal)' }}>{SOURCE_LABEL[src]}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sessies per week</label>
          <input
            type="number"
            min={1}
            value={local.sessionsPerWeek || ''}
            onChange={(e) => setLocal((s) => ({ ...s, sessionsPerWeek: Number(e.target.value) || 0 }))}
            className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
            style={inputStyle}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Split</label>
          {customSplit ? (
            <input
              type="text"
              value={local.splitType}
              onChange={(e) => setLocal((s) => ({ ...s, splitType: e.target.value }))}
              placeholder="bijv. bro_split"
              className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
              style={inputStyle}
            />
          ) : (
            <select
              value={local.splitType}
              onChange={(e) => {
                if (e.target.value === CUSTOM_SPLIT) {
                  setCustomSplit(true);
                  setLocal((s) => ({ ...s, splitType: '' }));
                } else {
                  setLocal((s) => ({ ...s, splitType: e.target.value }));
                }
              }}
              className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
              style={inputStyle}
            >
              {SPLIT_PRESETS.map((preset) => (
                <option key={preset} value={preset} style={{ background: 'var(--color-charcoal)' }}>{SPLIT_PRESET_LABEL[preset]}</option>
              ))}
              <option value={CUSTOM_SPLIT} style={{ background: 'var(--color-charcoal)' }}>Andere split…</option>
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>SESSIETYPES IN DIT BLOK</Eyebrow>
        {strengthTemplates.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geen krachtsessies gevonden om te kiezen.</p>
        )}
        {strengthTemplates.map((t) => {
          const checked = local.sessionTemplateIds.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggleTemplate(t.id)}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm"
              style={{ borderColor: checked ? 'var(--color-gold)' : 'var(--color-card-border)', color: checked ? 'var(--color-gold)' : 'var(--color-ink)' }}
            >
              <span>{t.name}</span>
              <span>{checked ? '✓' : ''}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex gap-3">
        <SecondaryButton onClick={onCancel}>ANNULEREN</SecondaryButton>
        <PrimaryButton onClick={() => onNext(local)} disabled={!canProceed}>VOLGENDE</PrimaryButton>
      </div>
    </div>
  );
}

// Step 2 — "hoe lang en waarop focus": block length + priority/maintenance
// muscle groups (chips, not a comma-separated string to hand-type) + notes.
function FocusStep({
  draft,
  onBack,
  onNext,
}: {
  draft: StrengthProgramStrategy;
  onBack: () => void;
  onNext: (draft: StrengthProgramStrategy) => void;
}) {
  const [local, setLocal] = useState(draft);

  function toggleGroup(field: 'musclePriorities' | 'muscleMaintenance', value: string) {
    setLocal((s) => {
      const current = s[field] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...s, [field]: next.length > 0 ? next : undefined };
    });
  }

  function next() {
    const now = new Date().toISOString();
    const plannedEndDate = local.plannedBlockWeeks ? addDays(local.startDate, local.plannedBlockWeeks * 7) : undefined;
    onNext({ ...local, plannedEndDate, updatedAt: now });
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Bloklengte (weken, optioneel)</label>
        <input
          type="number"
          min={1}
          value={local.plannedBlockWeeks ?? ''}
          onChange={(e) => setLocal((s) => ({ ...s, plannedBlockWeeks: e.target.value === '' ? undefined : Number(e.target.value) }))}
          placeholder="±8"
          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
          style={inputStyle}
        />
        <p className="mt-1 text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>
          Zonder bloklengte blijft dit blok open — geen automatische reviewherinnering op einddatum.
        </p>
      </div>

      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Prioriteit (optioneel)</label>
        <ChipMultiSelect
          options={MUSCLE_GROUP_OPTIONS}
          selected={local.musclePriorities ?? []}
          onToggle={(v) => toggleGroup('musclePriorities', v)}
        />
      </div>
      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Onderhoud (optioneel)</label>
        <ChipMultiSelect
          options={MUSCLE_GROUP_OPTIONS}
          selected={local.muscleMaintenance ?? []}
          onToggle={(v) => toggleGroup('muscleMaintenance', v)}
        />
      </div>
      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Notities (optioneel)</label>
        <textarea
          value={local.notes ?? ''}
          onChange={(e) => setLocal((s) => ({ ...s, notes: e.target.value || undefined }))}
          rows={2}
          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
          style={inputStyle}
        />
      </div>

      <div className="mt-2 flex gap-3">
        <SecondaryButton onClick={onBack}>TERUG</SecondaryButton>
        <PrimaryButton onClick={next}>VOLGENDE</PrimaryButton>
      </div>
    </div>
  );
}

// Chip picker over a fixed option list, plus a small free-text add so a
// value outside the list is still just as storable as before (the backing
// field stays a plain string[] — models/strengthProgram.ts).
function ChipMultiSelect({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [customText, setCustomText] = useState('');
  const extraSelected = selected.filter((s) => !options.includes(s));

  function addCustom() {
    const value = customText.trim();
    if (!value) return;
    onToggle(value);
    setCustomText('');
  }

  return (
    <div className="mt-1 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {[...options, ...extraSelected].map((opt) => {
          const checked = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className="rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: checked ? 'var(--color-gold)' : 'var(--color-card-border)', color: checked ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Andere spiergroep…"
          className="flex-1 rounded-lg border bg-transparent px-2 py-1.5 text-xs"
          style={inputStyle}
        />
        <button type="button" onClick={addCustom} className="rounded-lg border px-3 text-xs" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}>
          TOEVOEGEN
        </button>
      </div>
    </div>
  );
}

function PreviewStep({
  draft,
  plannedSessions,
  templates,
  availability,
  onBack,
  onConfirm,
}: {
  draft: StrengthProgramStrategy;
  plannedSessions: Parameters<typeof computeStrengthPlacementPlan>[1];
  templates: Parameters<typeof computeStrengthPlacementPlan>[2];
  availability: Parameters<typeof computeStrengthPlacementPlan>[3];
  onBack: () => void;
  onConfirm: () => void;
}) {
  const proposal = useMemo(
    () => computeStrengthPlacementPlan(draft, plannedSessions, templates, availability, todayISO()),
    [draft, plannedSessions, templates, availability],
  );
  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const removed = proposal.changes.filter((c) => c.action === 'remove');
  const added = proposal.changes.filter((c) => c.action === 'add');

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <Eyebrow>BLOK</Eyebrow>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>
          {draft.sessionsPerWeek}x/week — {draft.splitType}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
          {draft.sessionTemplateIds.map((id) => templateById.get(id)?.name ?? id).join(', ')}
        </p>
      </div>

      <div>
        <Eyebrow>VERWACHTE PLANIMPACT</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{proposal.explanation}</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{proposal.consequences}</p>
      </div>

      {(removed.length > 0 || added.length > 0) && (
        <div className="flex flex-col gap-2">
          {removed.map((c) => (
            <div key={c.plannedSessionId} className="text-xs" style={{ color: 'var(--color-danger)' }}>
              − {c.fromDate}: {c.reason}
            </div>
          ))}
          {added.map((c, i) => (
            <div key={i} className="text-xs" style={{ color: 'var(--color-success)' }}>
              + {c.newSessionDraft?.scheduledDate}: {templateById.get(c.newSessionDraft?.templateId ?? '')?.name ?? c.newSessionDraft?.templateId}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-3">
        <SecondaryButton onClick={onBack}>TERUG</SecondaryButton>
        <PrimaryButton onClick={onConfirm}>BLOK ACTIVEREN</PrimaryButton>
      </div>
    </div>
  );
}
