// ASCEND: een toestel dat in ponden werkt, herkend aan wat je invulde. Pure; geen React.
// Besluit: docs/beslissingen/2026-11-03-forge-na-de-eerste-vergelijking.md.
//
// Een beenpers met een stapel in ponden, zonder gewichten in je sportschool: je typt 104,4 en 95,3 kg omdat
// er 230 en 210 lb op het toestel staat. Dan past het voorschrift van Forge (in hele en halve kilo's) nooit
// op het toestel. Forge stelt voor het toestel op te slaan als een bereik in ponden (een voorstel, één tik
// op Opslaan, nooit stil), zodat het volgende voorschrift een gewicht van het toestel is.

import { exerciseOf, type WorkoutExercise } from './forgeWorkout';
import { hasStack, ownWeightsFor } from './machineWeights';
import { RANGE_LIMITS, type GymProfile, type WeightRange } from './strengthSettings';

const KG_PER_LB = 0.45359237;
// Een ingetypt gewicht is op 0,1 kg afgerond: zo dicht ligt het dan bij een heel pond.
const NEAR_POUND_KG = 0.1;
// Hoe ver een pond van de stap van de stapel mag liggen (161 bij een stapel per 10).
const NEAR_STEP_LB = 1;
const POUND_STEPS = [10, 5];
// Het voorstel loopt tot ruim boven het zwaarste gewicht, minstens tot 300 lb.
const END_MIN_LB = 300;
const END_ROOM = 1.3;

export interface PoundStack {
  // Wat je invulde, in hele ponden, oplopend.
  pounds: number[];
  // Het bereik dat Forge voorstelt, in ponden (WeightRange met unit 'lb').
  range: WeightRange;
}

const onHalfKilo = (kg: number) => Math.abs(kg * 2 - Math.round(kg * 2)) < 1e-6;
const nearPound = (kg: number) => Math.abs(Math.round(kg / KG_PER_LB) * KG_PER_LB - kg) <= NEAR_POUND_KG + 1e-9;

// Het voorstel voor deze oefening, of undefined. Alleen bij een kabel of toestel zonder eigen gewichten in dit
// profiel, alleen met gewichten die je zelf invulde, minstens twee verschillende die niet op een halve kilo
// liggen, en allemaal dicht bij een heel pond op één stap van 10 of 5 lb.
export function poundStackProposal(ex: WorkoutExercise, profile: GymProfile): PoundStack | undefined {
  const exercise = exerciseOf(ex);
  if (ex.timed || !hasStack(exercise) || ownWeightsFor(profile, exercise)) return undefined;
  const typed = [...new Set(ex.rows.filter((r) => r.edited && r.weightKg !== undefined && r.weightKg > 0).map((r) => Math.round(r.weightKg! * 100) / 100))];
  if (typed.length < 2 || typed.filter((kg) => !onHalfKilo(kg)).length < 2) return undefined;
  if (!typed.every(nearPound)) return undefined;
  const pounds = typed.map((kg) => Math.round(kg / KG_PER_LB)).sort((a, b) => a - b);
  const step = POUND_STEPS.find((s) => pounds.every((lb) => Math.abs(lb - Math.round(lb / s) * s) <= NEAR_STEP_LB));
  if (!step) return undefined;
  const maxLb = Math.floor(RANGE_LIMITS.maxKg / KG_PER_LB / step) * step;
  const end = Math.min(maxLb, Math.max(END_MIN_LB, Math.ceil((pounds[pounds.length - 1] * END_ROOM) / step) * step));
  return { pounds, range: { startKg: step, endKg: end, stepKg: step, unit: 'lb' } };
}

const joinNL = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`);

// "Dit toestel lijkt in ponden te werken: je vulde 161, 210 en 230 lb in. Opslaan als 10 tot 300 lb per 10?"
export function poundStackText(p: PoundStack): string {
  return `Dit toestel lijkt in ponden te werken: je vulde ${joinNL(p.pounds.map(String))} lb in. Opslaan als ${p.range.startKg} tot ${p.range.endKg} lb per ${p.range.stepKg}?`;
}
