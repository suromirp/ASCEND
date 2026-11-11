// ASCEND: het verloop van een training in Forge, zoals het Event Log van MacroFactor: per moment
// welke set van wat naar wat ging en waardoor. Pure; geen React. Het is afgeleid van wat er in de
// training gebeurt (de rijen voor en na een verandering), bewaard naast het concept en bij het
// maken van het log, en nooit achteraf in een bestaand log geschreven.
// Besluit: docs/beslissingen/2026-10-28-forge-logboek.md.
//
// De zes soorten, in de woorden van de app:
// - bijgestuurd: Forge stelde "Lichter" voor en jij nam het voorstel over;
// - doorgevoerd: jouw wijziging van een set ging naar de volgende sets (Wijzigingen doorvoeren);
// - eigen: jij paste een set zelf aan;
// - onder: een set kwam onder het bereik van het voorschrift;
// - past-niet: geen gewicht van het toestel past bij een set;
// - spotter: minstens 1 over voorgeschreven omdat falen zonder spotter gevaarlijk is;
// - toegevoegd en weggehaald: een set die jij erbij zette of weghaalde (eigen handelingen, geen punt op de knop);
// - meegerekend: Forge stelde na een afgevinkte set de volgende set bij ("Forge rekent mee", engine/forgeReckon.ts).

import { FORGE_EVENT_KINDS, type ForgeEvent, type ForgeEventKind, type ForgeSetState } from '../models/forgeLog';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';
import type { ExerciseSetLog, SetLog } from '../models/training';
import { kgLabel } from '../utils/kg';
import { formatClock } from '../utils/clock';

export { FORGE_EVENT_KINDS };
export type { ForgeEvent, ForgeEventKind, ForgeSetState };

export const FORGE_LOG_MAX = 200;
// Binnen zoveel milliseconden telt een tweede wijziging van dezelfde set als dezelfde handeling
// (een getal intypen is meerdere toetsen, een stapje omhoog meerdere tikken).
export const MERGE_MS = 60_000;

// --- de stand van een rij ---------------------------------------------------------------------

function stateOf(row: Pick<WorkoutRow, 'weightKg' | 'reps' | 'rir'>): ForgeSetState {
  return {
    ...(row.weightKg !== undefined ? { kg: row.weightKg } : {}),
    ...(row.reps !== undefined ? { reps: row.reps } : {}),
    ...(row.rir !== undefined ? { rir: row.rir } : {}),
  };
}

const sameState = (a: ForgeSetState | undefined, b: ForgeSetState | undefined) => a?.kg === b?.kg && a?.reps === b?.reps && a?.rir === b?.rir;

// Het nummer van een rij: "1" voor de eerste werkset, "W1" voor de eerste opwarmset.
export function setLabel(ex: Pick<WorkoutExercise, 'rows'>, rowId: string): string {
  const row = ex.rows.find((r) => r.id === rowId);
  if (!row) return '';
  const same = ex.rows.filter((r) => r.kind === row.kind);
  const n = same.findIndex((r) => r.id === rowId) + 1;
  return row.kind === 'warmup' ? `W${n}` : String(n);
}

// --- wat er veranderde ------------------------------------------------------------------------

export type ForgeCause =
  // Jij veranderde iets. `edited` is de set die je aanraakte; wat daarna in andere werksets veranderde is doorgevoerd.
  | { kind: 'eigen'; edited?: { slot: string; rowId: string } }
  | { kind: 'bijgestuurd' }
  // Forge rekende mee na het afvinken: de volgende open set kreeg wat Forge nu verwacht. `via` is de set die je
  // afvinkte of waar je de RIR koos (de oorzaak); zonder `via` (een oud concept) zegt de zin "je vorige set".
  | { kind: 'meegerekend'; via?: { slot: string; rowId: string } }
  // Een verandering die geen gebeurtenis is: een nieuwe planning, een geruilde oefening, afvinken.
  | { kind: 'negeer' };

