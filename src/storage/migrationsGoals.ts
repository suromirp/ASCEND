// Migratiestappen voor doelen: soort, gegevens en belangrijkheid.

import { GOAL_KIND_IDS, GOAL_PRIORITIES, type GoalDetails, type GoalKindId, type GoalPriority, type GoalRequirement, type TrainingGoal } from '../models/goals';
import { goalPlanRole, isRaceGoal } from '../engine/raceBlock';
import { mainGoal } from '../engine/mainGoal';
import { variantOf } from '../data/goalKinds';
import type { RoutePlan } from '../models/routePlan';

// --- soort, gegevens en belangrijkheid van een doel (ronde 2a) ---------------------------
// `TrainingGoal.kind`, `.details` en `.priority` zijn optioneel en komen er bij het lezen bij
// (een back-up van voor deze ronde, en het opstarten op het toestel); er is geen
// schemaversie voor nodig. Het oude `planRole` blijft staan en wordt defensief gelezen.
// - Het hoofddoel met mijlpalen (de GR5) wordt trek_tent of trek_hut, afhankelijk van of er
//   in het etappeplan een nacht in tent of bivak gekozen is, met de huidige getallen als
//   details en priority 'top'. De dagen achter elkaar blijven op 2 (zoals de meter nu rekent),
//   zodat het getal en de planning gelijk blijven.
// - Een hardloopdoel wordt run_race, met priority uit planRole.
// - "Alleen volgen" (planRole 'track') bestaat niet meer: het wordt priority 'verkenning'.

const DETAIL_NUMBERS = ['distanceKm', 'gainM', 'lossM', 'days', 'packKg', 'highestPointM', 'sleepingPointM', 'expectedMinutes', 'targetMinutes', 'baggageKg', 'homeDaysInRow', 'weeklyMinutes', 'strengthDays', 'timeLimitMinutes', 'cutoffMinutes'] as const;

