// Migration scaffold. V1 only knows schema version 1, so this is a pass
// through with a guard rail — but the shape (versioned export, a migrate
// function keyed on the version found in the file) is what every future
// migration will slot into, so an export made today keeps opening in
// ASCEND years from now.
//
// SessionTemplate.roles (2026-10-26) needs no step: the field is optional and
// additive, and engine/templateRoles.ts falls back to the roles of the id when
// it is missing or not a list, so an older backup imports as before.

import { isPlausibleFatPct } from '../engine/bodyFat';
import { BackupMessageError } from './backupMessage';
import { isLeavePeriod, isTrekDetails } from '../engine/leave';
import { parseWeekShape, type WeekShape } from '../engine/sports';
import { RESUME_MINUTE_CHOICES, TAB_BACK_MODES, type TabBackMode } from '../engine/navigationSettings';
import type { LeavePeriod } from '../models/leave';
import { GOAL_KIND_IDS, GOAL_PRIORITIES, type GoalDetails, type GoalKindId, type GoalPriority, type GoalRequirement, type TrainingGoal } from '../models/goals';
import { goalPlanRole, isRaceGoal } from '../engine/raceBlock';
import { mainGoal } from '../engine/mainGoal';
import { variantOf } from '../data/goalKinds';
import type { RoutePlan } from '../models/routePlan';
import type { NightJudgment, WeeklyHealthCheck } from '../models/checkIn';
import type { TestJudgment } from '../models/testJudgment';
import { isUsableBestEffort } from '../engine/bestEffort';
import { MAX_TEST_JUDGMENTS } from '../engine/testJudgment';
import type { InjuryNote } from '../models/injury';
import type { SweatEntry, SweatPre } from '../models/sweat';
import type { AlcoholAmount, InfluenceEntry, InfluenceReason, InfluenceReasonNote } from '../models/influence';
import { AMOUNTS, MAX_LABEL_LENGTH, REASON_LABEL } from '../data/influenceReasons';
import type { ExternalOneRm, OneRmReading, WeightEntry } from '../models/metrics';
import type { ActivityDetail, DetailConditions, DetailSlice, RunDynamics, TerrainStretch } from '../models/activityDetail';
import type { BestEffort, ExerciseSetLog, ManualMeasured, ManualStrength, MeasuredField, MetricSource, SessionLog, SessionTrim, SetLog, SourceField, SourceNumbers, SourceSync, SourceUpdate, TrimField } from '../models/training';

// v2: SessionLog got an optional `externalId` (the id of an imported watch
// activity). Nothing in a v1 file has to change for it.
export const CURRENT_SCHEMA_VERSION = 2;

export interface AscendExport {
  schemaVersion: number;
  exportDate: string;
  program: unknown;
  templates: unknown;
  plannedSessions: unknown;
  sessionLogs: unknown;
  objectives: unknown;
  milestoneProgress: unknown;
  // Optional — absent on any export made before this field existed. Never
  // treat a missing value as "no injuries"; importFromFile falls back to an
  // empty array only for the write, not as a claim about what the backup
  // actually contained.
  injuryNotes?: unknown;
  settings: unknown;
}

// v1 -> v2: a pass-through. `externalId` is optional on every log, so a v1
// file is already a valid v2 file; only the version number moves. The step
// exists so the chain stays complete (and so a later step can rely on it).
export function migrateV1toV2(data: AscendExport): AscendExport {
  return { ...data, schemaVersion: 2 };
}

export function migrateExport(data: AscendExport): AscendExport {
  if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new BackupMessageError(
      `Dit bestand komt van een nieuwere versie van ASCEND (schema v${data.schemaVersion}). Werk de app bij voor je het importeert.`,
    );
  }
  let migrated = data;
  if (migrated.schemaVersion === 1) migrated = migrateV1toV2(migrated);
  // Future: chain migrateV2toV3(migrated) etc. here as the schema evolves.
  if (migrated.schemaVersion === CURRENT_SCHEMA_VERSION) return migrated;
  throw new Error(`Onbekende schemaversie: ${data.schemaVersion}`);
}

