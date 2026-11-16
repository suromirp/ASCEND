// ASCEND: een training slepen in Week (docs/visie/Slepen in Week.md). Slepen is een snellere hand,
// geen nieuwe regel: wie mag slepen, wat elke dag zegt en wat loslaten doet komt uit de regels die er
// al zijn (het slot, de 48 uur tussen zware beendagen, de rustdag, de vrije dagen). Puur: geen React,
// geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { LeaveKind, LeavePeriod, PlannedLeaveMark } from '../models/leave';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { dayOrder } from './dayOrder';
import { dayHasRoomFor, findHeavyConflicts, HEAVY_AXIS_LABEL, isHeavyBeforeTest, isTestOnly, sharedHeavyAxes, testRestHours, tooCloseBeforeTest, type ScheduleProposal } from './scheduler';
import { firstSentence, keptAskLine, keptDay, moveRules, type KeptReason, type MoveContext } from './moveSuggestions';
import { DAY_CAUSE_TEXT } from './dayRules';
import { resolveEffectiveFullDuration } from './substitutions';
import { lockLevel } from './weekValidator';
import { weekConcerns } from './weekConcerns';
import type { CheckInput, CheckRule } from './weekValidator';
import { hasRole } from './templateRoles';
import { addDays, isoWeekday, mondayOfWeek, weekdayLongNL, weekdayOf, formatDateNL, weekDates } from '../utils/dates';
import { capitalize } from '../utils/capitalize';

// --- wie mag slepen ----------------------------------------------------------------
type DragRefusal = 'history' | 'skipped' | 'rest' | 'race' | 'leave';
// askAlways: true (a test, with its own sentence) or the sentence the Akkoord sheet shows.
export type DragEligibility = { ok: true; askAlways: boolean | string } | { ok: false; reason: DragRefusal };

// Nooit: wat gelogd of voorbij is (lockLevel 0), een overgeslagen training, een rustdag of
// herstelwandeling, een wedstrijd (die gaat via het doel op Ascend). Wat een periode neerzette mag wel, met Akkoord. Een test mag, maar loslaten vraagt altijd om Akkoord.
// `periods`: the stored periods, so the sentence names the period that moved it (Lookout, 16 november). Without them
// it says "je vakantie", as before.
export function dragEligibility(session: PlannedSession, template: SessionTemplate, args: { logged: boolean; today: string; periods?: LeavePeriod[] }): DragEligibility {
  const loggedIds = new Set<string | undefined>(args.logged ? [session.id] : []);
  if (lockLevel(session, loggedIds, args.today) === 0) return { ok: false, reason: 'history' };
  if (session.status === 'skipped') return { ok: false, reason: 'skipped' };
  if (template.type === 'recovery') return { ok: false, reason: 'rest' };
  if (hasRole(template, 'race')) return { ok: false, reason: 'race' };
  // Een training die je periode neerzette of die opzij schoof voor je vakantie mag je slepen, altijd met
  // Akkoord (het blad toont wat er gebeurt). Het merkteken van de periode blijft staan: de periode blijft de
  // reden en haalt hem weg als de periode weggaat. Wat de periode liet vervallen is overgeslagen en heeft geen greep.
  if (session.leave) return { ok: true, askAlways: session.leave.role === 'placed' ? PLACED_ASK_REASON : leaveAskReason({ ...session, leave: session.leave }, template, args.periods) };
  return { ok: true, askAlways: hasRole(template, 'test') };
}

// --- wat elke dag zegt -------------------------------------------------------------
// swap: the day holds exactly one training that may move; letting go trades their days (engine/weekSwap.ts).
// ask: een andere reden die eerst vraagt (verkouden, opbouw na ziekte), engine/dayRules.ts.
type DayVerdictKind = 'origin' | 'free' | 'shared' | 'tight' | 'clash' | 'rest' | 'nogym' | 'ask' | 'blocked' | 'swap';

