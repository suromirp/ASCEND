// ASCEND: de beenindex leert van je ochtenden (Rooster ronde 6; docs/onderzoek/Beenindex leert van je
// ochtenden.md, "Wat Sherpa bouwt"; besluit docs/beslissingen/2026-11-26-beenindex-leert.md).
//
// Eén persoonlijke factor k op de som van de trainingen in de index, uit je antwoord op "Hoe voelen je
// benen?" naast wat het model die ochtend zei. Begrensd tussen 0,7 en 1,4, pas vanaf 20 gewogen ijkpunten,
// gekrompen naar 1, en hoogstens één voorstel per 28 dagen. De factor geldt pas na Akkoord.
//
// Veiligheid: alles wat beslist (de planner, ruimte voor een test, zware dagen, de zware week, lichter)
// rekent met legIndexSafeFactor = max(1, k): de ijking maakt alleen strenger. Alleen de woorden (Fris, Wat
// vermoeid, de voorinvulling van de ochtendvraag, de grafiek) volgen k ook onder 1. Pijnpunten, de
// spierpijnvloer en FATIGUE_THRESHOLDS veranderen nooit (engine/legFatigue.ts).
//
// Deterministisch, elke keer opnieuw uit de historie. Pure: no React, no IndexedDB.

import type { MorningCheckIn } from '../models/checkIn';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { LegAnswer, LegFactorEntry } from '../models/legIndex';
import type { SessionLog, SessionTemplate } from '../models/training';
import { addDays, daysBetween, localDateOf } from '../utils/dates';
import { FATIGUE_THRESHOLDS, LEG_FACTOR_MAX, LEG_FACTOR_MIN, clampFactor, fatigueEvents, legFatigueOn, type FatigueEvent } from './legFatigue';
import { suggestLegs } from './morningCard';

// --- de getallen (onderzoek, C) ---------------------------------------------------------------
export const LEARN_WINDOW_DAYS = 90;
export const ANSWER_KEEP_DAYS = 180;
export const MIN_MODEL_INDEX = 4;
export const MIN_WEIGHT = 20;
export const SHRINK_N0 = 20;
export const CONFIRM_WEIGHT = 0.5;
export const PROPOSAL_REST_DAYS = 28;
export const MIN_STEP = 0.1;
export const MAX_STEP = 0.15;
export const POOR_FIT_SHARE = 0.4;
const SEARCH_FROM = 0.5;
const SEARCH_TO = 2;
const FRESH = FATIGUE_THRESHOLDS.test.fresh; // 8
const HARD = FATIGUE_THRESHOLDS.hard.fresh; // 12
const ILLNESS_AFTER_DAYS = 3;
const TREK_AFTER_DAYS = 2;

export type LegLearningMode = 'aan' | 'uit';
export function resolveLegLearning(v: unknown): LegLearningMode {
  return v === 'uit' ? 'uit' : 'aan';
}

const round05 = (x: number) => Math.round(x * 20) / 20;
const round2 = (x: number) => Math.round(x * 100) / 100;

// --- de geldende factor -----------------------------------------------------------------------
// De laatste rij die de factor zet: akkoord zet zijn factor, standaard en uit zetten 1, liever-niet niets.
// Met het leren uit is de factor altijd 1. Een kapot getal is 1.
export function currentLegFactor(log: LegFactorEntry[] | undefined, mode: LegLearningMode = 'aan'): number {
  if (mode === 'uit') return 1;
  const setting = [...(log ?? [])].filter((e) => e.source !== 'liever-niet').sort((a, b) => a.at.localeCompare(b.at)).pop();
  if (!setting || setting.source !== 'akkoord') return 1;
  return clampFactor(setting.factor);
}

// Voor alles wat beslist: nooit lager dan 1, dus nooit soepeler dan het model.
export function legIndexSafeFactor(k: number): number {
  return Math.max(1, clampFactor(k));
}
// Voor de woorden: de factor zelf, binnen de band.
export function legIndexShownFactor(k: number): number {
  return clampFactor(k);
}

// De twee factoren uit de instellingen: `safe` voor alles wat beslist, `shown` voor de woorden.
export function legFactorsOf(s: { legFactorLog?: LegFactorEntry[]; legIndexLearning?: unknown }): { safe: number; shown: number } {
  const k = currentLegFactor(s.legFactorLog, resolveLegLearning(s.legIndexLearning));
  return { safe: legIndexSafeFactor(k), shown: legIndexShownFactor(k) };
}