// --- vrije dagen en vakanties (backup schema 5) ------------------------------
// A period of free days, a holiday or a trek lives in `settings.leavePeriods`
// (models/leave.ts). Backups up to schema 4 do not have the key: that is
// "unknown", never "empty", so importing one leaves the periods on the device
// alone. A schema 5 file is read record by record; one that is incomplete,
// of an unknown kind or with an end before its start is dropped and counted,
// the rest is kept.
export function migrateLeavePeriods(raw: unknown): { periods: LeavePeriod[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { periods: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { periods: undefined, skipped: 1 };
  // A tocht (`trek`, models/leave.ts) is optional and additive: a file from
  // before it has none. One whose details are damaged stays a plain trek
  // period (the walking days are still true); only the details are dropped.
  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  const valid = raw.filter((p) => isLeavePeriod(p) || (isRecord(p) && isLeavePeriod({ ...p, trek: undefined })));
  // Damaged details are lost, so they are counted: you hear that they are gone.
  let lostDetails = 0;
  const periods = valid.map((p) => {
    const rec = p as LeavePeriod;
    const trek = isTrekDetails(rec.trek) ? rec.trek : undefined;
    if (rec.trek !== undefined && !trek) lostDetails++;
    return {
      id: rec.id, kind: rec.kind, startDate: rec.startDate, endDate: rec.endDate,
      ...(rec.note ? { note: rec.note } : {}),
      ...(trek ? { trek: { name: trek.name.trim(), terrain: trek.terrain, ...(trek.packKg ? { packKg: trek.packKg } : {}), tent: trek.tent, importance: trek.importance } } : {}),
    };
  });
  return { periods, skipped: raw.length - periods.length + lostDetails };
}

// --- eigen week: settings.weekShape ---------------------------------------------
// The shape of your week, chosen at the first questions (engine/weekShape.ts).
// Optional and additive: a file from before it has none. Only known templates with a
// weekday of 1 to 7 get through; a damaged value is nothing, and the pattern is then
// the default one (engine/sports.ts#parseWeekShape).
export function readWeekShape(raw: unknown): WeekShape | undefined {
  return parseWeekShape(raw);
}

// --- korte nacht: settings.nightJudgments -------------------------------------
// Your own verdict on a night the watch only partly measured (models/checkIn.ts).
// Optional and additive, so the backup schema number does not move: a file from
// before it has no key, which means "not in this backup" and leaves the verdicts
// on the device alone. A record without a date or with an unknown verdict is
// dropped and counted; a damaged estimate or damaged minutes lose only themselves,
// because the verdict itself is still true. One verdict per date, the last one wins.
export function migrateNightJudgments(raw: unknown): { list: NightJudgment[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byDate = new Map<string, NightJudgment>();
  let skipped = 0;
  for (const item of raw) {
    const j = typeof item === 'object' && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : undefined;
    if (!j || typeof j.date !== 'string' || !ISO_DAY.test(j.date.slice(0, 10)) || (j.verdict !== 'klopt' && j.verdict !== 'niet_goed')) {
      skipped++;
      continue;
    }
    const hours = typeof j.hours === 'number' && Number.isInteger(j.hours) && j.hours >= 5 && j.hours <= 9 ? j.hours : undefined;
    if (j.hours !== undefined && hours === undefined) skipped++;
    // The sleep the watch showed when you judged; a damaged number only loses itself, and
    // the verdict then holds as it did before the field existed.
    const minutes = typeof j.minutes === 'number' && Number.isFinite(j.minutes) && j.minutes > 0 && j.minutes <= 1440 ? j.minutes : undefined;
    if (j.minutes !== undefined && minutes === undefined) skipped++;
    byDate.set(j.date.slice(0, 10), {
      date: j.date.slice(0, 10),
      verdict: j.verdict,
      ...(minutes !== undefined ? { minutes } : {}),
      ...(j.verdict === 'niet_goed' && hours !== undefined ? { hours } : {}),
      ...(j.verdict === 'niet_goed' && hours === undefined && j.hoursSkipped === true ? { hoursSkipped: true } : {}),
    });
  }
  return { list: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), skipped };
}

// --- zweetverlies: settings.sweatEntries ---------------------------------------------
// Je eigen wegingen bij trainingen (models/sweat.ts). Optioneel en additief, dus het
// schemanummer van de back-up verandert niet: een bestand van voor deze lijst heeft geen
// sleutel, en dat laat de metingen op het toestel met rust. Een record zonder id, training,
// datum of soort valt weg en wordt geteld; een kapot getal verliest alleen zichzelf. Een
// meting zonder één bruikbaar getal (weging, horloge) valt ook weg. Per training blijft de
// laatste staan.
const SWEAT_RANGES = {
  weightBeforeKg: [20, 300],
  weightAfterKg: [20, 300],
  drankMl: [0, 10000],
  peeMl: [0, 3000],
  watchMl: [1, 10000],
  tempC: [-40, 55],
} as const;

export function migrateSweatEntries(raw: unknown): { list: SweatEntry[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byLog = new Map<string, SweatEntry>();
  let skipped = 0;
  for (const item of raw) {
    const r = typeof item === 'object' && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : undefined;
    if (
      !r ||
      typeof r.id !== 'string' || !r.id ||
      typeof r.logId !== 'string' || !r.logId ||
      typeof r.date !== 'string' || !ISO_DAY.test(r.date.slice(0, 10)) ||
      (r.activity !== 'run' && r.activity !== 'walk') ||
      typeof r.durationMinutes !== 'number' || !Number.isFinite(r.durationMinutes) || r.durationMinutes <= 0 || r.durationMinutes > 2000
    ) {
      skipped++;
      continue;
    }
    const entry: SweatEntry = {
      id: r.id,
      logId: r.logId,
      date: r.date.slice(0, 10),
      activity: r.activity,
      durationMinutes: Math.round(r.durationMinutes),
      updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : `${r.date.slice(0, 10)}T00:00:00.000Z`,
    };
    for (const key of Object.keys(SWEAT_RANGES) as (keyof typeof SWEAT_RANGES)[]) {
      const v = r[key];
      if (v === undefined) continue;
      const [lo, hi] = SWEAT_RANGES[key];
      if (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) entry[key] = v;
      else skipped++;
    }
    const weighed = entry.weightBeforeKg !== undefined && entry.weightAfterKg !== undefined;
    if (!weighed && entry.watchMl === undefined) {
      skipped++;
      continue;
    }
    const seen = byLog.get(entry.logId);
    if (!seen || entry.updatedAt >= seen.updatedAt) byLog.set(entry.logId, entry);
  }
  return { list: [...byLog.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)), skipped };
}

// --- zweetverlies vóór de training: settings.sweatPre ---------------------------------
// Je gewicht van vóór een training, bewaard tot de log van die dag er is (models/sweat.ts).
// Optioneel en additief, dus het schemanummer van de back-up verandert niet: een bestand van
// voor deze lijst heeft geen sleutel en laat de lijst op het toestel met rust. Een record
// zonder echte datum of met een gewicht buiten 20 tot 300 kg valt weg en wordt geteld; per
// dag blijft de laatste staan.
export function migrateSweatPre(raw: unknown): { list: SweatPre[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byDate = new Map<string, SweatPre>();
  let skipped = 0;
  for (const item of raw) {
    const r = typeof item === 'object' && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : undefined;
    if (
      !r ||
      typeof r.date !== 'string' || !ISO_DAY.test(r.date.slice(0, 10)) ||
      typeof r.weightKg !== 'number' || !Number.isFinite(r.weightKg) || r.weightKg < 20 || r.weightKg > 300
    ) {
      skipped++;
      continue;
    }
    const date = r.date.slice(0, 10);
    const pre: SweatPre = { date, weightKg: r.weightKg, updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : `${date}T00:00:00.000Z` };
    const seen = byDate.get(date);
    if (!seen || pre.updatedAt >= seen.updatedAt) byDate.set(date, pre);
  }
  return { list: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)), skipped };
}

// --- Garmin is leidend: SessionLog.manualMeasured -----------------------------
// A log made by hand that took over the watch's numbers keeps the hand-made
// ones in `manualMeasured` (models/training.ts). The field is optional and
// additive: a file from before it has none, and every log travels whole, so the
// backup schema number does not move. This step is a pass-through for a log
// without the field; a log whose field is damaged (hand-edited, cut off) keeps
// everything else and loses only that field, because putting back from damaged
// values would write nonsense into the log.
const MEASURED_KEYS: MeasuredField[] = ['durationMinutes', 'distanceKm', 'elevationGainM', 'elevationLossM', 'avgHeartRate', 'maxHeartRate', 'cadence', 'estimatedElevation'];

export function migrateManualMeasured(raw: unknown): ManualMeasured | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const m = raw as Record<string, unknown>;
  const strength = migrateManualStrength(m.strength);
  if (m.strength !== undefined && !strength) return undefined;
  // A strength takeover has no block; every other replacement has one.
  if (typeof m.at !== 'string' || (!strength && m.block !== 'cardioData' && m.block !== 'outdoorData')) return undefined;
  if (m.block !== undefined && m.block !== 'cardioData' && m.block !== 'outdoorData') return undefined;
  if (typeof m.values !== 'object' || m.values === null || Array.isArray(m.values)) return undefined;
  const values: ManualMeasured['values'] = {};
  for (const [key, value] of Object.entries(m.values as Record<string, unknown>)) {
    if (!MEASURED_KEYS.includes(key as MeasuredField)) return undefined;
    const numeric = key !== 'estimatedElevation';
    if (value === null || (numeric ? typeof value === 'number' && Number.isFinite(value) : typeof value === 'boolean')) values[key as MeasuredField] = value as number | boolean | null;
    else return undefined;
  }
  const ids = m.clearedProgressIds;
  return {
    at: m.at,
    values,
    ...(m.block === 'cardioData' || m.block === 'outdoorData' ? { block: m.block } : {}),
    ...(m.blockAdded === true ? { blockAdded: true as const } : {}),
    ...(typeof m.blockSource === 'string' ? { blockSource: m.blockSource as ManualMeasured['blockSource'] } : {}),
    ...(Array.isArray(ids) && ids.every((i) => typeof i === 'string') && ids.length > 0 ? { clearedProgressIds: ids as string[] } : {}),
    ...(strength ? { strength } : {}),
  };
}