export interface DayVerdict {
  date: string;
  kind: DayVerdictKind;
  droppable: boolean;
  // ok: mint, de dag past. warn: amber, jouw keuze of er volgt een voorstel. none: gedempt, kan niet.
  tone: 'ok' | 'warn' | 'none';
  // Hoogstens 28 tekens, op de dag zelf.
  chip: string;
  // De hele zin, met het droge feit eerst: onderaan het scherm en voor de schermlezer.
  line: string;
  // Loslaten opent het blad met Akkoord, met deze reden erin.
  ask: boolean;
  askReason?: string;
  // kind 'swap': the training that goes the other way.
  swapWithId?: string;
  // De meldingen van Let op die deze dag al zelf zegt; het voorbeeld na loslaten noemt ze niet nog eens (Warden,
  // 16 november: de kop van ILL stond achter de vraag).
  skipRules?: CheckRule[];
}

// Welke meldingen de vraag van de dag al noemt.
function skipFor(asks: readonly KeptReason[]): CheckRule[] {
  const out: CheckRule[] = [];
  if (asks.includes('rest')) out.push('REST-DAY');
  if (asks.includes('nogym')) out.push('NO-GYM');
  if (asks.includes('ill_light') || asks.includes('ramp')) out.push('ILL');
  return out;
}

export interface DragContext {
  // De week van de training en de weken eromheen.
  sessions: PlannedSession[];
  templates: SessionTemplate[];
  logs: SessionLog[];
  program?: Program | null;
  dailyTimeBudget?: Partial<Record<Weekday, DailyTimeBudget>>;
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'];
  asOf: string;
  move: MoveContext;
}

const CHIP_MAX = 28;
const UNSET_DAY_PAIRING_CAP_MINUTES = 120;

export const dayTitle = (date: string) => `${capitalize(weekdayLongNL(date))} ${formatDateNL(date)}`;
const fit = (...options: string[]) => options.find((o) => o.length <= CHIP_MAX) ?? options[options.length - 1].slice(0, CHIP_MAX);
const joinNames = (names: string[]) => names.join(' en ');

