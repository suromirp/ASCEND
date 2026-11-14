// ASCEND: één teller voor hoogtemeters, voor een geplande lijn en voor wat je liep.
// Pure: geen React, geen IndexedDB, geen netwerk.
// Zie docs/beslissingen/2026-11-12-hoogtemeters-stap-1.md en docs/onderzoek/Hoogtemeters met precisie.md.
//
// De teller werkt met echte hysterese: hij onthoudt het laagste punt sinds de laatste top en het
// hoogste punt sinds het laatste dal. Een klim telt zodra hij de drempel haalt, en dan van het
// echte dal tot de echte top; er gaat geen drempel per klim verloren. Wat onder de drempel heen
// en weer gaat is ruis en telt niet.

import { isNum } from '../utils/guards';

// Waar de hoogtes vandaan komen. `mountain` is een model van 30 m in de bergen.
export type ElevationSource = 'watch' | 'lidar' | 'model30' | 'mountain';

// De drempel per bron, in meters. Horloge met barometer 2 m; Lidar-maaiveld 2 m (na gladmaken
// over ongeveer 30 m, dat komt met de bron zelf in stap 2); een model van 30 m (BRouter, Valhalla)
// 5 m; hetzelfde model in de bergen 10 m.
export const ELEVATION_THRESHOLD_M: Record<ElevationSource, number> = { watch: 2, lidar: 2, model30: 5, mountain: 10 };

// Onder dit totaal weet niemand het op 20 m na: dan heet het "vrijwel vlak" en staat er geen getal.
export const NEARLY_FLAT_M = 40;

// Ligt er op een lijn uit een model van 30 m zoveel tussen het laagste en het hoogste punt, dan
// telt hij als bergen (eigen aanname; heuvels zijn in het onderzoek 20 tot 100 m per klim).
export const MOUNTAIN_RELIEF_M = 300;

// Het merk van deze teller op een log (`detail.counter`, `runDetail.counter`). Een log zonder merk
// is geteld met de oude dode band van 5 m, die tien meter per klim en afdaling verloor. Een regel
// met een grens op de eigen stijging leest het merk en kiest de grens die bij de telling hoort
// (`climbLimitFor` hieronder; nooit zelf `counter === 2` vergelijken).
// Besluit: docs/beslissingen/2026-11-12-hoogtemeters-teller-op-log.md.
export const ELEVATION_COUNTER = 2;

// Het merk zoals een regel het leest. Geen merk (of iets dat geen heel getal vanaf 2 is) is de oude
// telling: `undefined`. Het merk van deze app is `ELEVATION_COUNTER`. Een hoger heel getal is een
// telling van een nieuwere app dan deze (een back-up die terugkomt in een oudere versie): die is
// niet oud en niet de onze. Besluit: docs/beslissingen/2026-11-14-hoogtemeters-na-stap-1.md.
export function counterMark(counter: unknown): number | undefined {
  return typeof counter === 'number' && Number.isInteger(counter) && counter >= ELEVATION_COUNTER ? counter : undefined;
}

// Een grens op de eigen stijging, voor de telling van het veld waaruit geteld wordt: `old` voor
// een log zonder merk, `counted` voor het merk van deze app. Een nieuwer merk dan de app kent
// krijgt de strengste (laagste) van de twee: de app weet niet hoe die telling uitvalt, dus heet
// zo'n log eerder heuvelachtig dan ten onrechte vlak.
export function climbLimitFor(counter: unknown, limits: { old: number; counted: number }): number {
  const mark = counterMark(counter);
  if (mark === undefined) return limits.old;
  if (mark === ELEVATION_COUNTER) return limits.counted;
  return Math.min(limits.old, limits.counted);
}

// Twee eigen tellingen zijn alleen naast elkaar te leggen als ze op dezelfde manier geteld zijn:
// allebei zonder merk, of allebei met precies hetzelfde merk.
export function sameCounter(a: unknown, b: unknown): boolean {
  return counterMark(a) === counterMark(b);
}

type Reading = number | null | undefined;

export const isNearlyFlat = (ascentM: number): boolean => !(ascentM >= NEARLY_FLAT_M);

// De keerpunten van een lijn: een been telt pas als het minstens `threshold` tegen het vorige
// been in gaat. Het eerste keerpunt is het dal (of de top) waar het eerste been begon, het laatste
// het uiterste van het laatste been.
export function turningPoints(y: number[], threshold: number): number[] {
  if (y.length < 2) return [];
  const turning: number[] = [];
  let dir: 0 | 1 | -1 = 0;
  let minI = 0;
  let maxI = 0;
  let ext = 0;
  for (let k = 1; k < y.length; k++) {
    if (dir === 0) {
      if (y[k] < y[minI]) minI = k;
      if (y[k] > y[maxI]) maxI = k;
      // Strikt hoger of lager: bij een drempel van nul is een gelijke of juist lagere meting geen klim.
      if (y[k] > y[minI] && y[k] - y[minI] >= threshold) {
        dir = 1;
        turning.push(minI);
        ext = k;
      } else if (y[k] < y[maxI] && y[maxI] - y[k] >= threshold) {
        dir = -1;
        turning.push(maxI);
        ext = k;
      }
    } else if (dir === 1) {
      if (y[k] > y[ext]) ext = k;
      else if (y[ext] - y[k] >= threshold) {
        turning.push(ext);
        dir = -1;
        ext = k;
      }
    } else {
      if (y[k] < y[ext]) ext = k;
      else if (y[k] - y[ext] >= threshold) {
        turning.push(ext);
        dir = 1;
        ext = k;
      }
    }
  }
  if (dir !== 0) turning.push(ext);
  return turning;
}

