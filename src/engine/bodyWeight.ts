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
// The interval is a setting (AppSettings.weightReminderDays; 0 = never; 1 is
// every day, 2 every other day). "Niet nu" never waits longer than the interval
// itself, so a daily reminder is back tomorrow.
export function weightDue(entries: WeightEntry[] | undefined, snoozedAt: string | undefined, asOf: string, reminderDays: number = WEIGHT_REMINDER_DAYS): boolean {
  if (reminderDays <= 0) return false;
  if (snoozedAt && asOf < addDays(snoozedAt, Math.min(SNOOZE_DAYS, reminderDays))) return false;
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

// --- weight from MacroFactor ---------------------------------------------------------
//
// engine/macrofactorWeight.ts puts days from a MacroFactor export in the same
// list, with source 'macrofactor'. The switch "Gewicht uit MacroFactor
// gebruiken" (AppSettings.weightFromMacroFactor, on unless set to false) lets
// the user leave those out again without deleting them. packSharePct above
// reads the latest entry of the list it is handed; callers hand it
// weightsInUse(...).

// The entries the app reads. Every place that needs the body weight goes
// through this, so the switch counts everywhere.
export function weightsInUse(entries: WeightEntry[] | undefined, fromMacroFactor: boolean | undefined): WeightEntry[] {
  const all = entries ?? [];
  return fromMacroFactor === false ? all.filter((e) => e.source !== 'macrofactor') : all;
}

// The one body weight for the leg index and the rucksack share: the latest
// entry in use. From MacroFactor that is the trend weight (see
// engine/macrofactorWeight.ts for why).
export function currentBodyKg(entries: WeightEntry[] | undefined, fromMacroFactor: boolean | undefined): number | undefined {
  return latestWeight(weightsInUse(entries, fromMacroFactor))?.kg;
}

export const MACROFACTOR_FRESH_DAYS = 14;

// The weight ASCEND currently uses, when it comes from MacroFactor and is
// from the last two weeks: then the question for a weight has no reason to
// be asked, and the app says where the number comes from instead.
export function freshMacroFactorWeight(entries: WeightEntry[] | undefined, fromMacroFactor: boolean | undefined, asOf: string): WeightEntry | undefined {
  const last = latestWeight(weightsInUse(entries, fromMacroFactor));
  return last && last.source === 'macrofactor' && daysBetween(last.date, asOf) <= MACROFACTOR_FRESH_DAYS ? last : undefined;
}

// Is there weight from MacroFactor stored at all (switch on or off)?
export function hasMacroFactorWeight(entries: WeightEntry[] | undefined): boolean {
  return (entries ?? []).some((e) => e.source === 'macrofactor');
}