// Voor elke dag van de week wat loslaten daar zou doen. Dezelfde functies als de voorgestelde dagen
// van het actieblad (dayHasRoomFor, findHeavyConflicts, keptDay uit de ene regel engine/dayRules.ts), zodat beide wegen
// hetzelfde zeggen; de teksten van een dichte dag komen uit dezelfde tabel (DAY_CAUSE_TEXT).
export function dayVerdicts(ctx: DragContext, sessionId: string, weekStart: string): DayVerdict[] {
  const templateById = new Map(ctx.templates.map((t) => [t.id, t]));
  const session = ctx.sessions.find((s) => s.id === sessionId);
  const template = session ? templateById.get(session.templateId) : undefined;
  if (!session || !template) return [];
  const others = ctx.sessions.filter((s) => s.id !== sessionId && s.status !== 'skipped');
  const minutesOn = (date: string) => others
    .filter((s) => s.scheduledDate === date)
    .reduce((sum, s) => { const t = templateById.get(s.templateId); return t ? sum + resolveEffectiveFullDuration(t, date, ctx.program) : sum; }, 0);
  const ownMinutes = (date: string) => resolveEffectiveFullDuration(template, date, ctx.program);
  const fitsWhenAsked = (date: string) => ctx.sameDayPairingPreference !== 'never'
    && !ctx.dailyTimeBudget?.[weekdayOf(date)]
    && minutesOn(date) + ownMinutes(date) <= UNSET_DAY_PAIRING_CAP_MINUTES;

  const rules = moveRules(ctx.move, ctx.asOf);
  return weekDates(mondayOfWeek(weekStart)).map((date): DayVerdict => {
    const day = dayTitle(date);
    if (date === session.scheduledDate) {
      // Een gemiste training die je inhaalt (de dag is voorbij): hij stond hier, hij staat er niet meer.
      if (date < ctx.asOf) return { date, kind: 'origin', droppable: true, tone: 'ok', chip: 'Hier stond hij', line: `${day}. Hier stond hij. Sleep naar vandaag of later om hem te verplaatsen.`, ask: false };
      return { date, kind: 'origin', droppable: true, tone: 'ok', chip: 'Hier staat hij nu', line: `${day}. Hier staat hij nu.`, ask: false };
    }
    if (date < ctx.asOf) {
      return { date, kind: 'blocked', droppable: false, tone: 'none', chip: 'Dag is voorbij', line: `${day} is al voorbij.`, ask: false };
    }
    const kept = keptDay(ctx.move, template, date, ctx.asOf, rules);
    if (kept && kept.asks.length === 0) {
      const t = DAY_CAUSE_TEXT[kept.reason];
      return { date, kind: 'blocked', droppable: false, tone: 'none', chip: t.chip, line: t.line(day), ask: false };
    }
    const there = others.filter((s) => s.scheduledDate === date);
    if (there.length >= 2) {
      return { date, kind: 'blocked', droppable: false, tone: 'none', chip: 'Vol', line: `${day} zit vol.`, ask: false };
    }
    const names = there.flatMap((s) => { const n = templateById.get(s.templateId)?.name; return n ? [n] : []; });

    // Zonder sportschool, verkouden of opbouw na ziekte: je mag, maar eerst de vraag; Week zegt het daarna in Let op
    // (engine/noGymGuard.ts, regel ILL in engine/weekValidator.ts).
    if (kept && kept.reason !== 'rest') {
      const reason = keptAskLine(kept.asks);
      return { date, kind: kept.reason === 'nogym' ? 'nogym' : 'ask', droppable: true, tone: 'warn', chip: DAY_CAUSE_TEXT[kept.reason].chip, line: `${day}. ${reason} Als je loslaat, komt eerst de vraag of je dat echt wilt.`, ask: true, askReason: reason, skipRules: skipFor(kept.asks) };
    }
    if (kept) {
      // Je rustdag in een periode zonder sportschool: beide vragen (Warden, 16 november), de sterkste eerst.
      const reason = keptAskLine(kept.asks);
      const line = kept.asks.length === 1 ? 'Dit is je rustdag.' : reason;
      return { date, kind: 'rest', droppable: true, tone: 'warn', chip: 'Je rustdag', line: `${day}. ${line} Als je loslaat, komt eerst de vraag of je dat echt wilt.`, ask: true, askReason: reason, skipRules: skipFor(kept.asks) };
    }

    const simulated = ctx.sessions.map((s) => (s.id === sessionId ? { ...s, scheduledDate: date } : s));
    const conflicts = findHeavyConflicts(sessionId, template, date, simulated, templateById, ctx.logs);
    if (conflicts.length > 0) {
      const first = conflicts[0];
      const firstTemplate = templateById.get(first.templateId);
      // Dezelfde naam als de gesleepte training: met de dag erbij (Lookout, 16 november).
      const conflictNames = conflicts.flatMap((c) => { const n = templateById.get(c.templateId)?.name; return n ? [n === template.name ? `${n} van ${weekdayLongNL(c.scheduledDate)} ${Number(c.scheduledDate.slice(8, 10))}` : n] : []; });
      const shared = firstTemplate ? sharedHeavyAxes(template, firstTemplate) : [];
      const axes = shared.map((a) => HEAVY_AXIS_LABEL[a]).join(' en ');
      // De 48 uur gelden voor twee zware beendagen; een test vraagt frisse benen; anders alleen het feit.
      const testInvolved = hasRole(template, 'test') || (firstTemplate ? hasRole(firstTemplate, 'test') : false);
      // Rest before a test: a heavy day for running or legs too close before it says the hours (rust-voor-een-test).
      const restClash = conflicts.some((c) => {
        const ct = templateById.get(c.templateId);
        if (!ct) return false;
        return (isTestOnly(template) && isHeavyBeforeTest(ct) && tooCloseBeforeTest(c.scheduledDate, date))
          || (isTestOnly(ct) && isHeavyBeforeTest(template) && tooCloseBeforeTest(date, c.scheduledDate));
      });
      const rule = restClash ? ` Liefst ${testRestHours()} uur tussen een zware dag en je test.` : testInvolved ? ' Je test heeft frisse benen nodig.' : shared.includes('lowerBodyLoad') ? ' Liefst 48 uur ertussen.' : '';
      const alsoHeavy = axes ? `, ook zwaar voor ${axes}` : '';
      const named = joinNames(conflictNames);
      return {
        date, kind: 'clash', droppable: true, tone: 'warn', ask: true, skipRules: ['LEG-SPACING'],
        chip: fit(`Dicht op ${named}`, `Dicht op ${conflictNames[0] ?? 'een zware dag'}`, 'Dicht op een zware dag'),
        line: `${day}. Dicht op ${named}${alsoHeavy}.${rule} Als je loslaat, krijg je een voorstel.`,
        askReason: undefined,
      };
    }

    if (there.length > 0) {
      const normal = dayHasRoomFor(date, template, others, templateById, ctx.program, ctx.dailyTimeBudget, ctx.sameDayPairingPreference);
      const total = minutesOn(date) + ownMinutes(date);
      if (!normal && !fitsWhenAsked(date)) {
        const never = ctx.sameDayPairingPreference === 'never';
        const reason = never ? 'Je wilt geen twee trainingen op één dag.' : `Samen ${total} min, meer dan je die dag wilt trainen.`;
        return { date, kind: 'tight', droppable: true, tone: 'warn', chip: fit('Meer dan je wilt', 'Dag wordt druk'), line: `${day}. ${reason} Als je loslaat, komt eerst de vraag of je dat echt wilt.`, ask: true, askReason: reason };
      }
      const dayAdvice = dayOrder(
        [...others.filter((s) => s.scheduledDate === date), { ...session, scheduledDate: date }],
        others.filter((s) => s.scheduledDate === addDays(date, 1)),
        templateById,
      );
      const avoid = dayAdvice?.avoid ? ' Beter niet op één dag.' : '';
      return {
        date, kind: 'shared', droppable: true, tone: 'ok', ask: false,
        chip: fit(`Samen met ${joinNames(names)}`, `Samen met ${names[0]}`, 'Samen met een andere'),
        line: `${day}. Samen met ${joinNames(names)}, samen ${total} min.${avoid}`,
      };
    }
    return { date, kind: 'free', droppable: true, tone: 'ok', chip: 'Vrije dag', line: `${day}. Vrije dag.`, ask: false };
  });
}

