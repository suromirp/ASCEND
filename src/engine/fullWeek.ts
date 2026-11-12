// ASCEND: een week die te vol is nadat er dagen wegvielen (regel WEEK-FULL,
// docs/beslissingen/2026-11-12-week-na-gemiste-dagen.md).
//
// Valt er in je week een training weg (gemist, overgeslagen of naar later gezet), dan kijkt deze regel naar de
// rest van de week, van vandaag tot en met zondag:
// - hoeveel trainingen er nog staan tegen de dagen die over zijn;
// - dagen met twee trainingen;
// - loopdagen op rij en zware dagen achter elkaar;
// - wat de weekcontrole (engine/weekValidator.ts) in die dagen vindt (alleen voor de keuze welke training vervalt).
// Is de rest te vol, dan komt er één voorstel met een advies welke training vervalt, de reden in één zin en
// een tweede keuze. Eerst wat ASCEND er zelf als extra bij zette, dan wat het minst telt voor je doel. Nooit
// een test, een wedstrijd, je sleuteltraining of iets wat je zelf neerzette. Er vervalt niets zonder Akkoord:
// vervallen is `status: 'skipped'` via het voorstel, de rij blijft staan. Na Liever niet blijft de week zoals
// hij is, vraagt ASCEND het die week niet meer en zegt Week het in een gewone regel.
//
// Dezelfde toets houdt de extra training tegen (engine/extraRun.ts): geen extra in een week die al iets
// verloor en waar de rest vol is of er vol van wordt.
//
// Puur: geen React, geen opslag.

import type { Advice, AdviceOption } from './adviceShared';
import type { LeavePeriod } from '../models/leave';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, formatWeekdayDateNL, mondayOfWeek, weekDates } from '../utils/dates';
import { makeId } from '../utils/id';
import { isDone } from './adviceShared';
import type { IllnessEpisode } from '../models/illness';
import { activeIllness, isIllnessDay, recoveryRamp } from './illness';
import { isKeyFor, type KeyFocus } from './keySession';
import { leaveDays } from './leave';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { logSport, templateSport } from './sports';
import { hasRole, isTestOrRace } from './templateRoles';
import { validateWeeks, type CheckInput, type CheckRule } from './weekValidator';

export const FULL_WEEK_RULE = 'WEEK-FULL';
// Twee dagen met twee trainingen, of twee trainingen meer dan er dagen zijn.
export const DOUBLE_DAY_LIMIT = 2;
export const OVER_LIMIT = 2;
// Vier loopdagen op rij; drie zware dagen achter elkaar.
export const RUN_STREAK_LIMIT = 4;
export const HEAVY_STREAK_LIMIT = 3;
// Wat de weekcontrole al kent en wat over drukte gaat: weegt mee in de keuze welke training vervalt.
const CROWD_RULES: readonly CheckRule[] = ['TWO-HARD-RUNS', 'DAY-FULL', 'LEG-SPACING', 'HARD-DAYS'];

// Per week, zodat Liever niet voor die week blijft gelden.
export const fullWeekId = (anyDay: string) => `week-full:${mondayOfWeek(anyDay)}`;

// Afwezig of iets anders dan uit: aan (het advies). Oude back-ups hebben het veld niet.
export const resolveFullWeekAsk = (value: unknown): boolean => value !== false;

export interface FullWeekInput {
  today: string;
  sessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  leave?: LeavePeriod[];
  keyFocus?: KeyFocus;
  // Ziektedagen zijn geen verlies; ziek of net beter zwijgt de regel (engine/illness.ts).
  illnessEpisodes?: IllnessEpisode[];
  // Rijen die een geaccepteerd voorstel van ASCEND liet vervallen: geen verlies van jou.
  removedByPlanIds?: ReadonlySet<string>;
  // Wat de weekcontrole verder nodig heeft (rustdag, tijd per dag, twee trainingen op een dag).
  check?: Partial<Omit<CheckInput, 'sessions' | 'logs' | 'templates' | 'today'>>;
}

export interface WeekLoss {
  date: string;
  name: string;
  how: 'missed' | 'moved';
}

type Ctx = ReturnType<typeof contextOf>;

