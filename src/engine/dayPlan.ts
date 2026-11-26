// ASCEND: het dagbeeld (I-14, stap 5 van docs/visie/Ontwerp Eén plan.md). Wat er op een dag staat komt uit deze ene
// afleiding; Vandaag, Week en de weekbalk lezen haar in plaats van elk een eigen filter.
//
// - `sessions`: de rijen van Week op hun geplande dag, in de volgorde van de dag (dayOrder, anders `order`).
// - `primary`: de missie van Vandaag, de eerste open training van die rijen die mag (ziek: engine/dayRules.ts).
// - `rest`: de rustdag als er geen training open is.
// - `strip`: wat de weekbalk toont, op de dag van uitvoeren (countDayOf, docs/beslissingen/2026-11-23-telt-op-dag-van-
//   uitvoeren.md). Een gedane training van een andere dag zegt die dag (`plannedOn`); Week zegt op zijn rij de dag van
//   uitvoeren (engine/weekRow.ts#doneOnOtherDay). Zo staat het verschil in beide met een woord (invariant 3).
//
// Puur: geen React, geen opslag. Alleen lezen: geen log en geen geplande training wordt herschreven.

import type { IllnessEpisode } from '../models/illness';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, weekDates } from '../utils/dates';
import { dayOrder, orderDay, type DayOrderAdvice } from './dayOrder';
import { dayRules } from './dayRules';
import { activeIllness } from './illness';
import { plannedByIdOf } from './logDay';
import { countDayOf } from './weekLogs';
import { plannedOnOtherDay } from './weekRow';

// Wat geen rij is: een rustdag die ASCEND opgaf, en wat een periode liet vallen (de vakantie of tocht legt het uit).
// Het enige filter hiervoor; het stond eerst gekopieerd in Today, Week en de weekbalk.
export function hiddenFromDay(s: Pick<PlannedSession, 'status' | 'templateId' | 'leave'>, templateById: ReadonlyMap<string, SessionTemplate>): boolean {
  return s.status === 'skipped' && (templateById.get(s.templateId)?.type === 'recovery' || s.leave?.role === 'dropped');
}

export interface StripEntry {
  session: PlannedSession;
  template: SessionTemplate;
  done: boolean;
  // Gedaan op deze dag, gepland op een andere: die dag, "do 19".
  plannedOn?: string;
}

export interface PlanDay {
  date: string;
  sessions: PlannedSession[];
  order?: DayOrderAdvice;
  primary?: PlannedSession;
  rest?: PlannedSession;
  strip: StripEntry[];
  // Geen training in de balk, wel een rustdag.
  stripRest: boolean;
  // Voor de kaart op Vandaag, op de dag van uitvoeren zoals de balk: er is hier een training en geen open missie meer
  // (`allDone`), en hier is iets gedaan (`anyDone`). Een training van morgen die je vandaag deed telt vandaag, niet
  // op zijn geplande dag; die dag is dan een vrije dag.
  allDone: boolean;
  anyDone: boolean;
}

export interface WeekPlan {
  days: PlanDay[];
  day(date: string): PlanDay;
}

export interface DayPlanInput {
  weekStart: string;
  // Het hele plan: de dag na zondag en een training van een andere week die deze week gedaan is horen erbij.
  sessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templateById: Map<string, SessionTemplate>;
  today: string;
  illness?: IllnessEpisode[];
}

const byPlace = (a: PlannedSession, b: PlannedSession) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order;

export function weekPlan(input: DayPlanInput): WeekPlan {
  const { weekStart, logs, templateById, today } = input;
  const all = input.sessions.filter((s) => !hiddenFromDay(s, templateById));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const dayOf = countDayOf(logs, plannedByIdOf(input.sessions));
  const onDate = new Map<string, PlannedSession[]>();
  for (const s of all) onDate.set(s.scheduledDate, [...(onDate.get(s.scheduledDate) ?? []), s]);
  const planned = (date: string) => [...(onDate.get(date) ?? [])].sort(byPlace);

  const illness = activeIllness(input.illness);
  const illRules = illness ? dayRules({ today, illness: input.illness }) : undefined;
  const isRest = (s: PlannedSession) => templateById.get(s.templateId)?.type === 'recovery';

  // Eerst de rijen per dag (ook de dagen rond de week, voor wat in de balk binnenkomt), dan de balk.
  const ordered = new Map<string, { sessions: PlannedSession[]; order?: DayOrderAdvice }>();
  const orderedOn = (date: string) => {
    const was = ordered.get(date);
    if (was) return was;
    const rows = planned(date);
    // De dag na deze dag, voor de regel "morgen hard" in dayOrder, uit het hele plan (ook na zondag).
    const order = dayOrder(rows.filter((s) => !logged.has(s.id)), input.sessions.filter((s) => s.scheduledDate === addDays(date, 1)), templateById);
    const out = { sessions: orderDay(rows, order), order };
    ordered.set(date, out);
    return out;
  };

  const buildDay = (date: string): PlanDay => {
    const { sessions, order } = orderedOn(date);
    // Alleen vandaag krijgt de ziekteregel (I-151): een andere dag rekent zonder de ziekte van vandaag.
    const allowed = (s: PlannedSession) => {
      if (!illRules || date !== today) return true;
      const t = templateById.get(s.templateId);
      return !!t && illRules.ok({ date, step: 'do', template: t });
    };
    const primary = sessions.find((s) => !isRest(s) && !logged.has(s.id) && s.status !== 'skipped' && allowed(s));
    const rest = primary ? undefined : sessions.find((s) => isRest(s) && s.status !== 'skipped' && !logged.has(s.id));

    // De balk: eerst de rijen van deze dag die hier ook gedaan zijn of nog open staan, in de volgorde van de dag; dan
    // wat elders gepland stond en hier gedaan is.
    const own = sessions.filter((s) => dayOf(s) === date);
    const incoming = all.filter((s) => s.scheduledDate !== date && dayOf(s) === date).sort(byPlace);
    const candidates = [...own, ...incoming];
    const strip = candidates.flatMap((s): StripEntry[] => {
      const template = templateById.get(s.templateId);
      if (!template || template.type === 'recovery' || s.status === 'skipped') return [];
      const plannedOn = plannedOnOtherDay(s, date);
      return [{ session: s, template, done: logged.has(s.id), ...(plannedOn ? { plannedOn } : {}) }];
    });
    const stripRest = strip.length === 0 && candidates.some((s) => isRest(s) && s.status !== 'skipped');
    const allDone = candidates.some((s) => !isRest(s)) && !primary;
    const anyDone = candidates.some((s) => logged.has(s.id));
    return { date, sessions, order, primary, rest, strip, stripRest, allDone, anyDone };
  };

  const days = weekDates(weekStart).map(buildDay);
  const byDate = new Map(days.map((d) => [d.date, d]));
  return {
    days,
    // Een dag buiten de week (morgen na zondag) rekent op dezelfde manier, ook de balk.
    day: (date) => {
      const was = byDate.get(date);
      if (was) return was;
      const out = buildDay(date);
      byDate.set(date, out);
      return out;
    },
  };
}

// De tweede regel van een rustdagrij in Week zonder training (I-150). De hele regel maakt `restRow.ts#restRowText`.
export const REST_ROW_QUIET = 'bewust herstel';
