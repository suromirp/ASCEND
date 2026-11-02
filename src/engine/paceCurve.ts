// ASCEND: een persoonlijke tempocurve tussen twee testen in, als controle naast de test
// (docs/onderzoek/Kansen met gegevens.md, kans F; docs/beslissingen/2026-11-01-kansen-middelgroot.md).
//
// De test blijft de bron voor je tempo's (docs/beslissingen/2026-10-27-testloop-lezen.md): de
// tempo's, de voorspelling en het horloge lezen pacesFromLogs/countedTests, en deze functie
// verandert daar niets aan. Ze kijkt alleen of je gewone loopjes sinds de laatste test die telt
// daar iets anders over zeggen, en zegt dat in één zin.
//
// Wat telt per loop: de snelste 5 km uit de details (`runDetail.bestFive`), of zonder die de
// snelste drie hele kilometers achter elkaar. Alleen hardlopen buiten, geen test en geen wedstrijd
// (herkend aan de rol van het sjabloon, templateRoles.ts; een wedstrijd is geen training), na de laatste
// test die telt en tot en met vandaag. Het stuk wordt met dezelfde VDOT als de tempo's
// (racePaces.ts#vdotOf) naast de test gelegd.
//
// Je loopt in training zelden voluit, dus de curve is een ondergrens. Daarom:
// - sneller: een stuk meer dan de gewone spreiding van een test sneller (TEST_NOISE, 3,5 procent);
// - past: tot 10 procent trager dan de test;
// - rustiger: nog trager, en dat is normaal, geen achteruitgang.
// Pas na drie loopjes met zo'n stuk en drie weken na de test, zodat het niet de eerste week na
// een test al iets zegt (Smyth en Muniz-Pumares 2020, matig bewijs; Runalyze, fabrikant).
//
// Puur: geen React, geen IndexedDB.

import type { SessionLog } from '../models/training';
import { formatRaceTime, TEST_NOISE, type TestResult } from './racePrediction';
import { vdotOf } from './racePaces';
import { idHasRole, type RoleCarrier } from './templateRoles';
import { isIndoorLog, logSport } from './sports';
import { addDays, formatDayMonthNL } from '../utils/dates';

export const CURVE_MIN = { runs: 3, days: 21 };
// Zo veel trager dan de test past nog: in training loop je niet voluit.
const CURVE_FITS_BELOW = 0.1;
const THREE_KM = 3;

export interface TrainingEffort {
  logId: string;
  date: string;
  km: number;
  minutes: number;
  vdot: number;
}

// De snelste drie hele kilometers achter elkaar, in seconden.
function fastestThree(kmsSec: number[]): number | undefined {
  let best: number | undefined;
  for (let i = 0; i + THREE_KM <= kmsSec.length; i++) {
    const sum = kmsSec[i] + kmsSec[i + 1] + kmsSec[i + 2];
    if (best === undefined || sum < best) best = sum;
  }
  return best;
}

// `templates`: de sjablonen, zodat een test of wedstrijd aan zijn rol herkend wordt; zonder een bekend
// sjabloon gelden de rollen van het id.
export function trainingEffort(log: SessionLog, templates?: Iterable<RoleCarrier>): TrainingEffort | undefined {
  if (idHasRole(log.templateId, 'test', templates) || idHasRole(log.templateId, 'race', templates)) return undefined;
  if (logSport(log) !== 'running' || isIndoorLog(log)) return undefined;
  const d = log.runDetail;
  if (!d) return undefined;
  const make = (km: number, sec: number): TrainingEffort | undefined =>
    sec > 0 ? { logId: log.id, date: log.completedDate, km, minutes: sec / 60, vdot: vdotOf(km, sec / 60) } : undefined;
  if (d.bestFive && d.bestFive.sec > 0) return make(5, d.bestFive.sec);
  // Alleen hele kilometers: het laatste stuk is korter.
  const whole = d.kms.filter((k) => !k.partial && k.distanceM >= 990).map((k) => k.sec);
  const three = fastestThree(whole);
  return three === undefined ? undefined : make(THREE_KM, three);
}

type PaceCurveVerdict = 'faster' | 'fits' | 'easier';

export type PaceCurve =
  | { state: 'wait'; test: TestResult; runs: number; readyFrom: string }
  | { state: 'ready'; test: TestResult; runs: number; best: TrainingEffort; verdict: PaceCurveVerdict };

// `test`: de test waar je tempo's uit komen, dus die van pacesFromLogs (testJudgment.ts), nooit
// zelf de laatste testlog. Undefined zonder test.
export function paceCurve(logs: readonly SessionLog[], test: TestResult | undefined, today: string, templates?: readonly RoleCarrier[]): PaceCurve | undefined {
  if (!test || test.km <= 0 || test.minutes <= 0) return undefined;
  const efforts = logs
    .filter((l) => l.completedDate > test.date && l.completedDate <= today)
    .map((l) => trainingEffort(l, templates))
    .filter((e): e is TrainingEffort => e !== undefined);
  const readyFrom = addDays(test.date, CURVE_MIN.days);
  if (efforts.length < CURVE_MIN.runs || today < readyFrom) return { state: 'wait', test, runs: efforts.length, readyFrom };
  const best = efforts.reduce((a, b) => (b.vdot > a.vdot || (b.vdot === a.vdot && b.date > a.date) ? b : a));
  const ratio = best.vdot / vdotOf(test.km, test.minutes);
  const verdict: PaceCurveVerdict = ratio - 1 > TEST_NOISE ? 'faster' : ratio >= 1 - CURVE_FITS_BELOW ? 'fits' : 'easier';
  return { state: 'ready', test, runs: efforts.length, best, verdict };
}

// "Je snelste 5 km in training sinds je test was 26:40, op 22 sep. Dat past bij je testtempo's."
export function paceCurveLine(curve: Extract<PaceCurve, { state: 'ready' }>): string {
  const fact = `Je snelste ${curve.best.km} km in training sinds je test was ${formatRaceTime(curve.best.minutes)}, op ${formatDayMonthNL(curve.best.date)}.`;
  if (curve.verdict === 'faster') return `${fact} Je trainingen wijzen op iets sneller dan je laatste test. Een nieuwe test over een paar weken zegt meer.`;
  if (curve.verdict === 'easier') return `${fact} Dat is rustiger dan je test, en dat hoort zo: in training loop je zelden voluit.`;
  return `${fact} Dat past bij je testtempo's.`;
}

// Zolang het wacht: vanaf wanneer en hoeveel loopjes er al zijn.
export function paceCurveWaitLine(curve: Extract<PaceCurve, { state: 'wait' }>, today: string): string {
  const runs = Math.max(0, CURVE_MIN.runs - curve.runs);
  const parts: string[] = [];
  if (today < curve.readyFrom) parts.push(`vanaf ${formatDayMonthNL(curve.readyFrom)}`);
  if (runs > 0) parts.push(`na nog ${runs} ${runs === 1 ? 'loop' : 'loopjes'} met details`);
  return `Je snelste stukken in training legt ASCEND ${parts.join(' en ')} naast je test.`;
}
