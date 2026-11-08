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

// Een weging uit Health Connect heeft een eigen plek naast wat je zelf invulde of uit MacroFactor
// inlas (docs/beslissingen/2026-11-04-gewicht-uit-health-connect.md): per dag hoogstens één van elk.
export const isHealthConnectWeight = (e: Pick<WeightEntry, 'source'>): boolean => e.source === 'health-connect';
const sameWeightPlace = (a: Pick<WeightEntry, 'date' | 'source'>, b: Pick<WeightEntry, 'date' | 'source'>): boolean => a.date === b.date && isHealthConnectWeight(a) === isHealthConnectWeight(b);

// One entry per day: a second entry the same day replaces the first. A weighing
// from Health Connect that day stays, on its own place.
export function addWeightEntry(entries: WeightEntry[] | undefined, entry: WeightEntry): WeightEntry[] {
  return [...(entries ?? []).filter((e) => !sameWeightPlace(e, entry)), entry].sort((a, b) => a.date.localeCompare(b.date));
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
// through this, so the switches count everywhere: "Gewicht uit MacroFactor"
// (AppSettings.weightFromMacroFactor) and "Gewicht uit Health Connect"
// (AppSettings.weightFromHealthConnect), both on unless set to false. The
// third argument is required on purpose: a caller that forgets the switch
// does not compile.
//
// Eén gewicht per dag, met een vaste voorrang: wat je zelf invulde of uit MacroFactor inlas gaat
// voor de weging uit Health Connect. Dat was een bewuste keuze van jou, en het trendgewicht van
// MacroFactor is rustiger dan één weging. Heeft de winnaar geen vetpercentage en de weging uit
// Health Connect van die dag wel, dan krijgt hij dat erbij.
export function weightsInUse(entries: WeightEntry[] | undefined, fromMacroFactor: boolean | undefined, fromHealthConnect: boolean | undefined): WeightEntry[] {
  const own = new Map<string, WeightEntry>();
  const linked = new Map<string, WeightEntry>();
  for (const e of entries ?? []) {
    if (fromMacroFactor === false && e.source === 'macrofactor') continue;
    if (fromHealthConnect === false && isHealthConnectWeight(e)) continue;
    (isHealthConnectWeight(e) ? linked : own).set(e.date, e);
  }
  const out: WeightEntry[] = [...own.values()].map((e) => {
    const other = linked.get(e.date);
    return e.fatPct === undefined && other?.fatPct !== undefined ? { ...e, fatPct: other.fatPct } : e;
  });
  for (const [date, e] of linked) if (!own.has(date)) out.push(e);
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// The one body weight for the leg index and the rucksack share: the latest
// entry in use. From MacroFactor that is the trend weight (see
// engine/macrofactorWeight.ts for why).
export function currentBodyKg(entries: WeightEntry[] | undefined, fromMacroFactor: boolean | undefined, fromHealthConnect: boolean | undefined): number | undefined {
  return latestWeight(weightsInUse(entries, fromMacroFactor, fromHealthConnect))?.kg;
}

export const MACROFACTOR_FRESH_DAYS = 14;

// The weight ASCEND currently uses, when it comes from MacroFactor or Health
// Connect and is from the last two weeks: then the question for a weight has
// no reason to be asked, and the app says where the number comes from instead.
export function freshLinkedWeight(entries: WeightEntry[] | undefined, fromMacroFactor: boolean | undefined, fromHealthConnect: boolean | undefined, asOf: string): WeightEntry | undefined {
  const last = latestWeight(weightsInUse(entries, fromMacroFactor, fromHealthConnect));
  return last && (last.source === 'macrofactor' || isHealthConnectWeight(last)) && daysBetween(last.date, asOf) <= MACROFACTOR_FRESH_DAYS ? last : undefined;
}

// Is there weight from Health Connect stored at all (switch on or off)?
export function hasHealthConnectWeight(entries: WeightEntry[] | undefined): boolean {
  return (entries ?? []).some(isHealthConnectWeight);
}

// Is there weight from MacroFactor stored at all (switch on or off)?
export function hasMacroFactorWeight(entries: WeightEntry[] | undefined): boolean {
  return (entries ?? []).some((e) => e.source === 'macrofactor');
}
