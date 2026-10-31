// ASCEND: a correction at the source follows into the log
// (docs/beslissingen/2026-10-25-correcties-uit-intervals.md).
//
// Pure: no React, no IndexedDB. It works from the SessionLog and the
// ExternalActivity, so it knows nothing of any provider.
//
// What it does, and what it never does:
// - It only looks at a log tied to an intervals.icu activity (an externalId of it)
//   that holds measured numbers (cardioData or outdoorData). A strength log, and a
//   log made by hand, are not touched.
// - A correction is recognised by a fingerprint, `sourceSync.seen`: the numbers the
//   source gave when the log was tied or last looked at. A number that differs from
//   that fingerprint changed at the source. A number that differs from the log but
//   not from the fingerprint was changed by ASCEND itself (a cut, a hand-made
//   number put back) and is left alone. A log without a fingerprint (tied before
//   this existed) only gets one, with the numbers of now: nothing is guessed.
// - It replaces what the watch measures: the duration, the distance, the climb and
//   the descent, the mean and highest heart rate, the cadence. A field the source
//   no longer has is never taken away, and a difference smaller than the log shows
//   (6,93 and 6,9 km) is no correction.
// - It never reads or changes what the user filled in: feel, effort (RPE), pain,
//   notes, the weight of the backpack, poles, the details of a hard session, the
//   sets, the link to the planned session.
// - A log the watch took over (`manualMeasured`) gets the new numbers like any
//   other and keeps `manualMeasured` as it is, so putting the hand-made numbers
//   back still works.
// - A log that was cut in ASCEND (`trim`) is not written over: the new numbers are
//   kept in `sourceSync.offered` and the log sheet offers them.
// - An activity that is gone at the source is not in the list: nothing is done.
// - The numbers from before an update are kept in `sourceSync.updated`, so
//   restoreSourceUpdate gives them back. This is a deliberate exception to "a
//   SessionLog is append-only", of the same kind as manualMeasured and trim.

import type { CardioMetric, OutdoorMetric, SessionLog, SourceField, SourceNumbers, SourceSync, SourceUpdate } from '../models/training';
import { formatDateNL, localDateOf } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { sourceNumbers, durationLabel, type ExternalActivity } from './activityImport';
import { fromIntervals } from './logSource';
import { isIndoorLog } from './sports';
import { undoTrim } from './trimLog';
import { blockKeyOf, MEASURED_FIELDS } from './watchAlign';
import { round as roundTo } from '../utils/round';

type Block = CardioMetric | OutdoorMetric;

export const SOURCE_FIELDS: SourceField[] = MEASURED_FIELDS.filter((f): f is SourceField => f !== 'estimatedElevation');

const ELEVATION: SourceField[] = ['elevationGainM', 'elevationLossM'];

// Equal at the precision the user sees: 6,9 and 6,93 km stay as they are.
const DECIMALS: Partial<Record<SourceField, number>> = { distanceKm: 1 };
const same = (field: SourceField, a: number, b: number) => roundTo(a, DECIMALS[field] ?? 0) === roundTo(b, DECIMALS[field] ?? 0);

function readField(log: SessionLog, field: SourceField): number | undefined {
  if (field === 'durationMinutes') return log.durationMinutes;
  const v = ((log[blockKeyOf(log)] as Block | undefined) as unknown as Record<string, unknown> | undefined)?.[field];
  return typeof v === 'number' ? v : undefined;
}

// A log that follows the source at all.
function followsSource(log: SessionLog): boolean {
  return fromIntervals(log) && log.type !== 'strength' && !!(log.cardioData ?? log.outdoorData);
}

// The climb of a treadmill or an estimate is no altitude: a number of the source
// there is not a measurement to follow.
function noAltitude(log: SessionLog, treadmill: boolean): boolean {
  const block = log[blockKeyOf(log)] as Block | undefined;
  return treadmill || isIndoorLog(log) || block?.estimatedElevation === true;
}

