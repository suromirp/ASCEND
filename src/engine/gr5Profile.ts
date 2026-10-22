// ASCEND — bivakprofiel van de GR5: het rugzakdoel, de rustdagen en de
// zachte start.
//
// De app was gebouwd voor een tocht van hut naar hut met 12 kg. Wie met
// tent, slaapzak, matje en kookspullen loopt, vertrekt uit een dorp met
// 12,5 tot 14,5 kg (docs/visie/GR5-reis en coaching.md, 2b). Dit bestand
// houdt de getallen daarvoor op één plek, zodat het doel-scherm, de
// uitleg en het voorstel voor een bestaand doel er allemaal hetzelfde
// uit lezen. Puur: geen React, geen opslag.
//
// Een bestaand doel verandert hier nooit stilzwijgend: `tentPackProposal`
// geeft alleen een voorstel (de Akkoord-route van adviceEngine), en alleen
// voor een doel dat nog op de oude standaard van 12 kg staat.

import type { GoalMilestone, GoalMilestoneProgress, GoalRequirement, TrainingGoal } from '../models/goals';
import type { MilestoneRequirement } from '../models/objectives';
import type { SessionLog } from '../models/training';
import { makeId } from '../utils/id';
import { formatNumberNL } from '../utils/number';
import { requirementAutoSatisfied } from './progression';

// --- Rugzakdoel ---------------------------------------------------------------

export const HUT_PACK_KG = 12;
export const TENT_PACK_KG = 14;
export const TENT_PACK_RANGE_KG: [number, number] = [12.5, 14.5];

// Wat je bij een rugzakgewicht moet weten, in gewone woorden. Eén tekst voor
// het doel-scherm én het bewerkscherm.
export const PACK_WEIGHT_EXPLANATION =
  'Met tent, slaapzak, matje en eten voor twee tot vier dagen vertrek je met ongeveer 12,5 tot 14,5 kg. Tussen hutten, zonder tent en kookspullen, blijft het rond 12 kg.';

export function packWeightOf(requirements: GoalRequirement[]): number | undefined {
  return requirements.find((r) => r.kind === 'packWeight')?.target?.amount;
}

// Zet het rugzakdoel van een doel; leeg of 0 haalt het weg. Behoudt de id
// van de bestaande eis, zodat niets er verweesd door raakt.
export function withPackWeight(goal: TrainingGoal, kg: number | undefined, now = new Date().toISOString()): TrainingGoal {
  const existing = goal.requirements.find((r) => r.kind === 'packWeight');
  const others = goal.requirements.filter((r) => r.kind !== 'packWeight');
  const requirements: GoalRequirement[] = kg !== undefined && kg > 0
    ? [...others, { id: existing?.id ?? makeId('req'), kind: 'packWeight', scope: 'SINGLE_EVENT', target: { amount: kg, unit: 'kg' } }]
    : others;
  return { ...goal, requirements, updatedAt: now };
}

// The rucksack target the program is laid out for (Program.packTargetKg,
// engine/packLadder.ts): the main goal's own setting. Undefined when the goal
// has none; the ladder then works with the default with a tent. The main goal
// is the one with the Ascent Ladder, an active one first.
export function programPackTarget(goals: TrainingGoal[], milestones: GoalMilestone[]): number | undefined {
  const goal = programPackGoal(goals, milestones);
  const kg = goal ? packWeightOf(goal.requirements) : undefined;
  return kg !== undefined && Number.isFinite(kg) && kg > 0 ? kg : undefined;
}

// The goal whose rucksack target the program follows: the main goal.
export function programPackGoal(goals: TrainingGoal[], milestones: GoalMilestone[]): TrainingGoal | undefined {
  const withLadder = new Set(milestones.map((m) => m.goalId));
  return goals.find((g) => g.status === 'active' && withLadder.has(g.id)) ?? goals.find((g) => g.status !== 'archived' && withLadder.has(g.id));
}

export interface TentPackProposal {
  id: string; // deterministisch, zodat "Liever niet" blijft gelden
  goalId: string;
  fromKg: number;
  toKg: number;
}

// Het voorstel om van 12 naar 14 kg te gaan. Alleen voor het hoofddoel (het
// doel met de ladder), alleen als het nog actief of gepauzeerd is en alleen
// als het rugzakdoel exact op de oude standaard staat. Elk ander getal heb
// je zelf gekozen en blijft met rust.
export function tentPackProposal(goals: TrainingGoal[], ladderGoalIds: ReadonlySet<string>): TentPackProposal | undefined {
  const goal = goals.find((g) => g.status !== 'archived' && ladderGoalIds.has(g.id));
  if (!goal) return undefined;
  const kg = packWeightOf(goal.requirements);
  if (kg !== HUT_PACK_KG) return undefined;
  return { id: `gr5-pack-tent:${goal.id}`, goalId: goal.id, fromKg: kg, toKg: TENT_PACK_KG };
}

// --- Dagen, rustdagen en zachte start ------------------------------------------

// Onderzoek: een rustdag per 6 tot 8 loopdagen; we rekenen met 7. De eerste
// 3 tot 4 dagen op 60 tot 70% van een normale dag.
export const REST_EVERY_WALKING_DAYS = 7;
export const SOFT_START_DAYS: [number, number] = [3, 4];
export const SOFT_START_PCT: [number, number] = [60, 70];

export interface TripShape {
  walkingDays: number;
  restDays: number;
  totalDays: number;
}

