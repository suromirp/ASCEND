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
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import { addDays, mondayOfWeek } from '../utils/dates';
import { activeIllness, isIllnessDay } from './illness';
import { leaveDays, lightDays } from './leave';
import { isLegHeavyTemplate } from './scheduler';
import { lockLevel, validateWeeks } from './weekValidator';
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
  // Het aantal keer dat de richting vraagt (het kan meer zijn dan er op je dagen past).
  target: number;
  // Voor het krachtblok dat de planning leest (StrengthProgramStrategy): alleen het aantal per week, en welke
  // sjablonen vooraan komen. De sjablonen zelf en de split van het blok blijven zoals jij ze koos.
  strategy: { sessionsPerWeek: number; keepFirst: string[] };
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
      const byTemplate = new Map(input.templates.map((t) => [t.id, t]));
      const legHeavy = (tid: string) => { const t = byTemplate.get(tid); return !!t && isLegHeavyTemplate(t); };
      const heavyDays = new Set(Object.entries(days).filter(([tid]) => legHeavy(tid)).map(([, d]) => d));
      // Een beenzwaar sjabloon komt nooit naast een beenzware dag, ook niet over het weekeinde heen (zondag en maandag).
      const nextToHeavy = (d: number) => heavyDays.has(d === 1 ? 7 : d - 1) || heavyDays.has(d === 7 ? 1 : d + 1);
      const candidates = free
        .filter((d) => [1, 2, 3, 4, 5].some((w) => w !== d && !used.has(w)))
        .filter((d) => !(legHeavy(id) && nextToHeavy(d)));
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
    target: input.target,
    strategy: { sessionsPerWeek: to, keepFirst: kept },
    lines,
  };
}

// De rijen van de bestaande planning die meegaan. Kracht die vervalt: alleen vanaf morgen, alleen wat het
// systeem plande en nog niet gedaan is, nooit de training die in Forge open staat. Kracht die erbij komt:
// alleen vanaf morgen op de nieuwe dag, en alleen als de weekcontrole (weekValidator) er niets op aanmerkt
// met jouw vakanties en je ziekte erbij (geen vakantiedag, geen ziekteperiode, 48 uur tussen zware beendagen,
// ruimte op de dag). Past het niet, dan blijft die week zoals hij is en telt het mee in `noRoomWeeks`.
export interface StrengthPlanContext {
  templates: readonly SessionTemplate[];
  plannedSessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  program: Program | null | undefined;
  dailyTimeBudget: Partial<Record<Weekday, DailyTimeBudget>> | undefined;
  pairing: TrainingStrategyProfile['sameDayPairingPreference'];
  today: string;
  restDay?: number;
  leave?: LeavePeriod[];
  illnessEpisodes?: IllnessEpisode[];
  // De geplande training die nu open staat in Forge: die blijft.
  openPlannedId?: string;
}

export interface StrengthPlanItems {
  items: PlanChangeItem[];
  addedWeeks: number;
  // Weken waar niets bij paste, en weken waar maar een deel bij paste.
  noRoomWeeks: number;
  partialWeeks: number;
}