// Een drempel die geen getal is of onder nul ligt telt als nul (dan telt elke stap).
const safe = (thresholdM: number) => (isNum(thresholdM) && thresholdM > 0 ? thresholdM : 0);

// Stijging en daling van een reeks hoogtes, in meters. Een meting die geen getal is (een gat, NaN)
// doet niet mee: de teller gaat verder bij de volgende meting.
export function climbAndDescent(values: readonly Reading[], thresholdM: number): { ascentM: number; descentM: number } {
  const y = values.filter(isNum);
  const turning = turningPoints(y, safe(thresholdM));
  let ascentM = 0;
  let descentM = 0;
  for (let q = 1; q < turning.length; q++) {
    const d = y[turning[q]] - y[turning[q - 1]];
    if (d > 0) ascentM += d;
    else descentM -= d;
  }
  return { ascentM, descentM };
}

// Dezelfde telling als een lijn, even lang als de reeks: de som van alle stappen omhoog is de
// stijging van `climbAndDescent`, de som van alle stappen omlaag de daling. Zo is een klim te
// verdelen over kilometers of stukken zonder dat de delen iets anders optellen dan het geheel.
// Binnen een klim loopt de lijn alleen omhoog (een dipje onder de drempel is vlak), binnen een
// afdaling alleen omlaag. Een gat houdt de laatste waarde vast; een reeks zonder metingen is nul.
export function hysteresisLine(values: readonly Reading[], thresholdM: number): number[] {
  const out: number[] = new Array(values.length).fill(0);
  const at: number[] = [];
  const y: number[] = [];
  values.forEach((v, i) => {
    if (isNum(v)) {
      at.push(i);
      y.push(v);
    }
  });
  if (y.length === 0) return out;
  const turning = turningPoints(y, safe(thresholdM));
  // De lijn op de metingen zelf.
  const line: number[] = new Array(y.length).fill(turning.length > 0 ? y[turning[0]] : y[0]);
  for (let q = 1; q < turning.length; q++) {
    const a = turning[q - 1];
    const b = turning[q];
    const up = y[b] > y[a];
    let level = y[a];
    for (let k = a; k <= b; k++) {
      level = up ? Math.max(level, y[k]) : Math.min(level, y[k]);
      line[k] = level;
    }
  }
  // Na het laatste keerpunt telt niets meer: de lijn blijft daar staan.
  if (turning.length > 0) {
    const last = turning[turning.length - 1];
    for (let k = last + 1; k < y.length; k++) line[k] = y[last];
  }
  // Terug naar de lengte van de reeks: een gat houdt de laatste waarde, een gat vooraan de eerste.
  let m = 0;
  for (let i = 0; i < values.length; i++) {
    while (m + 1 < at.length && at[m + 1] <= i) m++;
    out[i] = line[m];
  }
  return out;
}

// Een horloge schrijft elke seconde een hoogte op. Een losse meting kan een meter of meer
// springen zonder dat je stijgt; over dit venster (in seconden, gecentreerd) wordt de reeks eerst
// gemiddeld, zodat een sprong van één seconde nooit op zichzelf de drempel haalt.
export const WATCH_SMOOTH_SEC = 30;

// Lopend gemiddelde over een venster in de tijd, gecentreerd. Een gat blijft een gat en telt niet
// mee in het gemiddelde van zijn buren; metingen aan de andere kant van een pauze vallen buiten
// het venster. De tijden lopen op en zijn getallen (de aanroepers bewaken dat); is er toch één geen
// getal, dan wordt er niet gladgemaakt en gaat de reeks ongewijzigd door, met een gat waar geen meting is.
export function smoothOverTime(values: readonly Reading[], timesSec: readonly number[], windowSec: number): (number | null)[] {
  const n = values.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (timesSec.length < n || !timesSec.every(isNum) || !(windowSec > 0)) return values.map((v) => (isNum(v) ? v : null));
  const half = windowSec / 2;
  let lo = 0;
  let hi = 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    while (hi < n && timesSec[hi] <= timesSec[i] + half) {
      const v = values[hi];
      if (isNum(v)) {
        sum += v;
        count++;
      }
      hi++;
    }
    while (lo < i && timesSec[lo] < timesSec[i] - half) {
      const v = values[lo];
      if (isNum(v)) {
        sum -= v;
        count--;
      }
      lo++;
    }
    if (isNum(values[i]) && count > 0) out[i] = sum / count;
  }
  return out;
}

// De hoogtelijn van een horloge zoals de teller hem ziet: eerst gladgemaakt over 30 seconden,
// dan geteld met de drempel van het horloge. Voor het profiel, de kilometers en het inkorten.
export function watchLine(values: readonly Reading[], timesSec: readonly number[]): number[] {
  return hysteresisLine(smoothOverTime(values, timesSec, WATCH_SMOOTH_SEC), ELEVATION_THRESHOLD_M.watch);
}

// De drempel voor een lijn uit een model van 30 m: 5 m, en 10 m als de lijn door de bergen gaat.
export function modelThresholdM(elevations: readonly Reading[]): number {
  let low = Infinity;
  let high = -Infinity;
  for (const e of elevations) {
    if (!isNum(e)) continue;
    if (e < low) low = e;
    if (e > high) high = e;
  }
  return high - low >= MOUNTAIN_RELIEF_M ? ELEVATION_THRESHOLD_M.mountain : ELEVATION_THRESHOLD_M.model30;
}
