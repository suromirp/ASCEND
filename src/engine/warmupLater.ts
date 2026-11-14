// ASCEND: een opwarmset later in de training, die vaak overbodig is (leg press na squat en deadlift).
// Pure functies; geen React, geen opslag. Besluit: docs/beslissingen/2026-11-14-opwarmset-later.md.
//
// Kort. Forge geeft een oefening op hetzelfde bewegingspatroon als een oefening ervoor, op een lichaamsdeel dat al
// warm is, één aanloopset ('ramp' in engine/warmup.ts). Die set blijft staan, maar gedempt en met één zin waarom:
// afvinken telt als opwarmset, laten liggen telt niet als gemist en nergens mee (opwarmsets tellen nooit als
// werkset, engine/workSets.ts#isWorkSet). Een nieuwe spiergroep of een nieuw patroon krijgt geen zin en geen
// demping. Met Opwarmen per oefening krijgt elke samengestelde oefening de volle opbouw: dan is er niets te dempen.
// De zin en de demping lezen wat er is afgevinkt, niet de geplande volgorde (`warmNow`): de bron moet nog op zijn
// plek staan, met dezelfde naam, en minstens één afgevinkte set hebben. Anders is het een gewone opwarmset.

import type { Exercise } from '../models/exercise';
import type { WarmupScope } from './strengthSettings';
import { isCompound, newWarmState, noteWorked, warmupKind, type WarmKind, type WarmSource, type WarmState } from './warmup';

interface Row {
  kind: string;
  warmAlready?: boolean;
  done: boolean;
}
interface Block {
  slot: string;
  name: string;
  rows: Row[];
  warmFrom?: string;
  warmFromSlot?: string;
}

// De oefening die deze opwarmset volgens de planning al deed, of undefined als de opwarmset gewoon nodig is.
// `kind` is wat Forge voor deze oefening koos (met de instelling Opwarmen per al meegerekend).
export function warmAlready(exercise: Exercise | undefined, kind: WarmKind, state: WarmState): WarmSource | undefined {
  if (!exercise || kind !== 'ramp') return undefined;
  return state.by.get(exercise.pattern);
}

// Hetzelfde, gegeven de oefeningen ervoor (met de naam zoals op het scherm); de naam van de bron. Een oefening
// ervoor zonder opwarmsets (`warmed: false`) maakt niets warm.
export function warmAlreadyAfter(exercise: Exercise | undefined, before: { exercise: Exercise; name?: string; warmed?: boolean }[], scope: WarmupScope): string | undefined {
  const state = newWarmState();
  for (const b of before) noteWorked(state, b.exercise, b.warmed ?? true, b.name ? { name: b.name } : undefined);
  const kind: WarmKind = scope === 'exercise' && exercise && isCompound(exercise) ? 'full' : warmupKind(exercise, state);
  return warmAlready(exercise, kind, state)?.name;
}

// Is de bron nu echt gedaan? Alleen als zijn plek nog in de training staat met dezelfde naam (niet geruild) en er
// minstens één set van is afgevinkt. Een concept zonder `warmFromSlot` (van voor deze regel) is gewoon.
export function warmNow(workout: readonly Block[], ex: Block): boolean {
  if (!ex.warmFrom || !ex.warmFromSlot || ex.warmFromSlot === ex.slot) return false;
  const source = workout.find((e) => e.slot === ex.warmFromSlot);
  return !!source && source.name === ex.warmFrom && source.rows.some((r) => r.done);
}

// De zin onder de gedempte opwarmset. Het feit eerst, dan wanneer je hem toch doet.
export function warmAlreadyLine(exercise: Pick<Exercise, 'loadsLegs' | 'resistance'> | undefined, from: string): string {
  const part = exercise?.loadsLegs ? 'Je benen zijn' : 'Je bovenlichaam is';
  const machine = exercise?.resistance === 'machine_stack' || exercise?.resistance === 'machine_plates';
  return `${part} warm van de ${from}. Twijfel je over ${machine ? 'de stoel of het gewicht' : 'het gewicht'}, doe hem dan.`;
}

// Staat deze opwarmrij gedempt? Een geplande rij van zo'n oefening (Forge zet `warmAlready` alleen met de instelling
// Opwarmset later dempen aan), nog niet afgevinkt, en de bron is gedaan (`warm`, uit `warmNow`).
export function mutedWarmup(row: Row, warm: boolean): boolean {
  return warm && row.kind === 'warmup' && !!row.warmAlready && !row.done;
}

// Een rij die je mag laten liggen: gedaan, of een gedempte opwarmset.
export function leftAlone(row: Row, warm: boolean): boolean {
  return row.done || mutedWarmup(row, warm);
}

// Alle rijen van de oefening zijn af (een gedempte opwarmset mag blijven liggen) en er is iets afgevinkt.
export function allTicked(workout: readonly Block[], ex: Block): boolean {
  const warm = warmNow(workout, ex);
  return ex.rows.some((r) => r.done) && ex.rows.every((r) => leftAlone(r, warm));
}

// De hele training is af, op dezelfde manier.
export function workoutLeftAlone(workout: readonly Block[]): boolean {
  return workout.every((e) => {
    const warm = warmNow(workout, e);
    return e.rows.every((r) => leftAlone(r, warm));
  });
}
