// ASCEND: een oefening die je na een voorstel met Akkoord aan een krachttraining toevoegde
// (docs/beslissingen/2026-11-02-forge-herinrichting.md, besluit spierindex-klein).
//
// De ingebouwde sjablonen worden bij elke start gelijkgezet met hun definitie (storage/databaseSeed.ts),
// dus een toegevoegde oefening staat niet in het sjabloon maar als voorkeur in
// `StrengthSettings.addedExercises`: per sjabloon-id een korte lijst oefening-id's. Optioneel, defensief
// gelezen, zonder migratie; een oude back-up heeft het veld niet. Forge zet ze achter de oefeningen van de
// training. Puur: geen React, geen opslag.

import { exerciseById } from '../data/exercises';
import type { Exercise } from '../models/exercise';
import type { ExercisePrescription } from '../models/training';
import { isRecord } from '../utils/guards';
import type { WorkoutExercise } from './forgeWorkout';
import { matchExercise } from './exerciseMatch';

// Hoogstens zoveel toegevoegde oefeningen per training: het is een aanvulling, geen tweede programma.
export const MAX_ADDED_PER_TEMPLATE = 3;
// Hoogstens zoveel trainingen met een toevoeging; meer wordt bij het lezen weggelaten.
export const MAX_ADDED_TEMPLATES = 20;
const SLOT_PREFIX = 'plus:';

export type AddedExercises = Record<string, string[]>;

