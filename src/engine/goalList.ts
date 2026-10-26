// ASCEND: de lijst met doelen op de Ascend-tab (ronde 2c,
// docs/beslissingen/2026-10-26-ascend-tab-als-doelen.md). Alles wat de tab over doelen moet
// weten, puur en getest: welke doelen in de lijst staan en in welke volgorde, de zin onder de
// titel, de indeling van de seizoensstrook, de uitleg per label, wat slepen met label en
// volgorde doet, en de volgende stap.
//
// Het label groepeert, de volgorde beslist binnen een label. Wie een doel sleept over de grens
// van een label, neemt het label van die plek over; dat is altijd een voorstel met Akkoord als
// het de planning raakt (de tab roept dan planGoalPriority aan). Niets hier schrijft iets weg.
//
// Puur: geen React, geen IndexedDB.

import type { GoalPriority, TrainingGoal } from '../models/goals';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, daysBetween } from '../utils/dates';
import { effectivePriority, goalKindOf, goalRecoveryDays, goalTaperDays, PRIORITY_NAME } from './goalLabels';
import { goalTiming } from './goalRoute';

const RANK: Record<GoalPriority, number> = { top: 0, voortop: 1, verkenning: 2 };

export interface ListedGoal {
  goal: TrainingGoal;
  priority: GoalPriority;
  // Het doel met de mijlpalen: het blijft altijd Top.
  isMain: boolean;
}

// Een doel staat onder "Eerder" als het gearchiveerd of afgerond is, of als zijn dag voorbij is.
function isEarlier(goal: TrainingGoal, today: string): boolean {
  if (goal.status === 'archived' || goal.status === 'completed') return true;
  return goalTiming(goal, today).state === 'past';
}

// De doelen voor de lijst, in de volgorde van de tab: eerst op label, daarbinnen op de gekozen
// volgorde (`TrainingGoal.order`), zonder volgorde op de plek van opslag. `earlier: true` geeft
// juist de doelen van "Eerder, afgerond of weggelegd".
export function listedGoals(goals: readonly TrainingGoal[], ladderGoalIds: ReadonlySet<string>, today: string, opts: { earlier?: boolean } = {}): ListedGoal[] {
  const mainId = goals.find((g) => g.status !== 'archived' && ladderGoalIds.has(g.id))?.id;
  const rows = goals
    .map((goal, index) => ({ goal, index }))
    .filter(({ goal }) => (opts.earlier ? isEarlier(goal, today) : !isEarlier(goal, today)));
  rows.sort((a, b) => {
    const pa = RANK[effectivePriority(a.goal, mainId)];
    const pb = RANK[effectivePriority(b.goal, mainId)];
    if (pa !== pb) return pa - pb;
    const oa = a.goal.order ?? a.index;
    const ob = b.goal.order ?? b.index;
    return oa !== ob ? oa - ob : a.index - b.index;
  });
  return rows.map(({ goal }) => ({ goal, priority: effectivePriority(goal, mainId), isMain: goal.id === mainId }));
}

// --- de zin onder de titel ---------------------------------------------------------------------

export function weeksWord(weeks: number): string {
  return `${weeks} ${weeks === 1 ? 'week' : 'weken'}`;
}

// "3 doelen. Het eerste is over 37 weken." Het eerste is het doel dat het eerst komt.
export function goalsSentence(listed: readonly ListedGoal[], today: string): string {
  if (listed.length === 0) return 'Nog geen doel.';
  const head = `${listed.length} ${listed.length === 1 ? 'doel' : 'doelen'}.`;
  const ahead = listed
    .map((l) => ({ l, timing: goalTiming(l.goal, today) }))
    .filter((x): x is { l: ListedGoal; timing: { state: 'ahead'; weeksLeft: number } } => x.timing.state === 'ahead')
    .sort((a, b) => (a.l.goal.targetDate ?? '').localeCompare(b.l.goal.targetDate ?? ''));
  if (ahead.length === 0) return head;
  const first = ahead[0].timing.weeksLeft;
  const when = `over ${weeksWord(first)}`;
  return listed.length === 1 ? `${head} Het is ${when}.` : `${head} Het eerste is ${when}.`;
}

// --- de seizoensstrook -------------------------------------------------------------------------

export interface SeasonFlag {
  id: string;
  name: string;
  date: string;
  priority: GoalPriority;
  // Waar de vlag staat op de strook, 0 (nu) tot 1.
  fraction: number;
  // Waar de afbouw begint, als het doel afbouw heeft.
  taperFraction?: number;
}

export interface SeasonGap {
  from: number;
  to: number;
  weeks: number;
}

