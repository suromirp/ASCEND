// ASCEND: een zware beendag op vermoeide benen (docs/beslissingen/2026-10-27-spierpijn-en-zware-beendag.md,
// ontwerp in docs/visie/Spierpijn en een zware beendag.md). Puur: geen React, geen opslag.
//
// Op de dag zelf kijkt ASCEND naar drie redenen: spierpijn die je meldde (ochtendcheck of
// "Hoe voelt je lijf?"), een harde loop eerder vandaag (de beenindex negeert een training van
// dezelfde dag bewust, en dat is hier het gat) en een hoge beenindex. Bij een reden komt er
// een voorstel: "Lichter" (dezelfde training met meer reserve en een set minder) of een dag
// later, altijd met "Liever niet". Niets verandert stil; de training en de logs blijven zoals ze zijn.
//
// Alle getallen zijn afgeleid en niet gemeten (zoals in engine/bodyCheck.ts). De planner en de
// weekcontrole lezen niets uit dit bestand: `legFatigueOn` en `freshnessAt` zijn ongewijzigd.

import type { Program } from '../models/program';
import type { ExercisePrescription, PlannedSession, SessionLog, SessionTemplate, SetTarget } from '../models/training';
import type { InjuryNote } from '../models/injury';
import type { MorningCheckIn } from '../models/checkIn';
import { MAX_LEG_EASE_DAYS, type LegEaseChoice, type LegEaseDay, type LegEaseReason } from '../models/legEase';
import { addDays, daysBetween, weekdayLongNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { cleanExerciseName } from './exerciseMatch';
import { FATIGUE_BAND, FATIGUE_THRESHOLDS, fatigueEvents, fatigueWord, legFatigueOn, sessionImpulse, type LegFatigueInputs } from './legFatigue';
import type { LegEaseHow, LegEaseMode } from './legEaseSettings';
import { isOpenOn, kindOf } from './injuryKind';
import { isLegSpot } from './legSpots';
import { legSorenessList, soreFromNotes, type Soreness } from './legSoreness';
import { isHardRun, isLegHeavyTemplate } from './scheduler';
import { logSport } from './sports';
import { exerciseKey, HARD_RUN_MINUTES, HARD_RUN_RPE } from './strengthHistory';
import { hasRole, isTestOrRace } from './templateRoles';

export { soreFromNotes } from './legSoreness';

// --- de drempels ---------------------------------------------------------------------------------

// Boven deze beenindex is er een reden (het woord "Vermoeid" op de kaart Benen). Dezelfde grens als
// engine/bodyCheck.ts#HEAVY_LEG_INDEX.
export const LEG_EASE_INDEX = FATIGUE_THRESHOLDS.hard.fresh;
// De uren tussen een loop eerder die dag en de beendag als de tijd niet bekend is: de ondergrens uit
// docs/onderzoek/Volgorde van twee trainingen.md.
export const SAME_DAY_HOURS = 6;
// Zeker zoveel herhalingen over bij "Lichter" (extra licht: een meer).
export const EASE_RIR = 3;
export const EASE_RIR_EXTRA = 4;
// Een oefening met zoveel sets of meer verliest de laatste.
export const EASE_DROP_FROM_SETS = 3;
export { MAX_LEG_EASE_DAYS };

const round1 = (n: number) => Math.round(n * 10) / 10;

// --- een loop eerder vandaag --------------------------------------------------------------------

export interface EarlierToday {
  // Wat die loop nog in je benen achterlaat, na SAME_DAY_HOURS (of `hoursApart`).
  points: number;
  label?: 'testloop' | 'loop';
  // De loop begon voor de middag; anders heet hij "eerder vandaag".
  morning?: boolean;
  // De harde loop is gepland en nog niet gelogd: dan zeggen de teksten dat je hem vandaag loopt, niet dat je liep.
  planned?: boolean;
}

export interface EarlierDeps {
  logs: SessionLog[];
  templates: SessionTemplate[];
  plannedSessions?: PlannedSession[];
  program?: Program | null;
  bodyKg?: number;
  // De training waar het om gaat: telt niet mee als "eerder".
  excludeId?: string;
}

// De punten van de beenindex voor een training van dezelfde dag, met dezelfde halfwaardetijden
// als de index: intensiteit per 12 uur, kracht en klappen per 24 uur, spierschade blijft de
// eerste dag. Telt een harde loop (RPE 7 of hoger en 20 minuten of meer, dus ook een testloop op
// RPE 9) en een geplande harde loop die dag. Een rustige loop telt niet.
export function earlierTodayPoints(date: string, deps: EarlierDeps, hoursApart = SAME_DAY_HOURS): EarlierToday {
  const byId = new Map(deps.templates.map((t) => [t.id, t]));
  const logById = new Map(deps.logs.map((l) => [l.id, l]));
  const events = fatigueEvents({ logs: deps.logs, plannedSessions: deps.plannedSessions ?? [], templates: deps.templates, today: date, program: deps.program });
  let points = 0;
  let test = false;
  let morning = false;
  let any = false;
  let anyLogged = false;
  for (const e of events) {
    if (e.date !== date || e.id === deps.excludeId) continue;
    const t = byId.get(e.templateId);
    if (!t || t.type === 'strength') continue;
    if (e.logged) {
      const log = logById.get(e.id);
      if (!log || !isHardRunLog(log)) continue;
      anyLogged = true;
    } else if (!isHardRun(t)) continue;
    const imp = sessionImpulse(e, t, events, byId, deps.bodyKg);
    const damageLeft = hoursApart <= 24 ? 1 : 2 ** (-(hoursApart - 24) / 36);
    points += imp.intensity * 2 ** (-hoursApart / 12) + imp.strength * 2 ** (-hoursApart / 24) + imp.damage * damageLeft;
    any = true;
    if (hasRole(t, 'test')) test = true;
    const log = logById.get(e.id);
    if (log && startedBeforeNoon(log)) morning = true;
  }
  if (!any || points <= 0) return { points: 0 };
  return { points: round1(points), label: test ? 'testloop' : 'loop', morning, ...(anyLogged ? {} : { planned: true }) };
}

function isHardRunLog(log: SessionLog): boolean {
  if (log.type === 'strength' || log.type === 'recovery') return false;
  return logSport(log) === 'running' && (log.rpe ?? 0) >= HARD_RUN_RPE && log.durationMinutes >= HARD_RUN_MINUTES;
}

function startedBeforeNoon(log: SessionLog): boolean {
  const end = new Date(log.completedAt).getTime();
  if (!Number.isFinite(end)) return false;
  return new Date(end - log.durationMinutes * 60_000).getHours() < 12;
}

// --- de signalen van een dag ---------------------------------------------------------------------

export interface LegDaySignals {
  date: string;
  // In de volgorde spierpijn, harde loop, index.
  reasons: LegEaseReason[];
  // De index van vandaag plus wat een loop eerder vandaag nog meetelt.
  index: number;
  baseIndex: number;
  sore?: Soreness;
  earlier: EarlierToday;
  // Op de grens van 12 (binnen de onzekerheid van de index): de tekst zegt "ongeveer".
  nearLine: boolean;
  // Open pijn op een beenplek: dit is dan niet het instrument, de pijnrem werkt.
  pain: boolean;
}

// Het samenvoegen van de drie bronnen, los van de berekening zodat de grens te toetsen is.
export function combineSignals(args: { date: string; sore?: Soreness; earlier: EarlierToday; baseIndex: number; pain?: boolean }): LegDaySignals {
  const index = round1(args.baseIndex + args.earlier.points);
  const reasons: LegEaseReason[] = [];
  if (args.sore) reasons.push(args.sore === 'flink' ? 'flink' : 'spierpijn');
  if (args.earlier.points > 0) reasons.push('harde-loop');
  if (index > LEG_EASE_INDEX) reasons.push('index');
  return {
    date: args.date,
    reasons,
    index,
    baseIndex: args.baseIndex,
    ...(args.sore ? { sore: args.sore } : {}),
    earlier: args.earlier,
    nearLine: reasons.includes('index') && index <= LEG_EASE_INDEX + FATIGUE_BAND,
    pain: !!args.pain,
  };
}

export interface SignalDeps {
  logs: SessionLog[];
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  program?: Program | null;
  bodyKg?: number;
  // Vandaag: geplande trainingen van eerder tellen niet.
  today: string;
  minutesOf?: LegFatigueInputs['minutesOf'];
  injuries: InjuryNote[];
  checkIns: MorningCheckIn[];
}

export function fatigueInputsFor(deps: SignalDeps, plannedSessions = deps.plannedSessions): LegFatigueInputs {
  return {
    logs: deps.logs, plannedSessions, templates: deps.templates, today: deps.today, bodyKg: deps.bodyKg, program: deps.program, minutesOf: deps.minutesOf,
    soreness: legSorenessList(deps.checkIns, deps.injuries),
  };
}

export function legDaySignals(date: string, deps: SignalDeps, excludeId?: string): LegDaySignals {
  const inputs = fatigueInputsFor(deps);
  const baseIndex = legFatigueOn(date, inputs).index;
  const earlier = earlierTodayPoints(date, { logs: deps.logs, templates: deps.templates, plannedSessions: deps.plannedSessions, program: deps.program, bodyKg: deps.bodyKg, excludeId }, SAME_DAY_HOURS);
  const sore = soreFromNotes(deps.injuries, deps.checkIns, date);
  return combineSignals({ date, sore, earlier, baseIndex, pain: legPainOpen(deps.injuries, date) });
}

// Pijn is iets anders dan spierpijn: een open melding "pijn" op een beenplek, van de laatste 14 dagen.
// Dan is Lichter niet het instrument en werkt de pijnrem (INJURY-LEGS).
export function legPainOpen(injuries: InjuryNote[], date: string): boolean {
  return injuries.some((n) => kindOf(n) === 'pijn' && isLegSpot(n.bodyPart) && isOpenOn(n, date) && n.date <= date && n.date >= addDays(date, -14));
}

// De training van vandaag waar de kaart Benen (LEG-EASE) voor spreekt, als er spierpijn is gemeld:
// dezelfde keuze als de kaart (easeTarget, geen pijn op een beenplek, nog niet beantwoord). MORNING-CHECK
// slaat die training over, zodat dezelfde spierpijn niet twee kaarten geeft. Zonder kaart (instelling
// niet op voorstel, pijn, niets te kiezen) blijft MORNING-CHECK zelf spreken.
export function legEaseCardSession(args: {
  mode: LegEaseMode | undefined;
  today: string;
  plannedSessions: PlannedSession[];
  templates: SessionTemplate[];
  logs: SessionLog[];
  injuries: InjuryNote[];
}): PlannedSession | undefined {
  if (args.mode !== 'voorstel') return undefined;
  if (legPainOpen(args.injuries, args.today)) return undefined;
  return easeTarget(args.today, args.plannedSessions, args.templates, args.logs)?.session;
}

// --- wie krijgt het voorstel ---------------------------------------------------------------------

export type EaseKind = 'beendag' | 'kwaliteit';

export interface EaseTarget {
  session: PlannedSession;
  template: SessionTemplate;
  kind: EaseKind;
}

// Een zware beendag, of een harde loop die geen test of wedstrijd is. Alles anders heeft hier niets te zoeken.
export function easeTargetOf(session: PlannedSession, template: SessionTemplate | undefined): EaseTarget | undefined {
  if (!template || template.type === 'recovery' || isTestOrRace(template)) return undefined;
  if (template.type === 'strength') return isLegHeavyTemplate(template) ? { session, template, kind: 'beendag' } : undefined;
  return isHardRun(template) ? { session, template, kind: 'kwaliteit' } : undefined;
}

// De training van vandaag waar het om gaat: de eerste zware beendag die nog niet gelogd of overgeslagen
// is, anders een harde loop (geen test of wedstrijd).
export function easeTarget(date: string, plannedSessions: PlannedSession[], templates: SessionTemplate[], logs: SessionLog[]): EaseTarget | undefined {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId));
  const open = plannedSessions
    .filter((s) => s.scheduledDate === date && s.status !== 'skipped' && !logged.has(s.id))
    .map((s) => easeTargetOf(s, byId.get(s.templateId)))
    .filter((x): x is EaseTarget => !!x);
  return open.find((x) => x.kind === 'beendag') ?? open[0];
}

