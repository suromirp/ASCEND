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

// Hoogstens zoveel toegevoegde oefeningen per training: het is een aanvulling, geen tweede programma.
export const MAX_ADDED_PER_TEMPLATE = 3;
const SLOT_PREFIX = 'plus:';

export type AddedExercises = Record<string, string[]>;

// Alleen sjabloon-id's van redelijke lengte met een lijst bekende oefeningen, zonder dubbele.
export function normalizeAddedExercises(raw: unknown): AddedExercises | undefined {
  if (!isRecord(raw)) return undefined;
  const out: AddedExercises = {};
  let n = 0;
  for (const [templateId, list] of Object.entries(raw)) {
    if (templateId.length === 0 || templateId.length > 60 || !Array.isArray(list) || n >= 20) continue;
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
  return { sets: 3, reps: '10-12' };
}

// De toegevoegde oefeningen van een training als voorschriften, in de volgorde waarin je ze toevoegde.
export function addedSlotsFor(model: { addedExercises?: AddedExercises } | undefined, templateId: string): ExercisePrescription[] {
  const ids = normalizeAddedExercises(model?.addedExercises)?.[templateId] ?? [];
  return ids.flatMap((id) => {
    const exercise = exerciseById(id);
    if (!exercise) return [];
    return [{ id: `${SLOT_PREFIX}${id}`, exerciseName: exercise.name, ...addedPrescription(exercise), priority: 'accessory' as const }];
  });
}

export function isAddedSlot(model: { addedExercises?: AddedExercises } | undefined, templateId: string, slot: string): boolean {
  if (!slot.startsWith(SLOT_PREFIX)) return false;
  return (normalizeAddedExercises(model?.addedExercises)?.[templateId] ?? []).includes(slot.slice(SLOT_PREFIX.length));
}

// Na Akkoord: de oefening erbij. Staat hij er al of is de lijst vol, dan blijft alles zoals het was.
export function withAddedExercise<M extends { addedExercises?: AddedExercises }>(model: M | undefined, templateId: string, exerciseId: string): M {
  const base = (model ?? {}) as M;
  const all = normalizeAddedExercises(base.addedExercises) ?? {};
  const list = all[templateId] ?? [];
  if (!exerciseById(exerciseId) || list.includes(exerciseId) || list.length >= MAX_ADDED_PER_TEMPLATE) return base;
  return { ...base, addedExercises: { ...all, [templateId]: [...list, exerciseId] } };
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
