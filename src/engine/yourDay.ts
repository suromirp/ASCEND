// ASCEND: "Je dag" op Vandaag: wat er morgen komt, in één regel.
//
// Pure: no React, no IndexedDB.

import type { Program } from '../models/program';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { resolveEffectiveFullDuration } from './substitutions';
import { addDays } from '../utils/dates';

export interface TomorrowEntry {
  kind: 'training' | 'rest' | 'none';
  name?: string;
  minutes?: number;
}

// De eerste training van morgen; een rustdag alleen als er niets anders is.
// Wat is overgeslagen telt niet mee, net als op de Vandaag-kaart zelf.
export function tomorrowEntry(
  today: string,
  planned: PlannedSession[],
  templateById: Map<string, SessionTemplate>,
  program: Program | null | undefined,
): TomorrowEntry {
  const date = addDays(today, 1);
  const tomorrow = planned
    .filter((s) => s.scheduledDate === date && s.status !== 'skipped')
    .sort((a, b) => a.order - b.order);
  const training = tomorrow.find((s) => templateById.get(s.templateId)?.type !== 'recovery');
  const template = training ? templateById.get(training.templateId) : undefined;
  if (training && template) {
    return { kind: 'training', name: template.name, minutes: resolveEffectiveFullDuration(template, date, program) };
  }
  if (tomorrow.length > 0) return { kind: 'rest' };
  return { kind: 'none' };
}

// "Bovenlichaam B, 60 min", "Rustdag, wandelen mag", "Niets gepland".
export function tomorrowText(entry: TomorrowEntry): string {
  if (entry.kind === 'training') return `${entry.name}, ${entry.minutes} min`;
  if (entry.kind === 'rest') return 'Rustdag, wandelen mag';
  return 'Niets gepland';
}

// De stand van een trainingsregel in "Je dag": gedaan, overgeslagen (gedimd, dus
// niet te verwarren met iets dat nog moet), de training van nu, of nog te doen.
export type TrainingRowState = 'done' | 'skipped' | 'now' | 'todo';

export function trainingRowState(status: string, isPrimary: boolean): TrainingRowState {
  if (status === 'completed') return 'done';
  if (status === 'skipped') return 'skipped';
  return isPrimary ? 'now' : 'todo';
}