export interface EaseOffer {
  // 'offer': de kaart met knoppen. 'line': alleen de feitregel (instelling "regel"). 'eased': je koos
  // Lichter. 'none': niets.
  state: 'offer' | 'line' | 'eased' | 'none';
  kind?: EaseKind;
  // Lichter bestaat alleen voor een zware beendag; een kwaliteitsloop kan alleen een dag later.
  canEase: boolean;
  canMove: boolean;
}

const NONE: EaseOffer = { state: 'none', canEase: false, canMove: false };

export function decisionFor(decisions: LegEaseDay[] | undefined, date: string, plannedSessionId: string): LegEaseDay | undefined {
  return (decisions ?? []).find((d) => d.date === date && d.plannedSessionId === plannedSessionId);
}

export function shouldOfferEase(
  signals: LegDaySignals,
  target: EaseTarget | undefined,
  mode: LegEaseMode,
  decisions: LegEaseDay[] | undefined,
  logs: SessionLog[],
): EaseOffer {
  if (mode === 'uit' || !target) return NONE;
  const { session, template, kind } = target;
  if (session.scheduledDate !== signals.date || session.status === 'skipped' || isTestOrRace(template)) return NONE;
  if (logs.some((l) => l.plannedSessionId === session.id)) return NONE;
  // Wat je koos blijft staan, ook als de reden intussen weg is: Lichter is dan nog steeds gekozen.
  const decision = decisionFor(decisions, signals.date, session.id);
  if (decision?.choice === 'liever-niet') return NONE;
  if (decision?.choice === 'lichter') return kind === 'beendag' ? { state: 'eased', kind, canEase: false, canMove: false } : NONE;
  if (signals.reasons.length === 0 || signals.pain) return NONE;
  if (mode === 'regel') return { state: 'line', kind, canEase: false, canMove: false };
  return { state: 'offer', kind, canEase: kind === 'beendag', canMove: true };
}

