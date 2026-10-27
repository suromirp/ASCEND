// ASCEND: wanneer er een voorstel komt om een test te verschuiven, op grond van wat je zelf
// vastlegde (docs/beslissingen/2026-10-25-wat-speelde-er.md, vraag 2; onderzoek in
// docs/onderzoek/Alcohol en herstel.md en Cannabis en training.md).
//
// De reden: ASCEND rekent je tempo's uit de testloop. Na een avond met veel drinken valt een
// test vaak trager uit, en wat ASCEND daarna van je tempo denkt klopt dan minder. Daarom een
// voorstel, met Akkoord zoals elk voorstel; nooit stil, en nooit een oordeel over de avond zelf.
//
// Wanneer (alleen een testloop; een wedstrijd heeft een datum die ASCEND niet kan verzetten):
// - vandaag een test en de avond ervoor 3 of meer glazen;
// - morgen een test en vanavond 6 of meer glazen (een notitie van vandaag op een dag);
// - bij wiet alleen als de test dezelfde dag is en de notitie op die dag of bij die training staat.
// Nooit bij 1 à 2 glazen, nooit voor gewone trainingen, en niet als je het voorstel uitzette
// (AppSettings.influenceTestMove === false). Een test die al gelogd is of voorbij is blijft staan.
//
// Het voorstel zelf komt uit dezelfde zoektocht als het testvoorstel in engine/adviceEngine.ts
// (testMoveAdvice): dezelfde preview, dezelfde 48-uursregel voor de benen. Liever niet zorgt dat
// het voorstel die dag niet terugkomt (het id bevat de dag).
//
// Puur: geen React, geen IndexedDB.

import type { AlcoholAmount, InfluenceEntry } from '../models/influence';
import type { PlannedSession, SessionLog } from '../models/training';
import type { RecoveryMetric } from '../models/metrics';
import { AMOUNT_LABEL } from '../data/influenceReasons';
import { addDays, formatDateNL, weekdayShortNL } from '../utils/dates';
import { testMoveAdvice, type Advice, type AdviceInputs } from './adviceEngine';
import { morningOf } from './influenceEffects';
import { MIN_BASELINE_DAYS, baselineValues } from './wellnessCheck';

export const TEST_TEMPLATE_ID = 'tpl_test_run';
export const TEST_NAME = 'Testloop 5 km';

export interface InfluenceMoveCause {
  session: PlannedSession;
  reason: 'alcohol' | 'wiet';
  amount?: AlcoholAmount;
  // De test staat vandaag (anders morgen).
  today: boolean;
}

export interface MoveCauseInput {
  today: string;
  plannedSessions: PlannedSession[];
  logs: SessionLog[];
  entries: InfluenceEntry[];
  // AppSettings.influenceTestMove !== false
  enabled: boolean;
}

const AMOUNT_RANK: Record<AlcoholAmount, number> = { weinig: 1, matig: 2, veel: 3 };

function isDone(session: PlannedSession, logs: SessionLog[]): boolean {
  return logs.some((l) => l.plannedSessionId === session.id || (l.templateId === session.templateId && l.completedDate === session.scheduledDate));
}

// De zwaarste hoeveelheid alcohol die de ochtend `morning` raakt.
function alcoholFor(entries: InfluenceEntry[], morning: string): AlcoholAmount | undefined {
  let best: AlcoholAmount | undefined;
  for (const entry of entries) {
    if (morningOf(entry) !== morning) continue;
    for (const note of entry.reasons) {
      if (note.reason === 'alcohol' && note.amount && (!best || AMOUNT_RANK[note.amount] > AMOUNT_RANK[best])) best = note.amount;
    }
  }
  return best;
}

export function influenceMoveCause(input: MoveCauseInput): InfluenceMoveCause | undefined {
  if (!input.enabled || input.entries.length === 0) return undefined;
  const tomorrow = addDays(input.today, 1);
  const tests = input.plannedSessions
    .filter((s) => s.templateId === TEST_TEMPLATE_ID && s.status !== 'skipped' && (s.scheduledDate === input.today || s.scheduledDate === tomorrow) && !isDone(s, input.logs))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  for (const session of tests) {
    const date = session.scheduledDate;
    const isToday = date === input.today;
    const amount = alcoholFor(input.entries, date);
    // Vandaag: 3 of meer glazen de avond ervoor. Morgen: 6 of meer glazen.
    if (amount && AMOUNT_RANK[amount] >= (isToday ? 2 : 3)) return { session, reason: 'alcohol', amount, today: isToday };
    // Wiet: alleen dezelfde dag, en alleen als de notitie op die dag of bij die training staat.
    if (isToday && input.entries.some((e) => e.date === date && e.reasons.some((r) => r.reason === 'wiet'))) return { session, reason: 'wiet', today: true };
  }
  return undefined;
}

