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
import { restoreDropped, swipeDeleteOn } from '../../engine/forgeRows';
import { canSwap, sessionPrescription, withoutAddedSlot, workoutWithoutAdded } from '../../engine/addedExercises';
import { learnedMinutesPerSet } from '../../engine/durationLearning';
import { capForTemplate, capLineFor, capRemovedFor, capRemovedLine, capSlots, referenceMinutes, resolveTimeCap, roleLabel, servesMountainMuscle } from '../../engine/forgeTimeCap';
import { forgeSlotsFor } from '../../engine/forgeSlots';
import { withoutStepSwap } from '../../engine/stepSwaps';
import { hasMountainGoal } from '../../engine/mountainMuscles';
import { resolveForgeLayout } from '../../engine/forgeLayout';
import { calibrationBlock, calibrationSlot, withCalibrationTarget } from '../../engine/calibration';
import { bodyLoadView } from '../../engine/bodyLoad';
import { WeightSheet } from '../settings/groups/LichaamSheets';
import { BodyLoadSheet } from './BodyLoad';
import { loadBodyKg, loadWeight } from '../../engine/weightTrend';
import {
  activeRow,
  resumeDraft,
  exerciseComplete,
  makeSnap,
  takeTarget,
  type RowRef,
} from '../../engine/forgeInput';
import {
  exerciseOf,
  legDayLine,
  planExercise,
  planStateBefore,
  planWorkout,
  progress,
  tickAllRows,
  tickRow,
  updateRow,
  type PlanContext,
  type PlanExerciseOptions,
  type WorkoutExercise,
} from '../../engine/forgeWorkout';
import { profileFor } from '../../engine/strengthWeights';
import { isLegHeavyTemplate } from '../../engine/scheduler';
import { exercisesForVariant } from '../../engine/substitutions';
import { resolveStrengthSettings } from '../../engine/strengthSettings';
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
import { useGuardedSave, useLegEase } from '../useLegEase';
import { decisionFor, easeBecause, easeSlots } from '../../engine/legDayEase';
import { resolveLegEaseHow } from '../../engine/legEaseSettings';
import { asksReserve, reckonAfterTick, undoRaise } from '../../engine/forgeReckon';
import { poundStackProposal } from '../../engine/poundStack';
import { adjustText, applyLighter, fitStillOpen, noFitText as noFitLine, stillOpen, suggestLighter, suggestOwnWeights, tooHeavy, type Adjustment, type NoFit } from '../../engine/forgeAdjust';
import { ownWeightsFor, withMachineSetup } from '../../engine/machineWeights';
import { appendEvents, deriveChanges, noFitEvent, spotterEvents, underRangeEvent, unseenCount, type ForgeCause, type ForgeEvent } from '../../engine/forgeLog';
import { makeId } from '../../utils/id';
import { sessionIsDead } from '../../engine/forgeSession';
import { useSessionWorld } from './useForgeSession';
import { readSession } from '../../utils/forgeSessionStore';
import { useWakeLock } from './useWakeLock';
import { useRestNotice } from './useRestNotice';
import { resolveDeviceNotices } from '../../engine/deviceNotices';
import { type Rest, clock, type BlockActions } from './forgeWorkoutHelpers';
import { ExerciseBlock } from './ExerciseBlock';
import { OtherSessionRunning } from './OtherSessionRunning';
import { DRAFT_VERSION, initialForgeLog, poundLine, sessionStepSwaps, type WorkoutDraft } from './forgeDraft';
import { useForgeDraft } from './useForgeDraft';
import { useForgeClock } from './useForgeClock';
import { useForgeStands } from './useForgeStands';
import { useForgeSheets } from './useForgeSheets';
import { useForgeDock } from './useForgeDock';
import { useForgeScroll } from './useForgeScroll';
import { useForgeRowEdits } from './useForgeRowEdits';
import { ForgeDock } from './ForgeDock';
import { ForgeSheets } from './ForgeSheets';
import { ownWeightsTickedAll } from '../../engine/toestelStanden';
import { REST_DONE_LINGER_MS, useRestAlert } from './useRestAlert';
import { asksClean, ladderHint, ladderLines, withBand, withClean } from '../../engine/forgeLadder';
import { ladderStateFor } from '../../engine/skillLadder';
import { exerciseKey } from '../../engine/strengthHistory';
import type { SetBand } from '../../models/training';
import { restNameAfter, useForgePager, useLater } from './useForgePager';
import { restBeforeNewExercise } from '../../engine/forgeInput';
import { RestBar } from './ForgeTimers';
import { ForgeIntro } from './ForgeIntro';
import { ForgeHeader } from './ForgeHeader';
import { LegEasePanel } from './LegEasePanel';

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
  const { settings, updateSettings, strengthExternal, templates, plannedSessions, sessionLogs, injuryNotes, trainingGoals, goalMilestones } = useAppData();
  const today = todayISO();
  const date = scheduledDate ?? today;
  // Met MacroFactor als bron en bij alleen kijken is dit het voorschrift zonder invulvelden.
  const readOnly = strengthExternal || preview;
  const strength = useMemo(() => resolveStrengthSettings(settings.strengthModel), [settings.strengthModel]);
  const bodyKg = loadBodyKg(settings);
  // Eigen gewicht: het gewicht en het aandeel dat meetelt (BodyLoad.tsx); het blad en Gewicht aanpassen.
  const loadW = loadWeight(settings);
  const [bodyLoadSlot, setBodyLoadSlot] = useState<string | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [calLater, setCalLater] = useState(false);
  const [calState, setCalState] = useState<{ phase: 'open' | 'added' | 'failed'; name: string }>({ phase: 'open', name: '' });
  // De standen van een toestel (engine/toestelStanden.ts): onthouden bij het afvinken, met Terugdraaien.
  const stands = useForgeStands({ remember: strength.learnStands, readOnly, profile: strength.profile, logs: sessionLogs });
  // "Forge rekent mee" (engine/forgeReckon.ts): dezelfde rekening als het bijsturen.
  const reckonCtx = { bodyKg, profile: strength.profile, workSets: strength.workSets, maxToFailure: strength.estimateUpTo, stackWeights: strength.stackWeights, on: strength.enabled && strength.reckon && !readOnly };
  // A program from MacroFactor gives the exercises of the week of this training, and an exercise you added after a
  // proposal with Akkoord comes behind them (engine/forgeSlots.ts, the same list the week review reads).
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

  // Een ladderstap die je in deze sessie met Akkoord koos (StepProposalNotice.tsx) geldt vanaf de volgende sessie:
  // deze sessie houdt de stappen van het openen, ook in het concept (forgeDraft.ts#sessionStepSwaps), anders wisselt
  // mergeDraft na herladen een onaangeraakte plek midden in de sessie.
  const [sessionSwaps] = useState(() => sessionStepSwaps(restored, settings.strengthModel?.stepSwaps));
  const allSlots = useMemo(() => forgeSlotsFor(template, { ...settings.strengthModel, stepSwaps: sessionSwaps }, date), [template, settings.strengthModel, sessionSwaps, date]);
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
  const capSetting = useMemo(() => resolveTimeCap({ forgeCapStrength: capStrength, forgeCapLegs: capLegs }), [capStrength, capLegs]);
  // De referentie voor de regel onder de klok (ForgeHeader.tsx): een gekozen grens, anders 60 of op een beendag 75.
  const reference = referenceMinutes(template, capSetting);
  // De rol per plek (Kern, Bijwerk, Extra), uit het voorschrift; een geruilde oefening houdt de rol van zijn plek.
  const priorityBySlot = useMemo(() => new Map(allSlots.map((s) => [s.id, s.priority])), [allSlots]);
  const priorityOf = useCallback((slot: string) => priorityBySlot.get(slot) ?? 'core', [priorityBySlot]);
  const capped = useMemo(() => capSlots({
    slots: exercisesForVariant({ ...template, exercises: allSlots }, initialVariant),
    fullSlots: allSlots,
    fullMinutes,
    minutesPerSet,
    // Met de standaard "Tonen, niet inkorten" is dit 0: capSlots laat dan alles staan.
    cap: capForTemplate(template, capSetting),
    // Bij een bergdoel (zoals Spieren voor de berg het leest) vallen kuit, scheen en bilspieren als laatste weg.
    ...(mountainGoal ? { keep: servesMountainMuscle } : {}),
  }), [template, allSlots, initialVariant, fullMinutes, minutesPerSet, capSetting, mountainGoal]);
  const slots = capped.slots;

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
  // Welk blad open staat (useForgeSheets.ts, getoond door ForgeSheets.tsx).
  const sh = useForgeSheets(startAtForm && !preview);
  // "Hoeveel over?" onder de set die je net afvinkte (alleen als het anders ging, of met Vaker vragen ook de topset en de laatste set; asksReserve).
  const [quickRir, setQuickRir] = useState<{ slot: string; rowId: string } | null>(null);
  // "Ging het netjes?" onder de werkset op een ladderstap die je net afvinkte; de volgende handeling in de oefening haalt hem weg.
  const [cleanAsk, setCleanAsk] = useState<{ slot: string; rowId: string } | null>(null);
  // Calisthenics (docs/beslissingen/2026-11-09-calisthenics-forge-rij.md): de regels en de tik alleen met Stappen bij
  // calisthenics; de vraag en de band horen daarbij en staan anders ook uit.
  const stepsOn = strength.ladderRow;
  const cleanOn = stepsOn && strength.askClean;
  const bandOn = stepsOn && strength.askBand;
  // Oefeningen waarvan je het voorstel "toestel in ponden" liet liggen, deze training.
  const [poundKept, setPoundKept] = useState<Record<string, true>>({});
  // Het voorstel "Lichter?" per oefening, na een set die te zwaar was (engine/forgeAdjust.ts).
  const [lighter, setLighter] = useState<Record<string, Adjustment>>({});
  // Geen gewicht van dit toestel past: de regel die vraagt of je de gewichten invult, per oefening.
  const [noFit, setNoFit] = useState<Record<string, NoFit>>({});
  // Een stille tip na het invullen van de gewichten, als er dan nog steeds niets past.
  const [heavyTip, setHeavyTip] = useState<Record<string, { text: string; rowId?: string; weightKg?: number }>>({});
  // Het verloop van de training: wat Forge bijstuurde, wat doorgevoerd werd en wat jij zelf aanpaste.
  const [forgeLog, setForgeLog] = useState<ForgeEvent[]>(() => initialForgeLog(workout, restored, readOnly));
  const [seenAt, setSeenAt] = useState<number>(() => (restored && typeof restored.seen === 'number' ? restored.seen : 0));
  // Waardoor de volgende verandering van de rijen kwam; zonder opgave is het geen gebeurtenis.
  // Met een tijdstempel: een handeling die niets veranderde (dezelfde rijen) laat geen reden achter voor
  // een latere, onafhankelijke verandering.
  const cause = useRef<{ why: ForgeCause; at: number }>({ why: { kind: 'negeer' }, at: 0 });
  const markCause = (why: ForgeCause) => { cause.current = { why, at: Date.now() }; };
  const prevWorkout = useRef(workout);
  // De tekeningen van de oefeningen van deze training, voor de kaartjes in de kop.
  useDrawingsFor(useMemo(() => workout.map((e) => e.exerciseId), [workout]), !preview);
  // De set die nu aan de beurt is, en de oefeningen die zijn ingeklapt.
  const [activeRef, setActiveRef] = useState<RowRef | undefined>(() => activeRow(workout));
  const [folded, setFolded] = useState<Record<string, boolean>>(() => Object.fromEntries(workout.filter(exerciseComplete).map((e) => [e.slot, true])));
  const { paged, pagerEl, page, pageRef, onPagerScroll, jumpTo, pageToOpen } = useForgePager(resolveForgeLayout(settings) === 'scherm', workout, activeRef, later);
  // De oefening zoals hij was toen je dit veld begon te bewerken (zie applyWeight).
  const baseRef = useRef<{ key: string; ex: WorkoutExercise } | null>(null);
  // Het invoerpaneel (useForgeDock.ts) en een set in beeld (useForgeScroll.ts).
  const dockApi = useForgeDock({ workout, setWorkout, setActiveRef, begin, markCause, baseRef, strength, bodyKg, readOnly, reckonCtx });
  const { dock, dockH, closeDock, openField } = dockApi;
  const { scrollEl, headerEl, scrollToRow } = useForgeScroll(pageRef, dock, dockH, rest && !readOnly ? 70 : 0);

  useWakeLock(strength.keepScreenOn && !preview);

  // Een toestel dat je opent (een veld of het menu): de eerste keer neemt Forge de gewichten uit je logs over.
  const openSlot = sh.menuFor ?? dock?.slot;
  useEffect(() => {
    const ex = openSlot ? workout.find((e) => e.slot === openSlot) : undefined;
    if (ex) stands.onOpen(ex.exerciseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlot]);

  // Het concept en de wijzer van de sessie (useForgeDraft.ts).
  const { dropDraft } = useForgeDraft({ key, template, plannedSessionId, scheduledDate, variant: initialVariant, readOnly, startedAt, pauses, lastAction, workout, easeOn, rest, column, forgeLog, seenAt, stepSwaps: sessionSwaps });
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

  const alerted = useRestAlert(rest, setRest, strength);
  const startRest = (next: Rest) => {
    alerted.current = null;
    setRest(next);
  };

  // Dezelfde eindtijd als melding van de telefoon, voor als het scherm uit is (useRestNotice.ts).
  useRestNotice(readOnly ? undefined : rest, resolveDeviceNotices(settings).rest, strength.restAlert);

  // Terug laat de training staan (het concept blijft); weggooien gaat via het menu.
  useBackToClose(true, onClose);

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
  const { setExercise, undo, addSetLogged, removeSetLogged, undoRemove } = useForgeRowEdits({ workout, setWorkout, setForgeLog, begin, baseRef, readOnly });

  function tick(slot: string, rowId: string) {
    if (!readOnly) begin();
    haptics.tap();
    primeAudio();
    baseRef.current = null;
    const raw = tickRow(workout, slot, rowId);
    // Forge rekent mee: ging de set anders dan gevraagd, dan stelt Forge de volgende open werkset bij.
    // Een houding heeft geen gewicht en geen reserve: Forge rekent daar niet mee.
    const reckoned = raw.workout.map((e) => (e.slot === slot && !e.hold ? reckonAfterTick(e, rowId, reckonCtx) : e));
    const result = { ...raw, workout: reckoned };
    if (reckoned.some((e, i) => e !== raw.workout[i])) markCause({ kind: 'meegerekend', via: { slot, rowId } });
    setWorkout(result.workout);
    // Na het afvinken van de topset of de laatste set: één snelle vraag hoeveel je over had. Een andere tik haalt hem weg.
    const askEx = result.workout.find((e) => e.slot === slot);
    setQuickRir(strength.quickRir && !readOnly && askEx && !askEx.hold && asksReserve(askEx, rowId, strength.enabled && strength.assumedCounts, strength.quickRirMode === 'vaker' ? 'vaker' : 'twijfel') ? { slot, rowId } : null);
    setCleanAsk(cleanOn && !readOnly && askEx && asksClean(askEx, rowId, exerciseOf(askEx)) ? { slot, rowId } : null);
    // De focus schuift vloeiend naar de volgende open set; is de oefening af, dan
    // klapt hij zacht in en gaat het scherm naar de volgende oefening.
    const ticked = result.workout.find((e) => e.slot === slot)?.rows.find((r) => r.id === rowId)?.done;
    // Na een set die te zwaar was stelt Forge een lichter gewicht voor; een andere tik haalt een oud voorstel weg.
    const tickedEx = result.workout.find((e) => e.slot === slot);
    const adjustCtx = { bodyKg, profile: strength.profile, workSets: strength.workSets, maxToFailure: strength.estimateUpTo, stackWeights: strength.stackWeights };
    const live = !!ticked && !!tickedEx && !tickedEx.hold && strength.enabled && strength.adjustLive && !readOnly;
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
        if (dock?.slot === slot) closeDock();
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
      setRest({ endsAt: clock() + result.restSec * 1000, total: result.restSec, name: restNameAfter(result.workout, slot, ex?.name ?? ''), nextExercise: restBeforeNewExercise(result.workout, slot) });
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
    setCleanAsk(null);
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
      if (dock?.slot === slot) closeDock();
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
      setRest({ endsAt: clock() + result.restSec * 1000, total: result.restSec, name: restNameAfter(result.workout, slot, ex?.name ?? ''), nextExercise: restBeforeNewExercise(result.workout, slot) });
    }
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
    markCause(after !== mine ? { kind: 'meegerekend', via: { slot, rowId } } : { kind: 'eigen', edited: { slot, rowId } });
    setExercise(slot, () => after);
  }

  // "Ging het netjes?": Ja, Nee, of achteraf in het setmenu ook "weet ik niet". Alleen de rij; het log komt bij Afronden.
  function chooseClean(slot: string, rowId: string, clean: boolean | undefined) {
    setCleanAsk(null);
    haptics.tap();
    setExercise(slot, (e) => withClean(e, rowId, clean));
  }

  // De band voor de open sets van deze oefening; een gedane set houdt zijn band.
  function chooseBand(slot: string, band: SetBand | null) {
    if (!readOnly) begin();
    setCleanAsk((c) => (c?.slot === slot ? null : c));
    setExercise(slot, (e) => withBand(e, band));
  }

  // Stap lichter of Stap zwaarder: dezelfde weg als Ruilen, alleen voor dit scherm. Terug naar de oefening van het
  // plan is gewoon "Terug naar", zonder "voor ..." in de kop.
  function stepTo(slot: string, exerciseId: string) {
    const current = workout.find((e) => e.slot === slot);
    const prescription = current ? sessionPrescription(effSlots, current) : undefined;
    if (!prescription) return;
    haptics.tap();
    setCleanAsk((c) => (c?.slot === slot ? null : c));
    const own = exerciseKey(prescription.id, prescription.exerciseName).exercise?.id;
    swap(slot, exerciseId === own ? null : exerciseId, { ladderStep: true });
  }

  // Het toestel als ponden opslaan in je sportschool: alleen na een tik op Opslaan.
  function savePounds(slot: string) {
    const ex = workout.find((e) => e.slot === slot);
    const p = ex ? poundStackProposal(ex, strength.profile) : undefined;
    setPoundKept((k) => ({ ...k, [slot]: true }));
    if (!ex || !p) return;
    saveStrength(withMachineSetup(settings.strengthModel, ex.exerciseId, { ranges: [p.range] }));
  }

  const latest = useRef({ tick, tickAll, openField, take, setExercise, takeLighter, takeBack, addSetLogged, removeSetLogged, undoRemove, chooseQuickRir, savePounds, standUndo: stands.undo, stepTo, chooseBand, chooseClean });
  useEffect(() => {
    latest.current = { tick, tickAll, openField, take, setExercise, takeLighter, takeBack, addSetLogged, removeSetLogged, undoRemove, chooseQuickRir, savePounds, standUndo: stands.undo, stepTo, chooseBand, chooseClean };
  });
  const { setMenuFor, setRowMenu, setRirFor, setFillFor, setSpotterInfo } = sh;
  const actions = useMemo<BlockActions>(
    () => ({
      column: () => setColumn((c) => (c === 'target' ? 'previous' : 'target')),
      fold: (slot) => setFolded((f) => ({ ...f, [slot]: !f[slot] })),
      menu: (slot) => setMenuFor(slot),
      tick: (slot, rowId) => latest.current.tick(slot, rowId),
      open: (slot, rowId, name) => {
        setCleanAsk((c) => (c?.slot === slot ? null : c));
        latest.current.openField(slot, rowId, name);
      },
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
      step: (slot, exerciseId) => latest.current.stepTo(slot, exerciseId),
      bodyLoad: (slot) => setBodyLoadSlot(slot),
      band: (slot, band) => latest.current.chooseBand(slot, band),
      clean: (slot, rowId, clean) => latest.current.chooseClean(slot, rowId, clean),
    }),
    [setMenuFor, setRowMenu, setRirFor, setFillFor, setSpotterInfo, setBodyLoadSlot],
  );

  // `opts.ladderStep`: de ruil komt van Stap lichter of Stap zwaarder; alleen dan krijgt een ladderstap de rijen van
  // de stap zelf (forgeWorkout.ts#planExercise). Gewoon Ruilen houdt het voorschrift van het model.
  function swap(slot: string, exerciseId: string | null, opts: PlanExerciseOptions = {}) {
    const current = workout.find((e) => e.slot === slot);
    // Vangnet: met een afgevinkte set wordt nooit geruild, want ruilen zet nieuwe rijen neer.
    if (!current || !canSwap(effSlots, current)) return;
    const prescription = sessionPrescription(effSlots, current);
    if (!prescription) return;
    const state = planStateBefore(ctx, workout, slot);
    const to = exerciseId ? exerciseById(exerciseId) : undefined;
    clearHints(slot);
    stands.dismiss(slot);
    setCleanAsk((c) => (c?.slot === slot ? null : c));
    const swapped = planExercise(prescription, ctx, state, to, opts);
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

  // "Terug naar ... in je plan": de ladderstap gaat uit je plan, de volgende keer dat je de training opent. Deze sessie
  // blijft zoals hij is.
  function undoStepSwap(slot: string) {
    return updateSettings({ strengthModel: withoutStepSwap(settings.strengthModel, template.id, slot) });
  }


  // De stand van de ladder van elke oefening op een ladder, uit je logs tot de dag van deze training (engine/skillLadder.ts).
  const ladderIds = workout.map((e) => e.exerciseId).join('|');
  const ladderStates = useMemo(() => {
    const out = new Map<string, ReturnType<typeof ladderStateFor>>();
    if (!stepsOn) return out;
    for (const id of ladderIds.split('|')) if (!out.has(id)) out.set(id, ladderStateFor(id, sessionLogs, date));
    return out;
  }, [ladderIds, sessionLogs, date, stepsOn]);

  const bottomPad = dockH > 0 ? dockH + (rest && !readOnly ? 70 : 0) + 16 : rest ? 120 : 48;
  // Het voorstel van Spieren voor de berg, één keer rustig bij het openen van de training waar de oefening bij
  // zou komen (zelfde melding en zelfde Akkoord als in de weekterugblik). Niet bij kijken en niet na de eerste set.
  const mountainNotice = !readOnly && !startedAt;
  // Het voorstel voor een stap op een ladder (StepProposalNotice.tsx): zelfde moment als Spieren voor de berg. Akkoord
  // geldt de volgende keer dat je de training opent; dit scherm houdt `sessionSwaps` en `workout` is één keer opgebouwd.
  const stepNotice = !readOnly && !startedAt && strength.stepProposal;
  // De ijkset (CalibrationNotice.tsx): eens per vier weken, alleen vóór de eerste handeling en nooit in een week met een
  // tocht of test. Akkoord zet een werkset bij de hoofdoefening en onthoudt de dag.
  const calSlot = !readOnly && !startedAt && !calLater && strength.calibration
    && !calibrationBlock({ date, lastAt: strength.calibratedAt, planned: plannedSessions, templates })
    ? calibrationSlot(workout) : undefined;
  const calEx = calSlot ? workout.find((w) => w.slot === calSlot) : undefined;
  const calibration = calState.phase !== 'open' ? { name: calState.name, phase: calState.phase, onAccept: async () => undefined, onLater: () => undefined }
    : calEx ? {
      name: calEx.name,
      phase: 'open' as const,
      onAccept: async () => {
        setCalState({ phase: 'added', name: calEx.name });
        addSetLogged(calEx.slot, 'work');
        setExercise(calEx.slot, withCalibrationTarget);
        try {
          await updateSettings({ strengthModel: { ...settings.strengthModel, calibratedAt: today } });
        } catch {
          setCalState({ phase: 'failed', name: calEx.name });
        }
      },
      onLater: () => setCalLater(true),
    } : undefined;
  const intro = <ForgeIntro templateId={template.id} today={today} date={date} program={program} preview={preview} readOnly={readOnly} mountainNotice={mountainNotice} stepNotice={stepNotice} calibration={calibration} capLine={capLine} legLine={legLine} legPanel={legPanel} />;
  const exerciseBlock = (ex: WorkoutExercise, i: number) => {
    const capRemoved = capRemovedFor(capped, ex, effSlots);
    const lines = stepsOn && ex.known ? ladderLines(exerciseOf(ex)) : undefined;
    return (
    <ExerciseBlock
              key={ex.slot}
              ex={ex}
              role={roleLabel(priorityOf(ex.slot))}
              first={paged || i === 0}
              paged={paged}
              readOnly={readOnly}
              column={column}
              note={strength.exerciseNotes[ex.exerciseId]}
              active={activeRef?.slot === ex.slot ? activeRef.rowId : undefined}
              field={dock?.slot === ex.slot ? dock : null}
              selected={dock?.slot === ex.slot && dockApi.selected}
              folded={!paged && !!folded[ex.slot] && exerciseComplete(ex)}
              profile={strength.profile}
              showPlates={strength.showPlates}
              lighterText={lighter[ex.slot] && stillOpen(ex, lighter[ex.slot]) ? adjustText(stillOpen(ex, lighter[ex.slot])!, exerciseOf(ex)) : undefined}
              noFitText={noFit[ex.slot] && !lighter[ex.slot] && !exerciseComplete(ex) && fitStillOpen(ex, noFit[ex.slot]) ? noFitLine(noFit[ex.slot], !!ownWeightsFor(strength.profile, exerciseOf(ex))) : undefined}
              heavyTip={heavyTip[ex.slot] && !lighter[ex.slot] && !exerciseComplete(ex) && fitStillOpen(ex, heavyTip[ex.slot]) ? heavyTip[ex.slot].text : undefined}
              rirAsValue={strength.rirPrefill === 'target'}
              swipeOn={swipeDeleteOn(settings)}
              undoText={undo?.slot === ex.slot ? `Set ${undo.label} verwijderd` : undefined}
              quickRirRow={quickRir?.slot === ex.slot && asksReserve(ex, quickRir.rowId, strength.enabled && strength.assumedCounts, strength.quickRirMode === 'vaker' ? 'vaker' : 'twijfel') ? quickRir.rowId : undefined}
              capText={capRemoved > 0 ? capRemovedLine(capRemoved) : undefined}
              standLine={stands.lineFor(ex, exerciseComplete(ex))}
              ladderLines={lines}
              bodyLoad={bodyLoadView(exerciseOf(ex), loadW, settings.weightForLoad)?.chip}
              ladderHint={lines ? ladderHint(exerciseOf(ex), ladderStates.get(ex.exerciseId)) : undefined}
              canStep={!!lines && !readOnly && canSwap(effSlots, ex)}
              bandOn={bandOn}
              cleanRow={cleanAsk?.slot === ex.slot && cleanOn ? cleanAsk.rowId : undefined}
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
            reference={reference}
            priorityOf={priorityOf}
            onClose={onClose}
            onMenu={() => sh.setWorkoutMenu(true)}
            onFinish={() => sh.setFinishing(true)}
            onLog={() => { sh.setLogOpen(true); setSeenAt(Date.now()); }}
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

      <ForgeDock api={dockApi} workout={workout} strength={strength} readOnly={readOnly} />

      <ForgeSheets
        sh={sh}
        template={template}
        plannedSessionId={plannedSessionId}
        scheduledDate={scheduledDate}
        date={date}
        program={program}
        initialVariant={initialVariant}
        readOnly={readOnly}
        preview={preview}
        strength={strength}
        bodyKg={bodyKg}
        workout={workout}
        effSlots={effSlots}
        forgeLog={forgeLog}
        noFit={noFit}
        setWorkout={setWorkout}
        setNoFit={setNoFit}
        setLighter={setLighter}
        setHeavyTip={setHeavyTip}
        startRest={startRest}
        markCause={markCause}
        setExercise={setExercise}
        take={take}
        removeSetLogged={removeSetLogged}
        addSetLogged={addSetLogged}
        tickAll={tickAll}
        swap={swap}
        cleanOn={cleanOn}
        chooseClean={chooseClean}
        removeAddedExercise={removeAddedExercise}
        undoStepSwap={undoStepSwap}
        saveStrength={saveStrength}
        startedAt={startedAt}
        pauses={pauses}
        paused={paused}
        togglePause={togglePause}
        awayMs={awayMs}
        setAwayMs={setAwayMs}
        answerBreak={answerBreak}
        later={later}
        dropDraft={dropDraft}
        onClose={onClose}
      />
      {bodyLoadSlot && (() => {
        const ex = workout.find((w) => w.slot === bodyLoadSlot);
        const view = ex ? bodyLoadView(exerciseOf(ex), loadW, settings.weightForLoad) : undefined;
        return ex && view ? <BodyLoadSheet name={ex.name} view={view} onAdjust={() => setWeightOpen(true)} onClose={() => setBodyLoadSlot(null)} /> : null;
      })()}
      {weightOpen && <WeightSheet onClose={() => setWeightOpen(false)} />}
    </Portal>
  );
}