// De volgende dag die kan, in de richting van het toetsenbord; dagen die niet kunnen worden overgeslagen.
export function nextDroppable(verdicts: DayVerdict[], from: string, step: 1 | -1): DayVerdict | undefined {
  const index = verdicts.findIndex((v) => v.date === from);
  for (let i = index + step; i >= 0 && i < verdicts.length; i += step) if (verdicts[i].droppable) return verdicts[i];
  return undefined;
}

// De dag onder de vinger: in een dagblok is dat die dag, ertussen de dichtstbijzijnde. Tot `slack`
// pixels boven de eerste en onder de laatste dag blijft het de eerste of laatste dag; verder weg is
// annuleren (undefined). `rects` zijn de dagen in volgorde.
export function dayAtY(rects: { date: string; top: number; bottom: number }[], y: number, slack = 48): string | undefined {
  if (rects.length === 0) return undefined;
  const first = rects[0];
  const last = rects[rects.length - 1];
  if (y < first.top - slack || y > last.bottom + slack) return undefined;
  let best = first;
  let bestDistance = Infinity;
  for (const r of rects) {
    const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    if (d < bestDistance) { best = r; bestDistance = d; }
  }
  return best.date;
}

// --- wat loslaten doet ---------------------------------------------------------------
export type MoveDecision = { action: 'none' | 'apply' | 'ask'; proposal: ScheduleProposal };

export const TEST_ASK_REASON = 'Een testloop verplaats je alleen met Akkoord.';
export const PLACED_ASK_REASON = 'Je periode zette deze training hier neer. Hij blijft bij je periode horen: haal je die weg, dan gaat hij mee.';
export const LEAVE_ASK_REASON = 'Deze training schoof opzij voor je vakantie. Verplaats je hem, dan blijft hij op de nieuwe dag staan.';

