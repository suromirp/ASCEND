// ASCEND: Forge naast de vorige cijfers. Per oefening wat het getal nu is, wat
// het 4 en 8 weken geleden was (de momenten zijn instelbaar) en wat het beste
// ooit is, met naast het getal wat er verder veranderd is: herhalingen bij
// hetzelfde gewicht, het zwaarste gewicht en het volume per training. Zo is
// vooruitgang die geen hogere 1RM is ook te zien.
//
// Er komt geen nieuwe formule bij. Het getal is dat van het krachtmodel
// (SessionPoint.smoothed voor de 1RM, de lijn van het werkgewicht voor de
// andere kant), alleen gelezen op een datum. Alles wat sets telt gaat via
// engine/workSets.ts#isWorkSet, dus een opwarmset telt nooit mee. Zoeken,
// filteren en sorteren staan hier ook, zodat de pagina niets hoeft te rekenen.
// Beslissing: docs/beslissingen/2026-10-24-forge-vergelijken-en-zoeken.md. Puur.

import type { SessionTemplate, SetLog } from '../models/training';
import type { OneRmReading } from '../models/metrics';
import { addDays, daysBetween } from '../utils/dates';
import { normalizeExerciseName } from './exerciseMatch';
import type { ExerciseView } from './strengthHistory';
import type { ForgeSort, OneRmView } from './strengthSettings';
import { isWorkSet } from './workSets';

// --- de punten per training ------------------------------------------------------------------------

export interface ForgePoint {
  date: string;
  // Waar `value` in staat: kilo's (1RM of werkgewicht) of herhalingen (een oefening
  // die je op herhalingen doet, zie isRepsBased).
  unit: 'kg' | 'reps';
  // Het getal van de gekozen kant (1RM of werkgewicht) na deze training; bij een
  // oefening op herhalingen de herhalingen van je beste set.
  value: number;
  // Alle herhalingen van de werksets samen (alleen bij een oefening op herhalingen).
  totalReps?: number;
  // De zwaarste werkset: het gewicht zoals gelogd en de herhalingen.
  topWeightKg?: number;
  topReps?: number;
  // Gewicht maal herhalingen over de werksets; leeg zonder gewicht (eigen gewicht, hulp).
  volumeKg?: number;
  workSets: SetLog[];
}

