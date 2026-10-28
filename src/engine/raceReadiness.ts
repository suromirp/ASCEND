// ASCEND, "Klaar voor je doel" voor een hardloopwedstrijd met een doeltijd.
//
// Een wedstrijd met een doeltijd gaat vooral over snelheid. Daarom is snelheid hier de hoofdmeter:
// het gat tussen je verwachte tijd nu en je doeltijd, omgerekend in weken werk bij gemiddelde groei
// (engine/goalGap.ts) en daaruit gevuld: 50% bij tien weken. De verwachte tijd komt uit de testloop die
// telt (countedTests, racePaces), dezelfde bron als de regel TARGET-TIME. Het getal blijft één
// percentage naast de andere meters, alleen met een andere verdeling (RACE_SPEED_WEIGHTS).
// De meter, de haalbaarheidsregel en "het meeste te winnen" lezen dezelfde weken.
// Zonder doeltijd, zonder afstand of voor andere doelen verandert er niets.
//
// Het doel blijft het doel: niets hier oordeelt over de doeltijd. De kaart toont de afstand tot het
// doel als werk, en wat de groei tot de wedstrijddag kan geven als feit.
//
// Puur: geen React, geen opslag. Besluiten: docs/beslissingen/2026-10-28-klaar-voor-je-doel-snelheid.md en
// 2026-10-28-klaar-voor-je-doel-logisch.md (snelheid als gat in weken in plaats van een tijdsverhouding).

import type { TrainingGoal } from '../models/goals';
import type { SessionLog } from '../models/training';
import type { TestJudgment } from '../models/testJudgment';
import { daysBetween, formatDateNL, formatShortDateNL } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { computeGoalReadiness, readinessInputOf, type GoalReadiness, type MissingMeter, type ReadinessOptions } from './goalReadiness';
import { goalDetailsOf } from './goalLabels';
import { GOAL_GROWTH } from '../data/goalGrowth';
import { fillFromWeeks, weeksOfWork } from './goalGap';
import { raceDayBand, racePaces } from './racePaces';
import { countedTests, formatRaceTime, type TestResult } from './racePrediction';
import { awaitsEffort } from './testJudgment';

// Hoe zwaar elke meter meetelt als er een doeltijd en een test zijn: snelheid 60%, langste loop 20%,
// weekvolume 20%. Eén constante; "Gelijk" in de instellingen laat ze even zwaar wegen. Volhouden telt
// hier niet mee (gewicht 0): op de Ascend-tab wordt die meter nooit gevuld, en zo staat snelheid altijd
// op 60% van wat meetelt.
export const RACE_SPEED_WEIGHTS: Record<string, number> = { verwachteTijd: 0.6, langsteLoop: 0.2, weekvolume: 0.2, volhouden: 0 };

// De zin over de weging, uit dezelfde constante (de kaart en het blad noemen nooit eigen getallen).
export function raceWeightSentence(): string {
  const speed = RACE_SPEED_WEIGHTS.verwachteTijd;
  const other = RACE_SPEED_WEIGHTS.langsteLoop;
  const same = RACE_SPEED_WEIGHTS.weekvolume === other;
  return `Snelheid telt voor ${Math.round(speed * 100)}% mee, ${same ? `je langste loop en je weekvolume voor ${Math.round(other * 100)}% elk` : `je langste loop voor ${Math.round(other * 100)}% en je weekvolume voor ${Math.round(RACE_SPEED_WEIGHTS.weekvolume * 100)}%`}. Elke meter stopt bij 100%.`;
}

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
  // "Verwacht nu 55:40. Doel 45:00: nog 10:40, ongeveer 1:04 per km."
  nowLine?: string;
  // Haalbaarheid als droog feit, uit dezelfde weken als de meter: "Bij gemiddelde groei rond 20 maart: 47 tot
  // 54 minuten. 45:00 vraagt ongeveer 39 weken; tot 20 maart zijn het er 21." De gebruiker oordeelt zelf.
  bandLine?: string;
  // Weken werk bij gemiddelde groei van de verwachte tijd naar de doeltijd (0 als je er al onder zit).
  weeksOfWork?: number;
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

  const work = weeksOfWork({ now: expected, need: target, lowerIsBetter: true, weeklyGain: GOAL_GROWTH.run.weekly });
  const share = fillFromWeeks(work);
  const gap = expected - target;
  // Eerst afronden op hele seconden, dan splitsen: nooit "0:60".
  const perKmSeconds = Math.round((Math.abs(gap) * 60) / km);
  const perKmText = `${Math.floor(perKmSeconds / 60)}:${String(perKmSeconds % 60).padStart(2, '0')}`;
  const nowBase = `Verwacht nu ${clock(expected)}.`;
  const nowLine = gap > 0.05
    ? `${nowBase} Doel ${clock(target)}: nog ${clock(gap)}, ongeveer ${perKmText} per km.`
    : `${nowBase} Doel ${clock(target)}: je zit er nu al onder.`;

  const weeks = goal.status === 'active' ? daysBetween(paces.test.date, goal.targetDate) / 7 : 0;
  const band = weeks > 0 && !paces.doubtful ? raceDayBand(expected, weeks) : undefined;
  let bandLine: string | undefined;
  if (band && goal.status === 'active') {
    const day = formatDateNL(goal.targetDate).replace(/ \d{4}$/, '');
    const head = `Bij gemiddelde groei rond ${day}: ${band.low} tot ${band.high} minuten`;
    const left = Math.max(0, daysBetween(date, goal.targetDate) / 7);
    if (target > band.high) bandLine = `${head}, je doel ligt erboven.`;
    else if (work <= left) bandLine = `${head}, je doel valt erbinnen.`;
    else {
      // Nooit "ongeveer 21 weken; er zijn er 21" als het net niet past.
      const need = Math.max(Math.round(work), Math.round(left) + 1);
      bandLine = `${head}. ${clock(target)} vraagt ongeveer ${need} weken; tot ${day} zijn het er ${Math.round(left)}.`;
    }
  }

  const kmText = formatNumberNL(paces.test.km, Number.isInteger(paces.test.km) ? 0 : 1);
  const basisLine = paces.test.basis === 'effort'
    ? `Uit je snelste ${kmText} km van ${formatShortDateNL(paces.test.date)} (${clock(paces.test.minutes)}).`
    : `Uit je hele run van ${kmText} km op ${formatShortDateNL(paces.test.date)} (${clock(paces.test.minutes)}).`;

  return {
    facts: { status: 'counted', targetMinutes: target, expectedMinutes: expected, nowLine, bandLine, basisLine, weeksOfWork: work },
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

  // De ontbrekende snelheid is hier geen "nog niets gemeten" maar één eigen regel, en Volhouden wordt op
  // de Ascend-tab nooit gevuld, dus dat noemen we niet.
  const missing: MissingMeter[] = r.missing.filter((m) => m.key !== SPEED_KEY && m.key !== 'volhouden');
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
  // Zonder het getal te herhalen: de meters staan er al.
  const weakestSentence = r.weakest ? `Hier is nog het meeste te winnen: ${r.weakest.label.toLowerCase()}.` : undefined;
  return { ...r, missing, missingSentence, sentence, weakestSentence, race: { ...now.facts, weighted: speedOn } };
}
