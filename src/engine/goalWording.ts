import type { TrainingGoal } from '../models/goals';
import { mainGoal, type Ladder } from './mainGoal';

// Hoe een tekst het doel noemt: het hoofddoel bij naam, of "je doel" als er
// geen is. Het hoofddoel is het doel waar de planning op draait (`mainGoal`,
// een actief doel eerst). Een lange naam wordt korter via `shortGoalName`, zodat
// de zin op 360 px blijft staan. Alleen tekst, nooit gedrag.
export const GOAL_FALLBACK = 'je doel';
// In een zin mag de naam langer zijn dan in een vakje: de hele naam tot dit aantal tekens, anders tot het laatste
// hele woord dat past, met een beletselteken. Nooit midden in een woord ("richting Lange." was fout, I-163).
export const GOAL_REF_MAX = 28;

export function goalRefName(name: string): string {
  const first = name.split(/\s+[/\u2013\u2014-]\s+/)[0].trim().replace(/\s+/g, ' ');
  if (first.length <= GOAL_REF_MAX) return first;
  let out = '';
  for (const word of first.split(' ')) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > GOAL_REF_MAX) break;
    out = next;
  }
  // Een eerste woord dat al te lang is: dat woord heel laten staan is beter dan het te breken.
  return `${out || first.split(' ')[0]}…`;
}

export function goalRef(goals: readonly Pick<TrainingGoal, 'id' | 'status' | 'name'>[], milestones: Ladder): string {
  const goal = mainGoal(goals, milestones, 'activeFirst');
  const short = goal ? goalRefName(goal.name) : '';
  return short || GOAL_FALLBACK;
}