export interface SourceChange {
  field: SourceField;
  before: number | undefined;
  after: number;
}

export type CorrectionKind =
  // A first look: the log gets its fingerprint, nothing else.
  | 'baseline'
  // The source changed, but the log already says the same (or only the fingerprint moves).
  | 'quiet'
  // The numbers of the log were replaced.
  | 'update'
  // The log is cut: the new numbers are offered, not written.
  | 'offer';

export interface CorrectionItem {
  log: SessionLog;
  activity: ExternalActivity;
  kind: CorrectionKind;
  changes: SourceChange[];
  next: SessionLog;
}

// The numbers of the source that changed since the fingerprint. A field the
// source has no longer is not a change (nothing is taken away).
export function changedAtSource(seen: SourceNumbers, current: SourceNumbers): SourceNumbers {
  const out: SourceNumbers = {};
  for (const field of SOURCE_FIELDS) {
    const now = current[field];
    if (now === undefined) continue;
    const was = seen[field];
    if (was === undefined || !same(field, was, now)) out[field] = now;
  }
  return out;
}

// The numbers of `wanted` that the log does not say yet.
function differences(log: SessionLog, wanted: SourceNumbers, treadmill: boolean): SourceChange[] {
  const skipElevation = noAltitude(log, treadmill);
  const changes: SourceChange[] = [];
  for (const field of SOURCE_FIELDS) {
    const after = wanted[field];
    if (after === undefined) continue;
    if (skipElevation && ELEVATION.includes(field)) continue;
    const before = readField(log, field);
    if (before !== undefined && same(field, before, after)) continue;
    changes.push({ field, before, after });
  }
  return changes;
}

// The log with the changes written and the old numbers kept.
function write(log: SessionLog, changes: SourceChange[], sync: Omit<SourceSync, 'updated'>, now: Date): SessionLog {
  const key = blockKeyOf(log);
  const old = log[key] as Block;
  const block = { ...old } as unknown as Record<string, unknown>;
  const previous: SourceUpdate['previous'] = {};
  let durationMinutes = log.durationMinutes;
  for (const c of changes) {
    previous[c.field] = c.before ?? null;
    if (c.field === 'durationMinutes') durationMinutes = c.after;
    else block[c.field] = c.after;
  }
  const update: SourceUpdate = { at: now.toISOString(), block: key, previous };
  if (changes.some((c) => c.field === 'durationMinutes')) {
    block.durationMinutes = durationMinutes;
    if (old.durationMinutes !== log.durationMinutes) update.blockDurationMinutes = old.durationMinutes;
  }
  const next: SessionLog = { ...log, durationMinutes, [key]: block, sourceSync: { ...sync, updated: update } };
  const m = log.manualMeasured;
  if (m && !m.strength && m.block === key) {
    // A hand-made log the watch took over: restoreManual puts back only what is in
    // `values`. A field the source replaces now, that is not in there yet, goes in with
    // the value from before this update (null: it was not there, so putting back takes
    // it away). What is in there already is the owner's own number and stays.
    const values = { ...m.values };
    for (const c of changes) if (!(c.field in values)) values[c.field] = c.before ?? null;
    next.manualMeasured = { ...m, values };
  }
  return next;
}

// A fingerprint that holds no known number says nothing: it counts as missing.
const hasNumbers = (seen: SourceNumbers | undefined): seen is SourceNumbers => !!seen && SOURCE_FIELDS.some((f) => typeof seen[f] === 'number');

// The sync with the id of the activity it was made for.
const bound = (sync: SourceSync, activity: ExternalActivity): SourceSync => ({ ...sync, externalId: activity.externalId });

