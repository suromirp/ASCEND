// ASCEND: periods you are free or away (production feedback: "het moet
// mogelijk zijn om een soort vakantie te plannen in de app, dat je dus kan
// plannen dat je vrije dagen hebt"). Three kinds, all deterministic:
//
// - free_days: extra days you have time. Nothing is taken out. The planner
//   may put a long walk on such a day when the week stays within the rules
//   (engine/leaveBlock.ts).
// - no_training: a holiday without training. No training is planned on these
//   days. What was planned there moves to another day of that week or is let
//   go, by the same week check as everything else (engine/weekValidator.ts,
//   rule LEAVE-OFF).
// - trek: a block of walking days with a backpack. Every day is a mountain
//   hike; the day before and the day after stay light (rule LEAVE-LIGHT).
//
// A period is a fact about your calendar. It is stored on its own and never
// changes the planning by itself: adding or removing one produces a proposal
// with Akkoord (engine/leaveProposal.ts). History, logged and past sessions
// and what you locked yourself are never touched.
//
// Pure: no React, no IndexedDB.

import type { LeaveKind, LeavePeriod, TrekDetails } from '../models/leave';
import { trekLightDaysBefore } from './trekTaper';
import { addDays, daysBetween, formatDateNL, weekdayShortNL } from '../utils/dates';

export const LEAVE_KINDS: LeaveKind[] = ['no_training', 'trek', 'free_days'];

export const LEAVE_KIND_LABEL: Record<LeaveKind, string> = {
  free_days: 'Vrije dagen',
  no_training: 'Vakantie zonder training',
  trek: 'Tocht met rugzak',
};

// Short, for the band in the week and the list.
export const LEAVE_KIND_SHORT: Record<LeaveKind, string> = {
  free_days: 'Vrije dag',
  no_training: 'Vakantie',
  trek: 'Tochtdag',
};

export const LEAVE_KIND_HINT: Record<LeaveKind, string> = {
  no_training: 'Geen training op deze dagen. Wat er stond, schuift naar een andere dag of vervalt.',
  trek: 'Een tocht van meerdere dagen met je rugzak. Elke dag is een wandeldag. De dag ervoor en erna blijft licht.',
  free_days: 'Je hebt extra tijd. Er gaat niets uit je planning. Past er een lange wandeling, dan stelt ASCEND die voor.',
};

const MAX_DAYS = 90;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isLeaveKind(v: unknown): v is LeaveKind {
  return v === 'free_days' || v === 'no_training' || v === 'trek';
}

// A stored or imported record is only used when it is complete and sane;
// anything else is dropped by the caller (storage/backup.ts counts it).
export function isLeavePeriod(v: unknown): v is LeavePeriod {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === 'string' && p.id.length > 0 &&
    isLeaveKind(p.kind) &&
    typeof p.startDate === 'string' && DATE_RE.test(p.startDate) &&
    typeof p.endDate === 'string' && DATE_RE.test(p.endDate) &&
    p.endDate >= p.startDate &&
    (p.note === undefined || typeof p.note === 'string') &&
    (p.trek === undefined || isTrekDetails(p.trek))
  );
}

export function isTrekDetails(v: unknown): v is TrekDetails {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.name === 'string' && t.name.trim().length > 0 &&
    (t.terrain === 'flat_trail' || t.terrain === 'uneven_trail' || t.terrain === 'mountain' || t.terrain === 'snow') &&
    (t.packKg === undefined || (typeof t.packKg === 'number' && Number.isFinite(t.packKg) && t.packKg >= 0)) &&
    typeof t.tent === 'boolean' &&
    (t.importance === 'training' || t.importance === 'goal')
  );
}

