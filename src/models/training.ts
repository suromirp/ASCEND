// ASCEND — Training domain models
//
// Architectural rule (spec §15): a workout definition (SessionTemplate) is
// never bound directly to a calendar day. A PlannedSession schedules a
// template onto a date. A SessionLog records what actually happened.
// Changing the plan must never rewrite history — SessionLog rows are
// append-only and are never mutated once created. One exception, at the
// owner's explicit request: a log made by hand takes over the measured numbers
// of the watch (`manualMeasured` keeps the hand-made ones, so it can be undone;
// docs/beslissingen/2026-10-22-garmin-is-leidend.md). A second, of the same kind:
// a watch activity cut at the end or the beginning (`trim` keeps the numbers it
// replaced; docs/beslissingen/2026-10-24-activiteit-inkorten.md). A third: a log
// tied to an intervals.icu activity follows a correction made there (`sourceSync`
// keeps the numbers it replaced; docs/beslissingen/2026-10-25-correcties-uit-intervals.md).

import type { SportId } from '../data/sports';
import type { SessionStressProfile } from './prescription';
import type { PainReport } from './checkIn';
import type { PlannedLeaveMark } from './leave';
import type { ActivityDetail, RunDynamics } from './activityDetail';
import type { ForgeEvent } from './forgeLog';
import type { RunDetail } from './runDetail';

export type MetricSource = 'manual' | 'garmin' | 'health-connect' | 'macrofactor' | 'import';

export type SessionType = 'strength' | 'cardio' | 'hiking' | 'recovery' | 'adventure';

export type ExercisePriority = 'core' | 'accessory' | 'optional';

export interface ExercisePrescription {
  id: string;
  exerciseName: string;
  sets: number;
  reps: string; // e.g. "8" or "8-10"
  targetWeightKg?: number;
  rpe?: number;
  priority: ExercisePriority;
  notes?: string;
  // Per set the range and reps in reserve, from a strength program read in
  // from MacroFactor (engine/macrofactorProgram.ts). Absent: `sets` x `reps`.
  setTargets?: SetTarget[];
}

export interface SetTarget {
  repsLow: number;
  repsHigh: number;
  rir: number;
  // A set to failure ("9+"): at least repsLow, nothing left.
  failure?: boolean;
  // Zonder spotter wordt een set tot falen een open set met reserve: "7+ met 1 over", minstens
  // repsLow en dan stoppen met `rir` over (engine/spotter.ts). Alleen voor de woorden; rekenen gaat
  // als een gewone set van repsLow.
  open?: boolean;
  restSec?: number;
}

export interface DurationVariants {
  full: number;
  short?: number;
  minimum?: number;
}

export interface CardioTarget {
  zone?: string; // e.g. "Zone 2"
  targetDurationMin?: number;
  targetDistanceKm?: number;
}

export interface OutdoorTarget {
  targetDistanceKm?: number;
  targetElevationM?: number;
  backpackWeightKg?: number;
}

// Some sessions (Easy Run, Bergconditie) don't have a single fixed duration
// — they follow a week-by-week build within a training block (wennen →
// opbouwen → zwaarste week → deload). `weekInPhase` matches
// ResolvedProgramPosition.weekInPhase from utils/dates#resolveProgramWeek.
export interface WeeklyProgressionStep {
  weekInPhase: number;
  targetMinutes: number;
  note?: string; // e.g. "Wennen", "Deload"
  // Set for a step that belongs to one phase only (the mountain hike's
  // D+/backpack ladder, engine/programLayout.ts#progressionTarget). Those
  // match the exact week in that phase and are never scaled per cycle.
  phaseId?: string;
  // What the session asks for besides time, shown with the target.
  elevationGainM?: number;
  backpackKg?: number;
}

// A single mobility item — either a dynamic warm-up move (before training)
// or a static stretch (after training, or in the standalone problem-area
// library). durationSec is per side when the stretch is one-sided.
export interface Stretch {
  name: string;
  durationSec?: number;
  note?: string;
  // A short (~1-2 min), demonstration-only reference video — never a
  // required watch, just an optional "hoe ziet dit eruit" link.
  videoUrl?: string;
}

