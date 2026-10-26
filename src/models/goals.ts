// ASCEND — generic goal domain models (Technical Architecture v0.3.1
// REVISED, "Foundation" phase). Replaces Objective/MilestoneDefinition as
// the live source of truth — see storage/goalMigration.ts. The legacy
// Objective/MilestoneProgress types (models/objectives.ts) are kept,
// unchanged, purely so an export made before this migration still opens.
//
// MilestoneRequirement is reused as-is from models/objectives.ts — its
// vocabulary was never the problem, only its exclusive attachment to the
// old Objective type was (v0.3.1 REVISED).

import type { MeasuredValue } from './units';
import type { MilestoneRequirement, MilestoneStatus } from './objectives';

export type TerrainContext =
  | 'road' | 'flat_trail' | 'uneven_trail' | 'mountain' | 'technical' // running/hiking
  | 'gravel' | 'mtb_trail' | 'indoor'                                  // cycling (road shared)
  | 'snow'                                                             // a snow hike (tochten, models/leave.ts)
  | 'unknown';

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';

// Requirement scope — over what span a GoalRequirement's target is measured
// (Technical Architecture v0.3.6 §E1, correcting v0.3.1 REVISED's original
// lowercase casing to what was explicitly re-confirmed there).
export type RequirementScope = 'SINGLE_EVENT' | 'PER_DAY' | 'TOTAL_EVENT' | 'CONSECUTIVE_DAYS';

export interface GoalRequirement {
  id: string;
  // 'eventDays' (goal-flow redesign, Fase 1): the total number of
  // walking/riding days a route takes, scope TOTAL_EVENT, unit 'days'. What
  // turns route totals (600 km, 30.000 m D+) into a typical day. A
  // requirement of this kind WITHOUT a target means "multi-day, day count
  // not filled in yet" — route totals are then never compared against a
  // single session (engine/demand.ts).
  kind: 'distance' | 'elevationGain' | 'elevationLoss' | 'duration' | 'targetTime'
      | 'packWeight' | 'consecutiveDays' | 'eventDays' | 'manual';
  scope: RequirementScope;
  target?: MeasuredValue; // absent for 'manual'
  // Free-form, deliberately a plain string rather than a closed union
  // (Technical Architecture v0.3.6 §E1) — mirrors ActivityModality
  // (models/training.ts): the set of disciplines is content, not domain
  // structure, so a new one never needs a model change.
  discipline?: string;
  context?: TerrainContext; // optional context layer, never a requirement kind of its own
}

// How a multi-day goal is actually undertaken (goal-flow redesign, Fase 1):
// one unbroken push from start to finish, or a route split into separate
// stages with rest/home time in between. Absent = a single-day goal (a
// race, a day hike) or a goal created before this field existed. Shapes
// how route totals turn into a typical day and whether the longest stage
// equals the whole trip (engine/goalRoute.ts).
export type GoalExecution = 'continuous' | 'stages';

// De soort van een doel (ronde 2a, docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md).
// De soorten zelf, met hun getallen en bronnen, staan als gegevens in data/goalKinds.ts.
export const GOAL_KIND_IDS = [
  'trek_hut', 'trek_tent', 'day_hike', 'mountaineering', 'run_race', 'trail', 'bike', 'triathlon', 'stronger', 'fit',
] as const;
export type GoalKindId = (typeof GOAL_KIND_IDS)[number];

// Hoe belangrijk een doel is. Top: het hoofddoel, de opbouw telt terug met een volle afbouw.
// Voortop: belangrijk, met een korte afbouw. Verkenning: meedoen als training, zonder afbouw.
// "Alleen volgen" bestaat niet meer als aparte stand.
export const GOAL_PRIORITIES = ['top', 'voortop', 'verkenning'] as const;
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

