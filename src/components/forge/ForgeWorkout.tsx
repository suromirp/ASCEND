// ASCEND: het workoutscherm van Forge. Opbouw en werking zoals MacroFactor
// Workouts, in de stijl van ASCEND (steen en contour, één gouden knop):
// per oefening een tabel die altijd open staat, alles vooringevuld, één tik
// per set, de rusttimer start vanzelf, en bij een stang de schijven per kant.
// Besluit: docs/beslissingen/2026-10-22-forge-workoutscherm.md. Alle regels
// staan in engine/forgeWorkout.ts; dit bestand toont ze en bewaart een concept.
//
// Met MacroFactor als bron (Instellingen, Krachttraining bijhouden) is het
// dezelfde tabel zonder invulvelden: het voorschrift om in de sportschool mee
// te kijken, en één knop om de training af te vinken.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { exerciseById } from '../../data/exercises';
import { useDrawingsFor } from '../useExerciseArtPrefetch';
import { canRemoveRow, reasonWithOwnCount, reinsertRow, removeSet, restoreDropped, rowLabel, swipeDeleteOn, type DroppedRow } from '../../engine/forgeRows';
import { canSwap, isAddedSlot, sessionPrescription, withoutAddedSlot, workoutWithoutAdded } from '../../engine/addedExercises';
import { learnedMinutesPerSet } from '../../engine/durationLearning';
import { capForTemplate, capLineFor, capSlots, resolveTimeCap, servesMountainMuscle } from '../../engine/forgeTimeCap';
import { forgeSlotsFor } from '../../engine/forgeSlots';
import { hasMountainGoal, swapPreference, swapReason } from '../../engine/mountainMuscles';
import { resolveExerciseArt, showsExerciseArt } from '../../engine/exerciseArtSettings';
import { ExerciseArtSheet } from '../ExerciseArtSheet';
import { ForgeStrip } from './ForgeStrip';
import { pageAt, resolveForgeLayout } from '../../engine/forgeLayout';
import { previewDayLine } from '../../engine/sessionActions';
import { restAlertChannels, restVibrationPattern } from '../../engine/restVibration';
import { currentBodyKg } from '../../engine/bodyWeight';
import {
  activeRow,
  applyReps,
  applyWeight,
  carryChange,
  resumeDraft,
  copyRow,
  dockFieldKey,
  exerciseComplete,
  makeLight,
  makeSnap,
  nextField,
  repsBounds,
  stepNumber,
  takeTarget,
  weightBounds,
  weightStepFor,
  REPS_STEP,
  type FieldName,
  type FieldRef,
  type RowRef,
} from '../../engine/forgeInput';
import {
  addRow,
  exerciseOf,
  hardestLegRir,
  legDayLine,
  planExercise,
  planStateBefore,
  planWorkout,
  plateSteps,
  progress,
  removeLastRow,
  swapOptions,
  tickAllRows,
  tickRow,
  toStrengthData,
  updateRow,
  usesPlates,
  type PlanContext,
  type WorkoutExercise,
} from '../../engine/forgeWorkout';
import { profileFor } from '../../engine/strengthWeights';
import { isLegHeavyTemplate } from '../../engine/scheduler';
import { templateSport } from '../../engine/sports';
import { durationForVariant, exercisesForVariant, resolveVariantDuration } from '../../engine/substitutions';
import { EXERCISE_NOTE_MAX, resolveStrengthSettings, withExerciseValue } from '../../engine/strengthSettings';
import { getTrainingGuide, guideDayLabel } from '../../data/trainingGuide';
import type { Program } from '../../models/program';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import { useAppData } from '../../state/AppDataContext';
import { todayISO } from '../../utils/dates';
import { haptics } from '../../utils/haptics';
import { reducedMotion } from '../../utils/motion';
import { clearDraft, draftKey, loadDraft, saveDraft } from '../../utils/loggerDraft';
import { playRestSound, primeAudio } from '../../utils/sound';
import { useBackToClose } from '../../utils/useBackToClose';
import { Icon } from '../icons';
import { Portal } from '../Portal';
import { TrainingGuideSheet } from '../TrainingGuideSheet';
import { TextButton } from '../TextButton';
import { PrimaryButton, SecondaryButton, Toggle } from '../ui';
import { useGuardedSave, useLegEase } from '../useLegEase';
import { decisionFor, easeBecause, easeFactShort, easeForgeExplain, easeSlots, easeSummary, EASE_STARTED_KEPT_LINE, EASE_STARTED_LINE } from '../../engine/legDayEase';
import { resolveLegEaseHow } from '../../engine/legEaseSettings';
import { asksReserve, reckonAfterTick, reckonWeight, undoRaise } from '../../engine/forgeReckon';
import { poundStackProposal, poundStackText } from '../../engine/poundStack';
import { adjustText, applyLighter, fitStillOpen, noFitText as noFitLine, stillHeavyTip, stillOpen, suggestLighter, suggestOwnWeights, suggestTooBigStep, tooBigStepTip, tooHeavy, type Adjustment, type NoFit } from '../../engine/forgeAdjust';
import { hasStack, ownWeightsFor, withMachineSetup } from '../../engine/machineWeights';
import { appendEvents, cleanForgeLog, deriveChanges, noFitEvent, setCountEvent, spotterEvents, underRangeEvent, unseenCount, type ForgeCause, type ForgeEvent } from '../../engine/forgeLog';
import { SPOTTER_EXPLAIN, SPOTTER_HOW, SPOTTER_SIGN } from '../../engine/spotter';
import { makeId } from '../../utils/id';
import { activeSeconds, sessionIsDead, breakAsPause, breakCounts, cleanPauses, formatAway, isPaused, longBreakMs, pause as pauseClock, resolveBreakAsk, resume as resumeClock, type Pause } from '../../engine/forgeSession';
import { useSessionWorld } from './useForgeSession';
import { clearSessionPointer, notifySession, readSession, registerForgeOpen, requestOpenSession, writeSessionPointer } from '../../utils/forgeSessionStore';
import { ExerciseAddOnForgeSheet } from './AddOnWeights';
import { ForgeLogSheet } from './ForgeLogSheet';
import { MachineWeightsForgeSheet } from './MachineWeights';
import { InputDock } from './InputDock';
import { ForgeSheet, MenuRow, RirBubble, SheetGroup } from './parts';
import { useWakeLock } from './useWakeLock';
import { useRestNotice } from './useRestNotice';
import { resolveDeviceNotices } from '../../engine/deviceNotices';
import { type Rest, clock, isAssisted, type BlockActions, dockRowLabel, addOnMenuSub } from './forgeWorkoutHelpers';
import { ExerciseBlock } from './ExerciseBlock';
import { ElapsedClock, RestBar, RestStepper } from './ForgeTimers';
import { SwapList, NoteSheet } from './ExerciseSheets';
import { FinishSheet } from './FinishSheet';

const DRAFT_VERSION = 1;
// Na afloop blijft de balk nog even staan, dan verdwijnt hij.
const REST_DONE_LINGER_MS = 8000;
// Een reden die ouder is dan dit hoort niet meer bij de volgende verandering van de rijen.
const CAUSE_MAX_AGE_MS = 2000;

interface WorkoutDraft {
  v: number;
  savedAt: number;
  startedAt: number;
  exercises: WorkoutExercise[];
  rest?: Rest;
  column: 'target' | 'previous';
  // Of de rijen met Lichter gepland zijn; een concept van voor deze keuze heeft het niet.
  eased?: boolean;
  // Het verloop van de training (engine/forgeLog.ts) en het moment dat je het voor het laatst opende.
  // Optioneel: een concept van voor het verloop heeft ze niet.
  log?: ForgeEvent[];
  seen?: number;
  // De sessie (engine/forgeSession.ts): de klok is nu min startedAt min de pauzes. Optioneel: een concept van
  // voor de sessie heeft ze niet en werkt gewoon.
  pauses?: Pause[];
  lastActionAt?: number;
}

// Het laatste moment van handelen in een concept: het bewaarde moment, of de laatst afgevinkte set, of het wegschrijven.
function lastActionOfDraft(d: Partial<WorkoutDraft>, startedAt: number): number {
  const ticks = (d.exercises ?? []).flatMap((e) => e.rows.map((r) => r.doneAt)).filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
  const saved = typeof d.lastActionAt === 'number' ? d.lastActionAt : typeof d.savedAt === 'number' ? d.savedAt : startedAt;
  return Math.max(saved, ...ticks);
}

interface ForgeWorkoutProps {
  template: SessionTemplate;
  plannedSessionId?: string;
  scheduledDate?: string;
  program?: Program | null;
  initialVariant?: SessionVariant;
  startAtForm?: boolean;
  // "Hoe je het doet" voor een training van een latere dag: hetzelfde voorschrift
  // als de tabel zonder invulvelden, maar zonder afvinken of afronden, zonder
  // concept en zonder het scherm aan te houden. Bovenaan staat Sluiten.
  preview?: boolean;
  onClose: () => void;
}

// Een sessie per keer: loopt er al een andere training, dan vraagt dit eerst wat je wilt
// (docs/beslissingen/2026-10-29-forge-als-sessie.md). Zonder andere sessie is dit gewoon het scherm.
export function ForgeWorkout(props: ForgeWorkoutProps) {
  const { strengthExternal } = useAppData();
  const world = useSessionWorld();
  const myKey = `${draftKey(props.template.id, props.plannedSessionId, props.scheduledDate)}:forge`;
  const [other] = useState(() => {
    // "Gedaan" vanuit Vandaag of Week (startAtForm) en alleen kijken horen niet bij een sessie.
    if (props.preview || props.startAtForm || strengthExternal) return undefined;
    const live = readSession();
    if (!live || live.pointer.key === myKey) return undefined;
    return sessionIsDead(live.pointer, world) ? undefined : live;
  });
  if (other) return <OtherSessionRunning name={other.pointer.name} onClose={props.onClose} />;
  return <ForgeWorkoutInner {...props} />;
}

