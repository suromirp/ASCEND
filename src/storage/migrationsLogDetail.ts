// Migratiestappen voor het profiel van een activiteit: loopinzicht, Run in
// detail en de reeksen, inkorten en correcties uit intervals.icu.

import { isUsableRunDetail } from '../engine/runDetail';
import { deserializeStreams } from '../engine/streamPack';
import { readZone2Pieces } from '../engine/zone2Pieces';
import type { ActivityStreams } from '../models/activityStreams';
import type { ActivityDetail, DetailConditions, DetailSlice, RunDynamics, TerrainStretch } from '../models/activityDetail';
import type { MetricSource, SessionLog, SessionTrim, SourceField, SourceNumbers, SourceSync, SourceUpdate, TrimField } from '../models/training';
import { isObj, fin, optFin } from './migrationsShared';

// --- loopinzicht: SessionLog.detail ---------------------------------------------------
// The compact profile of a run or tocht (models/activityDetail.ts). The field is
// optional and additive, and every log travels whole, so the backup schema
// number does not move (docs/beslissingen/2026-10-22-loopinzicht.md). It is
// derived from the watch's series and can be fetched again, so a profile that is
// damaged (hand-edited, cut off) is dropped as a whole and the log keeps
// everything else; a profile is never half repaired, because a comparison on
// invented numbers is worse than no comparison. Fields the reader does not know
// are not kept.
const DYNAMICS_KEYS: (keyof RunDynamics)[] = [
  'stanceTimeMs', 'stanceTimePercent', 'stanceBalanceLeftPct', 'verticalOscillationMm', 'verticalRatioPct', 'stepLengthM',
  'verticalSpeedMs', 'legSpringStiffness', 'impactLoadingRate',
];

function readDynamics(raw: unknown): RunDynamics | undefined | null {
  if (raw === undefined) return undefined;
  if (!isObj(raw)) return null;
  const out: RunDynamics = {};
  for (const key of DYNAMICS_KEYS) {
    if (raw[key] === undefined) continue;
    if (!fin(raw[key])) return null;
    out[key] = raw[key] as number;
  }
  return out;
}

function readSlice(raw: unknown): DetailSlice | undefined {
  if (!isObj(raw) || !fin(raw.sec) || !fin(raw.distanceM) || !fin(raw.gainM) || !fin(raw.lossM) || !optFin(raw.heartRate) || !optFin(raw.cadence)) return undefined;
  const dynamics = readDynamics(raw.dynamics);
  if (dynamics === null) return undefined;
  return {
    sec: raw.sec, distanceM: raw.distanceM, gainM: raw.gainM, lossM: raw.lossM,
    ...(raw.heartRate !== undefined ? { heartRate: raw.heartRate as number } : {}),
    ...(raw.cadence !== undefined ? { cadence: raw.cadence as number } : {}),
    ...(dynamics && Object.keys(dynamics).length > 0 ? { dynamics } : {}),
  };
}

function readStretch(raw: unknown): TerrainStretch | undefined {
  if (!isObj(raw) || (raw.kind !== 'climb' && raw.kind !== 'descent')) return undefined;
  if (!fin(raw.startSec) || !fin(raw.sec) || !fin(raw.distanceM) || !fin(raw.metres) || !fin(raw.gradientPct) || !optFin(raw.heartRate) || !optFin(raw.cadence)) return undefined;
  let thirds: TerrainStretch['thirds'];
  if (raw.thirds !== undefined) {
    if (!Array.isArray(raw.thirds) || raw.thirds.length !== 3) return undefined;
    thirds = [];
    for (const t of raw.thirds) {
      if (!isObj(t) || !fin(t.metresPerHour) || !optFin(t.heartRate) || !optFin(t.cadence)) return undefined;
      thirds.push({
        metresPerHour: t.metresPerHour,
        ...(t.heartRate !== undefined ? { heartRate: t.heartRate as number } : {}),
        ...(t.cadence !== undefined ? { cadence: t.cadence as number } : {}),
      });
    }
  }
  return {
    kind: raw.kind, startSec: raw.startSec, sec: raw.sec, distanceM: raw.distanceM, metres: raw.metres, gradientPct: raw.gradientPct,
    ...(raw.heartRate !== undefined ? { heartRate: raw.heartRate as number } : {}),
    ...(raw.cadence !== undefined ? { cadence: raw.cadence as number } : {}),
    ...(thirds ? { thirds } : {}),
  };
}

