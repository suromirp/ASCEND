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
// - spotter: minstens 1 over voorgeschreven omdat falen zonder spotter gevaarlijk is.

import { FORGE_EVENT_KINDS, type ForgeEvent, type ForgeEventKind, type ForgeSetState } from '../models/forgeLog';
import { formatNumberNL } from '../utils/number';
import type { WorkoutExercise, WorkoutRow } from './forgeWorkout';

export { FORGE_EVENT_KINDS };
export type { ForgeEvent, ForgeEventKind, ForgeSetState };

export const FORGE_LOG_MAX = 200;
// Binnen zoveel milliseconden telt een tweede wijziging van dezelfde set als dezelfde handeling
// (een getal intypen is meerdere toetsen, een stapje omhoog meerdere tikken).
export const MERGE_MS = 60_000;

// --- de stand van een rij ---------------------------------------------------------------------

export function stateOf(row: Pick<WorkoutRow, 'weightKg' | 'reps' | 'rir'>): ForgeSetState {
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
  const kg = s.kg !== undefined ? `${formatNumberNL(s.kg, 2)} kg` : '';
  const reps = s.reps !== undefined ? `${s.reps}` : '';
  if (kg && reps) return `${kg} × ${reps}`;
  return kg || (reps ? `${reps} herh.` : '');
};

const pad = (n: number) => String(n).padStart(2, '0');
export function clockText(at: number): string {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    case 'onder':
    case 'past-niet':
    case 'spotter':
      return ev.fact ?? '';
  }
}

// De titel van een gebeurtenis: oefening en set.
export const eventTitle = (ev: ForgeEvent): string => (ev.set ? `${ev.exercise}, set ${ev.set}` : ev.exercise);

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
