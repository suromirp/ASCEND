// Back-up terugzetten: wat elke categorie kan, en hoe lijsten en instellingen
// worden samengevoegd.

import type { AppSettings } from './database';
import { mergeIntentions } from '../engine/weeklyQuestion';
import { MAX_JUDGMENTS } from '../engine/shortNight';
import { MAX_LEG_EASE_DAYS } from '../models/legEase';
import { mergeSweatEntries } from '../engine/sweat';
import { mergeTestJudgments } from '../engine/testJudgment';
import { dedupeInfluencesByPlace } from './migrations';
import { mergeExternalOneRm } from '../engine/externalOneRm';
import { mergeJourneyState } from '../engine/journey';
import { isHealthConnectWeight } from '../engine/bodyWeight';
import type { WeightEntry } from '../models/metrics';
import type { BackupDataCategory, CategoryAction, ImportMode, PlanPolicy, ImportConflict } from './backupTypes';

// --- category action support & defaults --------------------------------------

// Not every action makes sense for every category (v0.3.2 §Conflict & Merge
// Semantics) — planned_schedule in particular is governed by the separate
// PlanPolicy question below, never a free 4-way choice, since "merge two
// schedules" has no coherent meaning for a single-device local app.
// Training history has no 'replace': logs are append-only (CLAUDE.md), so
// no import may ever delete one. Restoring an older backup adds what's
// missing and keeps everything logged since.
export const CATEGORY_SUPPORTED_ACTIONS: Record<BackupDataCategory, CategoryAction[]> = {
  program_and_templates: ['keep_current', 'merge', 'replace'],
  training_history: ['keep_current', 'merge', 'ignore'],
  planned_schedule: ['keep_current', 'replace'],
  objectives_and_milestones: ['keep_current', 'merge', 'replace'],
  capability_evidence: ['keep_current', 'merge', 'replace', 'ignore'],
  injuries: ['keep_current', 'merge', 'replace', 'ignore'],
  app_settings: ['keep_current', 'replace'],
};

// Mode B (merge) deliberately omits planned_schedule entirely — the schedule
// is only ever touched via the separate PlanPolicy answer, never a bare
// category default. Mode C (custom) starts from the same sensible base as
// merge, since a blank slate of choices is worse UX than a reasonable
// starting point the user then tweaks.
export function defaultActionsForMode(mode: ImportMode): Partial<Record<BackupDataCategory, CategoryAction>> {
  if (mode === 'full_restore') {
    return {
      program_and_templates: 'replace',
      training_history: 'merge',
      planned_schedule: 'replace',
      objectives_and_milestones: 'replace',
      capability_evidence: 'replace',
      injuries: 'replace',
      app_settings: 'replace',
    };
  }
  // merge and custom
  return {
    program_and_templates: 'merge',
    training_history: 'merge',
    objectives_and_milestones: 'merge',
    capability_evidence: 'merge',
    injuries: 'merge',
    app_settings: 'keep_current',
  };
}

export function defaultPlanPolicyForMode(mode: ImportMode): PlanPolicy {
  return mode === 'full_restore' ? 'restore_backup_plan' : 'keep_current_plan';
}

// --- generic list-category resolution ----------------------------------------

export interface Keyed {
  id: string;
}

export interface ResolvedListCategory<T> {
  final: T[];
  toAdd: number;
  toReplace: number;
  toSkipDuplicate: number;
  toRemove: number;
  conflicts: ImportConflict[];
}

