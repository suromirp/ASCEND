// ASCEND — het etappeplan: van de 36 officiële etappes en jouw keuzes naar
// de dagen die je echt loopt.
//
// Puur: geen React, geen opslag. De etappes zijn vaste data
// (data/gr5Stages.ts); een keuze (slaapplek, samenvoegen met de volgende,
// rustdag erna) staat per etappe in het RoutePlan. Dit bestand maakt daar
// een dagenlijst van, zoekt de zwaarste dagen en zet een etappe naast je
// beste dag van de laatste acht weken (met routeDayRows uit standing.ts).

import type { SessionLog } from '../models/training';
import type { GoalRequirement } from '../models/goals';
import { SLEEP_KINDS, type RoutePlan, type SleepKind, type SoloPlan, type StageChoice, type SatelliteAnswer } from '../models/routePlan';
import { GR5_STAGES, HIGH_PASS_THRESHOLD_M, type Gr5Stage } from '../data/gr5Stages';
import { BIVOUAC_REGIMES, type BivouacRegime } from '../data/gr5Bivouac';
import { addDays } from '../utils/dates';
import { routeDayRows, type RouteDayRow } from './standing';

// --- De dagen -----------------------------------------------------------------

export interface ItineraryDay {
  // Volgnummer van de dag in je plan, rustdagen meegeteld, vanaf 1.
  dayNumber: number;
  kind: 'walk' | 'rest';
  // Eén etappe, of twee als je ze samenvoegt. Leeg bij een rustdag.
  stages: Gr5Stage[];
  // Alleen als er een startdatum is.
  date?: string;
  // De slaapplek van de nacht na deze dag, uit de keuze bij de laatste etappe.
  sleep?: SleepKind;
  from: string;
  to: string;
  km: number;
  up: number;
  down: number;
  // Looptijd volgens de site, opgeteld bij samenvoegen.
  minutes: number;
  // Een van de waarden ontbreekt bij de site, dus de som is een ondergrens.
  incomplete: boolean;
  highPass?: { name: string; m: number };
}

// Een samenvoeging telt alleen als er een volgende etappe is en de vorige
// niet al met deze is samengevoegd (hoogstens twee etappes per dag).
export function effectiveMerge(plan: RoutePlan, index: number, stages: Gr5Stage[] = GR5_STAGES): boolean {
  if (index < 0 || index >= stages.length - 1) return false;
  if (!plan.choices[stages[index].id]?.mergeWithNext) return false;
  return !(index > 0 && plan.choices[stages[index - 1].id]?.mergeWithNext);
}

// Kan deze etappe nog met de volgende worden samengevoegd? Niet als de vorige
// er al mee is samengevoegd, en niet bij de laatste.
export function canMergeWithNext(plan: RoutePlan, index: number, stages: Gr5Stage[] = GR5_STAGES): boolean {
  if (index < 0 || index >= stages.length - 1) return false;
  return !(index > 0 && effectiveMerge(plan, index - 1, stages));
}

function sum(values: (number | null)[]): { total: number; missing: boolean } {
  let total = 0;
  let missing = false;
  for (const v of values) {
    if (v === null) missing = true;
    else total += v;
  }
  return { total, missing };
}

export function buildItinerary(plan: RoutePlan, startDate?: string, stages: Gr5Stage[] = GR5_STAGES): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  const push = (day: Omit<ItineraryDay, 'dayNumber' | 'date'>) => {
    const dayNumber = days.length + 1;
    days.push({ ...day, dayNumber, date: startDate ? addDays(startDate, dayNumber - 1) : undefined });
  };

  let i = 0;
  while (i < stages.length) {
    const group = effectiveMerge(plan, i, stages) ? [stages[i], stages[i + 1]] : [stages[i]];
    const last = group[group.length - 1];
    const km = sum(group.map((s) => s.km));
    const up = sum(group.map((s) => s.up));
    const down = sum(group.map((s) => s.down));
    const minutes = sum(group.map((s) => s.minutes));
    const choice = plan.choices[last.id];
    const pass = group.map((s) => s.highPass).filter((p): p is NonNullable<Gr5Stage['highPass']> => !!p).sort((a, b) => b.m - a.m)[0];
    push({
      kind: 'walk',
      stages: group,
      sleep: choice?.sleep,
      from: group[0].from,
      to: last.to,
      km: Math.round(km.total * 10) / 10,
      up: up.total,
      down: down.total,
      minutes: minutes.total,
      incomplete: km.missing || up.missing || down.missing || minutes.missing,
      highPass: pass,
    });
    // Een rustdag na de laatste etappe van de reis heeft geen betekenis.
    const isEnd = last === stages[stages.length - 1];
    if (choice?.restAfter && !isEnd) {
      push({ kind: 'rest', stages: [], sleep: choice.sleep, from: last.to, to: last.to, km: 0, up: 0, down: 0, minutes: 0, incomplete: false });
    }
    i += group.length;
  }
  return days;
}

