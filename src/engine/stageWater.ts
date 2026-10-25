// ASCEND: water per GR5-etappe: je zweettempo bij de te verwachten temperatuur maal de
// uren van de etappe (docs/beslissingen/2026-10-25-zweet-en-water.md).
//
// Het is hoeveel je ongeveer kwijtraakt, niet een drinkvoorschrift: het doel is minder dan 2%
// van je gewicht kwijt, niet alles terugdrinken (Sawka e.a. 2007). Feitelijk, nooit
// medisch advies. De uren zijn de looptijd van de officiële site, zonder pauzes.
//
// De temperatuur per stuk (20, 18, 20 en 26 graden) is een eigen schatting voor een zomerdag
// in het hoofdseizoen: de noordelijke stukken hoger en koeler, het zuiden laag en warm. Het
// is geen gemeten gemiddelde en er staan geen gemiddelden van een plaats achter; op het
// scherm heet het daarom een aanname. Het weerbericht van de week zelf gaat altijd voor.
//
// Puur: geen React, geen IndexedDB.

import type { Gr5Stage, SectionId } from '../data/gr5Stages';
import type { SweatEntry } from '../models/sweat';
import { basisLabel, mlPerHourText, sweatRateAt, type SweatRate } from './sweat';

export const SECTION_TEMP_C: Record<SectionId, number> = { 1: 20, 2: 18, 3: 20, 4: 26 };

export function expectedStageTempC(stage: Pick<Gr5Stage, 'section'>): number {
  return SECTION_TEMP_C[stage.section];
}

export interface StageWater {
  // Ongeveer, afgerond op een halve liter.
  liters: number;
  hours: number;
  rate: SweatRate;
  // True als de temperatuur de eigen schatting voor een zomerdag is, niet een gegeven.
  tempAssumed: boolean;
}

// Undefined als de site geen looptijd geeft: dan rekent de app niet met een gok.
export function stageWater(stage: Pick<Gr5Stage, 'section' | 'minutes'>, entries: SweatEntry[] | undefined, tempC?: number): StageWater | undefined {
  if (stage.minutes === null || stage.minutes <= 0) return undefined;
  const hours = stage.minutes / 60;
  const rate = sweatRateAt(entries, tempC ?? expectedStageTempC(stage), 'walk');
  const liters = Math.max(0.5, Math.round(((rate.mlPerHour * hours) / 1000) * 2) / 2);
  return { liters, hours, rate, tempAssumed: tempC === undefined };
}

export function litersText(liters: number): string {
  return `${liters.toLocaleString('nl-NL', { minimumFractionDigits: liters % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 })} liter`;
}

// "Je zweet op deze etappe ongeveer 4,5 liter."
export function stageWaterLine(w: StageWater): string {
  return `Je zweet op deze etappe ongeveer ${litersText(w.liters)}.`;
}

// Waarop het getal rust, in gewone woorden.
export function stageWaterBasisLine(w: StageWater): string {
  const temp = Math.round(w.rate.tempC);
  const hours = w.hours.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
  const rate = mlPerHourText(w.rate.mlPerHour);
  const base = `Dat is ${rate}, ${hours} uur lang, ${basisLabel(w.rate)}.`;
  const tempLine = w.tempAssumed
    ? ` De temperatuur is een aanname: bij ongeveer ${temp} graden, verwacht op een zomerdag.`
    : ` Gerekend bij ongeveer ${temp} graden.`;
  return w.rate.basis === 'default'
    ? `${base}${tempLine} Weeg jezelf voor en na een lange tocht op een warme dag om je eigen tempo te kennen.`
    : `${base}${tempLine}`;
}

// Een korte regel voor in de lijst: "water ongeveer 4,5 l".
export function stageWaterShort(w: StageWater): string {
  return `water ± ${w.liters.toLocaleString('nl-NL', { minimumFractionDigits: w.liters % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 })} l`;
}

// De regel over waterpunten uit de data van de etappe: de eerste zin van wat er bekend is.
export function waterPointsLine(stage: Pick<Gr5Stage, 'water'>): string {
  if (!stage.water) return 'Voor deze etappe is niet bekend waar water is. Neem genoeg mee voor de hele dag.';
  const first = stage.water.text.split(/(?<=\.)\s/)[0];
  return first;
}
