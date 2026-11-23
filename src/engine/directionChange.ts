// ASCEND: wat een voorstel zegt als je een richting kiest zonder doel (docs/visie/Zonder doel.md,
// 2.1 en 3.5). De planning zelf komt uit de gewone planningsronde (storage/horizonPlan.ts); dit
// zijn alleen de regels erboven. Puur: geen React, geen IndexedDB.

import { DIRECTIONS, GUIDELINE_MINUTES, GUIDELINE_STRENGTH, type DirectionId } from '../data/directions';
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

const ORDINAL: Record<number, string> = { 2: 'tweede', 3: 'derde', 4: 'vierde', 5: 'vijfde', 6: 'zesde', 7: 'zevende' };

// Wat het plan echt heeft (I-14, docs/visie/Ontwerp Eén plan.md vraag 2): de tekst volgt het plan. `strength` is het
// aantal krachtdagen in de week van het plan; `days` en `fitsWith` (het aantal dagen waarmee het budget past) alleen
// als het verschilt van wat de richting vraagt.
export interface PlannedStrength {
  strength: number;
  days?: number;
  fitsWith?: number;
}

function strengthPart(budget: number, planned: PlannedStrength | undefined): string {
  if (!planned || planned.strength === budget) return `${budget} keer kracht`;
  const fits = planned.fitsWith === undefined ? ''
    : planned.days !== undefined && planned.fitsWith === planned.days + 1 && ORDINAL[planned.fitsWith] ? `, met een ${ORDINAL[planned.fitsWith]} dag past het`
    : `, met ${planned.fitsWith} dagen per week past het`;
  return `${planned.strength} keer kracht; je richting vraagt ${budget}${planned.strength < budget ? fits : ''}`;
}

// Onder de richtlijn is een keuze. Noemt de zin twee getallen voor kracht (het plan en de richting), dan zegt hij welk
// getal onder de richtlijn ligt, anders slaat "Dat" op het verkeerde (Warden, 23 november).
function guidelineLine(week: string, budget: { minutes: number; strength: number }, on: boolean, planned: PlannedStrength | undefined): string {
  if (!planned || planned.strength === budget.strength || !on) return belowGuideline(budget, on) ? `${week} Dat is onder de richtlijn, en dat mag een keuze zijn.` : week;
  const below = [
    ...(budget.minutes < GUIDELINE_MINUTES ? [`${budget.minutes} minuten`] : []),
    ...(planned.strength < GUIDELINE_STRENGTH ? [`${planned.strength} keer kracht`] : []),
  ];
  if (below.length === 0) return week;
  return `${week} Met ${below.join(' en ')} zit je onder de richtlijn, en dat mag een keuze zijn.`;
}

// Met krachttraining uit (engine/strengthTraining.ts) telt het budget geen kracht: dan noemen de zinnen alleen minuten en lopen.
// `planned`: het eerste voorstel noemt het aantal krachtdagen van het plan, en het budget apart als dat anders is.
export function directionChangeLines(id: DirectionId, settings: { weekBudget?: unknown; strengthTraining?: unknown }, planned?: PlannedStrength): string[] {
  const on = strengthTrainingOn(settings);
  const budget = budgetFor(id, { choice: resolveWeekBudget(settings.weekBudget) });
  const week = on ? `Je week: ${budget.minutes} minuten en ${strengthPart(budget.strength, planned)}.` : `Je week: ${budget.minutes} minuten.`;
  return [
    `Richting: ${DIRECTIONS[id].label}.`,
    guidelineLine(week, budget, on, planned),
    // Met kracht uit staat kracht niet voorop: Sterker worden zegt dan alleen wat de duur doet.
    !on && id === 'stronger' ? 'De duur loopt rustig mee en is elke vierde week wat korter.' : WHAT_IT_DOES[id],
    'Geen bergtocht en geen rugzak, tot je een tocht als doel kiest.',
    on ? 'Je week bestaat uit kracht en lopen. Andere sporten die je doet tellen straks gewoon mee.' : 'Je week bestaat uit lopen. Andere sporten die je doet tellen straks gewoon mee.',
  ];
}
