// ASCEND: de richting past ook het aantal keer kracht in je week aan (docs/beslissingen/2026-11-02-zonder-doel-je-week.md).
// Wie al een plan heeft en een andere richting kiest, houdt anders het aantal krachttrainingen dat er stond.
// Dit rekent uit hoe de vorm van de week (AppSettings.weekShape) dan wordt: kracht eraf tot het doel van de
// richting, of er een bij op een vrije dag waar je kunt. De andere trainingen houden hun dag. Het resultaat
// gaat altijd in een voorstel met Akkoord (components/ascend/useDirectionChange.tsx), met de regels die
// zeggen wat erbij komt en wat vervalt. Wat je zelf vastzette en wat je deed regelt de planningsronde.
// Een week zonder kracht (je koos dat zelf) blijft zonder kracht.
// Puur: geen React, geen IndexedDB.

import { DIRECTIONS, type DirectionId } from '../data/directions';
import type { PlanChangeItem } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { computeSportEnableProposal } from './scheduleFit';
import { lockLevel } from './weekValidator';
import { WEEK_SHAPE_STRENGTH, WEEK_SHAPE_TEMPLATE_IDS, parseWeekShape, type WeekShape } from './sports';
import { WEEKDAY_NAMES } from './firstPlan';
import { shapeSpacingConflicts } from './weekShape';

// Welke krachttraining het langst blijft staan, en welke het eerst erbij komt.
const STRENGTH_PRIORITY: readonly string[] = ['tpl_upper_a', 'tpl_lower_a', 'tpl_upper_b'];
const HERSTEL = 'tpl_herstel';

// Het aantal keer kracht dat bij je richting en je weekbudget hoort, hoogstens het aantal krachtsjablonen.
export function strengthTargetFor(id: DirectionId, budget: { strength?: number }): number {
  return Math.max(1, Math.min(WEEK_SHAPE_STRENGTH.length, budget.strength ?? DIRECTIONS[id].strength.value));
}

export interface StrengthReshape {
  shape: WeekShape;
  from: number;
  to: number;
  added: string[];
  removed: string[];
  // Voor het krachtblok dat de planning leest (StrengthProgramStrategy).
  strategy: { sessionTemplateIds: string[]; sessionsPerWeek: number; splitType: string };
  // Gewone zinnen voor het voorstel.
  lines: string[];
}

const byPriority = (ids: readonly string[]): string[] => [...ids].sort((a, b) => STRENGTH_PRIORITY.indexOf(a) - STRENGTH_PRIORITY.indexOf(b));

