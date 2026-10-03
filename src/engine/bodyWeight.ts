// ASCEND — body weight, roughly (production feedback: "als het gewoon
// ongeveer is, is het goed [...] om de twee weken"). Used only where it
// matters: pack weight as a share of body weight, protein per kg. One
// trend-weight entry about every two weeks is plenty.

import type { WeightEntry } from '../models/metrics';
import { addDays, daysBetween } from '../utils/dates';

export const WEIGHT_REMINDER_DAYS = 14;
const SNOOZE_DAYS = 3;

export function latestWeight(entries: WeightEntry[] | undefined): WeightEntry | undefined {
  return [...(entries ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];
}

// Time for a new entry: none yet, or the last one is two weeks old, and
// not snoozed in the last few days.
// The interval is a setting (AppSettings.weightReminderDays; 0 = never).
export function weightDue(entries: WeightEntry[] | undefined, snoozedAt: string | undefined, asOf: string, reminderDays: number = WEIGHT_REMINDER_DAYS): boolean {
  if (reminderDays <= 0) return false;
  if (snoozedAt && asOf < addDays(snoozedAt, SNOOZE_DAYS)) return false;
  const last = latestWeight(entries);
  return !last || daysBetween(last.date, asOf) >= reminderDays;
}

// One entry per day: a second entry the same day replaces the first.
export function addWeightEntry(entries: WeightEntry[] | undefined, entry: WeightEntry): WeightEntry[] {
  return [...(entries ?? []).filter((e) => e.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date));
}

// "12 kg is 15% van je gewicht"; undefined without a weight.
export function packSharePct(packKg: number, entries: WeightEntry[] | undefined): number | undefined {
  const last = latestWeight(entries);
  return last && last.kg > 0 ? Math.round((packKg / last.kg) * 100) : undefined;
}