// What to do with one log and the activity it is tied to. Undefined: nothing to
// write (a second round without a change always ends here).
export function correctionFor(log: SessionLog, activity: ExternalActivity, on: boolean, now: Date): CorrectionItem | undefined {
  if (!followsSource(log) || log.externalId !== activity.externalId || activity.kind === 'strength') return undefined;
  const current = sourceNumbers(activity);
  const sync = log.sourceSync;
  if (!sync || !hasNumbers(sync.seen) || (sync.externalId !== undefined && sync.externalId !== activity.externalId)) {
    // No usable fingerprint, or one made for another activity: a new baseline with the
    // numbers of now, nothing is guessed. A fingerprint for another activity says
    // nothing about this one, so what was kept next to it goes too.
    const keep = sync && sync.externalId === undefined ? { ...(sync.updated ? { updated: sync.updated } : {}), ...(sync.offered ? { offered: sync.offered } : {}) } : {};
    return { log, activity, kind: 'baseline', changes: [], next: { ...log, sourceSync: bound({ seen: current, ...keep }, activity) } };
  }
  // Switched off: the fingerprint stays where it was, so what changed meanwhile is
  // taken over when the switch goes on again.
  if (!on) return undefined;

  const changedNow = changedAtSource(sync.seen, current);
  const seen: SourceNumbers = { ...sync.seen, ...current };
  const id = activity.externalId;
  const cut = !!log.trim;
  // What was offered before is taken over as soon as the cut is gone.
  const wanted: SourceNumbers = cut ? changedNow : { ...(sync.offered ?? {}), ...changedNow };
  const nothingNew = Object.keys(changedNow).length === 0;
  if (nothingNew && (cut || !sync.offered)) return undefined;

  if (cut) {
    // Only what differs from the log as it is now (cut): when the owner cut the same
    // stretch at the source, there is nothing to offer and only the fingerprint moves.
    // The climb of a treadmill is never offered.
    const offered: SourceNumbers = {};
    for (const c of differences(log, { ...(sync.offered ?? {}), ...changedNow }, activity.treadmill)) offered[c.field] = c.after;
    const { offered: _old, ...rest } = sync;
    void _old;
    if (Object.keys(offered).length === 0) {
      return { log, activity, kind: 'quiet', changes: [], next: { ...log, sourceSync: { ...rest, seen, externalId: id } } };
    }
    return { log, activity, kind: 'offer', changes: [], next: { ...log, sourceSync: { ...rest, seen, offered, externalId: id } } };
  }

  const changes = differences(log, wanted, activity.treadmill);
  if (changes.length === 0) {
    // The log already says it (or the climb is no altitude): only the fingerprint moves.
    return { log, activity, kind: 'quiet', changes, next: { ...log, sourceSync: { seen, externalId: id, ...(sync.updated ? { updated: sync.updated } : {}) } } };
  }
  return { log, activity, kind: 'update', changes, next: write(log, changes, { seen, externalId: id }, now) };
}

export interface CorrectionPlan {
  items: CorrectionItem[];
  // How many logs got new numbers.
  updated: number;
}

// Every tied log with the activity it follows. An activity that is not in the list
// (deleted at the source, or older than the window of the fetch) leaves its log
// as it is.
export function planCorrections(activities: ExternalActivity[], logs: SessionLog[], options: { on: boolean; now: Date }): CorrectionPlan {
  const byId = new Map(activities.map((a) => [a.externalId, a]));
  const items: CorrectionItem[] = [];
  for (const log of logs) {
    const activity = log.externalId ? byId.get(log.externalId) : undefined;
    if (!activity) continue;
    const item = correctionFor(log, activity, options.on, options.now);
    if (item) items.push(item);
  }
  return { items, updated: items.filter((i) => i.kind === 'update').length };
}

// --- the way back ----------------------------------------------------------------------

// Whether "Vorige getallen terugzetten" applies: an update that is not covered by a
// cut (cut first: "Inkorten ongedaan maken").
export const canRestoreSourceUpdate = (log: SessionLog): boolean => !!log.sourceSync?.updated && !log.trim;

