// ASCEND, "Klaar voor de GR5": één percentage, met de rekenregel erbij.
//
// De regel (de eigenaar koos "optie B, één percentage", met de zin erbij
// waaruit het bestaat):
//
//   percentage = het gemiddelde van vier meters, elk begrensd op 100%
//
//   1. rugzak:               je zwaarste rugzak op een wandeling, naast het
//                            rugzakdoel van het doel
//   2. langste dag:          je langste wandeldag (tijd op pad), naast wat een
//                            gewone dag op de route kost (loopkilometers met
//                            stijgen en dalen, engine/goalRoute.ts)
//   3. stijging en daling:   je grootste dag omhoog en je grootste dag omlaag,
//                            naast een gewone dag op de route; het gemiddelde van die twee
//   4. dagen achter elkaar:  je langste reeks lange wandeldagen op rij
//
// "Je beste van de laatste acht weken" per meter: dezelfde vergelijking als
// `routeDayRows` (engine/standing.ts), zodat Je stand, Ascend en dit
// percentage nooit een ander getal noemen voor dezelfde dag.
//
// Waarom het gemiddelde en niet het zwakste punt of het aantal kampen: met
// dezelfde gegevens geeft het gemiddelde 45%, het zwakste punt 17% en het
// tellen van kampen 23% (docs/visie/Visuele upgrade en nieuwe ideeën.md, deel 4). Het
// gemiddelde is het enige van de drie dat tegelijk eerlijk is over wat je al
// kunt en elke stap telt: een kilo meer in je rugzak doet het getal omhoog,
// ook als je zwakste punt nog hetzelfde is. Het zwakste punt blijft zichtbaar
// als aparte regel ("Het zwakst: ..."), zodat het gemiddelde niets verbergt.
// De mijlpalen (de kampen) tellen niet mee: dertien stappen zijn niet even
// zwaar, en ze staan als ladder apart.
//
// Eerlijkheidsregels:
// - elke meter is begrensd op 100%: een rugzak van 16 kg bij een doel van 14
//   maakt een ander tekort niet goed;
// - 100% staat er alleen als alle vier de meters vol zijn; een gemiddelde dat
//   op 100 zou afronden terwijl er nog iets mist, blijft 99;
// - een meter zonder eis in het doel (geen rugzakdoel, geen afstand) telt niet
//   mee, en de zin noemt alleen wat meetelt;
// - "dagen achter elkaar" wordt begrensd op wat je thuis kunt oefenen
//   (THUIS_DAGEN_OP_RIJ): het plan oefent twee wandeldagen op rij
//   ("Wandeldag 1 van 2"); de rest van een tocht van zes dagen of meer
//   leer je op de tocht zelf. Zonder die grens kon het getal nooit vol,
//   hoe trouw je het plan ook volgde. De zin en het scherm zeggen dit erbij;
// - het getal zakt als je lange tochten ouder worden dan acht weken: het
//   meet wat je nu kunt, niet wat je ooit deed.
//
// Puur: geen React, geen opslag.