// What a template is for in the planning rules (engine/templateRoles.ts). A rule
// asks for a role instead of listing template ids, so a new template can take
// part by carrying the role. Absent on a stored template = the default roles of
// its id (data/templateRoles.ts), so old backups and old stored templates work.
export type TemplateRole =
  | 'long' // the one long session of a week (long run, mountain hike)
  | 'key' // the session the week review counts as the key one
  | 'test' // a test run
  | 'race' // a race
  | 'easy_pace' // run at the easy pace
  | 'hard_run' // counts as a hard run for the order of the day
  | 'hard_load' // counts as hard in the load picture
  | 'hard_effort' // counts as hard effort in the week intensity
  | 'ask_legs' // asks how the legs feel before it starts
  | 'before_race_out' // comes out of the days before a race
  | 'walked_down' // the descent is walked, not run
  | 'blocks' // has blocks (tempo, intervals) whose pace is compared in the run insight
  | 'extra'; // an extra session the planner may add to a week

// The reusable definition of a workout — "what" a session is, independent of
// when it happens.
export interface SessionTemplate {
  id: string;
  name: string;
  type: SessionType;
  // Which endurance sport this is, when type alone doesn't say (a cycling
  // session is type 'cardio' like a run). Absent = derived from type
  // (engine/sports.ts#templateSport): cardio -> running, hiking -> hiking.
  sport?: SportId;
  // See TemplateRole. Optional: absent falls back to the defaults of the id.
  roles?: TemplateRole[];
  focus?: string; // e.g. "Borst • Rug • Schouders"
  durationVariants: DurationVariants;
  weeklyProgression?: WeeklyProgressionStep[];
  exercises?: ExercisePrescription[];
  cardioTarget?: CardioTarget;
  outdoorTarget?: OutdoorTarget;
  notes?: string;
  defaultDayOfWeek?: number; // 1 (Monday) – 7 (Sunday), used only for seeding
  // Dynamic warm-up (same routine for every training day) and a static
  // cool-down tailored to this session's muscle groups. Both are reference
  // lists shown in ExerciseLogger — logging a session never requires
  // stretch data, they're purely informational.
  warmup?: Stretch[];
  cooldown?: Stretch[];
  // The sensible default stress profile for this workout shape (Technical
  // Architecture v0.3.1 REVISED, Phase 3 — replaces hardcoded isLegHeavy).
  // A TrainingPrescription may layer a partial override on top for one
  // specific occurrence; engine/stressProfile.ts#resolveEffectiveStressProfile
  // is the only place that layering happens. Absent on a template falls
  // back to legacyIsLegHeavyToStressProfile(templateId) — kept only as a
  // bridge for any template that hasn't been backfilled.
  baseStressProfile?: SessionStressProfile;
  // Time-budget scheduling redesign — an escape hatch for a same-day
  // pairing verdict that doesn't follow from load categories alone (the
  // categorical rule in engine/concurrentTraining.ts is the default; this
  // overrides it for a specific named pair). Subsumes the old hardcoded
  // INTENTIONAL_BACK_TO_BACK_TEMPLATE_IDS set in engine/scheduler.ts (the
  // deliberate Saturday hill-intervals + Sunday long-run exception) as
  // data instead of code, generalized to same-day pairing too. Only ever
  // read for THIS template against the named other one — never implies
  // anything about how the other template treats pairing with this one;
  // callers that need the relationship checked either way look up both
  // sides explicitly.
  pairingOverride?: { withTemplateId: string; verdict: 'prefer' | 'avoid' }[];
}

export type PlannedSessionStatus = 'planned' | 'moved' | 'skipped' | 'optional';

