// ASCEND: krachttraining aan of uit (besluit 2026-11-14-keuzes-avond.md, punt 3; backlog Q). Het advies is aan:
// kracht in je benen en romp maakt een lange afdaling met rugzak lichter en houdt je knieën heel. Uit mag. Dan
// komt er geen krachttraining meer in je planning (ook geen eigen gewicht zonder sportschool) en houdt je week
// lopen en rust. Een andere keuze is altijd een voorstel met Akkoord (components/settings/usePlanSettingChange.tsx).
//
// Puur: geen React, geen IndexedDB.

import type { SessionTemplate } from '../models/training';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import { activeStrengthStrategy } from './strengthProgram';

// Absent is aan (het advies); alleen `false` zet het uit.
export function strengthTrainingOn(s: { strengthTraining?: unknown }): boolean {
  return s.strengthTraining !== false;
}

// Elke krachttraining, ook eigen gewicht zonder sportschool (templateRoles.ts#isGymStrengthTemplate is alleen de sportschool).
export function isStrengthTemplate(template: Pick<SessionTemplate, 'type'>): boolean {
  return template.type === 'strength';
}

// Mag deze training in je planning komen, met kracht aan of uit?
export function strengthAllows(template: Pick<SessionTemplate, 'type'>, s: { strengthTraining?: unknown }): boolean {
  return strengthTrainingOn(s) || !isStrengthTemplate(template);
}

// De waarschuwing bij uitzetten: één zin waarom kracht helpt, het droge feit eerst.
export const STRENGTH_OFF_WARNING = 'Kracht helpt bij bergtochten: sterke benen en romp vangen de klappen van het dalen op en sparen je knieën.';

// De rij Krachtblok op Ascend (pages/Ascend.tsx). Met kracht uit plant de planning geen kracht (strengthAllows), dus
// een nieuw blok maken is een dode weg: zonder actief blok en zonder krachtschema buiten ASCEND staat de rij er niet.
// Loopt er nog een blok of houd je kracht elders bij, dan blijft hij, zodat je het blok kunt beëindigen, en zegt hij
// dat kracht uit staat (Pathfinder weekbudget, punt 2).
export function strengthBlockRowLine(
  s: { strengthTraining?: unknown },
  strategies: StrengthProgramStrategy[],
  external: boolean,
): string | undefined {
  if (strengthTrainingOn(s)) return 'Hoe kracht in je week past';
  return activeStrengthStrategy(strategies) || external ? 'Kracht staat uit in je planning' : undefined;
}
