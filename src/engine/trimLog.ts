// ASCEND: "Inkorten" on a log: a watch activity cut at the end and/or the
// beginning (docs/beslissingen/2026-10-24-activiteit-inkorten.md), and the way
// back.
//
// Pure: no React, no IndexedDB. The stream maths is engine/activityTrim.ts.
//
// What it does, and what it never does:
// - It only touches a log that came from the watch (it has the id of a watch
//   activity) and that holds measured numbers (cardioData or outdoorData). A
//   strength log, and a log made by hand, are not touched.
// - It replaces what the watch measures and that the cut changes: the duration,
//   the distance, the climb and the descent, the mean and highest heart rate,
//   and the profile `detail` (made again from what is kept). Only fields the log
//   already had are replaced, and the old values are kept in `trim.original`, so
//   undoTrim gives every one of them back exactly.
// - It never reads or changes what the user filled in: feel, effort (RPE),
//   pain, notes, the weight of the backpack, poles, the details of a hard session.
// - The climb of a treadmill or an estimate is no altitude and is left alone.
// - A log that is trimmed is not trimmed again: undo first, then cut again.

import type { ActivityDetail, StreamSet } from '../models/activityDetail';
import type { CardioMetric, OutdoorMetric, SessionLog, SessionTrim, TrimField } from '../models/training';
import { formatNumberNL } from '../utils/number';
import { buildActivityDetail } from './activityDetail';
import { sliceStreams, trimmedNumbers, type TrimCurrent, type TrimSuggestion } from './activityTrim';
import { fromIntervals } from './logSource';
import { isIndoorLog } from './sports';
import { blockKeyOf } from './watchAlign';

type Block = CardioMetric | OutdoorMetric;

export const TRIM_FIELDS: TrimField[] = ['distanceKm', 'elevationGainM', 'elevationLossM', 'avgHeartRate', 'maxHeartRate'];