export function shallowEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// allowReplaceOverwrite=false means a merge conflict (same id, different
// content) is surfaced rather than silently applied — the append-only
// guarantee CLAUDE.md calls out for SessionLog/MilestoneProgress. Mutable
// categories (InjuryNote) pass true: a backup's newer version of the same
// record (e.g. a resolvedDate added since) is expected to win.
export function resolveListCategory<T extends Keyed>(
  action: CategoryAction,
  incoming: T[],
  current: T[],
  allowReplaceOverwrite: boolean,
): ResolvedListCategory<T> {
  if (action === 'keep_current' || action === 'ignore') {
    return { final: current, toAdd: 0, toReplace: 0, toSkipDuplicate: 0, toRemove: 0, conflicts: [] };
  }
  const currentById = new Map(current.map((c) => [c.id, c]));
  if (action === 'replace') {
    const incomingIds = new Set(incoming.map((i) => i.id));
    let toAdd = 0;
    let toReplace = 0;
    let toSkipDuplicate = 0;
    for (const inc of incoming) {
      const existing = currentById.get(inc.id);
      if (!existing) toAdd++;
      else if (shallowEqual(existing, inc)) toSkipDuplicate++;
      else toReplace++;
    }
    const toRemove = current.filter((c) => !incomingIds.has(c.id)).length;
    return { final: incoming, toAdd, toReplace, toSkipDuplicate, toRemove, conflicts: [] };
  }

  // merge
  const final = [...current];
  const indexById = new Map(current.map((c, i) => [c.id, i]));
  let toAdd = 0;
  let toReplace = 0;
  let toSkipDuplicate = 0;
  const conflicts: ImportConflict[] = [];

  for (const inc of incoming) {
    const existingIndex = indexById.get(inc.id);
    if (existingIndex === undefined) {
      final.push(inc);
      toAdd++;
      continue;
    }
    const existing = final[existingIndex];
    if (shallowEqual(existing, inc)) {
      toSkipDuplicate++;
      continue;
    }
    if (allowReplaceOverwrite) {
      final[existingIndex] = inc;
      toReplace++;
    } else {
      conflicts.push({
        id: inc.id,
        reason: 'Bestaand record met dit id verschilt van de back-up en wordt niet overschreven (geschiedenis wordt nooit herschreven).',
      });
    }
  }

  return { final, toAdd, toReplace, toSkipDuplicate, toRemove: 0, conflicts };
}

