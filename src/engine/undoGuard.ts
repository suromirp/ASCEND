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

// De planning schreef rijen opnieuw of haalde ze weg (ProgramHorizonResult.touchedIds), of de weekcontrole zette
// iets recht dat bij de melding komt: die rijen gelden nu zoals ze nu zijn, zodat een terechte undo niet geweigerd
// wordt omdat de planning verder ging. Een melding zonder vastgelegde rijen begint leeg, zodat een rij die erbij kwam
// en die jij daarna veranderde nooit blind teruggaat.
export function refreshWritten(
  written: readonly PlannedSession[] | undefined,
  ids: Iterable<string>,
  now: ReadonlyMap<string, PlannedSession>,
): PlannedSession[] {
  const touched = new Set(ids);
  const kept = (written ?? []).filter((s) => !touched.has(s.id));
  const fresh = [...touched].map((id) => now.get(id)).filter((s): s is PlannedSession => !!s);
  return [...kept, ...fresh];
}
