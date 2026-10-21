import { useState } from 'react';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import type { Program } from '../models/program';
import { availableVariants, resolveEffectiveFullDuration, weeklyProgressionNote } from '../engine/substitutions';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, PrimaryButton, SecondaryButton, Eyebrow, InfoButton } from './ui';
import { useAppData } from '../state/AppDataContext';
import { isSportEnabled, sessionKindLabel, templateSport } from '../engine/sports';
import { getModalities, isCyclingModality } from '../data/modalities';
import { weekdayShortNL, formatDateNL } from '../utils/dates';
import { MoveSuggestions } from './MoveSuggestions';
import { StrengthDoneElsewhere, type StrengthDoneExtra } from './StrengthDoneElsewhere';
import { WarmupRow } from './WarmupRow';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { REST_DAY_COPY } from '../data/restDayCopy';
import type { MoveSuggestion } from '../engine/moveSuggestions';

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
  suggestions = [],
  onPickSuggestion,
  onDoneAsPlanned,
}: {
  session: PlannedSession;
  template: SessionTemplate;
  program: Program | null;
  quickComplete?: boolean;
  completedLog?: SessionLog;
  onStart: (variant: SessionVariant, feel?: SubjectiveFeel, durationMinutes?: number, extra?: StrengthDoneExtra) => void;
  onMove: (date: string) => void;
  onSkip: () => void;
  onUndo?: () => void;
  onClose: () => void;
  // One tap moves the session there (engine/moveSuggestions.ts).
  suggestions?: MoveSuggestion[];
  onPickSuggestion?: (suggestion: MoveSuggestion) => void;
  // One tap with the plan's own minutes (engine/asPlanned.ts).
  onDoneAsPlanned?: () => void;
}) {
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const variants = availableVariants(template);
  const fullDuration = resolveEffectiveFullDuration(template, session.scheduledDate, program);
  const note = weeklyProgressionNote(template, session.scheduledDate, program);
  // Fase 4 — with cycling switched on, say so where a ride is a real
  // alternative for this session (it lists a bike modality). Hill
  // intervals and long hikes deliberately don't: their point is time and
  // climbing on foot.
  const { settings } = useAppData();
  const restMode = settings.restDayMode ?? 'rest';
  const bikeOption = isSportEnabled('cycling', settings.enabledSports) && templateSport(template) !== 'cycling'
    && (getModalities(template.id) ?? []).some((m) => isCyclingModality(m.key));
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
                <Eyebrow>{`${weekdayShortNL(session.scheduledDate)} ${formatDateNL(session.scheduledDate)}`}</Eyebrow>
                {guide && <InfoButton onClick={() => setShowGuide(true)} />}
              </div>
              <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-success-text)' }}>
                ✓ Voltooid • {completedLog.durationMinutes} min
              </p>

              {showGuide && guide && <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={session.scheduledDate} dayLabel={guideDayLabel(template, session.scheduledDate)} onClose={() => setShowGuide(false)} />}

              <div className="mt-4">
                {!confirmingUndo ? (
                  <SecondaryButton onClick={() => setConfirmingUndo(true)} className="w-full">ONGEDAAN MAKEN</SecondaryButton>
                ) : (
                  <div className="flex gap-3">
                    <SecondaryButton onClick={() => setConfirmingUndo(false)}>ANNULEREN</SecondaryButton>
                    <PrimaryButton onClick={onUndo}>BEVESTIGEN</PrimaryButton>
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

  // A rest day: nothing to start, move or skip (production feedback: the
  // Week sheet still offered "START VOLLEDIGE SESSIE" and moving it).
  if (template.type === 'recovery') {
    return (
      <Portal>
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
          onClick={requestClose}
        >
          <div className={`w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
            <Card className="rounded-b-none border-b-0 pb-6">
              <Eyebrow>{`${weekdayShortNL(session.scheduledDate)} ${formatDateNL(session.scheduledDate)}`}</Eyebrow>
              <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{REST_DAY_COPY[restMode].title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                {REST_DAY_COPY[restMode].detail}
              </p>
              {restMode === 'active' && onDoneAsPlanned && <SecondaryButton onClick={onDoneAsPlanned} className="mt-3">GEDAAN</SecondaryButton>}
              <button onClick={() => onStart('full')} className="mt-3 min-h-[40px] text-xs underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>
                {restMode === 'active' ? 'Invullen wat je deed' : 'Toch een wandeling vastleggen'}
              </button>
              <button onClick={requestClose} className="mt-2 min-h-[44px] w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
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
              <Eyebrow>{`${weekdayShortNL(session.scheduledDate)} ${formatDateNL(session.scheduledDate)}`}</Eyebrow>
              {guide && <InfoButton onClick={() => setShowGuide(true)} />}
            </div>
            <h3 className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h3>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              {sessionKindLabel(template)} • ±{fullDuration} min{note ? ` • ${note}` : ''}{template.focus ? ` • ${template.focus}` : ''}
            </p>
            {bikeOption && (
              <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                Kan ook op de fiets, buiten of binnen. Kies dat bij Waar train je?
              </p>
            )}

            {showGuide && guide && <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={session.scheduledDate} dayLabel={guideDayLabel(template, session.scheduledDate)} onClose={() => setShowGuide(false)} />}

            {!completedLog && <div className="mt-4"><WarmupRow template={template} /></div>}

            <div className="mt-4 flex flex-col gap-2">
              {quickComplete ? (
                <StrengthDoneElsewhere fullDuration={fullDuration} legs={isLegHeavyTemplate(template)} onDone={(feel, minutes, extra) => onStart('full', feel, minutes, extra)} />
              ) : (
                variants.map((v) => (
                  <PrimaryButton key={v} onClick={() => onStart(v)}>
                    {v === 'full' ? 'TRAINING STARTEN' : v === 'short' ? 'KORTE VERSIE STARTEN' : 'MINIMUMVERSIE STARTEN'}
                  </PrimaryButton>
                ))
              )}
            </div>

            <div className="mt-5">
              <MoveSuggestions
                sessionDate={session.scheduledDate}
                originalDate={session.movedFromDate}
                suggestions={suggestions}
                onPick={(sug) => onPickSuggestion?.(sug)}
                onPickDate={onMove}
                onSkip={onSkip}
              />
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