// Alleen sjabloon-id's van redelijke lengte met een lijst bekende oefeningen, zonder dubbele.
export function normalizeAddedExercises(raw: unknown): AddedExercises | undefined {
  if (!isRecord(raw)) return undefined;
  const out: AddedExercises = {};
  let n = 0;
  for (const [templateId, list] of Object.entries(raw)) {
    if (templateId.length === 0 || templateId.length > 60 || !Array.isArray(list) || n >= MAX_ADDED_TEMPLATES) continue;
    const ids = [...new Set(list.filter((id): id is string => typeof id === 'string' && !!exerciseById(id)))].slice(0, MAX_ADDED_PER_TEMPLATE);
    if (ids.length === 0) continue;
    out[templateId] = ids;
    n++;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// Het voorschrift van een toegevoegde oefening: drie sets in een bereik dat bij de beweging past.
export function addedPrescription(exercise: Exercise): Pick<ExercisePrescription, 'sets' | 'reps'> {
  if (exercise.pattern === 'shin') return { sets: 3, reps: '15-20' };
  if (exercise.pattern === 'calf') return { sets: 3, reps: '10-15' };
  // Evenwicht: een houding telt in seconden per been (het bereik leest Forge dan niet), reiken in rondjes per been.
  if (exercise.pattern === 'balance') return { sets: 3, reps: '4-6' };
  return { sets: 3, reps: '10-12' };
}

// De toegevoegde oefeningen van een training als voorschriften, in de volgorde waarin je ze toevoegde. Een
// oefening die al in de training zit (`existing`, bijvoorbeeld uit een nieuw programma) komt er niet nog eens bij.
export function addedSlotsFor(model: { addedExercises?: AddedExercises } | undefined, templateId: string, existing: readonly ExercisePrescription[] = []): ExercisePrescription[] {
  const ids = normalizeAddedExercises(model?.addedExercises)?.[templateId] ?? [];
  // Zoals strengthHistory.ts#exerciseKey: eerst de eigen id, dan de naam (zonder die import, die hier rond zou lopen).
  const present = new Set(existing.map((s) => exerciseById(s.id)?.id ?? matchExercise(s.exerciseName)).filter(Boolean));
  return ids.flatMap((id) => {
    const exercise = exerciseById(id);
    if (!exercise || present.has(id)) return [];
    return [{ id: `${SLOT_PREFIX}${id}`, exerciseName: exercise.name, ...addedPrescription(exercise), priority: 'accessory' as const }];
  });
}

export function isAddedSlot(model: { addedExercises?: AddedExercises } | undefined, templateId: string, slot: string): boolean {
  if (!slot.startsWith(SLOT_PREFIX)) return false;
  return (normalizeAddedExercises(model?.addedExercises)?.[templateId] ?? []).includes(slot.slice(SLOT_PREFIX.length));
}

// Alleen de trainingen die nog bestaan: een toevoeging bij een verdwenen sjabloon gaat weg.
function prunedTo(all: AddedExercises, templateIds: readonly string[]): AddedExercises {
  const keep = new Set(templateIds);
  return Object.fromEntries(Object.entries(all).filter(([id]) => keep.has(id)));
}

// Of er nog plek is: hoogstens drie per training en hoogstens twintig trainingen. Is het vol, dan toont de
// weekterugblik geen voorstel, want Akkoord zou niets doen.
export function canAddExercise(model: { addedExercises?: AddedExercises } | undefined, templateId: string, templateIds: readonly string[]): boolean {
  const all = prunedTo(normalizeAddedExercises(model?.addedExercises) ?? {}, templateIds);
  const list = all[templateId];
  if (list) return list.length < MAX_ADDED_PER_TEMPLATE;
  return Object.keys(all).length < MAX_ADDED_TEMPLATES;
}

// Na Akkoord: de oefening erbij, en toevoegingen bij sjablonen die er niet meer zijn gaan weg. Staat hij er al of
// is er geen plek, dan blijft alles zoals het was.
export function withAddedExercise<M extends { addedExercises?: AddedExercises }>(model: M | undefined, templateId: string, exerciseId: string, templateIds: readonly string[]): M {
  const base = (model ?? {}) as M;
  const all = prunedTo(normalizeAddedExercises(base.addedExercises) ?? {}, templateIds);
  const list = all[templateId] ?? [];
  if (!templateIds.includes(templateId) || !exerciseById(exerciseId) || list.includes(exerciseId) || !canAddExercise({ addedExercises: all }, templateId, templateIds)) return base;
  return { ...base, addedExercises: { ...all, [templateId]: [...list, exerciseId] } };
}

// "Uit deze training halen" in een lopende training: een oefening waarvan je al een set afvinkte blijft in deze
// sessie staan (afgevinkte sets gaan nooit stil weg); anders gaat hij er meteen uit. De lijst voor volgende keren
// past de aanroeper aan met withoutAddedSlot.
export function workoutWithoutAdded(workout: WorkoutExercise[], slot: string): WorkoutExercise[] {
  const ex = workout.find((e) => e.slot === slot);
  if (!ex || ex.rows.some((r) => r.done)) return workout;
  return workout.filter((e) => e.slot !== slot);
}

// Het voorschrift waarmee Ruilen (en Terug naar) in een lopende training rekent. Meestal dat van de training;
// een toegevoegde oefening die na "Uit deze training halen" met afgevinkte sets in de sessie bleef staat daar
// niet meer in, en krijgt dan het voorschrift van de sessie zelf: de oefening van de plek, met zoveel werksets
// als er nu staan. Zo doet Ruilen nooit stil niets. Geen voorschrift: een plek die Forge niet kent.
export function sessionPrescription(slots: readonly ExercisePrescription[], ex: Pick<WorkoutExercise, 'slot' | 'rows'>): ExercisePrescription | undefined {
  const own = slots.find((s) => s.id === ex.slot);
  if (own) return own;
  if (!ex.slot.startsWith(SLOT_PREFIX)) return undefined;
  const exercise = exerciseById(ex.slot.slice(SLOT_PREFIX.length));
  if (!exercise) return undefined;
  const work = ex.rows.filter((r) => r.kind !== 'warmup').length;
  const base = addedPrescription(exercise);
  return { id: ex.slot, exerciseName: exercise.name, ...base, sets: work > 0 ? work : base.sets, priority: 'accessory' };
}

// "Uit deze training halen": de oefening gaat uit de lijst. Logs van eerder blijven zoals ze zijn.
export function withoutAddedSlot<M extends { addedExercises?: AddedExercises }>(model: M | undefined, templateId: string, slot: string): M {
  const base = (model ?? {}) as M;
  const all = normalizeAddedExercises(base.addedExercises) ?? {};
  const id = slot.startsWith(SLOT_PREFIX) ? slot.slice(SLOT_PREFIX.length) : slot;
  const list = (all[templateId] ?? []).filter((e) => e !== id);
  const next = { ...all };
  if (list.length > 0) next[templateId] = list;
  else delete next[templateId];
  return { ...base, addedExercises: Object.keys(next).length > 0 ? next : undefined };
}

// Of Ruilen (en Terug naar) kan: een voorschrift om mee te rekenen, en nog geen afgevinkte set. Ruilen zet
// nieuwe rijen neer, dus een oefening met een afgevinkte set wordt nooit geruild: afgevinkte sets gaan nooit
// stil weg. Voor elke oefening, ook als vangnet in de handeling zelf.
export function canSwap(slots: readonly ExercisePrescription[], ex: Pick<WorkoutExercise, 'slot' | 'rows'>): boolean {
  return !ex.rows.some((r) => r.done) && !!sessionPrescription(slots, ex);
}