function readConditions(raw: unknown): DetailConditions | undefined {
  if (!isObj(raw) || (raw.source !== 'lookup' && raw.source !== 'manual' && raw.source !== 'import')) return undefined;
  const out: DetailConditions = { source: raw.source };
  for (const key of ['tempC', 'feelsC', 'windKmh', 'gustKmh', 'humidityPct', 'rainMm'] as const) {
    if (raw[key] === undefined) continue;
    if (!fin(raw[key])) return undefined;
    out[key] = raw[key] as number;
  }
  return out;
}

export function migrateActivityDetail(raw: unknown): ActivityDetail | undefined {
  if (!isObj(raw) || raw.version !== 1 || typeof raw.source !== 'string') return undefined;
  if (!Array.isArray(raw.slices) || !Array.isArray(raw.stretches) || !fin(raw.sliceCount) || raw.sliceCount !== raw.slices.length || raw.slices.length === 0 || raw.slices.length > 200) return undefined;
  if (!fin(raw.movingSec) || !isObj(raw.quality) || !fin(raw.quality.heartRateCoveragePct) || !optFin(raw.quality.gainAgreementPct)) return undefined;
  const slices = raw.slices.map(readSlice);
  if (slices.some((s) => !s)) return undefined;
  const stretches = raw.stretches.map(readStretch);
  if (stretches.some((s) => !s)) return undefined;
  const conditions = raw.conditions === undefined ? undefined : readConditions(raw.conditions);
  return {
    version: 1,
    source: raw.source as MetricSource,
    sliceCount: raw.sliceCount,
    slices: slices as DetailSlice[],
    stretches: stretches as TerrainStretch[],
    ...(conditions ? { conditions } : {}),
    movingSec: raw.movingSec,
    quality: {
      heartRateCoveragePct: raw.quality.heartRateCoveragePct,
      ...(raw.quality.gainAgreementPct !== undefined ? { gainAgreementPct: raw.quality.gainAgreementPct as number } : {}),
      ...(raw.quality.chestStrapSeen === true ? { chestStrapSeen: true as const } : {}),
    },
  };
}

// A log as it comes out of a file: the same log, with `detail` only when it is whole.
export function migrateLogDetail(log: SessionLog): SessionLog {
  if (!('detail' in log)) return log;
  const valid = migrateActivityDetail((log as { detail?: unknown }).detail);
  const { detail: _damaged, ...rest } = log;
  void _damaged;
  return valid ? { ...rest, detail: valid } : rest;
}

// --- Run in detail: SessionLog.runDetail en de reeksen ---------------------------------------
// The kilometres and laps of a run are derived from its full series (models/runDetail.ts,
// engine/runDetail.ts) and sit on the log as `runDetail`, with `runDetailTried` for totals
// that gave nothing. Both are optional and additive, so the backup schema number does not
// move: a file from before them has neither and imports as it was. A damaged `runDetail`
// is dropped as a whole and the log keeps everything else; it is derived, so it is read
// again from the series. `runDetailTried` must be a short text.
export function migrateLogRunDetail(log: SessionLog): SessionLog {
  let out = log;
  if ('runDetailTried' in out) {
    const tried = (out as { runDetailTried?: unknown }).runDetailTried;
    if (typeof tried !== 'string' || tried.length === 0 || tried.length > 40) {
      const { runDetailTried: _t, ...rest } = out;
      void _t;
      out = rest;
    }
  }
  if (!('runDetail' in out)) return out;
  const raw = (out as { runDetail?: unknown }).runDetail;
  if (isUsableRunDetail(raw)) return out;
  const { runDetail: _damaged, ...rest } = out;
  void _damaged;
  return rest;
}

// --- tempo bij zone 2: SessionLog.zone2Pieces -------------------------------------------------
// The stable pieces of a run (models/zone2Pieces.ts), derived from its full series. Optional and
// additive, so the backup schema number does not move: a file from before them has none and
// imports as it was (the pieces are read again from a kept series at the next opening). A
// damaged field is dropped as a whole and the log keeps everything else; fields the reader does
// not know are not kept.
export function migrateLogZone2Pieces(log: SessionLog): SessionLog {
  if (!('zone2Pieces' in log)) return log;
  const { zone2Pieces: raw, ...rest } = log;
  const read = readZone2Pieces(raw);
  return read ? { ...rest, zone2Pieces: read } : rest;
}

