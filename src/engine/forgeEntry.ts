// De regel op de ingangskaart van Forge op Je stand: een droog feit over jouw kracht, met de vaste
// uitleg als terugval (docs/visie/Forge vinden en kaarten ordenen.md). Puur.

import { compareExercise, type ForgePoint } from './forgeHistory';

export const FORGE_FALLBACK_LINE = 'Je krachttraining: vooruitgang per oefening en het voorstel voor de volgende keer.';
export const FORGE_OFF_LINE = 'Kracht meerekenen staat uit.';
export const FORGE_NO_DATA_LINE = 'Nog geen krachttrainingen ingelezen uit MacroFactor.';
// Zonder koppeling met MacroFactor (profielen 14 november, punt I): de sets komen uit Forge.
export const FORGE_NO_SETS_LINE = 'Nog geen krachttraining met sets. Na je eerste training in Forge staat hier je vooruitgang.';

type ForgeEntryState = 'off' | 'empty' | 'rising' | 'steady' | 'unknown';

export interface ForgeEntryInput {
  enabled: boolean;
  // De punten per oefening (forgePoints), oudste eerst.
  series: ForgePoint[][];
  // Hoeveel oefeningen een voorstel voor de volgende training hebben.
  proposals: number;
  today: string;
  // Het verste vergelijkingsmoment in weken (het tweede van de instelling, standaard 8).
  weeks: number;
  // Of MacroFactor gekoppeld is; zonder koppeling noemt de lege regel MacroFactor niet.
  macroFactor?: boolean;
}

export interface ForgeEntry {
  state: ForgeEntryState;
  line: string;
}

export function forgeEntryLine(input: ForgeEntryInput): ForgeEntry {
  if (!input.enabled) return { state: 'off', line: FORGE_OFF_LINE };
  const filled = input.series.filter((p) => p.length > 0);
  if (filled.length === 0) return { state: 'empty', line: input.macroFactor ? FORGE_NO_DATA_LINE : FORGE_NO_SETS_LINE };
  let rising = 0;
  let compared = 0;
  for (const points of filled) {
    const cmp = compareExercise(points, input.today, [input.weeks]);
    const m = cmp.moments[0];
    if (m?.status !== 'ok' || m.change === undefined) continue;
    compared += 1;
    if (m.change > 0) rising += 1;
  }
  const proposal = input.proposals > 0 ? ' Voor je volgende training staat een voorstel klaar.' : '';
  if (rising > 0) {
    const what = rising === 1 ? '1 oefening ging' : `${rising} oefeningen gingen`;
    return { state: 'rising', line: `${what} omhoog in ${input.weeks} weken.${proposal}` };
  }
  if (compared > 0) return { state: 'steady', line: `Geen oefening ging omhoog in ${input.weeks} weken.${proposal}` };
  return { state: 'unknown', line: FORGE_FALLBACK_LINE };
}
