// ASCEND: de soort van een training voor Hoeveel per soort (data/trainingKinds.ts), via de rol van het
// sjabloon, en de duur met Minder of Meer. Los van engine/kindAmount.ts, zodat de duurberekening
// (engine/substitutions.ts) het kan lezen zonder de weekcheck mee te halen. Puur.

import { KIND_AMOUNT_FACTOR, TRAINING_KINDS, type KindAmount, type TrainingKindId } from '../data/trainingKinds';
import { defaultRolesOf } from '../data/templateRoles';
import type { SessionTemplate, TemplateRole } from '../models/training';
import { templateSport } from './sports';
import { hasRole, isTestOrRace } from './templateRoles';

// Een opgeslagen sjabloon van voor de rollen 'strength' en 'ruck' kent ze nog niet: dan de rollen van zijn id.
function carries(t: SessionTemplate, role: TemplateRole): boolean {
  return hasRole(t, role) || defaultRolesOf(t.id).includes(role);
}

// De soort van een sjabloon, of undefined (rust, een test, een wedstrijd, een sport die alleen meetelt).
export function trainingKindOf(t: SessionTemplate): TrainingKindId | undefined {
  if (t.type === 'recovery' || t.countedSport || isTestOrRace(t)) return undefined;
  if (t.type === 'strength' || carries(t, 'strength')) return 'strength';
  for (const k of TRAINING_KINDS) {
    if (k.id === 'strength' || k.id === 'cycling' || !k.role) continue;
    if (carries(t, k.role)) return k.id;
  }
  if (templateSport(t) === 'cycling') return 'cycling';
  if (templateSport(t) === 'running') return 'easy';
  return undefined;
}

const round5 = (n: number) => Math.round(n / 5) * 5;

// De duur met Minder of Meer, afgerond op 5 minuten en nooit onder 15. `cap`: de sessiepiek (110 procent van
// de langste van dat sjabloon in 30 dagen), als die bekend is.
export function scaledMinutes(minutes: number, amount: KindAmount | undefined, cap?: number): number {
  if (!amount) return minutes;
  const scaled = Math.max(15, round5(minutes * KIND_AMOUNT_FACTOR[amount]));
  return amount === 'more' && cap !== undefined ? Math.max(minutes, Math.min(scaled, cap)) : scaled;
}

