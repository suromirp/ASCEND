// Migratiestappen voor de planning: vrije dagen en vakanties, de eigen week,
// voorstellen, richting, weekbudget en golven.

import type { PlanChangeProposal } from '../models/planChange';
import type { AppSettings } from './database';
import { isLeavePeriod, isTrekDetails, isTrekHeight } from '../engine/leave';
import { parseTrekPlace } from '../engine/trek';
import { parseWeekShape, type WeekShape } from '../engine/sports';
import { parseDirection, parseDirectionStart } from '../engine/direction';
import { resolveWeekBudget } from '../engine/weekBudget';
import type { LeavePeriod } from '../models/leave';
import { isRecord } from '../utils/guards';
import { isNoGymDetails } from '../engine/noGymDetails';

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
  // A period without a gym (`no_gym`, 9 november) is new and additive in the same way: an older
  // file has none and reads as before. Damaged choices are dropped and counted; the period stays
  // and reads as the advice (engine/noGymDetails.ts#resolveNoGym).
  const valid = raw.filter((p) => isLeavePeriod(p) || (isRecord(p) && isLeavePeriod({ ...p, trek: undefined, noGym: undefined })));
  // Damaged details are lost, so they are counted: you hear that they are gone.
  let lostDetails = 0;
  const periods = valid.map((p) => {
    const rec = p as LeavePeriod;
    const trek = isTrekDetails(rec.trek) ? rec.trek : undefined;
    if (rec.trek !== undefined && !trek) lostDetails++;
    // Een kapot hoogste punt valt weg en telt mee; de tocht zelf blijft.
    const height = trek?.highestM;
    if (height !== undefined && !(isTrekHeight(height) && (trek?.terrain === 'mountain' || trek?.terrain === 'snow'))) lostDetails++;
    // Een kapotte eigen plek voor het bergweer valt weg en telt mee; de tocht zelf blijft.
    const place = parseTrekPlace(trek?.place);
    // Choices only on a period without a gym; a damaged one falls away and is counted.
    const noGym = rec.kind === 'no_gym' && isNoGymDetails(rec.noGym) ? rec.noGym : undefined;
    if (rec.kind === 'no_gym' && rec.noGym !== undefined && !noGym) lostDetails++;
    if (trek?.place !== undefined && !(place && (trek.terrain === 'mountain' || trek.terrain === 'snow'))) lostDetails++;
    return {
      id: rec.id, kind: rec.kind, startDate: rec.startDate, endDate: rec.endDate,
      ...(rec.note ? { note: rec.note } : {}),
      ...(noGym ? { noGym: { amount: noGym.amount, strength: noGym.strength, hills: noGym.hills } } : {}),
      ...(trek ? { trek: { name: trek.name.trim(), terrain: trek.terrain, ...(trek.packKg ? { packKg: trek.packKg } : {}), ...(isTrekHeight(trek.highestM) && (trek.terrain === 'mountain' || trek.terrain === 'snow') ? { highestM: Math.round(trek.highestM) } : {}), ...(place && (trek.terrain === 'mountain' || trek.terrain === 'snow') ? { place } : {}), tent: trek.tent, importance: trek.importance } } : {}),
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

// Een voorstel dat ASCEND samenvatte (engine/proposalTidy.ts) heeft `summarizedAt` en
// `changeCount`. Een oudere back-up heeft ze niet en blijft zoals hij is. Staan ze er in een
// vorm die niet klopt, dan vallen alleen die velden weg; het voorstel blijft. Zonder lijst met
// wijzigingen of andere keuzes krijgt het een lege lijst, zodat elke lezer het kan lezen.
export function migratePlanChangeProposal(p: PlanChangeProposal): PlanChangeProposal {
  const okStamp = p.summarizedAt === undefined || typeof p.summarizedAt === 'string';
  const okCount = p.changeCount === undefined || (typeof p.changeCount === 'number' && Number.isInteger(p.changeCount) && p.changeCount >= 0);
  const okLists = Array.isArray(p.changes) && Array.isArray(p.alternatives);
  if (okStamp && okCount && okLists) return p;
  const next: PlanChangeProposal = { ...p, changes: Array.isArray(p.changes) ? p.changes : [], alternatives: Array.isArray(p.alternatives) ? p.alternatives : [] };
  if (!okStamp) delete next.summarizedAt;
  if (!okCount) delete next.changeCount;
  return next;
}

// --- zonder doel: richting, start en weekbudget (optionele instellingen) ------------
// `settings.direction`, `settings.directionStart` en `settings.weekBudget` zijn optioneel en
// additief: een back-up van voor deze instellingen heeft ze niet en blijft zoals hij is. Staat
// er wel iets, dan blijft alleen een bekende waarde over; de rest wordt weggelaten en geteld.
// Een richting zonder geldige startmaandag houdt de richting en laat de start weg: de golf
// begint dan bij de eerstvolgende keuze.
export function migrateDirection(raw: { direction?: unknown; directionStart?: unknown; weekBudget?: unknown }): {
  value: { direction?: NonNullable<AppSettings['direction']>; directionStart?: string; weekBudget?: NonNullable<AppSettings['weekBudget']> };
  skipped: number;
} {
  const value: { direction?: NonNullable<AppSettings['direction']>; directionStart?: string; weekBudget?: NonNullable<AppSettings['weekBudget']> } = {};
  let skipped = 0;
  if (raw.direction !== undefined) {
    const direction = parseDirection(raw.direction);
    if (direction) value.direction = direction;
    else skipped++;
  }
  if (raw.directionStart !== undefined) {
    const start = parseDirectionStart(raw.directionStart);
    if (start && value.direction) value.directionStart = start;
    else skipped++;
  }
  if (raw.weekBudget !== undefined) {
    const input = (raw.weekBudget && typeof raw.weekBudget === 'object' && !Array.isArray(raw.weekBudget) ? raw.weekBudget : undefined) as Record<string, unknown> | undefined;
    const clean = resolveWeekBudget(raw.weekBudget);
    const kept: NonNullable<AppSettings['weekBudget']> = {
      ...(clean.minutes !== undefined ? { minutes: clean.minutes } : {}),
      ...(clean.strength !== undefined ? { strength: clean.strength } : {}),
      ...(clean.doubleHard ? {} : { doubleHard: false }),
    };
    // Wat er stond maar niet bleef (een onzinnige waarde, of geen object) telt als weggelaten.
    if (!input) skipped++;
    else {
      if (input.minutes !== undefined && clean.minutes === undefined) skipped++;
      if (input.strength !== undefined && clean.strength === undefined) skipped++;
      if (input.doubleHard !== undefined && typeof input.doubleHard !== 'boolean') skipped++;
    }
    if (Object.keys(kept).length > 0) value.weekBudget = kept;
  }
  return { value, skipped };
}

// Zonder doel, de keuzes rond golven (docs/beslissingen/2026-10-31-zonder-doel-beginnersstart.md):
// alleen bekende waarden blijven over; wat ontbreekt is het advies. Een oud bestand zonder deze velden
// importeert zoals het was, dus het schemanummer blijft staan.
type WaveSettingsValue = { beginnerStart?: 'auto' | 'ja' | 'nee'; waves?: { length?: 3 | 6; lightWeek?: false; review?: false; weeksForStep?: number }; waveReviewDone?: string; noGoalWaves?: 'agreed' };
export function migrateWaveSettings(raw: { beginnerStart?: unknown; waves?: unknown; waveReviewDone?: unknown; noGoalWaves?: unknown }): { value: WaveSettingsValue; skipped: number } {
  const value: WaveSettingsValue = {};
  let skipped = 0;
  if (raw.beginnerStart !== undefined) {
    const known = (['auto', 'ja', 'nee'] as const).find((c) => c === raw.beginnerStart);
    if (known) value.beginnerStart = known;
    else skipped++;
  }
  if (raw.waves !== undefined) {
    const w = raw.waves && typeof raw.waves === 'object' && !Array.isArray(raw.waves) ? (raw.waves as Record<string, unknown>) : undefined;
    if (!w) skipped++;
    else {
      const length = ([3, 6] as const).find((n) => n === w.length);
      if (w.length !== undefined && w.length !== 4 && !length) skipped++;
      if (w.lightWeek !== undefined && w.lightWeek !== false && w.lightWeek !== true) skipped++;
      if (w.review !== undefined && w.review !== false && w.review !== true) skipped++;
      const step = typeof w.weeksForStep === 'number' && Number.isInteger(w.weeksForStep) && w.weeksForStep >= 1 && w.weeksForStep <= 6 ? w.weeksForStep : undefined;
      if (w.weeksForStep !== undefined && step === undefined) skipped++;
      const kept = {
        ...(length ? { length } : {}), ...(w.lightWeek === false ? { lightWeek: false as const } : {}),
        ...(w.review === false ? { review: false as const } : {}), ...(step !== undefined && step !== 3 ? { weeksForStep: step } : {}),
      };
      if (Object.keys(kept).length > 0) value.waves = kept;
    }
  }
  if (raw.waveReviewDone !== undefined) {
    const monday = typeof raw.waveReviewDone === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.waveReviewDone) ? raw.waveReviewDone : undefined;
    if (monday) value.waveReviewDone = monday;
    else skipped++;
  }
  // Het Akkoord op neutrale golven (engine/noGoalWaves.ts): alleen 'agreed' blijft. Een oud bestand
  // zonder dit veld houdt bij import zijn plan zoals het is, tot je Akkoord geeft.
  if (raw.noGoalWaves !== undefined) {
    if (raw.noGoalWaves === 'agreed') value.noGoalWaves = 'agreed';
    else skipped++;
  }
  return { value, skipped };
}