function contextOf(input: FullWeekInput) {
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  const monday = mondayOfWeek(input.today);
  const sunday = addDays(monday, 6);
  const days = leaveDays(input.leave);
  const tpl = (s: Pick<PlannedSession, 'templateId'>) => byId.get(s.templateId);
  // Een wandeldag van je tocht is de tocht zelf, geen training van de week.
  const trekWalk = (s: PlannedSession) => days.get(s.scheduledDate)?.kind === 'trek' && tpl(s)?.type === 'hiking';
  const trains = (s: PlannedSession) => { const t = tpl(s); return !!t && t.type !== 'recovery' && !trekWalk(s); };
  // Gedaan zoals overal in de adviezen: een eigen log, of dezelfde training los gelogd binnen twee dagen.
  const logs = [...input.logs];
  const done = (s: PlannedSession) => isDone(s, logs, logged);
  return { byId, logged, monday, sunday, days, tpl, trains, done };
}

// Wat de week van vandaag al verloor:
// - gemist: een training op een dag die voorbij is en niet gedaan (ook een die je zelf oversloeg);
// - naar later: een training die jij of een voorstel van een voorbije dag van deze week naar later zette,
//   als die dag daarna leeg bleef (een ruil van twee dagen is geen verlies).
// Geen verlies: een herstelwandeling, wat ASCEND zelf wegliet of verving (Minder, zonder sportschool, een
// geaccepteerd voorstel), en een vakantie-, tocht- of ziektedag.
export function weekLoss(input: FullWeekInput): WeekLoss[] {
  const ctx = contextOf(input);
  const { monday, sunday } = ctx;
  const { today } = input;
  const out: WeekLoss[] = [];
  const nameOf = (s: PlannedSession) => ctx.tpl(s)?.name ?? 'Training';
  const away = (d: string) => { const kind = ctx.days.get(d)?.kind; return kind === 'off' || kind === 'trek' || isIllnessDay(d, input.illnessEpisodes, today); };
  const inWeek = (d: string) => d >= monday && d <= sunday;
  const usedDay = (d: string, except: string) => input.sessions.some((o) => o.id !== except && o.status !== 'skipped' && o.scheduledDate === d && ctx.trains(o))
    || input.logs.some((l) => l.completedDate === d && l.type !== 'recovery');
  for (const s of input.sessions) {
    const from = s.movedFromDate;
    if (!inWeek(s.scheduledDate) && !(from && inWeek(from))) continue;
    if (!ctx.trains(s) || s.amount?.change === 'left_out' || s.leave?.role === 'dropped' || input.removedByPlanIds?.has(s.id)) continue;
    if (inWeek(s.scheduledDate) && s.scheduledDate < today && !away(s.scheduledDate) && !ctx.done(s)) out.push({ date: s.scheduledDate, name: nameOf(s), how: 'missed' });
    if (from && s.lock && s.status !== 'skipped' && inWeek(from) && from < today && s.scheduledDate > from && !away(from) && !usedDay(from, s.id)) out.push({ date: from, name: nameOf(s), how: 'moved' });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export interface WeekShape {
  // De open trainingen van vandaag tot en met zondag, en de dagen waarop je nog kunt trainen.
  trainings: number;
  days: number;
  // Dagen met twee of meer trainingen.
  doubles: string[];
  runStreak: number;
  heavyStreak: number;
  // Wat de weekcontrole in deze dagen vindt over drukte.
  crowd: number;
  full: boolean;
}

// De langste reeks dagen op rij waarvan er minstens twee nog komen (vandaag telt). Een reeks die al bijna
// voorbij is, verandert niet meer door iets te laten vallen: op de laatste dag telt hij niet.
function streak(days: string[], on: (day: string) => boolean, today: string): number {
  let best = 0;
  let run = 0;
  let ahead = 0;
  for (const day of days) {
    if (!on(day)) { run = 0; ahead = 0; continue; }
    run += 1;
    if (day >= today) ahead += 1;
    if (ahead >= 2 && run > best) best = run;
  }
  return best;
}

// De rest van de week van vandaag, voor een gegeven lijst sessies (ook een nagespeelde, met een training erbij
// of eraf). `full` zegt of de rest te vol is; of de week iets verloor, staat daar los van (weekLoss).
export function weekShape(input: FullWeekInput, sessions: readonly PlannedSession[] = input.sessions): WeekShape {
  const ctx = contextOf({ ...input, sessions });
  const { monday, sunday, byId } = ctx;
  const { today } = input;
  const open = sessions.filter((s) => s.status !== 'skipped' && !ctx.done(s) && s.scheduledDate >= today && s.scheduledDate <= sunday && ctx.trains(s));
  const logsOn = (day: string) => input.logs.filter((l) => l.completedDate === day && l.type !== 'recovery');
  const week = weekDates(monday);
  const left = week.filter((d) => d >= today);
  const perDay = new Map(left.map((d) => [d, open.filter((s) => s.scheduledDate === d)]));
  // Vandaag telt mee wat je al deed: een tweede training erbij maakt het een dubbele dag.
  const countOn = (d: string) => (perDay.get(d)?.length ?? 0) + (d === today ? logsOn(d).length : 0);
  const blocked = (d: string) => { const kind = ctx.days.get(d)?.kind; return kind === 'off' || kind === 'trek'; };
  // Een dag waarop je nog kunt trainen: geen vakantie of tocht, en vandaag alleen als er nog iets open staat
  // of je nog niets deed.
  const days = left.filter((d) => !blocked(d) && !(d === today && logsOn(d).length > 0 && (perDay.get(d)?.length ?? 0) === 0)).length;
  const doubles = left.filter((d) => countOn(d) >= 2);

  const templatesOn = (d: string): SessionTemplate[] => [
    ...(perDay.get(d) ?? []).map((s) => byId.get(s.templateId)),
    ...(d <= today ? logsOn(d).map((l) => byId.get(l.templateId)) : []),
  ].filter((t): t is SessionTemplate => !!t);
  const ranOn = (d: string) => (perDay.get(d) ?? []).some((s) => { const t = byId.get(s.templateId); return !!t && templateSport(t) === 'running'; })
    || (d <= today && logsOn(d).some((l) => logSport(l) === 'running'));
  const heavyOn = (d: string) => templatesOn(d).some((t) => isHardRun(t) || isLegHeavyTemplate(t) || hasRole(t, 'long'));
  const runStreak = streak(week, ranOn, today);
  const heavyStreak = streak(week, heavyOn, today);
  const over = open.length - days;

  let crowd = 0;
  if (over >= 1) {
    const ids = new Set(open.map((s) => s.id));
    const check: CheckInput = { ...input.check, sessions: [...sessions], logs: [...input.logs], templates: [...input.templates], today, leave: input.leave, reportYours: true };
    crowd = validateWeeks(check, new Set([monday])).filter((f) => CROWD_RULES.includes(f.rule) && f.sessionIds.some((id) => ids.has(id))).length;
  }
  // Wat de weekcontrole vindt maakt de week niet vol: dat staat al als eigen melding in Week, met een eigen
  // voorstel. Het weegt wel mee in de keuze welke training vervalt (weight).
  const full = doubles.length >= DOUBLE_DAY_LIMIT || over >= OVER_LIMIT || runStreak >= RUN_STREAK_LIMIT || heavyStreak >= HEAVY_STREAK_LIMIT;
  return { trainings: open.length, days, doubles, runStreak, heavyStreak, crowd, full };
}

// Hoe vol, als één getal: minder is rustiger. Alleen om twee uitkomsten te vergelijken.
const weight = (s: WeekShape) => s.doubles.length * 2 + Math.max(0, s.trainings - s.days) + Math.max(0, s.runStreak - (RUN_STREAK_LIMIT - 1)) + Math.max(0, s.heavyStreak - (HEAVY_STREAK_LIMIT - 1)) + s.crowd;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// "6 trainingen in 4 dagen, 2 dagen met twee trainingen en 4 loopdagen op rij".
export function shapeText(s: WeekShape): string {
  const parts = [`${count(s.trainings, 'training', 'trainingen')} in ${count(s.days, 'dag', 'dagen')}`];
  if (s.doubles.length > 0) parts.push(`${count(s.doubles.length, 'dag', 'dagen')} met twee trainingen`);
  if (s.runStreak >= RUN_STREAK_LIMIT) parts.push(`${s.runStreak} loopdagen op rij`);
  if (s.heavyStreak >= HEAVY_STREAK_LIMIT) parts.push(`${s.heavyStreak} zware dagen achter elkaar`);
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} en ${parts.at(-1)}`;
}

export interface FullWeekState {
  lost: WeekLoss[];
  shape: WeekShape;
}

// De week van vandaag verloor iets en de rest is te vol. Anders undefined.
export function fullWeek(input: FullWeekInput): FullWeekState | undefined {
  const lost = weekLoss(input);
  if (lost.length === 0) return undefined;
  const shape = weekShape(input);
  return shape.full ? { lost, shape } : undefined;
}

// Wordt de rest van deze week te vol met deze training erbij, in een week die al iets verloor? Voor de extra
// training (engine/extraRun.ts): die komt er dan niet bij.
export function fullWithExtra(input: FullWeekInput, extra: { templateId: string; date: string }): boolean {
  if (mondayOfWeek(extra.date) !== mondayOfWeek(input.today) || weekLoss(input).length === 0) return false;
  const row: PlannedSession = { id: 'full-week-extra', templateId: extra.templateId, scheduledDate: extra.date, weekStartDate: mondayOfWeek(extra.date), status: 'planned', order: 99 };
  return weekShape(input, [...input.sessions, row]).full;
}

// --- het advies: welke training vervalt ---------------------------------------

// 0: ASCEND zette hem er zelf als extra bij. 1: een rustige loop. 2: iets anders dat niet zwaar is.
// 3: een harde loop of een zware beendag.
type Tier = 0 | 1 | 2 | 3;

interface Candidate {
  session: PlannedSession;
  template: SessionTemplate;
  tier: Tier;
  after: WeekShape;
}

const REASON: Record<Tier, string> = {
  0: 'die kwam er als extra bij',
  1: 'een rustige loop kost je doel het minst',
  2: 'die telt deze week het minst voor je doel',
  3: 'zwaar, maar niet je sleuteltraining',
};

function tierOf(s: PlannedSession, t: SessionTemplate): Tier {
  // Erbij gekomen leid je af uit het voorstel dat hem neerzette, niet uit de rol alleen: de rol `extra` staat ook
  // op de zaterdagloop van het raceblok en op de herstelloop van een golfweek.
  if ((hasRole(t, 'extra') && s.lock?.by === 'proposal' && !s.blockQuiet && !s.raceBlock) || s.amount?.change === 'extra') return 0;
  if (isHardRun(t) || isLegHeavyTemplate(t) || hasRole(t, 'long')) return 3;
  return templateSport(t) === 'running' ? 1 : 2;
}

// Van jou: je zette of verplaatste hem zelf, je haalde hem in, of het is een vaste afspraak.
const isYours = (s: PlannedSession) => s.lock?.by === 'user' || (s.status === 'moved' && !s.lock) || !!s.catchUp || !!s.fixed;

function candidates(input: FullWeekInput, ctx: Ctx, pick: (s: PlannedSession) => boolean, taken: ReadonlySet<string>): Candidate[] {
  const before = weight(weekShape(input));
  return input.sessions
    .filter((s) => s.status !== 'skipped' && !ctx.done(s) && s.scheduledDate >= input.today && s.scheduledDate <= ctx.sunday && ctx.trains(s) && !taken.has(s.id) && pick(s))
    .map((s) => ({ session: s, template: ctx.tpl(s)! }))
    // Nooit een test, een wedstrijd of je sleuteltraining, en niets wat het raceblok voor je wedstrijd neerzette.
    .filter(({ session, template }) => !isTestOrRace(template) && !isKeyFor(template, input.keyFocus) && !session.blockQuiet && !session.raceBlock)
    .map(({ session, template }): Candidate => ({ session, template, tier: tierOf(session, template), after: weekShape(input, input.sessions.filter((o) => o.id !== session.id)) }))
    // Alleen wat de week ook rustiger maakt.
    .filter((c) => weight(c.after) < before)
    .sort((a, b) => a.tier - b.tier || Number(a.after.full) - Number(b.after.full) || weight(a.after) - weight(b.after)
      || b.session.scheduledDate.localeCompare(a.session.scheduledDate) || a.session.id.localeCompare(b.session.id));
}

const lower = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

// Eén zin, hoe de dag ook wegviel: "Je verloor deze week een dag."
function lostText(lost: WeekLoss[]): string {
  const days = new Set(lost.map((l) => l.date)).size;
  return days === 1 ? 'Je verloor deze week een dag.' : `Je verloor deze week ${days} dagen.`;
}

const WHY = 'ASCEND kijkt hiernaar zodra er in je week een training wegviel of naar later ging. Vol is: twee dagen met twee trainingen, twee trainingen meer dan er dagen over zijn, vier loopdagen op rij of drie zware dagen achter elkaar. Het advies kiest eerst de extra training die je via een voorstel kreeg, dan wat het minst telt voor je doel. Een test, een wedstrijd, je sleuteltraining en wat je zelf neerzette staan nooit in het advies. Eerst een voorstel, pas na Akkoord verandert er iets. Na Liever niet vraagt ASCEND het deze week niet meer.';

function dropProposal(c: Candidate, title: string, consequences: string): PlanChangeProposal {
  const item: PlanChangeItem = {
    plannedSessionId: c.session.id, action: 'remove', fromDate: c.session.scheduledDate, toDate: c.session.scheduledDate,
    reason: 'Je week is vol nadat er een dag wegviel.', generatedBy: ['engine/fullWeek.ts', FULL_WEEK_RULE],
  };
  return { id: makeId('planchange'), trigger: 'session_skipped', issue: title, changes: [item], alternatives: [], consequences, explanation: WHY, createdAt: new Date().toISOString() };
}

export interface FullWeekAdviceInput extends FullWeekInput {
  respondedIds: ReadonlySet<string>;
  // De instelling "Vragen als je week te vol wordt".
  ask: boolean;
  // Sessies waar een ander voorstel van vandaag al over gaat.
  taken?: ReadonlySet<string>;
}

// Het voorstel bij een volle week: hoogstens één, per week. Zonder training die ASCEND mag aanraden alleen
// een zin (Begrepen), met de lichtste van wat je zelf neerzette als tip.
export function fullWeekAdvice(input: FullWeekAdviceInput): Advice[] {
  if (!input.ask) return [];
  const id = fullWeekId(input.today);
  if (input.respondedIds.has(id)) return [];
  // Ziek of net beter: eerst herstellen, dan pas de vraag over de week.
  if (activeIllness(input.illnessEpisodes) || recoveryRamp(input.illnessEpisodes, input.today)) return [];
  const state = fullWeek(input);
  if (!state) return [];
  const ctx = contextOf(input);
  const taken = input.taken ?? new Set<string>();
  const title = 'Je week is vol';
  const facts = shapeText(state.shape);
  const lead = `${lostText(state.lost)} Tot en met zondag staan er nog ${facts}.`;
  const brief = `Nog ${count(state.shape.trainings, 'training', 'trainingen')} in ${count(state.shape.days, 'dag', 'dagen')}`;
  const base = { id, trigger: 'plan_update' as const, ruleId: FULL_WEEK_RULE, title, lead, brief, why: WHY, priority: 2 };

  const list = candidates(input, ctx, (s) => !isYours(s), taken);
  if (list.length === 0) {
    const own = candidates(input, ctx, isYours, taken).filter((c) => !c.session.fixed)[0];
    const tip = own ? ` Wil je lucht, dan ${own.tier === 3 ? `komt ${lower(own.template.name)} op ${formatWeekdayDateNL(own.session.scheduledDate)} als eerste in aanmerking` : `kost ${lower(own.template.name)} op ${formatWeekdayDateNL(own.session.scheduledDate)} je doel het minst`}. Overslaan doe je zelf in Week.` : ' Wil je lucht, dan sla je zelf een training over in Week.';
    return [{ ...base, effect: `${lead} ASCEND raadt niets aan om te laten vallen: wat er nog staat zette je zelf neer, is je sleuteltraining of een test, of maakt je week niet rustiger als het vervalt.${tip}` }];
  }
  // Hoogstens twee zinnen: wat vervalt en waarom, en wat er dan staat. Blijft de week ook dan vol, dan staat dat er.
  const afterOf = (c: Candidate) => (c.after.full ? `Ook dan is je week nog vol: ${shapeText(c.after)}.` : `Dan staan er nog ${shapeText(c.after)}.`);
  const sayOf = (c: Candidate) => `${c.template.name} van ${formatWeekdayDateNL(c.session.scheduledDate)} vervalt: ${REASON[c.tier]}. ${afterOf(c)}`;
  const build = (c: Candidate): AdviceOption => {
    const when = formatWeekdayDateNL(c.session.scheduledDate);
    return { label: `${c.template.name} van ${when} vervalt`, effect: `${lead} ${sayOf(c)}`, proposal: dropProposal(c, title, `${c.template.name} van ${when} vervalt. ${afterOf(c)}`) };
  };
  const built = list.slice(0, 2).map(build);
  // Het blad toont met een voorstel de feitregel, de wijzigingen en de tip: daar staan het advies en de reden.
  return [{ ...base, tip: sayOf(list[0]), effect: built[0].effect, proposal: built[0].proposal, options: built.length > 1 ? built : undefined, firstOptionNote: 'het advies' }];
}

// De gewone regel op Week: de week is vol. Staat het voorstel nog open op Vandaag ('open'), dan verwijst hij
// daarheen; na Liever niet ('declined') zegt hij dat jij alles liet staan. Na Akkoord ('accepted') geen regel:
// je volgde het advies. Alleen voor de week van vandaag.
export function fullWeekLine(input: FullWeekInput, weekStart: string, status?: 'open' | 'declined' | 'accepted'): string | undefined {
  if (status === 'accepted' || mondayOfWeek(weekStart) !== mondayOfWeek(input.today)) return undefined;
  const state = fullWeek(input);
  if (!state) return undefined;
  const fact = `Je week is vol: ${shapeText(state.shape)}.`;
  if (status === 'declined') return `${fact} Je liet alles staan.`;
  if (status === 'open') return `${fact} Op Vandaag staat een voorstel.`;
  return fact;
}
