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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exerciseById } from '../../data/exercises';
import { useDrawingsFor } from '../useExerciseArtPrefetch';
import { canRemoveRow, reinsertRow, removeSet, restoreDropped, rowLabel, swipeDeleteOn, type DroppedRow } from '../../engine/forgeRows';
import { canSwap, sessionPrescription, withoutAddedSlot, workoutWithoutAdded } from '../../engine/addedExercises';
import { learnedMinutesPerSet } from '../../engine/durationLearning';
import { capForTemplate, capLineFor, capRemovedFor, capRemovedLine, capSlots, resolveTimeCap, servesMountainMuscle } from '../../engine/forgeTimeCap';
import { forgeSlotsFor } from '../../engine/forgeSlots';
import { hasMountainGoal } from '../../engine/mountainMuscles';
import { ExerciseArtSheet } from '../ExerciseArtSheet';
import { resolveForgeLayout } from '../../engine/forgeLayout';
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
  standJump,
  standHints,
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
  legDayLine,
  planExercise,
  planStateBefore,
  planWorkout,
  plateSteps,
  progress,
  removeLastRow,
  tickAllRows,
  tickRow,
  updateRow,
  usesPlates,
  type PlanContext,
  type WorkoutExercise,
} from '../../engine/forgeWorkout';
import { profileFor } from '../../engine/strengthWeights';
import { isLegHeavyTemplate } from '../../engine/scheduler';
import { durationForVariant, exercisesForVariant, resolveVariantDuration } from '../../engine/substitutions';
import { EXERCISE_NOTE_MAX, resolveStrengthSettings, withExerciseValue } from '../../engine/strengthSettings';
import { getTrainingGuide, guideDayLabel } from '../../data/trainingGuide';
import type { Program } from '../../models/program';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import { useAppData } from '../../state/AppDataContext';
import { todayISO } from '../../utils/dates';
import { haptics } from '../../utils/haptics';
import { reducedMotion } from '../../utils/motion';
import { clearDraft, draftKey, loadDraft } from '../../utils/loggerDraft';
import { primeAudio } from '../../utils/sound';
import { useBackToClose } from '../../utils/useBackToClose';
import { Portal } from '../Portal';
import { TrainingGuideSheet } from '../TrainingGuideSheet';
import { useGuardedSave, useLegEase } from '../useLegEase';
import { decisionFor, easeBecause, easeSlots } from '../../engine/legDayEase';
import { resolveLegEaseHow } from '../../engine/legEaseSettings';
import { asksReserve, reckonAfterTick, reckonWeight, undoRaise } from '../../engine/forgeReckon';
import { poundStackProposal } from '../../engine/poundStack';
import { adjustText, applyLighter, fitStillOpen, noFitText as noFitLine, refitAfterFill, stillOpen, suggestLighter, suggestOwnWeights, tooHeavy, type Adjustment, type NoFit } from '../../engine/forgeAdjust';
import { ownWeightsFor, withMachineSetup } from '../../engine/machineWeights';
import { appendEvents, deriveChanges, noFitEvent, setCountEvent, spotterEvents, underRangeEvent, unseenCount, type ForgeCause, type ForgeEvent } from '../../engine/forgeLog';
import { makeId } from '../../utils/id';
import { activeSeconds, sessionIsDead } from '../../engine/forgeSession';
import { useSessionWorld } from './useForgeSession';
import { readSession } from '../../utils/forgeSessionStore';
import { ExerciseAddOnForgeSheet } from './AddOnWeights';
import { ForgeLogSheet } from './ForgeLogSheet';
import { MachineWeightsForgeSheet } from './MachineWeights';
import { InputDock } from './InputDock';
import { useWakeLock } from './useWakeLock';
import { useRestNotice } from './useRestNotice';
import { resolveDeviceNotices } from '../../engine/deviceNotices';
import { type Rest, clock, isAssisted, type BlockActions, dockRowLabel } from './forgeWorkoutHelpers';
import { ExerciseBlock } from './ExerciseBlock';
import { OtherSessionRunning } from './OtherSessionRunning';
import { DRAFT_VERSION, initialForgeLog, poundLine, type WorkoutDraft } from './forgeDraft';
import { forgeLogInput } from './forgeFinishLog';
import { useForgeDraft } from './useForgeDraft';
import { useForgeClock } from './useForgeClock';
import { useForgeStands } from './useForgeStands';
import { ownWeightsTickedAll } from '../../engine/toestelStanden';
import { REST_DONE_LINGER_MS, useRestAlert } from './useRestAlert';
import { restNameAfter, useForgePager, useLater } from './useForgePager';
import { RestBar } from './ForgeTimers';
import { NoteSheet } from './ExerciseSheets';
import { FinishSheet } from './FinishSheet';
import { ForgeIntro } from './ForgeIntro';
import { ForgeHeader } from './ForgeHeader';
import { LegEasePanel } from './LegEasePanel';
import { AwaySheet, DiscardSheet, ExerciseMenuSheet, RirSheet, RowMenuSheet, SpotterSheet, SwapSheet, WorkoutMenuSheet } from './ForgeMenus';