export function strengthPlanItems(reshape: Pick<StrengthReshape, 'shape' | 'added' | 'removed' | 'to'>, ctx: StrengthPlanContext): StrengthPlanItems {
  const reason = `Je richting vraagt ${reshape.to} keer kracht per week.`;
  const logged = new Set(ctx.logs.map((l) => l.plannedSessionId));
  const removing = new Set(reshape.removed);
  const items: PlanChangeItem[] = ctx.plannedSessions
    .filter((s) => s.status !== 'skipped' && s.scheduledDate > ctx.today && s.id !== ctx.openPlannedId && removing.has(s.templateId) && lockLevel(s, logged, ctx.today) === 3)
    .map((s) => ({ plannedSessionId: s.id, action: 'remove' as const, reason, generatedBy: ['engine/directionStrength.ts'] }));

  let addedWeeks = 0;
  let noRoomWeeks = 0;
  let partialWeeks = 0;
  if (reshape.added.length > 0) {
    const leave = leaveDays(ctx.leave);
    const light = lightDays(ctx.leave, leave);
    const templates = [...ctx.templates];
    const byId = new Map(templates.map((t) => [t.id, t]));
    const weekStarts = [...new Set(ctx.plannedSessions.filter((s) => s.scheduledDate > ctx.today).map((s) => s.weekStartDate))].sort();
    for (const weekStart of weekStarts) {
      const week = [...ctx.plannedSessions.filter((s) => s.weekStartDate === weekStart && s.status !== 'skipped')];
      let placedHere = false;
      let failedHere = false;
      for (const id of reshape.added) {
        if (week.some((s) => s.templateId === id)) continue;
        const dow = reshape.shape.days[id];
        if (!dow) continue;
        const date = addDays(mondayOfWeek(weekStart), dow - 1);
        if (date <= ctx.today) continue;
        const draft: PlannedSession = { id: `draft:${weekStart}:${id}`, templateId: id, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order: 99 };
        const nextToHeavy = isLegHeavyTemplate(byId.get(id)!) && [-1, 1].some((o) => ctx.plannedSessions.some((x) => x.status !== 'skipped' && x.scheduledDate === addDays(date, o) && !!byId.get(x.templateId) && isLegHeavyTemplate(byId.get(x.templateId)!)));
        const blocked = nextToHeavy || leave.has(date) || light.has(date) || isIllnessDay(date, ctx.illnessEpisodes, ctx.today) || (!!activeIllness(ctx.illnessEpisodes) && date <= addDays(ctx.today, 7));
        const findings = blocked ? [] : validateWeeks({
          sessions: [...ctx.plannedSessions.filter((s) => s.status !== 'skipped'), ...week.filter((s) => s.id.startsWith('draft:')), draft],
          logs: [...ctx.logs] as SessionLog[], templates, today: ctx.today, restDay: ctx.restDay, program: ctx.program,
          dailyTimeBudget: ctx.dailyTimeBudget, sameDayPairingPreference: ctx.pairing, leave: ctx.leave, until: addDays(weekStart, 13),
        }, new Set([weekStart])).filter((f) => f.sessionIds.includes(draft.id) || f.subjectId === draft.id);
        if (blocked || findings.length > 0) { failedHere = true; continue; }
        week.push(draft);
        placedHere = true;
        items.push({
          action: 'add', newSessionDraft: { templateId: id, scheduledDate: date, weekStartDate: weekStart }, reason, generatedBy: ['engine/directionStrength.ts'],
        });
      }
      if (placedHere) addedWeeks++;
      if (failedHere) { if (placedHere) partialWeeks++; else noRoomWeeks++; }
    }
  }
  return { items, addedWeeks, noRoomWeeks, partialWeeks };
}

// De regels van het voorstel, eerlijk over wat lukte en wat niet.
export function strengthNotes(reshape: StrengthReshape, outcome: Pick<StrengthPlanItems, 'addedWeeks' | 'noRoomWeeks' | 'partialWeeks'>, blockFollows: boolean): string[] {
  const lines: string[] = [];
  if (reshape.added.length > 0 && outcome.addedWeeks === 0 && (outcome.noRoomWeeks > 0 || outcome.partialWeeks > 0)) {
    lines.push(`Je richting vraagt ${reshape.target} keer kracht; op je dagen past er nu geen extra keer bij.`);
  } else {
    lines.push(...reshape.lines);
    if (outcome.noRoomWeeks > 0) lines.push(`In ${outcome.noRoomWeeks} ${outcome.noRoomWeeks === 1 ? 'week' : 'weken'} paste het niet, daar blijft het bij ${reshape.from} keer.`);
  }
  if (outcome.partialWeeks > 0) lines.push(`In ${outcome.partialWeeks} ${outcome.partialWeeks === 1 ? 'week' : 'weken'} paste maar een deel van de extra kracht, daar komt er minder bij.`);
  if (blockFollows) lines.push(`Je krachtblok gaat mee naar ${reshape.to} keer per week.`);
  return lines;
}
