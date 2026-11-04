// Migratiestappen voor lichaam, herstel en metingen: korte nacht, vermoeide
// benen, zweet, blessures, ochtendgetallen, 1RM, gewicht en wat speelde er.

import { isPlausibleFatPct } from '../engine/bodyFat';
import { isHealthConnectWeight } from '../engine/bodyWeight';
import { HC_MAX_KG, HC_MIN_KG } from '../engine/healthConnectWeight';
import type { NightJudgment, WeeklyHealthCheck } from '../models/checkIn';
import { MAX_LEG_EASE_DAYS, type LegEaseDay } from '../models/legEase';
import type { InjuryNote } from '../models/injury';
import type { SweatEntry, SweatPre } from '../models/sweat';
import type { AlcoholAmount, InfluenceEntry, InfluenceReason, InfluenceReasonNote } from '../models/influence';
import { AMOUNTS, MAX_LABEL_LENGTH, REASON_LABEL } from '../data/influenceReasons';
import type { ExternalOneRm, OneRmReading, RecoveryMetric, WeightEntry } from '../models/metrics';
import type { MetricSource } from '../models/training';
import { ISO_DAY, isObj, fin } from './migrationsShared';

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

// --- lichter bij vermoeide benen: settings.legEaseDays -----------------------------------
// Wat je koos op een dag met vermoeide benen (models/legEase.ts). Optioneel en additief, dus
// het schemanummer van de back-up verandert niet: een bestand van voor deze lijst heeft geen
// sleutel, en dat laat de keuzes op het toestel met rust. Een record zonder datum, training of
// geldige keuze valt weg en wordt geteld; een kapotte reden of index verliest alleen zichzelf.
// Per datum en training blijft de laatste staan, en de laatste MAX_LEG_EASE_DAYS blijven over.
const LEG_EASE_REASONS = ['spierpijn', 'flink', 'harde-loop', 'index'] as const;
export function migrateLegEaseDays(raw: unknown): { list: LegEaseDay[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byKey = new Map<string, LegEaseDay>();
  let skipped = 0;
  for (const item of raw) {
    const d = typeof item === 'object' && item !== null && !Array.isArray(item) ? (item as Record<string, unknown>) : undefined;
    if (!d || typeof d.date !== 'string' || !ISO_DAY.test(d.date.slice(0, 10)) || typeof d.plannedSessionId !== 'string' || d.plannedSessionId === '' || (d.choice !== 'lichter' && d.choice !== 'liever-niet')) {
      skipped++;
      continue;
    }
    const reasons = Array.isArray(d.reasons) ? d.reasons.filter((r): r is LegEaseDay['reasons'][number] => (LEG_EASE_REASONS as readonly unknown[]).includes(r)) : [];
    const index = typeof d.index === 'number' && Number.isFinite(d.index) && d.index >= 0 && d.index <= 200 ? Math.round(d.index * 10) / 10 : 0;
    const at = typeof d.at === 'string' && !Number.isNaN(Date.parse(d.at)) ? d.at : `${d.date.slice(0, 10)}T00:00:00.000Z`;
    byKey.set(`${d.date.slice(0, 10)}|${d.plannedSessionId}`, { date: d.date.slice(0, 10), plannedSessionId: d.plannedSessionId, choice: d.choice, reasons, index, at });
  }
  const list = [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at)).slice(-MAX_LEG_EASE_DAYS);
  return { list, skipped };
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

// --- ochtendgetallen in de back-up (2026-10-31) ----------------------------------------
// `payload.mornings` is nieuw (engine/morningBackup.ts, docs/beslissingen/2026-10-31-kansen-stap-0.md):
// per ochtend de datum, rusthartslag, HRV, slaapduur en slaapscore. Optioneel en additief, dus
// het schemanummer blijft: een back-up van daarvoor heeft ze niet (undefined: "niet in deze
// back-up", het toestel houdt de eigen). Een ochtend met een datum die niet klopt of zonder een
// geldig getal valt weg en wordt geteld; een getal buiten wat een lichaam kan valt alleen zelf weg,
// met dezelfde grenzen als bij het ophalen (integrations/intervalsIcu.ts#mapIntervalsWellnessRecord).
const MORNING_SOURCES: readonly MetricSource[] = ['manual', 'garmin', 'health-connect', 'macrofactor', 'import'];
const MORNING_LIMITS = { restingHeartRate: [25, 150], hrv: [1, 400], sleepMinutes: [10, 20 * 60], sleepScore: [0, 100] } as const;

export function migrateMornings(raw: unknown): { list: RecoveryMetric[] | undefined; skipped: number } {
  if (raw === undefined || raw === null) return { list: undefined, skipped: 0 };
  if (!Array.isArray(raw)) return { list: undefined, skipped: 1 };
  const byId = new Map<string, RecoveryMetric>();
  let skipped = 0;
  for (const item of raw) {
    const r = item as Record<string, unknown> | null;
    if (!r || typeof r !== 'object' || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
      skipped++;
      continue;
    }
    const source = MORNING_SOURCES.includes(r.source as MetricSource) ? (r.source as MetricSource) : 'import';
    // Zonder id een id uit de eigen bron, zodat een ochtend die je zelf invulde nooit voor een
    // opgehaalde van intervals.icu doorgaat (die herken je aan "intervals.icu:").
    const id = typeof r.id === 'string' && r.id.length > 0 ? r.id : `${source}:${r.date}`;
    const metric: RecoveryMetric = { id, date: r.date, source };
    for (const key of Object.keys(MORNING_LIMITS) as (keyof typeof MORNING_LIMITS)[]) {
      const v = r[key];
      const [min, max] = MORNING_LIMITS[key];
      if (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max) metric[key] = v;
    }
    if (Object.keys(metric).length === 3) {
      skipped++;
      continue;
    }
    byId.set(id, metric);
  }
  return { list: [...byId.values()], skipped };
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
//
// Since 4 Nov 2026 a weighing from Health Connect (`source: 'health-connect'`) may stand
// next to your own or MacroFactor's weight of the same day: one per day and place
// (engine/bodyWeight.ts#sameWeightPlace, docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md).
// A file from before has at most one per day and reads as it did. Two for the same day and
// place (a damaged or hand-edited file) become one, the last in the file, and the other is
// counted. A weighing from Health Connect outside 30 to 250 kg is dropped and counted, the
// same limits as when it is read.
export function migrateWeightEntries(entries: WeightEntry[]): { entries: WeightEntry[]; skipped: number } {
  let skipped = 0;
  const byPlace = new Map<string, WeightEntry>();
  for (const e of entries) {
    const hc = isHealthConnectWeight(e);
    if (hc && !(e.kg >= HC_MIN_KG && e.kg <= HC_MAX_KG)) {
      skipped++;
      continue;
    }
    let clean = e;
    if ('fatPct' in e && !isPlausibleFatPct(e.fatPct)) {
      skipped++;
      clean = { ...e };
      delete clean.fatPct;
    }
    const place = `${e.date}|${hc ? 'hc' : 'own'}`;
    // The last one wins, on the place of the first.
    if (byPlace.has(place)) skipped++;
    byPlace.set(place, clean);
  }
  return { entries: [...byPlace.values()], skipped };
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
