// ASCEND: corrections made at intervals.icu follow into the log, in storage
// (engine/sourceCorrection.ts, docs/beslissingen/2026-10-25-correcties-uit-intervals.md).
//
// Every step reads the logs fresh inside one transaction and writes them there,
// so a feeling filled in while the fetch was running is never overwritten by an
// older copy, and it waits for the other steps that replace numbers of a log
// (the queue in storage/turn.ts). It asks for nothing extra: it works from the
// activities the usual fetch brought.

import { getDB } from './database';
import { inTurn } from './turn';
import type { ExternalActivity } from '../engine/activityImport';
import { planCorrections, restoreSourceUpdate, takeOverOffered } from '../engine/sourceCorrection';

const listeners = new Set<() => void>();
// The logs were rewritten: the screens read them again.
export function onSourceCorrected(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify(): void {
  listeners.forEach((l) => l());
}

export interface CorrectionOutcome {
  // Logs that got new numbers.
  updated: number;
  // Logs that got a first fingerprint or whose fingerprint moved.
  noted: number;
}

// After a fetch: looks at every tied log and writes what the source changed.
// `on` is the switch "Correcties uit intervals.icu overnemen". A second round
// with the same activities writes nothing.
export function applySourceCorrections(activities: ExternalActivity[], on: boolean, now: Date = new Date()): Promise<CorrectionOutcome> {
  return inTurn(async () => {
    const db = await getDB();
    const tx = db.transaction('sessionLogs', 'readwrite');
    const logs = await tx.store.getAll();
    const plan = planCorrections(activities, logs, { on, now });
    for (const item of plan.items) await tx.store.put(item.next);
    await tx.done;
    if (plan.updated > 0 || plan.items.some((i) => i.kind === 'offer')) notify();
    return { updated: plan.updated, noted: plan.items.length - plan.updated };
  });
}

// "Vorige getallen terugzetten". Needs no connection. Resolves to whether anything was put back.
export function restoreSourceUpdateStored(logId: string): Promise<boolean> {
  return inTurn(async () => {
    const db = await getDB();
    const tx = db.transaction('sessionLogs', 'readwrite');
    const current = await tx.store.get(logId);
    const restored = current?.sourceSync?.updated ? restoreSourceUpdate(current) : undefined;
    const written = !!restored && restored !== current;
    if (restored && written) await tx.store.put(restored);
    await tx.done;
    return written;
  });
}

// "Cijfers overnemen" on a cut log. Needs no connection either: the offered
// numbers are on the log. Resolves to whether anything was written.
export function takeOverOfferedStored(logId: string, now: Date = new Date()): Promise<boolean> {
  return inTurn(async () => {
    const db = await getDB();
    const tx = db.transaction('sessionLogs', 'readwrite');
    const current = await tx.store.get(logId);
    const next = current ? takeOverOffered(current, now) : undefined;
    if (next) await tx.store.put(next);
    await tx.done;
    return !!next;
  });
}
