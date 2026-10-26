import { SPORTS } from './sports';
import type { Discipline } from '../models/disciplines';

// The UI menu of disciplines and their labels, derived from the sport list.
// The type lives in models/disciplines.ts; the values live here so models/
// imports only types.
export const DISCIPLINE_LABEL = Object.fromEntries(SPORTS.map((s) => [s.id, s.disciplineLabel])) as Record<Discipline, string>;

export const DISCIPLINE_OPTIONS = Object.keys(DISCIPLINE_LABEL) as Discipline[];

export function disciplineLabel(discipline: string | undefined): string | undefined {
  if (!discipline) return undefined;
  return DISCIPLINE_LABEL[discipline as Discipline] ?? discipline;
}
