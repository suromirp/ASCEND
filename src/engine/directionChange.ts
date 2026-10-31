// ASCEND: wat een voorstel zegt als je een richting kiest zonder doel (docs/visie/Zonder doel.md,
// 2.1 en 3.5). De planning zelf komt uit de gewone planningsronde (storage/horizonPlan.ts); dit
// zijn alleen de regels erboven. Puur: geen React, geen IndexedDB.

import { DIRECTIONS, type DirectionId } from '../data/directions';
import { belowGuideline, budgetFor, resolveWeekBudget } from './weekBudget';

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

export function directionChangeLines(id: DirectionId, settings: { weekBudget?: unknown }): string[] {
  const budget = budgetFor(id, { choice: resolveWeekBudget(settings.weekBudget) });
  const week = `Je week: ${budget.minutes} minuten en ${budget.strength} keer kracht.`;
  return [
    `Richting: ${DIRECTIONS[id].label}.`,
    belowGuideline(budget) ? `${week} Dat is onder de richtlijn, en dat mag een keuze zijn.` : week,
    WHAT_IT_DOES[id],
    'Geen bergtocht en geen rugzak, tot je een tocht als doel kiest.',
    'Je week bestaat uit kracht en lopen. Andere sporten die je doet tellen straks gewoon mee.',
  ];
}
