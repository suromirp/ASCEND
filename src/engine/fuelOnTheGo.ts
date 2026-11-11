// ASCEND: Eten onderweg (docs/beslissingen/2026-11-11-eten-onderweg.md).
//
// Een indicatie van wat je aan eten meeneemt op een lange training of een tocht: een bereik in gram
// koolhydraten, en wat dat ongeveer is in gels, bananen, krentenbollen of dadels. Geen registratie,
// geen calorieën, geen lichaamsgewicht: alleen duur, soort en zwaarte.
//
// Waarop het steunt:
// - 30 tot 60 g koolhydraten per uur bij inspanning van 1 tot 2,5 uur (Thomas, Erdman en Burke
//   2016, ACSM). Wandelen werkt op lage intensiteit: de onderkant, 30 tot 40 g per uur, is genoeg
//   (regel B4 in docs/onderzoek/Aanvullend onderzoek GR5 voorbereiding.md, afgeleid).
// - Onder 90 minuten geen regel: tot dan dekken je eigen voorraden een rustige training, en de app
//   noemt drinken ook pas vanaf 90 minuten (engine/eveningBefore.ts#LONG_MINUTES, regel B4).
// - Je darmen wennen aan eten onderweg: wie het oefent verdraagt het beter (Jeukendrup 2017).
// - De grammen per stuk zijn afgeronde waarden uit de NEVO-tabel (RIVM) en gewone verpakkingen; zie
//   FUEL_ITEMS. Het blijft een indicatie, geen medisch advies.
//
// De hitte verandert de grammen niet: wat je extra kwijtraakt is water, en dat zegt de drinkregel
// uit je zweettempo (engine/sweat.ts). Dit getal staat ernaast, nooit dubbel.
//
// Puur: geen React, geen IndexedDB.

import type { SessionTemplate } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import { templateSport } from './sports';
import { dayCount } from './leave';

// ---- de instelling ---------------------------------------------------------------------------

export interface FuelSettingsInput {
  fuelOnTheGo?: boolean;
}

// Afwezig is het advies: aan.
export function fuelOn(s: FuelSettingsInput | undefined): boolean {
  return s?.fuelOnTheGo !== false;
}

// ---- de grenzen ------------------------------------------------------------------------------

// Vanaf deze duur (minuten) een regel; korter niets.
export const FUEL_FROM_MINUTES = 90;

// Een tochtdag zonder eigen looptijd: zoveel uur op de been. Een eigen aanname, zo genoemd op het
// scherm; een GR5-etappe duurt volgens de officiële site gemiddeld iets meer dan vijf uur, zonder pauzes.
export const TREK_DAY_HOURS = 6;

export type FuelActivity = 'run' | 'walk';
export type FuelIntensity = 'easy' | 'hard';

// Gram koolhydraten per uur, per soort en zwaarte. Hardlopen: het consensusbereik van Thomas 2016,
// rustig in de onderste, hard in de bovenste helft. Wandelen: 30 tot 40 (regel B4), ook als hij zwaar is.
const PER_HOUR: Record<FuelActivity, Record<FuelIntensity, [number, number]>> = {
  run: { easy: [30, 45], hard: [45, 60] },
  walk: { easy: [30, 40], hard: [30, 40] },
};

// ---- wat je meeneemt ---------------------------------------------------------------------------

export type FuelItemId = 'gel' | 'banaan' | 'krentenbol' | 'dadels' | 'boterham';

export interface FuelItem {
  id: FuelItemId;
  // Hoeveel gram koolhydraten in één stuk (of portie), afgerond op 5.
  grams: number;
  one: string;
  many: string;
}

// - gel: de meeste gels hebben 20 tot 30 g per zakje; 25 is het midden.
// - banaan: ongeveer 20 g per 100 g (NEVO), een middelgrote banaan zonder schil weegt 120 g: 25 g.
// - krentenbol: ongeveer 50 g per 100 g (NEVO), een bol van 60 g: 30 g.
// - dadels: gedroogd ongeveer 65 g per 100 g (NEVO), een dadel van 8 g: 5 g; vijf dadels zijn 25 g.
// - boterham: volkorenbrood ongeveer 40 g per 100 g (NEVO), een snee van 35 g: 15 g, zonder beleg.
export const FUEL_ITEMS: Record<FuelItemId, FuelItem> = {
  gel: { id: 'gel', grams: 25, one: 'gel', many: 'gels' },
  banaan: { id: 'banaan', grams: 25, one: 'banaan', many: 'bananen' },
  krentenbol: { id: 'krentenbol', grams: 30, one: 'krentenbol', many: 'krentenbollen' },
  dadels: { id: 'dadels', grams: 25, one: 'portie van 5 dadels', many: 'porties van 5 dadels' },
  boterham: { id: 'boterham', grams: 15, one: 'boterham', many: 'boterhammen' },
};

