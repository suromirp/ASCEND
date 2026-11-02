// ASCEND: twee trainingen van één week ruilen van dag (docs/beslissingen/2026-11-02-trainingen-wisselen.md).
// Ruilen is twee keer verplaatsen tegelijk, geen nieuwe regel: wie mag ruilen is wie mag slepen
// (dragEligibility), en wat botst komt uit dezelfde functies als Verplaatsen (findHeavyConflicts voor de
// 48 uur, keptDayReason voor rustdag en vrije dagen, dayHasRoomFor voor de tijd). Een schone ruil gaat
// meteen, met Ongedaan maken in de melding; anders vraagt het blad Akkoord en zegt het droog wat botst.
// Puur: geen React, geen IndexedDB.

import type { PlanLock, PlannedSession, SessionTemplate } from '../models/training';
import { dayHasRoomFor, findHeavyConflicts, isHeavyBeforeTest, isLegHeavyTemplate, isTestOnly, sharedHeavyAxes, testRestHours, tooCloseBeforeTest, type ScheduleProposal } from './scheduler';
import { keptDayReason, type KeptReason } from './moveSuggestions';
import { resolveEffectiveFullDuration } from './substitutions';
import { hasRole } from './templateRoles';
import { weekConcerns } from './weekConcerns';
import type { CheckInput } from './weekValidator';
import { dayOrder } from './dayOrder';
import { dayTitle, dragEligibility, type DayVerdict, type DragContext, type MoveDecision } from './weekDrag';
import { addDays, formatDateNL, mondayOfWeek, weekdayLongNL, weekdayOf } from '../utils/dates';

export const SWAP_TEST = 'Een testloop ruil je alleen met Akkoord.';
const SWAP_LEAVE = 'Deze training schoof opzij voor je vakantie. Ruil je hem, dan blijft hij op de nieuwe dag staan.';
export const SWAP_LEGS = 'Twee zware beendagen achter elkaar.';
const SWAP_ASK_TAIL = 'Als je loslaat, vraagt ASCEND eerst of je dat echt wilt.';
const CHIP_MAX = 28;
const UNSET_DAY_PAIRING_CAP_MINUTES = 120;

const dayLower = (date: string) => `${weekdayLongNL(date)} ${formatDateNL(date)}`;
const fit = (...options: string[]) => options.find((o) => o.length <= CHIP_MAX) ?? options[options.length - 1].slice(0, CHIP_MAX);

const KEPT_LINE: Record<Exclude<KeptReason, 'rest'>, string> = {
  off: 'is een vakantiedag',
  trek: 'is een tochtdag',
  light: 'blijft licht door je tocht',
  goal: 'ligt op of na je doel',
  ill: 'valt nog in je ziekte',
};

export type SwapCheck =
  | { ok: false; line: string }
  // asks: the dry facts that make it a question (empty: clean). hard: one of them is a clash, your rest day
  // or too little time; then the sheet has Liever niet as its main button, like a move that clashes. Only a
  // test or a training that moved for a holiday keeps Akkoord as the main button (as decideMove does).
  // clash: one of them is a heavy clash, which already says what two heavy leg days in a row would.
  // hints: a quiet fact that asks nothing ("Beter niet op één dag"). proposal: the two changes, swap: true.
  | { ok: true; asks: string[]; hard: boolean; clash: boolean; hints: string[]; proposal: ScheduleProposal };

