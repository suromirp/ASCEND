// De samenvatting voor de widget op het startscherm van de Android-app: wat staat er vandaag?
// Titel, duur en datum, verder niets. De web-app schrijft hem na elke wijziging van de planning
// naar het toestel (integrations/widgetBridge.ts); de widget leest hem en toont "Open ASCEND"
// als de datum niet van vandaag is. Puur: geen React, geen opslag.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { deriveSessionStatus } from './sessionStatus';
import { resolveEffectiveFullDuration } from './substitutions';
import type { IllnessEpisode } from '../models/illness';
import { activeIllness, isHeavySession } from './illness';
import type { LeavePeriod } from '../models/leave';
import { leaveLabelOn } from './leave';
import { sportKind } from '../components/sportKind';
import { addDays } from '../utils/dates';

export interface WidgetSummary {
  date: string; // yyyy-mm-dd, de dag waarvoor dit geldt
  title: string; // de naam van de training, "Rustdag", "Vakantie" of "Rust vandaag" (bij ziekte, dat hoort niet op een vergrendelscherm)
  minutes?: number;
  /** Het soort voor het pictogram; rust, vakantie en ziekte zijn 'rest'. */
  kind: WidgetKind;
  /** De training van vandaag is gelogd: de widget toont een vinkje en "Gedaan". */
  done?: boolean;
  /** De naam van de training van morgen. */
  tomorrow?: string;
  /** Morgen is een rustdag (of vakantie); sluit `tomorrow` uit. */
  tomorrowRest?: boolean;
}

export type WidgetKind = 'run' | 'strength' | 'walk' | 'mountain' | 'bike' | 'rest';

export interface WidgetInput {
  today: string;
  sessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templateById: ReadonlyMap<string, SessionTemplate>;
  program: Program | null | undefined;
  leavePeriods: readonly LeavePeriod[] | undefined;
  illnessEpisodes: readonly IllnessEpisode[] | undefined;
}

export function widgetSummary(input: WidgetInput): WidgetSummary {
  const { today, sessions, logs, templateById, program } = input;
  const date = today;
  const periods = input.leavePeriods ? [...input.leavePeriods] : undefined;
  const label = leaveLabelOn(today, periods);
  if (label?.kind === 'off') return { date, title: label.title, kind: 'rest', ...tomorrowOf(input, periods) };

  const illness = activeIllness(input.illnessEpisodes ? [...input.illnessEpisodes] : undefined);
  const mine = sessions
    .filter((s) => s.scheduledDate === today && s.status !== 'skipped')
    .sort((a, b) => a.order - b.order);
  const open = mine.find((s) => {
    const t = templateById.get(s.templateId);
    if (!t || t.type === 'recovery') return false;
    if (deriveSessionStatus(s, [...logs]).status === 'completed') return false;
    if (illness && (illness.kind !== 'above_neck' || isHeavySession(t))) return false;
    return true;
  });
  const template = open ? templateById.get(open.templateId) : undefined;
  const tomorrow = tomorrowOf(input, periods);
  if (open && template) {
    return { date, title: template.name, minutes: resolveEffectiveFullDuration(template, open.scheduledDate, program), kind: sportKind(template), ...tomorrow };
  }
  // Ziek: Rust vandaag, en niets over morgen (het is nog niet te zeggen en hoort niet op een vergrendelscherm).
  if (illness) return { date, title: 'Rust vandaag', kind: 'rest' };
  const doneSession = mine.find((s) => {
    const t = templateById.get(s.templateId);
    return !!t && t.type !== 'recovery' && deriveSessionStatus(s, [...logs]).status === 'completed';
  });
  const doneTemplate = doneSession ? templateById.get(doneSession.templateId) : undefined;
  if (doneSession && doneTemplate) {
    return { date, title: doneTemplate.name, minutes: resolveEffectiveFullDuration(doneTemplate, doneSession.scheduledDate, program), kind: sportKind(doneTemplate), done: true, ...tomorrow };
  }
  return { date, title: 'Rustdag', kind: 'rest', ...tomorrow };
}

// Wat morgen is: de eerste training, anders rust. Vakantie morgen telt als rust.
function tomorrowOf(input: WidgetInput, periods: LeavePeriod[] | undefined): Pick<WidgetSummary, 'tomorrow' | 'tomorrowRest'> {
  const day = addDays(input.today, 1);
  if (leaveLabelOn(day, periods)?.kind === 'off') return { tomorrowRest: true };
  const next = input.sessions
    .filter((s) => s.scheduledDate === day && s.status !== 'skipped')
    .sort((a, b) => a.order - b.order)
    .map((s) => input.templateById.get(s.templateId))
    .find((t) => !!t && t.type !== 'recovery');
  return next ? { tomorrow: next.name } : { tomorrowRest: true };
}

// Of de widget deze samenvatting nu toont; zo niet, dan staat er "Open ASCEND".
export function widgetShows(summary: WidgetSummary | undefined, today: string): boolean {
  return !!summary && summary.date === today;
}
