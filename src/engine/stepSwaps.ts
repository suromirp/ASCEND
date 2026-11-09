// ASCEND: een ladderstap die je na een voorstel met Akkoord in een krachttraining zette
// (docs/beslissingen/2026-11-09-calisthenics-stapvoorstel.md).
//
// Net als een toegevoegde oefening (engine/addedExercises.ts) staat zo'n stap niet in het sjabloon: de ingebouwde
// sjablonen worden bij elke start gelijkgezet met hun definitie (storage/databaseSeed.ts). Hij staat als voorkeur in
// `StrengthSettings.stepSwaps`: per sjabloon-id per plek (`ExercisePrescription.id`) de oefening van het sjabloon
// (`from`) en de stap die er nu staat (`to`). Forge leest hem in engine/forgeSlots.ts. Geldt alleen zolang de plek in
// het sjabloon nog `from` is; verandert het sjabloon of het programma, dan valt de stap stil weg en geldt het sjabloon.
// Optioneel, defensief gelezen, zonder migratie; een oude back-up heeft het veld niet. Logs veranderen nooit.
// Puur: geen React, geen opslag.

import { exerciseById } from '../data/exercises';
import { LADDER_PLACE } from '../data/skillLadders';
import type { ExercisePrescription } from '../models/training';
import { isRecord } from '../utils/guards';
import { matchExercise } from './exerciseMatch';

export interface StepSwap {
  // De oefening die het sjabloon op deze plek heeft.
  from: string;
  // De ladderstap die er na Akkoord staat.
  to: string;
  // Alleen na een overgang tussen herhalingen en een houding: de onderkant van de nieuwe stap (3 keer 5, of 3 keer
  // 10 seconden). Anders blijven sets en herhalingen van het sjabloon.
  sets?: number;
  reps?: string;
}

export type StepSwaps = Record<string, Record<string, StepSwap>>;

// Hoogstens zoveel trainingen en plekken; meer wordt bij het lezen weggelaten.
const MAX_TEMPLATES = 20;
const MAX_SLOTS = 6;

const REPS_PATTERN = /^\d{1,3}(-\d{1,3})?s?$/;

function swapValue(raw: unknown): StepSwap | undefined {
  if (!isRecord(raw) || typeof raw.from !== 'string' || typeof raw.to !== 'string') return undefined;
  if (!exerciseById(raw.from) || !LADDER_PLACE.has(raw.to) || raw.from === raw.to) return undefined;
  const out: StepSwap = { from: raw.from, to: raw.to };
  if (typeof raw.sets === 'number' && Number.isInteger(raw.sets) && raw.sets >= 1 && raw.sets <= 10 && typeof raw.reps === 'string' && REPS_PATTERN.test(raw.reps)) {
    out.sets = raw.sets;
    out.reps = raw.reps;
  }
  return out;
}

export function normalizeStepSwaps(raw: unknown): StepSwaps | undefined {
  if (!isRecord(raw)) return undefined;
  const out: StepSwaps = {};
  let n = 0;
  for (const [templateId, slots] of Object.entries(raw)) {
    if (n >= MAX_TEMPLATES || templateId.length === 0 || templateId.length > 60 || !isRecord(slots)) continue;
    const kept: Record<string, StepSwap> = {};
    let m = 0;
    for (const [slot, value] of Object.entries(slots)) {
      if (m >= MAX_SLOTS || slot.length === 0 || slot.length > 60) continue;
      const swap = swapValue(value);
      if (!swap) continue;
      kept[slot] = swap;
      m++;
    }
    if (m === 0) continue;
    out[templateId] = kept;
    n++;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// De oefening van een plek: eerst de eigen id, dan de naam (zoals engine/addedExercises.ts).
export function slotExerciseId(slot: Pick<ExercisePrescription, 'id' | 'exerciseName'>): string | undefined {
  return exerciseById(slot.id)?.id ?? matchExercise(slot.exerciseName);
}

// De plekken van een training met de stappen erin. Een plek die niet meer `from` is, blijft zoals het sjabloon zegt.
export function withStepSwaps(base: readonly ExercisePrescription[], model: { stepSwaps?: StepSwaps } | undefined, templateId: string): ExercisePrescription[] {
  const swaps = normalizeStepSwaps(model?.stepSwaps)?.[templateId];
  if (!swaps) return [...base];
  return base.map((slot) => {
    const swap = swaps[slot.id];
    const to = swap ? exerciseById(swap.to) : undefined;
    if (!swap || !to || slotExerciseId(slot) !== swap.from) return slot;
    const out: ExercisePrescription = { id: slot.id, exerciseName: to.name, sets: swap.sets ?? slot.sets, reps: swap.reps ?? slot.reps, priority: slot.priority };
    // Het doel per set van een programma (herhalingen en RIR) blijft, behalve als de stap zijn eigen onderkant kreeg.
    if (slot.setTargets && swap.reps === undefined) out.setTargets = slot.setTargets;
    return out;
  });
}

export function stepSwapAt(model: { stepSwaps?: StepSwaps } | undefined, templateId: string, slot: string): StepSwap | undefined {
  return normalizeStepSwaps(model?.stepSwaps)?.[templateId]?.[slot];
}

// Zet de plekken van een training op een nieuwe stand. `undefined` haalt de stap weg (terug naar het sjabloon).
// Alles in één keer: de aanroeper schrijft het resultaat met één opslag, dus het lukt helemaal of niet.
export function withStepSwapsSet<M extends { stepSwaps?: StepSwaps }>(model: M | undefined, changes: readonly { templateId: string; slot: string; swap: StepSwap | undefined }[]): M {
  const base = (model ?? {}) as M;
  const all: StepSwaps = Object.fromEntries(Object.entries(normalizeStepSwaps(base.stepSwaps) ?? {}).map(([t, s]) => [t, { ...s }]));
  for (const c of changes) {
    const slots = { ...(all[c.templateId] ?? {}) };
    const swap = c.swap ? swapValue(c.swap) : undefined;
    if (swap) slots[c.slot] = swap;
    else delete slots[c.slot];
    if (Object.keys(slots).length > 0) all[c.templateId] = slots;
    else delete all[c.templateId];
  }
  return { ...base, stepSwaps: Object.keys(all).length > 0 ? all : undefined };
}

// "Terug naar ... in je plan" in het blad van een oefening: de plek volgt weer het sjabloon. Logs blijven zoals ze zijn.
export function withoutStepSwap<M extends { stepSwaps?: StepSwaps }>(model: M | undefined, templateId: string, slot: string): M {
  return withStepSwapsSet(model, [{ templateId, slot, swap: undefined }]);
}