// Mag `aId` met `bId` ruilen, en wat zegt de week erna? Beide mogen bewegen, staan op een andere dag van
// dezelfde week en geen van beide komt op een dag die dicht is.
export function checkSwap(ctx: DragContext, aId: string, bId: string): SwapCheck {
  const templateById = new Map(ctx.templates.map((t) => [t.id, t]));
  const a = ctx.sessions.find((s) => s.id === aId);
  const b = ctx.sessions.find((s) => s.id === bId);
  const ta = a ? templateById.get(a.templateId) : undefined;
  const tb = b ? templateById.get(b.templateId) : undefined;
  if (!a || !b || !ta || !tb || a.id === b.id) return { ok: false, line: 'Die training staat niet meer in je week.' };
  if (a.scheduledDate === b.scheduledDate) return { ok: false, line: 'Die twee staan al op dezelfde dag.' };
  if (mondayOfWeek(a.scheduledDate) !== mondayOfWeek(b.scheduledDate)) return { ok: false, line: 'Ruilen kan alleen binnen één week.' };
  const logged = new Set(ctx.logs.map((l) => l.plannedSessionId));
  const ea = dragEligibility(a, ta, { logged: logged.has(a.id), today: ctx.asOf });
  const eb = dragEligibility(b, tb, { logged: logged.has(b.id), today: ctx.asOf });
  if (!ea.ok || !eb.ok) return { ok: false, line: 'Deze training kan niet van dag ruilen.' };

  // Waar elk van de twee heen gaat, en wat daar al staat (zonder de twee zelf).
  const legs = [
    { s: a, t: ta, to: b.scheduledDate, ask: ea.askAlways },
    { s: b, t: tb, to: a.scheduledDate, ask: eb.askAlways },
  ];
  const rest = ctx.sessions.filter((s) => s.id !== a.id && s.id !== b.id && s.status !== 'skipped');
  for (const leg of legs) {
    const kept = keptDayReason(ctx.move, leg.t, leg.to, ctx.asOf);
    if (kept && kept !== 'rest') return { ok: false, line: `${dayTitle(leg.to)} ${KEPT_LINE[kept]}.` };
    if (rest.filter((s) => s.scheduledDate === leg.to).length >= 2) return { ok: false, line: `${dayTitle(leg.to)} zit vol.` };
  }

  const asks: string[] = [];
  let clash = false;
  // De 48 uur, de lange duurloop, de vaste sporten en een test: dezelfde controle als bij Verplaatsen, op
  // de week zoals hij na de ruil is. Elk paar één keer.
  const simulated = ctx.sessions.map((s) => (s.id === a.id ? { ...s, scheduledDate: b.scheduledDate } : s.id === b.id ? { ...s, scheduledDate: a.scheduledDate } : s));
  const told = new Set<string>();
  for (const leg of legs) {
    const conflicts = findHeavyConflicts(leg.s.id, leg.t, leg.to, simulated, templateById, ctx.logs)
      .filter((c) => !told.has([leg.s.id, c.id].sort().join('|')));
    if (conflicts.length === 0) continue;
    clash = true;
    conflicts.forEach((c) => told.add([leg.s.id, c.id].sort().join('|')));
    const others = conflicts.flatMap((c) => { const t = templateById.get(c.templateId); return t ? [t] : []; });
    const test = hasRole(leg.t, 'test') || others.some((t) => hasRole(t, 'test'));
    const legsBoth = others.some((t) => sharedHeavyAxes(leg.t, t).includes('lowerBodyLoad') || (isLegHeavyTemplate(leg.t) && isLegHeavyTemplate(t)));
    // Rest before a test: a heavy day too close before it says the hours (docs/beslissingen/2026-11-02-rust-voor-een-test.md).
    const restClash = conflicts.some((c) => {
      const ct = templateById.get(c.templateId);
      const cDate = simulated.find((x) => x.id === c.id)?.scheduledDate ?? c.scheduledDate;
      return !!ct && ((isTestOnly(leg.t) && isHeavyBeforeTest(ct) && tooCloseBeforeTest(cDate, leg.to)) || (isTestOnly(ct) && isHeavyBeforeTest(leg.t) && tooCloseBeforeTest(leg.to, cDate)));
    });
    const rule = restClash ? ` Liefst ${testRestHours()} uur tussen een zware dag en je test.` : test ? ' Je test heeft frisse benen nodig.' : legsBoth ? ' Liefst 48 uur ertussen.' : '';
    asks.push(`${leg.t.name} op ${dayLower(leg.to)} valt dicht op ${others.map((t) => t.name).join(' en ')}.${rule}`);
  }
  for (const leg of legs) {
    if (keptDayReason(ctx.move, leg.t, leg.to, ctx.asOf) === 'rest') asks.push(`${dayTitle(leg.to)} is je rustdag.`);
  }
  // Past de tijd op de nieuwe dag?
  for (const leg of legs) {
    const there = rest.filter((s) => s.scheduledDate === leg.to);
    if (dayHasRoomFor(leg.to, leg.t, there, templateById, ctx.program, ctx.dailyTimeBudget, ctx.sameDayPairingPreference)) continue;
    const own = resolveEffectiveFullDuration(leg.t, leg.to, ctx.program);
    if (there.length === 0) { asks.push(`${leg.t.name} duurt ${own} min, meer dan je op ${dayLower(leg.to)} wilt trainen.`); continue; }
    const total = own + there.reduce((sum, s) => { const t = templateById.get(s.templateId); return t ? sum + resolveEffectiveFullDuration(t, leg.to, ctx.program) : sum; }, 0);
    const askedFits = ctx.sameDayPairingPreference !== 'never' && !ctx.dailyTimeBudget?.[weekdayOf(leg.to)] && total <= UNSET_DAY_PAIRING_CAP_MINUTES;
    if (askedFits) continue;
    asks.push(ctx.sameDayPairingPreference === 'never' ? 'Je wilt geen twee trainingen op één dag.' : `Samen ${total} min op ${dayLower(leg.to)}, meer dan je die dag wilt trainen.`);
  }
  const hard = asks.length > 0;
  // Twee trainingen samen op een dag die je beter niet combineert: het stille feit, net als bij slepen.
  const hints: string[] = [];
  for (const leg of legs) {
    const there = simulated.filter((s) => s.id !== leg.s.id && s.status !== 'skipped' && s.scheduledDate === leg.to);
    if (there.length === 0) continue;
    const advice = dayOrder([...there, { ...leg.s, scheduledDate: leg.to }], simulated.filter((s) => s.scheduledDate === addDays(leg.to, 1)), templateById);
    if (!advice?.avoid) continue;
    const names = there.flatMap((s) => { const t = templateById.get(s.templateId); return t ? [t.name] : []; }).join(' en ');
    hints.push(`${leg.t.name} komt op ${dayLower(leg.to)} samen met ${names}. Beter niet op één dag.`);
  }
  for (const leg of legs) {
    if (leg.ask === true) { if (!asks.includes(SWAP_TEST)) asks.push(SWAP_TEST); }
    else if (leg.ask) { if (!asks.includes(SWAP_LEAVE)) asks.push(SWAP_LEAVE); }
  }

  const proposal: ScheduleProposal = {
    changes: legs.map((leg) => ({ sessionId: leg.s.id, templateId: leg.t.id, templateName: leg.t.name, fromDate: leg.s.scheduledDate, toDate: leg.to })),
    reason: asks.length > 0 ? asks.join(' ') : `${ta.name} en ${tb.name} ruilen van dag.`,
    resolved: !hard,
    swap: true,
  };
  return { ok: true, asks, hard, clash, hints, proposal };
}