export interface SeasonMonth {
  letter: string;
  fraction: number;
}

export interface SeasonStrip {
  start: string;
  end: string;
  flags: SeasonFlag[];
  gaps: SeasonGap[];
  months: SeasonMonth[];
}

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// De tijdlijn van nu tot het laatste doel, met een vlag per doel en de weken ertussen. Een doel
// zonder datum of dat al voorbij is staat er niet op. Aan het eind blijft een kleine marge, zodat
// de laatste vlag niet op de rand staat. Zonder doel met datum is er geen strook.
export function seasonStrip(listed: readonly ListedGoal[], today: string): SeasonStrip | undefined {
  const dated = listed
    .filter((l) => l.goal.targetDate && l.goal.targetDate >= today)
    .sort((a, b) => (a.goal.targetDate ?? '').localeCompare(b.goal.targetDate ?? ''));
  if (dated.length === 0) return undefined;
  const last = dated[dated.length - 1].goal.targetDate as string;
  const span = Math.max(daysBetween(today, last), 28);
  // Een marge van een achtste van de strook, hoogstens drie maanden, en dan naar het eind van die maand.
  const margin = Math.min(Math.round(span / 8), 92);
  const end = addDays(today, span + margin);
  const total = daysBetween(today, end);
  const at = (date: string) => Math.max(0, Math.min(1, daysBetween(today, date) / total));
  const flags: SeasonFlag[] = dated.map((l) => {
    const date = l.goal.targetDate as string;
    const taper = goalTaperDays(l.goal, l.priority);
    return { id: l.goal.id, name: l.goal.name, date, priority: l.priority, fraction: at(date), ...(taper > 0 ? { taperFraction: at(addDays(date, -taper)) } : {}) };
  });
  const gaps: SeasonGap[] = [];
  for (let i = 1; i < dated.length; i++) {
    const weeks = Math.round(daysBetween(dated[i - 1].goal.targetDate as string, dated[i].goal.targetDate as string) / 7);
    gaps.push({ from: flags[i - 1].fraction, to: flags[i].fraction, weeks });
  }
  const months: SeasonMonth[] = [];
  const startDate = new Date(`${today}T12:00:00`);
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1, 12);
  for (; ; cursor.setMonth(cursor.getMonth() + 1)) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`;
    if (iso > end) break;
    months.push({ letter: MONTH_LETTERS[cursor.getMonth()], fraction: at(iso) });
  }
  // Het eerste teken is de maand van nu, op de plek van "nu".
  months.unshift({ letter: MONTH_LETTERS[startDate.getMonth()], fraction: 0 });
  return { start: today, end, flags, gaps, months };
}

// --- het label in gewone woorden ---------------------------------------------------------------

export const PRIORITY_RULE: Record<GoalPriority, string> = {
  top: 'Hier train je naartoe.',
  voortop: 'Wil je goed doen onderweg.',
  verkenning: 'Je doet mee als training.',
};

const WORDS = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "Vier dagen", "twee weken": woorden tot tien, daarboven cijfers.
function spanWords(days: number): string {
  if (days >= 14 && days % 7 === 0) {
    const w = days / 7;
    return `${w <= 10 ? WORDS[w] : w} weken`;
  }
  return `${days <= 10 ? WORDS[days] : days} ${days === 1 ? 'dag' : 'dagen'}`;
}

// De regel onder het label: wat het zegt, en hoeveel rust er voor dit doel bij hoort.
export function labelLine(goal: TrainingGoal, priority: GoalPriority): string {
  if (priority === 'verkenning') return `${PRIORITY_RULE.verkenning} Geen rust ervoor.`;
  const taper = goalTaperDays(goal, priority);
  return taper > 0 ? `${PRIORITY_RULE[priority]} ${cap(spanWords(taper))} rustiger ervoor.` : PRIORITY_RULE[priority];
}

// "Voor jouw 10 km": wat dit label voor dit doel doet, in dagen. `now` is het label dat het doel nu
// heeft; de eerste regel zegt dan wat er verandert.
export function labelEffectLines(goal: TrainingGoal, priority: GoalPriority, now: GoalPriority): string[] {
  const kind = goalKindOf(goal);
  const lines: string[] = [];
  const taper = goalTaperDays(goal, priority);
  const taperNow = goalTaperDays(goal, now);
  if (priority === 'verkenning') {
    lines.push(taperNow > 0 && now !== priority ? `Geen afbouw meer, in plaats van ${taperNow} dagen` : 'Geen afbouw: je doet gewoon mee');
  } else if (priority !== now && taper !== taperNow) {
    lines.push(`${taper} ${taper === 1 ? 'dag' : 'dagen'} rustiger, in plaats van ${taperNow}`);
  } else if (taper > 0) {
    lines.push(`${taper} ${taper === 1 ? 'dag' : 'dagen'} rustiger ervoor`);
  }
  const recovery = goalRecoveryDays(goal);
  if (recovery > 0) lines.push(`${recovery} ${recovery === 1 ? 'dag' : 'dagen'} rustig herstel erna`);
  if (kind === 'run_race') {
    lines.push(priority === 'verkenning'
      ? 'Geen eigen blok, de wedstrijd staat wel op zijn dag'
      : 'Een eigen opbouw naar je wedstrijd, met een tempoloop en testlopen');
  } else if (priority === 'verkenning') {
    lines.push('Geen eigen opbouw, het telt mee als training');
  }
  return lines;
}

// --- slepen en hoger of lager ------------------------------------------------------------------

export interface MoveResult {
  // De nieuwe volgorde van alle doelen in de lijst.
  ids: string[];
  // Het label dat bij de nieuwe plek hoort.
  priority: GoalPriority;
  changesLabel: boolean;
  // De plek is anders dan eerst.
  changed: boolean;
}

// Verplaatst een doel naar een plek (0 is bovenaan) of een stap omhoog of omlaag. Omhoog neemt het
// label van wie er nu onder staat, omlaag dat van wie er nu boven staat, zodat het label nooit de
// lijst tegenspreekt. Het hoofddoel met de mijlpalen blijft Top en blijft in de groep van de Tops.
export function moveGoal(listed: readonly ListedGoal[], id: string, to: number | 'up' | 'down'): MoveResult {
  const from = listed.findIndex((l) => l.goal.id === id);
  const original = listed.map((l) => l.goal.id);
  if (from < 0) return { ids: original, priority: 'verkenning', changesLabel: false, changed: false };
  const moving = listed[from];
  const rest = listed.filter((_, i) => i !== from);
  let target = to === 'up' ? from - 1 : to === 'down' ? from + 1 : to;
  target = Math.max(0, Math.min(rest.length, target));
  if (moving.isMain) {
    const tops = rest.filter((l) => l.priority === 'top').length;
    target = Math.min(target, tops);
  }
  const next = [...rest.slice(0, target), moving, ...rest.slice(target)];
  const ids = next.map((l) => l.goal.id);
  let priority = moving.priority;
  if (!moving.isMain && target !== from) {
    const neighbour = target < from ? next[target + 1] : next[target - 1];
    if (neighbour) priority = neighbour.priority;
  }
  return { ids, priority, changesLabel: priority !== moving.priority, changed: ids.some((x, i) => x !== original[i]) };
}

// Wat er opgeslagen moet worden voor een nieuwe volgorde: alleen de doelen waarvan het getal verschilt.
export function orderPatch(listed: readonly ListedGoal[], ids: readonly string[]): { id: string; order: number }[] {
  const current = new Map(listed.map((l, index) => [l.goal.id, l.goal.order ?? index]));
  return ids.flatMap((id, order) => (current.get(id) === order ? [] : [{ id, order }]));
}

// --- de volgende stap --------------------------------------------------------------------------

export interface NextKeySession {
  sessionId: string;
  date: string;
  name: string;
  minutes: number;
}

// De zwaarste training van de komende twee weken die nog niet gedaan is: de stap die het meeste
// telt. Rustige trainingen tellen niet, een overgeslagen training ook niet. `minutesOf` geeft de
// lengte zoals de schermen die tonen; zonder valt het terug op de vaste lengte van de training.
export function nextKeySession(
  sessions: readonly PlannedSession[],
  templates: readonly SessionTemplate[],
  logs: readonly SessionLog[],
  today: string,
  minutesOf?: (session: PlannedSession, template: SessionTemplate) => number | undefined,
): NextKeySession | undefined {
  const until = addDays(today, 13);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const done = new Set(logs.map((l) => l.plannedSessionId).filter((x): x is string => !!x));
  let best: NextKeySession | undefined;
  for (const s of sessions) {
    const t = byId.get(s.templateId);
    if (!t || t.type === 'recovery' || s.status === 'skipped' || done.has(s.id)) continue;
    if (s.scheduledDate < today || s.scheduledDate > until) continue;
    const minutes = s.plannedMinutes ?? minutesOf?.(s, t) ?? 0;
    if (!best || minutes > best.minutes || (minutes === best.minutes && s.scheduledDate < best.date)) {
      best = { sessionId: s.id, date: s.scheduledDate, name: t.name, minutes };
    }
  }
  return best;
}

export { PRIORITY_NAME };
