// ASCEND: een training slepen in Week (docs/visie/Slepen in Week.md). Slepen is een snellere hand,
// geen nieuwe regel: wie mag slepen, wat elke dag zegt en wat loslaten doet komt uit de regels die er
// al zijn (het slot, de 48 uur tussen zware beendagen, de rustdag, de vrije dagen). Puur: geen React,
// geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { dayOrder } from './dayOrder';
import { dayHasRoomFor, findHeavyConflicts, HEAVY_AXIS_LABEL, sharedHeavyAxes, type ScheduleProposal } from './scheduler';
import { keptDayReason, type KeptReason, type MoveContext } from './moveSuggestions';
import { resolveEffectiveFullDuration } from './substitutions';
import { lockLevel } from './weekValidator';
import { weekConcerns } from './weekConcerns';
import type { CheckInput } from './weekValidator';
import { hasRole } from './templateRoles';
import { addDays, mondayOfWeek, weekdayLongNL, weekdayOf, formatDateNL, weekDates } from '../utils/dates';

// --- wie mag slepen ----------------------------------------------------------------
export type DragRefusal = 'history' | 'skipped' | 'rest' | 'race' | 'leave';
export type DragEligibility = { ok: true; askAlways: boolean } | { ok: false; reason: DragRefusal };

// Nooit: wat gelogd of voorbij is (lockLevel 0), een overgeslagen training, een rustdag of
// herstelwandeling, een wedstrijd (die gaat via het doel op Ascend) en wat een vakantie of tocht
// neerzette. Een test mag, maar loslaten vraagt altijd om Akkoord.
export function dragEligibility(session: PlannedSession, template: SessionTemplate, args: { logged: boolean; today: string }): DragEligibility {
  const loggedIds = new Set<string | undefined>(args.logged ? [session.id] : []);
  if (lockLevel(session, loggedIds, args.today) === 0) return { ok: false, reason: 'history' };
  if (session.status === 'skipped') return { ok: false, reason: 'skipped' };
  if (template.type === 'recovery') return { ok: false, reason: 'rest' };
  if (hasRole(template, 'race')) return { ok: false, reason: 'race' };
  if (session.leave) return { ok: false, reason: 'leave' };
  return { ok: true, askAlways: hasRole(template, 'test') };
}

// --- wat elke dag zegt -------------------------------------------------------------
export type DayVerdictKind = 'origin' | 'free' | 'shared' | 'tight' | 'clash' | 'rest' | 'blocked';

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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const dayTitle = (date: string) => `${cap(weekdayLongNL(date))} ${formatDateNL(date)}`;
const fit = (...options: string[]) => options.find((o) => o.length <= CHIP_MAX) ?? options[options.length - 1].slice(0, CHIP_MAX);
const joinNames = (names: string[]) => names.join(' en ');

const BLOCKED_TEXT: Record<Exclude<KeptReason, 'rest'>, { chip: string; line: (day: string) => string }> = {
  off: { chip: 'Vakantie', line: (day) => `${day} is een vakantiedag.` },
  trek: { chip: 'Tochtdag', line: (day) => `${day} is een tochtdag.` },
  light: { chip: 'Lichte dag bij je tocht', line: (day) => `${day} blijft licht door je tocht, daar past geen zware training.` },
  goal: { chip: 'Na je doel', line: (day) => `${day} ligt op of na je doel.` },
  ill: { chip: 'Je bent ziek', line: (day) => `${day} valt nog in je ziekte.` },
};