function OtherSessionRunning({ name, onClose }: { name: string; onClose: () => void }) {
  const goTo = useRef(false);
  return (
    <ForgeSheet
      title="Er loopt nog een training"
      onClose={() => {
        onClose();
        if (goTo.current) requestOpenSession();
      }}
    >
      {(close) => (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>Er loopt nog een training: {name}. Eerst afronden of verwijderen?</p>
          <div className="flex flex-col gap-3">
            <PrimaryButton onClick={() => { goTo.current = true; close(); }}>Naar de training</PrimaryButton>
            <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
          </div>
        </div>
      )}
    </ForgeSheet>
  );
}

function ForgeWorkoutInner({
  template,
  plannedSessionId,
  scheduledDate,
  program,
  initialVariant = 'full',
  startAtForm = false,
  preview = false,
  onClose,
}: ForgeWorkoutProps) {
  const { logSession, settings, updateSettings, strengthExternal, templates, sessionLogs, injuryNotes, plannedSessions, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  const date = scheduledDate ?? today;
  // Met MacroFactor als bron en bij alleen kijken is dit het voorschrift zonder invulvelden.
  const readOnly = strengthExternal || preview;
  const strength = useMemo(() => resolveStrengthSettings(settings.strengthModel), [settings.strengthModel]);
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  // "Forge rekent mee" (engine/forgeReckon.ts): dezelfde rekening als het bijsturen.
  const reckonCtx = { bodyKg, profile: strength.profile, workSets: strength.workSets, maxToFailure: strength.estimateUpTo, stackWeights: strength.stackWeights, on: strength.enabled && strength.reckon && !readOnly };
  // A program from MacroFactor gives the exercises of the week of this training, and an exercise you added after a
  // proposal with Akkoord comes behind them (engine/forgeSlots.ts, the same list the week review reads).
  const allSlots = useMemo(() => forgeSlotsFor(template, settings.strengthModel, date), [template, settings.strengthModel, date]);
  // Hoogstens per krachttraining (engine/forgeTimeCap.ts): met de geleerde tijd per set gaat er eerst bijwerk af
  // als de training langer zou duren dan de grens. Alleen de inhoud van deze sessie; de planning blijft zoals hij is.
  const estimate = settings.sessionDurationEstimates?.[template.id];
  // Terugval zonder genoeg logs: de verwachte duur van het sjabloon (of je eigen schatting), nooit een duur die
  // geleerd is uit logs met een ander aantal sets dan nu klaarstaat.
  const fullMinutes = estimate && estimate > 0 ? estimate : template.durationVariants.full;
  const minutesPerSet = useMemo(() => learnedMinutesPerSet(template, sessionLogs), [template, sessionLogs]);
  const mountainGoal = useMemo(() => strength.mountainMuscles && hasMountainGoal(trainingGoals, goalMilestones), [strength.mountainMuscles, trainingGoals, goalMilestones]);
  const capStrength = settings.forgeCapStrength;
  const capLegs = settings.forgeCapLegs;
  const capped = useMemo(() => capSlots({
    slots: exercisesForVariant({ ...template, exercises: allSlots }, initialVariant),
    fullSlots: allSlots,
    fullMinutes,
    minutesPerSet,
    cap: capForTemplate(template, resolveTimeCap({ forgeCapStrength: capStrength, forgeCapLegs: capLegs })),
    // Bij een bergdoel (zoals Spieren voor de berg het leest) vallen kuit, scheen en bilspieren als laatste weg.
    ...(mountainGoal ? { keep: servesMountainMuscle } : {}),
  }), [template, allSlots, initialVariant, fullMinutes, minutesPerSet, capStrength, capLegs, mountainGoal]);
  const slots = capped.slots;

  const key = `${draftKey(template.id, plannedSessionId, scheduledDate)}:forge`;
  const [restored] = useState(() => {
    // Alleen kijken raakt het concept van de dag zelf niet aan.
    if (preview) return undefined;
    const d = loadDraft<WorkoutDraft>(key, 'local');
    if (!d || d.v !== DRAFT_VERSION || !Array.isArray(d.exercises) || typeof d.startedAt !== 'number') return undefined;
    // Een sessie eindigt met Afronden of Verwijderen, niet met de tijd; alleen een training die al in je logboek staat is klaar.
    const logged = !!plannedSessionId && sessionLogs.some((l) => l.plannedSessionId === plannedSessionId);
    if (logged) {
      clearDraft(key, 'local');
      return undefined;
    }
    return d as WorkoutDraft;
  });

  // De planning van de rijen, één keer: de geschiedenis per oefening uit de logs.
  const [baseCtx] = useState<PlanContext>(() => ({ logs: sessionLogs, templates, program, bodyKg, settings: strength, date, modelOn: strength.enabled, sore: { injuries: injuryNotes, checkIns: settings.morningCheckIns ?? [] } }));
  // Lichter bij vermoeide benen (engine/legDayEase.ts): heb je het voor deze training gekozen, dan zijn de
  // voorschriften van de beenoefeningen lichter. De training zelf verandert nooit; dit is alleen dit scherm.
  const legEase = useLegEase(preview ? null : (plannedSessionId ?? null));
  const easeHow = resolveLegEaseHow(settings);
  const decision = !preview && plannedSessionId ? decisionFor(settings.legEaseDays, date, plannedSessionId) : undefined;
  // Met de instelling op Uit maakt een eerder gekozen Lichter de rijen niet stil lichter.
  // Een begonnen training houdt de keuze waarmee hij begon: een later Lichter of Terugzetten op Vandaag
  // verandert afgevinkte rijen niet, dus het paneel volgt dan het concept.
  const [easeOn, setEaseOn] = useState(() => {
    if (legEase.mode === 'uit') return false;
    if (restored && restored.exercises.some((e) => e.rows.some((r) => r.done))) return restored.eased ?? false;
    return decision?.choice === 'lichter';
  });
  const [easeReasons] = useState(() => decision?.reasons ?? []);
  const ease = useMemo(() => (easeOn ? { how: easeHow, because: easeBecause(legEase.state?.signals.reasons ?? easeReasons) } : undefined), [easeOn, easeHow, legEase.state, easeReasons]);
  const ctx = useMemo<PlanContext>(() => ({ ...baseCtx, ...(ease ? { ease } : {}) }), [baseCtx, ease]);
  const effSlots = useMemo(() => (easeOn ? easeSlots(slots, easeHow).slots : slots), [easeOn, slots, easeHow]);
  const [workout, setWorkout] = useState<WorkoutExercise[]>(() => (restored ? resumeDraft(restored.exercises, restored.eased, easeOn, planWorkout(slots, ctx)) : planWorkout(slots, ctx)));
  // De regel "Ingekort tot ongeveer 60 minuten" zegt wat er bij het openen wegviel, bij de eerste stand van de
  // sessie (een heropend concept houdt wat je al deed), en blijft dan staan.
  const [capLine] = useState(() => capLineFor(capped, workout));
  // De sessie begint op het moment van starten en houdt dat, ook na sluiten, herladen en een volgende dag.
  // De sessie begint pas bij de eerste echte handeling (afvinken, typen, een set toevoegen of weghalen, Pauzeren);
  // alleen openen is nog geen sessie: geen concept, geen wijzer, geen pil.
  const [startedAt, setStartedAt] = useState<number | null>(() => (restored ? restored.startedAt : null));
  const startedRef = useRef<number | null>(startedAt);
  const begin = useCallback((): number => {
    if (startedRef.current !== null) return startedRef.current;
    const now = Date.now();
    startedRef.current = now;
    lastAction.current = now;
    setStartedAt(now);
    return now;
  }, []);
  const [pauses, setPauses] = useState<Pause[]>(() => cleanPauses(restored?.pauses));
  // Het laatste moment dat jij iets deed: de lange onderbreking meet daarvandaan.
  const lastAction = useRef<number>(restored ? lastActionOfDraft(restored, restored.startedAt as number) : 0);
  const paused = startedAt !== null && isPaused({ startedAt, pauses });
  const breakAfter = resolveBreakAsk(settings);
  // "Je was 22 uur weg. Telt die tijd mee?": één keer per terugkomst, alleen als de klok liep.
  const [awayMs, setAwayMs] = useState<number | undefined>(() => (restored && !readOnly ? longBreakMs({ startedAt: restored.startedAt as number, pauses: cleanPauses(restored.pauses), lastActionAt: lastAction.current }, Date.now(), breakAfter) : undefined));
  const [rest, setRest] = useState<Rest | undefined>(() => (restored?.rest && restored.rest.endsAt > Date.now() - REST_DONE_LINGER_MS ? restored.rest : undefined));
  const [column, setColumn] = useState<'target' | 'previous'>(restored?.column ?? 'target');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  // Uitleg en tekening vanuit het blad Oefening: hetzelfde blad als het kaartje in de kop.
  const [artFor, setArtFor] = useState<string | null>(null);
  const [rirFor, setRirFor] = useState<{ slot: string; rowId: string } | null>(null);
  // "Hoeveel over?" onder de set die je net afvinkte (alleen de topset en de laatste set, asksReserve).
  const [quickRir, setQuickRir] = useState<{ slot: string; rowId: string } | null>(null);
  // Oefeningen waarvan je het voorstel "toestel in ponden" liet liggen, deze training.
  const [poundKept, setPoundKept] = useState<Record<string, true>>({});
  // Het voorstel "Lichter?" per oefening, na een set die te zwaar was (engine/forgeAdjust.ts).
  const [lighter, setLighter] = useState<Record<string, Adjustment>>({});
  // Geen gewicht van dit toestel past: de regel die vraagt of je de gewichten invult, per oefening.
  const [noFit, setNoFit] = useState<Record<string, NoFit>>({});
  const [fillFor, setFillFor] = useState<string | null>(null);
  const [addOnFor, setAddOnFor] = useState<string | null>(null);
  // Een stille tip na het invullen van de gewichten, als er dan nog steeds niets past.
  const [heavyTip, setHeavyTip] = useState<Record<string, { text: string; rowId?: string; weightKg?: number }>>({});
  // Het verloop van de training: wat Forge bijstuurde, wat doorgevoerd werd en wat jij zelf aanpaste.
  const [forgeLog, setForgeLog] = useState<ForgeEvent[]>(() => {
    if (readOnly) return restored ? (cleanForgeLog(restored.log) ?? []) : [];
    const fresh = spotterEvents(workout, Date.now(), () => makeId('fe'));
    if (!restored) return fresh;
    // Een concept van voor Zonder spotter krijgt het plan van nu (mergeDraft); het teken komt dan ook in het verloop.
    const kept = cleanForgeLog(restored.log) ?? [];
    return [...kept, ...fresh.filter((f) => !kept.some((k) => k.kind === 'spotter' && k.exerciseId === f.exerciseId))];
  });
  const [seenAt, setSeenAt] = useState<number>(() => (restored && typeof restored.seen === 'number' ? restored.seen : 0));
  const [logOpen, setLogOpen] = useState(false);
  const [spotterInfo, setSpotterInfo] = useState(false);
  // Waardoor de volgende verandering van de rijen kwam; zonder opgave is het geen gebeurtenis.
  // Met een tijdstempel: een handeling die niets veranderde (dezelfde rijen) laat geen reden achter voor
  // een latere, onafhankelijke verandering.
  const cause = useRef<{ why: ForgeCause; at: number }>({ why: { kind: 'negeer' }, at: 0 });
  const markCause = (why: ForgeCause) => { cause.current = { why, at: Date.now() }; };
  const prevWorkout = useRef(workout);
  const [workoutMenu, setWorkoutMenu] = useState(false);
  // De tekeningen van de oefeningen van deze training, voor de kaartjes in de kop.
  useDrawingsFor(useMemo(() => workout.map((e) => e.exerciseId), [workout]), !preview);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(startAtForm && !preview);
  const [showGuide, setShowGuide] = useState(false);
  // Het invoerpaneel en wat er rond de tabel meebeweegt.
  const [dock, setDock] = useState<FieldRef | null>(null);
  // Telt de tikken op een veld: ook dezelfde plek opnieuw aantikken begint opnieuw (dockFieldKey).
  const [dockTaps, setDockTaps] = useState(0);
  // Een blok dat al aan het sluiten is wordt bij een nieuwe tik op een veld vervangen (nieuwe epoch);
  // het sluiten van het oude blok mag het nieuwe dan niet meer dichtdoen.
  const [dockEpoch, setDockEpoch] = useState(0);
  const dockClosing = useRef(false);
  const epochRef = useRef(0);
  epochRef.current = dockEpoch;
  const onDockClosing = useCallback(() => {
    dockClosing.current = true;
  }, []);
  const renewDockIfClosing = () => {
    if (!dockClosing.current) return;
    dockClosing.current = false;
    setDockEpoch((n) => n + 1);
  };
  const [selected, setSelected] = useState(true);
  const [dockH, setDockH] = useState(0);
  const [platesOn, setPlatesOn] = useState(true);
  const [rowMenu, setRowMenu] = useState<RowRef | null>(null);
  // De set die nu aan de beurt is, en de oefeningen die zijn ingeklapt.
  const [activeRef, setActiveRef] = useState<RowRef | undefined>(() => activeRow(workout));
  const [folded, setFolded] = useState<Record<string, boolean>>(() => Object.fromEntries(workout.filter(exerciseComplete).map((e) => [e.slot, true])));
  const scrollEl = useRef<HTMLDivElement>(null);
  const headerEl = useRef<HTMLElement>(null);
  // Een oefening per scherm (instelling "Oefeningen in een training", engine/forgeLayout.ts): opzij vegen met
  // CSS scroll-snap. De pagina volgt de scrollpositie; alleen een andere pagina geeft een render.
  const paged = resolveForgeLayout(settings) === 'scherm' && workout.length > 0;
  const pagerEl = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(() => Math.max(0, workout.findIndex((e) => e.slot === activeRef?.slot)));
  const pageRef = useRef(page);
  // Bij het openen (en bij het aanzetten) meteen op de oefening die aan de beurt is, zonder te schuiven.
  const activeIndex = Math.max(0, workout.findIndex((e) => e.slot === activeRef?.slot));
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  useLayoutEffect(() => {
    const el = pagerEl.current;
    if (!paged || !el) return;
    pageRef.current = activeIndexRef.current;
    setPage(activeIndexRef.current);
    el.scrollLeft = pageRef.current * el.clientWidth;
  }, [paged]);
  const onPagerScroll = useCallback(() => {
    const el = pagerEl.current;
    if (!el) return;
    const p = pageAt(el.scrollLeft, el.clientWidth, el.childElementCount);
    if (p === pageRef.current) return;
    pageRef.current = p;
    setPage(p);
  }, []);
  // Een tik in de strook: naar die oefening, in Uit zonder te schuiven.
  const jumpTo = useCallback((i: number) => {
    const el = pagerEl.current;
    if (!el) return;
    haptics.tap();
    const off = reducedMotion() || document.documentElement.dataset.motion === 'off';
    el.scrollTo({ left: i * el.clientWidth, behavior: off ? 'auto' : 'smooth' });
  }, []);
  const timers = useRef<number[]>([]);
  // De oefening zoals hij was toen je dit veld begon te bewerken (zie applyWeight).
  const baseRef = useRef<{ key: string; ex: WorkoutExercise } | null>(null);
  const layout = useRef({ dockH: 0, restH: 0 });

  useWakeLock(strength.keepScreenOn && !preview);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const onDockHeight = useCallback((h: number) => setDockH(h), []);
  useEffect(() => {
    layout.current = { dockH, restH: rest && !readOnly ? 70 : 0 };
  });

  // Een set in beeld: net boven het paneel als dat openstaat, anders in het midden.
  // Alleen als hij niet al helemaal te zien is, zodat het scherm niet onnodig beweegt.
  function scrollToRow(rowId: string) {
    const el = scrollEl.current?.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`);
    // Met een oefening per scherm scrolt de pagina van die oefening, en alleen als die in beeld is:
    // Forge schuift nooit zelf naar een andere oefening.
    const pageEl = el?.closest<HTMLElement>('[data-forge-page]');
    if (pageEl && Number(pageEl.dataset.forgePage) !== pageRef.current) return;
    const root = pageEl ?? scrollEl.current;
    if (!root || !el) return;
    const r = el.getBoundingClientRect();
    const top = pageEl ? pageEl.getBoundingClientRect().top + 8 : (headerEl.current?.offsetHeight ?? 90) + 8;
    const bottom = window.innerHeight - layout.current.dockH - layout.current.restH - 8;
    if (r.top >= top && r.bottom <= bottom) return;
    const target = layout.current.dockH > 0 ? bottom - r.height : top + Math.max(0, (bottom - top - r.height) / 2);
    root.scrollTo({ top: root.scrollTop + r.top - target, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  const dockKey = dock ? `${dock.slot}:${dock.rowId}` : '';
  const dockRowId = dock?.rowId;
  useEffect(() => {
    if (!dockRowId || dockH === 0) return;
    scrollToRow(dockRowId);
  }, [dockKey, dockH, dockRowId]);

  // Het concept wegschrijven kort na een verandering (niet bij elke toets), en altijd
  // als je het scherm verlaat of de app naar de achtergrond gaat.
  const pendingDraft = useRef<WorkoutDraft | null>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  const flushDraft = useCallback(() => {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = undefined;
    if (pendingDraft.current) {
      saveDraft(key, pendingDraft.current, 'local');
      // De wijzer van de sessie: de pil boven de tabbalk vindt de training hiermee terug.
      writeSessionPointer({ key, templateId: template.id, name: template.name, ...(plannedSessionId ? { plannedSessionId } : {}), ...(scheduledDate ? { scheduledDate } : {}), variant: initialVariant });
    }
    pendingDraft.current = null;
  }, [key, template.id, template.name, plannedSessionId, scheduledDate, initialVariant]);
  const dropDraft = useCallback(() => {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = undefined;
    pendingDraft.current = null;
    clearDraft(key, 'local');
    clearSessionPointer(key);
    notifySession();
  }, [key]);
  // Jouw handelingen zetten het laatste moment van handelen: een set afvinken, typen, een oefening ruilen.
  const firstWorkout = useRef(workout);
  useEffect(() => {
    if (workout !== firstWorkout.current) lastAction.current = Date.now();
  }, [workout]);
  useEffect(() => {
    if (readOnly || startedAt === null) return;
    pendingDraft.current = { v: DRAFT_VERSION, savedAt: Date.now(), startedAt, pauses, lastActionAt: lastAction.current, exercises: workout, eased: easeOn, ...(rest ? { rest } : {}), column, ...(forgeLog.length > 0 ? { log: forgeLog } : {}), seen: seenAt };
    if (draftTimer.current === undefined) draftTimer.current = window.setTimeout(flushDraft, 300);
  }, [readOnly, startedAt, pauses, workout, easeOn, rest, column, forgeLog, seenAt, flushDraft]);
  // Zolang dit scherm open is, staat de pil er niet.
  useEffect(() => {
    if (readOnly) return;
    return registerForgeOpen();
  }, [readOnly]);

  // Pauzeren en verder gaan staan meteen in het concept.
  const togglePause = useCallback(() => {
    const start = begin();
    const now = Date.now();
    const next = isPaused({ startedAt: start, pauses }) ? resumeClock({ startedAt: start, pauses }, now) : pauseClock({ startedAt: start, pauses }, now);
    if (next.lastActionAt !== undefined) lastAction.current = next.lastActionAt;
    setPauses(next.pauses ?? []);
    haptics.tap();
  }, [begin, pauses]);
  // Terug in de app terwijl dit scherm openstond: ook dan de vraag, als de klok liep.
  const clockNow = useRef<{ startedAt: number; pauses: Pause[] } | null>(null);
  clockNow.current = startedAt === null ? null : { startedAt, pauses };
  useEffect(() => {
    if (readOnly) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!clockNow.current) return;
      const gap = longBreakMs({ ...clockNow.current, lastActionAt: lastAction.current }, Date.now(), breakAfter);
      if (gap !== undefined) setAwayMs(gap);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [readOnly, breakAfter]);
  const answerBreak = (counts: boolean) => {
    if (startedAt === null) return;
    const now = Date.now();
    const before = { startedAt, pauses, lastActionAt: lastAction.current };
    const next = counts ? breakCounts(before, now) : breakAsPause(before, now);
    lastAction.current = now;
    // Altijd een nieuwe lijst, ook bij "Ja": het concept moet het nieuwe moment van handelen meekrijgen.
    setPauses([...(next.pauses ?? [])]);
    setAwayMs(undefined);
  };

  // Het verloop volgt de rijen: elke verandering van kilo's, herhalingen of reserve wordt, met de reden die
  // de handeling opgaf, een gebeurtenis. Afvinken, een nieuwe planning en ruilen zijn dat niet.
  useEffect(() => {
    const before = prevWorkout.current;
    prevWorkout.current = workout;
    const { why: given, at } = cause.current;
    cause.current = { why: { kind: 'negeer' }, at: 0 };
    const why: ForgeCause = Date.now() - at <= CAUSE_MAX_AGE_MS ? given : { kind: 'negeer' };
    if (readOnly || before === workout) return;
    const events = deriveChanges(before, workout, why, Date.now(), () => makeId('fe'));
    if (events.length > 0) setForgeLog((l) => appendEvents(l, events));
  }, [workout, readOnly]);
  useEffect(() => {
    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', flushDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', flushDraft);
      flushDraft();
    };
  }, [flushDraft]);

  // Het einde van de rust: één keer trillen en een geluid, zoals ingesteld; een
  // tijdje daarna verdwijnt de balk. Eén timer per eindtijd, geen klok die het scherm ververst.
  const alerted = useRef<number | null>(null);
  useEffect(() => {
    if (!rest) return;
    const end = rest.endsAt;
    const fire = window.setTimeout(() => {
      if (alerted.current === end) return;
      alerted.current = end;
      if (Date.now() - end < 3000) {
        // What you feel has the rhythm of the chosen sound, with or without the sound itself.
        const { sound, vibrate } = restAlertChannels(strength.restAlert);
        if (vibrate) haptics.pattern(restVibrationPattern(strength.restSound));
        if (sound) playRestSound(strength.restSound);
      }
    }, Math.max(0, end - Date.now()));
    const drop = window.setTimeout(() => setRest((r) => (r && r.endsAt === end ? undefined : r)), Math.max(0, end + REST_DONE_LINGER_MS - Date.now()));
    return () => {
      window.clearTimeout(fire);
      window.clearTimeout(drop);
    };
  }, [rest, strength.restAlert, strength.restSound]);

  // Dezelfde eindtijd als melding van de telefoon, voor als het scherm uit is (useRestNotice.ts).
  useRestNotice(readOnly ? undefined : rest, resolveDeviceNotices(settings).rest, strength.restAlert);

  // Terug laat de training staan (het concept blijft); weggooien gaat via het menu.
  useBackToClose(true, onClose);

  // De schijven van de oefening bij het invoerpaneel (de tabel rekent de zijne zelf, per oefening).
  const dockPlates = useMemo(() => {
    const ex = dock ? workout.find((e) => e.slot === dock.slot) : undefined;
    return ex && usesPlates(exerciseOf(ex)) ? plateSteps(ex, strength.profile) : undefined;
  }, [dock, workout, strength.profile]);

  const legDay = isLegHeavyTemplate(template);
  const checkIns = settings.morningCheckIns;
  const legLine = useMemo(() => (legDay ? legDayLine(date, { logs: sessionLogs, templates, program, bodyKg, sore: { injuries: injuryNotes, checkIns: checkIns ?? [] }, excludeId: plannedSessionId }) : undefined), [legDay, date, sessionLogs, templates, program, bodyKg, injuryNotes, checkIns, plannedSessionId]);
  const { busy: easeBusy, failed: easeFailed, retry: easeRetry, run: easeRun } = useGuardedSave();
  // Zodra je iets afvinkte, blijft de training zoals hij is: afgevinkte rijen blijven altijd staan.
  const started = workout.some((e) => e.rows.some((r) => r.done));

  // Opnieuw rekenen met of zonder Lichter. Alleen zolang er niets is afgevinkt.
  function replan(on: boolean) {
    const because = easeBecause(legEase.state?.signals.reasons ?? easeReasons);
    const next = planWorkout(slots, { ...baseCtx, ...(on ? { ease: { how: easeHow, because } } : {}) });
    setEaseOn(on);
    markCause({ kind: 'negeer' });
    setWorkout(next);
    if (!readOnly) setForgeLog(spotterEvents(next, Date.now(), () => makeId('fe')));
    setLighter({});
    setNoFit({});
    setHeavyTip({});
    setActiveRef(activeRow(next));
    setFolded({});
  }
  const easeState = readOnly ? undefined : legEase.state;
  const legPanel = easeState && (easeState.offer.state === 'offer' || easeState.offer.state === 'eased') ? (
    <div className="flex flex-col gap-1">
      {easeState.offer.state === 'eased' && !easeOn ? (
        // Lichter gekozen op Vandaag nadat je hier al begon: de rijen bleven zoals ze waren, dus dat zeggen we.
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{EASE_STARTED_KEPT_LINE}</p>
          <div className="flex"><TextButton tone="dim" size="xs" disabled={easeBusy} onClick={() => easeRun(() => legEase.choose('liever-niet'))}>Begrepen</TextButton></div>
        </>
      ) : easeState.offer.state === 'eased' ? (
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{easeSummary(easeSlots(slots, easeHow))}</p>
          {!started && <div className="flex"><TextButton tone="dim" size="xs" disabled={easeBusy} onClick={() => easeRun(legEase.undo, () => replan(false))}>Terugzetten</TextButton></div>}
        </>
      ) : started ? (
        <>
          {legLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{legLine}</p>}
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{EASE_STARTED_LINE}</p>
          <div className="flex"><TextButton tone="dim" size="xs" disabled={easeBusy} onClick={() => easeRun(() => legEase.choose('liever-niet'))}>Begrepen</TextButton></div>
        </>
      ) : (
        <>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>{easeFactShort(easeState.signals)}</p>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>De hele training lichter?</p>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{easeForgeExplain(easeHow, strength.enabled)}</p>
          <div className="flex flex-wrap items-center gap-x-3">
            <div className="flex w-28 shrink-0">
              <SecondaryButton disabled={easeBusy} onClick={() => easeRun(() => legEase.choose('lichter'), () => replan(true))}>Lichter</SecondaryButton>
            </div>
            <TextButton tone="dim" disabled={easeBusy} onClick={() => easeRun(() => legEase.choose('liever-niet'))}>Liever niet</TextButton>
          </div>
        </>
      )}
      {easeFailed && (
        <p className="flex flex-wrap items-center gap-x-3 text-xs leading-snug" role="status" style={{ color: 'var(--color-warning)' }}>
          {easeFailed}
          {easeRetry && <TextButton size="xs" onClick={easeRetry}>Opnieuw</TextButton>}
        </p>
      )}
    </div>
  ) : null;
  const { done, total } = progress(workout);
  // Iets nieuws in het verloop: wat Forge deed of zag sinds je het voor het laatst opende, zonder opgeloste meldingen.
  const news = unseenCount(forgeLog, seenAt, workout);
  const guide = getTrainingGuide(template.id);

  function setExercise(slot: string, update: (ex: WorkoutExercise) => WorkoutExercise) {
    if (!readOnly) begin();
    baseRef.current = null;
    setWorkout((w) => w.map((e) => (e.slot === slot ? update(e) : e)));
  }

  // Een set die jij toevoegt of weghaalt: in het verloop, en met een korte melding om het terug te draaien.
  const [undo, setUndo] = useState<{ slot: string; removed: DroppedRow; label: string; eventId: string } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 10000);
    return () => window.clearTimeout(t);
  }, [undo]);

  function addSetLogged(slot: string, kind: 'work' | 'warmup') {
    const ex = workout.find((e) => e.slot === slot);
    if (!ex) return;
    setUndo(null);
    const next = addRow(ex, kind);
    const made = next.rows.find((r) => !ex.rows.some((o) => o.id === r.id));
    setExercise(slot, () => next);
    if (made && !readOnly) setForgeLog((l) => appendEvents(l, [setCountEvent('toegevoegd', ex, made, rowLabel(next, made.id), Date.now(), makeId('fe'))]));
  }

  function removeSetLogged(slot: string, rowId: string) {
    const ex = workout.find((e) => e.slot === slot);
    if (!ex || !canRemoveRow(ex, rowId)) return;
    const r = removeSet(ex, rowId);
    if (!r.removed) return;
    haptics.tap();
    const eventId = makeId('fe');
    setExercise(slot, () => r.ex);
    if (!readOnly) setForgeLog((l) => appendEvents(l, [setCountEvent('weggehaald', ex, r.removed!.row, r.label, Date.now(), eventId)]));
    setUndo({ slot, removed: r.removed, label: r.label, eventId });
  }

  function undoRemove() {
    if (!undo) return;
    const { slot, removed, eventId } = undo;
    setExercise(slot, (e) => reinsertRow(e, removed));
    setForgeLog((l) => l.filter((ev) => ev.id !== eventId));
    setUndo(null);
  }

  function tick(slot: string, rowId: string) {
    if (!readOnly) begin();
    haptics.tap();
    primeAudio();
    baseRef.current = null;
    const raw = tickRow(workout, slot, rowId);
    // Forge rekent mee: ging de set anders dan gevraagd, dan stelt Forge de volgende open werkset bij.
    const reckoned = raw.workout.map((e) => (e.slot === slot ? reckonAfterTick(e, rowId, reckonCtx) : e));
    const result = { ...raw, workout: reckoned };
    if (reckoned.some((e, i) => e !== raw.workout[i])) markCause({ kind: 'meegerekend' });
    setWorkout(result.workout);
    // Na het afvinken van de topset of de laatste set: één snelle vraag hoeveel je over had. Een andere tik haalt hem weg.
    const askEx = result.workout.find((e) => e.slot === slot);
    setQuickRir(strength.quickRir && !readOnly && askEx && asksReserve(askEx, rowId) ? { slot, rowId } : null);
    // De focus schuift vloeiend naar de volgende open set; is de oefening af, dan
    // klapt hij zacht in en gaat het scherm naar de volgende oefening.
    const ticked = result.workout.find((e) => e.slot === slot)?.rows.find((r) => r.id === rowId)?.done;
    // Na een set die te zwaar was stelt Forge een lichter gewicht voor; een andere tik haalt een oud voorstel weg.
    const tickedEx = result.workout.find((e) => e.slot === slot);
    const adjustCtx = { bodyKg, profile: strength.profile, workSets: strength.workSets, maxToFailure: strength.estimateUpTo, stackWeights: strength.stackWeights };
    const live = !!ticked && !!tickedEx && strength.enabled && strength.adjustLive && !readOnly;
    const proposal = live ? suggestLighter(tickedEx, rowId, adjustCtx) : undefined;
    // Past er geen enkel gewicht, dan vraagt Forge of je de gewichten van het toestel invult.
    const fit = live && !proposal ? suggestOwnWeights(tickedEx, rowId, adjustCtx) : undefined;
    setLighter((l) => {
      if (!proposal && !(slot in l)) return l;
      const { [slot]: _old, ...others } = l;
      void _old;
      return proposal ? { ...others, [slot]: proposal } : others;
    });
    setHeavyTip((l) => (slot in l ? Object.fromEntries(Object.entries(l).filter(([k]) => k !== slot)) : l));
    // Het verloop: een set onder het bereik, en een set waarvoor geen gewicht van het toestel past.
    if (ticked && tickedEx && !readOnly) {
      const tickedRow = tickedEx.rows.find((r) => r.id === rowId);
      const at = Date.now();
      const found: ForgeEvent[] = [];
      if (tickedRow && tooHeavy(tickedRow)) found.push(underRangeEvent(tickedEx, tickedRow, at, makeId('fe')));
      const nf = fit ? noFitEvent(tickedEx, fit, at, makeId('fe')) : undefined;
      if (nf) found.push(nf);
      if (found.length > 0) setForgeLog((l) => appendEvents(l, found));
    }
    setNoFit((l) => {
      if (!fit && !(slot in l)) return l;
      const { [slot]: _old, ...others } = l;
      void _old;
      return fit ? { ...others, [slot]: fit } : others;
    });
    if (ticked) {
      const next = activeRow(result.workout, { slot, rowId });
      setActiveRef(next);
      const after = result.workout.find((e) => e.slot === slot);
      if (after && exerciseComplete(after)) {
        if (dock?.slot === slot) { dockClosing.current = false; setDock(null); }
        const calm = reducedMotion();
        later(() => {
          setFolded((f) => ({ ...f, [slot]: true }));
          if (next) later(() => scrollToRow(next.rowId), calm ? 0 : 320);
        }, calm ? 0 : 380);
      } else if (next) {
        later(() => scrollToRow(next.rowId), 140);
      }
    } else {
      setActiveRef({ slot, rowId });
    }
    if (result.restSec && strength.restAuto) {
      const ex = workout.find((e) => e.slot === slot);
      alerted.current = null;
      setRest({ endsAt: clock() + result.restSec * 1000, total: result.restSec, name: ex?.name ?? '' });
    }
  }

  // De voorstellen en de stille tip van één oefening weg, bij alles afvinken en bij ruilen.
  function clearHints(slot: string) {
    const drop = <T,>(l: Record<string, T>) => (slot in l ? Object.fromEntries(Object.entries(l).filter(([k]) => k !== slot)) : l);
    setLighter(drop);
    setNoFit(drop);
    setHeavyTip(drop);
  }

  function tickAll(slot: string) {
    if (!readOnly) begin();
    haptics.tap();
    primeAudio();
    baseRef.current = null;
    clearHints(slot);
    setQuickRir(null);
    const result = tickAllRows(workout, slot);
    setWorkout(result.workout);
    const after = result.workout.find((e) => e.slot === slot);
    if (after && exerciseComplete(after)) {
      if (dock?.slot === slot) { dockClosing.current = false; setDock(null); }
      const next = activeRow(result.workout);
      setActiveRef(next);
      const calm = reducedMotion();
      later(() => {
        setFolded((f) => ({ ...f, [slot]: true }));
        if (next) later(() => scrollToRow(next.rowId), calm ? 0 : 320);
      }, calm ? 0 : 380);
    }
    if (result.restSec && strength.restAuto) {
      const ex = workout.find((e) => e.slot === slot);
      alerted.current = null;
      setRest({ endsAt: clock() + result.restSec * 1000, total: result.restSec, name: ex?.name ?? '' });
    }
  }

  function openField(slot: string, rowId: string, field: FieldName) {
    if (readOnly) return;
    baseRef.current = null;
    renewDockIfClosing();
    setDockTaps((n) => n + 1);
    setDock({ slot, rowId, field });
    setSelected(true);
    setActiveRef({ slot, rowId });
  }

  function changeValue(v: number | undefined) {
    const d = dock;
    if (!d) return;
    if (!readOnly) begin();
    const key = `${d.slot}:${d.rowId}:${d.field}`;
    markCause({ kind: 'eigen', edited: { slot: d.slot, rowId: d.rowId } });
    setWorkout((w) =>
      w.map((e) => {
        if (e.slot !== d.slot) return e;
        // Wijzigingen doorvoeren (carryChange) vervangt het oude doorgeven van het verschil.
        // Doorvoeren rekent vanaf de stand van toen je het veld opende, zodat een
        // tussenstand (een leeg veld tijdens het typen) de andere sets niet losmaakt.
        if (baseRef.current?.key !== key) baseRef.current = { key, ex: e };
        const base = baseRef.current.ex;
        if (d.field === 'reps') {
          const changed = applyReps(base, d.rowId, v);
          return strength.carryMode === 'equal' ? carryChange(base, changed, d.rowId, 'reps') : changed;
        }
        const changed = applyWeight(base, d.rowId, v, strength.carryMode === 'shift', makeSnap(exerciseOf(e), profileFor(strength.profile, e.dumbbellTotal), bodyKg, v, e.dumbbellTotal), weightBounds(exerciseOf(e)).min, makeLight(exerciseOf(e), profileFor(strength.profile, e.dumbbellTotal)));
        const carried = strength.carryMode === 'equal' ? carryChange(base, changed, d.rowId, 'weightKg') : changed;
        // Forge rekent mee: een ander gewicht krijgt de herhalingen die je daarbij waarschijnlijk haalt.
        return reckonWeight(base, carried, d.rowId, reckonCtx);
      }),
    );
  }

  function stepDock(direction: 1 | -1): number {
    const d = dock;
    const ex = d ? workout.find((e) => e.slot === d.slot) : undefined;
    const row = ex?.rows.find((r) => r.id === d?.rowId);
    if (!d || !ex || !row) return 0;
    const isWeight = d.field === 'weightKg';
    const current = isWeight ? (row.weightKg ?? row.target.weightKg) : (row.reps ?? 0);
    const step = isWeight ? weightStepFor(exerciseOf(ex), profileFor(strength.profile, ex.dumbbellTotal), current) : REPS_STEP;
    // Hulp van een toestel: het blok werkt met de hoeveelheid hulp (+ is meer hulp), opgeslagen als negatief.
    if (isWeight && isAssisted(ex)) {
      const help = stepNumber(Math.abs(current ?? 0), direction, step, 0, weightBounds(undefined).max);
      changeValue(-help);
      return help;
    }
    const bounds = isWeight ? weightBounds(exerciseOf(ex)) : repsBounds;
    const next = stepNumber(current, direction, step, bounds.min, bounds.max);
    changeValue(next);
    return next;
  }

  function goNext(close: () => void) {
    const n = dock ? nextField(workout, dock) : undefined;
    if (!n) {
      close();
      return;
    }
    baseRef.current = null;
    renewDockIfClosing();
    setDock(n);
    setSelected(true);
    setActiveRef({ slot: n.slot, rowId: n.rowId });
  }

  function take(slot: string, rowId: string) {
    haptics.tap();
    markCause({ kind: 'eigen', edited: { slot, rowId } });
    setExercise(slot, (e) => takeTarget(e, rowId));
    setActiveRef({ slot, rowId });
  }

  // Vaste handelingen voor de tabel (zie BlockActions), die altijd de nieuwste staat gebruiken.
  // "Lichter": het voorgestelde gewicht erin, alleen in sets die nog open en onaangeraakt zijn.
  function takeLighter(slot: string) {
    const adj = lighter[slot];
    haptics.tap();
    if (adj) {
      markCause({ kind: 'bijgestuurd' });
      setExercise(slot, (e) => applyLighter(e, adj));
    }
    setLighter((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== slot)));
  }

  // Terugzetten: de stap omhoog die Forge na de bovenkant van het bereik zette, ongedaan.
  function takeBack(slot: string) {
    haptics.tap();
    markCause({ kind: 'eigen' });
    setExercise(slot, (e) => undoRaise(e, makeSnap(exerciseOf(e), profileFor(strength.profile, e.dumbbellTotal), bodyKg, e.rows.find((r) => r.kind === 'work')?.weightKg, e.dumbbellTotal)));
  }

  // Je koos bij "Hoeveel over?": de RIR is van jou (niet meer aangenomen), en Forge rekent met die set opnieuw mee.
  function chooseQuickRir(slot: string, rowId: string, rir: number) {
    const ex = workout.find((e) => e.slot === slot);
    setQuickRir(null);
    if (!ex) return;
    haptics.tap();
    const mine = updateRow(ex, rowId, { rir });
    const after = reckonAfterTick(mine, rowId, reckonCtx);
    markCause(after !== mine ? { kind: 'meegerekend' } : { kind: 'eigen', edited: { slot, rowId } });
    setExercise(slot, () => after);
  }

  // Het toestel als ponden opslaan in je sportschool: alleen na een tik op Opslaan.
  function savePounds(slot: string) {
    const ex = workout.find((e) => e.slot === slot);
    const p = ex ? poundStackProposal(ex, strength.profile) : undefined;
    setPoundKept((k) => ({ ...k, [slot]: true }));
    if (!ex || !p) return;
    saveStrength(withMachineSetup(settings.strengthModel, ex.exerciseId, { ranges: [p.range] }));
  }

  const latest = useRef({ tick, tickAll, openField, take, setExercise, takeLighter, takeBack, addSetLogged, removeSetLogged, undoRemove, chooseQuickRir, savePounds });
  useEffect(() => {
    latest.current = { tick, tickAll, openField, take, setExercise, takeLighter, takeBack, addSetLogged, removeSetLogged, undoRemove, chooseQuickRir, savePounds };
  });
  const actions = useMemo<BlockActions>(
    () => ({
      column: () => setColumn((c) => (c === 'target' ? 'previous' : 'target')),
      fold: (slot) => setFolded((f) => ({ ...f, [slot]: !f[slot] })),
      menu: (slot) => setMenuFor(slot),
      tick: (slot, rowId) => latest.current.tick(slot, rowId),
      open: (slot, rowId, name) => latest.current.openField(slot, rowId, name),
      take: (slot, rowId) => latest.current.take(slot, rowId),
      rowMenu: (slot, rowId) => setRowMenu({ slot, rowId }),
      rir: (slot, rowId) => setRirFor({ slot, rowId }),
      quickRir: (slot, rowId, rir) => latest.current.chooseQuickRir(slot, rowId, rir),
      poundSave: (slot) => latest.current.savePounds(slot),
      poundKeep: (slot) => setPoundKept((k) => ({ ...k, [slot]: true })),
      add: (slot) => latest.current.addSetLogged(slot, 'work'),
      remove: (slot, rowId) => latest.current.removeSetLogged(slot, rowId),
      restore: (slot) => latest.current.setExercise(slot, restoreDropped),
      undo: () => latest.current.undoRemove(),
      lighter: (slot) => latest.current.takeLighter(slot),
      unraise: (slot) => latest.current.takeBack(slot),
      keep: (slot) => setLighter((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== slot))),
      fill: (slot) => setFillFor(slot),
      keepFit: (slot) => setNoFit((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== slot))),
      spotter: () => setSpotterInfo(true),
    }),
    [],
  );

  function swap(slot: string, exerciseId: string | null) {
    const current = workout.find((e) => e.slot === slot);
    // Vangnet: met een afgevinkte set wordt nooit geruild, want ruilen zet nieuwe rijen neer.
    if (!current || !canSwap(effSlots, current)) return;
    const prescription = sessionPrescription(effSlots, current);
    if (!prescription) return;
    const state = planStateBefore(ctx, workout, slot);
    const to = exerciseId ? exerciseById(exerciseId) : undefined;
    clearHints(slot);
    const swapped = planExercise(prescription, ctx, state, to);
    if (!readOnly) {
      const found = spotterEvents([swapped], Date.now(), () => makeId('fe'));
      if (found.length > 0) setForgeLog((l) => appendEvents(l, found));
    }
    setExercise(slot, () => swapped);
  }

  function saveStrength(next: typeof settings.strengthModel) {
    void updateSettings({ strengthModel: next });
  }

  // "Uit deze training halen": de oefening gaat uit de lijst voor volgende keren. In deze training gaat hij er
  // alleen uit zolang er nog geen set is afgevinkt; afgevinkte sets gaan nooit stil weg.
  function removeAddedExercise(slot: string) {
    saveStrength(withoutAddedSlot(settings.strengthModel, template.id, slot));
    setWorkout((w) => workoutWithoutAdded(w, slot));
  }

  const menuEx = workout.find((e) => e.slot === menuFor);
  const swapEx = workout.find((e) => e.slot === swapFor);
  const noteEx = workout.find((e) => e.slot === noteFor);
  const fillEx = workout.find((e) => e.slot === fillFor);
  const addOnEx = workout.find((e) => e.slot === addOnFor);
  const dockEx = dock ? workout.find((e) => e.slot === dock.slot) : undefined;
  const dockIndex = dockEx && dock ? dockEx.rows.findIndex((r) => r.id === dock.rowId) : -1;
  const dockRow = dockEx && dockIndex >= 0 ? dockEx.rows[dockIndex] : undefined;
  const rowMenuEx = rowMenu ? workout.find((e) => e.slot === rowMenu.slot) : undefined;
  const rowMenuRow = rowMenuEx?.rows.find((r) => r.id === rowMenu?.rowId);
  const rirRow = rirFor ? workout.find((e) => e.slot === rirFor.slot)?.rows.find((r) => r.id === rirFor.rowId) : undefined;

  const bottomPad = dockH > 0 ? dockH + (rest && !readOnly ? 70 : 0) + 16 : rest ? 120 : 48;
  const intro = (legLine || readOnly || capLine) && (
            <div className="flex flex-col gap-1 px-4 pt-3">
              {capLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }} data-testid="forge-ingekort">{capLine}</p>}
              {preview && <p className="text-xs tabular-nums leading-snug" style={{ color: 'var(--color-ink)' }}>{previewDayLine(date, program)}</p>}
              {preview ? (
                <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Zo staat hij klaar. Afvinken kan op de dag zelf.</p>
              ) : readOnly && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Je houdt kracht bij in MacroFactor. Dit is het voorschrift om mee te kijken; afvinken doe je hier als je klaar bent.</p>}
              {legPanel ?? (legLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{legLine}</p>)}
            </div>
          );
  const exerciseBlock = (ex: WorkoutExercise, i: number) => (
    <ExerciseBlock
              key={ex.slot}
              ex={ex}
              first={paged || i === 0}
              paged={paged}
              readOnly={readOnly}
              column={column}
              note={strength.exerciseNotes[ex.exerciseId]}
              active={activeRef?.slot === ex.slot ? activeRef.rowId : undefined}
              field={dock?.slot === ex.slot ? dock : null}
              selected={dock?.slot === ex.slot && selected}
              folded={!paged && !!folded[ex.slot] && exerciseComplete(ex)}
              profile={strength.profile}
              showPlates={strength.showPlates}
              lighterText={lighter[ex.slot] && stillOpen(ex, lighter[ex.slot]) ? adjustText(stillOpen(ex, lighter[ex.slot])!, exerciseOf(ex)) : undefined}
              noFitText={noFit[ex.slot] && !lighter[ex.slot] && !exerciseComplete(ex) && fitStillOpen(ex, noFit[ex.slot]) ? noFitLine(noFit[ex.slot], !!ownWeightsFor(strength.profile, exerciseOf(ex))) : undefined}
              heavyTip={heavyTip[ex.slot] && !lighter[ex.slot] && !exerciseComplete(ex) && fitStillOpen(ex, heavyTip[ex.slot]) ? heavyTip[ex.slot].text : undefined}
              rirAsValue={strength.rirPrefill === 'target'}
              swipeOn={swipeDeleteOn(settings)}
              undoText={undo?.slot === ex.slot ? `Set ${undo.label} verwijderd` : undefined}
              quickRirRow={quickRir?.slot === ex.slot && asksReserve(ex, quickRir.rowId) ? quickRir.rowId : undefined}
              poundText={!readOnly && !poundKept[ex.slot] && ex.rows.some((r) => r.done) ? poundLine(ex, strength.profile) : undefined}
              act={actions}
            />
  );

  return (
    <Portal>
      <div ref={scrollEl} id="forge-scroll" className={`fixed inset-0 z-50 animate-fade-in ${paged ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`} style={{ background: 'var(--color-bg)' }}>
        <div className={paged ? 'mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col' : 'mx-auto max-w-md'} style={paged ? undefined : { paddingBottom: bottomPad }}>
          <header ref={headerEl} className="sticky top-0 z-20 border-b px-2" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-card-border)', paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center gap-1 pt-1">
              <button type="button" onClick={onClose} aria-label={preview ? 'Sluiten' : 'Kleiner maken, de training loopt door'} className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
                <Icon name="terug" size={22} />
              </button>
              {/* Op een smal scherm eerst kleiner (16 in plaats van 20), zodat de A of B blijft staan; pas daarna afkappen. */}
              <h1 className="min-w-0 flex-1 truncate font-display text-base leading-tight min-[380px]:text-xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h1>
              <button type="button" onClick={() => setWorkoutMenu(true)} aria-label="Menu van de training" className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
                <Icon name="meer" size={22} />
              </button>
              <button
                type="button"
                onClick={preview ? onClose : () => setFinishing(true)}
                className="mr-2 min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-semibold active:scale-[0.97]"
                style={{ background: 'var(--color-action-fill)', color: 'var(--color-on-action)' }}
              >
                {preview ? 'Sluiten' : readOnly ? 'Afvinken' : 'Afronden'}
              </button>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-3 px-2 pb-2 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                <ElapsedClock startedAt={startedAt} pauses={pauses} />
                <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-card-border)' }} aria-hidden="true">
                  <div className="h-1 rounded-full transition-[width] duration-300" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: 'var(--color-progress)' }} />
                </div>
                <span className="font-sans">{done} van {total} sets</span>
                <button type="button" onClick={() => { setLogOpen(true); setSeenAt(Date.now()); }} aria-label={news > 0 ? 'Verloop van de training, er is iets nieuws' : 'Verloop van de training'} className="relative -my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
                  <Icon name="verloop" size={20} />
                  {news > 0 && <span aria-hidden="true" className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full" style={{ background: 'var(--color-status)' }} />}
                </button>
              </div>
            )}
            {!readOnly && paused && (
              <div className="animate-fade-in flex items-center gap-2 px-2 pb-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                <Icon name="pauze" size={16} />
                <span className="flex-1">Gepauzeerd</span>
                <TextButton onClick={togglePause}>Verder</TextButton>
              </div>
            )}
            {paged && <ForgeStrip workout={workout} current={page} readOnly={readOnly} onJump={jumpTo} />}
          </header>
          {!paged && intro}
          {workout.length === 0 && (
            <p className="px-4 pt-6 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Deze training heeft nog geen oefeningen.</p>
          )}

          {paged ? (
            <div ref={pagerEl} className="forge-pager min-h-0 flex-1" onScroll={onPagerScroll} data-testid="forge-pager">
              {workout.map((ex, i) => (
                <div key={ex.slot} className="forge-page" data-forge-page={i} style={{ paddingBottom: bottomPad }}>
                  {i === 0 && intro}
                  {exerciseBlock(ex, i)}
                </div>
              ))}
            </div>
          ) : (
            workout.map((ex, i) => exerciseBlock(ex, i))
          )}
        </div>

        {rest && !readOnly && (
          <RestBar
            rest={rest}
            lift={dockH}
            onAdd={(s) => setRest((r) => (r ? { ...r, endsAt: Math.max(Date.now(), r.endsAt) + s * 1000, total: r.total + s } : r))}
            onSkip={() => setRest(undefined)}
          />
        )}
      </div>

      {dock && !readOnly && dockEx && dockRow && (
        <InputDock
          // Geen key per veld: het blok blijft staan van veld naar veld (fieldKey zet de waarde opnieuw).
          key={dockEpoch}
          label={`${dock.field === 'weightKg' ? (isAssisted(dockEx) ? 'Hulp' : 'Gewicht') : 'Herhalingen'}, set ${dockRowLabel(dockEx, dockIndex)}, ${dockEx.name}`}
          fieldKey={dockFieldKey(dock, dockTaps)}
          value={dock.field === 'weightKg' ? (isAssisted(dockEx) && dockRow.weightKg !== undefined ? Math.abs(dockRow.weightKg) : dockRow.weightKg) : dockRow.reps}
          decimals={dock.field === 'weightKg' ? 2 : 0}
          onChange={(v) => changeValue(dock.field === 'weightKg' && isAssisted(dockEx) && v !== undefined ? -v : v)}
          onStep={stepDock}
          onSelected={setSelected}
          onNext={goNext}
          onClose={() => {
            if (epochRef.current === dockEpoch) {
              dockClosing.current = false;
              setDock(null);
            }
          }}
          onClosing={onDockClosing}
          onHeight={onDockHeight}
          plate={dockPlates?.[dockIndex]}
          plateOn={platesOn}
          onTogglePlates={() => setPlatesOn((v) => !v)}
        />
      )}

      {logOpen && <ForgeLogSheet events={forgeLog} workout={workout} onClose={() => setLogOpen(false)} />}

      {spotterInfo && (
        <ForgeSheet title="Zonder spotter" sub={SPOTTER_SIGN} onClose={() => setSpotterInfo(false)}>
          {(close) => (
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{SPOTTER_EXPLAIN}</p>
              <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{SPOTTER_HOW}</p>
              <div className="flex"><SecondaryButton onClick={close}>Begrepen</SecondaryButton></div>
            </div>
          )}
        </ForgeSheet>
      )}

      {rowMenu && rowMenuEx && rowMenuRow && (
        <ForgeSheet title={rowMenuEx.name} sub={rowMenuRow.kind === 'warmup' ? 'Opwarmset' : `Werkset ${rowMenuEx.rows.filter((r) => r.kind === 'work').indexOf(rowMenuRow) + 1}`} onClose={() => setRowMenu(null)}>
          {(close) => (
            <div className="flex flex-col">
              {!rowMenuRow.done && <MenuRow icon="vinkje" title="Voorschrift overnemen" sub="Kilo's en herhalingen zoals het voorschrift ze vraagt." onClick={() => { take(rowMenuEx.slot, rowMenuRow.id); close(); }} />}
              <MenuRow icon="plus" title="Set kopiëren" sub="Een kopie van deze set eronder." onClick={() => { setExercise(rowMenuEx.slot, (e) => copyRow(e, rowMenuRow.id)); close(); }} />
              {canRemoveRow(rowMenuEx, rowMenuRow.id) && <MenuRow icon="min" title="Set verwijderen" danger onClick={() => { removeSetLogged(rowMenuEx.slot, rowMenuRow.id); close(); }} />}
            </div>
          )}
        </ForgeSheet>
      )}

      {menuEx && (
        // Het blad Oefening (docs/beslissingen/2026-11-02-forge-herinrichting.md): bovenaan Waarom zo, dan vier
        // groepen onder elkaar. Wat eerst als snelknop onder de naam stond (Ruilen, Opwarmset, Notitie) en de kolom
        // Alles staan hier, elk één keer.
        <ForgeSheet title={menuEx.name} sub={menuEx.swappedFrom ? `In plaats van ${menuEx.swappedFrom}, alleen deze training` : undefined} onClose={() => setMenuFor(null)}>
          {(close) => {
            const exercise = exerciseOf(menuEx);
            const why = reasonWithOwnCount(menuEx);
            const art = menuEx.known && !!exercise && showsExerciseArt(resolveExerciseArt(settings));
            const allDone = menuEx.rows.length > 0 && menuEx.rows.every((r) => r.done);
            const added = !readOnly && !preview && isAddedSlot(settings.strengthModel, template.id, menuEx.slot);
            return (
              <div className="flex flex-col">
                {why && (
                  <SheetGroup title="Waarom zo">
                    <p className="pb-3 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{why}</p>
                  </SheetGroup>
                )}
                <SheetGroup title="Oefening">
                  {!readOnly && canSwap(effSlots, menuEx) && (menuEx.swappedFrom ? (
                    <MenuRow icon="ruilen" title={`Terug naar ${menuEx.swappedFrom}`} onClick={() => { swap(menuEx.slot, null); close(); }} />
                  ) : (
                    <MenuRow icon="ruilen" title="Ruilen" sub="Zelfde spieren, met wat je sportschool heeft. Alleen voor deze training." onClick={() => { close(); setSwapFor(menuEx.slot); }} />
                  ))}
                  {preview ? (
                    // Alleen lezen voor een dag die nog komt: een notitie die er is staat er, schrijven kan op de dag zelf.
                    strength.exerciseNotes[menuEx.exerciseId] && <p className="py-3 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Notitie: {strength.exerciseNotes[menuEx.exerciseId]}</p>
                  ) : (
                    <MenuRow icon="notitie" title="Notitie" sub={strength.exerciseNotes[menuEx.exerciseId] ?? 'Bijvoorbeeld de stand van de stoel. Blijft bij deze oefening staan.'} onClick={() => { close(); setNoteFor(menuEx.slot); }} />
                  )}
                  {art && (
                    <MenuRow icon="info" sheetFrom title="Uitleg en tekening" sub="Hoe het gaat, welke spieren werken en waar je op let." onClick={() => { close(); setArtFor(menuEx.exerciseId); }} />
                  )}
                  {added && (
                    <MenuRow icon="min" title="Uit deze training halen" sub={menuEx.rows.some((r) => r.done) ? 'Vanaf je volgende training. Wat je vandaag afvinkte blijft staan.' : 'Je voegde hem toe na een voorstel. Je sets van eerder blijven staan.'} onClick={() => { close(); removeAddedExercise(menuEx.slot); }} />
                  )}
                </SheetGroup>
                {!readOnly && (
                  <SheetGroup title="Sets">
                    {!menuEx.timed && <MenuRow icon="plus" title="Set toevoegen" onClick={() => { addSetLogged(menuEx.slot, 'work'); close(); }} />}
                    {!menuEx.timed && <MenuRow icon="plus" title="Opwarmset toevoegen" onClick={() => { addSetLogged(menuEx.slot, 'warmup'); close(); }} />}
                    {menuEx.rows.length > 0 && (
                      <MenuRow icon="vinkje" title={allDone ? 'Alle vinkjes weghalen' : 'Alle sets afvinken'} sub={allDone ? undefined : 'Ook de rust start.'} onClick={() => { tickAll(menuEx.slot); close(); }} />
                    )}
                    {menuEx.rows.some((r) => !r.done) && menuEx.rows.length > 1 && (
                      <MenuRow icon="min" title="Laatste set verwijderen" sub="Een set die je al afvinkte blijft staan." onClick={() => { setExercise(menuEx.slot, removeLastRow); close(); }} />
                    )}
                  </SheetGroup>
                )}
                {!readOnly && (
                  <SheetGroup title="Rust">
                    <MenuRow
                      icon="timer"
                      title="Rusttijd"
                      sub={strength.restSeconds[menuEx.exerciseId] !== undefined ? 'Je eigen tijd voor deze oefening' : 'Geschat: zwaarder en samengesteld langer'}
                      right={
                        <RestStepper
                          seconds={menuEx.restSec}
                          onChange={(s) => {
                            setWorkout((w) => w.map((e) => (e.exerciseId === menuEx.exerciseId ? { ...e, restSec: s } : e)));
                            saveStrength(withExerciseValue(settings.strengthModel, 'restSeconds', menuEx.exerciseId, s));
                          }}
                        />
                      }
                    />
                    <MenuRow
                      icon="timer"
                      title="Rust nu starten"
                      sub="Ook als hij niet vanzelf start."
                      onClick={() => {
                        alerted.current = null;
                        setRest({ endsAt: clock() + menuEx.restSec * 1000, total: menuEx.restSec, name: menuEx.name });
                        close();
                      }}
                    />
                  </SheetGroup>
                )}
                {!readOnly && !preview && hasStack(exercise) && (
                  <SheetGroup title="Toestel">
                    <MenuRow icon="plus" title="Gewichten van dit toestel" sub={ownWeightsFor(strength.profile, exercise) ? `Je eigen lijst in ${strength.profile.name}.` : `Vul in wat er hangt in ${strength.profile.name}.`} onClick={() => { close(); setFillFor(menuEx.slot); }} />
                    <MenuRow icon="plus" title="Tussengewicht van dit toestel" sub={addOnMenuSub(strength.profile, exercise)} onClick={() => { close(); setAddOnFor(menuEx.slot); }} />
                  </SheetGroup>
                )}
                {/* De tips staan in Uitleg en tekening; alleen zonder dat blad staan ze hier. */}
                {!art && exercise?.cues && (
                  <SheetGroup title="Tips">
                    <div className="flex flex-col gap-1.5 pb-2">
                      {exercise.cues.map((c) => (
                        <p key={c} className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{c}</p>
                      ))}
                    </div>
                  </SheetGroup>
                )}
              </div>
            );
          }}
        </ForgeSheet>
      )}

      {artFor && <ExerciseArtSheet exerciseId={artFor} onClose={() => setArtFor(null)} />}

      {swapEx && (
        <ForgeSheet title={`${swapEx.name} ruilen`} sub="Zelfde spieren, met wat je sportschool heeft. Je programma blijft zoals het is." onClose={() => setSwapFor(null)}>
          {(close) => {
            // Bij een bergdoel staat bij gelijke keuze een oefening voorop voor een spier die weinig kreeg (engine/mountainMuscles.ts).
            const prefer = swapPreference({ on: strength.mountainMuscles, goals: trainingGoals, milestones: goalMilestones, logs: sessionLogs, today, program });
            const options = swapOptions(exerciseOf(swapEx), strength.profile, workout.map((e) => e.exerciseId), 8, prefer);
            if (options.length > 0) return <SwapList options={options} reasonOf={(e) => swapReason(e, prefer)} onPick={(id) => { swap(swapEx.slot, id); close(); }} />;
            if (options.length === 0) return <p className="py-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>ASCEND kent deze oefening niet goed genoeg om iets met dezelfde spieren voor te stellen.</p>;
            return null;
          }}
        </ForgeSheet>
      )}

      {noteEx && !preview && (
        <NoteSheet
          name={noteEx.name}
          value={strength.exerciseNotes[noteEx.exerciseId] ?? ''}
          onSave={(text) => saveStrength(withExerciseValue(settings.strengthModel, 'exerciseNotes', noteEx.exerciseId, text.trim() === '' ? undefined : text.trim().slice(0, EXERCISE_NOTE_MAX)))}
          onClose={() => setNoteFor(null)}
        />
      )}

      {fillEx && (
        <MachineWeightsForgeSheet
          exerciseId={fillEx.exerciseId}
          onSaved={(next) => {
            // Met de nieuwe lijst opnieuw kijken of er een lichter gewicht past.
            const fit = noFit[fillEx.slot];
            setNoFit((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== fillEx.slot)));
            if (!fit) return;
            const profile = resolveStrengthSettings(next).profile;
            const ctx = { bodyKg, profile, workSets: strength.workSets, maxToFailure: strength.estimateUpTo, stackWeights: strength.stackWeights };
            const again = suggestLighter(fillEx, fit.fromRowId, ctx);
            if (again) {
              setLighter((l) => ({ ...l, [fillEx.slot]: again }));
              return;
            }
            // Nog steeds te zwaar: geen nieuwe vraag, alleen een stille regel onder de oefening.
            const still = suggestOwnWeights(fillEx, fit.fromRowId, ctx);
            if (still) {
              setHeavyTip((l) => ({ ...l, [fillEx.slot]: { text: stillHeavyTip(still), rowId: still.rowId, weightKg: still.weightKg } }));
              return;
            }
            // Het lichtere gewicht ligt er ver boven: ook dan een stille regel.
            const big = suggestTooBigStep(fillEx, fit.fromRowId, ctx);
            if (big) setHeavyTip((l) => ({ ...l, [fillEx.slot]: { text: tooBigStepTip(big), rowId: big.rowId, weightKg: big.weightKg } }));
          }}
          onClose={() => setFillFor(null)}
        />
      )}

      {addOnEx && <ExerciseAddOnForgeSheet exerciseId={addOnEx.exerciseId} onClose={() => setAddOnFor(null)} />}

      {rirFor && rirRow && (
        <ForgeSheet title="Hoeveel had je nog over?" sub={rirRow.target.rir !== undefined ? `Het voorschrift is ${rirRow.target.rir} over.` : undefined} onClose={() => setRirFor(null)}>
          {(close) => (
            <div className="grid grid-cols-6 gap-2 pt-1" role="radiogroup" aria-label="Herhalingen in reserve">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={!rirRow.rirAssumed && rirRow.rir === n}
                  onClick={() => { markCause({ kind: 'eigen', edited: { slot: rirFor.slot, rowId: rirFor.rowId } }); setExercise(rirFor.slot, (e) => updateRow(e, rirFor.rowId, { rir: n })); close(); }}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border"
                  style={{ borderColor: !rirRow.rirAssumed && rirRow.rir === n ? 'var(--color-ink)' : 'var(--color-card-border)' }}
                >
                  <RirBubble rir={n} label={`${n} over`} />
                </button>
              ))}
            </div>
          )}
        </ForgeSheet>
      )}

      {workoutMenu && (
        <ForgeSheet title={template.name} onClose={() => setWorkoutMenu(false)}>
          {(close) => (
            <div className="flex flex-col">
              {!readOnly && !preview && (
                <>
                  <MenuRow icon="pauze" title={paused ? 'Verder' : 'Pauzeren'} sub={paused ? 'De klok loopt weer.' : 'De klok staat stil tot je verder gaat.'} onClick={() => { togglePause(); close(); }} />
                  <MenuRow icon="omlaag" title="Kleiner maken" sub="Het scherm sluit, de training loopt door." onClick={() => { close(); onClose(); }} />
                  <MenuRow icon="vinkje" title="Afronden" onClick={() => { close(); setFinishing(true); }} />
                </>
              )}
              <MenuRow
                title="Een oefening per scherm"
                sub="Opzij vegen van oefening naar oefening. Uit zet ze onder elkaar."
                right={<Toggle checked={resolveForgeLayout(settings) === 'scherm'} onChange={(on) => void updateSettings({ forgeLayout: on ? 'scherm' : 'lijst' })} label="Een oefening per scherm" />}
              />
              {guide && <MenuRow title="Uitleg bij deze training" onClick={() => { close(); setShowGuide(true); }} right={<span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>} />}
              {!readOnly && (
                <MenuRow icon="sluiten" title="Training verwijderen" sub="De sets van deze training gaan weg; de training blijft gepland." danger onClick={() => { close(); later(() => setConfirmDiscard(true), 230); }} />
              )}
            </div>
          )}
        </ForgeSheet>
      )}

      {confirmDiscard && (
        <ForgeSheet title="Training verwijderen?" onClose={() => setConfirmDiscard(false)}>
          {(close) => (
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>De sets van deze training gaan weg. Je logboek verandert niet.</p>
              <div className="flex gap-3">
                <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
                <button
                  type="button"
                  onClick={() => { dropDraft(); setConfirmDiscard(false); onClose(); }}
                  className="min-h-[44px] flex-1 rounded-xl border text-sm font-medium"
                  style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger-text)' }}
                >
                  Verwijderen
                </button>
              </div>
            </div>
          )}
        </ForgeSheet>
      )}

      {awayMs !== undefined && !readOnly && (
        <ForgeSheet title="Lange onderbreking" onClose={() => setAwayMs(undefined)}>
          {(close) => (
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>Je was {formatAway(awayMs)} weg. Telt die tijd mee?</p>
              <div className="flex flex-col gap-3">
                <PrimaryButton onClick={() => { answerBreak(false); close(); }}>Nee, als pauze</PrimaryButton>
                <SecondaryButton onClick={() => { answerBreak(true); close(); }}>Ja, telt mee</SecondaryButton>
              </div>
            </div>
          )}
        </ForgeSheet>
      )}

      {showGuide && guide && (
        <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={date} dayLabel={guideDayLabel(template, date)} onClose={() => setShowGuide(false)} />
      )}

      {finishing && (
        <FinishSheet
          template={template}
          readOnly={readOnly}
          workout={workout}
          elapsedSeconds={startedAt === null ? 0 : activeSeconds({ startedAt, pauses }, clock())}
          defaultMinutes={scheduledDate ? resolveVariantDuration(template, initialVariant, scheduledDate, program) : durationForVariant(template, initialVariant)}
          plannedSessionId={plannedSessionId}
          scheduledDate={scheduledDate}
          onClose={() => setFinishing(false)}
          onSave={async (extra) => {
            const strengthData = readOnly ? undefined : toStrengthData(workout);
            const rir = readOnly ? undefined : hardestLegRir(workout);
            // Een geplande sessie die niet meer bestaat (planning vervangen): dan is het een losse training.
            const plannedStill = !!plannedSessionId && plannedSessions.some((p) => p.id === plannedSessionId);
            const saved = await logSession({
              plannedSessionId: plannedStill ? plannedSessionId : undefined,
              completedDate: extra.doneOn,
              templateId: template.id,
              type: template.type,
              sport: templateSport(template),
              variant: initialVariant,
              durationMinutes: extra.minutes,
              rpe: extra.rpe,
              notes: extra.notes || undefined,
              subjectiveFeel: extra.feel,
              painAreas: extra.pain.length > 0 ? extra.pain.map((p) => p.area) : undefined,
              painReports: extra.pain.length > 0 ? extra.pain : undefined,
              strengthData,
              ...(rir !== undefined ? { strengthRir: rir } : {}),
              ...(strengthData && strengthData.length > 0 ? { gymProfileId: strength.profile.id } : {}),
              ...(!readOnly && forgeLog.length > 0 ? { forgeLog } : {}),
            });
            // Niet opgeslagen betekent: deze training staat al in je logboek. Het concept is dan klaar.
            dropDraft();
            if (saved) onClose();
            return saved;
          }}
        />
      )}
    </Portal>
  );
}

// De regel van het voorstel "toestel in ponden", of undefined.
function poundLine(ex: WorkoutExercise, profile: Parameters<typeof poundStackProposal>[1]): string | undefined {
  const p = poundStackProposal(ex, profile);
  return p ? poundStackText(p) : undefined;
}