// --- de antwoorden ---------------------------------------------------------------------------
// Een ochtendcheck als benenantwoord, of niets (geen benen, alleen een plek gescoord).
export function answerOf(c: MorningCheckIn): LegAnswer | undefined {
  if (c.allNormal) return { date: c.date, legs: 'goed' };
  if (!c.legs) return undefined;
  return {
    date: c.date, legs: c.legs,
    ...(c.soreWhere === 'upper' && (c.legs === 'spierpijn' || c.legs === 'flink') ? { upper: true as const } : {}),
    ...(c.legsFrom === 'voorstel' || c.legsFrom === 'zelf' ? { from: c.legsFrom } : {}),
  };
}

// De historie: de bewaarde rijen van voor de oudste ochtendcheck, en de ochtendchecks zelf. Voor een datum
// die in beide staat geldt de ochtendcheck (die kun je vandaag nog wijzigen of ongedaan maken).
export function legAnswerHistory(archive: LegAnswer[] | undefined, checkIns: MorningCheckIn[] | undefined): LegAnswer[] {
  const current = (checkIns ?? []).map(answerOf).filter((a): a is LegAnswer => !!a);
  const dates = new Set((checkIns ?? []).map((c) => c.date));
  const oldest = (checkIns ?? []).reduce<string | undefined>((m, c) => (!m || c.date < m ? c.date : m), undefined);
  const kept = new Map<string, LegAnswer>();
  for (const a of archive ?? []) if (!dates.has(a.date) && (!oldest || a.date < oldest)) kept.set(a.date, a);
  for (const a of current) kept.set(a.date, a);
  return [...kept.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Bij het opslaan van de ochtendchecks: wat vooraan afvalt (ouder dan de oudste die blijft) komt in de
// lijst, als die datum er nog niet in staat. Bestaande rijen veranderen nooit; ouder dan 180 dagen valt weg.
export function archiveLegAnswers(archive: LegAnswer[] | undefined, before: MorningCheckIn[] | undefined, after: MorningCheckIn[] | undefined, today: string): LegAnswer[] | undefined {
  const keptDates = new Set((after ?? []).map((c) => c.date));
  const oldestAfter = (after ?? []).reduce<string | undefined>((m, c) => (!m || c.date < m ? c.date : m), undefined);
  const known = new Set((archive ?? []).map((a) => a.date));
  const added: LegAnswer[] = [];
  for (const c of before ?? []) {
    if (keptDates.has(c.date) || known.has(c.date)) continue;
    // Alleen wat vooraan afvalt; een ochtend die je zelf wist of ongedaan maakt, komt er niet in.
    if (!oldestAfter || c.date >= oldestAfter) continue;
    const a = answerOf(c);
    if (a) { added.push(a); known.add(a.date); }
  }
  const since = addDays(today, -ANSWER_KEEP_DAYS);
  const pruned = (archive ?? []).filter((a) => a.date >= since);
  if (added.length === 0 && pruned.length === (archive ?? []).length) return archive;
  return [...pruned, ...added.filter((a) => a.date >= since)].sort((a, b) => a.date.localeCompare(b.date));
}

// --- ijkpunten -------------------------------------------------------------------------------
export interface CalibrationPoint {
  date: string;
  m: number; // de modelindex die ochtend: zonder pijnpunten, zonder spierpijnvloer, met k = 1
  lo: number; // het interval voor k
  hi: number; // Infinity bij spierpijn
  weight: number;
}

export interface LegLearningInput {
  today: string;
  answers: LegAnswer[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  bodyKg?: number;
  illness?: IllnessEpisode[];
  leave?: LeavePeriod[];
}

// Tijdens een ziekte en drie dagen erna, en tijdens een tocht en twee dagen erna, zegt je ochtend iets anders.
function excluded(date: string, input: LegLearningInput): boolean {
  for (const e of input.illness ?? []) {
    const end = e.endDate ? addDays(e.endDate, ILLNESS_AFTER_DAYS) : '9999-12-31';
    if (date >= e.startDate && date <= end) return true;
  }
  for (const p of input.leave ?? []) {
    if (p.kind !== 'trek') continue;
    if (date >= p.startDate && date <= addDays(p.endDate, TREK_AFTER_DAYS)) return true;
  }
  return false;
}

export function calibrationPoints(input: LegLearningInput): CalibrationPoint[] {
  const since = addDays(input.today, -LEARN_WINDOW_DAYS);
  const answers = input.answers.filter((a) => a.date >= since && a.date <= input.today && !a.upper);
  if (answers.length === 0) return [];
  // Alleen de logs: geplande trainingen tellen niet voor een ochtend die al voorbij is.
  const base = { logs: input.logs, plannedSessions: [], templates: input.templates, today: input.today, bodyKg: input.bodyKg };
  const events: FatigueEvent[] = fatigueEvents(base);
  const points: CalibrationPoint[] = [];
  for (const a of answers) {
    if (excluded(a.date, input)) continue;
    // Alleen wat voor die ochtend gelogd was (legFatigueOn telt een training van de dag zelf niet).
    const before = events.filter((e) => e.date < a.date);
    const r = legFatigueOn(a.date, { ...base, logs: input.logs.filter((l) => l.completedDate < a.date) }, before);
    // Beenpijn in de 72 uur ervoor (dezelfde regel als de index zelf): telt niet mee.
    if (r.painRecent) continue;
    const m = r.contributions.reduce((n, c) => n + c.points, 0);
    if (m < MIN_MODEL_INDEX) continue;
    const legs = a.legs === 'goed' ? 'fris' : a.legs;
    const lo = legs === 'fris' ? 0 : legs === 'stijf' ? FRESH / m : HARD / m;
    const hi = legs === 'fris' ? FRESH / m : legs === 'stijf' ? HARD / m : Infinity;
    // Zegt niets binnen de band: telt niet.
    if (lo <= LEG_FACTOR_MIN && hi >= LEG_FACTOR_MAX) continue;
    const confirmed = a.legs === 'goed' || a.from === 'voorstel' || (a.from === undefined && suggestLegs(r) === a.legs);
    points.push({ date: a.date, m: Math.round(m * 100) / 100, lo, hi, weight: confirmed ? CONFIRM_WEIGHT : 1 });
  }
  return points;
}

// De afstand van ln k tot het interval in ln-ruimte; 0 als k erin ligt.
function distance(k: number, p: Pick<CalibrationPoint, 'lo' | 'hi'>): number {
  const lk = Math.log(k);
  if (p.lo > 0 && k < p.lo) return Math.log(p.lo) - lk;
  if (k > p.hi) return lk - Math.log(p.hi);
  return 0;
}

// De mediaan over intervallen: de k van 0,50 tot 2,00 met het kleinste gewogen verlies. Bij gelijk verlies de k
// die het dichtst bij 1 ligt, en dan de grootste (de voorzichtige kant).
export function fitFactor(points: CalibrationPoint[]): number {
  let best = 1;
  let bestLoss = Infinity;
  for (let i = Math.round(SEARCH_FROM * 100); i <= Math.round(SEARCH_TO * 100); i++) {
    const k = i / 100;
    const loss = points.reduce((s, p) => s + p.weight * distance(k, p), 0);
    const better = loss < bestLoss - 1e-12
      || (Math.abs(loss - bestLoss) <= 1e-12 && (Math.abs(k - 1) < Math.abs(best - 1) - 1e-9 || (Math.abs(Math.abs(k - 1) - Math.abs(best - 1)) <= 1e-9 && k > best)));
    if (better) { best = k; bestLoss = loss; }
  }
  return best;
}

// --- de uitkomst -----------------------------------------------------------------------------
export type LegLearning =
  | { status: 'uit'; current: 1 }
  | { status: 'te-weinig'; current: number; weight: number; needed: number }
  | { status: 'past-slecht'; current: number; weight: number; fit: number }
  | { status: 'klaar'; current: number; weight: number; fit: number; target: number; atEdge: boolean; proposal?: LegProposal };

export interface LegProposal {
  factor: number;
  from: number;
  up: boolean;
  line: string;
}

export function legLearning(input: LegLearningInput & { mode: LegLearningMode; factorLog?: LegFactorEntry[] }): LegLearning {
  if (input.mode === 'uit') return { status: 'uit', current: 1 };
  const current = currentLegFactor(input.factorLog, input.mode);
  const points = calibrationPoints(input);
  const weight = round2(points.reduce((s, p) => s + p.weight, 0));
  if (weight < MIN_WEIGHT) return { status: 'te-weinig', current, weight, needed: Math.ceil((MIN_WEIGHT - weight) * 2) / 2 };
  const fit = fitFactor(points);
  // Past slecht: met 10 procent speling aan beide kanten valt meer dan 40 procent van het gewicht buiten.
  const off = points.filter((p) => fit < p.lo * 0.9 || fit > p.hi * 1.1).reduce((s, p) => s + p.weight, 0);
  if (off > POOR_FIT_SHARE * weight) return { status: 'past-slecht', current, weight, fit };
  const shrunk = Math.exp((weight / (weight + SHRINK_N0)) * Math.log(fit));
  const target = round05(clampFactor(shrunk));
  const atEdge = fit <= LEG_FACTOR_MIN || fit >= LEG_FACTOR_MAX;
  const out: LegLearning = { status: 'klaar', current, weight, fit, target, atEdge };
  const diff = round2(target - current);
  if (Math.abs(diff) < MIN_STEP - 1e-9) return out;
  // Hoogstens één voorstel per 28 dagen: een Akkoord of Liever niet in die tijd houdt het stil.
  const since = addDays(input.today, -PROPOSAL_REST_DAYS);
  if ((input.factorLog ?? []).some((e) => (e.source === 'akkoord' || e.source === 'liever-niet') && localDateOf(e.at) > since)) return out;
  const step = Math.max(-MAX_STEP, Math.min(MAX_STEP, diff));
  const factor = round05(clampFactor(current + step));
  if (factor === current) return out;
  return { ...out, proposal: { factor, from: current, up: factor > current, line: proposalLine(factor, factor > current) } };
}

export const pct = (k: number) => `${Math.round(k * 100)} procent`;

export function proposalLine(factor: number, up: boolean): string {
  return up
    ? `Je benen voelen vaker zwaarder dan de index zegt. Reken met ${pct(factor)}?`
    : `Je benen voelen vaker frisser dan de index zegt. Toon de index met ${pct(factor)}? De planning blijft voorzichtig rekenen.`;
}

// Wat de app zegt bij elke uitkomst, in één zin.
export function learningLine(l: LegLearning): string {
  switch (l.status) {
    case 'uit': return 'Uit. De index rekent zoals het model.';
    case 'te-weinig': return `Nog ongeveer ${formatHalf(l.needed)} ochtenden met een duidelijk antwoord nodig voor een eerste uitkomst.`;
    case 'past-slecht': return 'Je ochtenden en de beenindex lopen vaak uiteen, in beide richtingen. Een factor lost dat niet op.';
    case 'klaar': {
      const now = l.current < 1
        ? `De index toont je benen met ${pct(l.current)}. De planning rekent voorzichtig met de standaardindex.`
        : `De index rekent met ${pct(l.current)}.`;
      if (l.proposal) return now;
      const edge = l.atEdge ? ' Je benen wijken verder af dan de app wil bijstellen.' : '';
      return l.target === l.current ? `${now} Dat past bij je ochtenden.${edge}` : `${now}${edge}`;
    }
  }
}

const formatHalf = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','));

// De regel bij je eigen factor op de kaart Benen en in Je stand. Onder 1 zegt hij erbij dat de planning
// voorzichtig blijft, want dan kan de kaart Fris zeggen terwijl de planner een test nog niet toelaat.
export function ownFactorLine(shown: number): string {
  const head = `Met je eigen factor van ${pct(shown)}.`;
  return shown < 1 ? `${head} De planning rekent voorzichtig met de standaardindex.` : head;
}

// Of de woorden en de planning uiteenlopen: alleen met een factor onder 1.
export function planningStaysCareful(k: number): boolean {
  return clampFactor(k) < 1;
}

// Dagen sinds het laatste besluit, voor de uitleg.
export function daysSinceDecision(log: LegFactorEntry[] | undefined, today: string): number | undefined {
  const last = [...(log ?? [])].sort((a, b) => a.at.localeCompare(b.at)).pop();
  return last ? daysBetween(localDateOf(last.at), today) : undefined;
}

// --- een besluit bewaren ---------------------------------------------------------------------
// Een besluit is altijd een nieuwe rij achteraan; bestaande rijen blijven zoals ze zijn.
export function addLegDecision(log: LegFactorEntry[] | undefined, source: LegFactorEntry['source'], factor: number, at: string): LegFactorEntry[] {
  return [...(log ?? []), { at, factor: source === 'akkoord' ? clampFactor(factor) : 1, source }];
}

// Of een wijziging de factor verandert waarmee de planning rekent. Dan gaat ze als voorstel met Akkoord
// langs de planning (components/settings/usePlanSettingChange.tsx); anders is het alleen een woord.
export function changesPlanningFactor(
  before: { legFactorLog?: LegFactorEntry[]; legIndexLearning?: unknown },
  after: { legFactorLog?: LegFactorEntry[]; legIndexLearning?: unknown },
): boolean {
  return legFactorsOf(before).safe !== legFactorsOf(after).safe;
}

// De waarde van de rij Index en je benen in Je stand, uit het leren: een voorstel gaat voor, dan je eigen
// factor. Niets te zeggen (uit, te weinig, standaard) is geen rij; de metingen bij het inlopen gaan voor.
// `checks`: de waarde uit de metingen bij het inlopen (engine/standPage.ts#indexCheckValue).
export function legLearningRowValue(l: LegLearning, checks?: string): string | undefined {
  if (l.status === 'klaar' && l.proposal) return 'Een voorstel';
  if (checks) return checks;
  if (l.status !== 'uit' && l.current !== 1) return `Eigen factor ${pct(l.current)}`;
  return undefined;
}