const isExerciseSets = (v: unknown): v is NonNullable<SessionLog['strengthData']> =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      typeof e === 'object' && e !== null && typeof (e as { exerciseId?: unknown }).exerciseId === 'string' &&
      typeof (e as { exerciseName?: unknown }).exerciseName === 'string' && Array.isArray((e as { sets?: unknown }).sets),
  );

// The strength part of a takeover by MacroFactor; undefined when damaged.
export function migrateManualStrength(raw: unknown): ManualStrength | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const s = raw as Record<string, unknown>;
  if (typeof s.workoutId !== 'string') return undefined;
  const out: ManualStrength = { workoutId: s.workoutId };
  if ('strengthData' in s) {
    if (s.strengthData !== null && !isExerciseSets(s.strengthData)) return undefined;
    out.strengthData = s.strengthData;
  }
  if ('strengthRir' in s) {
    if (s.strengthRir !== null && !(typeof s.strengthRir === 'number' && Number.isFinite(s.strengthRir))) return undefined;
    out.strengthRir = s.strengthRir;
  }
  if (s.tied !== undefined) {
    const t = s.tied as { source?: unknown } | null;
    if (typeof t !== 'object' || t === null || typeof t.source !== 'string') return undefined;
    out.tied = { source: t.source as MetricSource };
  }
  return out;
}

// A log as it comes out of a file: the same log, with `manualMeasured` only when
// it is whole.
export function migrateLogManualMeasured(log: SessionLog): SessionLog {
  if (!('manualMeasured' in log)) return log;
  const valid = migrateManualMeasured((log as { manualMeasured?: unknown }).manualMeasured);
  const { manualMeasured: _damaged, ...rest } = log;
  void _damaged;
  return valid ? { ...rest, manualMeasured: valid } : rest;
}

