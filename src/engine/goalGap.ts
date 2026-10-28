// ASCEND, het gat naar een doel in weken realistisch werk.
//
// Een tijdsverhouding (45:00 tegen 55:40 is 81%) maakt een gat van 19% in tijd klein, terwijl
// prestatie ongeveer een half procent per week groeit. Daarom rekent een prestatiemeter het gat om
// in weken werk (W) bij gemiddelde groei, en vult de meter zich volgens één kromme:
//
//   vulling = HALF_WEEKS / (HALF_WEEKS + W)     100% bij 0 weken, 50% bij 10, 25% bij 30
//
// De meter, de haalbaarheidsregel en "Hier is nog het meeste te winnen" lezen dezelfde W.
// Capaciteitsmeters (afstand, volume, rugzak) blijven een breuk best gedeeld door nodig.
//
// Puur: geen React, geen opslag. Besluit: docs/beslissingen/2026-10-28-klaar-voor-je-doel-logisch.md.

import { HALF_WEEKS } from '../data/goalGrowth';

export interface WeeksOfWorkInput {
  // Waar je nu staat en wat het doel vraagt, in dezelfde eenheid (minuten, kilo, vermogen).
  now: number;
  need: number;
  // Bij een tijd is lager beter; bij vermogen of een geschat maximum hoger.
  lowerIsBetter: boolean;
  // Gemiddelde groei per week als breuk (0,0055).
  weeklyGain: number;
}

// Weken werk bij gemiddelde groei. 0 als je het doel al haalt of de invoer niet te rekenen is.
export function weeksOfWork({ now, need, lowerIsBetter, weeklyGain }: WeeksOfWorkInput): number {
  if (!(now > 0) || !(need > 0) || !(weeklyGain > 0) || weeklyGain >= 1) return 0;
  if (lowerIsBetter) return now > need ? Math.log(now / need) / -Math.log(1 - weeklyGain) : 0;
  return need > now ? Math.log(need / now) / Math.log(1 + weeklyGain) : 0;
}

// Hoe vol een meter staat bij W weken werk (0 tot 1). Nooit 0 zolang er iets gemeten is.
export function fillFromWeeks(weeks: number): number {
  const w = Math.max(0, weeks);
  return HALF_WEEKS / (HALF_WEEKS + w);
}

export interface GapMeter {
  key: string;
  share: number;
}

// De meter met het grootste gewogen gat: gewicht maal (1 min vulling), dus de meter die het meeste
// procentpunten aan het getal kost. Zonder gewichten (of bij gelijke) is dat de laagste meter.
// Een meter zonder gewicht (0) of die vol is komt niet in aanmerking.
export function weightedGapWeakest<T extends GapMeter>(meters: T[], weightOf: (m: T) => number = () => 1): T | undefined {
  let best: T | undefined;
  let bestGap = 0;
  for (const m of meters) {
    const gap = weightOf(m) * (1 - m.share);
    if (m.share < 1 && gap > bestGap) { best = m; bestGap = gap; }
  }
  return best;
}
