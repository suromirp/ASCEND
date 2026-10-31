// ASCEND: "Garmin is leidend": a training typed in by hand takes over the
// numbers the watch measured (docs/beslissingen/2026-10-22-garmin-is-leidend.md).
//
// Pure: no React, no IndexedDB. Everything here works from two shapes, the
// SessionLog and the ExternalActivity (engine/activityImport.ts), so it knows
// nothing of any provider.
//
// What it does, and what it never does:
// - It only touches a log made by hand (source 'manual', no externalId) for
//   which a fitting watch activity exists: same day, same sort, a length in the
//   neighbourhood or the only one of that sort that day (pairWithManualLogs).
// - It replaces what a watch MEASURES: length, distance, average and highest
//   heart rate, climb and descent, cadence. Where the watch has no value the
//   hand-made one stays.
// - It never replaces what the user filled in himself: feel, effort (RPE),
//   pain, notes, the weight of the backpack, poles, the details of a hard
//   session. Those fields are not even read here.
// - The hand-made numbers are kept on the log (`manualMeasured`), so
//   restoreManual puts every one of them back. This is a deliberate exception
//   to "a SessionLog is append-only", on the owner's explicit request.
// - Treadmill and incline-estimate climbs are no altitude: the watch only fills
//   them in when the log has none.
// - A strength training is not touched: a log of sets and reps holds nothing
//   the watch measures.

import type { CardioMetric, ManualMeasured, MeasuredField, MetricSource, OutdoorMetric, SessionLog } from '../models/training';
import { isIndoorLog } from './sports';
import { durationLabel, isHandLog, pairWithManualLogs, sourceNumbers, type ExternalActivity } from './activityImport';
import { addDays } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { round as roundTo } from '../utils/round';

// How far back the one-time fetch for matching old trainings looks at most,
// and how recent a log must be for the automatic route.
export const HISTORY_MAX_DAYS = 120;
export const AUTO_DAYS = 7;

type Block = CardioMetric | OutdoorMetric;
type BlockKey = 'cardioData' | 'outdoorData';
type Value = number | boolean;

// The order they are told in.
export const MEASURED_FIELDS: MeasuredField[] = ['durationMinutes', 'distanceKm', 'elevationGainM', 'elevationLossM', 'avgHeartRate', 'maxHeartRate', 'cadence'];

// Equal at the precision the user sees, is equal: 6,9 km and 6,93 km stay as
// they are, so a line never reads "6,9 km wordt 6,9 km".
const DECIMALS: Partial<Record<MeasuredField, number>> = { distanceKm: 1 };


function sameAtShownPrecision(field: MeasuredField, a: number, b: number): boolean {
  const decimals = DECIMALS[field] ?? 0;
  return roundTo(a, decimals) === roundTo(b, decimals);
}

// --- what the watch measured ---------------------------------------------------------

function watchValues(activity: ExternalActivity): Partial<Record<MeasuredField, Value>> {
  return sourceNumbers(activity);
}

// The block of the log that holds the measured fields: the one it has, else the
// one its type uses (a hike keeps them in outdoorData, a run in cardioData).
export function blockKeyOf(log: SessionLog): BlockKey {
  if (log.cardioData) return 'cardioData';
  if (log.outdoorData) return 'outdoorData';
  return log.type === 'hiking' || log.type === 'adventure' ? 'outdoorData' : 'cardioData';
}

function readField(log: SessionLog, field: MeasuredField): Value | undefined {
  if (field === 'durationMinutes') return log.durationMinutes;
  const block = log[blockKeyOf(log)] as Block | undefined;
  return (block as Record<string, unknown> | undefined)?.[field] as Value | undefined;
}

// --- one pair: what would change ------------------------------------------------------

export interface FieldChange {
  field: MeasuredField;
  // The hand-made value (absent: nothing was filled in) and the watch's.
  before: number | undefined;
  after: number;
}

export interface AlignItem {
  log: SessionLog;
  activity: ExternalActivity;
  // Only what really changes or comes in; the length is always among them
  // when it changes.
  changes: FieldChange[];
}

const isIndoorPair = (log: SessionLog, activity: ExternalActivity): boolean =>
  activity.treadmill || isIndoorLog(log) || (log[blockKeyOf(log)] as Block | undefined)?.estimatedElevation === true;

export function alignItemFor(log: SessionLog, activity: ExternalActivity): AlignItem | undefined {
  if (!isHandLog(log) || log.type === 'strength') return undefined;
  const watch = watchValues(activity);
  const indoor = isIndoorPair(log, activity);
  const changes: FieldChange[] = [];
  for (const field of MEASURED_FIELDS) {
    const after = watch[field];
    if (typeof after !== 'number') continue;
    const before = readField(log, field);
    const handMade = typeof before === 'number' ? before : undefined;
    // A climb on a treadmill is an estimate: the watch only fills a gap.
    if (indoor && (field === 'elevationGainM' || field === 'elevationLossM') && (handMade !== undefined || after <= 0)) continue;
    if (handMade !== undefined && sameAtShownPrecision(field, handMade, after)) continue;
    changes.push({ field, before: handMade, after });
  }
  return changes.length > 0 ? { log, activity, changes } : undefined;
}

