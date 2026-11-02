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

export interface WidgetSummary {
  date: string; // yyyy-mm-dd, de dag waarvoor dit geldt
  title: string; // de naam van de training, "Rustdag", "Vakantie" of "Rust vandaag" (bij ziekte, dat hoort niet op een vergrendelscherm)
  minutes?: number;
}

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
  const label = leaveLabelOn(today, input.leavePeriods ? [...input.leavePeriods] : undefined);
  if (label?.kind === 'off') return { date, title: label.title };

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
  if (open && template) return { date, title: template.name, minutes: resolveEffectiveFullDuration(template, open.scheduledDate, program) };
  if (illness) return { date, title: 'Rust vandaag' };
  return { date, title: 'Rustdag' };
}

// Of de widget deze samenvatting nu toont; zo niet, dan staat er "Open ASCEND".
export function widgetShows(summary: WidgetSummary | undefined, today: string): boolean {
  return !!summary && summary.date === today;
}