// Een tocht van `walkingDays` loopdagen met een rustdag per 7 loopdagen:
// 30 loopdagen worden zo 34 dagen in totaal. Een rustdag aan het begin of
// einde telt niet mee, daarom (dagen - 1). Onder de 8 loopdagen geen
// rustdagen: dat is een weekend, geen maand.
export function tripShape(walkingDays: number | undefined): TripShape | undefined {
  if (walkingDays === undefined || !Number.isFinite(walkingDays) || walkingDays < 1) return undefined;
  const days = Math.round(walkingDays);
  const restDays = days > REST_EVERY_WALKING_DAYS ? Math.floor((days - 1) / REST_EVERY_WALKING_DAYS) : 0;
  return { walkingDays: days, restDays, totalDays: days + restDays };
}

// Pas bij een lange tocht (twee weken of meer) is dit advies aan de orde.
const LONG_TRIP_MIN_DAYS = 14;

// De uitleg onder het veld voor het aantal loopdagen, of undefined bij een
// korte tocht. Zonder gedachtestreepjes en zonder tabel.
export function tripShapeNote(walkingDays: number | undefined): string | undefined {
  const shape = tripShape(walkingDays);
  if (!shape || shape.walkingDays < LONG_TRIP_MIN_DAYS) return undefined;
  const rest = shape.restDays === 1 ? '1 rustdag' : `${shape.restDays} rustdagen`;
  return `Met ${rest} (een per ${REST_EVERY_WALKING_DAYS} loopdagen) kost dit ongeveer ${shape.totalDays} dagen in totaal; reken je verlof daarop. De eerste ${SOFT_START_DAYS[0]} tot ${SOFT_START_DAYS[1]} dagen loop je rustiger, op ${SOFT_START_PCT[0]} tot ${SOFT_START_PCT[1]}% van een normale dag. De andere dagen zijn dan iets zwaarder dan het gemiddelde.`;
}

// --- Mijlpaal 11: de volle rugzaktocht gaat mee met het rugzakdoel -------------

export const PACK_MILESTONE_ID = 'ms_gr5_rugzaksessie';
const PACK_MILESTONE_KM = 15;

// Titel en eis van mijlpaal 11 bij een rugzakdoel van `kg`.
export function packMilestone(kg: number): { title: string; requirement: MilestoneRequirement } {
  return { title: `Volle rugzaktocht: ${formatNumberNL(kg, 1)} kg, ${PACK_MILESTONE_KM} km`, requirement: { kind: 'backpack', minWeightKg: kg, minKm: PACK_MILESTONE_KM } };
}

// Mijlpalen die je behaalde onder de eerdere eis blijven behaald. Een
// mijlpaal telt als behaald zodra er een rij in GoalMilestoneProgress staat,
// of (zonder rij) zodra een log aan de eis voldoet. Wordt de eis zwaarder,
// dan zou dat tweede stilzwijgend verdwijnen. Daarom krijgt elke mijlpaal die
// met de oude eis behaald was en met de nieuwe niet, en nog geen rij heeft,
// er een: de datum van de eerste log die voldeed. Alleen toevoegen, nooit
// iets veranderen (het logboek van behaalde mijlpalen is append-only).
export function keepClearedMilestones(
  before: GoalMilestone[],
  after: GoalMilestone[],
  progress: GoalMilestoneProgress[],
  logs: SessionLog[],
  newId: () => string = () => makeId('progress'),
): GoalMilestoneProgress[] {
  const have = new Set(progress.map((p) => `${p.goalId}|${p.milestoneId}`));
  const next = new Map(after.map((m) => [`${m.goalId}|${m.id}`, m]));
  const rows: GoalMilestoneProgress[] = [];
  for (const old of before) {
    const key = `${old.goalId}|${old.id}`;
    const fresh = next.get(key);
    if (!fresh || have.has(key)) continue;
    if (!requirementAutoSatisfied(old.requirement, logs) || requirementAutoSatisfied(fresh.requirement, logs)) continue;
    const dates = logs.filter((l) => requirementAutoSatisfied(old.requirement, [l])).map((l) => l.completedDate).sort();
    const clearedDate = dates[0] ?? [...logs].map((l) => l.completedDate).sort().pop();
    if (!clearedDate) continue;
    rows.push({ id: newId(), goalId: old.goalId, milestoneId: old.id, clearedDate, note: 'Behaald met de eis van toen. Die is later aangepast.' });
  }
  return rows;
}

export interface PackMilestoneUpdate {
  milestone: GoalMilestone;
  // Rows that keep an already reached milestone reached (keepClearedMilestones).
  keep: GoalMilestoneProgress[];
}

// Mijlpaal 11 van een doel in de pas met het rugzakdoel. Undefined als er niets
// te doen is: de mijlpaal bestaat niet, is door jou omgebouwd tot iets anders
// dan een rugzakeis, of staat al goed.
export function packMilestoneUpdate(
  milestones: GoalMilestone[],
  progress: GoalMilestoneProgress[],
  logs: SessionLog[],
  goalId: string,
  packKg: number,
  newId?: () => string,
): PackMilestoneUpdate | undefined {
  const current = milestones.find((m) => m.goalId === goalId && m.id === PACK_MILESTONE_ID);
  if (!current || current.requirement.kind !== 'backpack') return undefined;
  const wanted = packMilestone(packKg);
  if (current.requirement.minWeightKg === packKg && current.title === wanted.title) return undefined;
  const milestone: GoalMilestone = { ...current, title: wanted.title, requirement: wanted.requirement };
  return { milestone, keep: keepClearedMilestones([current], [milestone], progress.filter((p) => p.goalId === goalId), logs, newId) };
}
