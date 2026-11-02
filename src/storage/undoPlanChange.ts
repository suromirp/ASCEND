// ASCEND: ongedaan maken van de laatste wijziging, los van React, zodat het te
// testen is (Warden Planning punt 9). Zet de instelling, de config, de doelen, het programma en
// de rijen terug zoals ze waren, haalt wat de wijziging toevoegde weg en legt
// het ongedaan maken vast in het wijzigingslog. De aanroeper (AppDataContext)
// zet daarna het scherm bij.
//
// Alles in één transactie, en alleen als de rijen nog precies zijn wat de wijziging schreef en niets ervan
// intussen gelogd is (engine/undoGuard.ts). Anders verandert er niets en gooit hij PLAN_UNDO_STALE
// (docs/beslissingen/2026-11-02-vandaag-en-ongedaan.md).

import type { RecentPlanChange } from '../models/planChange';
import type { PlannedSession } from '../models/training';
import { DEFAULT_GOAL_ENGINE_CONFIG, type GoalEngineConfig } from '../models/goalEngineConfig';
import type { StoredResponse } from '../engine/learning';
import { undoBlocked } from '../engine/undoGuard';
import { getDB } from './databaseSchema';
import { withDerivedWeek } from './databaseRepos';
import { DEFAULT_SETTINGS, type AppSettings } from './databaseSettings';
import { makeId } from '../utils/id';

export const PLAN_UNDO_STALE = 'Een van de trainingen is na deze wijziging nog veranderd of gelogd. Ongedaan maken kan niet meer. Kijk in je week wat er nu staat.';

export interface UndoOutcome {
  settings?: AppSettings;
  config?: GoalEngineConfig;
  responses?: Record<string, StoredResponse>;
}

// De rijen van een wijziging zoals ze nu in de opslag staan: direct na het schrijven gelezen is dat wat de
// wijziging schreef. Een id dat ontbreekt, haalde de wijziging weg.
export async function snapshotWritten(before: readonly PlannedSession[], addedIds: readonly string[]): Promise<PlannedSession[]> {
  const ids = [...new Set([...before.map((s) => s.id), ...addedIds])];
  if (ids.length === 0) return [];
  const db = await getDB();
  const tx = db.transaction('plannedSessions', 'readonly');
  const rows = await Promise.all(ids.map((id) => tx.store.get(id)));
  await tx.done;
  return rows.filter((r): r is PlannedSession => !!r);
}

export async function undoPlanChangeNow(change: RecentPlanChange): Promise<UndoOutcome> {
  const db = await getDB();
  const tx = db.transaction(['plannedSessions', 'sessionLogs', 'meta', 'trainingGoals', 'programs', 'strengthProgramStrategies', 'planChangeProposals'], 'readwrite');
  const sessions = tx.objectStore('plannedSessions');
  const meta = tx.objectStore('meta');
  const ids = [...new Set([...change.before.map((s) => s.id), ...change.addedIds])];
  const [rows, logs] = await Promise.all([Promise.all(ids.map((id) => sessions.get(id))), tx.objectStore('sessionLogs').getAll()]);
  // Een log die deze wijziging zelf koppelde gaat er met ongedaan maken weer af: die telt niet als gelogd.
  const linked = new Set(change.linkedLogIds ?? []);
  const loggedIds = new Set(logs.filter((l) => !linked.has(l.id)).map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const current = new Map(rows.filter((r): r is PlannedSession => !!r).map((r) => [r.id, r]));
  if (undoBlocked({ before: change.before, addedIds: change.addedIds, written: change.written, current, loggedIds })) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw new Error(PLAN_UNDO_STALE);
  }
  const out: UndoOutcome = {};
  try {
    // The setting behind the change goes back exactly as it was: an illness
    // report (or a changed kind of illness), a sport switched off, a frequency or
    // time budget. Never reconstructed from dates.
    if (change.settingsBefore) {
      const stored = (await meta.get('settings')) as Partial<AppSettings> | undefined;
      out.settings = { ...DEFAULT_SETTINGS, ...stored, ...(change.settingsBefore as Partial<AppSettings>) };
      await meta.put(out.settings, 'settings');
      // A rest day put back goes with the layout that undo puts back.
      if ('restDay' in change.settingsBefore) await meta.put((change.settingsBefore as Partial<AppSettings>).restDay ?? 1, 'appliedRestDay');
    }
    if (change.configBefore) {
      const stored = (await meta.get('goalEngineConfig')) as Partial<GoalEngineConfig> | undefined;
      out.config = { ...DEFAULT_GOAL_ENGINE_CONFIG, ...stored, ...(change.configBefore as Partial<GoalEngineConfig>), updatedAt: new Date().toISOString() };
      await meta.put(out.config, 'goalEngineConfig');
    }
    // A goal changed with its planning (another date, archived, a new goal): back as it was.
    for (const goal of change.goalsBefore ?? []) await tx.objectStore('trainingGoals').put(goal);
    for (const id of change.goalsAdded ?? []) await tx.objectStore('trainingGoals').delete(id);
    // A rest week or a repeated week changed: the program goes back as it was.
    if (change.programBefore) await tx.objectStore('programs').put(change.programBefore);
    for (const st of change.strategiesBefore ?? []) await tx.objectStore('strengthProgramStrategies').put(st);
    if (change.adviceId) {
      const responses = { ...(((await meta.get('adviceResponses')) as Record<string, StoredResponse> | undefined) ?? {}) };
      delete responses[change.adviceId];
      await meta.put(responses, 'adviceResponses');
      out.responses = responses;
    }
    // Undoing what the week check did is a choice of yours: those sessions stay
    // where you put them back.
    const keep = change.trigger === 'plan_check' ? { lock: { by: 'user' as const, at: new Date().toISOString() } } : {};
    for (const session of change.before) await sessions.put(withDerivedWeek({ ...session, ...keep }));
    for (const id of change.addedIds) await sessions.delete(id);
    const now = new Date().toISOString();
    await tx.objectStore('planChangeProposals').put({
      id: makeId('planchange'),
      trigger: change.trigger,
      issue: `Ongedaan gemaakt: ${change.title}`,
      changes: [],
      alternatives: [],
      consequences: change.lines.join('; '),
      explanation: 'Door jou ongedaan gemaakt, direct na de wijziging.',
      revertsProposalId: change.id,
      createdAt: now,
      resolvedAt: now,
      resolution: 'rejected',
    });
    await tx.done;
  } catch (err) {
    try { tx.abort(); } catch { /* al afgebroken */ }
    await tx.done.catch(() => undefined);
    throw err;
  }
  return out;
}