// A template scheduled onto a specific calendar date. Completion is derived
// (a SessionLog exists referencing this id) rather than stored as a flag, so
// the plan and the historical record can never drift out of sync.
export interface PlannedSession {
  id: string;
  templateId: string;
  scheduledDate: string; // ISO date (yyyy-mm-dd)
  weekStartDate: string; // ISO date of the Monday of that week
  status: PlannedSessionStatus;
  movedFromDate?: string;
  order: number;
  // A fixed length for this one session instead of its week's progression,
  // e.g. a long run caught up in a week that already has its own
  // (engine/adviceEngine.ts). Optional, additive: older data has none.
  plannedMinutes?: number;
  // Set when the race block swapped this session to another day so a tempo
  // run or test keeps its distance from heavy legs (engine/raceBlock.ts): so
  // it can be swapped back when the run moves away. `short`: the minutes were
  // set to the short version for it. Optional, additive.
  raceBlock?: { pair: string; from: string; to: string; short?: boolean };
  // Set when the race block made this Saturday session a quiet run with
  // strides because the week has only three runs (engine/raceBlock.ts): so it
  // can become the quality session again when a fourth run joins, or when the
  // goal goes. Optional, additive.
  blockQuiet?: true;
  // You placed this session yourself, or accepted a proposal that moves it or
  // shows it here. The automatic planning never moves, swaps, shortens or
  // retemplates it (docs/onderzoek/Planning op een lijn.md). Optional, additive.
  lock?: PlanLock;
  // Planned to walk with poles. Optional, additive; without it the last log
  // of the same training decides (engine/legFatigue.ts).
  poles?: boolean;
  // A period of free days or a holiday placed, moved or let go of this
  // session (models/leave.ts, engine/leave.ts). Optional, additive.
  leave?: PlannedLeaveMark;
  // The recovery after a goal (rule AFTER-GOAL, engine/weekValidator.ts) made this hard training an
  // easy run: the template it had and the date of the goal. When that recovery is gone or has moved,
  // the check puts the template back. Optional, additive.
  afterGoal?: { templateId: string; date: string };
  // Dit is een gemiste training die je hebt ingehaald: de rij van toen (nu overgeslagen) en zijn dag.
  // Alleen een verwijzing, de rij van toen blijft staan (engine/catchUp.ts). Optional, additive.
  catchUp?: { fromId: string; fromDate: string };
}

export interface PlanLock {
  by: 'user' | 'proposal';
  proposalId?: string;
  at: string;
}

export type SessionVariant = 'full' | 'short' | 'minimum' | 'custom';

export type SetKind = 'warmup' | 'work';

export interface SetLog {
  reps: number;
  weightKg?: number;
  rpe?: number;
  // Reps in reserve after this set: how many were left (0 = to failure), 0 to 10.
  // Absent when unknown.
  rir?: number;
  // A warm-up set or a working set. Absent means a working set, so every log
  // from before this field reads as it always did.
  kind?: SetKind;
  // True when the reps in reserve were not measured: the set was ticked without
  // touching the field and `rir` is the aim of the plan, not what you felt.
  // Absent means measured (or no `rir` at all), so every log from before this
  // field reads as it always did. Decision: docs/beslissingen/2026-10-25-bijsturen-in-forge.md.
  rirAssumed?: boolean;
}

export interface ExerciseSetLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

// What the session was actually done on/in — a treadmill run and an
// outdoor run (or an incline treadmill and a real hike) aren't
// interchangeable: GPS-based D+/D− only means something outdoors, and the
// incline % estimate only means something on a treadmill. Kept as a coarse
// tag alongside the richer `modality` below (derived from the chosen
// modality's own metadata) since it's still the simplest thing for a
// History line to show at a glance.
export type TrainingEnvironment = 'treadmill' | 'outdoor';

