// ASCEND: zweetverlies op de twee momenten waar je het niet vergeet: vóór de training
// (een herinnering om je te wegen) en bij het afronden
// (docs/beslissingen/2026-10-27-zweet-bij-afronden.md).
//
// Alles wat hier staat is puur. De rekenregels zelf blijven in engine/sweat.ts; dit bestand
// beslist wélke training een meting krijgt, welk voorgewicht bij welke log hoort en hoe de
// invoer één gewone SweatEntry wordt, voor het blad in het Logboek en voor het afronden.

import type { SessionLog, SessionTemplate } from '../models/training';
import type { WeightEntry } from '../models/metrics';
import type { SweatActivity, SweatEntry, SweatPre } from '../models/sweat';
import { addDays } from '../utils/dates';
import { sweatActivityOfLog } from './sweat';
import { templateSport } from './sports';
import { weightsInUse } from './bodyWeight';

// De instelling "Zweetverlies vragen": aan zolang je hem niet uitzet.
export function asksSweat(setting: boolean | undefined): boolean {
  return setting !== false;
}

// Krijgt deze geplande training een weging? Dezelfde regel als isSweatLog voor een log:
// lopen, en wandelen of een tocht zonder andere sport.
export function sweatActivityOfTemplate(t: Pick<SessionTemplate, 'type' | 'sport'>): SweatActivity | undefined {
  return sweatActivityOfLog({ type: t.type, sport: templateSport(t as SessionTemplate), cardioData: undefined, outdoorData: undefined });
}

// --- voorgewicht ----------------------------------------------------------------------

const KEEP_PRE_DAYS = 14;
const MIN_KG = 20;
const MAX_KG = 300;

// Het voorgewicht dat bij deze log hoort: dat van de dag van de training, zolang een andere
// training van die dag het nog niet nam. Heeft de log zelf al een meting, dan is het
// voorgewicht daarin overgenomen en geeft dit niets terug.
export function preWeightForLog(
  pres: SweatPre[] | undefined,
  entries: SweatEntry[] | undefined,
  log: Pick<SessionLog, 'id' | 'completedDate'>,
): number | undefined {
  const pre = (pres ?? []).find((p) => p.date === log.completedDate);
  if (!pre) return undefined;
  const list = entries ?? [];
  if (list.some((e) => e.logId === log.id)) return undefined;
  const taken = list.some((e) => e.date === log.completedDate && e.weightBeforeKg === pre.weightKg);
  return taken ? undefined : pre.weightKg;
}

// Het voorgewicht van een dag, voor de herinnering op de missiekaart.
export function preWeightOn(pres: SweatPre[] | undefined, date: string): SweatPre | undefined {
  return (pres ?? []).find((p) => p.date === date);
}

// Eén voorgewicht per dag (een tweede vervangt het eerste), en wat ouder is dan twee weken
// valt weg: het is een concept, geen historie. Een gewicht buiten 20 tot 300 kg wordt niet
// bewaard.
export function setSweatPre(list: SweatPre[] | undefined, pre: SweatPre, today: string): SweatPre[] {
  const cutoff = addDays(today, -KEEP_PRE_DAYS);
  const ok = Number.isFinite(pre.weightKg) && pre.weightKg >= MIN_KG && pre.weightKg <= MAX_KG;
  const rest = (list ?? []).filter((p) => p.date !== pre.date && p.date >= cutoff);
  return (ok ? [...rest, pre] : rest).sort((a, b) => a.date.localeCompare(b.date));
}

export function clearSweatPre(list: SweatPre[] | undefined, date: string): SweatPre[] {
  return (list ?? []).filter((p) => p.date !== date);
}

// Een gewicht dat er al is, als voorstel met één tik: een weging van vandaag of gisteren
// (de weegschaal via MacroFactor, of je eigen invoer). Nooit stil overgenomen. Heeft de
// dag een weegschaalgewicht naast het trendgewicht, dan is dat het getal.
export interface WeightSuggestion {
  kg: number;
  date: string;
  source: WeightEntry['source'];
}

export function weightSuggestion(entries: WeightEntry[] | undefined, fromMacroFactor: boolean | undefined, today: string): WeightSuggestion | undefined {
  const yesterday = addDays(today, -1);
  const recent = weightsInUse(entries, fromMacroFactor)
    .filter((e) => e.date === today || e.date === yesterday)
    .map((e) => ({ kg: typeof e.scaleKg === 'number' ? e.scaleKg : e.kg, date: e.date, source: e.source }))
    .filter((e) => Number.isFinite(e.kg) && e.kg >= MIN_KG && e.kg <= MAX_KG)
    .sort((a, b) => b.date.localeCompare(a.date));
  return recent[0];
}

// --- één meting maken -----------------------------------------------------------------

export interface SweatInput {
  weightBeforeKg?: number;
  weightAfterKg?: number;
  drankMl?: number;
  peeMl?: number;
  watchMl?: number;
  tempC?: number;
}

const INPUT_KEYS = ['weightBeforeKg', 'weightAfterKg', 'drankMl', 'peeMl', 'watchMl', 'tempC'] as const;

// De meting bij een log uit wat je invulde: precies wat het blad in het Logboek maakt.
// Lege velden worden niet bewaard. Een bestaande meting houdt haar id. Zonder soort
// (geen loop, wandeling of tocht) is het een wandeling, zoals het blad dat altijd deed.
export function buildSweatEntry(
  log: Pick<SessionLog, 'id' | 'completedDate' | 'durationMinutes' | 'type' | 'sport' | 'cardioData' | 'outdoorData'>,
  input: SweatInput,
  existing: Pick<SweatEntry, 'id'> | undefined,
  newId: string,
  now: string,
): SweatEntry {
  const entry: SweatEntry = {
    id: existing?.id ?? newId,
    logId: log.id,
    date: log.completedDate,
    activity: sweatActivityOfLog(log) ?? 'walk',
    durationMinutes: log.durationMinutes,
    updatedAt: now,
  };
  for (const key of INPUT_KEYS) if (input[key] !== undefined) entry[key] = input[key];
  return entry;
}
