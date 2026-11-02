// ASCEND: mag een wijziging uit de melding nog ongedaan worden gemaakt
// (docs/beslissingen/2026-11-02-vandaag-en-ongedaan.md). Alleen als elke rij die de wijziging raakte nog precies
// is wat de wijziging schreef, wat ze weghaalde nog weg is, en niets ervan intussen gelogd werd. Zo zet Ongedaan
// maken nooit een training terug die je daarna zelf verplaatste of al deed. Puur: geen React, geen opslag.

import type { PlannedSession } from '../models/training';

// Een rij als tekst met de velden op naam gesorteerd; een veld zonder waarde telt niet.
function canonical(row: PlannedSession): string {
  const sortKeys = (_: string, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)))
      : v;
  return JSON.stringify(row, sortKeys);
}

export const sameRow = (a: PlannedSession | undefined, b: PlannedSession): boolean => !!a && canonical(a) === canonical(b);

export interface UndoGuardInput {
  // De rijen zoals ze voor de wijziging waren, en wat de wijziging toevoegde.
  before: readonly PlannedSession[];
  addedIds: readonly string[];
  // De rijen zoals de wijziging ze achterliet, direct na het schrijven gelezen. Een id uit before of addedIds dat
  // hier niet in staat, haalde de wijziging weg. Ontbreekt het (een melding van voor deze regel), dan telt
  // alleen of er intussen gelogd is.
  written?: readonly PlannedSession[];
  // De rijen zoals ze nu zijn.
  current: ReadonlyMap<string, PlannedSession>;
  // Geplande trainingen waar nu een log naar verwijst.
  loggedIds: ReadonlySet<string>;
}

// Waarom het niet meer kan: een log, iets wat jij daarna zelf veranderde (een rij met jouw slot van na de
// wijziging), of de planning die intussen verder ging. Null: het kan.
export type UndoBlock = 'logged' | 'yours' | 'plan';

export function undoBlockReason(input: UndoGuardInput): UndoBlock | null {
  const ids = new Set([...input.before.map((s) => s.id), ...input.addedIds]);
  if (ids.size === 0) return null;
  for (const id of ids) if (input.loggedIds.has(id)) return 'logged';
  if (!input.written) return null;
  const written = new Map(input.written.map((s) => [s.id, s]));
  let reason: UndoBlock | null = null;
  for (const id of ids) {
    const w = written.get(id);
    const now = input.current.get(id);
    if (w ? sameRow(now, w) : !now) continue;
    if (now?.lock?.by === 'user' && (now.lock.at !== w?.lock?.at || w?.lock?.by !== 'user')) return 'yours';
    reason = 'plan';
  }
  return reason;
}

export const undoBlocked = (input: UndoGuardInput): boolean => undoBlockReason(input) !== null;

// Wat een planningsronde met een rij deed: hoe hij ervoor was en hoe de ronde hem achterliet (null: er was er
// geen, of de ronde haalde hem weg). `broken`: tussen twee rondes schreef iets anders de rij (de krachtwizard, een
// ander venster), dus wat de rondes deden is niet meer los te zien van die schrijver.
export interface SyncTouch {
  before: PlannedSession | null;
  after: PlannedSession | null;
  broken?: true;
}

const sameOrBothGone = (a: PlannedSession | null | undefined, b: PlannedSession | null | undefined) => (a ? sameRow(b ?? undefined, a) : !b);

// Twee rondes na elkaar voor dezelfde rij: het begin van de eerste, het eind van de laatste. Paste de tweede niet op
// waar de eerste eindigde, dan zat er een andere schrijver tussen.
export function chainTouch(prev: SyncTouch | undefined, next: SyncTouch): SyncTouch {
  if (!prev) return next;
  const broken = prev.broken || !sameOrBothGone(prev.after, next.before);
  return { before: prev.before, after: next.after, ...(broken ? { broken: true as const } : {}) };
}

// De planning schreef rijen opnieuw of haalde ze weg (ProgramHorizonResult.touched): de melding neemt die rij over zoals
// de planning hem achterliet, maar alleen als hij voor de planning nog precies was wat de melding vastlegde (of
// allebei ontbraken). Schreef iets anders hem eerst (zonder melding), dan blijft het oude en weigert ongedaan maken
// terecht. `fresh`: rijen die nu pas bij de melding komen (de weekcontrole zette ze recht); die gelden zoals ze nu
// zijn. Een melding zonder vastgelegde rijen begint leeg, zodat een rij die erbij kwam en die jij daarna veranderde
// nooit blind teruggaat.
export function refreshWritten(
  written: readonly PlannedSession[] | undefined,
  touched: ReadonlyMap<string, SyncTouch>,
  ids: Iterable<string>,
  fresh: ReadonlyMap<string, PlannedSession | null> = new Map(),
): PlannedSession[] {
  const out = new Map((written ?? []).map((s) => [s.id, s]));
  for (const id of ids) {
    if (fresh.has(id)) {
      const row = fresh.get(id);
      if (row) out.set(id, row);
      else out.delete(id);
      continue;
    }
    const t = touched.get(id);
    if (!t || t.broken || !sameOrBothGone(out.get(id), t.before)) continue;
    if (t.after) out.set(id, t.after);
    else out.delete(id);
  }
  return [...out.values()];
}
