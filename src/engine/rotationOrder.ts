// ASCEND — keep a split's sessions in their own order within a week.
//
// Production feedback: "waarom plant hij upper b voor a?". Upper A and
// Upper B have the same type, duration and load profile, so for every
// placement rule (time per day, pairing, load spacing) they are
// interchangeable and the placement search has no reason to prefer A
// before B. A training split does: A, then B, the way the external workout
// app (MacroFactor's Day Order) runs it too. This only ever swaps DATES
// between such interchangeable sessions, so a placement that was valid
// stays exactly as valid and costs exactly the same.

import type { SessionTemplate } from '../models/training';
import { resolveEffectiveStressProfile } from './stressProfile';

export interface DatedPlacement {
  sessionOrDraft: string;
  date: string;
}

export function interchangeKey(template: SessionTemplate): string {
  return JSON.stringify([template.type, template.durationVariants.full, resolveEffectiveStressProfile(template)]);
}

// A before B: the default weekday the template was designed for, then its
// name ("Upper A" < "Upper B", "Dag 2" < "Dag 10").
export function compareRotation(a: SessionTemplate, b: SessionTemplate): number {
  return (a.defaultDayOfWeek ?? 99) - (b.defaultDayOfWeek ?? 99) || a.name.localeCompare(b.name, 'nl', { numeric: true }) || a.id.localeCompare(b.id);
}

export function orderRotation(placements: DatedPlacement[], templateOf: (key: string) => SessionTemplate | undefined): DatedPlacement[] {
  const groups = new Map<string, DatedPlacement[]>();
  for (const p of placements) {
    const template = templateOf(p.sessionOrDraft);
    if (!template) continue;
    const key = interchangeKey(template);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const newDate = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const dates = group.map((p) => p.date).sort();
    const ordered = [...group].sort((a, b) => compareRotation(templateOf(a.sessionOrDraft)!, templateOf(b.sessionOrDraft)!) || a.date.localeCompare(b.date));
    ordered.forEach((p, i) => newDate.set(p.sessionOrDraft, dates[i]));
  }
  return placements.map((p) => ({ ...p, date: newDate.get(p.sessionOrDraft) ?? p.date }));
}
