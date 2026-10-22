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

import type { GoalRequirement, TrainingGoal } from '../models/goals';
import { makeId } from '../utils/id';

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
