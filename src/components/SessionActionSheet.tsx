import { useState } from 'react';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import type { Program } from '../models/program';
import { availableVariants, resolveEffectiveFullDuration, weeklyProgressionNote } from '../engine/substitutions';
import { getTrainingGuide } from '../data/trainingGuide';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, InfoButton } from './ui';

const FEEL_LABEL: Record<SubjectiveFeel, string> = { better: 'BETER', normal: 'NORMAAL', worse: 'SLECHTER' };

export function SessionActionSheet({
  session,
  template,
  program,
  quickComplete = false,
  completedLog,
  onStart,
  onMove,
  onSkip,
  onUndo,
  onClose,
}: {
  session: PlannedSession;
  template: SessionTemplate;
  program: Program | null;
  quickComplete?: boolean;
  completedLog?: SessionLog;
  onStart: (variant: SessionVariant, feel?: SubjectiveFeel, durationMinutes?: number) => void;
  onMove: (date: string) => void;
  onSkip: () => void;
  onUndo?: () => void;
  onClose: () => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const variants = availableVariants(template);
  const fullDuration = resolveEffectiveFullDuration(template, session.scheduledDate, program);
  // Same MacroFactor-duration override as TodayMissionCard (see there).
  const [quickDuration, setQuickDuration] = useState<number | ''>(fullDuration);
  const note = weeklyProgressionNote(template, session.scheduledDate, program);
  const guide = getTrainingGuide(template.id);
  const { closing, requestClose } = useSheetClose(onClose);

  if (completedLog) {
    return (
      <Portal>
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
          onClick={requestClose}
        >
          <div className={`w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
            <Card className="rounded-b-none border-b-0 pb-6">
              <div className="flex items-start justify-between gap-2">
                <Eyebrow>{session.scheduledDate}</Eyebrow>
                {guide && <InfoButton onClick={() => setShowGuide(true)} />}
              </div>
              <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-success)' }}>
                ✓ Voltooid • {completedLog.durationMinutes} min
              </p>

              {showGuide && guide && <TrainingGuideSheet title={template.name} guide={guide} onClose={() => setShowGuide(false)} />}

              <div className="mt-4">
                {!confirmingUndo ? (
                  <SecondaryButton onClick={() => setConfirmingUndo(true)} className="w-full">ONGEDAAN MAKEN</SecondaryButton>
                ) : (
                  <div className="flex gap-3">
                    <SecondaryButton onClick={() => setConfirmingUndo(false)}>ANNULEREN</SecondaryButton>
                    <PrimaryButton onClick={onUndo}>BEVESTIG</PrimaryButton>
                  </div>
                )}
              </div>

              <button onClick={requestClose} className="mt-4 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                Sluiten
              </button>
            </Card>
          </div>
        </div>
      </Portal>
    );
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div className={`w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="rounded-b-none border-b-0 pb-6">
            <div className="flex items-start justify-between gap-2">
              <Eyebrow>{session.scheduledDate}</Eyebrow>
              {guide && <InfoButton onClick={() => setShowGuide(true)} />}
            </div>
            <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              ±{fullDuration} min{note ? ` • ${note}` : ''}{template.focus ? ` • ${template.focus}` : ''}
            </p>

            {showGuide && guide && <TrainingGuideSheet title={template.name} guide={guide} onClose={() => setShowGuide(false)} />}

            <div className="mt-4 flex flex-col gap-2">
              {quickComplete ? (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Duur (min) — uit MacroFactor</label>
                    <input
                      type="number"
                      value={quickDuration}
                      onChange={(e) => setQuickDuration(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-20 rounded-lg border px-2 py-1.5 text-right text-sm"
                      style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
                    />
                  </div>
                  <p className="mb-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde dit t.o.v. normaal?</p>
                  <div className="flex gap-2">
                    {(['better', 'normal', 'worse'] as const).map((f) => (
                      <PrimaryButton
                        key={f}
                        onClick={() => onStart('full', f, quickDuration === '' ? fullDuration : quickDuration)}
                        fullWidth={false}
                        className="text-xs"
                      >
                        {FEEL_LABEL[f]}
                      </PrimaryButton>
                    ))}
                  </div>
                </div>
              ) : (
                variants.map((v) => (
                  <PrimaryButton key={v} onClick={() => onStart(v)}>
                    {v === 'full' ? 'START VOLLEDIGE SESSIE' : v === 'short' ? 'START KORTE VERSIE' : 'START MINIMUM VERSIE'}
                  </PrimaryButton>
                ))
              )}
            </div>

            <div className="mt-3 flex gap-3">
              <SecondaryButton onClick={() => setShowDatePicker((s) => !s)}>VERPLAATS</SecondaryButton>
              <SecondaryButton onClick={onSkip}>OVERSLAAN</SecondaryButton>
            </div>

            {showDatePicker && (
              <div className="mt-3 rounded-xl border p-2" style={{ borderColor: 'var(--color-card-border)' }}>
                <input
                  type="date"
                  className="w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm"
                  style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
                  onChange={(e) => e.target.value && onMove(e.target.value)}
                />
              </div>
            )}

            <button onClick={requestClose} className="mt-4 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Sluiten
            </button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