// --- SessionLog.gymProfileId --------------------------------------------------------
// The gym profile a strength log was done in (decision 2026-10-26-gewichten-per-toestel.md).
// Optional and additive; kept only as a non-empty text of at most 60 characters, so a
// hand-edited backup cannot make a training silently drop out of every gym.
export function migrateLogGymProfile(log: SessionLog): SessionLog {
  if (!('gymProfileId' in log)) return log;
  const raw = (log as { gymProfileId?: unknown }).gymProfileId;
  if (typeof raw === 'string' && raw.trim() !== '' && raw.length <= 60) return log;
  const { gymProfileId: _damaged, ...rest } = log;
  void _damaged;
  return rest;
}

// --- testloop lezen: SessionLog.bestEffort en settings.testJudgments ------------------------
// A test run may carry the fastest unbroken 5 km read from the watch's series
// (`bestEffort`, models/training.ts, engine/bestEffort.ts), and your own verdicts on test
// runs ("Telt mee", "Telt niet mee") are a list next to the logs. Both are optional and
// additive, so the backup schema number does not move: a file from before them has neither
// and imports as it was (the whole log then counts and every test counts, as before).
// A damaged best effort is dropped and the log keeps everything else; a damaged verdict
// loses only itself. One verdict per log, the last one wins.
export function migrateLogBestEffort(log: SessionLog): SessionLog {
  if (!('bestEffort' in log)) return log;
  if (isUsableBestEffort((log as { bestEffort?: unknown }).bestEffort)) {
    const b = (log as { bestEffort: BestEffort }).bestEffort;
    return { ...log, bestEffort: { km: b.km, minutes: b.minutes } };
  }
  const { bestEffort: _damaged, ...rest } = log;
  void _damaged;
  return rest;
}