// --- a whole list ------------------------------------------------------------------------

export interface PlanOptions {
  // Activities the user refused or took back ("Liever niet", "Terugzetten").
  declined?: string[];
  // Only logs of this day or later (the automatic route: the last 7 days).
  since?: string;
}

// The proposal: every log made by hand for which a fitting watch activity
// exists and the watch has something different to say, newest first. An
// activity that is already the externalId of a log is never used twice.
export function planAlignment(activities: ExternalActivity[], logs: SessionLog[], options: PlanOptions = {}): AlignItem[] {
  const taken = new Set(logs.map((l) => l.externalId).filter((id): id is string => !!id));
  const declined = new Set(options.declined ?? []);
  const usable = activities.filter((a) => a.kind !== 'strength' && !taken.has(a.externalId));
  const items: AlignItem[] = [];
  for (const pair of pairWithManualLogs(usable, logs)) {
    if (declined.has(pair.activity.externalId)) continue;
    if (options.since && pair.log.completedDate < options.since) continue;
    const item = alignItemFor(pair.log, pair.activity);
    if (item) items.push(item);
  }
  return items.sort((a, b) => b.log.completedDate.localeCompare(a.log.completedDate) || a.log.id.localeCompare(b.log.id));
}

// The recent activities and the ones fetched once for the past, without
// doubles (the recent copy wins).
export function mergeActivities(recent: ExternalActivity[], history: ExternalActivity[]): ExternalActivity[] {
  const seen = new Set(recent.map((a) => a.externalId));
  return [...recent, ...history.filter((a) => !seen.has(a.externalId))];
}

// How far back one fetch for the old trainings goes: from the oldest log made
// by hand, but never further than 120 days. Nothing to match, nothing to fetch.
export function historyStart(logs: SessionLog[], today: string): string | undefined {
  const dates = logs.filter((l) => isHandLog(l) && l.type !== 'strength').map((l) => l.completedDate);
  if (dates.length === 0) return undefined;
  const oldest = dates.reduce((a, b) => (a < b ? a : b));
  const floor = addDays(today, -HISTORY_MAX_DAYS);
  return oldest < floor ? floor : oldest;
}

// --- applying it -----------------------------------------------------------------------------

function put(block: Record<string, unknown>, field: MeasuredField, value: Value | undefined) {
  if (value === undefined) delete block[field];
  else block[field] = value;
}

// The log after the watch's numbers took over. A log the watch has nothing to
// add to comes back as it was. Nothing the user filled in is read or changed.
export function applyAlignment(log: SessionLog, activity: ExternalActivity, now: Date, clearedProgressIds: string[] = []): SessionLog {
  const item = alignItemFor(log, activity);
  if (!item) return log;
  const key = blockKeyOf(log);
  const old = log[key] as Block | undefined;
  const block = { ...(old ?? { durationMinutes: log.durationMinutes, source: 'manual' as MetricSource }) } as Record<string, unknown>;
  const values: ManualMeasured['values'] = {};
  let durationMinutes = log.durationMinutes;
  for (const change of item.changes) {
    values[change.field] = change.before ?? null;
    if (change.field === 'durationMinutes') durationMinutes = change.after;
    put(block, change.field, change.after);
  }
  // The climb of a treadmill was filled in from nothing: say that it is an estimate.
  const climbed = item.changes.some((c) => c.field === 'elevationGainM' || c.field === 'elevationLossM');
  if (climbed && activity.treadmill && activity.elevationGainM !== undefined) {
    values.estimatedElevation = typeof old?.estimatedElevation === 'boolean' ? old.estimatedElevation : null;
    block.estimatedElevation = true;
  }
  block.durationMinutes = durationMinutes;
  block.source = activity.source;
  const manualMeasured: ManualMeasured = {
    at: now.toISOString(),
    values,
    block: key,
    ...(old ? { blockSource: old.source } : { blockAdded: true as const }),
    ...(clearedProgressIds.length > 0 ? { clearedProgressIds } : {}),
  };
  // The fingerprint of the source numbers, so a later correction at the source is recognised.
  return { ...log, durationMinutes, [key]: block, externalId: activity.externalId, source: activity.source, manualMeasured, sourceSync: { seen: sourceNumbers(activity), externalId: activity.externalId } };
}

// The log with the hand-made numbers back, and as a hand-made log again. Only
// the fields the replacement touched are set back; anything added to the log
// since (feel, effort, pain) stays.
export function restoreManual(log: SessionLog): SessionLog {
  const m = log.manualMeasured;
  if (!m) return log;
  if (m.strength) return restoreStrength(log, m);
  if (!m.block) return log;
  const next: SessionLog = { ...log };
  const block = { ...((log[m.block] as Block | undefined) ?? {}) } as Record<string, unknown>;
  for (const [field, value] of Object.entries(m.values) as [MeasuredField, number | boolean | null][]) {
    if (field === 'durationMinutes' && typeof value === 'number') next.durationMinutes = value;
    put(block, field, value === null ? undefined : value);
  }
  if (typeof m.values.durationMinutes === 'number') block.durationMinutes = m.values.durationMinutes;
  if (m.blockAdded) delete next[m.block];
  else (next as unknown as Record<string, unknown>)[m.block] = { ...block, source: m.blockSource ?? 'manual' };
  delete next.externalId;
  delete next.manualMeasured;
  // A hand-made log again: no source to follow.
  delete next.sourceSync;
  next.source = 'manual';
  return next;
}