// The log with the numbers it had before the last update. The fingerprint stays at
// what the source says now, so the same correction is not written again. Anything
// the user filled in stays.
export function restoreSourceUpdate(log: SessionLog): SessionLog {
  const sync = log.sourceSync;
  const u = sync?.updated;
  if (!sync || !u || log.trim) return log;
  const next: SessionLog = { ...log };
  const block = { ...((log[u.block] as Block | undefined) ?? {}) } as unknown as Record<string, unknown>;
  for (const [field, value] of Object.entries(u.previous) as [SourceField, number | null][]) {
    if (field === 'durationMinutes') {
      if (typeof value === 'number') {
        next.durationMinutes = value;
        block.durationMinutes = u.blockDurationMinutes ?? value;
      }
    } else if (value === null) delete block[field];
    else block[field] = value;
  }
  (next as unknown as Record<string, unknown>)[u.block] = block;
  next.sourceSync = { seen: sync.seen, ...(sync.externalId ? { externalId: sync.externalId } : {}), ...(sync.offered ? { offered: sync.offered } : {}) };
  return next;
}

// "Cijfers overnemen" on a cut log: the cut goes (its numbers are taken back first)
// and the offered numbers are written, with the numbers from before kept. Undefined
// when there is nothing offered or no cut.
export function takeOverOffered(log: SessionLog, now: Date): SessionLog | undefined {
  const sync = log.sourceSync;
  if (!sync?.offered || !log.trim) return undefined;
  const open = undoTrim(log);
  const changes = differences(open, sync.offered, false);
  if (changes.length === 0) {
    const { offered, ...rest } = sync;
    void offered;
    return { ...open, sourceSync: rest };
  }
  return write(open, changes, { seen: sync.seen, ...(sync.externalId ? { externalId: sync.externalId } : {}) }, now);
}

// --- words -----------------------------------------------------------------------------

const TEXT: Record<SourceField, (n: number) => string> = {
  durationMinutes: (n) => durationLabel(n * 60),
  distanceKm: (n) => `${formatNumberNL(n, 1)} km`,
  elevationGainM: (n) => `${formatNumberNL(n, 0)} m D+`,
  elevationLossM: (n) => `${formatNumberNL(n, 0)} m D−`,
  avgHeartRate: (n) => `hartslag ${n}`,
  maxHeartRate: (n) => `hoogste hartslag ${n}`,
  cadence: (n) => `cadans ${n}`,
};

function numbersText(values: Partial<Record<SourceField, number | null | undefined>>): string[] {
  const parts: string[] = [];
  for (const field of SOURCE_FIELDS) {
    const v = values[field];
    if (typeof v === 'number') parts.push(TEXT[field](v));
  }
  return parts;
}

// "Bijgewerkt uit intervals.icu op 25 okt". Only on a log that was updated.
export function sourceUpdateLine(log: SessionLog): string | undefined {
  const u = log.sourceSync?.updated;
  if (!u) return undefined;
  return `Bijgewerkt uit intervals.icu op ${formatDateNL(localDateOf(u.at))}`;
}

// "Eerder: 62 min, 9,8 km, 410 m D+": the numbers that "Vorige getallen terugzetten" gives back.
export function sourceUpdatePreviousLine(log: SessionLog): string | undefined {
  const u = log.sourceSync?.updated;
  if (!u) return undefined;
  const parts = numbersText(u.previous);
  return parts.length > 0 ? `Eerder: ${parts.join(', ')}` : undefined;
}

// For a cut log: "In intervals.icu staat nu: 8,2 km, 380 m D+. Jouw ingekorte versie blijft staan."
export function sourceOfferLine(log: SessionLog): string | undefined {
  const o = log.sourceSync?.offered;
  if (!o || !log.trim) return undefined;
  const parts = numbersText(o);
  if (parts.length === 0) return undefined;
  return `In intervals.icu staat nu anders: ${parts.join(', ')}. Je ingekorte versie blijft staan. Neem je de cijfers over, dan vervalt de inkorting.`;
}
