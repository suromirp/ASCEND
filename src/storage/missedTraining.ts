// ASCEND: een training die niet doorging wegschrijven (engine/missedTraining.ts,
// docs/beslissingen/2026-11-01-niet-doorgegaan.md).
//
// - Overslaan zet alleen de status van de PlannedSession; er komt geen log bij en er gaat er geen weg.
//   Ongedaan maken loopt via de melding (`before`, storage/undoPlanChange.ts).
// - Koppelen zet alleen de verwijzing op een log die nergens aan hing, na je Akkoord. Ongedaan maken
//   haalt precies die verwijzing weer weg (`unlinkLog`).
// - Wat dit toestel van je antwoorden onthoudt staat in de meta-opslag, niet in je planning. Het gaat mee
//   in de back-up (`payload.missedTraining`, storage/backupNormalize.ts), zoals de antwoorden op adviezen.

import type { PlanLock, PlannedSession } from '../models/training';
import { linkLog, resolveMissedMemory, unlinkLog, MISSED_MEMORY_KEY, type MissedMemory } from '../engine/missedTraining';
import { MetaRepo, PlannedSessionsRepo, SessionLogsRepo } from './database';

const MEMORY_KEY = MISSED_MEMORY_KEY;

async function readMissedMemory(): Promise<ReturnType<typeof resolveMissedMemory>> {
  return resolveMissedMemory(await MetaRepo.get<unknown>(MEMORY_KEY));
}

export async function updateMissedMemory(change: (m: ReturnType<typeof resolveMissedMemory>) => MissedMemory): Promise<ReturnType<typeof resolveMissedMemory>> {
  const next = resolveMissedMemory(change(await readMissedMemory()));
  await MetaRepo.set(MEMORY_KEY, next);
  return next;
}

// Zet deze trainingen op overgeslagen, alleen als ze nog steeds zonder log en niet overgeslagen zijn.
// Geeft de rijen zoals ze waren, voor Ongedaan maken.
export async function skipMissedNow(sessionIds: readonly string[], lock: PlanLock | undefined): Promise<PlannedSession[]> {
  const [stored, logs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll()]);
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const before: PlannedSession[] = [];
  for (const id of sessionIds) {
    const session = stored.find((s) => s.id === id);
    if (!session || session.status === 'skipped' || logged.has(session.id)) continue;
    before.push(session);
    await PlannedSessionsRepo.put({ ...session, status: 'skipped', ...(lock ? { lock } : {}) });
  }
  return before;
}

// Koppel een log aan een geplande training. Niets gebeurt als de log intussen ergens aan hangt, de
// training intussen een log heeft, weg is of overgeslagen (een dubbele tik, een import ertussen), of als
// het een log is die je zelf invulde (`linkLog`).
export async function linkLogNow(logId: string, sessionId: string, at: string): Promise<boolean> {
  const [logs, sessions] = await Promise.all([SessionLogsRepo.getAll(), PlannedSessionsRepo.getAll()]);
  const log = logs.find((l) => l.id === logId);
  const session = sessions.find((s) => s.id === sessionId);
  if (!log || !session || session.status === 'skipped' || logs.some((l) => l.plannedSessionId === sessionId)) return false;
  const linked = linkLog(log, sessionId, at);
  if (!linked) return false;
  await SessionLogsRepo.put(linked);
  return true;
}

// Ongedaan maken: alleen logs die later gekoppeld werden, verliezen hun verwijzing.
export async function unlinkLogsNow(logIds: readonly string[]): Promise<number> {
  const logs = await SessionLogsRepo.getAll();
  let n = 0;
  for (const id of logIds) {
    const log = logs.find((l) => l.id === id);
    if (!log?.linkedLater) continue;
    await SessionLogsRepo.put(unlinkLog(log));
    n++;
  }
  return n;
}