import type { GoalRequirement } from '../models/goals';
import type { SessionLog } from '../models/training';
import { addDays, formatHoursMinutesNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { typicalDayValue } from './goalRoute';
import { routeDayRows, type RouteDayRow } from './standing';

// Hoeveel dagen achter elkaar je thuis oefent (zie hierboven).
export const THUIS_DAGEN_OP_RIJ = 2;
// Het getal vergelijkt met het getal van zoveel dagen terug ("+6 in 4 weken").
export const VERGELIJK_DAGEN = 28;

export type MeterKey = 'rugzak' | 'langsteDag' | 'hoogte' | 'dagen';

// Eén vergelijking binnen een meter: jouw beste naast wat de GR5 vraagt.
export interface MeterPart {
  name: string; // 'rugzak', 'langste dag', 'stijging', 'daling', 'dagen achter elkaar'
  unit: 'kg' | 'min' | 'm' | 'dagen';
  best: number;
  need: number;
  bestDate?: string;
  share: number; // 0 tot 1, begrensd
  text: string; // "9 van 14 kg"
}

export interface Gr5Meter {
  key: MeterKey;
  label: string; // "Rugzak", "Langste dag", "Stijging en daling", "Dagen achter elkaar"
  parts: MeterPart[];
  share: number; // gemiddelde van de delen, 0 tot 1
  text: string; // "9 van 14 kg", "450 en 300 van 1.000 m"
  why: string; // één zin waarom deze meter meetelt
}

export interface Gr5Readiness {
  percent: number; // 0 tot 100
  meters: Gr5Meter[];
  weakest?: Gr5Meter; // de laagste meter, alleen als er nog iets mist
  sentence: string; // waaruit het percentage bestaat
  weakestSentence?: string; // "Het zwakst: dagen achter elkaar, 1 van 2."
  change?: number; // verschil in procentpunten met VERGELIJK_DAGEN dagen terug
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmt(n: number): string {
  return formatNumberNL(n, Number.isInteger(n) ? 0 : 1);
}

function valueText(unit: MeterPart['unit'], n: number): string {
  if (unit === 'min') return formatHoursMinutesNL(n);
  if (unit === 'kg') return `${fmt(n)} kg`;
  if (unit === 'dagen') return `${fmt(n)} ${n === 1 ? 'dag' : 'dagen'}`;
  return `${fmt(n)} m`;
}

function part(name: string, unit: MeterPart['unit'], row: RouteDayRow, need = row.need): MeterPart {
  const best = row.best;
  const share = need > 0 ? clamp01(best / need) : 0;
  // "9 van 14 kg": de eenheid één keer, achteraan.
  const of = unit === 'min'
    ? `${formatHoursMinutesNL(best)} van ${formatHoursMinutesNL(need)}`
    : unit === 'dagen'
      ? `${fmt(best)} van ${fmt(need)}`
      : `${fmt(best)} van ${valueText(unit, need)}`;
  return { name, unit, best, need, bestDate: row.bestDate, share, text: of };
}

// De rekenregel op één datum. `computeGr5Readiness` voegt er het verschil mee
// met vier weken terug aan toe.
function compute(requirements: GoalRequirement[], logs: SessionLog[], today: string): Omit<Gr5Readiness, 'change'> | undefined {
  const rows = routeDayRows(requirements, logs, today).filter((r) => r.need > 0);
  const row = (key: RouteDayRow['key']) => rows.find((r) => r.key === key);
  const meters: Gr5Meter[] = [];

  const dist = typicalDayValue(requirements, 'distance')?.value;
  const up = row('stijgen');
  const down = row('dalen');

  const pack = row('rugzak');
  if (pack) {
    meters.push(meter('rugzak', 'Rugzak', [part('rugzak', 'kg', pack)],
      `Het rugzakdoel van je GR5 is ${fmt(pack.need)} kg. Telt je zwaarste rugzak op een wandeling van de laatste acht weken.`));
  }

  const time = row('tijd');
  if (time) {
    const day = dist ? `Een gewone dag van ${formatNumberNL(dist.amount, 1)} km${up && down ? ` met ${fmt(up.need)} m omhoog en ${fmt(down.need)} m omlaag` : ''}` : 'Een gewone dag op de route';
    meters.push(meter('langsteDag', 'Langste dag', [part('langste dag', 'min', time)],
      `${day} kost ongeveer ${formatHoursMinutesNL(time.need)} op pad. Telt je langste wandeling van de laatste acht weken.`));
  }

  const heights = [up && part('stijging', 'm', up), down && part('daling', 'm', down)].filter((p): p is MeterPart => !!p);
  if (heights.length > 0) {
    meters.push(meter('hoogte', 'Stijging en daling', heights,
      'Een gewone dag vraagt zoveel omhoog en omlaag. Bergaf kost je benen meer dan bergop, daarom tellen allebei. Telt je grootste dag van de laatste acht weken.'));
  }

  const days = row('dagen');
  if (days) {
    const cap = Math.min(days.need, THUIS_DAGEN_OP_RIJ);
    const longer = days.need > cap ? `De tocht vraagt tot ${fmt(days.need)} dagen achter elkaar. Thuis oefen je er ${fmt(cap)}, een weekend met twee lange wandeldagen; de rest leer je op de tocht zelf.` : `Je tocht vraagt ${fmt(days.need)} lange dagen achter elkaar.`;
    meters.push(meter('dagen', 'Dagen achter elkaar', [part('dagen achter elkaar', 'dagen', days, cap)], `${longer} Telt dagen van minstens anderhalf uur wandelen, van de laatste acht weken.`));
  }

  if (meters.length === 0) return undefined;

  const mean = meters.reduce((n, m) => n + m.share, 0) / meters.length;
  const full = meters.every((m) => m.share >= 1);
  const percent = full ? 100 : Math.min(99, Math.round(mean * 100));

  const open = meters.filter((m) => m.share < 1);
  const weakest = open.length > 0 ? open.reduce((a, b) => (b.share < a.share ? b : a)) : undefined;

  return {
    percent,
    meters,
    weakest,
    sentence: sentenceOf(meters),
    weakestSentence: weakest ? `Het zwakst: ${weakest.label.toLowerCase()}, ${weakest.text}.` : undefined,
  };
}

function meter(key: MeterKey, label: string, parts: MeterPart[], why: string): Gr5Meter {
  const share = parts.reduce((n, p) => n + p.share, 0) / parts.length;
  // Stijging en daling samen: "450 en 300 van 1.000 m" als de eis gelijk is.
  let text = parts.map((p) => p.text).join(' en ');
  if (parts.length === 2 && parts[0].need === parts[1].need) text = `${fmt(parts[0].best)} en ${fmt(parts[1].best)} van ${valueText(parts[0].unit, parts[0].need)}`;
  return { key, label, parts, share, text, why };
}

const COUNT_WORD = ['nul', 'één', 'twee', 'drie', 'vier'];

// "Het gemiddelde van vier dingen die de GR5 vraagt: je rugzak 9 van 14 kg,
// je langste dag ..., je stijging en daling ... en je dagen achter elkaar 1 van 2."
function sentenceOf(meters: Gr5Meter[]): string {
  const items = meters.map((m) => `je ${m.label.toLowerCase()} ${m.text}`);
  const list = items.length > 1 ? `${items.slice(0, -1).join(', ')} en ${items.at(-1)}` : items[0];
  if (meters.length === 1) return `Dit meet één ding dat de GR5 vraagt: ${list}.`;
  return `Het gemiddelde van ${COUNT_WORD[meters.length]} dingen die de GR5 vraagt: ${list}.`;
}

// Het percentage voor een doel. Undefined als het doel niets heeft om mee te
// vergelijken (geen rugzakdoel, geen afstand, geen stijging).
export function computeGr5Readiness(requirements: GoalRequirement[], logs: SessionLog[], today: string): Gr5Readiness | undefined {
  const now = compute(requirements, logs, today);
  if (!now) return undefined;
  const before = compute(requirements, logs, addDays(today, -VERGELIJK_DAGEN));
  // Een verschil zegt pas iets als er vier weken terug of nu iets te meten was.
  const change = before && (before.percent > 0 || now.percent > 0) ? now.percent - before.percent : undefined;
  return { ...now, change };
}

// "+6 in 4 weken", "-3 in 4 weken", "gelijk aan 4 weken geleden".
export function changeLabel(change: number | undefined): string | undefined {
  if (change === undefined) return undefined;
  const weeks = VERGELIJK_DAGEN / 7;
  if (change === 0) return `gelijk aan ${weeks} weken geleden`;
  return `${change > 0 ? '+' : '-'}${Math.abs(change)} in ${weeks} weken`;
}
