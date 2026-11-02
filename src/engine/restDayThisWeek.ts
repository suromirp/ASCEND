// ASCEND: welke dag deze week je rustdag is als je vaste rustdag bezet is.
//
// Stond er op je vaste rustdag een training (gepland of gedaan, zoals een testloop), dan is de rust van die
// week in de praktijk een andere dag die vrij bleef. Week zegt dat dan ook: die dag heet "Rustdag deze
// week", met de reden erbij. Het is alleen weergave: er verschuift niets en er wordt niets opgeslagen.
// Is er geen vrije dag over, dan geeft deze functie niets en spreekt de weekcontrole (REST-DAY, met een
// voorstel met Akkoord).
//
// De keuze: de eerste vrije dag van de week (freeDaysOfWeek), liefst niet vlak voor een zware dag als er
// keus is. Een dag met een band (vakantie, tocht, vrije dag, lichte dag), een overgeslagen rij of iets wat
// je deed telt niet als lege dag; een vakantiedag in de week is zelf al rust.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import { addDays, mondayOfWeek, weekdayLongNL } from '../utils/dates';
import { freeDaysOfWeek } from './weekValidator';
import { leaveDays, leaveLabelOn } from './leave';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { hasRole } from './templateRoles';

export interface RestDayThisWeekInput {
  // Een dag uit de week.
  anyDay: string;
  // Je vaste rustdag, 1 (maandag) tot 7 (zondag).
  restDay?: number;
  sessions: PlannedSession[];
  logs: SessionLog[];
  templateById: Map<string, SessionTemplate>;
  today: string;
  leave?: LeavePeriod[];
}

export interface RestDayThisWeek {
  // De dag die deze week je rustdag is.
  date: string;
  // Je vaste rustdag in die week.
  fixedDay: string;
  // Korte reden voor in de rij: "je rustdag op maandag is bezet".
  reason: string;
}

// Zwaar voor de rust: een zware beendag, een harde loop (ook een test of wedstrijd) of een lange training.
const isHeavyDay = (t: SessionTemplate) => t.type !== 'recovery' && (isLegHeavyTemplate(t) || isHardRun(t) || hasRole(t, 'long'));

export function restDayThisWeek(input: RestDayThisWeekInput): RestDayThisWeek | null {
  const { restDay, sessions, logs, templateById, today } = input;
  if (!restDay) return null;
  const monday = mondayOfWeek(input.anyDay);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const fixedDay = week[restDay - 1];
  const free = freeDaysOfWeek(monday, sessions, logs, templateById);
  // De vaste rustdag is vrij: dan is dat gewoon de rustdag.
  if (free.includes(fixedDay)) return null;
  const isRecovery = (templateId: string) => templateById.get(templateId)?.type === 'recovery';
  const inWeek = (d: string) => d >= week[0] && d <= week[6];
  // De rust van deze week staat al ergens (Herstel na REST-SWAP of REST-PULL, of een gedane hersteldag).
  if (sessions.some((s) => s.status !== 'skipped' && inWeek(s.scheduledDate) && isRecovery(s.templateId))) return null;
  if (logs.some((l) => inWeek(l.completedDate) && isRecovery(l.templateId))) return null;
  // Een vakantiedag zonder training is al rust.
  const leave = leaveDays(input.leave);
  if (free.some((d) => leave.get(d)?.kind === 'off')) return null;
  // Een lege dag: geen rij (ook geen overgeslagen), niets gedaan, geen band.
  const empty = free.filter((d) => !sessions.some((s) => s.scheduledDate === d) && !logs.some((l) => l.completedDate === d) && !leaveLabelOn(d, input.leave));
  if (empty.length === 0) return null;
  // Zwaar op een dag: wat je deed telt op de dag van doen; wat nog komt telt als het gepland staat. Een gemiste
  // training in het verleden telt niet.
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const heavyOn = (d: string) =>
    logs.some((l) => l.completedDate === d && !!templateById.get(l.templateId) && isHeavyDay(templateById.get(l.templateId)!))
    || (d >= today && sessions.some((s) => s.scheduledDate === d && s.status !== 'skipped' && !logged.has(s.id) && !!templateById.get(s.templateId) && isHeavyDay(templateById.get(s.templateId)!)));
  const date = empty.find((d) => !heavyOn(addDays(d, 1))) ?? empty[0];
  return { date, fixedDay, reason: `je rustdag op ${weekdayLongNL(fixedDay)} is bezet` };
}
