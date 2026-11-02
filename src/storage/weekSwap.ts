// ASCEND: een ruil van twee trainingen wegschrijven (engine/weekSwap.ts). Beide rijen in één transactie:
// gaat er halverwege iets mis, dan blijven ze allebei staan zoals ze waren. Eerst wordt gekeken of de twee
// nog zijn wat de ruil verwachtte (dezelfde dag, niet gelogd); zo niet, dan schrijft hij niets.

import type { PlanLock, PlannedSession } from '../models/training';
import { swapRows } from '../engine/weekSwap';
import { getDB } from './database';

export const SWAP_STALE = 'Een van de twee trainingen is intussen veranderd. Kijk in je week wat er nu staat.';
export const SWAP_UNDO_STALE = 'Een van de twee trainingen is na de ruil nog veranderd. Ongedaan maken kan niet meer; zet ze zelf terug als je wilt.';

// Wat een ruil aan een rij verandert: de dag, de status, waar hij vandaan kwam en het slot.
const sameAsWritten = (row: PlannedSession | undefined, written: PlannedSession) => !!row
  && row.scheduledDate === written.scheduledDate && row.status === written.status
  && row.movedFromDate === written.movedFromDate && row.lock?.at === written.lock?.at && row.lock?.by === written.lock?.by;

export async function writeSwap(change: { aId: string; aFrom: string; bId: string; bFrom: string }, lock: PlanLock): Promise<{ before: [PlannedSession, PlannedSession]; after: [PlannedSession, PlannedSession] }> {
  const db = await getDB();
  const tx = db.transaction(['plannedSessions', 'sessionLogs'], 'readwrite');
  const sessions = tx.objectStore('plannedSessions');
  const [a, b, logs] = await Promise.all([sessions.get(change.aId), sessions.get(change.bId), tx.objectStore('sessionLogs').getAll()]);
  const logged = new Set(logs.map((l) => l.plannedSessionId));
  if (!a || !b || a.scheduledDate !== change.aFrom || b.scheduledDate !== change.bFrom || a.status === 'skipped' || b.status === 'skipped' || logged.has(a.id) || logged.has(b.id)) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw new Error(SWAP_STALE);
  }
  const after = swapRows(a, b, lock);
  await Promise.all([sessions.put(after[0]), sessions.put(after[1]), tx.done]);
  return { before: [a, b], after };
}

// Ongedaan maken van een ruil: alleen als beide rijen nog precies zijn wat de ruil schreef en geen van beide
// intussen gelogd is. Dan beide terug in één transactie; anders verandert er niets.
export async function undoSwap(before: PlannedSession[], after: PlannedSession[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['plannedSessions', 'sessionLogs'], 'readwrite');
  const sessions = tx.objectStore('plannedSessions');
  const [rows, logs] = await Promise.all([Promise.all(after.map((a) => sessions.get(a.id))), tx.objectStore('sessionLogs').getAll()]);
  const logged = new Set(logs.map((l) => l.plannedSessionId));
  if (after.length !== 2 || before.length !== 2 || after.some((a, i) => !sameAsWritten(rows[i], a) || logged.has(a.id))) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw new Error(SWAP_UNDO_STALE);
  }
  await Promise.all([...before.map((b) => sessions.put(b)), tx.done]);
}
