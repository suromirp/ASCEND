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

export function undoBlocked(input: UndoGuardInput): boolean {
  const ids = new Set([...input.before.map((s) => s.id), ...input.addedIds]);
  if (ids.size === 0) return false;
  for (const id of ids) if (input.loggedIds.has(id)) return true;
  if (!input.written) return false;
  const written = new Map(input.written.map((s) => [s.id, s]));
  for (const id of ids) {
    const w = written.get(id);
    const now = input.current.get(id);
    if (w ? !sameRow(now, w) : !!now) return true;
  }
  return false;
}

// De weekcontrole zette direct na je wijziging iets recht en dat hoort bij dezelfde melding: wat hij schreef
// vervangt de vastgelegde rijen met hetzelfde id, en wat hij weghaalde valt eruit.
export function mergeWritten(
  written: readonly PlannedSession[] | undefined,
  repairedIds: readonly string[],
  repairedNow: readonly PlannedSession[],
): PlannedSession[] | undefined {
  if (!written) return undefined;
  const touched = new Set(repairedIds);
  return [...written.filter((s) => !touched.has(s.id)), ...repairedNow];
}