// De gebeurtenissen van één verandering van de training: alleen sets waarvan kilo's, herhalingen of
// reserve veranderden terwijl ze niet in dezelfde stap werden afgevinkt of teruggezet.
export function deriveChanges(before: WorkoutExercise[], after: WorkoutExercise[], cause: ForgeCause, at: number, newId: () => string): ForgeEvent[] {
  if (cause.kind === 'negeer') return [];
  const out: ForgeEvent[] = [];
  for (const ex of after) {
    const was = before.find((e) => e.slot === ex.slot);
    if (!was || was.exerciseId !== ex.exerciseId) continue;
    const editedRow = cause.kind === 'eigen' && cause.edited?.slot === ex.slot ? cause.edited.rowId : undefined;
    for (const row of ex.rows) {
      const old = was.rows.find((r) => r.id === row.id);
      if (!old || old.done !== row.done) continue;
      const from = stateOf(old);
      const to = stateOf(row);
      if (sameState(from, to)) continue;
      let kind: ForgeEventKind;
      if (cause.kind === 'bijgestuurd') kind = 'bijgestuurd';
      else if (cause.kind === 'meegerekend') kind = 'meegerekend';
      else if (editedRow === undefined || row.id === editedRow) kind = 'eigen';
      else {
        // Wat in andere sets meeveranderde: alleen werksets, de opwarmsets volgen het eerste gewicht vanzelf.
        if (row.kind !== 'work') continue;
        kind = 'doorgevoerd';
      }
      out.push({
        id: newId(),
        at,
        exerciseId: ex.exerciseId,
        exercise: ex.name,
        rowId: row.id,
        set: setLabel(ex, row.id),
        kind,
        from,
        to,
        ...(kind === 'doorgevoerd' && editedRow ? { via: setLabel(ex, editedRow) } : {}),
        ...(cause.kind === 'meegerekend' && cause.via?.slot === ex.slot && ex.rows.some((r) => r.id === cause.via!.rowId) ? { via: setLabel(ex, cause.via.rowId) } : {}),
      });
    }
  }
  return out;
}

// Een set die onder het bereik kwam, bij het afvinken: wat je deed, en waarom dat telt.
export function underRangeEvent(ex: WorkoutExercise, row: WorkoutRow, at: number, id: string): ForgeEvent {
  const t = row.target;
  const range = t.repsLow === t.repsHigh ? `${t.repsLow}` : `${t.repsLow} tot ${t.repsHigh}`;
  return {
    id, at, exerciseId: ex.exerciseId, exercise: ex.name, rowId: row.id, set: setLabel(ex, row.id), kind: 'onder',
    to: stateOf(row),
    fact: `Onder het bereik van ${range} herhalingen${t.rir !== undefined ? ` met ${t.rir} over` : ''}.`,
  };
}

// De oefening waarvoor geen gewicht van het toestel past, bij de set die het niet haalt.
export function noFitEvent(ex: WorkoutExercise, fit: { rowId?: string; setNo?: number; weightKg?: number; repsLow: number; repsHigh: number }, at: number, id: string): ForgeEvent | undefined {
  if (fit.rowId === undefined) return undefined;
  const range = fit.repsLow === fit.repsHigh ? `${fit.repsLow}` : `${fit.repsLow} tot ${fit.repsHigh}`;
  return {
    id, at, exerciseId: ex.exerciseId, exercise: ex.name, rowId: fit.rowId, set: fit.setNo !== undefined ? String(fit.setNo) : setLabel(ex, fit.rowId), kind: 'past-niet',
    ...(fit.weightKg !== undefined ? { to: { kg: fit.weightKg } } : {}),
    fact: `Geen gewicht van dit toestel past bij ${range} herhalingen.`,
  };
}

// Een set die jij toevoegde of weghaalde. Het nummer is dat van het moment zelf.
export function setCountEvent(kind: 'toegevoegd' | 'weggehaald', ex: Pick<WorkoutExercise, 'exerciseId' | 'name'>, row: WorkoutRow, label: string, at: number, id: string): ForgeEvent {
  return {
    id, at, exerciseId: ex.exerciseId, exercise: ex.name, rowId: row.id, set: label, kind,
    ...(kind === 'toegevoegd' ? { to: stateOf(row) } : {}),
    fact: kind === 'toegevoegd' ? 'Je voegde deze set zelf toe.' : 'Je haalde deze set zelf weg.',
  };
}