// The same, for a strength log that MacroFactor took over
// (engine/macrofactorLead.ts): the duration, the sets and the reps in reserve
// come back, and the id and source the workout put on the log go away again.
// Anything added to the log since stays.
function restoreStrength(log: SessionLog, m: ManualMeasured): SessionLog {
  const s = m.strength!;
  const next: SessionLog = { ...log };
  if (typeof m.values.durationMinutes === 'number') next.durationMinutes = m.values.durationMinutes;
  if ('strengthData' in s) {
    if (s.strengthData === null || s.strengthData === undefined) delete next.strengthData;
    else next.strengthData = s.strengthData;
  }
  if ('strengthRir' in s) {
    if (s.strengthRir === null || s.strengthRir === undefined) delete next.strengthRir;
    else next.strengthRir = s.strengthRir;
  }
  if (s.tied && log.externalId === s.workoutId) {
    delete next.externalId;
    next.source = s.tied.source;
  }
  delete next.manualMeasured;
  return next;
}

// Taken over by the watch. A strength log that MacroFactor took over has its
// own list (components/MacroFactorLeadSheet.tsx).
export const isAligned = (log: SessionLog): boolean => !!log.manualMeasured && !log.manualMeasured.strength;

// --- words -----------------------------------------------------------------------------------------

const minutesText = (min: number) => durationLabel(min * 60);

const FIELD_TEXT: Record<MeasuredField, { value: (n: number) => string; label: string }> = {
  durationMinutes: { value: minutesText, label: '' },
  distanceKm: { value: (n) => `${formatNumberNL(n, 1)} km`, label: '' },
  elevationGainM: { value: (n) => `${formatNumberNL(n, 0)} m`, label: 'stijging ' },
  elevationLossM: { value: (n) => `${formatNumberNL(n, 0)} m`, label: 'daling ' },
  avgHeartRate: { value: (n) => `${n}`, label: 'hartslag ' },
  maxHeartRate: { value: (n) => `${n}`, label: 'hoogste hartslag ' },
  cadence: { value: (n) => `${n}`, label: 'cadans ' },
  estimatedElevation: { value: () => '', label: '' },
};

// "6,9 km wordt 7,1 km", "55 min blijft", "hartslag 152 komt erbij". The length
// is always told, also when it stays; the rest only when it changes.
export function describeChanges(item: AlignItem): string[] {
  const parts: string[] = [];
  const watchDuration = watchValues(item.activity).durationMinutes;
  const lengthChange = item.changes.find((c) => c.field === 'durationMinutes');
  if (!lengthChange && typeof watchDuration === 'number') parts.push(`${minutesText(item.log.durationMinutes)} blijft`);
  for (const change of item.changes) {
    const t = FIELD_TEXT[change.field];
    if (change.before === undefined) parts.push(`${t.label}${t.value(change.after)} komt erbij`);
    else parts.push(`${t.label}${t.value(change.before)} wordt ${t.value(change.after)}`);
  }
  return parts;
}

// One line for a training: "Rustige loop 15 okt: 6,9 km wordt 7,1 km, 55 min
// blijft, hartslag 152 komt erbij".
export function describeAlignLine(item: AlignItem, templateName: string, dateText: string): string {
  return `${templateName} ${dateText}: ${describeChanges(item).join(', ')}`;
}

const FIELD_NAME: Record<MeasuredField, string> = {
  durationMinutes: 'duur',
  distanceKm: 'afstand',
  elevationGainM: 'stijging',
  elevationLossM: 'daling',
  avgHeartRate: 'hartslag',
  maxHeartRate: 'hoogste hartslag',
  cadence: 'cadans',
  estimatedElevation: 'schatting van de hoogte',
};

// What the log said before the watch took over, for the list of what was
// matched: "Eerst met de hand: 6,9 km, 55 min, stijging 120 m". When the watch
// only filled gaps, nothing of yours was replaced and the line says so.
export function describeManualLine(log: SessionLog): string {
  const m = log.manualMeasured;
  if (!m) return '';
  const replaced: string[] = [];
  const added: string[] = [];
  for (const field of MEASURED_FIELDS) {
    const v = m.values[field];
    if (typeof v === 'number') replaced.push(`${FIELD_TEXT[field].label}${FIELD_TEXT[field].value(v)}`);
    else if (v === null) added.push(FIELD_NAME[field]);
  }
  if (replaced.length > 0) return `Eerst met de hand: ${replaced.join(', ')}`;
  return added.length > 0 ? `Het horloge vulde aan: ${added.join(', ')}. Je eigen cijfers bleven staan.` : 'Er veranderde niets aan je cijfers.';
}