export function reshapeStrength(input: {
  templates: readonly SessionTemplate[];
  // AppSettings.weekShape zoals opgeslagen; zonder is het gewone patroon van het programma de week.
  weekShape?: unknown;
  target: number;
  restDay?: number;
}): StrengthReshape | undefined {
  const parsed = parseWeekShape(input.weekShape);
  const days: Record<string, number> = parsed
    ? { ...parsed.days }
    : Object.fromEntries(input.templates.filter((t) => t.defaultDayOfWeek && WEEK_SHAPE_TEMPLATE_IDS.includes(t.id)).map((t) => [t.id, t.defaultDayOfWeek as number]));
  const allowed = parsed?.allowed;
  const present = byPriority(Object.keys(days).filter((id) => WEEK_SHAPE_STRENGTH.includes(id)));
  const from = present.length;
  // Een week zonder kracht is jouw keuze en blijft zo.
  if (from === 0 || from === input.target) return undefined;

  const names = new Map(input.templates.map((t) => [t.id, t.name]));
  const nameOf = (id: string) => names.get(id) ?? id;
  const added: string[] = [];
  const removed: string[] = [];
  const addedOn: Record<string, number> = {};

  if (from > input.target) {
    for (const id of [...present].reverse().slice(0, from - input.target)) {
      removed.push(id);
      delete days[id];
    }
  } else {
    const trainingDays = () => Object.entries(days).filter(([id]) => id !== HERSTEL).map(([, d]) => d);
    for (const id of STRENGTH_PRIORITY.filter((s) => !(s in days))) {
      if (present.length + added.length >= input.target) break;
      const used = new Set(trainingDays());
      const restDays = new Set<number>([days[HERSTEL], input.restDay].filter((d): d is number => typeof d === 'number'));
      const free = (allowed ?? [1, 2, 3, 4, 5, 6, 7]).filter((d) => !used.has(d) && !restDays.has(d));
      // Er blijft een doordeweekse dag over voor rust.
      const candidates = free.filter((d) => [1, 2, 3, 4, 5].some((w) => w !== d && !used.has(w)));
      if (candidates.length === 0) break;
      const home = input.templates.find((t) => t.id === id)?.defaultDayOfWeek ?? 3;
      const scored = candidates
        .map((d) => ({ d, conflicts: shapeSpacingConflicts([...input.templates], { ...days, [id]: d }) }))
        .sort((a, b) => a.conflicts - b.conflicts || Math.abs(a.d - home) - Math.abs(b.d - home) || a.d - b.d);
      days[id] = scored[0].d;
      addedOn[id] = scored[0].d;
      added.push(id);
    }
    if (added.length === 0) return undefined;
  }

  const kept = byPriority(Object.keys(days).filter((id) => WEEK_SHAPE_STRENGTH.includes(id)));
  const to = kept.length;
  const lines = [`Kracht gaat van ${from} naar ${to} keer per week.`];
  if (removed.length > 0) lines.push(`Vervalt: ${removed.map(nameOf).join(', ')}.`);
  if (added.length > 0) lines.push(`Erbij: ${added.map((id) => `${nameOf(id)} op ${WEEKDAY_NAMES[addedOn[id] - 1]}`).join(', ')}.`);
  if (added.length > 0 && to < input.target) lines.push('Meer past er niet op de dagen waarop je kunt trainen.');

  return {
    shape: { days, ...(allowed ? { allowed } : {}) },
    from,
    to,
    added,
    removed,
    strategy: { sessionTemplateIds: kept, sessionsPerWeek: to, splitType: to === 1 ? 'full_body' : 'upper_lower' },
    lines,
  };
}

// De rijen van de bestaande planning die meegaan: kracht die vervalt (alleen wat het systeem plande en nog
// niet gedaan is; wat jij vastzette en wat voorbij is blijft) en kracht die erbij komt op de nieuwe dag, waar
// die dag ruimte heeft. Weken die nog niet gepland zijn volgen de nieuwe weekvorm vanzelf bij de planningsronde.
export function strengthPlanItems(
  reshape: Pick<StrengthReshape, 'shape' | 'added' | 'removed' | 'to'>,
  ctx: {
    templates: readonly SessionTemplate[];
    plannedSessions: readonly PlannedSession[];
    logs: readonly Pick<SessionLog, 'plannedSessionId'>[];
    program: Program | null | undefined;
    dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>> | undefined;
    pairing: TrainingStrategyProfile['sameDayPairingPreference'];
    today: string;
  },
): PlanChangeItem[] {
  const reason = `Je richting vraagt ${reshape.to} keer kracht per week.`;
  const logged = new Set(ctx.logs.map((l) => l.plannedSessionId));
  const removing = new Set(reshape.removed);
  const items: PlanChangeItem[] = ctx.plannedSessions
    .filter((s) => s.status !== 'skipped' && removing.has(s.templateId) && lockLevel(s, logged, ctx.today) === 3)
    .map((s) => ({ plannedSessionId: s.id, action: 'remove' as const, reason, generatedBy: ['engine/directionStrength.ts'] }));
  if (reshape.added.length > 0) {
    const days = reshape.shape.days;
    const addTemplates = ctx.templates.filter((t) => reshape.added.includes(t.id) && days[t.id]).map((t) => ({ ...t, defaultDayOfWeek: days[t.id] }));
    const { proposal } = computeSportEnableProposal(addTemplates, 'Kracht', [...ctx.plannedSessions], [...ctx.templates], ctx.program, ctx.dailyTimeBudget, ctx.pairing, ctx.today);
    for (const c of proposal.changes) items.push({ ...c, reason, generatedBy: ['engine/directionStrength.ts'] });
  }
  return items;
}