// Het volume van de werksets. Sets zonder gewicht of met hulp (negatief) tellen niet,
// want daar is gewicht maal herhalingen geen last.
export function volumeOf(sets: SetLog[]): number | undefined {
  let total = 0;
  let counted = 0;
  for (const s of sets) {
    if (!isWorkSet(s) || s.reps <= 0 || s.weightKg === undefined || s.weightKg <= 0) continue;
    total += s.weightKg * s.reps;
    counted++;
  }
  return counted > 0 ? Math.round(total) : undefined;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Een oefening die je op herhalingen doet: er staat in geen enkele werkset een gewicht
// (Hanging Leg Raise), of het is een oefening met eigen gewicht waar hooguit af en toe
// iets bij komt. Daar is de 1RM geen goed getal en zijn de herhalingen het hoofdgetal.
// Oefeningen met hulp horen er niet bij: daar telt de hulp. Opwarmsets tellen niet.
export function isRepsBased(view: ExerciseView): boolean {
  const exercise = view.history.exercise;
  if (exercise?.resistance === 'assisted_bodyweight') return false;
  const sets = view.history.sessions.flatMap((s) => s.sets).filter(isWorkSet);
  if (sets.length === 0) return false;
  return exercise?.resistance === 'bodyweight' || !sets.some((s) => (s.weightKg ?? 0) > 0);
}

// De punten van een oefening op herhalingen: de herhalingen van de beste set, het
// totaal, en het zwaarste gewicht als er een gewicht bij is.
function repsPoints(view: ExerciseView): ForgePoint[] {
  const out: ForgePoint[] = [];
  for (const p of view.points) {
    const sets = p.workSets.filter((s) => isWorkSet(s) && s.reps > 0);
    if (sets.length === 0) continue;
    const weights = sets.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
    out.push({
      date: p.date,
      unit: 'reps',
      value: Math.max(...sets.map((s) => s.reps)),
      totalReps: sets.reduce((t, s) => t + s.reps, 0),
      ...(weights.length > 0 ? { topWeightKg: Math.max(...weights) } : {}),
      workSets: sets,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// De punten van een oefening voor een kant, oudste eerst: een punt per training die
// op die kant een getal heeft.
export function forgePoints(view: ExerciseView, mode: OneRmView): ForgePoint[] {
  if (isRepsBased(view)) return repsPoints(view);
  const lineByDate = new Map<string, number>();
  if (mode === 'work_weight') for (const p of view.line) if (p.date) lineByDate.set(p.date, p.value);
  const out: ForgePoint[] = [];
  for (const p of view.points) {
    const value = mode === 'one_rm' ? p.smoothed : lineByDate.get(p.date);
    if (value === undefined) continue;
    const sets = p.workSets.filter(isWorkSet);
    const volumeKg = volumeOf(sets);
    out.push({
      date: p.date,
      unit: 'kg',
      value,
      ...(p.top ? { topWeightKg: p.top.weightKg, topReps: p.top.reps } : {}),
      ...(volumeKg !== undefined ? { volumeKg } : {}),
      workSets: sets,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// --- momenten ----------------------------------------------------------------------------------------

// De stand op een datum: het punt van de laatste training op of voor die dag.
export function snapshotAt(points: ForgePoint[], date: string): ForgePoint | undefined {
  let found: ForgePoint | undefined;
  for (const p of points) if (p.date <= date) found = p;
  return found;
}

// Het hoogste getal ooit. Bij gelijke getallen de eerste keer dat het gehaald is.
export function bestEver(points: ForgePoint[]): ForgePoint | undefined {
  let best: ForgePoint | undefined;
  for (const p of points) if (!best || p.value > best.value) best = p;
  return best;
}

// Het verschil in getal, op een tiende afgerond. Positief is vooruit, ook bij hulp
// (daar is minder hulp een hoger getal).
export const valueChange = (now: ForgePoint | undefined, then: ForgePoint | undefined): number | undefined =>
  now && then ? round1(now.value - then.value) : undefined;

export type ChangeKind = 'top_weight' | 'reps_same_weight' | 'volume' | 'total_reps';

export interface ExtraChange {
  kind: ChangeKind;
  // Positief is meer, negatief is minder, nul is gelijk.
  delta: number;
  // Het gewicht waar de herhalingen bij horen (alleen bij reps_same_weight).
  atKg?: number;
}

const mostRepsAt = (sets: SetLog[], weightKg: number): number | undefined => {
  let best: number | undefined;
  for (const s of sets) if (isWorkSet(s) && s.weightKg === weightKg && s.reps > 0 && (best === undefined || s.reps > best)) best = s.reps;
  return best;
};

// Wat er behalve het getal veranderd is tussen twee trainingen: het zwaarste gewicht,
// of, bij hetzelfde zwaarste gewicht, de herhalingen daarbij, en het volume. Een soort
// zonder gegevens aan een van beide kanten ontbreekt.
export function extraChanges(now: ForgePoint | undefined, then: ForgePoint | undefined): ExtraChange[] {
  if (!now || !then || now.date === then.date) return [];
  const out: ExtraChange[] = [];
  if (now.unit === 'reps') {
    if (now.totalReps !== undefined && then.totalReps !== undefined) out.push({ kind: 'total_reps', delta: now.totalReps - then.totalReps });
    const dw = round1((now.topWeightKg ?? 0) - (then.topWeightKg ?? 0));
    if (dw !== 0) out.push({ kind: 'top_weight', delta: dw });
    return out;
  }
  if (now.topWeightKg !== undefined && then.topWeightKg !== undefined && now.topWeightKg > 0 && then.topWeightKg > 0) {
    const d = round1(now.topWeightKg - then.topWeightKg);
    if (d !== 0) out.push({ kind: 'top_weight', delta: d });
    else {
      const a = mostRepsAt(now.workSets, now.topWeightKg);
      const b = mostRepsAt(then.workSets, now.topWeightKg);
      if (a !== undefined && b !== undefined) out.push({ kind: 'reps_same_weight', delta: a - b, atKg: now.topWeightKg });
    }
  }
  if (now.volumeKg !== undefined && then.volumeKg !== undefined) out.push({ kind: 'volume', delta: now.volumeKg - then.volumeKg });
  return out;
}

export interface Moment {
  weeks: number;
  // De dag waarop gekeken wordt: vandaag min dit aantal weken.
  asOf: string;
  // 'ok': een training binnen het venster van dit moment; 'none': er was niets binnen
  // het venster ("Niet gedaan"); 'same': dezelfde training als nu of als een eerder
  // moment, dus niet nog eens tonen.
  status: 'ok' | 'none' | 'same';
  point?: ForgePoint;
  // De training ligt dicht bij het moment (een week, of een kwart van de afstand terug
  // als dat meer is): dan mag de rij "sinds 4 wk" zeggen, anders noemt hij de datum.
  near?: boolean;
  // Het verschil in getal met nu, en wat er verder veranderd is.
  change?: number;
  extras: ExtraChange[];
}

export interface Comparison {
  now?: ForgePoint;
  moments: Moment[];
  best?: ForgePoint;
  // Nu is gelijk aan het beste ooit.
  atBest: boolean;
  // De training voor nu en het verschil ermee: de rij valt hierop terug als geen moment
  // in zijn venster valt (een oefening die je lang niet deed of net weer oppakt).
  previous?: ForgePoint;
  previousChange?: number;
}

// Alles voor een rij: nu, de gekozen momenten en het beste ooit. "Nu" is de laatste
// training; de momenten tellen terug vanaf vandaag, dus een oefening die je een tijd
// niet deed, staat ook echt tegenover 4 weken geleden.
export function compareExercise(points: ForgePoint[], today: string, weeks: number[]): Comparison {
  const now = points[points.length - 1];
  const best = bestEver(points);
  const seen = new Set<string>();
  const moments: Moment[] = weeks.map((w) => {
    const asOf = addDays(today, -7 * w);
    const found = snapshotAt(points, asOf);
    // Het venster is even lang als de afstand terug: 4 weken geleden is hoogstens 28 dagen ernaast.
    const inWindow = found !== undefined && daysBetween(found.date, asOf) <= 7 * w;
    if (!found || !inWindow) return { weeks: w, asOf, status: 'none', extras: [] };
    if (found.date === now?.date || seen.has(found.date)) return { weeks: w, asOf, status: 'same', extras: [] };
    seen.add(found.date);
    const change = now ? valueChange(now, found) : undefined;
    const near = daysBetween(found.date, asOf) <= Math.max(7, Math.round((7 * w) / 4));
    return { weeks: w, asOf, status: 'ok', point: found, near, ...(change !== undefined ? { change } : {}), extras: extraChanges(now, found) };
  });
  const previous = points.length >= 2 ? points[points.length - 2] : undefined;
  const previousChange = now && previous ? valueChange(now, previous) : undefined;
  return {
    now,
    moments,
    best,
    atBest: !!now && !!best && now.value >= best.value,
    ...(previous ? { previous } : {}),
    ...(previousChange !== undefined ? { previousChange } : {}),
  };
}

// De getallen voor het kleine lijntje in de lijst: de laatste `n` trainingen, met
// hetzelfde getal als rechts in de rij. Minder dan drie: geen lijntje.
export function trendValues(view: ExerciseView, mode: OneRmView, n = 10): number[] {
  const values = forgePoints(view, mode).slice(-n).map((p) => p.value);
  return values.length >= 3 ? values : [];
}

// --- de geschiedenis -----------------------------------------------------------------------------------

export interface HistoryRow {
  logId: string;
  date: string;
  trainingName: string;
  // De zwaarste set en het volume van deze training.
  topWeightKg?: number;
  topReps?: number;
  volumeKg?: number;
  // Bij een oefening op herhalingen: de herhalingen van de beste set en alle herhalingen samen.
  bestReps?: number;
  totalReps?: number;
  workSetCount: number;
  // De 1RM van ASCEND na deze training, en die van MacroFactor van die dag (of een dag ernaast).
  ascendKg?: number;
  macroFactorKg?: number;
}

const MACROFACTOR_SLACK_DAYS = 1;

function readingNear(readings: OneRmReading[] | undefined, date: string): OneRmReading | undefined {
  let best: OneRmReading | undefined;
  let bestGap = Infinity;
  for (const r of readings ?? []) {
    const gap = Math.abs(daysBetween(date, r.date));
    if (gap <= MACROFACTOR_SLACK_DAYS && gap < bestGap) {
      best = r;
      bestGap = gap;
    }
  }
  return best;
}

// Elke training van de oefening, de nieuwste eerst. De 1RM van ASCEND is dezelfde als
// die van de grafiek (engine/strengthOneRm.ts); die van MacroFactor staat er alleen
// bij als die van die dag bestaat.
export function historyRows(view: ExerciseView, macroFactor?: OneRmReading[]): HistoryRow[] {
  const sessions = [...view.history.sessions].sort((a, b) => a.date.localeCompare(b.date));
  const rows: HistoryRow[] = [];
  sessions.forEach((s, i) => {
    const p = view.points[i];
    const sets = s.sets.filter(isWorkSet);
    const volumeKg = volumeOf(sets);
    const mf = readingNear(macroFactor, s.date);
    const repCounts = sets.filter((x) => x.reps > 0).map((x) => x.reps);
    const repsLed = isRepsBased(view);
    rows.push({
      logId: s.logId,
      date: s.date,
      trainingName: s.trainingName,
      workSetCount: sets.length,
      ...(repsLed && repCounts.length > 0 ? { bestReps: Math.max(...repCounts), totalReps: repCounts.reduce((a, b) => a + b, 0) } : {}),
      ...(!repsLed && p?.top ? { topWeightKg: p.top.weightKg, topReps: p.top.reps } : {}),
      ...(repsLed && sets.some((x) => (x.weightKg ?? 0) > 0) ? { topWeightKg: Math.max(...sets.map((x) => x.weightKg ?? 0)) } : {}),
      ...(!repsLed && volumeKg !== undefined ? { volumeKg } : {}),
      ...(!repsLed && p?.smoothed !== undefined ? { ascendKg: p.smoothed } : {}),
      ...(!repsLed && mf ? { macroFactorKg: mf.kg } : {}),
    });
  });
  return rows.reverse();
}

// --- zoeken, filteren, sorteren ------------------------------------------------------------------------

// Afstand tussen twee woorden met invoegen, weglaten, vervangen en twee letters die
// van plaats wisselen ("sqaut") als een fout. Stopt zodra het niet meer lukt.
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        rows[i][j] = j;
        continue;
      }
      let d = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, rows[i - 2][j - 2] + 1);
      rows[i][j] = d;
    }
  }
  return rows[a.length][b.length];
}

// Hoeveel typfouten een zoekwoord mag hebben: geen bij korte woorden, een bij
// middellange, twee bij lange.
const typosAllowed = (len: number) => (len >= 7 ? 2 : len >= 4 ? 1 : 0);

// Of een naam bij de zoekterm past. Hoofdletters, accenten en leestekens tellen niet.
// Elk woord van de zoekterm moet een woord van de naam beginnen ("bench" vindt "Bench
// Press", "row" vindt geen "Narrow"); een woord van vijf letters of meer mag ook midden
// in een samengesteld woord staan ("druk" niet, "drukken" wel in "bankdrukken"). Met
// `typos` telt ook een woord met een of twee typfouten ("squatt" vindt "Squat"), mits de
// eerste letter klopt. Een lege zoekterm past bij alles.
export function matchesQuery(name: string, query: string, typos = true): boolean {
  const tokens = normalizeExerciseName(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const words = normalizeExerciseName(name).split(' ').filter(Boolean);
  return tokens.every((t) => {
    if (words.some((w) => w.startsWith(t) || (t.length >= 5 && w.includes(t)))) return true;
    const allowed = typos ? typosAllowed(t.length) : 0;
    if (allowed === 0) return false;
    return words.some((w) => w[0] === t[0] && (editDistance(t, w, allowed) <= allowed || editDistance(t, w.slice(0, t.length), allowed) <= allowed));
  });
}

// De trainingen die als filter getoond worden: de namen van de echte templates waar
// een oefening in gelogd is, in de volgorde van de templates, zonder dubbele namen.
export function trainingFilters(templates: SessionTemplate[], views: ExerciseView[]): string[] {
  const used = new Set<string>();
  for (const v of views) for (const s of v.history.sessions) used.add(s.trainingName);
  const out: string[] = [];
  for (const t of templates) if (used.has(t.name) && !out.includes(t.name)) out.push(t.name);
  return out;
}

// De namen waarop een oefening gevonden wordt: de naam en de andere namen uit de lijst
// ("Bankdrukken met stang" voor de Barbell Bench Press).
export const searchNames = (view: ExerciseView): string[] => [view.history.name, ...(view.history.exercise?.aliases ?? [])];

export const inTraining = (view: ExerciseView, trainingName: string): boolean => view.history.sessions.some((s) => s.trainingName === trainingName);

const lastDate = (v: ExerciseView) => v.history.sessions.reduce((m, s) => (s.date > m ? s.date : m), '');

export function sortViews(views: ExerciseView[], sort: ForgeSort): ExerciseView[] {
  const byName = (a: ExerciseView, b: ExerciseView) => a.history.name.localeCompare(b.history.name, 'nl');
  const copy = [...views];
  if (sort === 'name') return copy.sort(byName);
  if (sort === 'recent') return copy.sort((a, b) => lastDate(b).localeCompare(lastDate(a)) || byName(a, b));
  return copy.sort((a, b) => b.history.sessions.length - a.history.sessions.length || byName(a, b));
}

// Oefeningen die je de laatste `days` dagen nog deed, en die van eerder (een oud schema).
// Forge zet de eerste bovenaan en klapt de tweede weg, zodat een oude oefening zonder
// vergelijking de lijst niet vult. Een oefening zonder trainingen telt als eerder.
export function splitByRecency(views: ExerciseView[], today: string, days: number): { recent: ExerciseView[]; older: ExerciseView[] } {
  const from = addDays(today, -days);
  const recent: ExerciseView[] = [];
  const older: ExerciseView[] = [];
  for (const v of views) (lastDate(v) >= from ? recent : older).push(v);
  return { recent, older };
}

// Eerst alleen echte treffers; typfouten tellen pas als er geen enkele echte treffer is,
// zodat "bent" niet ook Bench Press oplevert.
function filterByQuery(views: ExerciseView[], query: string): ExerciseView[] {
  const exact = views.filter((v) => searchNames(v).some((n) => matchesQuery(n, query, false)));
  if (exact.length > 0 || query.trim() === '') return exact;
  return views.filter((v) => searchNames(v).some((n) => matchesQuery(n, query)));
}

// De lijst zoals Forge hem toont: gefilterd op training en zoekterm, dan gesorteerd.
export function visibleViews(views: ExerciseView[], opts: { query: string; training: string | null; sort: ForgeSort }): ExerciseView[] {
  return sortViews(
    filterByQuery(views.filter((v) => opts.training === null || inTraining(v, opts.training)), opts.query),
    opts.sort,
  );
}