// The full series in a backup file (payload.activityStreams, base64): read series by series.
// A set that is damaged beyond use is dropped and counted, the rest is kept; a file from
// before them has none (undefined: "not in this backup", the device keeps its own).
export function migrateActivityStreams(raw: unknown): { list: ActivityStreams[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byLog = new Map<string, ActivityStreams>();
  let skipped = 0;
  for (const item of raw) {
    const read = deserializeStreams(item);
    if (!read) {
      skipped++;
      continue;
    }
    byLog.set(read.logId, read);
  }
  return { list: [...byLog.values()], skipped };
}

// --- activiteit inkorten: SessionLog.trim ---------------------------------------------
// A watch activity cut at the end and/or the beginning keeps the numbers the cut
// replaced in `trim` (models/training.ts, engine/trimLog.ts,
// docs/beslissingen/2026-10-24-activiteit-inkorten.md). The field is optional and
// additive and every log travels whole, so the backup schema number does not
// move: a file from before it has none and imports as it was. A field that is
// damaged (hand-edited, cut off) is dropped as a whole and the log keeps
// everything else, because putting back from damaged numbers would write
// nonsense into the log. The numbers must be finite, the minutes and the length
// of the activity above zero, the rest not below zero (a climb of 0 m is a
// number); what is kept must lie inside the activity. The profile that was
// replaced is read like any profile; when it is damaged, it is lost together
// with the profile of the trimmed piece, because putting the wrong one back is
// worse than having none. Fields the reader does not know are not kept.
const TRIM_KEYS: TrimField[] = ['distanceKm', 'elevationGainM', 'elevationLossM', 'avgHeartRate', 'maxHeartRate'];

export function migrateSessionTrim(raw: unknown): { trim: SessionTrim | undefined; detailLost: boolean } {
  const none = { trim: undefined, detailLost: false };
  if (!isObj(raw) || typeof raw.at !== 'string' || (raw.block !== 'cardioData' && raw.block !== 'outdoorData')) return none;
  if (!fin(raw.startSec) || !fin(raw.endSec) || !fin(raw.totalSec) || raw.startSec < 0 || raw.totalSec <= 0 || raw.endSec <= raw.startSec || raw.endSec > raw.totalSec) return none;
  const o = raw.original;
  if (!isObj(o) || !fin(o.durationMinutes) || o.durationMinutes <= 0) return none;
  if (o.blockDurationMinutes !== undefined && !(fin(o.blockDurationMinutes) && o.blockDurationMinutes > 0)) return none;
  const original: SessionTrim['original'] = { durationMinutes: o.durationMinutes };
  if (o.blockDurationMinutes !== undefined) original.blockDurationMinutes = o.blockDurationMinutes;
  for (const key of TRIM_KEYS) {
    if (o[key] === undefined) continue;
    if (!fin(o[key]) || (o[key] as number) < 0) return none;
    original[key] = o[key] as number;
  }
  let detailLost = false;
  if (o.detail !== undefined) {
    const detail = migrateActivityDetail(o.detail);
    if (detail) original.detail = detail;
    else detailLost = true;
  }
  return { trim: { at: raw.at, startSec: raw.startSec, endSec: raw.endSec, totalSec: raw.totalSec, block: raw.block, original }, detailLost };
}

// A log as it comes out of a file: the same log, with `trim` only when it is whole.
export function migrateLogTrim(log: SessionLog): SessionLog {
  if (!('trim' in log)) return log;
  const { trim: damaged, ...rest } = log;
  const { trim, detailLost } = migrateSessionTrim(damaged);
  if (!trim) return rest;
  // A trim of a block the log does not have could only put back half a block.
  if (trim.block && !(rest as Record<string, unknown>)[trim.block]) return rest;
  if (detailLost) {
    const { detail: _wrong, ...withoutDetail } = rest;
    void _wrong;
    return { ...withoutDetail, trim };
  }
  return { ...rest, trim };
}

// --- correcties uit intervals.icu: SessionLog.sourceSync ------------------------------
// A log tied to a watch activity keeps a fingerprint of the numbers the source gave
// and, after an update from the source, the numbers from before it
// (models/training.ts#SourceSync, engine/sourceCorrection.ts,
// docs/beslissingen/2026-10-25-correcties-uit-intervals.md). The field is optional
// and additive and every log travels whole, so the backup schema number does not
// move: a file from before it has none and imports as it was (the next fetch gives
// the log a fingerprint with the numbers of that day, it changes nothing). A part
// that is damaged is dropped, and only that part: a fingerprint that cannot be read
// is made again at the next fetch; an update record that cannot be read is dropped
// because putting back from damaged numbers would write nonsense; the offered numbers
// of a cut log likewise. A field of a log that does not come from the watch, or that
// has no block, is dropped as a whole. Numbers must be finite and not below zero (a
// climb of 0 m is a number), minutes above zero; fields the reader does not know are
// not kept.
const SOURCE_KEYS: SourceField[] = ['durationMinutes', 'distanceKm', 'elevationGainM', 'elevationLossM', 'avgHeartRate', 'maxHeartRate', 'cadence'];

function readSourceNumbers(raw: unknown): SourceNumbers | undefined {
  if (!isObj(raw)) return undefined;
  const out: SourceNumbers = {};
  for (const key of SOURCE_KEYS) {
    const v = raw[key];
    if (v === undefined) continue;
    if (!fin(v) || v < 0 || (key === 'durationMinutes' && v <= 0)) return undefined;
    out[key] = v;
  }
  return out;
}

function readSourceUpdate(raw: unknown): SourceUpdate | undefined {
  if (!isObj(raw) || typeof raw.at !== 'string' || (raw.block !== 'cardioData' && raw.block !== 'outdoorData') || !isObj(raw.previous)) return undefined;
  const previous: SourceUpdate['previous'] = {};
  for (const key of SOURCE_KEYS) {
    const v = raw.previous[key];
    if (v === undefined) continue;
    if (v === null) previous[key] = null;
    else if (fin(v) && v >= 0 && (key !== 'durationMinutes' || v > 0)) previous[key] = v;
    else return undefined;
  }
  if (Object.keys(previous).length === 0) return undefined;
  const update: SourceUpdate = { at: raw.at, block: raw.block, previous };
  if (raw.blockDurationMinutes !== undefined) {
    if (!(fin(raw.blockDurationMinutes) && raw.blockDurationMinutes > 0)) return undefined;
    update.blockDurationMinutes = raw.blockDurationMinutes;
  }
  return update;
}

export function migrateSourceSync(raw: unknown): SourceSync | undefined {
  if (!isObj(raw)) return undefined;
  // A fingerprint that is empty, holds no known number or cannot be read counts as
  // missing. The update record and the offered numbers are kept next to it: the log
  // then gets a new baseline at the next fetch (nothing is overwritten), and putting
  // back an update still works.
  const read = readSourceNumbers(raw.seen);
  const seen: SourceNumbers = read && Object.keys(read).length > 0 ? read : {};
  const sync: SourceSync = { seen };
  const updated = readSourceUpdate(raw.updated);
  if (updated) sync.updated = updated;
  const offered = readSourceNumbers(raw.offered);
  if (offered && Object.keys(offered).length > 0) sync.offered = offered;
  if (Object.keys(seen).length === 0 && !sync.updated && !sync.offered) return undefined;
  // The activity the fingerprint belongs to; a value that is no text is dropped.
  if (typeof raw.externalId === 'string' && raw.externalId.length > 0) sync.externalId = raw.externalId;
  return sync;
}

// A log as it comes out of a file: the same log, with `sourceSync` only when it is whole.
export function migrateLogSourceSync(log: SessionLog): SessionLog {
  if (!('sourceSync' in log)) return log;
  const { sourceSync: damaged, ...rest } = log;
  const sync = migrateSourceSync(damaged);
  const block = rest.cardioData ?? rest.outdoorData;
  if (!sync || !block || !rest.externalId?.startsWith('intervals.icu')) return rest;
  // An update of a block the log does not have could only put back half a block.
  if (sync.updated && !(rest as Record<string, unknown>)[sync.updated.block]) delete sync.updated;
  return { ...rest, sourceSync: sync };
}