// Which specific way of training this was — a free-form key into
// data/modalities.ts (e.g. 'run_outdoor', 'stairmaster', 'incline_treadmill').
// Deliberately a plain string, not a TypeScript union: the set of
// modalities is content (data/modalities.ts), not domain structure, so
// adding one shouldn't require a model change. One shared metric shape
// with this tag is used for every modality rather than a separate
// interface per activity (running/cycling/stairmaster/...) — same fields
// (distance, HR, cadence, ...) apply loosely across most of them, and the
// UI only shows what's relevant for the selected modality.
export type ActivityModality = string;

// How the session's target/intensity was decided — ASCEND's own plan, the
// Daily Suggested Workout shown on the Garmin watch (selected manually;
// there is no supported API to read it automatically), or a free session
// with no prescribed target at all.
export type GuidanceMode = 'ascend_guided' | 'garmin_suggested' | 'free';

export interface CardioMetric {
  durationMinutes: number;
  distanceKm?: number;
  elevationGainM?: number; // e.g. incline treadmill work counts toward D+ conditioning
  // Descent, when a wearable measured it (imported activities). Optional.
  elevationLossM?: number;
  estimatedElevation?: boolean; // see OutdoorMetric.estimatedElevation
  environment?: TrainingEnvironment;
  modality?: ActivityModality;
  guidanceMode?: GuidanceMode;
  garminSuggestedType?: string; // e.g. 'Base', 'Tempo' — only when guidanceMode === 'garmin_suggested'
  avgHeartRate?: number;
  maxHeartRate?: number; // highest heart rate of the whole activity (imported). Optional.
  hrZones?: number[];
  paceMinPerKm?: number;
  cadence?: number;
  power?: number;
  // The averages of the running dynamics, when a device measured them
  // (models/activityDetail.ts). Optional, additive.
  dynamics?: RunDynamics;
  source: MetricSource;
}

export interface OutdoorMetric {
  durationMinutes: number;
  distanceKm?: number;
  elevationGainM?: number;
  elevationLossM?: number;
  environment?: TrainingEnvironment;
  modality?: ActivityModality;
  guidanceMode?: GuidanceMode;
  garminSuggestedType?: string;
  // True when elevationGainM came from the incline-treadmill estimate
  // (distance × incline%), not a GPS/altimeter measurement — a treadmill
  // doesn't actually change your altitude, so Total Ascent from a wearable
  // isn't trustworthy there. History/readiness label this distinctly
  // rather than presenting it as measured D+.
  estimatedElevation?: boolean;
  avgHeartRate?: number;
  maxHeartRate?: number; // highest heart rate of the whole activity (imported). Optional.
  cadence?: number;
  power?: number; // e.g. Friday's Easy Bike fallback
  // The averages of the running dynamics (models/activityDetail.ts). Optional, additive.
  dynamics?: RunDynamics;
  maxElevationM?: number;
  backpackWeightKg?: number;
  // Walked with poles. Lowers the descent load in the leg fatigue index
  // (engine/legFatigue.ts). Optional, additive: older logs have none.
  poles?: boolean;
  terrain?: string;
  weatherNotes?: string;
  technicalDifficulty?: string;
  // StairMaster/Stepmill only — a machine's own step/floor count and
  // reported vertical. Never merged into elevationGainM: it's not a GPS or
  // barometric measurement of real outdoor D+, just a same-caveat cousin
  // of the treadmill incline estimate above.
  steps?: number;
  machineVerticalM?: number;
  source: MetricSource;
}

// The numbers a watch measures, as they were typed in by hand before the
// watch's own numbers replaced them (engine/watchAlign.ts). Kept on the log, so
// nothing is lost and "Terugzetten" can put them back. A key is present only
// for a field the watch changed or added; `null` means: there was no value, so
// putting back means taking the field away again.
export type MeasuredField = 'durationMinutes' | 'distanceKm' | 'elevationGainM' | 'elevationLossM' | 'avgHeartRate' | 'maxHeartRate' | 'cadence' | 'estimatedElevation';