export function sortPeriods(periods: LeavePeriod[]): LeavePeriod[] {
  return [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
}

export function dayCount(p: Pick<LeavePeriod, 'startDate' | 'endDate'>): number {
  return daysBetween(p.startDate, p.endDate) + 1;
}

export function periodDates(p: Pick<LeavePeriod, 'startDate' | 'endDate'>): string[] {
  const n = Math.min(Math.max(dayCount(p), 0), MAX_DAYS * 2);
  return Array.from({ length: n }, (_, i) => addDays(p.startDate, i));
}

// What you may fill in. Returns the message to show, or nothing when fine.
export function validateLeaveDraft(draft: { kind?: LeaveKind; startDate?: string; endDate?: string }, today: string): string | undefined {
  if (!draft.kind) return 'Kies de soort periode.';
  if (!draft.startDate || !draft.endDate || !DATE_RE.test(draft.startDate) || !DATE_RE.test(draft.endDate)) return 'Kies een begin- en einddatum.';
  if (draft.endDate < draft.startDate) return 'De einddatum ligt voor de begindatum.';
  if (draft.endDate < today) return 'Deze periode is al voorbij.';
  if (dayCount({ startDate: draft.startDate, endDate: draft.endDate }) > MAX_DAYS) return `Langer dan ${MAX_DAYS} dagen? Controleer de datums.`;
  return undefined;
}

// --- which day is what ----------------------------------------------------------
// 'off': no training. 'trek': a walking day. 'free': extra time. Where periods
// overlap the strictest wins: a holiday without training beats a trek, a trek
// beats free days.
export type LeaveDayKind = 'off' | 'trek' | 'free';
export interface LeaveDay {
  kind: LeaveDayKind;
  period: LeavePeriod;
}
const RANK: Record<LeaveDayKind, number> = { off: 3, trek: 2, free: 1 };
const DAY_KIND: Record<LeaveKind, LeaveDayKind> = { no_training: 'off', trek: 'trek', free_days: 'free' };

export function leaveDays(periods: LeavePeriod[] | undefined): Map<string, LeaveDay> {
  const map = new Map<string, LeaveDay>();
  for (const period of sortPeriods(periods ?? [])) {
    const kind = DAY_KIND[period.kind];
    for (const date of periodDates(period)) {
      const was = map.get(date);
      if (!was || RANK[kind] > RANK[was.kind]) map.set(date, { kind, period });
    }
  }
  return map;
}

// The days before and the day after a trek: light, unless that day is itself
// a holiday or a walking day. Before a tocht you want to be fresh for there
// are more light days (engine/trekTaper.ts); the day after is always one.
export interface LightDay { period: LeavePeriod; side: 'before' | 'after'; // Days from the light day to the tocht (before) or from the tocht (after).
  distance: number }

export function lightDays(periods: LeavePeriod[] | undefined, days: Map<string, LeaveDay> = leaveDays(periods)): Map<string, LightDay> {
  const map = new Map<string, LightDay>();
  for (const period of periods ?? []) {
    if (period.kind !== 'trek') continue;
    const before = trekLightDaysBefore(dayCount(period), period.trek?.importance);
    const dates: [string, 'before' | 'after', number][] = [
      [addDays(period.endDate, 1), 'after', 1],
      ...Array.from({ length: before }, (_, i): [string, 'before' | 'after', number] => [addDays(period.startDate, -(i + 1)), 'before', i + 1]),
    ];
    for (const [date, side, distance] of dates) {
      const day = days.get(date);
      if (day && day.kind !== 'free') continue;
      if (!map.has(date)) map.set(date, { period, side, distance });
    }
  }
  return map;
}

// "De dag voor je tocht", "twee dagen voor je tocht": how far the light day is from the tocht.
const COUNT_WORD = ['', 'één', 'twee', 'drie', 'vier', 'vijf'];
export function lightDayTitle(side: 'before' | 'after', distance: number): string {
  if (side === 'after') return 'Dag na je tocht';
  if (distance <= 1) return 'Dag voor je tocht';
  const word = COUNT_WORD[distance] ?? String(distance);
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} dagen voor je tocht`;
}

// Nothing else may be planned on this day (a holiday or a walking day), e.g.
// by the weekly planning when it adds a training.
export function isLeaveBlockedDay(periods: LeavePeriod[] | undefined, date: string): boolean {
  const kind = leaveDays(periods).get(date)?.kind;
  return kind === 'off' || kind === 'trek';
}

// --- how it reads -----------------------------------------------------------------
export type LeaveLabelKind = LeaveDayKind | 'light';
export interface LeaveLabel {
  kind: LeaveLabelKind;
  title: string; // "Vakantie"
  line: string; // what it means for the day
  note?: string;
}

export function leaveLabelOn(date: string, periods: LeavePeriod[] | undefined): LeaveLabel | undefined {
  const days = leaveDays(periods);
  const day = days.get(date);
  if (day) {
    const note = day.period.note?.trim() || day.period.trek?.name || undefined;
    if (day.kind === 'off') return { kind: 'off', title: 'Vakantie', line: 'Geen training', note };
    if (day.kind === 'trek') return { kind: 'trek', title: 'Tochtdag', line: 'Wandelen met je rugzak', note };
    return { kind: 'free', title: 'Vrije dag', line: 'Extra tijd', note };
  }
  const light = lightDays(periods, days).get(date);
  if (light) {
    return { kind: 'light', title: lightDayTitle(light.side, light.distance), line: 'Houd het licht', note: light.period.note?.trim() || light.period.trek?.name || undefined };
  }
  return undefined;
}

const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const dayText = (iso: string, short = false) =>
  short ? `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))} ${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}` : `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;

// "ma 4 mei t/m wo 6 mei" or, for one day, "do 14 mei". `short`: "ma 4 mei" with
// the month in three letters, for a narrow line.
export function describePeriodDates(p: Pick<LeavePeriod, 'startDate' | 'endDate'>, short = false): string {
  return p.startDate === p.endDate ? dayText(p.startDate, short) : `${dayText(p.startDate, short)} t/m ${dayText(p.endDate, short)}`;
}

export function describeDayCount(p: Pick<LeavePeriod, 'startDate' | 'endDate'>): string {
  const n = dayCount(p);
  return `${n} ${n === 1 ? 'dag' : 'dagen'}`;
}

// The periods that touch a week (Monday as `weekStart`), in date order.
export function periodsInWeek(periods: LeavePeriod[] | undefined, weekStart: string): LeavePeriod[] {
  const end = addDays(weekStart, 6);
  return sortPeriods((periods ?? []).filter((p) => p.startDate <= end && p.endDate >= weekStart));
}