// Lists that live inside AppSettings but are history, not preferences:
// restoring settings must never drop a weigh-in or an illness episode the
// device has and the backup doesn't. Union, the device's own record wins.
export function mergeSettingsHistory(current: AppSettings, incoming: Partial<AppSettings>): Partial<AppSettings> {
  const merged: Partial<AppSettings> = { ...incoming };
  if (incoming.weightEntries || current.weightEntries) {
    // Per day and place: a weighing from Health Connect has its own place next to your own or
    // MacroFactor's (engine/bodyWeight.ts#sameWeightPlace).
    const placeOf = (e: WeightEntry) => `${e.date}|${isHealthConnectWeight(e) ? 'hc' : 'own'}`;
    const byDate = new Map((incoming.weightEntries ?? []).map((e) => [placeOf(e), e]));
    for (const e of current.weightEntries ?? []) {
      // The device's own record wins, but a fat percentage only the backup has is added to it.
      const fromBackup = byDate.get(placeOf(e));
      byDate.set(placeOf(e), e.fatPct === undefined && fromBackup?.fatPct !== undefined ? { ...e, fatPct: fromBackup.fatPct } : e);
    }
    merged.weightEntries = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  // The 1RM from MacroFactor is history too: per exercise and day the union,
  // the device's own reading wins.
  if (incoming.externalOneRm || current.externalOneRm) {
    merged.externalOneRm = mergeExternalOneRm(incoming.externalOneRm, current.externalOneRm ?? []);
  }
  // Je eigen sporten: per type samengevoegd, de keuze op dit toestel gaat voor.
  if (incoming.customSports || current.customSports) {
    const byType = new Map((incoming.customSports ?? []).map((c) => [c.type, c]));
    for (const c of current.customSports ?? []) byType.set(c.type, c);
    merged.customSports = [...byType.values()];
  }
  // Sporten die meetellen: per sport samengevoegd, de keuze op dit toestel gaat voor.
  if (incoming.sportHandling || current.sportHandling) {
    merged.sportHandling = { ...(incoming.sportHandling ?? {}), ...(current.sportHandling ?? {}) };
  }
  if (incoming.illnessEpisodes || current.illnessEpisodes) {
    const byId = new Map((incoming.illnessEpisodes ?? []).map((e) => [e.id, e]));
    for (const e of current.illnessEpisodes ?? []) byId.set(e.id, e);
    merged.illnessEpisodes = [...byId.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }
  // Free days, holidays and treks: planned sessions on the device carry a
  // marker of the period that moved them, so a period is never dropped by a
  // settings restore (it could no longer be removed to put them back).
  // Union, the device's own period wins.
  if (incoming.leavePeriods || current.leavePeriods) {
    const byId = new Map((incoming.leavePeriods ?? []).map((p) => [p.id, p]));
    for (const p of current.leavePeriods ?? []) byId.set(p.id, p);
    merged.leavePeriods = [...byId.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }
  // Verdicts on short nights are history too: the union, the device's own wins, cut to
  // the newest MAX_JUDGMENTS like the list is on the device. A restore brings back a
  // verdict you undid on this device (the same pattern as weightEntries).
  if (incoming.nightJudgments || current.nightJudgments) {
    const byDate = new Map((incoming.nightJudgments ?? []).map((j) => [j.date, j]));
    for (const j of current.nightJudgments ?? []) byDate.set(j.date, j);
    merged.nightJudgments = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_JUDGMENTS);
  }
  // What you chose on days with tired legs: the union per date and training, the device's own wins.
  if (incoming.legEaseDays || current.legEaseDays) {
    const byKey = new Map((incoming.legEaseDays ?? []).map((d) => [`${d.date}|${d.plannedSessionId}`, d]));
    for (const d of current.legEaseDays ?? []) byKey.set(`${d.date}|${d.plannedSessionId}`, d);
    merged.legEaseDays = [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at)).slice(-MAX_LEG_EASE_DAYS);
  }
  // Verdicts on test runs: the union per log, the device's own wins.
  if (incoming.testJudgments || current.testJudgments) {
    merged.testJudgments = mergeTestJudgments(incoming.testJudgments, current.testJudgments);
  }
  // Weighings for sweat loss are history too: the union per id, the device's own wins, one
  // per training (engine/sweat.ts#mergeSweatEntries).
  if (incoming.sweatEntries || current.sweatEntries) {
    merged.sweatEntries = mergeSweatEntries(current.sweatEntries, incoming.sweatEntries);
  }
  // A weight from before a training is a draft: the union per day, the device's own wins.
  if (incoming.sweatPre || current.sweatPre) {
    const byDate = new Map((incoming.sweatPre ?? []).map((p) => [p.date, p]));
    for (const p of current.sweatPre ?? []) byDate.set(p.date, p);
    merged.sweatPre = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  // Notes of "Wat speelde er" are history too: the union per id, the newest updatedAt
  // wins and on a tie the device does. A note you removed on this device comes back
  // with a restore, like a verdict on a night.
  if (incoming.influences || current.influences) {
    const byId = new Map((incoming.influences ?? []).map((e) => [e.id, e]));
    for (const e of current.influences ?? []) {
      const theirs = byId.get(e.id);
      if (!theirs || e.updatedAt >= theirs.updatedAt) byId.set(e.id, e);
    }
    merged.influences = dedupeInfluencesByPlace([...byId.values()]).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }
  // Ticked-off journey tasks are history too: the union, the device wins.
  if (incoming.journey || current.journey) merged.journey = mergeJourneyState(current.journey, incoming.journey);
  if (incoming.weeklyIntentions || current.weeklyIntentions) {
    merged.weeklyIntentions = mergeIntentions(incoming.weeklyIntentions, current.weeklyIntentions);
  }
  return merged;
}
