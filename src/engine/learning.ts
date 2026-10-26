// ASCEND — learning from you, in two small, visible ways.
//
// 1. Proposals you keep turning down: the same kind of advice (one rule)
//    declined twice in a row within six weeks comes last, with a line that
//    says so. Never hidden, and never for what keeps you safe (pain, the
//    morning check, the spacing of heavy days): those always count.
// 2. The leg index against your legs: after a hard run or a test you say
//    how your legs felt at the warm-up; here that is held against what the
//    index said for that morning, so you can see how far to trust it.
//
// Pure: no React, no IndexedDB.

import type { Advice } from './adviceEngine';
import type { SessionLog, SessionTemplate } from '../models/training';
import { addDays } from '../utils/dates';
import { FATIGUE_THRESHOLDS, legFatigueOn } from './legFatigue';
import { hasRole } from './templateRoles';

// --- 1. proposals you turn down --------------------------------------------------
export interface StoredResponse {
  response: 'accepted' | 'declined';
  at: string;
  ruleId?: string;
}

const ALWAYS_COUNTS = new Set(['INJURY-LEGS', 'MORNING-CHECK', 'HARD-THEN-SPACE', 'SAME-MUSCLE-SPACING']);
const LOOKBACK_DAYS = 42;

export function declinedRules(responses: Record<string, StoredResponse>, today: string): Set<string> {
  const since = addDays(today, -LOOKBACK_DAYS);
  const byRule = new Map<string, StoredResponse[]>();
  for (const r of Object.values(responses)) {
    if (!r.ruleId || r.at.slice(0, 10) < since) continue;
    byRule.set(r.ruleId, [...(byRule.get(r.ruleId) ?? []), r]);
  }
  const quiet = new Set<string>();
  for (const [rule, list] of byRule) {
    const last = [...list].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 2);
    if (last.length === 2 && last.every((r) => r.response === 'declined') && !ALWAYS_COUNTS.has(rule)) quiet.add(rule);
  }
  return quiet;
}

export const DECLINED_NOTE = 'Je zei de laatste twee keer nee op dit soort voorstel. Daarom staat het onderaan. Zeg je weer ja, dan telt dat net zo goed.';

export function learnFromDeclines(advice: Advice[], quiet: Set<string>): Advice[] {
  if (quiet.size === 0) return advice;
  return advice
    .map((a) => (quiet.has(a.ruleId) ? { ...a, priority: -1, why: `${a.why} ${DECLINED_NOTE}` } : a))
    .sort((a, b) => b.priority - a.priority);
}

// --- 2. the index against your legs ----------------------------------------------
export type LegsAtStart = 'fris' | 'normaal' | 'zwaar';

// Trainings where fresh legs matter, the ones the planner checks the index for.
// They carry the role 'ask_legs' (engine/templateRoles.ts).
export const asksLegs = (template: SessionTemplate) => hasRole(template, 'ask_legs');

export interface IndexCheck {
  date: string;
  name: string;
  index: number;
  legs: LegsAtStart;
  agrees: boolean;
  // The index said fresh, your legs were heavy: the risky way round.
  indexTooLow: boolean;
}

// Agreement, with room for the index's own uncertainty: fresh legs agree up
// to the doubt line of a test, heavy legs from the fresh line up, normal
// legs anywhere below hard-training level.
export function indexChecks(logs: SessionLog[], templates: SessionTemplate[], bodyKg?: number): IndexCheck[] {
  const byId = new Map(templates.map((t) => [t.id, t]));
  return logs
    .filter((l) => l.legsAtStart)
    .sort((a, b) => b.completedDate.localeCompare(a.completedDate))
    .map((l) => {
      // Only what was logged before that day counts, as it was that morning.
      const index = legFatigueOn(l.completedDate, { logs: logs.filter((o) => o.id !== l.id), plannedSessions: [], templates, today: l.completedDate, bodyKg }).index;
      const legs = l.legsAtStart!;
      const agrees = legs === 'fris' ? index <= FATIGUE_THRESHOLDS.test.doubt : legs === 'zwaar' ? index > FATIGUE_THRESHOLDS.test.fresh : index <= FATIGUE_THRESHOLDS.hard.fresh;
      return { date: l.completedDate, name: byId.get(l.templateId)?.name ?? 'Training', index, legs, agrees, indexTooLow: legs === 'zwaar' && index <= FATIGUE_THRESHOLDS.test.fresh };
    });
}