// Het ene besluit voor de ruil, uit het blad en uit het slepen. Schoon gaat meteen; anders het blad, met dezelfde
// opbouw als Verplaatsen: botst het (de 48 uur, je rustdag, te weinig tijd, twee zware beendagen), dan is Liever
// niet de hoofdknop en "Toch ruilen" de tweede keus (resolved: false); alleen een test of een training die
// opzij schoof voor een vakantie vraagt gewoon Akkoord (resolved: true). `legsClose`: twee zware beendagen achter elkaar die de regels niet als botsing zien
// (legsCloseAfterSwap), dan vraagt het ook; zegt een botsing van de 48 uur het al, dan niet nog een keer.
export function decideSwap(check: SwapCheck, opts: { legsClose?: boolean } = {}): MoveDecision {
  if (!check.ok) return { action: 'none', proposal: { changes: [], reason: check.line, resolved: false } };
  const legs = !!opts.legsClose && !check.clash;
  const asks = legs ? [SWAP_LEGS, ...check.asks] : check.asks;
  if (asks.length === 0) return { action: 'apply', proposal: check.proposal };
  return { action: 'ask', proposal: { ...check.proposal, resolved: !(check.hard || legs), reason: asks.join(' ') } };
}

export interface SwapOption {
  session: PlannedSession;
  template: SessionTemplate;
  // ok: past zonder vraag. warn: vraagt eerst (het blad zegt waarom).
  tone: 'ok' | 'warn';
  // De korte regel onder de naam in het blad: "vraagt eerst Akkoord" of "beter niet op één dag".
  hint?: string;
}

// De andere trainingen van dezelfde week waarmee deze kan ruilen, in de volgorde van de dagen.
export function swapOptions(ctx: DragContext, sessionId: string): SwapOption[] {
  const a = ctx.sessions.find((s) => s.id === sessionId);
  if (!a) return [];
  const monday = mondayOfWeek(a.scheduledDate);
  const templateById = new Map(ctx.templates.map((t) => [t.id, t]));
  return ctx.sessions
    .filter((s) => s.id !== a.id && s.scheduledDate !== a.scheduledDate && mondayOfWeek(s.scheduledDate) === monday)
    .sort((x, y) => x.scheduledDate.localeCompare(y.scheduledDate) || x.order - y.order)
    .flatMap((s): SwapOption[] => {
      const template = templateById.get(s.templateId);
      const check = checkSwap(ctx, a.id, s.id);
      if (!template || !check.ok) return [];
      const hint = check.asks.length > 0 ? 'vraagt eerst Akkoord' : check.hints.length > 0 ? 'beter niet op één dag' : undefined;
      return [{ session: s, template, tone: check.asks.length > 0 ? 'warn' : 'ok', ...(hint ? { hint } : {}) }];
    });
}