export function migrateTestJudgments(raw: unknown): { list: TestJudgment[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byLog = new Map<string, TestJudgment>();
  let skipped = 0;
  for (const item of raw) {
    if (!isObj(item) || typeof item.logId !== 'string' || item.logId.trim() === '' || item.logId.length > 80 || (item.verdict !== 'counts' && item.verdict !== 'ignore')) {
      skipped++;
      continue;
    }
    const date = typeof item.date === 'string' && ISO_DAY.test(item.date.slice(0, 10)) ? item.date.slice(0, 10) : undefined;
    if (!date) {
      skipped++;
      continue;
    }
    byLog.set(item.logId, { logId: item.logId, verdict: item.verdict, date });
  }
  return { list: [...byLog.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_TEST_JUDGMENTS), skipped };
}

// --- InjuryNote.kind en InjuryNote.side ---------------------------------------------------
// What you noticed (spierpijn, stijf or pijn) and which side (links, midden, rechts or beide), from
// the card "Hoe voelt je lijf?" (decision 2026-10-26-hoe-voelt-je-lijf.md). Both are optional and
// additive: a note without them is pain, and a back part without a side reads as 'midden'
// (engine/bodyMap.ts#sideOfInjury), so a backup from before imports exactly as it did and the
// schema number does not move. A damaged value loses only that field. An older app that reads a
// newer backup sees soreness as plain pain; that is the price of not bumping the schema.
const INJURY_KINDS = ['spierpijn', 'stijf', 'pijn'];
const INJURY_SIDES = ['links', 'midden', 'rechts', 'beide'];
export function migrateInjuryNote(note: InjuryNote): InjuryNote {
  if (typeof note !== 'object' || note === null || (!('kind' in note) && !('side' in note))) return note;
  const { kind, side, ...rest } = note;
  const out: InjuryNote = rest;
  if (typeof kind === 'string' && INJURY_KINDS.includes(kind)) out.kind = kind as InjuryNote['kind'];
  if (typeof side === 'string' && INJURY_SIDES.includes(side)) out.side = side as InjuryNote['side'];
  return out;
}

// --- WeeklyHealthCheck.laterOn --------------------------------------------------------------
// The day you pressed "Niet nu" on the card "Hoe voelt je lijf?". Optional and additive; kept only
// as a date.
export function migrateWeeklyHealthCheck(check: WeeklyHealthCheck): WeeklyHealthCheck {
  if (typeof check !== 'object' || check === null || !('laterOn' in check)) return check;
  const { laterOn, ...rest } = check;
  return typeof laterOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(laterOn) ? check : rest;
}

// --- meer per set: SetLog.rir, SetLog.kind en SetLog.rirAssumed -------------------
// A set can carry the reps in reserve (`rir`, 0 to 10) and its kind (`kind`,
// 'warmup' or 'work'; absent is a working set). Both are optional and additive:
// every log travels whole, so the backup schema number does not move and a
// backup from before the fields (any schema) imports exactly as it did. A set
// whose new field is damaged (hand-edited) keeps its reps and weight and loses
// only that field. `rirAssumed` (true: the reps in reserve are the aim of the
// plan, not measured) is only kept as `true` and only next to a valid `rir`.
export function migrateSetLog(raw: SetLog): SetLog {
  if (typeof raw !== 'object' || raw === null || (!('rir' in raw) && !('kind' in raw) && !('rirAssumed' in raw))) return raw;
  const { rir, kind, rirAssumed, ...rest } = raw as SetLog;
  const out: SetLog = rest;
  if (typeof rir === 'number' && Number.isFinite(rir) && rir >= 0 && rir <= 10) out.rir = rir;
  if (kind === 'warmup' || kind === 'work') out.kind = kind;
  if (rirAssumed === true && out.rir !== undefined) out.rirAssumed = true;
  return out;
}

function migrateExerciseSets(data: ExerciseSetLog[] | null | undefined): ExerciseSetLog[] | null | undefined {
  if (!Array.isArray(data)) return data;
  let changed = false;
  const next = data.map((e) => {
    if (!e || !Array.isArray(e.sets)) return e;
    const sets = e.sets.map(migrateSetLog);
    if (sets.every((s, i) => s === e.sets[i])) return e;
    changed = true;
    return { ...e, sets };
  });
  return changed ? next : data;
}

// A log as it comes out of a file, with every set read by migrateSetLog (also
// the sets kept for putting back in `manualMeasured.strength`).
export function migrateLogSets(log: SessionLog): SessionLog {
  let next = log;
  const data = migrateExerciseSets(log.strengthData);
  if (data !== log.strengthData) next = { ...next, strengthData: data as ExerciseSetLog[] };
  const kept = log.manualMeasured?.strength?.strengthData;
  const keptNext = migrateExerciseSets(kept);
  if (keptNext !== kept && log.manualMeasured?.strength) {
    next = { ...next, manualMeasured: { ...log.manualMeasured, strength: { ...log.manualMeasured.strength, strengthData: keptNext } } };
  }
  return next;
}

// --- terugknop en hervatten (optionele instellingen) ---------------------------
// `settings.tabBack` en `settings.resumeMinutes` (engine/navigationSettings.ts)
// zijn optioneel en additief: een back-up van voor deze instellingen heeft ze
// niet en blijft zoals hij is, het advies geldt dan. Staat er wel iets, dan
// blijft alleen een bekende waarde over; de rest wordt weggelaten en geteld.
export function cleanNavigationSettings(raw: { tabBack?: unknown; resumeMinutes?: unknown }): {
  value: { tabBack?: TabBackMode; resumeMinutes?: number };
  skipped: number;
} {
  const value: { tabBack?: TabBackMode; resumeMinutes?: number } = {};
  let skipped = 0;
  if (raw.tabBack !== undefined) {
    const mode = TAB_BACK_MODES.find((m) => m === raw.tabBack);
    if (mode) value.tabBack = mode;
    else skipped++;
  }
  if (raw.resumeMinutes !== undefined) {
    const minutes = RESUME_MINUTE_CHOICES.find((m) => m === raw.resumeMinutes);
    if (minutes !== undefined) value.resumeMinutes = minutes;
    else skipped++;
  }
  return { value, skipped };
}

// --- loopinzicht: SessionLog.detail ---------------------------------------------------
// The compact profile of a run or tocht (models/activityDetail.ts). The field is
// optional and additive, and every log travels whole, so the backup schema
// number does not move (docs/beslissingen/2026-10-22-loopinzicht.md). It is
// derived from the watch's series and can be fetched again, so a profile that is
// damaged (hand-edited, cut off) is dropped as a whole and the log keeps
// everything else; a profile is never half repaired, because a comparison on
// invented numbers is worse than no comparison. Fields the reader does not know
// are not kept.
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optFin = (v: unknown): boolean => v === undefined || fin(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

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

// --- 1RM uit MacroFactor: settings.externalOneRm -------------------------------
// The 1RM per exercise as another source reports it (models/metrics.ts#ExternalOneRm,
// engine/macrofactorOneRm.ts). It lives in the settings, optional and additive, so
// the backup schema number does not move (docs/beslissingen/2026-10-24-1rm-uit-macrofactor.md).
// A backup from before it has no key: that is "unknown", never "empty", so importing
// one leaves the readings on the device alone. A file that has it is read series by
// series and reading by reading: a reading without a real date or a weight between
// 0 and 1000 kg is dropped and counted, a series without name, source or any
// reading is dropped and counted, and what stays is sorted with one reading per day.
// Nothing is repaired or guessed, because a comparison on invented numbers is worse
// than no comparison.
const ONE_RM_SOURCES: MetricSource[] = ['manual', 'garmin', 'health-connect', 'macrofactor', 'import'];
const ISO_DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
// The shape and a real date: 2026-13-45 has the shape but is no day.
const ISO_DAY = {
  test(value: string): boolean {
    if (!ISO_DAY_SHAPE.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  },
};
const MAX_ONE_RM_SERIES = 300;
const MAX_ONE_RM_POINTS = 3000;
const MAX_ONE_RM_KG = 1000;

export function migrateExternalOneRm(raw: unknown): { series: ExternalOneRm[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { series: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { series: undefined, skipped: 1 };
  const series: ExternalOneRm[] = [];
  let skipped = 0;
  for (const item of raw) {
    if (series.length >= MAX_ONE_RM_SERIES) {
      skipped++;
      continue;
    }
    if (!isObj(item) || typeof item.exerciseName !== 'string' || item.exerciseName.trim() === '' || item.exerciseName.length > 120 || !ONE_RM_SOURCES.includes(item.source as MetricSource) || !Array.isArray(item.points)) {
      skipped++;
      continue;
    }
    const days = new Map<string, number>();
    for (const p of item.points.slice(0, MAX_ONE_RM_POINTS)) {
      if (isObj(p) && typeof p.date === 'string' && ISO_DAY.test(p.date) && fin(p.kg) && p.kg > 0 && p.kg <= MAX_ONE_RM_KG) days.set(p.date, p.kg);
      else skipped++;
    }
    skipped += Math.max(0, item.points.length - MAX_ONE_RM_POINTS);
    if (days.size === 0) {
      skipped++;
      continue;
    }
    const points: OneRmReading[] = [...days].map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
    series.push({ exerciseName: item.exerciseName.trim(), source: item.source as MetricSource, points });
  }
  return { series: series.length > 0 ? series : undefined, skipped };
}

// The weigh-ins in the settings (AppSettings.weightEntries). Since 25 Oct 2026 an entry
// may carry `fatPct`, the fat percentage of that weighing from a MacroFactor export. A
// file from before has none and reads as it did. A `fatPct` that is no number between
// 3 and 60 is dropped (and counted) while the weight of that day stays: a weigh-in is
// worth more than the one number on it. Nothing is repaired or guessed. See
// docs/beslissingen/2026-10-25-vetpercentage-uit-macrofactor.md.
export function migrateWeightEntries(entries: WeightEntry[]): { entries: WeightEntry[]; skipped: number } {
  let skipped = 0;
  const cleaned = entries.map((e) => {
    if (!('fatPct' in e) || isPlausibleFatPct(e.fatPct)) return e;
    skipped++;
    const copy: WeightEntry = { ...e };
    delete copy.fatPct;
    return copy;
  });
  return { entries: cleaned, skipped };
}

// --- wat speelde er: settings.influences ---------------------------------------
// Your own notes about a day or a training (models/influence.ts). Optional and
// additive, so the backup schema number does not move: a file from before it has no
// key, which means "not in this backup" and leaves the notes on the device alone.
// A record without an id, a valid date or a readable list of reasons is dropped and
// counted; an unknown reason is left out; a damaged amount or label loses only
// itself, because the reason is still true. One note per id, the newest updatedAt wins.
const MAX_INFLUENCES = 2000;
const NO_TIME = '1970-01-01T00:00:00.000Z';

// One note per place: a training (`logId`) or a day (`date`, without logId). Two notes for the same
// place come from two devices that both made one; the newest `updatedAt` wins, on a tie the
// smaller id, so the outcome never depends on the order.
export function dedupeInfluencesByPlace(list: readonly InfluenceEntry[]): InfluenceEntry[] {
  const byPlace = new Map<string, InfluenceEntry>();
  for (const e of list) {
    const key = e.logId ? `log:${e.logId}` : `day:${e.date}`;
    const cur = byPlace.get(key);
    if (!cur || e.updatedAt > cur.updatedAt || (e.updatedAt === cur.updatedAt && e.id < cur.id)) byPlace.set(key, e);
  }
  return [...byPlace.values()];
}

export function migrateInfluences(raw: unknown): { list: InfluenceEntry[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byId = new Map<string, InfluenceEntry>();
  let skipped = 0;
  for (const item of raw) {
    if (!isObj(item) || typeof item.id !== 'string' || item.id === '' || item.id.length > 80 || typeof item.date !== 'string' || !ISO_DAY.test(item.date) || !Array.isArray(item.reasons)) {
      skipped++;
      continue;
    }
    // The place is part of the meaning (a training or a day), so a damaged logId drops the note.
    if (item.logId !== undefined && (typeof item.logId !== 'string' || item.logId === '')) {
      skipped++;
      continue;
    }
    const reasons: InfluenceReasonNote[] = [];
    const seen = new Set<InfluenceReason>();
    for (const r of item.reasons) {
      if (!isObj(r) || typeof r.reason !== 'string' || !Object.prototype.hasOwnProperty.call(REASON_LABEL, r.reason) || seen.has(r.reason as InfluenceReason)) {
        skipped++;
        continue;
      }
      const reason = r.reason as InfluenceReason;
      seen.add(reason);
      let amount: AlcoholAmount | undefined;
      if (r.amount !== undefined) {
        if (reason === 'alcohol' && AMOUNTS.includes(r.amount as AlcoholAmount)) amount = r.amount as AlcoholAmount;
        else skipped++;
      }
      let label: string | undefined;
      if (r.label !== undefined) {
        const text = typeof r.label === 'string' ? r.label.trim().slice(0, MAX_LABEL_LENGTH).trim() : '';
        if (reason === 'anders' && text !== '') label = text;
        else skipped++;
      }
      reasons.push({ reason, ...(amount ? { amount } : {}), ...(label ? { label } : {}) });
    }
    let updatedAt = NO_TIME;
    if (typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt))) updatedAt = item.updatedAt;
    else skipped++;
    if (item.excludeHeartRate !== undefined && typeof item.excludeHeartRate !== 'boolean') skipped++;
    if (item.seen !== undefined && typeof item.seen !== 'boolean') skipped++;
    const entry: InfluenceEntry = {
      id: item.id,
      date: item.date,
      ...(item.logId ? { logId: item.logId as string } : {}),
      reasons,
      ...(item.excludeHeartRate === true ? { excludeHeartRate: true } : {}),
      ...(item.seen === true ? { seen: true } : {}),
      updatedAt,
    };
    const earlier = byId.get(entry.id);
    if (!earlier || entry.updatedAt >= earlier.updatedAt) byId.set(entry.id, entry);
  }
  const unique = dedupeInfluencesByPlace([...byId.values()]);
  skipped += byId.size - unique.length;
  const list = unique.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  skipped += Math.max(0, list.length - MAX_INFLUENCES);
  return { list: list.slice(-MAX_INFLUENCES), skipped };
}

// --- soort, gegevens en belangrijkheid van een doel (ronde 2a) ---------------------------
// `TrainingGoal.kind`, `.details` en `.priority` zijn optioneel en komen er bij het lezen bij
// (een back-up van voor deze ronde, en het opstarten op het toestel); er is geen
// schemaversie voor nodig. Het oude `planRole` blijft staan en wordt defensief gelezen.
// - Het hoofddoel met mijlpalen (de GR5) wordt trek_tent of trek_hut, afhankelijk van of er
//   in het etappeplan een nacht in tent of bivak gekozen is, met de huidige getallen als
//   details en priority 'top'. De dagen achter elkaar blijven op 2 (zoals de meter nu rekent),
//   zodat het getal en de planning gelijk blijven.
// - Een hardloopdoel wordt run_race, met priority uit planRole.
// - "Alleen volgen" (planRole 'track') bestaat niet meer: het wordt priority 'verkenning'.

const DETAIL_NUMBERS = ['distanceKm', 'gainM', 'lossM', 'days', 'packKg', 'highestPointM', 'sleepingPointM', 'expectedMinutes', 'targetMinutes', 'baggageKg', 'homeDaysInRow', 'weeklyMinutes', 'strengthDays'] as const;

// Leest de ingevulde gegevens. Een veld dat geen getal boven nul is, of een tekst die niet
// bij het veld hoort, valt weg; de rest blijft.
export function readGoalDetails(raw: unknown): GoalDetails | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  // Altijd in dezelfde volgorde, zodat lezen een opgeslagen doel niet verandert.
  const out: GoalDetails = {};
  if (typeof r.variant === 'string' && r.variant.length > 0 && r.variant.length <= 40) out.variant = r.variant;
  if (r.shelter === 'hut' || r.shelter === 'tent') out.shelter = r.shelter;
  for (const key of DETAIL_NUMBERS) {
    const x = r[key];
    if (typeof x === 'number' && Number.isFinite(x) && x > 0) out[key] = x;
  }
  if (Array.isArray(r.strengthTargets)) {
    const list = r.strengthTargets.flatMap((t) => {
      if (!t || typeof t !== 'object') return [];
      const { exercise, kg, reps } = t as Record<string, unknown>;
      return typeof exercise === 'string' && typeof kg === 'number' && kg > 0 && typeof reps === 'number' && reps > 0 ? [{ exercise, kg, reps }] : [];
    });
    if (list.length > 0) out.strengthTargets = list;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function readGoalKind(raw: unknown): GoalKindId | undefined {
  return typeof raw === 'string' && (GOAL_KIND_IDS as readonly string[]).includes(raw) ? (raw as GoalKindId) : undefined;
}

export function readGoalPriority(raw: unknown): GoalPriority | undefined {
  return typeof raw === 'string' && (GOAL_PRIORITIES as readonly string[]).includes(raw) ? (raw as GoalPriority) : undefined;
}

// De oude rol naar de nieuwe belangrijkheid. Onbekend of afwezig: undefined.
export function priorityFromPlanRole(role: unknown): GoalPriority | undefined {
  if (role === 'main') return 'top';
  if (role === 'secondary') return 'voortop';
  if (role === 'track') return 'verkenning';
  return undefined;
}

// Heeft de gebruiker in het etappeplan een nacht in tent of bivak gekozen? Dan is de tocht
// een tocht met tent.
export function routePlanUsesTent(plan: Pick<RoutePlan, 'choices'> | null | undefined): boolean {
  if (!plan || typeof plan.choices !== 'object' || plan.choices === null) return false;
  return Object.values(plan.choices).some((c) => c?.sleep === 'tent' || c?.sleep === 'bivak');
}

export interface GoalKindContext {
  // Dit doel is het hoofddoel: het doel met mijlpalen (de Ascent Ladder) dat
  // engine/mainGoal.ts#mainGoal aanwijst. Een tweede doel met mijlpalen of een
  // gearchiveerd doel is het niet.
  isMain: boolean;
  tent: boolean;
  // Onbekend of er mijlpalen zijn (een back-up zonder die lijst): zonder rol op het doel
  // wordt de belangrijkheid dan niet gezet, de opstartstap doet dat later goed.
  ladderUnknown?: boolean;
}

function amountOf(reqs: GoalRequirement[], kind: GoalRequirement['kind'], unit?: string): number | undefined {
  const found = reqs.filter((r) => r.kind === kind && r.target && (!unit || r.target.unit === unit));
  // Een eis per dag is geen totaal: die wordt hier niet als totaal overgenomen.
  const pick = found.find((r) => r.scope === 'TOTAL_EVENT' || r.scope === 'SINGLE_EVENT') ?? found.find((r) => r.scope !== 'PER_DAY');
  const n = pick?.target?.amount;
  return typeof n === 'number' && n > 0 ? n : undefined;
}

function trekDetails(reqs: GoalRequirement[], shelter: 'hut' | 'tent'): GoalDetails {
  const d: GoalDetails = { shelter, homeDaysInRow: 2 };
  const set = <K extends keyof GoalDetails>(k: K, v: GoalDetails[K] | undefined) => { if (v !== undefined) d[k] = v; };
  set('distanceKm', amountOf(reqs, 'distance', 'km'));
  set('gainM', amountOf(reqs, 'elevationGain', 'm'));
  set('lossM', amountOf(reqs, 'elevationLoss', 'm'));
  set('days', amountOf(reqs, 'eventDays') ?? amountOf(reqs, 'consecutiveDays'));
  set('packKg', amountOf(reqs, 'packWeight', 'kg'));
  return d;
}

function runDetails(reqs: GoalRequirement[]): GoalDetails {
  const d: GoalDetails = {};
  const km = amountOf(reqs, 'distance', 'km');
  const min = amountOf(reqs, 'targetTime', 'min');
  if (km !== undefined) d.distanceKm = km;
  if (min !== undefined) d.targetMinutes = min;
  const variant = variantOf('run_race', d);
  if (variant) d.variant = variant;
  return d;
}

// Zet de soort, de gegevens en de belangrijkheid op een doel waar ze nog niet staan. Een doel
// dat ze al heeft houdt ze (gelezen en schoongemaakt). Idempotent. Raakt niets anders aan.
export function migrateTrainingGoal(goal: TrainingGoal, ctx: GoalKindContext): TrainingGoal {
  const reqs = Array.isArray(goal.requirements) ? goal.requirements : [];
  // Vooruitcompatibel: een soort, belangrijkheid of veld uit een nieuwere versie blijft staan.
  const rawKind: unknown = goal.kind;
  const rawPriority: unknown = goal.priority;
  const unknownKind = rawKind !== undefined && rawKind !== null && readGoalKind(rawKind) === undefined;
  const unknownPriority = rawPriority !== undefined && rawPriority !== null && readGoalPriority(rawPriority) === undefined;
  let kind = readGoalKind(goal.kind);
  let details = readGoalDetails(goal.details);
  let priority = readGoalPriority(goal.priority);

  if (!kind && !unknownKind) {
    if (ctx.isMain) {
      kind = ctx.tent ? 'trek_tent' : 'trek_hut';
      details = details ?? readGoalDetails(trekDetails(reqs, ctx.tent ? 'tent' : 'hut'));
    } else if (isRaceGoal({ ...goal, requirements: reqs })) {
      kind = 'run_race';
      details = details ?? readGoalDetails(runDetails(reqs));
    }
  }
  if (!priority && !unknownPriority) {
    // De rol zoals de planning hem al las (raceBlock.ts): het hoofddoel is top, een andere
    // hardloopwedstrijd voortop, de rest verkenning. Zonder bekende mijlpalen en zonder rol
    // is niet te zeggen wat het is: dan niets zetten.
    const fromRole = priorityFromPlanRole(goal.planRole);
    if (ctx.isMain) priority = 'top';
    else if (fromRole) priority = fromRole;
    else if (!ctx.ladderUnknown) priority = priorityFromPlanRole(goalPlanRole({ ...goal, requirements: reqs }, undefined));
  }

  const next: TrainingGoal = { ...goal };
  if (kind) next.kind = kind; else if (!unknownKind) delete next.kind;
  const extras = unknownDetailFields(goal.details);
  if (details || extras) next.details = { ...(details ?? {}), ...(extras ?? {}) }; else delete next.details;
  if (priority) next.priority = priority; else if (!unknownPriority) delete next.priority;
  // Ronde 2b: een eigen afbouw en de aanvaarde botsingen, defensief gelezen. Wat niet klopt gaat weg.
  const taper: unknown = goal.taperDays;
  if (typeof taper === 'number' && Number.isFinite(taper) && taper >= 0) next.taperDays = Math.round(taper); else delete next.taperDays;
  // Alleen een echte true blijft staan; de migratie zet het zelf nooit (het is jouw keuze in de app).
  const chosen: unknown = goal.priorityChosen;
  if (chosen === true) next.priorityChosen = true; else delete next.priorityChosen;
  const accepted = readAcceptedConflicts(goal.conflictAccepted);
  if (accepted) next.conflictAccepted = accepted; else delete next.conflictAccepted;
  // Ronde 2c: de plek in de lijst op de Ascend-tab, een heel getal vanaf 0.
  const order: unknown = goal.order;
  if (typeof order === 'number' && Number.isFinite(order) && order >= 0) next.order = Math.round(order); else delete next.order;
  return next;
}

// De aanvaarde botsingen (TrainingGoal.conflictAccepted): een paar datums "van|tot" (of, van een
// eerdere versie, één datum), alleen echte datums, zonder dubbelen.
export function readAcceptedConflicts(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const dates = [...new Set(raw.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}(\|\d{4}-\d{2}-\d{2})?$/.test(d)))];
  return dates.length > 0 ? dates : undefined;
}

// Velden van de gegevens die deze versie niet kent (uit een nieuwere back-up): ongemoeid laten.
function unknownDetailFields(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const known = new Set<string>(['variant', 'shelter', 'strengthTargets', ...DETAIL_NUMBERS]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) if (!known.has(k)) out[k] = v;
  return Object.keys(out).length > 0 ? out : undefined;
}

// Een lijst doelen. Alleen het hoofddoel (het doel met mijlpalen dat mainGoal aanwijst, eerst een
// actief, anders een niet gearchiveerd) wordt een tocht met priority top. De andere doelen krijgen
// hun belangrijkheid uit hun rol. `ladderKnown: false` voor een back-up zonder mijlpalenlijst.
export function migrateTrainingGoals(
  goals: readonly TrainingGoal[],
  ladderGoalIds: ReadonlySet<string>,
  plan: Pick<RoutePlan, 'choices'> | null | undefined,
  opts: { ladderKnown?: boolean } = {},
): TrainingGoal[] {
  const tent = routePlanUsesTent(plan);
  const main = mainGoal(goals, ladderGoalIds, 'activeFirst');
  const ladderUnknown = opts.ladderKnown === false && ladderGoalIds.size === 0;
  return goals.map((g) => migrateTrainingGoal(g, { isMain: main?.id === g.id, tent, ...(ladderUnknown ? { ladderUnknown } : {}) }));
}