// Waarom een training die een periode verschoof of korter maakte eerst om Akkoord vraagt, met de soort periode erin:
// een periode zonder sportschool is geen vakantie (Lookout, 16 november). `verb` is "Verplaats" of "Ruil".
const PERIOD_WORD: Record<LeaveKind, string> = { no_training: 'je vakantie', trek: 'je tocht', free_days: 'je vrije dagen', no_gym: 'je periode zonder sportschool' };
// "werd korter" alleen als de rij het merk shortened heeft en nu echt korter staat dan zijn volle lengte (Lookout,
// 16 november); anders "schoof opzij".
export function leaveAskReason(session: Pick<PlannedSession, 'leave' | 'plannedMinutes'> & { leave: PlannedLeaveMark }, template: Pick<SessionTemplate, 'durationVariants'> | undefined, periods: LeavePeriod[] | undefined, verb: 'Verplaats' | 'Ruil' = 'Verplaats'): string {
  const mark = session.leave;
  const kind = periods?.find((p) => p.id === mark.periodId)?.kind;
  if (!kind && verb === 'Verplaats') return LEAVE_ASK_REASON;
  const where = kind ? PERIOD_WORD[kind] : 'je vakantie';
  const short = !!mark.shortened && session.plannedMinutes !== undefined && !!template && session.plannedMinutes < template.durationVariants.full;
  const what = short ? `Deze training werd korter door ${where}.` : `Deze training schoof opzij voor ${where}.`;
  return `${what} ${verb} je hem, dan blijft hij op de nieuwe dag staan.`;
}

// Het ene besluit voor het slepen en het actieblad. Dezelfde dag: niets. Een schoon voorstel met één
// wijziging gaat meteen (met Ongedaan maken in de melding). Een cascade of een botsing die niet op te
// lossen is, een rustdag, een dag waar de tijd niet past en een test vragen het bestaande blad.
// Het actieblad geeft geen verdict mee, wel dezelfde askAlways als de greep (Week.tsx, onMove).
// `legsClose`: the new day gives two heavy leg days in a row that the rules do not count as a clash
// (a pair that belongs together on its own days, engine/weekValidator.ts). A clean move then asks first,
// with "Toch hier" and "Annuleren" when that is the only reason; with another reason too (a rest day, a test)
// the sentence comes first and the usual buttons stay. A cascade or clash keeps its own question.
// `extraAsk`: een vraag van de dag zelf zonder verdict (een datum uit het actieblad op een dag zonder sportschool,
// engine/noGymGuard.ts#noGymAsk).
// `restDay` (1 to 7, Monday first): a training that the move pushes onto your rest day is named in the sheet (Lookout,
// 16 november).
export interface DecideOptions { askAlways?: boolean | string; verdict?: DayVerdict; legsClose?: boolean; extraAsk?: string; restDay?: number }

export const LEGS_ASK = 'Twee zware beendagen achter elkaar. Toch hier?';
const LEGS_CONFIRM = { yes: 'Toch hier', no: 'Annuleren' } as const;