export interface ManualMeasured {
  // When the watch's numbers took over (ISO date-time).
  at: string;
  values: Partial<Record<MeasuredField, number | boolean | null>>;
  // The block of the log that holds the measured fields. `blockAdded`: the log
  // had no such block, the replacement made it (putting back removes it again).
  // Absent on a strength log that MacroFactor took over (see `strength`).
  block?: 'cardioData' | 'outdoorData';
  blockAdded?: true;
  // The source the block had before ('manual' unless the log said otherwise).
  blockSource?: MetricSource;
  // The milestones this replacement cleared (GoalMilestoneProgress ids): putting
  // back takes exactly those away again, the way removing a log does.
  clearedProgressIds?: string[];
  // "MacroFactor is leidend voor kracht" (engine/macrofactorLead.ts,
  // docs/beslissingen/2026-10-22-macrofactor-leidend-voor-kracht.md): a strength
  // log made by hand that took over the numbers MacroFactor measured. The
  // duration goes in `values.durationMinutes`; the rest is here. A key is
  // present only for a field that was replaced or added; `null`: there was no
  // value, so putting back takes the field away again.
  strength?: ManualStrength;
}

export interface ManualStrength {
  // The id of the MacroFactor workout that took over: it is never offered again.
  workoutId: string;
  strengthData?: ExerciseSetLog[] | null;
  strengthRir?: number | null;
  // The log had no id and source of its own: the workout's id and source
  // 'macrofactor' were put on it, and this is the source it had.
  tied?: { source: MetricSource };
}

// The numbers a trim replaced (engine/trimLog.ts,
// docs/beslissingen/2026-10-24-activiteit-inkorten.md): a watch activity cut at
// the end and/or the beginning, for example because the watch stayed on during a
// drive home. `original` holds exactly the fields the trim overwrote, as they
// were, so "Inkorten ongedaan maken" gives the log back exactly. A field the log
// did not have is never added by a trim, so there is no "was empty" marker.
export type TrimField = 'distanceKm' | 'elevationGainM' | 'elevationLossM' | 'avgHeartRate' | 'maxHeartRate';

export interface SessionTrim {
  // When it was trimmed (ISO date-time).
  at: string;
  // What was kept, in seconds on the clock of the activity (pauses included),
  // and how long that clock ran in all.
  startSec: number;
  endSec: number;
  totalSec: number;
  // The block of the log that holds the measured fields.
  block: 'cardioData' | 'outdoorData';
  original: {
    // SessionLog.durationMinutes before the trim.
    durationMinutes: number;
    // The duration of the block, only when it was not the same number.
    blockDurationMinutes?: number;
    // The profile that was replaced or dropped; absent: the log had none and a
    // trim does not make one.
    detail?: ActivityDetail;
  } & Partial<Record<TrimField, number>>;
}

// Corrections made at the source (engine/sourceCorrection.ts,
// docs/beslissingen/2026-10-25-correcties-uit-intervals.md): a log that is tied to a
// watch activity follows the activity when it is corrected at intervals.icu (a stretch
// cut off, the climb corrected). `seen` is the fingerprint: the numbers the source gave
// when the log was tied or last looked at, so a change at the source can be told from
// something ASCEND did itself. `updated` keeps the log's numbers from before the last
// update, so "Vorige getallen terugzetten" gives them back. `offered` holds the new
// numbers of a log that was cut in ASCEND: those are never written over the cut by
// themselves, the log sheet offers them. Optional, additive.
export type SourceField = Exclude<MeasuredField, 'estimatedElevation'>;
export type SourceNumbers = Partial<Record<SourceField, number>>;

export interface SourceUpdate {
  // When the numbers were updated (ISO date-time).
  at: string;
  // The block of the log that holds the measured fields.
  block: 'cardioData' | 'outdoorData';
  // The log's numbers before the update, only for the fields that were replaced;
  // `null`: there was no value, so putting back takes the field away again.
  previous: Partial<Record<SourceField, number | null>>;
  // The duration of the block, only when it was not the same number as the log's.
  blockDurationMinutes?: number;
}

