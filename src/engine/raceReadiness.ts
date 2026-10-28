// ASCEND, "Klaar voor je doel" voor een hardloopwedstrijd met een doeltijd.
//
// Een wedstrijd met een doeltijd gaat vooral over snelheid. Daarom is snelheid hier de hoofdmeter:
// je doeltijd gedeeld door je verwachte tijd nu, begrensd op 100%. De verwachte tijd komt uit de
// testloop die telt (countedTests, racePaces), dezelfde bron als de regel TARGET-TIME. Het getal
// blijft één percentage naast de andere meters, alleen met een andere verdeling (RACE_SPEED_WEIGHTS).
// Zonder doeltijd, zonder afstand of voor andere doelen verandert er niets.
//
// Het doel blijft het doel: niets hier oordeelt over de doeltijd. De kaart toont de afstand tot het
// doel als werk, en wat de groei tot de wedstrijddag kan geven als feit.
//
// Puur: geen React, geen opslag. Besluit: docs/beslissingen/2026-10-28-klaar-voor-je-doel-snelheid.md.

import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import type { TestJudgment } from '../models/testJudgment';
import { daysBetween, formatDateNL, formatShortDateNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { computeGoalReadiness, readinessInputOf, type GoalReadiness, type MissingMeter, type ReadinessOptions } from './goalReadiness';
import { goalDetailsOf } from './goalLabels';
import { raceDayBand, racePaces } from './racePaces';
import { countedTests, formatRaceTime, type TestResult } from './racePrediction';
import { awaitsEffort } from './testJudgment';

// Hoe zwaar elke meter meetelt als er een doeltijd en een test zijn: snelheid 60%, langste loop 20%,
// weekvolume 20%. Eén constante; "Gelijk" in de instellingen laat ze even zwaar wegen.
export const RACE_SPEED_WEIGHTS: Record<string, number> = { verwachteTijd: 0.6, langsteLoop: 0.2, weekvolume: 0.2 };

export type ReadinessWeighting = 'speed' | 'equal';
// "Klaar voor je doel bij een doeltijd" (AppSettings.readinessWeighting): afwezig of onbekend = snelheid.
export const resolveReadinessWeighting = (v: unknown): ReadinessWeighting => (v === 'equal' ? 'equal' : 'speed');

export type SpeedStatus = 'counted' | 'waiting' | 'none' | 'no-target';

export interface RaceFacts {
  status: SpeedStatus;
  // Snelheid weegt het zwaarst in het getal (niet bij "Gelijk" of zonder tijd).
  weighted?: boolean;
  targetMinutes?: number;
  expectedMinutes?: number;
  // "Verwacht nu ongeveer 55:40. Doel 45:00: nog 10:40, ongeveer 1:04 per km sneller."
  nowLine?: string;
  // "Bij deze groei rond 20 maart: 47 tot 54 minuten."
  bandLine?: string;
  // "Uit je snelste 5 km van 12 okt (26:42)." of "Uit je hele run van 5 km op 12 okt (26:42)."
  basisLine?: string;
  // Eén regel als er geen tijd te geven is: de test wacht op Akkoord, of er is geen test.
  statusLine?: string;
}

export type RaceReadiness = GoalReadiness & { race?: RaceFacts };

export interface RaceReadinessOptions {
  naming: { the: string; your: string };
  judgments?: TestJudgment[];
  ask?: boolean;
  weighting?: ReadinessWeighting;
}

export const WAITING_LINE = 'Je testloop wacht nog op je Akkoord.';
export const NO_TEST_LINE = 'Nog geen testloop: loop er een om je tijd te kennen.';

const SPEED_KEY = 'verwachteTijd';

// Minuten als "10:40" (afgerond op hele seconden), ook boven het uur.
const clock = (minutes: number) => formatRaceTime(Math.max(0, minutes));

interface Speed {
  facts: RaceFacts;
  share?: number;
  text?: string;
  test?: TestResult;
}

function speedAt(goal: TrainingGoal, logs: SessionLog[], date: string, options: RaceReadinessOptions): Speed {
  const d = goalDetailsOf(goal);
  const target = d.targetMinutes;
  const km = d.distanceKm;
  if (!target || !km || !(d.variant === '5k' || d.variant === '10k' || d.variant === 'half')) return { facts: { status: 'no-target' } };
  const seen = logs.filter((l) => l.completedDate <= date);
  const counted = countedTests(seen, { judgments: options.judgments, ask: options.ask });
  const latest = counted.tests.at(-1);
  // Een snelste 5 km die op Akkoord wacht verandert het getal nog: dan geen tijd noemen (zoals TARGET-TIME).
  if (!latest || awaitsEffort(seen, latest.logId)) {
    const waiting = !!latest || counted.pending !== undefined || counted.waiting.length > 0;
    return { facts: { status: waiting ? 'waiting' : 'none', targetMinutes: target, statusLine: waiting ? WAITING_LINE : NO_TEST_LINE } };
  }
  const paces = racePaces(counted.tests, km);
  const expected = paces?.race?.minutes;
  if (!paces || expected === undefined) return { facts: { status: 'none', targetMinutes: target, statusLine: NO_TEST_LINE } };

  const share = Math.max(0, Math.min(1, target / expected));
  const gap = expected - target;
  const perKm = (Math.abs(gap) * 60) / km;
  const perKmText = `${Math.floor(perKm / 60)}:${String(Math.round(perKm % 60)).padStart(2, '0')}`;
  const nowBase = `Verwacht nu ongeveer ${clock(expected)}.`;
  const nowLine = gap > 0.05
    ? `${nowBase} Doel ${clock(target)}: nog ${clock(gap)}, ongeveer ${perKmText} per km sneller.`
    : `${nowBase} Doel ${clock(target)}: dat is al binnen bereik.`;

  const weeks = goal.status === 'active' ? daysBetween(paces.test.date, goal.targetDate) / 7 : 0;
  const band = weeks > 0 && !paces.doubtful ? raceDayBand(expected, weeks) : undefined;
  const bandLine = band && goal.status === 'active'
    ? `Bij deze groei rond ${formatDateNL(goal.targetDate).replace(/ \d{4}$/, '')}: ${band.low} tot ${band.high} minuten.`
    : undefined;

  const kmText = formatNumberNL(paces.test.km, Number.isInteger(paces.test.km) ? 0 : 1);
  const basisLine = paces.test.basis === 'effort'
    ? `Uit je snelste ${kmText} km van ${formatShortDateNL(paces.test.date)} (${clock(paces.test.minutes)}).`
    : `Uit je hele run van ${kmText} km op ${formatShortDateNL(paces.test.date)} (${clock(paces.test.minutes)}).`;

  return {
    facts: { status: 'counted', targetMinutes: target, expectedMinutes: expected, nowLine, bandLine, basisLine },
    share,
    text: `${clock(expected)}, doel ${clock(target)}`,
    test: paces.test,
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

// "Klaar voor je doel" voor een hardloopwedstrijd. Een wedstrijd zonder doeltijd geeft wat
// computeGoalReadiness gaf, zonder `race`.
export function computeRaceReadiness(goal: TrainingGoal, logs: SessionLog[], today: string, options: RaceReadinessOptions): RaceReadiness | undefined {
  const input = readinessInputOf(goal);
  if (!input) return undefined;
  const weighting = options.weighting ?? 'speed';
  const base: ReadinessOptions = { naming: options.naming, since: goal.createdAt.slice(0, 10) };
  const now = speedAt(goal, logs, today, options);
  if (now.facts.status === 'no-target') return computeGoalReadiness(input, logs, today, base);

  const external = (id: string, date: string) => {
    if (id !== SPEED_KEY) return undefined;
    const at = date === today ? now : speedAt(goal, logs, date, options);
    return at.share === undefined || at.text === undefined ? undefined : { share: at.share, text: at.text };
  };
  const speedOn = weighting === 'speed' && now.share !== undefined;
  const r = computeGoalReadiness(input, logs, today, { ...base, external, weights: speedOn ? RACE_SPEED_WEIGHTS : undefined });

  // De ontbrekende snelheid is hier geen "nog niets gemeten" maar één eigen regel.
  const missing: MissingMeter[] = r.missing.filter((m) => m.key !== SPEED_KEY);
  const missingSentence = missing.length > 0
    ? `Hier is nog niets van gemeten: ${missing.map((m) => `je ${m.label.toLowerCase()}`).join(', ').replace(/, ([^,]*)$/, ' en $1')}.`
    : undefined;
  let sentence = r.sentence;
  if (speedOn) {
    const rest = r.meters.filter((m) => m.key !== SPEED_KEY);
    const items = rest.map((m) => `je ${m.label.toLowerCase()} ${m.text}`);
    const list = items.length > 1 ? `${items.slice(0, -1).join(', ')} en ${items.at(-1)}` : items[0];
    sentence = `Zo sta je ervoor. Snelheid telt voor ${pct(RACE_SPEED_WEIGHTS[SPEED_KEY])} mee${list ? `, daarnaast ${list}` : ''}.`;
  }
  return { ...r, missing, missingSentence, sentence, race: { ...now.facts, weighted: speedOn } };
}
