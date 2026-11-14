// ASCEND: een opwarmset later in de training, die vaak overbodig is (leg press na squat en deadlift).
// Pure functies; geen React, geen opslag. Besluit: docs/beslissingen/2026-11-14-opwarmset-later.md.
//
// Kort. Forge geeft een oefening op hetzelfde bewegingspatroon als een oefening ervoor, op een lichaamsdeel dat al
// warm is, één aanloopset ('ramp' in engine/warmup.ts). Die set blijft staan, maar gedempt en met één zin waarom:
// afvinken telt als opwarmset, laten liggen telt niet als gemist en nergens mee (opwarmsets tellen nooit als
// werkset, engine/workSets.ts#isWorkSet). Een nieuwe spiergroep of een nieuw patroon krijgt geen zin en geen
// demping. Met Opwarmen per oefening krijgt elke samengestelde oefening de volle opbouw: dan is er niets te dempen.

import type { Exercise } from '../models/exercise';
import type { WarmupScope } from './strengthSettings';
import { isCompound, newWarmState, noteWorked, warmupKind, type WarmKind, type WarmState } from './warmup';

// De naam van de oefening die deze opwarmset al deed, of undefined als de opwarmset gewoon nodig is.
// `kind` is wat Forge voor deze oefening koos (met de instelling Opwarmen per al meegerekend).
export function warmAlready(exercise: Exercise | undefined, kind: WarmKind, state: WarmState): string | undefined {
  if (!exercise || kind !== 'ramp') return undefined;
  return state.by.get(exercise.pattern);
}

// Hetzelfde, gegeven de oefeningen ervoor in deze training (met de naam zoals op het scherm). Voor tests en voor
// wie geen lopende staat heeft. Een oefening ervoor zonder opwarmsets (`warmed: false`) maakt niets warm.
export function warmAlreadyAfter(exercise: Exercise | undefined, before: { exercise: Exercise; name?: string; warmed?: boolean }[], scope: WarmupScope): string | undefined {
  const state = newWarmState();
  for (const b of before) noteWorked(state, b.exercise, b.warmed ?? true, b.name);
  const kind: WarmKind = scope === 'exercise' && exercise && isCompound(exercise) ? 'full' : warmupKind(exercise, state);
  return warmAlready(exercise, kind, state);
}

// De zin onder de gedempte opwarmset. Het feit eerst, dan wanneer je hem toch doet.
export function warmAlreadyLine(exercise: Pick<Exercise, 'loadsLegs' | 'resistance'> | undefined, from: string): string {
  const part = exercise?.loadsLegs ? 'Je benen zijn' : 'Je bovenlichaam is';
  const machine = exercise?.resistance === 'machine_stack' || exercise?.resistance === 'machine_plates';
  return `${part} warm van de ${from}. Twijfel je over ${machine ? 'de stoel of het gewicht' : 'het gewicht'}, doe hem dan.`;
}

// Staat deze opwarmrij gedempt? Alleen een geplande rij van zo'n oefening (Forge zet `warmAlready` alleen met de
// instelling Opwarmset later dempen aan), nog niet afgevinkt. Afgevinkt is hij gewoon een gedane opwarmset.
export function mutedWarmup(row: { kind: string; warmAlready?: boolean; done: boolean }): boolean {
  return row.kind === 'warmup' && !!row.warmAlready && !row.done;
}

// Rijen die je mag laten liggen: een gedempte opwarmset houdt een oefening of de training niet open.
export function leftAlone(row: { kind: string; warmAlready?: boolean; done: boolean }): boolean {
  return row.done || (row.kind === 'warmup' && !!row.warmAlready);
}
