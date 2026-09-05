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
import { computeStrengthPlacementPlan } from '../engine/strengthScheduling';
import { addDays, todayISO } from '../utils/dates';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { Portal } from './Portal';
import { useSheetClose } from '../utils/useSheetClose';

const inputStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };

const SOURCE_LABEL: Record<StrengthProgramSource, string> = {
  macrofactor_workouts: 'MacroFactor Workouts',
  manual: 'Handmatig bijgehouden',
  future_provider: 'Andere externe app',
};

type Step = { kind: 'edit'; draft: StrengthProgramStrategy } | { kind: 'preview'; draft: StrengthProgramStrategy } | { kind: 'applying' } | { kind: 'done' } | { kind: 'error'; message: string };

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
  const [step, setStep] = useState<Step>({ kind: 'edit', draft: initialStrategy });

  const strengthTemplates = useMemo(() => templates.filter((t) => t.type === 'strength'), [templates]);

  async function handleConfirm(draft: StrengthProgramStrategy) {
    setStep({ kind: 'applying' });
    await activateStrengthProgram(draft);
    onActivated?.();
    setStep({ kind: 'done' });
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

            {step.kind === 'edit' && (
              <EditStep
                draft={step.draft}
                strengthTemplates={strengthTemplates}
                onCancel={requestClose}
                onNext={(draft) => setStep({ kind: 'preview', draft })}
              />
            )}

            {step.kind === 'preview' && (
              <PreviewStep
                draft={step.draft}
                plannedSessions={plannedSessions}
                templates={templates}
                availability={goalEngineConfig.availability}
                onBack={() => setStep({ kind: 'edit', draft: step.draft })}
                onConfirm={() => void handleConfirm(step.draft)}
              />
            )}

            {step.kind === 'applying' && (
              <p className="mt-4 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Bezig met activeren…</p>
            )}

            {step.kind === 'done' && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-success)' }}>Krachtblok geactiveerd.</p>
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

function EditStep({
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
  const [prioritiesText, setPrioritiesText] = useState((draft.musclePriorities ?? []).join(', '));
  const [maintenanceText, setMaintenanceText] = useState((draft.muscleMaintenance ?? []).join(', '));

  function toggleTemplate(id: string) {
    setLocal((s) => ({
      ...s,
      sessionTemplateIds: s.sessionTemplateIds.includes(id)
        ? s.sessionTemplateIds.filter((t) => t !== id)
        : [...s.sessionTemplateIds, id],
    }));
  }

  const canProceed = local.sessionTemplateIds.length > 0 && local.sessionsPerWeek > 0 && local.splitType.trim().length > 0;

  function next() {
    const now = new Date().toISOString();
    const musclePriorities = prioritiesText.split(',').map((s) => s.trim()).filter(Boolean);
    const muscleMaintenance = maintenanceText.split(',').map((s) => s.trim()).filter(Boolean);
    const plannedEndDate = local.plannedBlockWeeks ? addDays(local.startDate, local.plannedBlockWeeks * 7) : undefined;
    onNext({
      ...local,
      musclePriorities: musclePriorities.length > 0 ? musclePriorities : undefined,
      muscleMaintenance: muscleMaintenance.length > 0 ? muscleMaintenance : undefined,
      plannedEndDate,
      updatedAt: now,
    });
  }

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
            value={local.sessionsPerWeek}
            onChange={(e) => setLocal((s) => ({ ...s, sessionsPerWeek: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
            style={inputStyle}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Split</label>
          <input
            type="text"
            value={local.splitType}
            onChange={(e) => setLocal((s) => ({ ...s, splitType: e.target.value }))}
            placeholder="upper_lower, full_body, ..."
            className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
            style={inputStyle}
          />
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
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Prioriteit (kommagescheiden, optioneel)</label>
        <input
          type="text"
          value={prioritiesText}
          onChange={(e) => setPrioritiesText(e.target.value)}
          placeholder="borst, schouders, armen"
          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
          style={inputStyle}
        />
      </div>
      <div>
        <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Onderhoud (kommagescheiden, optioneel)</label>
        <input
          type="text"
          value={maintenanceText}
          onChange={(e) => setMaintenanceText(e.target.value)}
          placeholder="rug, benen"
          className="mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
          style={inputStyle}
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
        <SecondaryButton onClick={onCancel}>ANNULEREN</SecondaryButton>
        <PrimaryButton onClick={next} disabled={!canProceed}>VOLGENDE</PrimaryButton>
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