// A log the watch made and that has numbers to cut: the "Inkorten" row shows for
// it, and with `trim` set, the line with "Inkorten ongedaan maken" instead.
export function isTrimmable(log: SessionLog): boolean {
  return fromIntervals(log) && log.type !== 'strength' && !!(log.cardioData ?? log.outdoorData);
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// The climb of a treadmill is an estimate, not altitude.
function noAltitude(log: SessionLog, block: Block): boolean {
  return isIndoorLog(log) || block.estimatedElevation === true;
}

// What the log says now of the numbers a cut can change.
function currentTrimNumbers(log: SessionLog): TrimCurrent | undefined {
  const block = log[blockKeyOf(log)] as Block | undefined;
  if (!block) return undefined;
  const indoor = noAltitude(log, block);
  const current: TrimCurrent = { durationMinutes: log.durationMinutes };
  for (const field of TRIM_FIELDS) {
    const v = (block as unknown as Record<string, unknown>)[field];
    if (!finite(v)) continue;
    if (indoor && (field === 'elevationGainM' || field === 'elevationLossM')) continue;
    current[field] = v;
  }
  return current;
}

export interface TrimPreview {
  before: TrimCurrent;
  // Only the fields the cut changes or can judge.
  after: TrimCurrent;
}

// The numbers before and after cutting from `startSec` to `endSec` (seconds since
// the start of the activity), for the sheet. Undefined when nothing is cut or
// the stretch has no moving time.
export function previewTrim(log: SessionLog, streams: StreamSet, startSec: number, endSec: number): TrimPreview | undefined {
  const before = currentTrimNumbers(log);
  if (!before) return undefined;
  const after = trimmedNumbers(streams, startSec, endSec, before);
  return after ? { before, after } : undefined;
}

// The log after the cut, with the old numbers kept in `trim`. Undefined when
// there is nothing to cut, the log cannot be trimmed, or it is trimmed already.
export function trimLog(log: SessionLog, streams: StreamSet, startSec: number, endSec: number, now: Date): SessionLog | undefined {
  if (!isTrimmable(log) || log.trim) return undefined;
  const key = blockKeyOf(log);
  const block = log[key] as Block | undefined;
  if (!block) return undefined;
  const preview = previewTrim(log, streams, startSec, endSec);
  if (!preview) return undefined;
  const { before, after } = preview;

  const nextBlock = { ...block, durationMinutes: after.durationMinutes } as Record<string, unknown>;
  const original: SessionTrim['original'] = { durationMinutes: log.durationMinutes };
  if (block.durationMinutes !== log.durationMinutes) original.blockDurationMinutes = block.durationMinutes;
  for (const field of TRIM_FIELDS) {
    const to = after[field];
    if (to === undefined) continue;
    original[field] = before[field];
    nextBlock[field] = to;
  }

  const total = streams.timeSec[streams.timeSec.length - 1];
  const trim: SessionTrim = {
    at: now.toISOString(),
    startSec: Math.max(0, Math.round(startSec)),
    endSec: Math.min(Math.round(total), Math.round(endSec)),
    totalSec: Math.round(total),
    block: key,
    original,
  };
  const next: SessionLog = { ...log, durationMinutes: after.durationMinutes, [key]: nextBlock, trim };

  // The profile follows what is kept. A log without one does not get one.
  if (log.detail) {
    original.detail = log.detail;
    const rebuilt = buildActivityDetail(sliceStreams(streams, startSec, endSec), {
      source: log.detail.source,
      treadmill: noAltitude(log, block),
      reportedGainM: after.elevationGainM ?? before.elevationGainM,
      conditions: log.detail.conditions,
    });
    if (rebuilt) next.detail = rebuilt;
    else delete next.detail;
  }
  return next;
}

// The log with the numbers it had before the cut. Only the fields the cut
// replaced are set back; anything added to the log since (feel, effort, pain)
// stays. A log that is not trimmed comes back as it was.
export function undoTrim(log: SessionLog): SessionLog {
  const trim = log.trim;
  if (!trim) return log;
  const { original } = trim;
  const next: SessionLog = { ...log, durationMinutes: original.durationMinutes };
  const block = { ...((log[trim.block] as Block | undefined) ?? {}) } as Record<string, unknown>;
  block.durationMinutes = original.blockDurationMinutes ?? original.durationMinutes;
  for (const field of TRIM_FIELDS) if (original[field] !== undefined) block[field] = original[field];
  (next as unknown as Record<string, unknown>)[trim.block] = block;
  if (original.detail) next.detail = original.detail as ActivityDetail;
  delete next.trim;
  return next;
}

// --- words ---------------------------------------------------------------------------------

// h:mm on the clock of the activity: 0:05, 0:53, 1:12.
export function clockLabel(sec: number): string {
  const minutes = Math.floor(Math.max(0, sec) / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

// "Ingekort: van 0:05 tot 0:53", "Ingekort: tot 0:53", "Ingekort: vanaf 0:05".
export function trimRangeLine(trim: SessionTrim): string {
  const fromStart = trim.startSec > 0;
  const toEnd = trim.endSec < trim.totalSec;
  if (fromStart && toEnd) return `Ingekort: van ${clockLabel(trim.startSec)} tot ${clockLabel(trim.endSec)}`;
  if (toEnd) return `Ingekort: tot ${clockLabel(trim.endSec)}`;
  if (fromStart) return `Ingekort: vanaf ${clockLabel(trim.startSec)}`;
  return 'Ingekort';
}

const FIELD_TEXT: Record<TrimField, (n: number) => string> = {
  distanceKm: (n) => `${formatNumberNL(n, 1)} km`,
  elevationGainM: (n) => `${formatNumberNL(n, 0)} m D+`,
  elevationLossM: (n) => `${formatNumberNL(n, 0)} m D−`,
  avgHeartRate: (n) => `hartslag ${n}`,
  maxHeartRate: (n) => `hoogste hartslag ${n}`,
};

// "Eerst 62 min, 9,8 km, 410 m D+": the numbers before the cut, the ones that
// "Inkorten ongedaan maken" gives back.
export function trimOriginalLine(trim: SessionTrim): string {
  const parts = [`${trim.original.durationMinutes} min`];
  for (const field of TRIM_FIELDS) {
    const v = trim.original[field];
    if (v !== undefined) parts.push(FIELD_TEXT[field](v));
  }
  return `Eerst ${parts.join(', ')}`;
}

// What the suggestion saw, for the sheet: "Vanaf 0:48 ging je ineens 45 km/u:
// waarschijnlijk de auto." One line per edge.
export function suggestionLines(suggestion: TrimSuggestion): string[] {
  const lines: string[] = [];
  if (suggestion.atStart) lines.push(`Het begin tot ${clockLabel(suggestion.atStart.toSec)} ging ${suggestion.atStart.kmh} km/u: waarschijnlijk de auto.`);
  if (suggestion.atEnd) lines.push(`Vanaf ${clockLabel(suggestion.atEnd.fromSec)} ging je ineens ${suggestion.atEnd.kmh} km/u: waarschijnlijk de auto.`);
  return lines;
}