export interface SourceSync {
  // An empty `seen` counts as missing: the next round makes a new baseline.
  seen: SourceNumbers;
  // The activity the fingerprint was made for; another id reads as a new baseline.
  // Optional, additive (a fingerprint from before it has none and is trusted).
  externalId?: string;
  updated?: SourceUpdate;
  offered?: SourceNumbers;
}

// The record of what actually happened. Corrections are made by adding a new
// log, not mutating this one (exceptions: `manualMeasured`, `trim` and
// `sourceSync`, see above).
export interface SessionLog {
  id: string;
  plannedSessionId?: string; // absent for ad-hoc / unplanned sessions
  templateId: string;
  type: SessionType;
  // Fase 4 — the endurance sport this was, when type alone doesn't say (a
  // ride is type 'cardio' like a run). Optional: older logs are read via
  // their modality (engine/sports.ts#logSport).
  sport?: SportId;
  completedDate: string; // ISO date
  completedAt: string; // ISO datetime
  variant: SessionVariant;
  durationMinutes: number;
  rpe?: number;
  notes?: string;
  strengthData?: ExerciseSetLog[];
  cardioData?: CardioMetric;
  outdoorData?: OutdoorMetric;
  // Subjective "how did this feel vs. normal" — mainly used to catch
  // Saturday's hill/incline intervals being dosed too hard: two 'worse'
  // lange-duurloop sessions in a row afterward is a signal to lighten
  // Saturday (engine/recoveryCheck.ts). Optional everywhere; never
  // required, since MacroFactor's own quick-complete flow stays low-friction.
  subjectiveFeel?: SubjectiveFeel;
  // Where it hurt during or after (data/bodyAreas.ts, free text allowed).
  // Optional, additive: older logs and backups simply don't have it.
  painAreas?: string[];
  // Pain on a spot with a score (models/checkIn.ts, engine/pain.ts). The
  // areas above stay filled for older readers. Optional, additive.
  painReports?: PainReport[];
  // What the hard part of an interval, hill or tempo session actually was
  // (engine/workoutDetails.ts). Optional, additive: older logs and
  // backups simply don't have it.
  workout?: WorkoutDetails;
  // Strength: reps left in the hardest (leg) sets, 0 to 4 (RIR). Optional.
  strengthRir?: number;
  // The gym profile (GymProfile.id) this strength training was done in, set when the log is
  // made: in Forge the active profile, from a MacroFactor workout the profile its name ends
  // on (" @ <name>"). Absent on older logs and where the gym is not known. Optional, additive;
  // never written onto a log that exists (docs/beslissingen/2026-10-26-gewichten-per-toestel.md).
  gymProfileId?: string;
  // Het verloop van een krachttraining in Forge: per moment welke set van wat naar wat ging en
  // waardoor (engine/forgeLog.ts). Alleen toegevoegd bij het maken van het log, nooit op een log dat
  // al bestaat. Optional, additive; the backup schema number does not move
  // (docs/beslissingen/2026-10-28-forge-logboek.md).
  forgeLog?: ForgeEvent[];
  // A hard run or test: how your legs felt at the warm-up, held against the
  // leg index (engine/learning.ts). Optional, additive.
  legsAtStart?: 'fris' | 'normaal' | 'zwaar';
  // The id of this activity at the place it came from (engine/activityImport.ts),
  // so the same activity is never imported twice. Absent on manual logs and
  // on every log made before imports existed. Optional, additive.
  externalId?: string;
  // A log made by hand that took over the watch's numbers: the hand-made ones
  // as they were. Optional, additive; present only on such a log.
  manualMeasured?: ManualMeasured;
  // A new log from a MacroFactor workout whose duration in the file was too long
  // (a clock left running) and was set by hand: the minutes the file said, kept
  // so it can be seen again. Optional, additive; no migration
  // (docs/beslissingen/2026-10-29-mf-training-te-lang.md).
  fileDurationMinutes?: number;
  // A watch activity cut at the end and/or the beginning: the numbers it
  // replaced, as they were. Optional, additive; present only on such a log.
  trim?: SessionTrim;
  // The fingerprint of the source numbers and the last update from the source
  // (see SourceSync). Optional, additive; only on a log tied to an intervals.icu activity.
  sourceSync?: SourceSync;
  // The compact profile of a run or tocht: 48 pieces, the climbs and descents,
  // the conditions (models/activityDetail.ts). Derived from the watch's series
  // and fetched again from there if lost, so it is not part of the "never
  // rewrite" promise: it is added after the log is made, only to a log that has
  // none. Optional, additive; the backup schema number does not move
  // (docs/beslissingen/2026-10-22-loopinzicht.md).
  detail?: ActivityDetail;
  // Only on a test run: the fastest unbroken stretch of the test distance, read from
  // the watch's series when the log was opened or synced. Derived, so it is added once
  // after the log is made and never changes a measured number; the totals stay as they
  // were (engine/bestEffort.ts, docs/beslissingen/2026-10-27-testloop-lezen.md).
  // Optional, additive; the backup schema number does not move.
  bestEffort?: BestEffort;
  // Only on a test run whose series gave no usable best 5 km (treadmill, holes, a distance
  // that does not match): the totals it was tried for, so the series is not fetched again
  // for the same numbers (engine/bestEffort.ts#effortFingerprint). Derived, optional.
  bestEffortTried?: string;
  // A new reading of an accepted best effort that was read before stops were told apart
  // (`bestEffort.v` below 2). The old one keeps counting; this one is only a candidate, v 2 and never
  // accepted, until your Akkoord or until counting it changes no pace (engine/testJudgment.ts#effortOffer,
  // docs/beslissingen/2026-10-27-stilstaan-bij-de-testloop-aanvulling.md). Derived, optional.
  bestEffortReread?: BestEffort;
  // The kilometres and laps of a run or tocht, worked out from its full series
  // (models/runDetail.ts, engine/runDetail.ts). Derived and append-only like `detail` and
  // `bestEffort`: added once, tied to the totals it was read for, never a change to a
  // measured number; a broken one is dropped by the migration and the log stays whole.
  // Optional, additive; it travels in the backup
  // (docs/beslissingen/2026-10-27-run-in-detail-gegevens.md).
  runDetail?: RunDetail;
  // The totals a run's series gave no usable `runDetail` for, so they are not fetched again
  // for the same numbers (engine/runDetail.ts#runDetailFingerprint). Derived, optional.
  runDetailTried?: string;
  source: MetricSource;
}