export function decideMove(proposal: ScheduleProposal, opts: DecideOptions = {}): MoveDecision {
  const real = proposal.changes.filter((c) => c.toDate !== c.fromDate || c.restore);
  const own = proposal.changes[0];
  // De eigen training blijft op zijn dag: dan is er niets te verplaatsen (applyProposal zou het als overslaan lezen).
  const stays = own !== undefined && own.toDate === own.fromDate && !own.restore;
  if (proposal.changes.length === 0 || real.length === 0 || stays) return { action: 'none', proposal };
  const clean = proposal.resolved && proposal.changes.length === 1;
  const reasons: string[] = [];
  let resolved = proposal.resolved;
  if (opts.verdict?.ask && opts.verdict.askReason) {
    reasons.push(opts.verdict.askReason);
    resolved = false;
  }
  if (opts.askAlways) reasons.push(typeof opts.askAlways === 'string' ? opts.askAlways : TEST_ASK_REASON);
  if (opts.extraAsk && !reasons.includes(opts.extraAsk)) {
    reasons.push(opts.extraAsk);
    resolved = false;
  }
  // Een andere training die door deze verplaatsing op je rustdag komt: het blad zegt het.
  for (const c of proposal.changes.slice(1)) {
    if (opts.restDay && c.toDate !== c.fromDate && isoWeekday(c.toDate) === opts.restDay) reasons.push(`${c.templateName} gaat naar ${weekdayLongNL(c.toDate)} ${Number(c.toDate.slice(8, 10))}, je rustdag.`);
  }
  const legs = !!opts.legsClose && clean;
  if (legs) {
    reasons.unshift(LEGS_ASK);
    resolved = false;
  }
  if (reasons.length === 0) return { action: clean ? 'apply' : 'ask', proposal };
  // Een dag die zelf vraagt en ook dicht op een zware dag valt: hoogstens twee zinnen, de sterkste reden en de 48 uur
  // kort (Lookout op 360, 16 november).
  // De korte zin vervangt alleen de botsing, nooit een andere reden: een testloop, wat een periode neerzette of opzij
  // schoof (askAlways) en een training die mee op je rustdag komt blijven staan, voor de 48 uur (Warden, 16 november).
  if (opts.verdict?.ask && opts.verdict.askReason && !clean && proposal.short && !legs) {
    const [day, ...others] = reasons;
    return { action: 'ask', proposal: { ...proposal, resolved, reason: [firstSentence(day), ...others, proposal.short].join(' ') } };
  }
  // Een cascade of botsing houdt zijn eigen reden, met de nieuwe er vooraan.
  const kept = clean ? [] : [proposal.reason];
  return { action: 'ask', proposal: { ...proposal, resolved, reason: [...reasons, ...kept].join(' '), ...(legs && reasons.length === 1 ? { confirm: { ...LEGS_CONFIRM } } : {}) } };
}

// Does moving this training to `date` give two heavy leg days in a row that the week check reports (as yours,
// the move locks it) and that were not there before? Pure, the same check as the card in Week.
export function legsCloseAfterMove(input: CheckInput, sessionId: string, date: string): boolean {
  const weekStart = mondayOfWeek(date);
  const pairs = (sessions: PlannedSession[]) => new Set(weekConcerns({ ...input, sessions }, weekStart).filter((c) => c.rule === 'LEG-SPACING' && c.finding.sessionIds.includes(sessionId)).map((c) => c.finding.sessionIds.filter((id) => id !== sessionId).join(',')));
  const before = pairs(input.sessions);
  const moved = input.sessions.map((s) => (s.id === sessionId ? { ...s, scheduledDate: date, weekStartDate: weekStart, status: 'moved' as const, lock: { by: 'user' as const, at: 'voorbeeld' } } : s));
  return [...pairs(moved)].some((other) => !before.has(other));
}

// --- wat er na het slepen nieuw ontstaat -----------------------------------------------
// De meldingen van de weekcontrole die er door deze verplaatsing bij komen, als zinnen. Een
// verplaatsing die een melding oplevert wordt niet tegengehouden; je ziet het alleen vooraf.
// `skipRules`: meldingen die het doelvak al zelf zegt (de botsing van de 48 uur, de rustdag).
export function newConcernLines(input: CheckInput, weekStart: string, sessionId: string, date: string, skipRules: string[] = []): string[] {
  const before = new Set(weekConcerns(input, weekStart).map((c) => c.key));
  const moved = input.sessions.map((s) => (s.id === sessionId ? { ...s, scheduledDate: date, weekStartDate: mondayOfWeek(date), status: 'moved' as const, lock: { by: 'user' as const, at: 'voorbeeld' } } : s));
  return weekConcerns({ ...input, sessions: moved }, weekStart)
    .filter((c) => !before.has(c.key) && !skipRules.includes(c.rule))
    .map((c) => c.headline);
}
