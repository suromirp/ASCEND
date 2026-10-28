// ASCEND: the sheet of one planned training (Week, and the other trainings
// on Vandaag). Production feedback on the old one: "dit is niet top". Ticking
// off and moving stood through each other in one long lap, with a form for
// a training that had not happened yet and underlined links.
//
// Now the sheet opens with what it is (day, name, kind and minutes), one gold
// button for the choice that fits the day and a short list of the others
// (engine/sessionActions.ts). "Gedaan" and "Verplaatsen" each open their own
// step; the arrow at the top goes back, the cross (and the back button of the
// phone, useSheetClose) closes. Rows and steps follow the fixed rule for a
// row and a sheet of the settings design: title left, at most one line under
// it, a sheet title in Marcellus, the cross at the top right.

import type { AllowedPair } from '../engine/allowedPair';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import type { Program } from '../models/program';
import { availableVariants, resolveEffectiveFullDuration, resolveVariantDuration, weeklyProgressionNote } from '../engine/substitutions';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { ExerciseLogger } from './ExerciseLogger';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { PrimaryButton, SecondaryButton, InfoButton } from './ui';
import { Icon } from './icons';
import { SheetHeader } from './SheetHeader';
import { useAppData } from '../state/AppDataContext';
import { isSportEnabled, sessionKindLabel, templateSport } from '../engine/sports';
import { getModalities, isCyclingModality } from '../data/modalities';
import { addDays, weekdayLongNL, weekdayShortNL, formatDateNL, todayISO } from '../utils/dates';
import { MoveSuggestions } from './MoveSuggestions';
import { StrengthDoneElsewhere, type StrengthDoneExtra } from './StrengthDoneElsewhere';
import { WarmupRow } from './WarmupRow';
import { WatchStatusRow } from './WatchStatusRow';
import { ChoiceStrip } from './ChoiceStrip';
import { SheetRow, SheetRows } from './SheetRows';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { REST_DAY_COPY } from '../data/restDayCopy';
import type { MoveSuggestion } from '../engine/moveSuggestions';
import { macroFactorLine, pendingMacroFactorWorkout, sessionSheetActions, strengthDoneDuration, type DoneKind, type MacroFactorSource, type SheetAction } from '../engine/sessionActions';
import { workoutToDraft } from '../engine/macrofactorLink';
import { allProfiles } from '../engine/machineWeights';
import { getMacroFactorState, getMapping } from '../storage/macrofactor';

const SETS_FROM_MACROFACTOR = 'Je sets komen vanzelf uit MacroFactor';
const VARIANT_LABEL: Record<SessionVariant, string> = { full: 'Volledig', short: 'Kort', minimum: 'Minimum', custom: 'Eigen' };

function dayLabel(iso: string, today: string): string {
  if (iso === today) return 'Vandaag';
  if (iso === addDays(today, 1)) return `Morgen, ${weekdayLongNL(iso)}`;
  if (iso === addDays(today, -1)) return `Gisteren, ${weekdayLongNL(iso)}`;
  return `${weekdayShortNL(iso)} ${formatDateNL(iso)}`;
}