// Een reden die ouder is dan dit hoort niet meer bij de volgende verandering van de rijen.
const CAUSE_MAX_AGE_MS = 2000;

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
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor, settings.weightFromHealthConnect);
  // De standen van een toestel (engine/toestelStanden.ts): onthouden bij het afvinken, met Terugdraaien.
  const stands = useForgeStands({ remember: strength.learnStands, readOnly, profile: strength.profile, logs: sessionLogs });
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
  const { startedAt, pauses, paused, lastAction, awayMs, setAwayMs, begin, togglePause, answerBreak } = useForgeClock(restored, readOnly, settings);
  const later = useLater();
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
  const [forgeLog, setForgeLog] = useState<ForgeEvent[]>(() => initialForgeLog(workout, restored, readOnly));
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
  const { paged, pagerEl, page, pageRef, onPagerScroll, jumpTo, pageToOpen } = useForgePager(resolveForgeLayout(settings) === 'scherm', workout, activeRef, later);
  // De oefening zoals hij was toen je dit veld begon te bewerken (zie applyWeight).
  const baseRef = useRef<{ key: string; ex: WorkoutExercise } | null>(null);
  const layout = useRef({ dockH: 0, restH: 0 });

  useWakeLock(strength.keepScreenOn && !preview);

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
  // Een toestel dat je opent (een veld of het menu): de eerste keer neemt Forge de gewichten uit je logs over.
  const openSlot = menuFor ?? dock?.slot;
  useEffect(() => {
    const ex = openSlot ? workout.find((e) => e.slot === openSlot) : undefined;
    if (ex) stands.onOpen(ex.exerciseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlot]);
  const dockKey = dock ? `${dock.slot}:${dock.rowId}` : '';
  const dockRowId = dock?.rowId;
  useEffect(() => {
    if (!dockRowId || dockH === 0) return;
    scrollToRow(dockRowId);
  }, [dockKey, dockH, dockRowId]);

  // Het concept en de wijzer van de sessie (useForgeDraft.ts).
  const { dropDraft } = useForgeDraft({ key, template, plannedSessionId, scheduledDate, variant: initialVariant, readOnly, startedAt, pauses, lastAction, workout, easeOn, rest, column, forgeLog, seenAt });
  // Jouw handelingen zetten het laatste moment van handelen: een set afvinken, typen, een oefening ruilen.
  const firstWorkout = useRef(workout);
  useEffect(() => {
    if (workout !== firstWorkout.current) lastAction.current = Date.now();
  }, [workout, lastAction]);

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

  const alerted = useRestAlert(rest, setRest, strength.restAlert, strength.restSound);

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
  const guard = useGuardedSave();
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
    <LegEasePanel easeState={easeState} legEase={legEase} guard={guard} easeOn={easeOn} started={started} legLine={legLine} slots={slots} easeHow={easeHow} modelEnabled={strength.enabled} replan={replan} />
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
    setQuickRir(strength.quickRir && !readOnly && askEx && asksReserve(askEx, rowId, strength.enabled && strength.assumedCounts) ? { slot, rowId } : null);
    // De focus schuift vloeiend naar de volgende open set; is de oefening af, dan
    // klapt hij zacht in en gaat het scherm naar de volgende oefening.
    const ticked = result.workout.find((e) => e.slot === slot)?.rows.find((r) => r.id === rowId)?.done;
    // Na een set die te zwaar was stelt Forge een lichter gewicht voor; een andere tik haalt een oud voorstel weg.
    const tickedEx = result.workout.find((e) => e.slot === slot);
    const adjustCtx = { bodyKg, profile: strength.profile, workSets: strength.workSets, maxToFailure: strength.estimateUpTo, stackWeights: strength.stackWeights };
    const live = !!ticked && !!tickedEx && strength.enabled && strength.adjustLive && !readOnly;
    // Stelde Forge de volgende set al zelf bij (Forge rekent mee), dan geen tweede vraag om lichter.
    const reckonedHere = reckoned.find((e) => e.slot === slot) !== raw.workout.find((e) => e.slot === slot);
    const proposal = live && !reckonedHere ? suggestLighter(tickedEx, rowId, adjustCtx) : undefined;
    // Past er geen enkel gewicht, dan vraagt Forge of je de gewichten van het toestel invult.
    const fit = live && !proposal ? suggestOwnWeights(tickedEx, rowId, adjustCtx) : undefined;
    setLighter((l) => {
      if (!proposal && !(slot in l)) return l;
      const { [slot]: _old, ...others } = l;
      void _old;
      return proposal ? { ...others, [slot]: proposal } : others;
    });
    setHeavyTip((l) => (slot in l ? Object.fromEntries(Object.entries(l).filter(([k]) => k !== slot)) : l));
    // Een afgevinkte set op een toestel met blok: het gewicht wordt een stand (alleen onthouden, nooit een vraag).
    if (ticked && tickedEx) {
      const doneRow = tickedEx.rows.find((r) => r.id === rowId);
      stands.onTick(tickedEx, doneRow?.weightKg);
    }
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
        pageToOpen(result.workout, calm ? 0 : 700);
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
      setRest({ endsAt: clock() + result.restSec * 1000, total: result.restSec, name: restNameAfter(result.workout, slot, ex?.name ?? '') });
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
    {
      const before = workout.find((e) => e.slot === slot);
      const after = result.workout.find((e) => e.slot === slot);
      const weights = ownWeightsTickedAll(before, after);
      if (after) for (const w of weights) stands.onTick(after, w);
    }
    const after = result.workout.find((e) => e.slot === slot);
    if (after && exerciseComplete(after)) {
      if (dock?.slot === slot) { dockClosing.current = false; setDock(null); }
      const next = activeRow(result.workout);
      setActiveRef(next);
      const calm = reducedMotion();
      pageToOpen(result.workout, calm ? 0 : 700);
      later(() => {
        setFolded((f) => ({ ...f, [slot]: true }));
        if (next) later(() => scrollToRow(next.rowId), calm ? 0 : 320);
      }, calm ? 0 : 380);
    }
    if (result.restSec && strength.restAuto) {
      const ex = workout.find((e) => e.slot === slot);
      alerted.current = null;
      setRest({ endsAt: clock() + result.restSec * 1000, total: result.restSec, name: restNameAfter(result.workout, slot, ex?.name ?? '') });
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
    // Een toestel met standen: Minder en Meer springen naar de vorige en volgende stand.
    if (isWeight && !isAssisted(ex)) {
      const jump = standJump(exerciseOf(ex), profileFor(strength.profile, ex.dumbbellTotal), current ?? 0, direction, strength.learnStands);
      if (jump !== undefined) {
        const bounded = Math.min(weightBounds(exerciseOf(ex)).max, Math.max(weightBounds(exerciseOf(ex)).min, jump));
        changeValue(bounded);
        return bounded;
      }
    }
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

  const latest = useRef({ tick, tickAll, openField, take, setExercise, takeLighter, takeBack, addSetLogged, removeSetLogged, undoRemove, chooseQuickRir, savePounds, standUndo: stands.undo });
  useEffect(() => {
    latest.current = { tick, tickAll, openField, take, setExercise, takeLighter, takeBack, addSetLogged, removeSetLogged, undoRemove, chooseQuickRir, savePounds, standUndo: stands.undo };
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
      standUndo: () => latest.current.standUndo(),
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
    stands.dismiss(slot);
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
  // Op een toestel met standen: waar Minder en Meer heen springen, klein onder de toets.
  const dockStepHints = (() => {
    if (!dock || dock.field !== 'weightKg' || !dockEx || !dockRow || isAssisted(dockEx)) return undefined;
    // Een leeg veld zegt bij Minder niets (standHints), nooit "naar 0 kilo".
    return standHints(exerciseOf(dockEx), profileFor(strength.profile, dockEx.dumbbellTotal), dockRow.weightKg ?? dockRow.target.weightKg, strength.learnStands);
  })();
  const rowMenuEx = rowMenu ? workout.find((e) => e.slot === rowMenu.slot) : undefined;
  const rowMenuRow = rowMenuEx?.rows.find((r) => r.id === rowMenu?.rowId);
  const rirRow = rirFor ? workout.find((e) => e.slot === rirFor.slot)?.rows.find((r) => r.id === rirFor.rowId) : undefined;

  const bottomPad = dockH > 0 ? dockH + (rest && !readOnly ? 70 : 0) + 16 : rest ? 120 : 48;
  // Het voorstel van Spieren voor de berg, één keer rustig bij het openen van de training waar de oefening bij
  // zou komen (zelfde melding en zelfde Akkoord als in de weekterugblik). Niet bij kijken en niet na de eerste set.
  const mountainNotice = !readOnly && !startedAt;
  const intro = <ForgeIntro templateId={template.id} today={today} date={date} program={program} preview={preview} readOnly={readOnly} mountainNotice={mountainNotice} capLine={capLine} legLine={legLine} legPanel={legPanel} />;
  const exerciseBlock = (ex: WorkoutExercise, i: number) => {
    const capRemoved = capRemovedFor(capped, ex, effSlots);
    return (
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
              quickRirRow={quickRir?.slot === ex.slot && asksReserve(ex, quickRir.rowId, strength.enabled && strength.assumedCounts) ? quickRir.rowId : undefined}
              capText={capRemoved > 0 ? capRemovedLine(capRemoved) : undefined}
              standLine={stands.lineFor(ex, exerciseComplete(ex))}
              poundText={!readOnly && !poundKept[ex.slot] && ex.rows.some((r) => r.done) ? poundLine(ex, strength.profile) : undefined}
              act={actions}
            />
    );
  };

  return (
    <Portal>
      <div ref={scrollEl} id="forge-scroll" className={`fixed inset-0 z-50 animate-fade-in ${paged ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`} style={{ background: 'var(--color-bg)' }}>
        <div className={paged ? 'mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col' : 'mx-auto max-w-md'} style={paged ? undefined : { paddingBottom: bottomPad }}>
          <ForgeHeader
            headerRef={headerEl}
            title={template.name}
            preview={preview}
            readOnly={readOnly}
            startedAt={startedAt}
            pauses={pauses}
            paused={paused}
            done={done}
            total={total}
            news={news}
            paged={paged}
            workout={workout}
            page={page}
            onClose={onClose}
            onMenu={() => setWorkoutMenu(true)}
            onFinish={() => setFinishing(true)}
            onLog={() => { setLogOpen(true); setSeenAt(Date.now()); }}
            onResume={togglePause}
            onJump={jumpTo}
          />
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
          stepHints={dockStepHints}
          plate={dockPlates?.[dockIndex]}
          plateOn={platesOn}
          onTogglePlates={() => setPlatesOn((v) => !v)}
        />
      )}

      {logOpen && <ForgeLogSheet events={forgeLog} workout={workout} onClose={() => setLogOpen(false)} />}

      {spotterInfo && <SpotterSheet onClose={() => setSpotterInfo(false)} />}

      {rowMenu && rowMenuEx && rowMenuRow && (
        <RowMenuSheet
          ex={rowMenuEx}
          rowId={rowMenuRow.id}
          onTake={() => take(rowMenuEx.slot, rowMenuRow.id)}
          onCopy={() => setExercise(rowMenuEx.slot, (e) => copyRow(e, rowMenuRow.id))}
          onRemove={() => removeSetLogged(rowMenuEx.slot, rowMenuRow.id)}
          onClose={() => setRowMenu(null)}
        />
      )}

      {menuEx && (
        <ExerciseMenuSheet
          ex={menuEx}
          effSlots={effSlots}
          readOnly={readOnly}
          preview={preview}
          templateId={template.id}
          settings={settings}
          strength={strength}
          onSwapBack={() => swap(menuEx.slot, null)}
          onPickSwap={() => setSwapFor(menuEx.slot)}
          onNote={() => setNoteFor(menuEx.slot)}
          onArt={() => setArtFor(menuEx.exerciseId)}
          onFill={() => setFillFor(menuEx.slot)}
          onAddOn={() => setAddOnFor(menuEx.slot)}
          onRemoveAdded={() => removeAddedExercise(menuEx.slot)}
          onAddSet={(kind) => addSetLogged(menuEx.slot, kind)}
          onTickAll={() => tickAll(menuEx.slot)}
          onRemoveLast={() => setExercise(menuEx.slot, removeLastRow)}
          onRestSeconds={(s) => {
            setWorkout((w) => w.map((e) => (e.exerciseId === menuEx.exerciseId ? { ...e, restSec: s } : e)));
            saveStrength(withExerciseValue(settings.strengthModel, 'restSeconds', menuEx.exerciseId, s));
          }}
          onStartRest={() => {
            alerted.current = null;
            setRest({ endsAt: clock() + menuEx.restSec * 1000, total: menuEx.restSec, name: menuEx.name });
          }}
          onClose={() => setMenuFor(null)}
        />
      )}

      {artFor && <ExerciseArtSheet exerciseId={artFor} onClose={() => setArtFor(null)} />}

      {swapEx && <SwapSheet ex={swapEx} workout={workout} strength={strength} program={program} onPick={(id) => swap(swapEx.slot, id)} onClose={() => setSwapFor(null)} />}

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
            const result = refitAfterFill(fillEx, fit, ctx);
            if (!result) return;
            if ('lighter' in result) setLighter((l) => ({ ...l, [fillEx.slot]: result.lighter }));
            else setHeavyTip((l) => ({ ...l, [fillEx.slot]: result.tip }));
          }}
          onClose={() => setFillFor(null)}
        />
      )}

      {addOnEx && <ExerciseAddOnForgeSheet exerciseId={addOnEx.exerciseId} onClose={() => setAddOnFor(null)} />}

      {rirFor && rirRow && (
        <RirSheet
          target={rirRow.target.rir}
          current={rirRow.rir}
          assumed={rirRow.rirAssumed}
          onPick={(n) => { markCause({ kind: 'eigen', edited: { slot: rirFor.slot, rowId: rirFor.rowId } }); setExercise(rirFor.slot, (e) => updateRow(e, rirFor.rowId, { rir: n })); }}
          onClose={() => setRirFor(null)}
        />
      )}

      {workoutMenu && (
        <WorkoutMenuSheet
          name={template.name}
          readOnly={readOnly}
          preview={preview}
          paused={paused}
          hasGuide={!!guide}
          layoutPaged={resolveForgeLayout(settings) === 'scherm'}
          onTogglePause={togglePause}
          onMinimize={onClose}
          onFinish={() => setFinishing(true)}
          onLayout={(on) => void updateSettings({ forgeLayout: on ? 'scherm' : 'lijst' })}
          onGuide={() => setShowGuide(true)}
          onDiscard={() => later(() => setConfirmDiscard(true), 230)}
          onClose={() => setWorkoutMenu(false)}
        />
      )}

      {confirmDiscard && <DiscardSheet onDiscard={() => { dropDraft(); setConfirmDiscard(false); onClose(); }} onClose={() => setConfirmDiscard(false)} />}

      {awayMs !== undefined && !readOnly && <AwaySheet awayMs={awayMs} onAnswer={answerBreak} onClose={() => setAwayMs(undefined)} />}

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
            // Een geplande sessie die niet meer bestaat (planning vervangen): dan is het een losse training.
            const plannedStill = !!plannedSessionId && plannedSessions.some((p) => p.id === plannedSessionId);
            const saved = await logSession(forgeLogInput({ template, variant: initialVariant, extra, workout, readOnly, plannedSessionId, plannedStill, gymProfileId: strength.profile.id, forgeLog }));
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