// Wat Forge mag doen met de keuze van vandaag: Lichter is gekozen voor deze training.
export function easeChosen(decisions: LegEaseDay[] | undefined, date: string, plannedSessionId: string | undefined): boolean {
  return !!plannedSessionId && decisionFor(decisions, date, plannedSessionId)?.choice === 'lichter';
}

// Logs waarvan je zelf koos voor Lichter: een bewust lichtere beenoefening telt niet mee voor "raak"
// (engine/strengthHistory.ts#comparisonRows, per rij en alleen voor oefeningen die de benen belasten).
// Gekoppeld op de geplande training, met een dag ruimte voor de datum (een training die na middernacht
// eindigt, of die je een dag later logt).
export function easedLogIds(logs: SessionLog[], decisions: LegEaseDay[] | undefined): Set<string> {
  const chosen = (decisions ?? []).filter((d) => d.choice === 'lichter');
  if (chosen.length === 0) return new Set();
  return new Set(logs.filter((l) => l.plannedSessionId && chosen.some((d) => d.plannedSessionId === l.plannedSessionId && Math.abs(daysBetween(d.date, l.completedDate)) <= 1)).map((l) => l.id));
}

// --- de keuzes bewaren ---------------------------------------------------------------------------

// Een keuze erbij: per datum en training staat er een. De laatste MAX_LEG_EASE_DAYS blijven.
export function recordDecision(list: LegEaseDay[] | undefined, entry: LegEaseDay): LegEaseDay[] {
  const rest = (list ?? []).filter((d) => !(d.date === entry.date && d.plannedSessionId === entry.plannedSessionId));
  return [...rest, entry].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at)).slice(-MAX_LEG_EASE_DAYS);
}