// --- het getal van vanochtend -------------------------------------------------------------------

export interface MorningNumber {
  restingHr: number;
  // Tegenover je eigen gemiddelde, als er minstens een week eigen dagen is.
  diff?: number;
}

// `skip`: ochtenden met "Deze nacht niet meetellen" (influence.ts#excludedMornings), zodat je gemiddelde
// gelijk is aan dat van de ochtendkaart.
export function morningNumber(today: string, metrics: RecoveryMetric[], skip?: ReadonlySet<string>): MorningNumber | undefined {
  const record = metrics.find((m) => m.date === today && m.restingHeartRate !== undefined);
  if (!record || record.restingHeartRate === undefined) return undefined;
  const base = baselineValues(today, metrics, (m) => m.restingHeartRate, skip);
  if (base.length < MIN_BASELINE_DAYS) return { restingHr: record.restingHeartRate };
  const avg = Math.round(base.reduce((a, b) => a + b, 0) / base.length);
  return { restingHr: record.restingHeartRate, diff: record.restingHeartRate - avg };
}

// --- de woorden -----------------------------------------------------------------------------------------

// Wat je zelf vastlegde, in jouw woorden.
export function noteWords(cause: Pick<InfluenceMoveCause, 'reason' | 'amount'>): string {
  if (cause.reason === 'wiet') return 'wiet';
  return cause.amount ? `alcohol, ${AMOUNT_LABEL[cause.amount]} glazen` : 'alcohol';
}

const short = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;

// De uitleg onder de titel: wat je vastlegde, het getal van vanochtend als dat er is, en waarom het
// voor ASCEND uitmaakt. Nooit wat je had moeten doen. `targetDate`: de dag waar het voorstel op uitkomt,
// alleen als er maar één keuze is.
// De zin op de kaart van Vandaag, met de naam van de test zoals die in je planning staat
// ("Testloop 5 km" wordt "testloop van 5 km").
export function influenceMoveLine(cause: InfluenceMoveCause, testName: string = TEST_NAME): string {
  const m = /^(.+?)\s+(\d+(?:[.,]\d+)?\s*km)$/i.exec(testName.trim());
  const name = m ? `${m[1].toLowerCase()} van ${m[2]}` : testName.trim().toLowerCase();
  return `Je ${name} staat ${cause.today ? 'vandaag' : 'morgen'}. Er ligt een voorstel om hem te verschuiven.`;
}

export function influenceMoveSummary(cause: InfluenceMoveCause, morning?: MorningNumber, targetDate?: string): string {
  const parts = [`Je legde vast: ${noteWords(cause)}.`];
  if (cause.today && morning) {
    const { restingHr, diff } = morning;
    const relation = diff === undefined ? '' : diff === 0 ? ', zoals je gemiddelde' : `, ${Math.abs(diff)} ${diff > 0 ? 'boven' : 'onder'} je gemiddelde`;
    parts.push(`Vanochtend is je rusthartslag ${restingHr}${relation}.`);
  }
  parts.push(
    cause.reason === 'wiet'
      ? 'Een rustig tempo kost na wiet vaak meer hartslag.'
      : 'Een test na zo\'n avond valt vaak trager uit.',
  );
  parts.push(`ASCEND rekent je tempo's uit de uitkomst van deze test.${targetDate ? ` Op ${short(targetDate)} zegt de uitkomst meer over je.` : ''}`);
  return parts.join(' ');
}

export function influenceMoveId(sessionId: string, today: string): string {
  return `testinfluence:${sessionId}:${today}`;
}

export interface InfluenceMove {
  advice: Advice;
  cause: InfluenceMoveCause;
  // Alleen als er één keuze is.
  targetDate?: string;
}

// Het voorstel zelf, of niets als dit al is beantwoord, als er geen plek is die de beenregels
// respecteert, of als er niets aan de hand is.
export function influenceMove(inputs: AdviceInputs, cause: InfluenceMoveCause | undefined): InfluenceMove | undefined {
  if (!cause) return undefined;
  const id = influenceMoveId(cause.session.id, inputs.asOf);
  if (inputs.respondedIds.has(id)) return undefined;
  const advice = testMoveAdvice(inputs, {
    sessionId: cause.session.id,
    id,
    title: `${TEST_NAME} verschuiven`,
    why: 'De testloop is het meetpunt voor je tempo: ASCEND stelt je tempo\'s af op de uitkomst. Alleen jij beslist, dit is een voorstel.',
  });
  if (!advice?.proposal) return undefined;
  const single = !advice.options || advice.options.length <= 1;
  const target = advice.proposal.changes.find((c) => c.plannedSessionId === cause.session.id && c.action === 'move')?.toDate;
  const targetDate = single ? target : undefined;
  return { advice: { ...advice, effect: influenceMoveSummary(cause, undefined, targetDate) }, cause, targetDate };
}
