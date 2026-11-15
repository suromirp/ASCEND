// Een rustiger instap terugzetten (engine/reentry.ts), vanuit Aangepast door ASCEND in Week. De instelling en de
// regel in het logboek van wijzigingen in één transactie: zo staat het terugzetten altijd in het logboek, en verwijst
// Ongedaan maken (storage/undoPlanChange.ts) naar een regel die bestaat.

import { reentryAdjustments, reentryUndoneRecord } from '../engine/reentry';
import type { PlanChangeProposal } from '../models/planChange';
import { getDB } from './databaseSchema';
import { DEFAULT_SETTINGS, type AppSettings } from './databaseSettings';
import { makeId } from '../utils/id';

export interface ReentryUndone {
  settings: AppSettings;
  before: AppSettings['reentryWeeks'];
  record?: PlanChangeProposal;
}

export async function undoReentryNow(from: string, now = new Date().toISOString()): Promise<ReentryUndone> {
  const db = await getDB();
  const tx = db.transaction(['meta', 'planChangeProposals'], 'readwrite');
  const meta = tx.objectStore('meta');
  const stored = { ...DEFAULT_SETTINGS, ...((await meta.get('settings')) as Partial<AppSettings> | undefined) };
  const before = stored.reentryWeeks;
  const week = reentryAdjustments(before).find((w) => w.from === from);
  const settings: AppSettings = { ...stored, reentryWeeks: (before ?? []).filter((w) => w.from !== from) };
  await meta.put(settings, 'settings');
  // Geen instap met die dag (al weg): niets in het logboek.
  const record = week ? reentryUndoneRecord(makeId('reentry-undo'), week, now) : undefined;
  if (record) await tx.objectStore('planChangeProposals').put(record);
  await tx.done;
  return { settings, before, ...(record ? { record } : {}) };
}