// Wat de gebruiker over zijn doel invulde. Alles is optioneel; welke velden bij een
// soort horen staat in data/goalKinds.ts. Een veld dat niet klopt wordt bij het lezen
// weggelaten (storage/migrations.ts#readGoalDetails).
export interface GoalDetails {
  variant?: string; // bijvoorbeeld '10k', 'ultra', 'cols'
  distanceKm?: number; // totaal van het doel
  gainM?: number; // D+ totaal
  lossM?: number; // D- totaal
  days?: number; // aantal dagen van een meerdaags doel
  packKg?: number; // rugzak
  shelter?: 'hut' | 'tent';
  highestPointM?: number;
  sleepingPointM?: number;
  expectedMinutes?: number; // verwachte tijd van de doeldag of de wedstrijd
  targetMinutes?: number; // doeltijd (hardlopen)
  baggageKg?: number; // bagage op de fiets
  homeDaysInRow?: number; // hoeveel dagen achter elkaar je thuis oefent (overschrijft de soort)
  strengthTargets?: { exercise: string; kg: number; reps: number }[];
  weeklyMinutes?: number; // fit blijven: eigen doel, standaard de richtlijn
  strengthDays?: number;
}

export interface TrainingGoalBase {
  id: string;
  name: string;
  requirements: GoalRequirement[];
  execution?: GoalExecution;
  // The goal's place in the plan (engine/raceBlock.ts): 'secondary' (a
  // tussendoel that gets its own block), or 'track' (only followed). The
  // main goal is the one with the ascent ladder; unset means automatic.
  // Oud veld, alleen nog gelezen voor terugwaartse compatibiliteit. Nieuw is `priority`;
  // storage/migrations.ts#deriveGoalKind zet het ene om in het andere.
  planRole?: 'main' | 'secondary' | 'track';
  kind?: GoalKindId;
  details?: GoalDetails;
  priority?: GoalPriority;
  // Alleen true als jij zelf in de app een label koos (Rol in je plan, of een voorstel van ASCEND
  // waar je Akkoord op gaf). Een Verkenning krijgt de wedstrijd alleen op zijn dag in de planning
  // als dit gezet is; een doel dat de overzetting van het oude "alleen volgen" tot Verkenning
  // maakte, heeft het niet en blijft zoals het was: geen anker en geen blok. De migratie zet het
  // nooit. Optioneel.
  priorityChosen?: boolean;
  // Een eigen, kortere afbouw in dagen dan het advies van de soort en het label. Alleen gezet
  // als een botsing met een ander doel de afbouw inkortte en je Akkoord gaf
  // (engine/goalConflicts.ts). Optioneel; wie hem niet heeft krijgt het advies.
  taperDays?: number;
  // "Toch allebei": de paren van datums ("eerste|tweede") waarmee je de botsing bewust aanvaardde
  // (engine/goalConflicts.ts). Verschuift een van beide doelen, dan is het een ander paar en
  // komt de melding terug. Optioneel.
  conflictAccepted?: string[];
  createdAt: string;
  updatedAt: string;
}

// Discriminated union — an ACTIVE goal cannot be constructed or stored
// without a targetDate; enforced by the compiler at every call site.
export type TrainingGoal =
  | (TrainingGoalBase & { status: 'active'; targetDate: string })
  | (TrainingGoalBase & { status: 'paused' | 'completed' | 'archived'; targetDate?: string });

// --- Generic achievement ladder — replaces Objective.milestones -----------

export interface GoalMilestone {
  id: string;    // STABLE — semantic slug, never order-derived
  goalId: string;
  order: number; // DISPLAY order only; identity lives in `id`
  title: string;
  requirement: MilestoneRequirement;
}

export interface GoalAchievementTrack {
  goalId: string;
  milestones: GoalMilestone[];
}

// Append-only — identical semantics to the legacy MilestoneProgress.
export interface GoalMilestoneProgress {
  id: string;
  goalId: string;
  milestoneId: string;
  clearedDate: string;
  sourceSessionLogId?: string;
  note?: string;
}

export type { MilestoneStatus };