// Slepen: een dag met precies één training, en die mag bewegen, wordt Ruilen in plaats van "Samen met".
// Staan er twee of meer, of mag die ene niet bewegen, dan blijft de dag zoals dayVerdicts hem zag.
export function withSwapVerdicts(ctx: DragContext, sessionId: string, verdicts: DayVerdict[]): DayVerdict[] {
  const a = ctx.sessions.find((s) => s.id === sessionId);
  const templateById = new Map(ctx.templates.map((t) => [t.id, t]));
  const ta = a ? templateById.get(a.templateId) : undefined;
  if (!a || !ta) return verdicts;
  const logged = new Set(ctx.logs.map((l) => l.plannedSessionId));
  if (!dragEligibility(a, ta, { logged: logged.has(a.id), today: ctx.asOf }).ok) return verdicts;
  return verdicts.map((v) => {
    if (v.date === a.scheduledDate || v.date < ctx.asOf) return v;
    const there = ctx.sessions.filter((s) => s.id !== a.id && s.status !== 'skipped' && s.scheduledDate === v.date);
    if (there.length !== 1) return v;
    const b = there[0];
    const tb = templateById.get(b.templateId);
    if (!tb || !dragEligibility(b, tb, { logged: logged.has(b.id), today: ctx.asOf }).ok) return v;
    const check = checkSwap(ctx, a.id, b.id);
    if (!check.ok) return v;
    const asks = check.asks.join(' ');
    const hints = check.hints.length > 0 ? ` ${check.hints.join(' ')}` : '';
    return {
      date: v.date,
      kind: 'swap',
      droppable: true,
      tone: asks ? 'warn' : 'ok',
      chip: fit(`Ruilen met ${tb.name}`, 'Ruilen'),
      line: `${dayTitle(v.date)}. Ruilen met ${tb.name}, die gaat naar ${dayLower(a.scheduledDate)}.${asks ? ` ${asks} ${SWAP_ASK_TAIL}` : hints}`,
      ask: !!asks,
      ...(asks ? { askReason: asks } : {}),
      swapWithId: b.id,
    };
  });
}

// De twee rijen na de ruil: zoals Verplaatsen ze schrijft (AppDataContext#applyProposal). Jouw slot en
// waar hij vandaan kwam; terug op zijn eigen dag is hij weer van het plan, zonder slot.
export function swapRows(a: PlannedSession, b: PlannedSession, lock: PlanLock): [PlannedSession, PlannedSession] {
  const moved = (s: PlannedSession, to: string): PlannedSession => (to === s.movedFromDate
    ? { ...s, scheduledDate: to, weekStartDate: mondayOfWeek(to), status: 'planned', movedFromDate: undefined, lock: undefined }
    : { ...s, scheduledDate: to, weekStartDate: mondayOfWeek(to), status: 'moved', movedFromDate: s.movedFromDate ?? s.scheduledDate, lock });
  return [moved(a, b.scheduledDate), moved(b, a.scheduledDate)];
}

// Geeft de ruil twee zware beendagen achter elkaar die de weekcontrole meldt (als de jouwe, de ruil zet je
// slot) en die er eerst niet waren? Dezelfde controle als legsCloseAfterMove, met beide verplaatst.
export function legsCloseAfterSwap(input: CheckInput, aId: string, bId: string): boolean {
  const a = input.sessions.find((s) => s.id === aId);
  const b = input.sessions.find((s) => s.id === bId);
  if (!a || !b) return false;
  const weekStart = mondayOfWeek(a.scheduledDate);
  const pairs = (sessions: PlannedSession[]) => new Set(weekConcerns({ ...input, sessions }, weekStart)
    .filter((c) => c.rule === 'LEG-SPACING' && (c.finding.sessionIds.includes(aId) || c.finding.sessionIds.includes(bId)))
    .map((c) => [...c.finding.sessionIds].sort().join(',')));
  const before = pairs(input.sessions);
  const lock = { by: 'user' as const, at: 'voorbeeld' };
  const after = input.sessions.map((s) => (s.id === aId
    ? { ...s, scheduledDate: b.scheduledDate, weekStartDate: weekStart, status: 'moved' as const, lock }
    : s.id === bId ? { ...s, scheduledDate: a.scheduledDate, weekStartDate: weekStart, status: 'moved' as const, lock } : s));
  return [...pairs(after)].some((p) => !before.has(p));
}
