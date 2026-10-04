import { useEffect, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { Portal } from './Portal';
import { useSheetClose } from '../utils/useSheetClose';
import { formatDateNL } from '../utils/dates';
import { webBackupFileAdapter } from '../storage/backupFileAdapter';
import {
  normalizeBackupToCurrentModel,
  buildImportPreview,
  createImportPlan,
  createPreImportSnapshot,
  applyImportPlan,
  parseBackupText,
  restoreSnapshot,
  defaultActionsForMode,
  defaultPlanPolicyForMode,
  CATEGORY_SUPPORTED_ACTIONS,
} from '../storage/backup';
import {
  ALL_CATEGORIES,
  CATEGORY_LABEL,
  type NormalizedBackupData,
  type ImportMode,
  type CategoryAction,
  type PlanPolicy,
  type BackupDataCategory,
  type ImportPreview,
} from '../storage/backupTypes';

type Step =
  | { kind: 'picking' }
  | { kind: 'mode'; backup: NormalizedBackupData }
  | { kind: 'options'; backup: NormalizedBackupData; categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>; planPolicy: PlanPolicy }
  | { kind: 'preview'; backup: NormalizedBackupData; mode: ImportMode; categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>; planPolicy: PlanPolicy; preview: ImportPreview }
  | { kind: 'applying' }
  | { kind: 'done'; snapshotId: string }
  | { kind: 'undoing' }
  | { kind: 'undone' }
  | { kind: 'error'; message: string };

const MODE_LABEL: Record<ImportMode, string> = {
  full_restore: 'Volledig herstellen',
  merge: 'Gegevens samenvoegen',
  custom: 'Zelf kiezen',
};

const MODE_NOTE: Record<ImportMode, string> = {
  full_restore: 'Zet planning, doelen en instellingen terug naar de stand van de back-up. Trainingen worden nooit verwijderd.',
  merge: 'Voegt de back-up toe aan wat je nu al hebt. Bestaande gegevens blijven staan.',
  custom: 'Kies per onderdeel wat er met de back-up gebeurt.',
};

const ACTION_LABEL: Record<CategoryAction, string> = {
  keep_current: 'Huidige behouden',
  merge: 'Samenvoegen',
  replace: 'Vervangen door back-up',
  ignore: 'Negeren',
};

export function ImportWizard({ onClose }: { onClose: () => void }) {
  const { refresh } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose);
  const [step, setStep] = useState<Step>({ kind: 'picking' });

  // Runs exactly once on mount — the wizard only ever opens because the
  // user just asked to import, so going straight to the file picker (rather
  // than a redundant "start import" button first) is the fewest-taps path.
  useEffect(() => {
    (async () => {
      try {
        const file = await webBackupFileAdapter.pickBackupFile();
        if (!file) {
          requestClose();
          return;
        }
        const text = await file.readText();
        const parsed = parseBackupText(text);
        const backup = normalizeBackupToCurrentModel(parsed);
        setStep({ kind: 'mode', backup });
      } catch (err) {
        setStep({ kind: 'error', message: err instanceof Error ? err.message : 'Kon dit back-upbestand niet lezen.' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function goToPreview(
    backup: NormalizedBackupData,
    mode: ImportMode,
    categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
    planPolicy: PlanPolicy,
  ) {
    const preview = await buildImportPreview(backup, categorySelections, planPolicy);
    setStep({ kind: 'preview', backup, mode, categorySelections, planPolicy, preview });
  }

  function chooseMode(backup: NormalizedBackupData, mode: ImportMode) {
    const planPolicy = defaultPlanPolicyForMode(mode);
    if (mode === 'custom') {
      setStep({ kind: 'options', backup, categorySelections: defaultActionsForMode(mode), planPolicy });
      return;
    }
    void goToPreview(backup, mode, defaultActionsForMode(mode), planPolicy);
  }

  async function confirmImport(
    backup: NormalizedBackupData,
    mode: ImportMode,
    categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>,
    planPolicy: PlanPolicy,
    preview: ImportPreview,
  ) {
    setStep({ kind: 'applying' });
    try {
      const snapshot = await createPreImportSnapshot();
      const conflicts = preview.diffByCategory.flatMap((d) => d.conflicts);
      const plan = createImportPlan(backup, mode, categorySelections, planPolicy, conflicts, snapshot.id);
      await applyImportPlan(backup, plan);
      await refresh();
      setStep({ kind: 'done', snapshotId: snapshot.id });
    } catch (err) {
      setStep({ kind: 'error', message: err instanceof Error ? err.message : 'Importeren is mislukt. Er is niets gewijzigd.' });
    }
  }

  async function undoImport(snapshotId: string) {
    setStep({ kind: 'undoing' });
    try {
      await restoreSnapshot(snapshotId);
      await refresh();
      setStep({ kind: 'undone' });
    } catch (err) {
      setStep({ kind: 'error', message: err instanceof Error ? err.message : 'Ongedaan maken is mislukt.' });
    }
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={step.kind === 'applying' || step.kind === 'undoing' ? undefined : requestClose}
      >
        <div
          className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="rounded-b-none border-b-0 pb-6">
            <Eyebrow>GEGEVENS IMPORTEREN</Eyebrow>

            {step.kind === 'picking' && (
              <p className="mt-4 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
                Kies een ASCEND back-upbestand…
              </p>
            )}

            {step.kind === 'mode' && (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Back-up van {formatDateNL(step.backup.createdAt.slice(0, 10))}
                  {step.backup.sourceBackupSchemaVersion === 0 && ' (oudere export)'}
                </p>
                {(['full_restore', 'merge', 'custom'] as ImportMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => chooseMode(step.backup, mode)}
                    className="rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                    style={{ borderColor: 'var(--color-card-border)' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{MODE_LABEL[mode]}</p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{MODE_NOTE[mode]}</p>
                  </button>
                ))}
              </div>
            )}

            {step.kind === 'options' && (
              <OptionsStep
                categorySelections={step.categorySelections}
                planPolicy={step.planPolicy}
                hasSchedule={step.backup.plannedSessions.length > 0}
                onChange={(categorySelections, planPolicy) => setStep({ ...step, categorySelections, planPolicy })}
                onNext={() => void goToPreview(step.backup, 'custom', step.categorySelections, step.planPolicy)}
                onBack={() => setStep({ kind: 'mode', backup: step.backup })}
              />
            )}

            {step.kind === 'preview' && (
              <PreviewStep
                preview={step.preview}
                onConfirm={() => void confirmImport(step.backup, step.mode, step.categorySelections, step.planPolicy, step.preview)}
                onBack={() =>
                  step.mode === 'custom'
                    ? setStep({ kind: 'options', backup: step.backup, categorySelections: step.categorySelections, planPolicy: step.planPolicy })
                    : setStep({ kind: 'mode', backup: step.backup })
                }
              />
            )}

            {step.kind === 'applying' && (
              <p className="mt-4 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Bezig met importeren…</p>
            )}

            {step.kind === 'done' && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-success-text)' }}>Import geslaagd.</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Klopt er iets niet? Je kunt de import ongedaan maken. Dat kan later ook via Meer, Gegevens.
                </p>
                <div className="flex gap-3">
                  <SecondaryButton onClick={() => void undoImport(step.snapshotId)}>ONGEDAAN MAKEN</SecondaryButton>
                  <PrimaryButton onClick={requestClose}>SLUITEN</PrimaryButton>
                </div>
              </div>
            )}

            {step.kind === 'undoing' && (
              <p className="mt-4 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Bezig met terugzetten…</p>
            )}

            {step.kind === 'undone' && (
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                  Je gegevens staan weer zoals voor de import. Trainingen die je in de tussentijd hebt gelogd, zijn bewaard.
                </p>
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

function OptionsStep({
  categorySelections,
  planPolicy,
  hasSchedule,
  onChange,
  onNext,
  onBack,
}: {
  categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>;
  planPolicy: PlanPolicy;
  hasSchedule: boolean;
  onChange: (categorySelections: Partial<Record<BackupDataCategory, CategoryAction>>, planPolicy: PlanPolicy) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const scheduleCategories = ALL_CATEGORIES.filter((c) => c !== 'planned_schedule');
  return (
    <div className="mt-4 flex flex-col gap-3">
      {scheduleCategories.map((category) => (
        <div key={category} className="flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{CATEGORY_LABEL[category]}</span>
          <select
            value={categorySelections[category] ?? 'keep_current'}
            onChange={(e) => onChange({ ...categorySelections, [category]: e.target.value as CategoryAction }, planPolicy)}
            className="rounded-lg border bg-transparent px-2 py-1.5 text-xs"
            style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
          >
            {CATEGORY_SUPPORTED_ACTIONS[category].map((action) => (
              <option key={action} value={action} style={{ background: 'var(--color-charcoal)' }}>
                {ACTION_LABEL[action]}
              </option>
            ))}
          </select>
        </div>
      ))}

      {hasSchedule && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{CATEGORY_LABEL.planned_schedule}</span>
          <select
            value={planPolicy}
            onChange={(e) => onChange(categorySelections, e.target.value as PlanPolicy)}
            className="rounded-lg border bg-transparent px-2 py-1.5 text-xs"
            style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
          >
            <option value="keep_current_plan" style={{ background: 'var(--color-charcoal)' }}>Huidige planning behouden</option>
            <option value="restore_backup_plan" style={{ background: 'var(--color-charcoal)' }}>Planning uit back-up herstellen</option>
          </select>
        </div>
      )}

      <div className="mt-2 flex gap-3">
        <SecondaryButton onClick={onBack}>TERUG</SecondaryButton>
        <PrimaryButton onClick={onNext}>VOLGENDE</PrimaryButton>
      </div>
    </div>
  );
}

function PreviewStep({ preview, onConfirm, onBack }: { preview: ImportPreview; onConfirm: () => void; onBack: () => void }) {
  const totalConflicts = preview.diffByCategory.reduce((sum, d) => sum + d.conflicts.length, 0);
  const totalRemoved = preview.diffByCategory.reduce((sum, d) => sum + d.toRemove, 0);
  const { logsSinceBackup, skippedInvalid } = preview.backupMeta;
  const shown = preview.diffByCategory.filter((d) => d.action !== 'keep_current' && d.action !== 'ignore' || d.missingInBackup);
  return (
    <div className="mt-4 flex flex-col gap-3">
      {preview.backupMeta.restoreDateWarning && (
        <p className="rounded-lg border p-2 text-xs" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
          {preview.backupMeta.restoreDateWarning}
        </p>
      )}
      {logsSinceBackup > 0 && (
        <p className="rounded-lg border p-2 text-xs" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}>
          Je hebt na deze back-up nog {logsSinceBackup} {logsSinceBackup === 1 ? 'training' : 'trainingen'} gelogd. Die blijven bewaard.
        </p>
      )}
      {skippedInvalid > 0 && (
        <p className="rounded-lg border p-2 text-xs" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>
          {skippedInvalid} {skippedInvalid === 1 ? 'onderdeel is' : 'onderdelen zijn'} onvolledig of beschadigd en {skippedInvalid === 1 ? 'wordt' : 'worden'} overgeslagen.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {shown.map((entry) => (
          <div key={entry.category} className="flex flex-col gap-0.5 text-xs">
            <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>{CATEGORY_LABEL[entry.category]}</span>
            {entry.missingInBackup ? (
              <span style={{ color: 'var(--color-ink-dim)' }}>Zit niet in deze back-up, blijft zoals het is</span>
            ) : (
              <span style={{ color: 'var(--color-ink-dim)' }}>
                {[
                  entry.toAdd > 0 && `${entry.toAdd} nieuw`,
                  entry.toReplace > 0 && `${entry.toReplace} bijgewerkt`,
                  entry.toSkipDuplicate > 0 && `${entry.toSkipDuplicate} al aanwezig`,
                ].filter(Boolean).join(' · ') || 'Geen wijzigingen'}
              </span>
            )}
            {entry.toRemove > 0 && (
              <span style={{ color: 'var(--color-danger-text)' }}>{entry.toRemove} verdwijnen, omdat ze niet in de back-up staan</span>
            )}
            {entry.conflicts.length > 0 && (
              <span style={{ color: 'var(--color-warning)' }}>{entry.conflicts.length} verschillen met wat je nu hebt. Jouw huidige versie blijft staan.</span>
            )}
          </div>
        ))}
        {shown.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Er wordt niets geïmporteerd.</p>
        )}
      </div>
      <p className="text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>
        Vlak voor het importeren bewaart ASCEND een kopie van je huidige gegevens. Daarmee kun je de import ongedaan maken.
        Trainingen worden bij importeren nooit verwijderd.
      </p>
      {totalRemoved > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--color-danger-text)' }}>
          Let op: in totaal verdwijnen {totalRemoved} onderdelen die nu op je toestel staan.
        </p>
      )}
      {totalConflicts > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--color-warning)' }}>
          Bij {totalConflicts} {totalConflicts === 1 ? 'onderdeel' : 'onderdelen'} blijft jouw huidige versie staan.
        </p>
      )}
      <div className="mt-2 flex gap-3">
        <SecondaryButton onClick={onBack}>TERUG</SecondaryButton>
        <PrimaryButton onClick={onConfirm}>IMPORTEREN</PrimaryButton>
      </div>
    </div>
  );
}