// ---- de berekening ---------------------------------------------------------------------------

export interface FuelEstimate {
  activity: FuelActivity;
  intensity: FuelIntensity;
  minutes: number;
  perHour: [number, number];
  // Het bereik voor de hele training of dag, afgerond op 5 gram.
  grams: [number, number];
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const round5 = (g: number) => Math.round(g / 5) * 5;

// Het bereik voor een duur, of niets: zonder duur, onder de grens of met een onzinnige waarde.
export function fuelFor(minutes: number | undefined | null, activity: FuelActivity, intensity: FuelIntensity = 'easy'): FuelEstimate | undefined {
  if (!finite(minutes) || minutes < FUEL_FROM_MINUTES) return undefined;
  const perHour = PER_HOUR[activity][intensity];
  const hours = minutes / 60;
  return { activity, intensity, minutes, perHour, grams: [round5(perHour[0] * hours), round5(perHour[1] * hours)] };
}

// De soort van een training: lopen of wandelen (ook een bergtocht of rugzaktraining). Fietsen,
// kracht en een sport die alleen telt krijgen geen regel.
export function fuelActivityOf(template: Pick<SessionTemplate, 'type' | 'sport' | 'countedSport' | 'customSport'>): FuelActivity | undefined {
  const sport = templateSport(template as SessionTemplate);
  if (sport === 'running') return 'run';
  if (sport === 'hiking') return 'walk';
  return undefined;
}

// Hard als het belastingprofiel van de training hoog is (tempo, intervallen, een test).
export function fuelIntensityOf(template: Pick<SessionTemplate, 'baseStressProfile'>): FuelIntensity {
  return template.baseStressProfile?.intensity === 'high' ? 'hard' : 'easy';
}

// Voor een geplande training: undefined als het geen loop of wandeling is, of te kort.
export function fuelForTraining(template: SessionTemplate, minutes: number | undefined): FuelEstimate | undefined {
  const activity = fuelActivityOf(template);
  if (!activity) return undefined;
  return fuelFor(minutes, activity, fuelIntensityOf(template));
}

// Een tochtdag: met de looptijd als die bekend is (een etappe), anders de aanname van zes uur.
export interface TrekFuel extends FuelEstimate {
  hoursAssumed: boolean;
  days: number;
}

export function fuelForTrekDay(minutes?: number | null, days = 1): TrekFuel | undefined {
  const known = finite(minutes) && minutes > 0;
  const est = fuelFor(known ? minutes : TREK_DAY_HOURS * 60, 'walk', 'easy');
  if (!est) return undefined;
  return { ...est, hoursAssumed: !known, days: finite(days) && days >= 1 ? Math.floor(days) : 1 };
}

// Hoeveel stuks van iets voor het bereik, afgerond op hele stuks en minstens één.
export function countFor(grams: [number, number], item: FuelItem): [number, number] {
  const lo = Math.max(1, Math.round(grams[0] / item.grams));
  const hi = Math.max(lo, Math.round(grams[1] / item.grams));
  return [lo, hi];
}

// ---- de teksten ------------------------------------------------------------------------------

const range = ([lo, hi]: [number, number]) => (lo === hi ? `${lo}` : `${lo} tot ${hi}`);
const countText = (c: [number, number], item: FuelItem) => `${range(c)} ${c[1] === 1 ? item.one : item.many}`;
const gramsText = (g: [number, number]) => `${range(g)} g koolhydraten`;

// Lopen leunt op gels, wandelen en een tocht op echt eten.
const MAIN_ITEM: Record<FuelActivity, FuelItemId> = { run: 'gel', walk: 'krentenbol' };

// De regel voor De avond ervoor: kort, één zin.
// "Eten mee: 60 tot 90 g koolhydraten, 2 tot 4 gels of bananen."
export function fuelEveningLine(est: FuelEstimate): string {
  const item = FUEL_ITEMS[MAIN_ITEM[est.activity]];
  return `Eten mee: ${gramsText(est.grams)}, ${countText(countFor(est.grams, item), item)} of bananen.`;
}

// De regel voor een tochtdag op De avond ervoor.
// "Eten voor de dag: 180 tot 240 g koolhydraten, vooral echt eten."
export function trekEveningLine(est: TrekFuel): string {
  return `Eten voor de dag: ${gramsText(est.grams)}, vooral echt eten.`;
}

// De korte vorm voor in een lijst: "eten ± 150 tot 200 g".
export function fuelShort(est: FuelEstimate): string {
  return `eten ± ${range(est.grams)} g`;
}

export const PRACTICE_LINE = 'Oefen het onderweg op lange trainingen: je darmen wennen eraan, en op de dag zelf weet je wat je verdraagt.';
export const NOT_MEDICAL = 'Een indicatie, geen medisch advies en geen voorschrift.';

// De uitleg bij een training: wat je meeneemt, waarop het rust, en hoe je het verdeelt.
export function fuelGuideLines(est: FuelEstimate): string[] {
  const perHour = `${range(est.perHour)} g per uur`;
  const gel = FUEL_ITEMS.gel;
  const lines: string[] = [];
  lines.push(`Ongeveer ${gramsText(est.grams)} voor ${est.minutes} min: ${perHour}.`);
  if (est.activity === 'run') {
    lines.push(`Dat is ${countText(countFor(est.grams, gel), gel)} van ${gel.grams}\u00a0g. In plaats van een gel: een banaan (${FUEL_ITEMS.banaan.grams}\u00a0g), een krentenbol (${FUEL_ITEMS.krentenbol.grams}\u00a0g) of vijf dadels (${FUEL_ITEMS.dadels.grams}\u00a0g).`);
    lines.push('Verdeel het over de training, vanaf ongeveer het eerste half uur, met een slok water erbij.');
  } else {
    lines.push(realFoodText(est.grams));
    lines.push('Eet elke 45 tot 60 minuten iets, niet alles aan het eind.');
  }
  lines.push(PRACTICE_LINE);
  return lines;
}

function realFoodText(grams: [number, number]): string {
  const bol = FUEL_ITEMS.krentenbol;
  const banaan = FUEL_ITEMS.banaan;
  const brood = FUEL_ITEMS.boterham;
  return `Dat is ${countText(countFor(grams, bol), bol)} (${bol.grams}\u00a0g), of een mix met bananen (${banaan.grams}\u00a0g), boterhammen (${brood.grams}\u00a0g) of dadels.`;
}

// Bij een tocht of etappe: per dag, echt eten voorop, en de oefenzin. Het water staat er apart naast.
export function trekFuelLines(est: TrekFuel): string[] {
  const hours = (est.minutes / 60).toLocaleString('nl-NL', { maximumFractionDigits: 1 });
  const basis = est.hoursAssumed
    ? `bij ongeveer ${hours} uur lopen (een aanname; de tocht heeft geen looptijd)`
    : `bij ${hours} uur lopen`;
  const lines = [`Per dag ongeveer ${gramsText(est.grams)}, ${basis}: ${range(est.perHour)} g per uur.`];
  lines.push(realFoodText(est.grams));
  if (est.days > 1) lines.push(`Voor ${est.days} dagen: ${gramsText([est.grams[0] * est.days, est.grams[1] * est.days])}, verdeeld over de dagen. Een ontbijt en avondeten komen erbij.`);
  lines.push(PRACTICE_LINE);
  return lines;
}

// Eén regel voor een tocht op de kaart Tochten, met de oefenzin kort erachter.
// "Eten per dag ongeveer 180 tot 240 g koolhydraten, vooral echt eten. Oefen het onderweg op lange trainingen."
export function trekFuelSummary(est: TrekFuel): string {
  return `Eten per dag ongeveer ${gramsText(est.grams)}, vooral echt eten. Oefen het onderweg op lange trainingen.`;
}

// Een tocht uit Vrij en vakantie: per dag, met de aanname van zes uur lopen (een tocht kent geen looptijd).
export function fuelForTrekPeriod(period: Pick<LeavePeriod, 'kind' | 'startDate' | 'endDate'>): TrekFuel | undefined {
  if (period.kind !== 'trek') return undefined;
  return fuelForTrekDay(undefined, Math.max(1, dayCount(period)));
}
