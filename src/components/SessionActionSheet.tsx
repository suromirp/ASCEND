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
import type { PlaceReason } from '../engine/placeReason';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextButton } from './TextButton';
import type { PlannedSession, SessionLog, SessionTemplate, SessionVariant, SubjectiveFeel } from '../models/training';
import type { Program } from '../models/program';
import { availableVariants, resolveEffectiveFullDuration, resolveVariantDuration, weeklyProgressionNote } from '../engine/substitutions';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { ExerciseLogger } from './ExerciseLogger';
import { TrainingBriefing } from './TrainingBriefing';
import { HowDidItGoSheet } from './HowDidItGoSheet';
import { briefingEntry, briefingRowLine, doTodayOpens, entryAction, missionButton } from '../engine/briefing';
import { useBriefingView } from './useBriefingView';
import { useWatchLink } from './useWatchLink';
import { useTrainingPlaces } from './useTrainingPlaces';
import { WatchSheet } from './WatchSheet';
import { useWatchSheet } from './useWatchSheet';
import { WATCH_SHEET_TEXT } from '../engine/watchSheet';
import { buildWorkoutPlan } from '../engine/workoutPlan';
import { useSheetClose } from '../utils/useSheetClose';
import { saveOnCard, type ShownSaveNote } from '../state/logSave';
import { PrimaryButton, SecondaryButton, InfoButton } from './ui';
import { Icon } from './icons';
import { SheetHeader } from './SheetHeader';
import { useAppData } from '../state/AppDataContext';
import { isSportEnabled, sessionKindLabel, templateSport } from '../engine/sports';
import { getModalities, isCyclingModality } from '../data/modalities';
import { addDays, weekdayLongNL, weekdayShortNL, formatDateNL, todayISO } from '../utils/dates';
import { MoveSuggestions } from './MoveSuggestions';
import { SheetFrame } from './SheetFrame';
import { StrengthDoneElsewhere, type StrengthDoneExtra } from './StrengthDoneElsewhere';
import { WarmupRow } from './WarmupRow';
import { WatchStatusRow } from './WatchStatusRow';
import { ChoiceStrip } from './ChoiceStrip';
import { SheetRow, SheetRows } from './SheetRows';
import { isLegHeavyTemplate } from '../engine/scheduler';
import { REST_DAY_COPY } from '../data/restDayCopy';
import type { MoveSuggestion } from '../engine/moveSuggestions';
import type { SwapOption } from '../engine/weekSwap';
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
  catchUp = false,
  caughtUpOn,
  placeReason,
  swapOptions = [],
  onSwap,
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
  // Een gemiste training die je naar later zet (engine/catchUp.ts): dezelfde dagkeuze, alleen vandaag of later.
  catchUp?: boolean;
  // De oude rij van een inhaal ("ingehaald op za 31"): alleen dat feit, geen acties, zodat je hem niet
  // dubbel plant of logt.
  caughtUpOn?: string;
  // Week: waarom de training op deze dag staat (engine/placeReason.ts), achter één tik.
  placeReason?: PlaceReason;
  // Week: de andere trainingen van deze week waarmee deze van dag kan ruilen (engine/weekSwap.ts).
  swapOptions?: SwapOption[];
  onSwap?: (otherId: string) => void;
}) {
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // "Hoe je het doet" for a day still to come: the training screen of that day, to read only.
  const [showPreview, setShowPreview] = useState(false);
  // De Briefing (spoor 5): voor een training buiten te voet op de plek van "Hoe je het doet".
  const [showBriefing, setShowBriefing] = useState(false);
  // Zelf invullen vanuit de Briefing: het blad Hoe ging het? erover.
  const [showManual, setShowManual] = useState(false);
  const [step, setStep] = useState<'main' | 'done' | 'move' | 'swap'>(startStep ?? 'main');
  const [whyOpen, setWhyOpen] = useState(false);
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
  const { settings, sessionLogs, logSession, reportStorageError, refresh } = useAppData();
  const restMode = settings.restDayMode ?? 'rest';
  const bikeOption = isSportEnabled('cycling', settings.enabledSports) && templateSport(template) !== 'cycling'
    && (getModalities(template.id) ?? []).some((m) => isCyclingModality(m.key));
  const guide = getTrainingGuide(template.id);
  // Vanaf het moment dat het blad begint te sluiten leest niemand zijn zin nog (state/logSave.ts#saveOnCard).
  const leavingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const { closing, requestClose, sheetRef } = useSheetClose(onClose, 200, undefined, () => { leavingRef.current = true; });
  // Het blad Je horloge (engine/watchSheet.ts): een rij in Andere keuzes, alleen voor een training die
  // nog moet komen en waarvoor het blad iets heeft (docs/visie/Ontwerp Info-blad.md, spoor 2).
  const [showWatch, setShowWatch] = useState(false);
  const garmin = buildWorkoutPlan(template, session.scheduledDate, program)?.garmin;
  const watchView = useWatchSheet({ template, garmin, session, hasZonesNote: !!guide?.garminNote });
  const navigate = useNavigate();
  const today = todayISO();
  const skipped = session.status === 'skipped';
  const canComeBack = skipped && !!onBackOnPlan && session.scheduledDate >= today;
  const kind: DoneKind = quickComplete ? 'quick' : template.type === 'strength' ? 'inApp' : 'log';

  // Strength kept in MacroFactor: the workouts of the last file read. A workout
  // of this training on its day that is not saved yet replaces "Gedaan" with
  // saving it; otherwise its minutes are what the "Gedaan" step proposes.
  const [macroFactor, setMacroFactor] = useState<MacroFactorSource>();
  const [saving, setSaving] = useState(false);
  // De uitkomst van Opslaan (MacroFactor) als er (nog) geen log staat; alleen mislukt is amber.
  const [saveNote, setSaveNote] = useState<ShownSaveNote>();
  const lateOutstanding = useRef(new Set<string>());
  useEffect(() => {
    if (!quickComplete || completedLog) return;
    let live = true;
    void Promise.all([getMacroFactorState(), getMapping()])
      .then(([state, mapping]) => { if (live) setMacroFactor({ workouts: state.workouts, mapping, dismissed: state.dismissed }); })
      .catch(() => { /* without the file: the plan's minutes */ });
    return () => { live = false; };
  }, [quickComplete, completedLog]);
  const waiting = quickComplete && !completedLog ? pendingMacroFactorWorkout(session.scheduledDate, template.id, macroFactor, sessionLogs) : undefined;
  // De Briefing: dezelfde stand als op Vandaag (engine/briefing.ts#missionButton). Vinkt je horloge
  // af, dan is Briefing op de dag zelf de hoofdknop en Gedaan de rij Zelf invullen.
  const places = useTrainingPlaces();
  const briefingView = useBriefingView({ template, session, date: session.scheduledDate, program, storedPlace: places?.[session.id] });
  const { watchLink, watchSource } = useWatchLink();
  const watchTicks = missionButton({ template, session, logs: sessionLogs, watchLink, watchSource }) === 'briefing';
  const planned = sessionSheetActions({ date: session.scheduledDate, today, skipped, canComeBack, kind, workoutWaiting: !!waiting, canSwap: !!onSwap && swapOptions.length > 0, briefing: briefingEntry(template), watchTicks });
  // Spoor 1 (docs/visie/Ontwerp trainingsscherm minimaal.md): voor een training te voet bestaat Hoe je
  // het doet niet meer, ook niet op een dag die voorbij is; die rij opent de Briefing. De keuzes en hun
  // volgorde blijven die van engine/sessionActions.ts.
  const actions = { main: entryAction(planned.main, template), rows: planned.rows.map((a) => entryAction(a, template)) };
  const duration = strengthDoneDuration({ scheduledDate: doneToday ? today : session.scheduledDate }, template, fullDuration, macroFactor, sessionLogs);

  const info = guide ? <InfoButton onClick={() => setShowGuide(true)} label="Waarom deze training" /> : undefined;
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
      <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={`${template.name} verplaatsen`} scrollKey="move" head={<SheetHeader eyebrow="Verplaatsen" title={template.name} facts={`${catchUp ? 'Stond' : 'Staat'} op ${weekdayLongNL(session.scheduledDate)} ${formatDateNL(session.scheduledDate)}`} onBack={() => setStep('main')} onClose={requestClose} />}>
        <div className="mt-6">
          <MoveSuggestions
            sessionDate={session.scheduledDate}
            originalDate={session.movedFromDate}
            suggestions={suggestions}
            onPick={(sug) => onPickSuggestion?.(sug)}
            onPickDate={onMove}
            onSameDay={canComeBack ? onBackOnPlan : undefined}
            catchUp={catchUp}
          />
        </div>
      </SheetFrame>
    );
  }

  if (step === 'swap') {
    return (
      <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={`${template.name} ruilen`} scrollKey="swap" head={<SheetHeader eyebrow="Ruilen" title={template.name} facts={`Staat op ${weekdayLongNL(session.scheduledDate)} ${formatDateNL(session.scheduledDate)}`} onBack={() => setStep('main')} onClose={requestClose} />}>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>Kies een training van deze week. Die twee ruilen van dag.</p>
        <div className="mt-4">
          <SheetRows label="Ruilen met">
            {swapOptions.map((o) => (
              <SheetRow
                key={o.session.id}
                title={o.template.name}
                sub={`${dayLabel(o.session.scheduledDate, today)}${o.hint ? ` · ${o.hint}` : ''}`}
                onClick={() => onSwap?.(o.session.id)}
              />
            ))}
          </SheetRows>
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
      case 'swap': return setStep('swap');
      case 'preview': return setShowPreview(true);
      case 'briefing': return setShowBriefing(true);
      case 'skip': return onSkip();
      case 'backOnPlan': return onBackOnPlan?.();
      case 'doToday':
        if (kind === 'quick') { setDoneToday(true); setStep('done'); }
        // Een training te voet: meteen het invullen (engine/briefing.ts#doTodayOpens), niet het oude scherm.
        else if (doTodayOpens(template) === 'log') (onLog ?? onStart)('full');
        else onStart('full');
        return;
      case 'saveWorkout':
        if (!waiting || saving) return;
        setSaving(true);
        if (!lateOutstanding.current.has(waiting.externalId)) setSaveNote(undefined);
        // Het antwoord via state/logSave.ts#saveOnCard, zoals de kaart Van je horloge: het blad sluit alleen als
        // het log er nu staat; anders blijft het open met een zin, en mag je opnieuw tikken.
        void saveOnCard(logSession, workoutToDraft(waiting, template, session, allProfiles(settings.strengthModel)), waiting.externalId, {
          outstanding: lateOutstanding.current,
          mounted: () => mountedRef.current,
          showing: () => !leavingRef.current,
          report: reportStorageError,
          apply: (next) => {
            if (next.refresh) void refresh().catch(() => undefined);
            setSaveNote(next.note);
            if (next.closeSheet && !next.note) requestClose();
          },
        }).then(() => { if (mountedRef.current) setSaving(false); });
        return;
    }
  };
  const label: Record<SheetAction, string> = {
    done: skipped ? 'Toch gedaan' : actions.main === 'briefing' ? 'Zelf invullen' : 'Gedaan',
    // Kracht start je in de app (Forge); een loop of tocht doe je met je horloge, dus
    // hier opent het alleen de uitleg en opbouw, naast Gedaan.
    start: template.type === 'strength' ? 'Training starten' : 'Hoe je het doet',
    preview: 'Hoe je het doet',
    briefing: 'Briefing',
    move: 'Verplaatsen',
    swap: 'Ruilen',
    skip: 'Overslaan',
    backOnPlan: 'Toch doen',
    doToday: 'Vandaag al doen',
    saveWorkout: saving ? 'Bezig…' : 'Opslaan',
  };
  const due = session.scheduledDate <= today;
  // Met de Briefing erbij staat het horloge al in de Briefing (het vak Horloge): geen eigen rij.
  const withBriefing = actions.main === 'briefing' || actions.rows.includes('briefing');
  const showWatchRow = watchView.hasWatchSheet && !skipped && session.scheduledDate >= today && !withBriefing;
  // De rij Je horloge staat direct na Hoe je het doet, of bovenaan als die er niet is.
  const afterRow = actions.rows.findIndex((a) => a === 'start' || a === 'preview' || a === 'briefing');
  const watchRow = showWatchRow ? <SheetRow key="horloge" title={WATCH_SHEET_TEXT.row} sub={watchView.rowSub} sheetFrom onClick={() => setShowWatch(true)} /> : null;
  const facts = [skipped ? 'Overgeslagen' : null, sessionKindLabel(template), `${minutes} min`, note].filter(Boolean).join(' · ');
  // Short and minimum versions (when switched on): one strip that the gold
  // button and "Training starten" both follow.
  const showVariants = due && !skipped && kind !== 'quick' && variants.length > 1;

  return (
    <SheetFrame closing={closing} sheetRef={sheetRef} onClose={requestClose} label={template.name} scrollKey="main" head={<SheetHeader eyebrow={eyebrow} title={template.name} info={info} facts={facts} onClose={requestClose} />}>
      {guideSheet}
      {showWatch && watchView.hasWatchSheet && (
        <WatchSheet
          view={watchView}
          template={template}
          session={session}
          garmin={garmin}
          dayLabel={guideDayLabel(template, session.scheduledDate)}
          onClose={() => setShowWatch(false)}
          onLeave={requestClose}
        />
      )}
      {showBriefing && (
        <TrainingBriefing
          template={template}
          session={session}
          date={session.scheduledDate}
          program={program}
          onClose={() => setShowBriefing(false)}
          // Zelf invullen: het blad Hoe ging het? over de Briefing; na Opslaan gaat alles dicht.
          onManual={() => setShowManual(true)}
          onLeave={requestClose}
        />
      )}
      {showBriefing && showManual && (
        <HowDidItGoSheet template={template} plannedSessionId={session.id} scheduledDate={session.scheduledDate} program={program} onClose={() => setShowManual(false)} onSaved={() => { setShowBriefing(false); requestClose(); }} />
      )}
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
      {placeReason && (
        <div className="mt-1">
          <TextButton tone="dim" icon="omlaag" flipped={whyOpen} aria-expanded={whyOpen} onClick={() => setWhyOpen((v) => !v)}>Waarom staat dit hier?</TextButton>
          {whyOpen && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
              {placeReason.text}
              {placeReason.extra && <span className="mt-1 block" style={{ color: 'var(--color-ink-dim)' }}>{placeReason.extra}</span>}
            </p>
          )}
        </div>
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
        {caughtUpOn ? (
          <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
            Deze training is {caughtUpOn}. Daar staat hij nu in je week.
          </p>
        ) : (<>
        <div>
          <PrimaryButton onClick={run(actions.main)} disabled={saving}>{label[actions.main]}</PrimaryButton>
          {saveNote && actions.main === 'saveWorkout' && (
            <p role="status" className="mt-2 text-[13px] leading-snug" style={{ color: saveNote.warn ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{saveNote.text}</p>
          )}
          {kind === 'quick' && actions.main === 'done' && (
            <p className="mt-2 text-center text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>{SETS_FROM_MACROFACTOR}</p>
          )}
        </div>
        {(actions.rows.length > 0 || watchRow) && (
          <SheetRows label="Andere keuzes">
            {afterRow < 0 && watchRow}
            {actions.rows.flatMap((a, i) => {
              const row = <SheetRow key={a} title={label[a]} sub={a === 'briefing' && briefingView ? briefingRowLine(briefingView) : undefined} onClick={run(a)} />;
              return i === afterRow && watchRow ? [row, watchRow] : [row];
            })}
          </SheetRows>
        )}
        </>)}
        {template.type === 'strength' && (
          <div className="flex justify-center">
            <TextButton tone="dim" icon="verder" onClick={() => { requestClose(); window.setTimeout(() => navigate('/forge'), 280); }}>Forge</TextButton>
          </div>
        )}
      </div>
    </SheetFrame>
  );
}