// Bij het begin: de sets waar Forge minstens 1 over voorschreef omdat falen zonder spotter gevaarlijk is.
export function spotterEvents(workout: WorkoutExercise[], at: number, newId: () => string): ForgeEvent[] {
  const out: ForgeEvent[] = [];
  for (const ex of workout) {
    const rows = ex.rows.filter((r) => r.kind === 'work' && r.target.spotter);
    if (rows.length === 0) continue;
    const labels = rows.map((r) => setLabel(ex, r.id));
    out.push({
      id: newId(), at, exerciseId: ex.exerciseId, exercise: ex.name, rowId: rows[0].id,
      set: labels.length === 1 ? labels[0] : `${labels[0]} tot ${labels[labels.length - 1]}`,
      kind: 'spotter',
      to: { rir: 1 },
      fact: 'Zonder spotter schrijft Forge minstens 1 over voor. 0 invullen kan altijd.',
    });
  }
  return out;
}

// --- bijhouden ---------------------------------------------------------------------------------

// Nieuwe gebeurtenissen erbij. Een tweede wijziging van dezelfde set, van dezelfde soort en vlak erna,
// is dezelfde handeling: begin van de eerste, einde van de laatste, en niets als het weer gelijk is.
export function appendEvents(log: ForgeEvent[], events: ForgeEvent[]): ForgeEvent[] {
  let out = log;
  for (const ev of events) {
    const i = out.findLastIndex((e) => e.rowId === ev.rowId && e.kind === ev.kind && e.exerciseId === ev.exerciseId);
    const prev = i >= 0 ? out[i] : undefined;
    const mergeable = prev && (ev.kind === 'eigen' || ev.kind === 'doorgevoerd') && ev.at - prev.at <= MERGE_MS;
    if (prev && mergeable) {
      if (sameState(prev.from, ev.to)) out = out.filter((_, k) => k !== i);
      else out = out.map((e, k) => (k === i ? { ...prev, at: ev.at, to: ev.to } : e));
      continue;
    }
    // Dezelfde melding twee keer (een set die je afvinkt, terugzet en weer afvinkt) blijft er één.
    if (prev && (ev.kind === 'onder' || ev.kind === 'past-niet') && ev.at - prev.at <= MERGE_MS) {
      out = out.map((e, k) => (k === i ? { ...ev, id: prev.id } : e));
      continue;
    }
    out = [...out, ev];
  }
  return out.length > FORGE_LOG_MAX ? out.slice(out.length - FORGE_LOG_MAX) : out;
}

// --- open of opgelost ------------------------------------------------------------------------

// Een melding "past niet" is open zolang die set er nog zo bij staat. Zodra je hem aanpaste,
// afvinkte of weghaalde is hij opgelost. Alle andere soorten zijn feiten en blijven staan.
export function isOpen(ev: ForgeEvent, workout: WorkoutExercise[]): boolean {
  if (ev.kind !== 'past-niet') return false;
  const row = workout.find((e) => e.exerciseId === ev.exerciseId)?.rows.find((r) => r.id === ev.rowId);
  return !!row && !row.done && !row.edited && (ev.to?.kg === undefined || row.weightKg === ev.to.kg);
}

// Soorten die een stip verdienen: wat Forge deed of zag. Wat je zelf aanpaste weet je al.
// Het spotterteken staat al bij de set zelf, dus het telt niet mee voor de stip.

const NOTABLE: ForgeEventKind[] = ['bijgestuurd', 'doorgevoerd', 'onder', 'past-niet'];

// Het aantal nieuwe gebeurtenissen sinds je het verloop voor het laatst opende. Een opgeloste melding telt niet.
export function unseenCount(log: ForgeEvent[], seenAt: number, workout: WorkoutExercise[]): number {
  return log.filter((e) => e.at > seenAt && NOTABLE.includes(e.kind) && (e.kind !== 'past-niet' || isOpen(e, workout))).length;
}

// --- woorden ---------------------------------------------------------------------------------

