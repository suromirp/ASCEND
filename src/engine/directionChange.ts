// ASCEND: wat een voorstel zegt als je een richting kiest zonder doel (docs/visie/Zonder doel.md,
// 2.1 en 3.5). De planning zelf komt uit de gewone planningsronde (storage/horizonPlan.ts); dit
// zijn alleen de regels erboven. Puur: geen React, geen IndexedDB.

import { DIRECTIONS, type DirectionId } from '../data/directions';
import { belowGuideline, budgetFor, resolveWeekBudget } from './weekBudget';
import { strengthTrainingOn } from './strengthTraining';

export function directionChangeTitle(id: DirectionId): string {
  return `Richting: ${DIRECTIONS[id].label}`;
}

// Wat de richting met je week doet, in een paar zinnen.
const WHAT_IT_DOES: Record<DirectionId, string> = {
  maintain: 'Elke week hetzelfde, en elke vierde week wat lichter.',
  improve: 'Drie weken opbouwen, dan een lichtere week.',
  stronger: 'Kracht staat voorop. De duur loopt rustig mee en is elke vierde week wat korter.',
  easy: 'Elke week hetzelfde en nooit een harde training: de heuvelloop van de zaterdag wordt een herstelloop.',
};

// Met krachttraining uit (engine/strengthTraining.ts) telt het budget geen kracht: dan noemen de zinnen alleen minuten en lopen.
export function directionChangeLines(id: DirectionId, settings: { weekBudget?: unknown; strengthTraining?: unknown }): string[] {
  const on = strengthTrainingOn(settings);
  const budget = budgetFor(id, { choice: resolveWeekBudget(settings.weekBudget) });
  const week = on ? `Je week: ${budget.minutes} minuten en ${budget.strength} keer kracht.` : `Je week: ${budget.minutes} minuten.`;
  return [
    `Richting: ${DIRECTIONS[id].label}.`,
    belowGuideline(budget, on) ? `${week} Dat is onder de richtlijn, en dat mag een keuze zijn.` : week,
    // Met kracht uit staat kracht niet voorop: Sterker worden zegt dan alleen wat de duur doet.
    !on && id === 'stronger' ? 'De duur loopt rustig mee en is elke vierde week wat korter.' : WHAT_IT_DOES[id],
    'Geen bergtocht en geen rugzak, tot je een tocht als doel kiest.',
    on ? 'Je week bestaat uit kracht en lopen. Andere sporten die je doet tellen straks gewoon mee.' : 'Je week bestaat uit lopen. Andere sporten die je doet tellen straks gewoon mee.',
  ];
}