// Voor elke dag van de week wat loslaten daar zou doen. Dezelfde functies als de voorgestelde dagen
// van het actieblad (dayHasRoomFor, findHeavyConflicts, keptDayReason), zodat beide wegen hetzelfde zeggen.
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

  return weekDates(mondayOfWeek(weekStart)).map((date): DayVerdict => {
    const day = dayTitle(date);
    if (date === session.scheduledDate) {
      return { date, kind: 'origin', droppable: true, tone: 'ok', chip: 'Hier staat hij nu', line: `${day}. Hier staat hij nu.`, ask: false };
    }
    if (date < ctx.asOf) {
      return { date, kind: 'blocked', droppable: false, tone: 'none', chip: 'Dag is voorbij', line: `${day} is al voorbij.`, ask: false };
    }
    const kept = keptDayReason(ctx.move, template, date, ctx.asOf);
    if (kept && kept !== 'rest') {
      const t = BLOCKED_TEXT[kept];
      return { date, kind: 'blocked', droppable: false, tone: 'none', chip: t.chip, line: t.line(day), ask: false };
    }
    const there = others.filter((s) => s.scheduledDate === date);
    if (there.length >= 2) {
      return { date, kind: 'blocked', droppable: false, tone: 'none', chip: 'Vol', line: `${day} zit vol.`, ask: false };
    }
    const names = there.flatMap((s) => { const n = templateById.get(s.templateId)?.name; return n ? [n] : []; });

    if (kept === 'rest') {
      const reason = 'Dit is je rustdag. Een rustdag is er om te herstellen.';
      return { date, kind: 'rest', droppable: true, tone: 'warn', chip: 'Je rustdag', line: `${day}. Dit is je rustdag. Als je loslaat, vraagt ASCEND eerst of je dat echt wilt.`, ask: true, askReason: reason };
    }

    const simulated = ctx.sessions.map((s) => (s.id === sessionId ? { ...s, scheduledDate: date } : s));
    const conflicts = findHeavyConflicts(sessionId, template, date, simulated, templateById, ctx.logs);
    if (conflicts.length > 0) {
      const first = conflicts[0];
      const firstTemplate = templateById.get(first.templateId);
      const conflictNames = conflicts.flatMap((c) => { const n = templateById.get(c.templateId)?.name; return n ? [n] : []; });
      const shared = firstTemplate ? sharedHeavyAxes(template, firstTemplate) : [];
      const axes = shared.map((a) => HEAVY_AXIS_LABEL[a]).join(' en ');
      // De 48 uur gelden voor twee zware beendagen; een test vraagt frisse benen; anders alleen het feit.
      const testInvolved = hasRole(template, 'test') || (firstTemplate ? hasRole(firstTemplate, 'test') : false);
      const rule = testInvolved ? ' Je test heeft frisse benen nodig.' : shared.includes('lowerBodyLoad') ? ' Liefst 48 uur ertussen.' : '';
      const alsoHeavy = axes ? `, ook zwaar voor ${axes}` : '';
      const named = joinNames(conflictNames);
      return {
        date, kind: 'clash', droppable: true, tone: 'warn', ask: true,
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
        return { date, kind: 'tight', droppable: true, tone: 'warn', chip: fit('Meer dan je wilt', 'Dag wordt druk'), line: `${day}. ${reason} Als je loslaat, vraagt ASCEND eerst of je dat echt wilt.`, ask: true, askReason: reason };
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

// Het ene besluit voor het slepen en het actieblad. Dezelfde dag: niets. Een schoon voorstel met één
// wijziging gaat meteen (met Ongedaan maken in de melding). Een cascade of een botsing die niet op te
// lossen is, een rustdag, een dag waar de tijd niet past en een test vragen het bestaande blad.
// Het actieblad geeft geen verdict en geen askAlways mee en gedraagt zich dus zoals voorheen.
export interface DecideOptions { askAlways?: boolean; verdict?: DayVerdict }

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
  if (opts.askAlways) reasons.push(TEST_ASK_REASON);
  if (reasons.length === 0) return { action: clean ? 'apply' : 'ask', proposal };
  // Een cascade of botsing houdt zijn eigen reden, met de nieuwe er vooraan.
  const kept = clean ? [] : [proposal.reason];
  return { action: 'ask', proposal: { ...proposal, resolved, reason: [...reasons, ...kept].join(' ') } };
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