export const stateText = (s: ForgeSetState | undefined): string => {
  if (!s) return '';
  const kg = s.kg !== undefined ? kgLabel(s.kg, 2) : '';
  const reps = s.reps !== undefined ? `${s.reps}` : '';
  if (kg && reps) return `${kg} × ${reps}`;
  return kg || (reps ? `${reps} herh.` : '');
};

export function clockText(at: number): string {
  return formatClock(at);
}

// Waardoor, in een zin.
export function becauseText(ev: ForgeEvent): string {
  switch (ev.kind) {
    case 'bijgestuurd':
      return 'Forge stuurde bij: je koos Lichter.';
    case 'doorgevoerd':
      return ev.via ? `Doorgevoerd vanuit set ${ev.via}.` : 'Doorgevoerd uit je eigen wijziging.';
    case 'eigen':
      return 'Je paste dit zelf aan.';
    case 'meegerekend': {
      // Zeg wat er gebeurde en waarom, niet alleen dat Forge rekende.
      const from = ev.from?.kg;
      const to = ev.to?.kg;
      if (from !== undefined && to !== undefined && to < from) return 'Lichter gezet: je vorige set ging zwaarder dan gepland.';
      if (from !== undefined && to !== undefined && to > from) return 'Zwaarder gezet: je vorige set ging makkelijker dan gepland.';
      return 'Herhalingen aangepast aan hoe je vorige set ging.';
    }
    case 'onder':
    case 'past-niet':
    case 'spotter':
    case 'toegevoegd':
    case 'weggehaald':
      return ev.fact ?? '';
  }
}

// De titel van een gebeurtenis: oefening en set.
export const eventTitle = (ev: ForgeEvent): string => (ev.set ? `${ev.exercise}, set ${ev.set}` : ev.exercise);

// --- een regel per set -------------------------------------------------------------------------
// Besluit: docs/beslissingen/2026-11-11-forge-verloop.md. Het verloop zelf (de lijst gebeurtenissen) blijft
// zoals het is; hier wordt het alleen per set samengevoegd tot een regel met het eindresultaat en alle redenen.

// "Verloop toont": alleen de sets met een wijziging (het advies) of alle sets. Afwezig of iets geks is het advies.
export type ForgeLogView = 'wijzigingen' | 'alle';
export const DEFAULT_FORGE_LOG_VIEW: ForgeLogView = 'wijzigingen';
export function resolveForgeLogView(raw: { forgeLogView?: unknown } | undefined | null): ForgeLogView {
  return raw?.forgeLogView === 'alle' ? 'alle' : DEFAULT_FORGE_LOG_VIEW;
}

export interface SetLine {
  key: string;
  // "1", "2" voor een werkset, "W1" voor een opwarmset.
  set: string;
  warmup: boolean;
  // Het eindresultaat: wat er nu in de set staat (tijdens de training) of wat er gelogd is (na afloop).
  kg?: number;
  reps?: number;
  seconds?: number;
  rir?: number;
  // De RIR is het doel van het voorschrift, niet zelf gekozen (afgevinkt zonder RIR).
  rirAssumed?: boolean;
  // Afgevinkt; undefined als dat niet te weten is (een set die alleen nog in het verloop staat).
  done?: boolean;
  // Weggehaald en niet teruggekomen.
  removed?: boolean;
  // Er gebeurde iets met deze set (een regel in Wijzigingen).
  changed: boolean;
  // Na afloop: deze set staat alleen in het verloop en niet in het log, dus je deed hem niet.
  skipped?: boolean;
  // Een melding "past niet" die nog open staat (alleen tijdens de training).
  open?: boolean;
  // De zwaarste werkset van de oefening.
  heaviest?: boolean;
  // Alle redenen in een zin, of leeg.
  reason: string;
}

export interface ExerciseLines {
  // Uniek per blok, ook als dezelfde oefening twee keer in een training staat.
  key: string;
  exerciseId: string;
  exercise: string;
  lines: SetLine[];
}

const lowerFirst = (t: string) => (t ? t[0].toLowerCase() + t.slice(1) : t);
const noPeriod = (t: string) => t.replace(/\.\s*$/, '');