export function removeDecision(list: LegEaseDay[] | undefined, date: string, plannedSessionId: string): LegEaseDay[] | undefined {
  const next = (list ?? []).filter((d) => !(d.date === date && d.plannedSessionId === plannedSessionId));
  return next.length > 0 ? next : undefined;
}

export function makeDecision(signals: LegDaySignals, plannedSessionId: string, choice: LegEaseChoice, now = new Date()): LegEaseDay {
  return { date: signals.date, plannedSessionId, choice, reasons: signals.reasons, index: signals.index, at: now.toISOString() };
}

// --- wat Lichter doet ----------------------------------------------------------------------------

export interface EaseResult {
  slots: ExercisePrescription[];
  setsRemoved: number;
  // Het aantal oefeningen met meer reserve dan voorgeschreven (en dus een lager gewicht, als het model er is).
  lighter: number;
  // De namen van wat vervalt.
  dropped: string[];
  // Welke oefeningen (slot) meer reserve kregen, voor de regel eronder.
  raised: string[];
  rir: number;
}

// Maakt van de voorschriften van de training een lichtere versie. Alleen oefeningen die de benen
// belasten: minstens `rir` herhalingen in reserve per werkset (een set tot falen wordt een gewone
// set), van elke oefening met drie sets of meer vervalt de laatste, en een extra oefening
// (`optional`) vervalt. `core` blijft altijd staan. Bovenlichaam en romp blijven zoals voorgeschreven.
// Daarna rekent planExercise gewoon zoals altijd, dus de gewichten komen uit hetzelfde krachtmodel.
export function easeSlots(slots: ExercisePrescription[], how: LegEaseHow): EaseResult {
  const rir = how === 'extra' ? EASE_RIR_EXTRA : EASE_RIR;
  const dropSets = how !== 'alleen-gewicht';
  const out: ExercisePrescription[] = [];
  const dropped: string[] = [];
  const raised: string[] = [];
  let setsRemoved = 0;
  for (const slot of slots) {
    const exercise = exerciseKey(slot.id, slot.exerciseName).exercise;
    if (!exercise?.loadsLegs) {
      out.push(slot);
      continue;
    }
    if (dropSets && slot.priority === 'optional') {
      dropped.push(exercise.name);
      continue;
    }
    let next: ExercisePrescription = slot;
    let up = false;
    if (slot.setTargets && slot.setTargets.length > 0) {
      let targets: SetTarget[] = slot.setTargets.map((t) => {
        if (t.rir >= rir && !t.failure) return t;
        up = true;
        return { repsLow: t.repsLow, repsHigh: Math.max(t.repsHigh, t.repsLow), rir: Math.max(t.rir, rir), ...(t.restSec !== undefined ? { restSec: t.restSec } : {}) };
      });
      if (dropSets && targets.length >= EASE_DROP_FROM_SETS) {
        targets = targets.slice(0, -1);
        setsRemoved++;
      }
      next = { ...slot, setTargets: targets, sets: targets.length };
    } else {
      // De reserve volgt uit de RPE van het voorschrift (reserve = 10 min RPE).
      const rpe = Math.min(slot.rpe ?? 10, 10 - rir);
      up = rpe !== slot.rpe && (slot.rpe === undefined || 10 - slot.rpe < rir);
      let sets = slot.sets;
      if (dropSets && sets >= EASE_DROP_FROM_SETS) {
        sets -= 1;
        setsRemoved++;
      }
      next = { ...slot, rpe, sets };
    }
    if (up) raised.push(slot.id);
    out.push(next);
  }
  return { slots: out, setsRemoved, lighter: raised.length, dropped: dropped.map(cleanExerciseName), raised, rir };
}