// Leest de ingevulde gegevens. Een veld dat geen getal boven nul is, of een tekst die niet
// bij het veld hoort, valt weg; de rest blijft.
export function readGoalDetails(raw: unknown): GoalDetails | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  // Altijd in dezelfde volgorde, zodat lezen een opgeslagen doel niet verandert.
  const out: GoalDetails = {};
  if (typeof r.variant === 'string' && r.variant.length > 0 && r.variant.length <= 40) out.variant = r.variant;
  if (r.shelter === 'hut' || r.shelter === 'tent') out.shelter = r.shelter;
  for (const key of DETAIL_NUMBERS) {
    const x = r[key];
    if (typeof x === 'number' && Number.isFinite(x) && x > 0) out[key] = x;
  }
  // Een cutoff bestaat alleen bij een trail (ultra); de soort staat hier niet, maar alleen een trail kent
  // de varianten kort en ultra, dus bij elke andere variant valt een cutoff weg.
  if (out.variant !== undefined && out.variant !== 'ultra') delete out.cutoffMinutes;
  if (Array.isArray(r.strengthTargets)) {
    const list = r.strengthTargets.flatMap((t) => {
      if (!t || typeof t !== 'object') return [];
      const { exercise, kg, reps } = t as Record<string, unknown>;
      // Een naam van gewone lengte, een eindig gewicht en hele herhalingen; wat anders is valt weg.
      return typeof exercise === 'string' && exercise.trim().length > 0 && exercise.length <= 80
        && typeof kg === 'number' && Number.isFinite(kg) && kg > 0 && kg <= 500
        && typeof reps === 'number' && Number.isInteger(reps) && reps > 0 && reps <= 30
        ? [{ exercise, kg, reps }] : [];
    }).slice(0, 8);
    if (list.length > 0) out.strengthTargets = list;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function readGoalKind(raw: unknown): GoalKindId | undefined {
  return typeof raw === 'string' && (GOAL_KIND_IDS as readonly string[]).includes(raw) ? (raw as GoalKindId) : undefined;
}

export function readGoalPriority(raw: unknown): GoalPriority | undefined {
  return typeof raw === 'string' && (GOAL_PRIORITIES as readonly string[]).includes(raw) ? (raw as GoalPriority) : undefined;
}

// De oude rol naar de nieuwe belangrijkheid. Onbekend of afwezig: undefined.
export function priorityFromPlanRole(role: unknown): GoalPriority | undefined {
  if (role === 'main') return 'top';
  if (role === 'secondary') return 'voortop';
  if (role === 'track') return 'verkenning';
  return undefined;
}

// Heeft de gebruiker in het etappeplan een nacht in tent of bivak gekozen? Dan is de tocht
// een tocht met tent.
export function routePlanUsesTent(plan: Pick<RoutePlan, 'choices'> | null | undefined): boolean {
  if (!plan || typeof plan.choices !== 'object' || plan.choices === null) return false;
  return Object.values(plan.choices).some((c) => c?.sleep === 'tent' || c?.sleep === 'bivak');
}

export interface GoalKindContext {
  // Dit doel is het hoofddoel: het doel met mijlpalen (de Ascent Ladder) dat
  // engine/mainGoal.ts#mainGoal aanwijst. Een tweede doel met mijlpalen of een
  // gearchiveerd doel is het niet.
  isMain: boolean;
  tent: boolean;
  // Onbekend of er mijlpalen zijn (een back-up zonder die lijst): zonder rol op het doel
  // wordt de belangrijkheid dan niet gezet, de opstartstap doet dat later goed.
  ladderUnknown?: boolean;
}

function amountOf(reqs: GoalRequirement[], kind: GoalRequirement['kind'], unit?: string): number | undefined {
  const found = reqs.filter((r) => r.kind === kind && r.target && (!unit || r.target.unit === unit));
  // Een eis per dag is geen totaal: die wordt hier niet als totaal overgenomen.
  const pick = found.find((r) => r.scope === 'TOTAL_EVENT' || r.scope === 'SINGLE_EVENT') ?? found.find((r) => r.scope !== 'PER_DAY');
  const n = pick?.target?.amount;
  return typeof n === 'number' && n > 0 ? n : undefined;
}

function trekDetails(reqs: GoalRequirement[], shelter: 'hut' | 'tent'): GoalDetails {
  const d: GoalDetails = { shelter, homeDaysInRow: 2 };
  const set = <K extends keyof GoalDetails>(k: K, v: GoalDetails[K] | undefined) => { if (v !== undefined) d[k] = v; };
  set('distanceKm', amountOf(reqs, 'distance', 'km'));
  set('gainM', amountOf(reqs, 'elevationGain', 'm'));
  set('lossM', amountOf(reqs, 'elevationLoss', 'm'));
  set('days', amountOf(reqs, 'eventDays') ?? amountOf(reqs, 'consecutiveDays'));
  set('packKg', amountOf(reqs, 'packWeight', 'kg'));
  return d;
}

function runDetails(reqs: GoalRequirement[]): GoalDetails {
  const d: GoalDetails = {};
  const km = amountOf(reqs, 'distance', 'km');
  const min = amountOf(reqs, 'targetTime', 'min');
  if (km !== undefined) d.distanceKm = km;
  if (min !== undefined) d.targetMinutes = min;
  const variant = variantOf('run_race', d);
  if (variant) d.variant = variant;
  return d;
}

// Zet de soort, de gegevens en de belangrijkheid op een doel waar ze nog niet staan. Een doel
// dat ze al heeft houdt ze (gelezen en schoongemaakt). Idempotent. Raakt niets anders aan.
export function migrateTrainingGoal(goal: TrainingGoal, ctx: GoalKindContext): TrainingGoal {
  const reqs = Array.isArray(goal.requirements) ? goal.requirements : [];
  // Vooruitcompatibel: een soort, belangrijkheid of veld uit een nieuwere versie blijft staan.
  const rawKind: unknown = goal.kind;
  const rawPriority: unknown = goal.priority;
  const unknownKind = rawKind !== undefined && rawKind !== null && readGoalKind(rawKind) === undefined;
  const unknownPriority = rawPriority !== undefined && rawPriority !== null && readGoalPriority(rawPriority) === undefined;
  let kind = readGoalKind(goal.kind);
  let details = readGoalDetails(goal.details);
  let priority = readGoalPriority(goal.priority);

  if (!kind && !unknownKind) {
    if (ctx.isMain) {
      kind = ctx.tent ? 'trek_tent' : 'trek_hut';
      details = details ?? readGoalDetails(trekDetails(reqs, ctx.tent ? 'tent' : 'hut'));
    } else if (isRaceGoal({ ...goal, requirements: reqs })) {
      kind = 'run_race';
      details = details ?? readGoalDetails(runDetails(reqs));
    }
  }
  if (!priority && !unknownPriority) {
    // De rol zoals de planning hem al las (raceBlock.ts): het hoofddoel is top, een andere
    // hardloopwedstrijd voortop, de rest verkenning. Zonder bekende mijlpalen en zonder rol
    // is niet te zeggen wat het is: dan niets zetten.
    const fromRole = priorityFromPlanRole(goal.planRole);
    if (ctx.isMain) priority = 'top';
    else if (fromRole) priority = fromRole;
    else if (!ctx.ladderUnknown) priority = priorityFromPlanRole(goalPlanRole({ ...goal, requirements: reqs }, undefined));
  }

  const next: TrainingGoal = { ...goal };
  if (kind) next.kind = kind; else if (!unknownKind) delete next.kind;
  const extras = unknownDetailFields(goal.details);
  if (details || extras) next.details = { ...(details ?? {}), ...(extras ?? {}) }; else delete next.details;
  if (priority) next.priority = priority; else if (!unknownPriority) delete next.priority;
  // Ronde 2b: een eigen afbouw en de aanvaarde botsingen, defensief gelezen. Wat niet klopt gaat weg.
  const taper: unknown = goal.taperDays;
  if (typeof taper === 'number' && Number.isFinite(taper) && taper >= 0) next.taperDays = Math.round(taper); else delete next.taperDays;
  // Alleen een echte true blijft staan; de migratie zet het zelf nooit (het is jouw keuze in de app).
  const chosen: unknown = goal.priorityChosen;
  if (chosen === true) next.priorityChosen = true; else delete next.priorityChosen;
  const accepted = readAcceptedConflicts(goal.conflictAccepted);
  if (accepted) next.conflictAccepted = accepted; else delete next.conflictAccepted;
  // Ronde 2c: de plek in de lijst op de Ascend-tab, een heel getal vanaf 0.
  const order: unknown = goal.order;
  if (typeof order === 'number' && Number.isFinite(order) && order >= 0) next.order = Math.round(order); else delete next.order;
  return next;
}

// De aanvaarde botsingen (TrainingGoal.conflictAccepted): een paar datums "van|tot" (of, van een
// eerdere versie, één datum), alleen echte datums, zonder dubbelen.
export function readAcceptedConflicts(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const dates = [...new Set(raw.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}(\|\d{4}-\d{2}-\d{2})?$/.test(d)))];
  return dates.length > 0 ? dates : undefined;
}