// Een reden als deel van een zin, zonder hoofdletter en punt.
function reasonPart(ev: ForgeEvent): string {
  switch (ev.kind) {
    case 'bijgestuurd':
      return 'bijgestuurd met Lichter';
    case 'doorgevoerd':
      return ev.via ? `doorgevoerd vanuit set ${ev.via}` : 'doorgevoerd uit je eigen wijziging';
    case 'eigen':
      return 'zelf aangepast';
    case 'meegerekend': {
      const from = ev.from?.kg;
      const to = ev.to?.kg;
      const cause = ev.via ? `set ${ev.via}` : 'je vorige set';
      if (from !== undefined && to !== undefined && to < from) return `lichter gezet omdat ${cause} zwaarder ging dan gepland`;
      if (from !== undefined && to !== undefined && to > from) return `zwaarder gezet omdat ${cause} makkelijker ging dan gepland`;
      return `herhalingen aangepast aan ${cause}`;
    }
    case 'onder':
      return ev.fact ? lowerFirst(noPeriod(ev.fact)) : 'onder het bereik';
    case 'past-niet':
      return ev.fact ? lowerFirst(noPeriod(ev.fact)) : 'geen gewicht van dit toestel past';
    case 'spotter':
      return 'zonder spotter minstens 1 over';
    case 'toegevoegd':
      return 'zelf toegevoegd';
    case 'weggehaald':
      return 'zelf weggehaald';
  }
}