// --- de teksten ----------------------------------------------------------------------------------

const number0 = (n: number) => formatNumberNL(n, 0);

// "Beenindex 15" of, op de grens, "Beenindex ongeveer 13".
function indexWords(s: LegDaySignals): string {
  return s.nearLine ? `Beenindex ongeveer ${number0(s.index)}` : `Beenindex ${number0(s.index)}`;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// De feitregel op Vandaag, met hoogstens twee redenen in de volgorde spierpijn, harde loop, index.
export function easeFact(s: LegDaySignals): string {
  const clauses: string[] = [];
  if (s.sore === 'flink') clauses.push('je meldde flinke spierpijn in je benen');
  else if (s.sore === 'spierpijn') clauses.push('je meldde spierpijn in je benen');
  if (s.earlier.points > 0) {
    const when = s.earlier.morning ? 'vanochtend' : 'eerder vandaag';
    if (s.earlier.planned) clauses.push(s.earlier.label === 'testloop' ? 'je loopt vandaag ook je testloop' : 'je loopt vandaag ook hard');
    else clauses.push(s.earlier.label === 'testloop' ? `je liep ${when} je testloop` : `je liep ${when} hard`);
  }
  const named = clauses.slice(0, 2);
  if (named.length === 0) return `${indexWords(s)}. Je benen dragen nog veel van de afgelopen dagen.`;
  return `${capital(named.join(' en '))}. ${indexWords(s)}.`;
}

// Dezelfde reden in een korte zin voor Forge.
export function easeFactShort(s: LegDaySignals): string {
  const parts: string[] = [];
  if (s.sore === 'flink') parts.push('flinke spierpijn gemeld');
  else if (s.sore === 'spierpijn') parts.push('spierpijn gemeld');
  if (s.earlier.points > 0) {
    const when = s.earlier.morning ? 'vanochtend' : 'eerder vandaag';
    if (s.earlier.planned) parts.push(s.earlier.label === 'testloop' ? 'vandaag ook een testloop' : 'vandaag ook een harde loop');
    else parts.push(s.earlier.label === 'testloop' ? `${when} een testloop` : `${when} een harde loop`);
  }
  const named = parts.slice(0, 2);
  if (named.length === 0) return `${indexWords(s)}. Je benen dragen nog veel van de afgelopen dagen.`;
  return `${capital(named.join(' en '))}. ${indexWords(s)}.`;
}

export const EASE_INDEX_EXPLAIN = 'Beenindex: wat je benen nog dragen van eerdere trainingen. Tot 12 kan een zware dag.';

export function easeTitle(templateName: string): string {
  return `${templateName.replace(/\s*\(.*?\)\s*/g, ' ').trim()} op vermoeide benen`;
}

export function easeAdvice(canEase: boolean, canMove: boolean): string {
  if (canEase && canMove) return 'Doortrainen mag. Wil je het rustiger aanpakken, dan kan het lichter of een dag later.';
  if (canEase) return 'Doortrainen mag. Wil je het rustiger aanpakken, dan kan het lichter.';
  if (canMove) return 'Doortrainen mag. Wil je het rustiger aanpakken, dan kan het een dag later.';
  return 'Doortrainen mag.';
}

// Wat Lichter betekent, in de woorden van de gekozen manier. Zonder rekenmodel blijft het gewicht
// zoals voorgeschreven en zegt de tekst dat ook.
export function easeExplain(how: LegEaseHow, weightFollows = true): string {
  const rir = how === 'extra' ? EASE_RIR_EXTRA : EASE_RIR;
  const sets = how === 'alleen-gewicht' ? 'Alle sets blijven staan.' : 'en een set minder per oefening.';
  if (!weightFollows) {
    return how === 'alleen-gewicht'
      ? `Lichter is zeker ${rir} herhalingen over. Het gewicht blijft zoals voorgeschreven. Het blijft dezelfde training.`
      : `Lichter is zeker ${rir} herhalingen over en een set minder per oefening. Het gewicht blijft zoals voorgeschreven. Het blijft dezelfde training.`;
  }
  return how === 'alleen-gewicht'
    ? `Lichter is minder gewicht en zeker ${rir} herhalingen over. ${sets} Het blijft dezelfde training.`
    : `Lichter is minder gewicht, zeker ${rir} herhalingen over ${sets} Het blijft dezelfde training.`;
}

export function easeForgeExplain(how: LegEaseHow, weightFollows = true): string {
  const rir = how === 'extra' ? EASE_RIR_EXTRA : EASE_RIR;
  const weight = weightFollows ? 'Minder gewicht, ' : '';
  const sets = how === 'alleen-gewicht' ? 'alle sets blijven staan.' : 'een set minder per oefening. Oefeningen die je als extra had gemarkeerd vervallen.';
  return `${capital(`${weight}zeker ${rir} herhalingen over, ${sets}`)}`;
}

// Wat Forge na Lichter klaar heeft staan, in de woorden van de gekozen manier (zoals easeExplain).
export function easeDoneLine(how: LegEaseHow, weightFollows = true): string {
  const rir = how === 'extra' ? EASE_RIR_EXTRA : EASE_RIR;
  if (weightFollows) {
    return how === 'alleen-gewicht'
      ? `Lichter gemaakt. In Forge staat minder gewicht klaar, met zeker ${rir} herhalingen over.`
      : `Lichter gemaakt. In Forge staan minder gewicht en minder sets klaar, met zeker ${rir} herhalingen over.`;
  }
  return how === 'alleen-gewicht'
    ? `Lichter gemaakt. In Forge staat zeker ${rir} herhalingen over klaar. Het gewicht blijft zoals voorgeschreven.`
    : `Lichter gemaakt. In Forge staan minder sets klaar, met zeker ${rir} herhalingen over. Het gewicht blijft zoals voorgeschreven.`;
}
export function easeMacroFactorLine(how: LegEaseHow): string {
  const rir = how === 'extra' ? EASE_RIR_EXTRA : EASE_RIR;
  return `Doe je de training in MacroFactor? Kies daar zelf een lichtere set met zeker ${rir} herhalingen over.`;
}
export const EASE_STARTED_LINE = 'Je bent al begonnen. Lichter kan nu per oefening.';
export const EASE_SAVE_FAILED = 'Opslaan lukte niet. Probeer het nog eens.';

// "Lichter gemaakt: 3 sets minder, 2 oefeningen lichter, Side plank vervalt."
export function easeSummary(r: Pick<EaseResult, 'setsRemoved' | 'lighter' | 'dropped'>): string {
  const parts: string[] = [];
  if (r.setsRemoved > 0) parts.push(r.setsRemoved === 1 ? '1 set minder' : `${r.setsRemoved} sets minder`);
  if (r.lighter > 0) parts.push(r.lighter === 1 ? '1 oefening lichter' : `${r.lighter} oefeningen lichter`);
  if (r.dropped.length === 1) parts.push(`${r.dropped[0]} vervalt`);
  else if (r.dropped.length > 1) parts.push(`${r.dropped.slice(0, -1).join(', ')} en ${r.dropped.at(-1)} vervallen`);
  return parts.length > 0 ? `Lichter gemaakt: ${parts.join(', ')}.` : 'Lichter gemaakt.';
}

// De regel onder een oefening die meer reserve kreeg.
export function easeExerciseReason(rir: number, because: string): string {
  return `Lichter door ${because}: zeker ${rir} herhalingen over.`;
}

// Waardoor de benen moe zijn, voor de regel onder een oefening ("Lichter door spierpijn"). Komt uit de
// redenen die bij de keuze bewaard zijn, zodat de regel na een herstart hetzelfde zegt.
export function easeBecause(reasons: readonly LegEaseReason[]): string {
  if (reasons.includes('spierpijn') || reasons.includes('flink')) return 'spierpijn';
  if (reasons.includes('harde-loop')) return 'je loop van vandaag';
  return 'vermoeide benen';
}

export function moveLabel(toDate: string): string {
  return `Naar ${weekdayLongNL(toDate)}`;
}

// --- de stille regel bij het verplaatsen --------------------------------------------------------

// Bij een zware beendag of harde training die je naar een dag zet: hoe vermoeid je benen daar
// ongeveer zijn. Alleen een regel, zonder knop en zonder iets te blokkeren; leeg als de index
// daar niet boven 12 komt. De instelling "Lichter bij vermoeide benen" op Uit zet ook deze regel uit.
export function moveLegNote(args: { sessionId: string; toDate: string; deps: SignalDeps; mode: LegEaseMode }): { line: string; explain: string } | undefined {
  const { sessionId, toDate, deps, mode } = args;
  if (mode === 'uit') return undefined;
  const session = deps.plannedSessions.find((s) => s.id === sessionId);
  const template = session ? deps.templates.find((t) => t.id === session.templateId) : undefined;
  if (!session || !template || isTestOrRace(template)) return undefined;
  const heavyLeg = template.type === 'strength' && isLegHeavyTemplate(template);
  if (!heavyLeg && !isHardRun(template)) return undefined;
  if (toDate < deps.today) return undefined;
  const moved = deps.plannedSessions.map((s) => (s.id === sessionId ? { ...s, scheduledDate: toDate } : s));
  const base = legFatigueOn(toDate, fatigueInputsFor(deps, moved)).index;
  const earlier = earlierTodayPoints(toDate, { logs: deps.logs, templates: deps.templates, plannedSessions: moved, program: deps.program, bodyKg: deps.bodyKg, excludeId: sessionId });
  const index = round1(base + earlier.points);
  if (index <= LEG_EASE_INDEX) return undefined;
  const day = weekdayLongNL(toDate);
  const line = index <= LEG_EASE_INDEX + FATIGUE_BAND
    ? `Op ${day} is je beenindex ongeveer ${number0(index)}, op de grens. Je kunt hem zo plannen, of een dag later.`
    : `Op ${day} is je beenindex ongeveer ${number0(index)}. Dat is ${fatigueWord(index).word.toLowerCase()}. Je kunt hem zo plannen, of een dag later.`;
  return { line, explain: 'Beenindex: wat je benen dan nog dragen van eerdere trainingen. Tot 12 kan een zware dag.' };
}