export interface ItineraryTotals {
  walkDays: number;
  restDays: number;
  km: number;
  up: number;
  down: number;
  endDate?: string;
  incomplete: boolean;
  nights: Record<SleepKind | 'open', number>;
}

export function itineraryTotals(days: ItineraryDay[]): ItineraryTotals {
  const nights: ItineraryTotals['nights'] = { tent: 0, bivak: 0, camping: 0, gite: 0, open: 0 };
  let km = 0;
  let up = 0;
  let down = 0;
  let incomplete = false;
  // De laatste dag is aankomst in Nice: daarna volgt geen nacht in het plan.
  days.forEach((d, idx) => {
    km += d.km;
    up += d.up;
    down += d.down;
    incomplete = incomplete || d.incomplete;
    if (idx === days.length - 1) return;
    nights[d.sleep ?? 'open'] += 1;
  });
  return {
    walkDays: days.filter((d) => d.kind === 'walk').length,
    restDays: days.filter((d) => d.kind === 'rest').length,
    km: Math.round(km * 10) / 10,
    up,
    down,
    endDate: days[days.length - 1]?.date,
    incomplete,
    nights,
  };
}

// Een keuze bij een etappe toevoegen of wijzigen. Houdt het plan sluitend:
// samenvoegen kan alleen als de vorige etappe niet al met deze is
// samengevoegd, en wie samenvoegt verliest de rustdag die er tussen stond
// en de samenvoeging van de volgende. Een leeg resultaat wordt weggehaald.
export function applyChoice(plan: RoutePlan, stageId: string, patch: Partial<StageChoice>, now = new Date().toISOString(), stages: Gr5Stage[] = GR5_STAGES): RoutePlan {
  const index = stageIndex(stageId, stages);
  if (index < 0) return plan;
  const choices = { ...plan.choices };
  const next: StageChoice = { ...choices[stageId] };
  for (const [key, value] of Object.entries(patch) as [keyof StageChoice, StageChoice[keyof StageChoice]][]) {
    if (value === undefined || value === false) delete next[key];
    else (next as Record<string, unknown>)[key] = value;
  }
  if (next.mergeWithNext) {
    if (!canMergeWithNext(plan, index, stages)) delete next.mergeWithNext;
    else {
      delete next.restAfter;
      const following = stages[index + 1] && choices[stages[index + 1].id];
      if (following?.mergeWithNext) {
        const cleared = { ...following };
        delete cleared.mergeWithNext;
        if (Object.keys(cleared).length > 0) choices[stages[index + 1].id] = cleared;
        else delete choices[stages[index + 1].id];
      }
    }
  }
  if (Object.keys(next).length > 0) choices[stageId] = next;
  else delete choices[stageId];
  return { choices, updatedAt: now };
}

// --- De zwaarste dagen -------------------------------------------------------

// Zwaarte is hier simpel en uitlegbaar: omhoog plus omlaag in meters. Een
// waarde die de site niet geeft telt als 0, en die dag krijgt daarom
// `incomplete`. Gelijke stand: de langste dag eerst.
function loadOf(day: ItineraryDay): number {
  return day.up + day.down;
}

export function hardestDays(days: ItineraryDay[], count = 5): ItineraryDay[] {
  return days
    .filter((d) => d.kind === 'walk')
    .sort((a, b) => loadOf(b) - loadOf(a) || b.km - a.km)
    .slice(0, count);
}

// --- Naast je beste dag ---------------------------------------------------------

export type DayCompareRow = Pick<RouteDayRow, 'need' | 'best' | 'bestDate'> & { key: 'tijd' | 'stijgen' | 'dalen'; enough: boolean };

const req = (kind: GoalRequirement['kind'], amount: number, unit: 'km' | 'm_elevation_gain' | 'm_elevation_loss'): GoalRequirement => ({
  id: `stage-${kind}`,
  kind,
  scope: 'PER_DAY',
  target: { amount, unit },
});