// Velden van de gegevens die deze versie niet kent (uit een nieuwere back-up): ongemoeid laten.
function unknownDetailFields(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const known = new Set<string>(['variant', 'shelter', 'strengthTargets', ...DETAIL_NUMBERS]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) if (!known.has(k)) out[k] = v;
  return Object.keys(out).length > 0 ? out : undefined;
}

// Een lijst doelen. Alleen het hoofddoel (het doel met mijlpalen dat mainGoal aanwijst, eerst een
// actief, anders een niet gearchiveerd) wordt een tocht met priority top. De andere doelen krijgen
// hun belangrijkheid uit hun rol. `ladderKnown: false` voor een back-up zonder mijlpalenlijst.
export function migrateTrainingGoals(
  goals: readonly TrainingGoal[],
  ladderGoalIds: ReadonlySet<string>,
  plan: Pick<RoutePlan, 'choices'> | null | undefined,
  opts: { ladderKnown?: boolean } = {},
): TrainingGoal[] {
  const tent = routePlanUsesTent(plan);
  const main = mainGoal(goals, ladderGoalIds, 'activeFirst');
  const ladderUnknown = opts.ladderKnown === false && ladderGoalIds.size === 0;
  return goals.map((g) => migrateTrainingGoal(g, { isMain: main?.id === g.id, tent, ...(ladderUnknown ? { ladderUnknown } : {}) }));
}
