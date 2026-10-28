// ASCEND: een rustige loop en beenkracht op twee dagen achter elkaar, in elke volgorde,
// is bewust toegestaan (scheduler.ts#legSpacingDays geeft 0). Dat valt op in Week omdat
// beide zware benen zijn en er toch geen melding staat. Hier wordt per training gezegd of hij
// de tweede van zo'n paar is, met een korte rijtekst en een zin voor het actieblad.
//
// Alleen informatie: dit verandert niets aan de planning en is geen melding. Dezelfde regel
// als de planning: legSpacingDays === 0 en findHeavyConflicts vindt geen botsing met de eerste.
// Een harde loop, een test, een wedstrijd, een bergtocht en twee krachttrainingen vallen er dus buiten.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { daysBetween } from '../utils/dates';
import { findHeavyConflicts, isHardRun, isLegHeavyTemplate, legSpacingDays } from './scheduler';
import { isTestOrRace } from './templateRoles';

export type AllowedPairKind = 'run-after-strength' | 'strength-after-run';

export interface AllowedPair {
  // De eerste van het paar.
  withId: string;
  kind: AllowedPairKind;
  // Kort, voor de rij in Week.
  rowNote: string;
  // Het feit met de reden, voor het actieblad, en de bron daarbij.
  sheetText: string;
  source: string;
}

const MORNING = "Voel je 's ochtends spierpijn, dan stelt ASCEND voor om een dag later te gaan.";

const TEXT: Record<AllowedPairKind, Pick<AllowedPair, 'rowNote' | 'sheetText' | 'source'>> = {
  'run-after-strength': {
    rowNote: 'mag na beenkracht',
    sheetText: `Een rustige loop mag de dag na beenkracht. Hij vraagt vooral uithouding en je spieren krijgen er weinig extra schade bij. ${MORNING}`,
    source: 'Bron: Burt, Doma en Connor 2023. Onder 75% van je maximale zuurstofopname was het effect van beenkracht op de loopeconomie verwaarloosbaar (bewijs: matig).',
  },
  'strength-after-run': {
    rowNote: 'mag na rustige loop',
    sheetText: `Beenkracht mag de dag na een rustige loop. Zo'n loop is vooral volume en na een dag heb je je kracht weer terug. ${MORNING}`,
    source: 'Bron: Sporer en Wenger 2003. Na een duurtraining was de beenkracht na 24 uur weer op niveau (bewijs: zwak tot matig).',
  },
};

// Een rustige loop is wat legSpacingDays naast beenkracht op 0 zet (laag-intensieve loop), geen harde loop en geen test of wedstrijd.
const isEasyRun = (t: SessionTemplate): boolean => t.type !== 'strength' && legSpacingDays(t, { ...t, type: 'strength' }) === 0 && !isHardRun(t) && !isTestOrRace(t);
const isLegStrength = (t: SessionTemplate): boolean => t.type === 'strength' && isLegHeavyTemplate(t);

// Per training-id de tweede van een toegestaan paar, over alle gegeven trainingen (ook over de weekgrens).
export function allowedPairs(
  sessions: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[] = [],
): Map<string, AllowedPair> {
  const templateMap = new Map(templates.map((t) => [t.id, t]));
  const live = sessions.filter((s) => s.status !== 'skipped' && templateMap.has(s.templateId));
  const out = new Map<string, AllowedPair>();
  for (const second of live) {
    const tSecond = templateMap.get(second.templateId)!;
    const kind: AllowedPairKind | undefined = isEasyRun(tSecond) && isLegHeavyTemplate(tSecond)
      ? 'run-after-strength'
      : isLegStrength(tSecond) ? 'strength-after-run' : undefined;
    if (!kind) continue;
    const first = live.find((f) => {
      if (f.id === second.id || daysBetween(f.scheduledDate, second.scheduledDate) !== 1) return false;
      const tFirst = templateMap.get(f.templateId)!;
      const fits = kind === 'run-after-strength' ? isLegStrength(tFirst) : isEasyRun(tFirst) && isLegHeavyTemplate(tFirst);
      return fits && legSpacingDays(tFirst, tSecond) === 0;
    });
    if (!first) continue;
    // Dezelfde toets als de planning: de tweede mag niet botsen met de eerste.
    const clash = findHeavyConflicts(second.id, tSecond, second.scheduledDate, live, templateMap, logs);
    if (clash.some((c) => c.id === first.id)) continue;
    out.set(second.id, { withId: first.id, kind, ...TEXT[kind] });
  }
  return out;
}