// The head (day, title, cross) stays in view; only what is under it scrolls.
// The height limit itself is shared by every sheet (.animate-sheet-in in index.css).
function SheetFrame({ closing, sheetRef, onClose, label, scrollKey, head, children }: { closing: boolean; sheetRef: (node: HTMLElement | null) => void; onClose: () => void; label: string; scrollKey?: string; head: ReactNode; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // A new step starts at its top.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [scrollKey]);
  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={onClose}
      >
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className={`flex w-full max-w-md flex-col rounded-t-[20px] border border-b-0 ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full" style={{ background: 'var(--color-card-border)' }} />
          <div className="shrink-0 px-4 pb-1">{head}</div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      </div>
    </Portal>
  );
}

export function SessionActionSheet({
  session,
  template,
  allowedPair,
  program,
  quickComplete = false,
  completedLog,
  onStart,
  onLog,
  onMove,
  onSkip,
  onUndo,
  onClose,
  suggestions = [],
  onPickSuggestion,
  onDoneAsPlanned,
  onBackOnPlan,
  onOpenLog,
  startStep,
}: {
  session: PlannedSession;
  template: SessionTemplate;
  // De tweede van een toegestaan paar (rustige loop en beenkracht na elkaar): het feit en de reden.
  allowedPair?: AllowedPair;
  program: Program | null;
  quickComplete?: boolean;
  completedLog?: SessionLog;
  // The training screen; for strength kept in MacroFactor it saves the log at once.
  onStart: (variant: SessionVariant, feel?: SubjectiveFeel, durationMinutes?: number, extra?: StrengthDoneExtra) => void;
  // "Gedaan" for anything but strength: the training screen opened at its form.
  // Absent: the training screen from the start (onStart).
  onLog?: (variant: SessionVariant) => void;
  onMove: (date: string) => void;
  onSkip: () => void;
  onUndo?: () => void;
  onClose: () => void;
  // One tap moves the session there (engine/moveSuggestions.ts).
  suggestions?: MoveSuggestion[];
  onPickSuggestion?: (suggestion: MoveSuggestion) => void;
  // One tap with the plan's own minutes (engine/asPlanned.ts): a light recovery day.
  onDoneAsPlanned?: () => void;
  // "Toch doen": a skipped training back on its own day (only from today on).
  onBackOnPlan?: () => void;
  // A done training: the sheet with its numbers and "Wat speelde er?" (components/LogDetailSheet.tsx).
  onOpenLog?: () => void;
  // Een tik op de greep in Week opent het blad direct op Verplaatsen.
  startStep?: 'move';
}) {
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // "Hoe je het doet" for a day still to come: the training screen of that day, to read only.
  const [showPreview, setShowPreview] = useState(false);
  const [step, setStep] = useState<'main' | 'done' | 'move'>(startStep ?? 'main');
  // The "Gedaan" step for a training of a later day, done today.
  const [doneToday, setDoneToday] = useState(false);
  const variants = availableVariants(template);
  const [variant, setVariant] = useState<SessionVariant>('full');
  const fullDuration = resolveEffectiveFullDuration(template, session.scheduledDate, program);
  const minutes = variant === 'full' ? fullDuration : resolveVariantDuration(template, variant, session.scheduledDate, program);
  const note = weeklyProgressionNote(template, session.scheduledDate, program);
  // Fase 4: with cycling switched on, say so where a ride is a real
  // alternative for this session (it lists a bike modality). Hill
  // intervals and long hikes deliberately don't: their point is time and
  // climbing on foot.
  const { settings, sessionLogs, logSession } = useAppData();
  const restMode = settings.restDayMode ?? 'rest';
  const bikeOption = isSportEnabled('cycling', settings.enabledSports) && templateSport(template) !== 'cycling'
    && (getModalities(template.id) ?? []).some((m) => isCyclingModality(m.key));
  const guide = getTrainingGuide(template.id);
  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  const today = todayISO();
  const skipped = session.status === 'skipped';
  const canComeBack = skipped && !!onBackOnPlan && session.scheduledDate >= today;
  const kind: DoneKind = quickComplete ? 'quick' : template.type === 'strength' ? 'inApp' : 'log';

  // Strength kept in MacroFactor: the workouts of the last file read. A workout
  // of this training on its day that is not saved yet replaces "Gedaan" with
  // saving it; otherwise its minutes are what the "Gedaan" step proposes.
  const [macroFactor, setMacroFactor] = useState<MacroFactorSource>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!quickComplete || completedLog) return;
    let live = true;
    void Promise.all([getMacroFactorState(), getMapping()])
      .then(([state, mapping]) => { if (live) setMacroFactor({ workouts: state.workouts, mapping, dismissed: state.dismissed }); })
      .catch(() => { /* without the file: the plan's minutes */ });
    return () => { live = false; };
  }, [quickComplete, completedLog]);
  const waiting = quickComplete && !completedLog ? pendingMacroFactorWorkout(session.scheduledDate, template.id, macroFactor, sessionLogs) : undefined;
  const actions = sessionSheetActions({ date: session.scheduledDate, today, skipped, canComeBack, kind, workoutWaiting: !!waiting });
  const duration = strengthDoneDuration({ scheduledDate: doneToday ? today : session.scheduledDate }, template, fullDuration, macroFactor, sessionLogs);

  const info = guide ? <InfoButton onClick={() => setShowGuide(true)} label="Meer over deze training" /> : undefined;
  const guideSheet = showGuide && guide
    ? <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={session.scheduledDate} dayLabel={guideDayLabel(template, session.scheduledDate)} onClose={() => setShowGuide(false)} />
    : null;
  const eyebrow = dayLabel(session.scheduledDate, today);

  if (completedLog) {
    return (
      <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={template.name} head={<SheetHeader
          eyebrow={eyebrow}
          title={template.name}
          info={info}
          onClose={requestClose}
          facts={(
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--color-success-text)' }}>
              <Icon name="gedaan" size={16} />{macroFactorLine(completedLog) ?? `Gedaan · ${completedLog.durationMinutes} min`}
            </span>
          )}
        />}>
        {guideSheet}
        {onOpenLog && (
          <div className="mt-4">
            <SheetRows>
              <SheetRow title="Training bekijken" sub="Cijfers en wat speelde er" onClick={onOpenLog} />
            </SheetRows>
          </div>
        )}
        <div className="mt-6">
          {!confirmingUndo ? (
            <SecondaryButton onClick={() => setConfirmingUndo(true)} className="w-full">Ongedaan maken</SecondaryButton>
          ) : (
            <div className="flex gap-3">
              <SecondaryButton onClick={() => setConfirmingUndo(false)}>Annuleren</SecondaryButton>
              <PrimaryButton onClick={onUndo} fullWidth={false}>Bevestigen</PrimaryButton>
            </div>
          )}
        </div>
      </SheetFrame>
    );
  }

  // A rest day: nothing to start, move or skip (production feedback: the
  // Week sheet still offered "START VOLLEDIGE SESSIE" and moving it).
  if (template.type === 'recovery') {
    return (
      <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={REST_DAY_COPY[restMode].title} head={<SheetHeader eyebrow={eyebrow} title={REST_DAY_COPY[restMode].title} onClose={requestClose} />}>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{REST_DAY_COPY[restMode].detail}</p>
        <div className="mt-6 flex flex-col gap-4">
          {restMode === 'active' && onDoneAsPlanned && <PrimaryButton onClick={onDoneAsPlanned}>Gedaan</PrimaryButton>}
          <SheetRows>
            <SheetRow title={restMode === 'active' ? 'Invullen wat je deed' : 'Toch een wandeling vastleggen'} onClick={() => onStart('full')} />
          </SheetRows>
        </div>
      </SheetFrame>
    );
  }

  if (step === 'done') {
    return (
      <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={`${template.name}, gedaan`} scrollKey="done" head={<SheetHeader eyebrow={doneToday ? 'Vandaag gedaan' : 'Gedaan'} title={template.name} onBack={() => { setStep('main'); setDoneToday(false); }} onClose={requestClose} />}>
        <div className="mt-6">
          <StrengthDoneElsewhere
            key={duration.source}
            fullDuration={duration.minutes}
            durationSource={duration.source}
            legs={isLegHeavyTemplate(template)}
            submitLabel="Opslaan"
            onDone={(feel, mins, extra) => onStart('full', feel, mins, extra)}
          />
        </div>
      </SheetFrame>
    );
  }

  if (step === 'move') {
    return (
      <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={`${template.name} verplaatsen`} scrollKey="move" head={<SheetHeader eyebrow="Verplaatsen" title={template.name} facts={`Staat op ${weekdayLongNL(session.scheduledDate)} ${formatDateNL(session.scheduledDate)}`} onBack={() => setStep('main')} onClose={requestClose} />}>
        <div className="mt-6">
          <MoveSuggestions
            sessionDate={session.scheduledDate}
            originalDate={session.movedFromDate}
            suggestions={suggestions}
            onPick={(sug) => onPickSuggestion?.(sug)}
            onPickDate={onMove}
            onSameDay={canComeBack ? onBackOnPlan : undefined}
          />
        </div>
      </SheetFrame>
    );
  }

  const run = (action: SheetAction) => () => {
    switch (action) {
      case 'done':
        if (kind === 'quick') setStep('done');
        else (onLog ?? onStart)(variant);
        return;
      case 'start': return onStart(variant);
      case 'move': return setStep('move');
      case 'preview': return setShowPreview(true);
      case 'skip': return onSkip();
      case 'backOnPlan': return onBackOnPlan?.();
      case 'doToday':
        if (kind === 'quick') { setDoneToday(true); setStep('done'); } else onStart('full');
        return;
      case 'saveWorkout':
        if (!waiting || saving) return;
        setSaving(true);
        void logSession(workoutToDraft(waiting, template, session, allProfiles(settings.strengthModel))).then((ok) => (ok ? requestClose() : setSaving(false)));
        return;
    }
  };
  const label: Record<SheetAction, string> = {
    done: skipped ? 'Toch gedaan' : 'Gedaan',
    // Kracht start je in de app (Forge); een loop of tocht doe je met je horloge, dus
    // hier opent het alleen de uitleg en opbouw, naast Gedaan.
    start: template.type === 'strength' ? 'Training starten' : 'Hoe je het doet',
    preview: 'Hoe je het doet',
    move: 'Verplaatsen',
    skip: 'Overslaan',
    backOnPlan: 'Toch doen',
    doToday: 'Vandaag al doen',
    saveWorkout: saving ? 'Bezig…' : 'Opslaan',
  };
  const due = session.scheduledDate <= today;
  const facts = [skipped ? 'Overgeslagen' : null, sessionKindLabel(template), `${minutes} min`, note].filter(Boolean).join(' · ');
  // Short and minimum versions (when switched on): one strip that the gold
  // button and "Training starten" both follow.
  const showVariants = due && !skipped && kind !== 'quick' && variants.length > 1;

  return (
    <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={template.name} scrollKey="main" head={<SheetHeader eyebrow={eyebrow} title={template.name} info={info} facts={facts} onClose={requestClose} />}>
      {guideSheet}
      {showPreview && (
        <ExerciseLogger
          preview
          template={template}
          plannedSessionId={session.id}
          scheduledDate={session.scheduledDate}
          program={program}
          onClose={() => setShowPreview(false)}
        />
      )}
      {allowedPair && !skipped && (
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          {allowedPair.sheetText}
          <span className="mt-1 block text-xs">{allowedPair.source}</span>
        </p>
      )}
      {bikeOption && !skipped && (
        <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>Kan ook op de fiets, buiten of binnen.</p>
      )}
      <div className="mt-6 flex flex-col gap-4">
        {!skipped && <WatchStatusRow session={session} template={template} offer={false} onLeave={requestClose} />}
        {session.scheduledDate === today && !skipped && <WarmupRow template={template} />}
        {showVariants && (
          <ChoiceStrip
            label="Versie"
            options={variants.map((v) => ({ value: v, label: VARIANT_LABEL[v] }))}
            value={variant}
            onChange={(v) => setVariant(v ?? 'full')}
          />
        )}
        {waiting && actions.main === 'saveWorkout' && (
          <p className="flex items-center gap-2 font-sans text-[15px] tabular-nums" style={{ color: 'var(--color-ink)' }}>
            <span style={{ color: 'var(--color-success-text)' }}><Icon name="kracht" size={20} /></span>{macroFactorLine(waiting)}
          </p>
        )}
        <div>
          <PrimaryButton onClick={run(actions.main)} disabled={saving}>{label[actions.main]}</PrimaryButton>
          {kind === 'quick' && actions.main === 'done' && (
            <p className="mt-2 text-center text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>{SETS_FROM_MACROFACTOR}</p>
          )}
        </div>
        {actions.rows.length > 0 && (
          <SheetRows label="Andere keuzes">
            {actions.rows.map((a) => <SheetRow key={a} title={label[a]} onClick={run(a)} />)}
          </SheetRows>
        )}
      </div>
    </SheetFrame>
  );
}
