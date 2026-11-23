// ASCEND: de ladder van heel licht in de planning (docs/visie/Ontwerp beginner rest.md, deel 2; stap 3 van
// docs/visie/Ontwerp beginner heel licht.md). Alleen bij Opbouw van de start op heel licht met jouw Akkoord op de
// ladder (engine/beginnerStart.ts#resolveStartBuild 'ladder'), alleen in de fase Rustig beginnen.
//
// - Kracht: hoogstens de minuten van die week (35, 45, 55, 65); de sets komen in Forge
//   (engine/forgeTimeCap.ts#capWorkSets met startLadderSets).
// - Wandelen en dribbelen: de korte en de lange minuten van die week, op de plek van de rustige en de lange duurloop.
// - De Herstelwandeling: hoogstens zo lang als de korte sessie wandelen en dribbelen van die week (besluit van de
//   coordinator met het advies, keuze 1 van het ontwerp).
// - Na de ladder, in week 5 en 6 bij golven van drie of zes weken: kracht zoals gepland, wandelen en dribbelen en de
//   Herstelwandeling houden de laatste week van de ladder (geen stap terug naar 20 en 30).
//
// Een training met een eigen lengte (PlannedSession.plannedMinutes) houdt die; dat regelt de aanroeper.
// Puur: geen React, geen IndexedDB. Afgeleid, nooit opgeslagen.

import type { Program } from '../models/program';
import type { SessionTemplate } from '../models/training';
import { BEGINNER_LADDER } from '../data/beginnerLadder';
import { beginnerWeek, type BeginnerWeekPlan, type StartBuild } from './beginnerStart';
import { PHASE_GOLF_START, START_STAND_INS } from './programLayout';
import { hasRole, idHasRole } from './templateRoles';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';

export interface StartWeek {
  // De week van de start, vanaf 1.
  week: number;
  // Hoeveel weken de start duurt (4, of 6 bij golven van drie of zes weken).
  weeks: number;
  // De maandag waarop de start begon.
  startsOn: string;
}

// In welke week van de beginnersstart `date` valt, uit de fasen van het programma. Buiten de start niets.
export function startWeekOn(program: Pick<Program, 'startDate' | 'phases'> | null | undefined, date: string): StartWeek | undefined {
  if (!program) return undefined;
  let weeksBefore = 0;
  for (const phase of program.phases) {
    if (phase.id !== PHASE_GOLF_START) {
      weeksBefore += phase.weekCount;
      continue;
    }
    const startsOn = addDays(mondayOfWeek(program.startDate), weeksBefore * 7);
    const week = Math.floor(daysBetween(startsOn, mondayOfWeek(date)) / 7) + 1;
    return week >= 1 && week <= phase.weekCount ? { week, weeks: phase.weekCount, startsOn } : undefined;
  }
  return undefined;
}

// De trede van de ladder voor een week van de start: na de ladder de laatste trede (voor wandelen en dribbelen).
function rungFor(week: number, fullSets?: number): BeginnerWeekPlan | undefined {
  return beginnerWeek(Math.min(week, BEGINNER_LADDER.length), fullSets);
}

// De laatste trede: de maat van de rem na de start (engine/substitutions.ts#plannedAfterStart).
export function lastRung(): BeginnerWeekPlan {
  return beginnerWeek(BEGINNER_LADDER.length)!;
}

// Wandelen en dribbelen op de plek van de lange duurloop: de lange minuten, anders de korte.
export function walkJogMinutes(templateId: string, rung: Pick<BeginnerWeekPlan, 'shortMinutes' | 'longMinutes'>): number {
  const standsFor = START_STAND_INS[templateId] ?? templateId;
  return idHasRole(standsFor, 'long') ? rung.longMinutes : rung.shortMinutes;
}

const isRecoveryWalk = (t: Pick<SessionTemplate, 'id' | 'type' | 'roles'>) => t.type === 'recovery' && !hasRole(t, 'plain_walk');

// Wat de ladder met de lengte van deze training doet op `date`: `set` is de lengte zelf (wandelen en dribbelen),
// `cap` een bovengrens (kracht, de Herstelwandeling). Niets buiten de start, of zonder de ladder.
export function startLadderMinutes(
  template: Pick<SessionTemplate, 'id' | 'type' | 'roles'>,
  date: string,
  program: Pick<Program, 'startDate' | 'phases'> | null | undefined,
  build: StartBuild,
): { set: number } | { cap: number } | undefined {
  if (build !== 'ladder') return undefined;
  const at = startWeekOn(program, date);
  if (!at) return undefined;
  if (template.type === 'strength') {
    const rung = beginnerWeek(at.week);
    return rung ? { cap: rung.strengthMinutes } : undefined;
  }
  const rung = rungFor(at.week)!;
  if (hasRole(template, 'start_only')) return { set: walkJogMinutes(template.id, rung) };
  if (isRecoveryWalk(template)) return { cap: rung.shortMinutes };
  // De Herstelloop (rustig tempo, geen lange duurloop) hoogstens zo lang als de korte sessie.
  if (hasRole(template, 'easy_pace') && !hasRole(template, 'long')) return { cap: rung.shortMinutes };
  return undefined;
}

// De lengte na de ladder: `base` is wat de planning anders zou geven.
export function applyStartLadder(base: number, rule: ReturnType<typeof startLadderMinutes>): number {
  if (!rule) return base;
  return 'set' in rule ? rule.set : Math.min(base, rule.cap);
}

// Hoeveel werksets een krachttraining met `fullSets` werksets in het gewone plan op `date` krijgt, of niets: buiten
// de ladder blijft de training zoals hij is.
export function startLadderSets(
  program: Pick<Program, 'startDate' | 'phases'> | null | undefined,
  date: string,
  build: StartBuild,
  fullSets: number,
): number | undefined {
  if (build !== 'ladder') return undefined;
  const at = startWeekOn(program, date);
  return at ? beginnerWeek(at.week, fullSets)?.strengthSets : undefined;
}
