// ASCEND — wat het moment na Gedaan laat zien.
//
// De training of trainingen die je net vastlegde, de feiten ervan (van het
// horloge als die er zijn) en drie betekenisvolle regels: wat dit bijdraagt
// aan je doel, hoe je week ervoor staat en wat je benen morgen doen. Alles
// komt uit bestaande engine-functies (computeDemand en
// resolveSessionContributions voor het doel, deriveSessionStatus voor de week,
// legFatigueOn voor de beenindex); er wordt niets bijgeschreven. Kan een regel
// niet eerlijk worden gezegd, dan valt hij weg.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { GoalMilestone, GoalMilestoneProgress, TrainingGoal } from '../models/goals';
import { computeDemand } from './demand';
import { computeGoalProgress } from './progression';
import { resolveSessionContributions } from './sessionContribution';
import { deriveSessionStatus } from './sessionStatus';
import { fatigueWord, FATIGUE_THRESHOLDS, legFatigueOn, type LegFatigueInputs } from './legFatigue';
import { logSport } from './sports';
import { addDays, daysBetween, formatHoursMinutesNL, mondayOfWeek, weekdayLongNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';

export interface CompletionLine {
  id: 'goal' | 'week' | 'legs';
  text: string;
  // Een korte uitleg bij een getal of een vervolg op de regel.
  note?: string;
}

export interface CompletionFacts {
  // De hoofdzaken: tijd, afstand en tempo (of sets bij kracht).
  main: string[];
  // De rest: hoogtemeters, rugzak, hartslag.
  extra: string[];
  // Er zijn cijfers van het horloge bij.
  fromWatch: boolean;
}

export interface CompletionSummary {
  title: string;
  facts: CompletionFacts;
  lines: CompletionLine[];
  // Hoeveel trainingen dit moment samenvat (meer dan één bij "Alles opslaan").
  count: number;
}

export interface CompletionInputs {
  // Alle logs, inclusief de nieuwe.
  logs: SessionLog[];
  // De nieuwe: leeg bij een kamp dat je zelf als behaald markeerde.
  logIds: string[];
  templates: SessionTemplate[];
  plannedSessions: PlannedSession[];
  goals: TrainingGoal[];
  goalMilestones: GoalMilestone[];
  goalMilestoneProgress: GoalMilestoneProgress[];
  // De invoer van de beenindex (zoals useLegFatigueInputs die maakt).
  legs: LegFatigueInputs;
  today: string;
  // De titel van het kamp dat dit moment behaalde, als dat zo is.
  milestoneTitle?: string;
}

// --- feiten -------------------------------------------------------------------

function paceText(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Cijfers van het horloge: Garmin of Health Connect, niet MacroFactor of een back-up.
const isWatchLog = (log: SessionLog) => log.source === 'garmin' || log.source === 'health-connect';

export function logFacts(log: SessionLog): CompletionFacts {
  const data = log.cardioData ?? log.outdoorData;
  const main: string[] = [];
  const extra: string[] = [];

  if (log.durationMinutes > 0) main.push(formatHoursMinutesNL(log.durationMinutes));

  if (log.strengthData && log.strengthData.length > 0) {
    const worked = log.strengthData.filter((e) => e.sets.some((s) => s.reps > 0));
    const sets = worked.reduce((n, e) => n + e.sets.filter((s) => s.reps > 0).length, 0);
    if (worked.length > 0) main.push(`${worked.length} ${worked.length === 1 ? 'oefening' : 'oefeningen'}`);
    if (sets > 0) main.push(`${sets} ${sets === 1 ? 'set' : 'sets'}`);
  }

  const km = data?.distanceKm;
  if (km !== undefined && km > 0) main.push(`${formatNumberNL(km, 1)} km`);

  const running = logSport(log) === 'running';
  if (running && km !== undefined && km >= 1 && log.durationMinutes > 0) {
    const pace = (log.durationMinutes * 60) / km;
    main.push(`gemiddeld ${paceText(pace)} per km`);
  }

  const gain = data?.elevationGainM;
  if (gain !== undefined && gain >= 1) {
    const text = `${formatNumberNL(gain, 0)} m omhoog${data?.estimatedElevation ? ' (geschat)' : ''}`;
    (running ? extra : main).push(text);
  }
  const loss = log.outdoorData?.elevationLossM ?? log.cardioData?.elevationLossM;
  if (loss !== undefined && loss >= 1) extra.push(`${formatNumberNL(loss, 0)} m omlaag`);
  const pack = log.outdoorData?.backpackWeightKg;
  if (pack !== undefined && pack > 0) extra.push(`rugzak ${formatNumberNL(pack, 1)} kg`);
  if (data?.avgHeartRate !== undefined) extra.push(`hartslag ${data.avgHeartRate} gemiddeld${data.maxHeartRate !== undefined ? `, ${data.maxHeartRate} hoogst` : ''}`);

  return { main, extra, fromWatch: isWatchLog(log) };
}

function joinNL(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

// --- de drie regels ---------------------------------------------------------------

function weeksTo(today: string, date: string): number {
  return Math.max(0, Math.ceil(daysBetween(today, date) / 7));
}

function weeksText(today: string, goal: TrainingGoal): string | undefined {
  if (goal.status !== 'active' || !goal.targetDate || goal.targetDate < today) return undefined;
  const w = weeksTo(today, goal.targetDate);
  return w === 0 ? `${goal.name} is deze week.` : `Nog ${w} ${w === 1 ? 'week' : 'weken'} tot ${goal.name}.`;
}

// Wat dit bijdraagt aan je doel. Een behaald kamp noemt dat kamp; anders het
// doel waar de training structureel aan bouwt (dezelfde vraag die de planning
// stelt: welke eisen van het doel oefent deze training). Raakt de training geen
// enkel doel, dan is er geen regel.
function goalLine(inputs: CompletionInputs, latest: SessionLog | undefined): CompletionLine | undefined {
  const { goals, goalMilestones, goalMilestoneProgress, logs, today } = inputs;
  const withLadder = goals.find((g) => g.status !== 'archived' && goalMilestones.some((m) => m.goalId === g.id));

  if (inputs.milestoneTitle) {
    const milestone = goalMilestones.find((m) => m.title === inputs.milestoneTitle);
    const goal = goals.find((g) => g.id === milestone?.goalId) ?? withLadder;
    if (!milestone) return { id: 'goal', text: `Kamp behaald: ${inputs.milestoneTitle}.`, note: goal ? weeksText(today, goal) : undefined };
    return { id: 'goal', text: `Kamp ${milestone.order} behaald: ${milestone.title}.`, note: goal ? weeksText(today, goal) : undefined };
  }
  if (!latest) return undefined;

  const template = inputs.templates.find((t) => t.id === latest.templateId);
  if (!template || template.type === 'recovery') return undefined;
  const active = goals.filter((g) => g.status === 'active');
  const synthetic: PlannedSession = { id: 'completion', templateId: template.id, scheduledDate: latest.completedDate, weekStartDate: mondayOfWeek(latest.completedDate), status: 'planned', order: 0 };
  const served = new Set(resolveSessionContributions([synthetic], inputs.templates, active.map((g) => ({ goalId: g.id, demands: computeDemand(g.requirements) }))).map((c) => c.goalId));
  const goal = active.find((g) => g.id === withLadder?.id && served.has(g.id)) ?? active.find((g) => served.has(g.id));
  if (!goal) return undefined;

  const notes: string[] = [];
  const ladder = goalMilestones.filter((m) => m.goalId === goal.id);
  if (ladder.length > 0) {
    const current = computeGoalProgress(goal.id, goal.name, ladder, goalMilestoneProgress, logs).currentMilestone;
    if (current) notes.push(`Volgend kamp: ${current.definition.title}.`);
  }
  const weeks = weeksText(today, goal);
  if (weeks) notes.push(weeks);
  return { id: 'goal', text: `Dit bouwt aan ${goal.name}.`, note: notes.join(' ') || undefined };
}

function dayWord(date: string, today: string): string {
  const d = daysBetween(today, date);
  if (d === 0) return 'vandaag';
  if (d === 1) return 'morgen';
  return weekdayLongNL(date).toLowerCase();
}

// Je week: hoeveel van de geplande trainingen gedaan zijn, en wat er volgt.
function weekLine(inputs: CompletionInputs, newLogs: SessionLog[]): CompletionLine | undefined {
  const { plannedSessions, templates, logs, today } = inputs;
  const ref = newLogs.reduce((d, l) => (l.completedDate > d ? l.completedDate : d), newLogs[0].completedDate);
  const monday = mondayOfWeek(ref);
  const isRecovery = (s: PlannedSession) => templates.find((t) => t.id === s.templateId)?.type === 'recovery';
  const week = plannedSessions.filter((s) => mondayOfWeek(s.scheduledDate) === monday && s.status !== 'skipped' && !isRecovery(s));
  const done = week.filter((s) => deriveSessionStatus(s, logs).status === 'completed').length;
  const whose = monday === mondayOfWeek(today) ? 'deze week' : 'die week';
  const unlinked = newLogs.every((l) => !l.plannedSessionId);

  if (week.length === 0) return { id: 'week', text: `Er stond ${whose} niets gepland, dit is een extra training.` };
  if (done >= week.length) return { id: 'week', text: `Je week is rond: alle ${week.length} trainingen gedaan.` };

  const next = week
    .filter((s) => deriveSessionStatus(s, logs).status !== 'completed' && s.scheduledDate >= today)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order)[0];
  const nextName = next ? templates.find((t) => t.id === next.templateId)?.name : undefined;
  const note = unlinked ? 'Deze training stond niet in je planning.' : next && nextName ? `Daarna ${nextName}, ${dayWord(next.scheduledDate, today)}.` : undefined;
  return { id: 'week', text: `${done} van ${week.length} ${week.length === 1 ? 'training' : 'trainingen'} ${whose} gedaan.`, note };
}

// Wat je benen morgen doen, volgens de beenindex (engine/legFatigue.ts).
function legsLine(inputs: CompletionInputs): CompletionLine {
  const { plannedSessions, templates, today, legs } = inputs;
  const tomorrow = addDays(today, 1);
  const result = legFatigueOn(tomorrow, legs);
  const { word } = fatigueWord(result.index);
  const sessions = plannedSessions
    .filter((s) => s.scheduledDate === tomorrow && s.status !== 'skipped')
    .map((s) => templates.find((t) => t.id === s.templateId))
    .filter((t): t is SessionTemplate => !!t);
  const training = sessions.filter((t) => t.type !== 'recovery');
  const lead = training.length > 0 ? `Morgen ${joinNL(training.map((t) => t.name))}.` : sessions.length > 0 ? 'Morgen is een rustdag.' : 'Morgen staat er niets gepland.';
  const fresh = FATIGUE_THRESHOLDS.test.fresh;
  const tired = FATIGUE_THRESHOLDS.hard.fresh;
  return {
    id: 'legs',
    text: `${lead} Je benen zijn dan ${word.toLowerCase()}.`,
    note: `Beenindex ${formatNumberNL(result.index, 1)}: tot ${fresh} is fris, boven ${tired} vermoeid.`,
  };
}

// --- het geheel ---------------------------------------------------------------------

export function completionSummary(inputs: CompletionInputs): CompletionSummary {
  const newLogs = inputs.logIds.map((id) => inputs.logs.find((l) => l.id === id)).filter((l): l is SessionLog => !!l);
  const latest = [...newLogs].sort((a, b) => a.completedAt.localeCompare(b.completedAt)).at(-1);
  const nameOf = (l: SessionLog) => inputs.templates.find((t) => t.id === l.templateId)?.name ?? 'Training';
  const lines: CompletionLine[] = [];
  const goal = goalLine(inputs, latest);
  if (goal) lines.push(goal);

  // Alleen een kamp, zonder training: geen feiten, geen week en benen.
  if (newLogs.length === 0) {
    return { title: inputs.milestoneTitle ?? 'Gedaan', facts: { main: [], extra: [], fromWatch: false }, lines, count: 0 };
  }
  lines.push(...[weekLine(inputs, newLogs), legsLine(inputs)].filter((l): l is CompletionLine => !!l));

  if (newLogs.length === 1) {
    const only = newLogs[0];
    const facts = logFacts(only);
    return { title: nameOf(only), facts, lines, count: 1 };
  }

  const allStrength = newLogs.every((l) => l.type === 'strength');
  const minutes = newLogs.reduce((n, l) => n + l.durationMinutes, 0);
  const title = `${newLogs.length} ${allStrength ? 'krachttrainingen' : 'trainingen'} opgeslagen`;
  const facts: CompletionFacts = {
    main: [joinNL(newLogs.map(nameOf))],
    extra: minutes > 0 ? [`samen ${formatHoursMinutesNL(minutes)}`] : [],
    fromWatch: newLogs.some(isWatchLog),
  };
  return { title, facts, lines, count: newLogs.length };
}