// Een dag naast je beste dag van de laatste acht weken. Hergebruikt
// routeDayRows: dezelfde regels voor wat meetelt (geen loopband, geen
// geschatte hoogte). De tijd is de officiële looptijd als de site die geeft.
export function compareWithBest(day: Pick<ItineraryDay, 'kind' | 'km' | 'up' | 'down' | 'minutes' | 'incomplete'>, logs: SessionLog[], today: string): DayCompareRow[] {
  if (day.kind !== 'walk' || day.km <= 0) return [];
  const requirements: GoalRequirement[] = [req('distance', day.km, 'km')];
  if (day.up > 0) requirements.push(req('elevationGain', day.up, 'm_elevation_gain'));
  if (day.down > 0) requirements.push(req('elevationLoss', day.down, 'm_elevation_loss'));
  return routeDayRows(requirements, logs, today)
    .flatMap((r) => (r.key === 'tijd' || r.key === 'stijgen' || r.key === 'dalen' ? [{ ...r, key: r.key }] : []))
    .map((r) => {
      const need = r.key === 'tijd' && !day.incomplete && day.minutes > 0 ? day.minutes : r.need;
      return { key: r.key, need, best: r.best, bestDate: r.bestDate, enough: r.best >= need };
    });
}

// --- Slapen en bivakregels ----------------------------------------------------

export function regimesOf(stage: Gr5Stage): BivouacRegime[] {
  return stage.bivouac.map((id) => BIVOUAC_REGIMES[id]);
}

// Een waarschuwing bij de keuze "Tent" op een etappe waar een tent niet zomaar
// overal mag. Geen verbod van de app: de regel staat in het onderzoek.
export function sleepWarning(day: ItineraryDay, sleep: SleepKind | undefined): string | undefined {
  if (sleep !== 'tent') return undefined;
  const restricted = day.stages.flatMap(regimesOf).find((r) => r.restrictsFreeTent);
  if (!restricted) return undefined;
  return `${restricted.area}: een tent zomaar neerzetten mag hier niet. Bekijk de regel hieronder en reserveer, of kies bivak bij een refuge, een camping of een gîte.`;
}

// --- Opschonen (import en laden) ----------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Een back-up kan met de hand bewerkt zijn of van een andere versie komen.
// Alleen keuzes die bij een bestaande etappe horen en een bekende vorm
// hebben komen er door. undefined = er is niets bruikbaars.
export function sanitizeRoutePlan(raw: unknown, stages: Gr5Stage[] = GR5_STAGES): RoutePlan | undefined {
  if (!isRecord(raw) || !isRecord(raw.choices)) return undefined;
  const known = new Set(stages.map((s) => s.id));
  const choices: Record<string, StageChoice> = {};
  for (const [id, value] of Object.entries(raw.choices)) {
    if (!known.has(id) || !isRecord(value)) continue;
    const choice: StageChoice = {};
    if (typeof value.sleep === 'string' && (SLEEP_KINDS as readonly string[]).includes(value.sleep)) choice.sleep = value.sleep as SleepKind;
    if (value.mergeWithNext === true) choice.mergeWithNext = true;
    if (value.restAfter === true) choice.restAfter = true;
    if (Object.keys(choice).length > 0) choices[id] = choice;
  }
  return { choices, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '' };
}

const SATELLITE: SatelliteAnswer[] = ['ja', 'nee', 'nog-niet'];
const text = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '');

export function sanitizeSoloPlan(raw: unknown): SoloPlan | undefined {
  if (!isRecord(raw)) return undefined;
  const time = text(raw.checkInTime, 5);
  return {
    who: text(raw.who, 80),
    checkInTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '',
    ifMissing: text(raw.ifMissing),
    satellite: SATELLITE.includes(raw.satellite as SatelliteAnswer) ? (raw.satellite as SatelliteAnswer) : '',
    satelliteNote: text(raw.satelliteNote, 300),
    gear: text(raw.gear),
    updatedAt: text(raw.updatedAt, 40),
  };
}

// --- Kleine hulpjes voor de schermen ------------------------------------------

export function hasHighPass(stage: Gr5Stage): boolean {
  return !!stage.highPass && stage.highPass.m >= HIGH_PASS_THRESHOLD_M;
}

export function stageIndex(id: string, stages: Gr5Stage[] = GR5_STAGES): number {
  return stages.findIndex((s) => s.id === id);
}

// "5 u 30": de looptijd compact, voor in een lijst of een tegel.
export function formatStageTime(minutes: number): string {
  return `${Math.floor(minutes / 60)} u ${String(minutes % 60).padStart(2, '0')}`;
}

// Het etappelabel voor een dag: "Etappe 23" of "Etappe 23 en 24".
export function dayLabel(day: ItineraryDay): string {
  if (day.kind === 'rest') return 'Rustdag';
  return day.stages.length === 2 ? `Etappe ${day.stages[0].overall} en ${day.stages[1].overall}` : `Etappe ${day.stages[0].overall}`;
}
