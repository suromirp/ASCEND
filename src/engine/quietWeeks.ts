// ASCEND: de rustige weken rond een dag, als feit voor de ene regel (engine/dayRules.ts, oorzaak `eased`, I-67).
// Een rustige instap waar je Akkoord op gaf (engine/reentry.ts) en de lichte week van een golf in het programma
// (engine/programLayout.ts#waveWeek, die een overgeslagen rustweek al kent). Daarin komt er niets bij en geen set tot
// bijna falen. Puur: geen React, geen opslag.

import { phaseWaveLength, type Program } from '../models/program';
import { addDays, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import type { EasedRange } from './dayRules';
import { PHASE_TAPER, waveWeek } from './programLayout';
import { reentryAdjustments } from './reentry';

// De weken van `around` en de week erna.
export function quietWeeks(input: { program?: Program | null; reentryWeeks?: unknown; around: string }): EasedRange[] {
  const out: EasedRange[] = reentryAdjustments(input.reentryWeeks).map((w) => ({ from: w.from, until: w.until }));
  if (input.program) {
    for (const monday of [mondayOfWeek(input.around), addDays(mondayOfWeek(input.around), 7)]) {
      const position = resolveProgramWeek(input.program, monday);
      if (!position || position.phase.id === PHASE_TAPER || position.phase.wave?.light === false) continue;
      if (waveWeek(position) === phaseWaveLength(position.phase)) out.push({ from: monday, until: addDays(monday, 6) });
    }
  }
  return out;
}