// The fastest `km` of a run, in minutes.
export interface BestEffort {
  km: number;
  minutes: number;
  // The totals of the log it was read for (its fingerprint): after a correction at the
  // source the totals no longer match and the best effort is ignored until it is read again.
  wholeKm?: number;
  wholeMinutes?: number;
  // True once the test counts with this stretch. Set at once when that changes no pace
  // (or the test is brand new), otherwise only after your Akkoord in the log sheet.
  accepted?: boolean;
  // How it was read (engine/bestEffort.ts#EFFORT_VERSION). Without it (read before stops were
  // told apart) an unaccepted one is read once more from the series.
  v?: number;
  // Stops (a traffic light) inside the stretch and the seconds stood still, which do not count
  // in `minutes`. Only when stops are skipped (AppSettings.testStops); optional, additive
  // (docs/beslissingen/2026-10-27-stilstaan-bij-de-testloop.md).
  stops?: number;
  stoppedSec?: number;
  // The minutes of the reading this one replaced or is a candidate for, so a changed time can be said.
  prevMinutes?: number;
}

export interface WorkoutDetails {
  reps?: number;
  repSeconds?: number; // length of one hard repeat
  blockMinutes?: number; // a continuous hard block (tempo, the steady end)
  peakHeartRate?: number;
  blockHeartRate?: number; // average heart rate in the block
}

export type SubjectiveFeel = 'better' | 'normal' | 'worse';