// De delen achter elkaar in een zin: "Zelf aangepast en onder het bereik van 8 tot 10 herhalingen."
export function joinReasons(parts: string[]): string {
  const list = [...new Set(parts.filter(Boolean))];
  if (list.length === 0) return '';
  const text = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} en ${list[list.length - 1]}`;
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

// De nummers van een spotterregel: "1 tot 3" is 1, 2 en 3; "2" is 2. Dat klopt omdat spotterEvents alleen
// aaneengesloten werksets in een bereik zet; verandert dat, koppel dan via de rij-id's.
function spotterLabels(set: string): string[] {
  const m = /^(\d+) tot (\d+)$/.exec(set);
  if (!m) return [set];
  const out: string[] = [];
  for (let i = Number(m[1]); i <= Number(m[2]) && out.length < 30; i++) out.push(String(i));
  return out;
}

// De laatste stand uit het verloop, veld voor veld (voor een set die nergens anders meer staat).
function lastState(events: ForgeEvent[]): ForgeSetState {
  const out: ForgeSetState = {};
  for (const ev of events) {
    const s = ev.kind === 'spotter' ? undefined : (ev.to ?? ev.from);
    if (s?.kg !== undefined) out.kg = s.kg;
    if (s?.reps !== undefined) out.reps = s.reps;
    if (s?.rir !== undefined) out.rir = s.rir;
  }
  return out;
}

// De nummers van gelogde sets, zoals setLabel ze geeft: W1, W2 voor opwarmsets, 1, 2 voor werksets.
function loggedLabels(sets: SetLog[]): string[] {
  let w = 0;
  let k = 0;
  return sets.map((s) => (s.kind === 'warmup' ? `W${++w}` : String(++k)));
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

interface Draft {
  line: SetLine;
  events: ForgeEvent[];
  readded?: boolean;
  // Alleen in het verloop: de stand komt uit de gebeurtenissen.
  loose?: boolean;
}

// Het verloop per set: per oefening een regel per set met het eindresultaat (gewicht, herhalingen, RIR) en alle
// redenen in een zin. Tijdens de training komen de sets uit `workout`, na afloop uit het log (`logged`); zonder
// beide alleen uit het verloop zelf. Wijzigingen toont de sets waar iets mee gebeurde, Alle sets alles.
// Het verloop wordt nooit veranderd: dit is alleen weergave.
export function linesPerSet(events: ForgeEvent[], opts: { workout?: WorkoutExercise[]; logged?: ExerciseSetLog[]; view: ForgeLogView }): ExerciseLines[] {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  type Group = { key: string; exerciseId: string; exercise: string; drafts: Draft[]; tail: Draft[] };
  const groups: Group[] = [];
  // Een blok per oefening zoals die in de training of het log staat (dezelfde oefening kan er twee keer staan).
  const newGroup = (exerciseId: string, name: string): Group => {
    const g = { key: `${groups.length}:${exerciseId}`, exerciseId, exercise: name, drafts: [], tail: [] };
    groups.push(g);
    return g;
  };
  // Voor een gebeurtenis: het eerste blok van die oefening, of een nieuw blok achteraan.
  const groupOf = (exerciseId: string, name: string) => groups.find((x) => x.exerciseId === exerciseId) ?? newGroup(exerciseId, name);
  // Waar een set staat: per oefening per rij-id (de training, of een log met rij-id's) en per nummer. Bij dezelfde
  // oefening twee keer telt het eerste blok.
  const byRow = new Map<string, Draft>();
  const byLabel = new Map<string, Draft>();
  const rowKey = (exerciseId: string, rowId: string) => `${exerciseId}\u0000${rowId}`;
  const labelKey = (exerciseId: string, label: string) => `${exerciseId}\u0000${label}`;
  const put = (m: Map<string, Draft>, k: string, d: Draft) => {
    if (!m.has(k)) m.set(k, d);
  };
  // Oefeningen waarvan het log rij-id's heeft: daar koppelt een gebeurtenis alleen op rij-id, nooit op nummer.
  const loggedWithRows = new Set<string>();

  if (opts.workout) {
    for (const ex of opts.workout) {
      const g = newGroup(ex.exerciseId, ex.name);
      for (const r of ex.rows) {
        const set = setLabel(ex, r.id);
        const d: Draft = {
          line: {
            key: `${g.key}:${r.id}`, set, warmup: r.kind === 'warmup',
            ...(isNumber(r.weightKg) ? { kg: r.weightKg } : {}),
            ...(isNumber(r.reps) && !ex.hold ? { reps: r.reps } : {}),
            ...(ex.hold && isNumber(r.seconds) ? { seconds: r.seconds } : {}),
            ...(r.kind === 'work' && isNumber(r.rir) && !ex.hold ? { rir: r.rir } : {}),
            ...(r.kind === 'work' && r.rirAssumed && isNumber(r.rir) ? { rirAssumed: true } : {}),
            done: r.done, changed: false, reason: '',
          },
          events: [],
        };
        g.drafts.push(d);
        put(byRow, rowKey(ex.exerciseId, r.id), d);
        put(byLabel, labelKey(ex.exerciseId, set), d);
      }
    }
  } else if (opts.logged) {
    for (const ex of opts.logged) {
      if (!ex || typeof ex.exerciseId !== 'string' || !Array.isArray(ex.sets)) continue;
      const g = newGroup(ex.exerciseId, typeof ex.exerciseName === 'string' ? ex.exerciseName : ex.exerciseId);
      const sets = ex.sets.filter((s): s is SetLog => !!s && typeof s === 'object');
      const labels = loggedLabels(sets);
      sets.forEach((s, i) => {
        const warmup = s.kind === 'warmup';
        const d: Draft = {
          line: {
            key: `${g.key}:${i}`, set: labels[i], warmup,
            ...(isNumber(s.weightKg) ? { kg: s.weightKg } : {}),
            ...(isNumber(s.seconds) ? { seconds: s.seconds } : isNumber(s.reps) ? { reps: s.reps } : {}),
            ...(!warmup && isNumber(s.rir) ? { rir: s.rir } : {}),
            ...(!warmup && s.rirAssumed === true && isNumber(s.rir) ? { rirAssumed: true } : {}),
            done: true, changed: false, reason: '',
          },
          events: [],
        };
        g.drafts.push(d);
        if (typeof s.rowId === 'string' && s.rowId) {
          put(byRow, rowKey(ex.exerciseId, s.rowId), d);
          loggedWithRows.add(ex.exerciseId);
        }
        put(byLabel, labelKey(ex.exerciseId, labels[i]), d);
      });
    }
  }

  // Weggehaald en daarna weer een set met hetzelfde nummer toegevoegd: een regel, die van de nieuwe set.
  const readded = new Set<string>();
  // Elke toegevoegde set hoort bij hoogstens een weggehaalde; de koppeling naar de rij gaat via zijn eigen rij-id.
  const backOf = new Map<string, string>();
  const backFor = new Map<string, ForgeEvent>();
  for (const ev of sorted) {
    if (ev.kind !== 'weggehaald') continue;
    const back = sorted.find((x) => x.kind === 'toegevoegd' && x.exerciseId === ev.exerciseId && x.set === ev.set && x.at >= ev.at && !backOf.has(x.id));
    if (back) {
      readded.add(ev.id);
      backOf.set(back.id, ev.id);
      backFor.set(ev.id, back);
    }
  }

  // Een teruggezette set die daarna zelf weer werd weggehaald (een tussenstap in een keten).
  const gone = (added: ForgeEvent) => sorted.some((x) => x.kind === 'weggehaald' && x.exerciseId === added.exerciseId && x.rowId === added.rowId && x.at >= added.at);

  // Een set die alleen nog in het verloop staat (weggehaald, of een oefening die niet meer in de training staat).
  const loose = new Map<string, Draft>();
  const looseFor = (ev: ForgeEvent, set: string, removed: boolean): Draft => {
    const key = removed ? `${ev.exerciseId}:weg:${ev.rowId}` : `${ev.exerciseId}:los:${set}`;
    let d = loose.get(key);
    if (!d) {
      d = { line: { key, set, warmup: set.startsWith('W'), changed: false, reason: '', ...(removed ? { removed: true } : {}) }, events: [], loose: true };
      loose.set(key, d);
      groupOf(ev.exerciseId, ev.exercise).tail.push(d);
    }
    return d;
  };

  // De set van een gebeurtenis: op rij-id, en op nummer alleen waar geen rij-id's zijn (een oud log, of de
  // tweede en volgende set van een spotterregel, die alleen het eerste rij-id draagt).
  const targetFor = (ev: ForgeEvent, label: string, first: boolean): Draft | undefined => {
    const hit = first ? byRow.get(rowKey(ev.exerciseId, ev.rowId)) : undefined;
    if (hit) return hit;
    if (opts.workout) return first ? undefined : byLabel.get(labelKey(ev.exerciseId, label));
    if (first && loggedWithRows.has(ev.exerciseId)) return undefined;
    return byLabel.get(labelKey(ev.exerciseId, label));
  };

  for (const ev of sorted) {
    if (ev.kind === 'weggehaald') {
      if (readded.has(ev.id)) {
        // De regel van de set die terugkwam krijgt deze reden erbij.
        const back = backFor.get(ev.id)!;
        // Is de teruggezette set later zelf weer weggehaald, dan gaat de keten verder bij die weghaling.
        if (gone(back)) continue;
        const d = targetFor(back, back.set, true) ?? looseFor(back, back.set, false);
        d.readded = true;
        d.events.push(ev);
        continue;
      }
      // Tijdens de training is een weggehaalde rij er niet meer; komt hij toch nog voor (Terugdraaien), dan geldt de rij.
      const still = opts.workout ? byRow.get(rowKey(ev.exerciseId, ev.rowId)) : undefined;
      (still ?? looseFor(ev, ev.set, true)).events.push(ev);
      continue;
    }
    if (ev.kind === 'toegevoegd' && backOf.has(ev.id) && gone(ev)) continue;
    const labels = ev.kind === 'spotter' ? spotterLabels(ev.set) : [ev.set];
    for (const [i, label] of labels.entries()) {
      const hit = targetFor(ev, label, i === 0);
      // Een spotterregel is het voorschrift: zonder set erbij geen losse regel (geen lege "Set 3").
      if (!hit && ev.kind === 'spotter') continue;
      (hit ?? looseFor(ev, label, false)).events.push(ev);
    }
  }

  const out: ExerciseLines[] = [];
  for (const g of groups) {
    const all = [...g.drafts, ...g.tail];
    for (const d of all) {
      const evs = d.events;
      if (d.loose) Object.assign(d.line, stateLine(lastState(evs)));
      // Na afloop is een set die niet in het log staat nooit gedaan.
      if (d.loose && opts.logged && !opts.workout && !d.line.removed) {
        d.line.skipped = true;
        d.line.done = false;
      }
      // Wijzigingen: alles behalve alleen de spotterregel (dat is het voorschrift, geen wijziging).
      d.line.changed = evs.some((e) => e.kind !== 'spotter');
      const parts = evs.filter((e) => !(d.readded && (e.kind === 'weggehaald' || e.kind === 'toegevoegd'))).map(reasonPart);
      if (d.readded) parts.unshift('weggehaald en weer toegevoegd');
      d.line.reason = joinReasons(parts);
      const unsolved = opts.workout ? evs.find((e) => e.kind === 'past-niet' && isOpen(e, opts.workout!)) : undefined;
      if (unsolved) d.line.open = true;
    }
    // De zwaarste werkset: het hoogste gewicht, bij gelijk gewicht de meeste herhalingen; alleen gedane sets en
    // alleen als er minstens twee zijn om te vergelijken.
    const work = all.filter((d) => !d.loose && !d.line.warmup && d.line.done !== false && d.line.kg !== undefined);
    if (work.length >= 2) {
      const best = work.reduce((a, b) => ((b.line.kg! > a.line.kg! || (b.line.kg === a.line.kg && (b.line.reps ?? 0) > (a.line.reps ?? 0))) ? b : a));
      best.line.heaviest = true;
    }
    // Alle sets: tijdens de training de gedane sets en de sets met een reden, niet een kopie van het Forge-scherm.
    const shown = (l: SetLine) => (opts.view === 'alle' ? !opts.workout || l.done === true || l.reason !== '' || !!l.removed : l.changed);
    const lines = all.map((d) => d.line).filter(shown);
    if (lines.length > 0) out.push({ key: g.key, exerciseId: g.exerciseId, exercise: g.exercise, lines });
  }
  return out;
}

// De lege stand van het blad: voor het eerste afvinken is er nog niets gebeurd; daarna ging alles volgens schema.
export function forgeLogEmptyText(workout: WorkoutExercise[] | undefined): string {
  const started = !workout || workout.some((ex) => ex.rows.some((r) => r.done));
  return started ? 'Geen wijzigingen, alles volgens schema.' : 'Nog niets veranderd.';
}

function stateLine(s: ForgeSetState): Partial<SetLine> {
  return { ...(s.kg !== undefined ? { kg: s.kg } : {}), ...(s.reps !== undefined ? { reps: s.reps } : {}), ...(s.rir !== undefined ? { rir: s.rir } : {}) };
}

// --- lezen uit opslag -----------------------------------------------------------------------------

const isNum = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

function cleanState(raw: unknown): ForgeSetState | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const out: ForgeSetState = {
    ...(isNum(r.kg, -500, 500) ? { kg: r.kg } : {}),
    ...(isNum(r.reps, 0, 100) ? { reps: r.reps } : {}),
    ...(isNum(r.rir, 0, 10) ? { rir: r.rir } : {}),
  };
  return Object.keys(out).length > 0 ? out : undefined;
}

function cleanEvent(raw: unknown): ForgeEvent | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const kind = FORGE_EVENT_KINDS.find((k) => k === r.kind);
  if (!kind || !isText(r.id, 60) || !isNum(r.at, 0, 8.64e15) || !isText(r.exerciseId, 60) || !isText(r.exercise, 120) || !isText(r.rowId, 80)) return undefined;
  const from = cleanState(r.from);
  const to = cleanState(r.to);
  return {
    id: r.id, at: r.at, exerciseId: r.exerciseId, exercise: r.exercise, rowId: r.rowId,
    set: typeof r.set === 'string' && r.set.length <= 12 ? r.set : '',
    kind,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(isText(r.fact, 200) ? { fact: r.fact } : {}),
    ...(isText(r.via, 12) ? { via: r.via } : {}),
  };
}

// Het verloop zoals het uit een bestand of een concept komt: alleen wat heel is, op tijd gesorteerd,
// hoogstens FORGE_LOG_MAX. Undefined als er niets over is.
export function cleanForgeLog(raw: unknown): ForgeEvent[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const list = raw
    .map(cleanEvent)
    .filter((e): e is ForgeEvent => !!e && !seen.has(e.id) && !!seen.add(e.id))
    .sort((a, b) => a.at - b.at)
    .slice(-FORGE_LOG_MAX);
  return list.length > 0 ? list : undefined;
}
