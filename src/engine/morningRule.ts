// ASCEND: de ochtendregel "twee van drie" (docs/onderzoek/Kansen met gegevens.md, kans C;
// docs/beslissingen/2026-10-31-kansen-stap-0.md).
//
// De drie getallen van je horloge, elk met een woord oordeel tegen je eigen gewone van de 28
// dagen ervoor: "rusthartslag 4 hoger dan normaal", "HRV normaal", "slaap 1 uur korter dan
// normaal". Wijken er twee van de drie af, dan vraagt de ochtend of je moe bent. Bijsturen op
// meerdere signalen samen gaf bij recreatieve lopers vooral minder slechte uitkomsten (Nuuttila
// e.a. 2022, bewijs matig); "twee van drie" is een vertaling daarvan, geen getoetste regel.
//
// Afwijken, in de richting die aandacht vraagt:
// - rusthartslag: minstens 5 slagen boven je gemiddelde (dezelfde grens als de ochtendkaart);
// - HRV: onder je gewone bereik (gemiddelde min de grootste van spreiding en 7 procent);
// - slaap: korter dan 6 uur, of minstens een uur korter dan je gemiddelde.
//
// Een nacht die je "niet goed gemeten" noemde telt niet voor slaap en HRV, een ochtend die je bij
// "Wat speelde er" niet liet meetellen niet voor rusthartslag en HRV. Zonder een week eigen
// ochtenden is er geen oordeel. Het is een vraag: de planning verandert alleen via een voorstel met
// Akkoord, en dat maakt deze functie niet.
//
// Puur: geen React, geen IndexedDB. De ochtendkaart toont hem (components/MorningCard.tsx): onder
// elk horlogegetal het woord uit `ruleWord`, en bij `askTired` de vraag met `TIRED_CHOICES`, waarvan
// het antwoord de energie van de ochtendcheck wordt. Zie de instelling "Twee van drie"
// (signalSettings.ts, `morningRule`).

import type { EnergyFeeling } from '../models/checkIn';
import type { RecoveryMetric } from '../models/metrics';
import { baselineValues, dayRecord, MIN_BASELINE_DAYS, SHORT_NIGHT_MINUTES, sleepLabel } from './wellnessCheck';

export const RHR_OFF = 5;
export const SLEEP_SHORTER_OFF = 60;
// Kleiner dan dit verschil heet "normaal".
const RHR_SAME = 2;
const SLEEP_SAME = 20;

export type MorningSignalKey = 'restingHeartRate' | 'hrv' | 'sleep';

export interface MorningSignal {
  key: MorningSignalKey;
  // 'hoger', 'lager', 'korter', 'langer' of 'normaal', tegen je eigen gemiddelde.
  verdict: 'hoger' | 'lager' | 'korter' | 'langer' | 'normaal';
  // Afwijkend in de richting die aandacht vraagt.
  off: boolean;
  // "rusthartslag 4 hoger dan normaal"
  text: string;
}

export interface MorningRule {
  date: string;
  signals: MorningSignal[];
  offCount: number;
  // Twee of meer van de drie wijken af: vraag of je moe bent.
  askTired: boolean;
  // De drie oordelen op één regel: "Rusthartslag 6 hoger dan normaal · HRV lager dan normaal · slaap normaal".
  line: string;
}

export interface MorningRuleOptions {
  // Nachten die je "niet goed gemeten" noemde (engine/shortNight.ts#ignoredNightDates).
  ignoredNights?: ReadonlySet<string>;
  // Ochtenden die je niet liet meetellen (engine/influence.ts#excludedMornings).
  excludedMornings?: ReadonlySet<string>;
}

export const MORNING_RULE_QUESTION = 'Twee van de drie wijken af. Ben je moe?';

// De antwoorden op de vraag, als energie van de ochtendcheck: "Ja" is Moe, "Nee" is Gewoon.
export const TIRED_CHOICES: [EnergyFeeling, string][] = [['moe', 'Ja'], ['gewoon', 'Nee']];

// Het ene woord onder een getal op de ochtendkaart ("hoger", "normaal"), of niets als de regel er
// niet is of dat getal niet beoordeelt.
export function ruleWord(rule: MorningRule | undefined, key: MorningSignalKey): { word: MorningSignal['verdict']; off: boolean } | undefined {
  const s = rule?.signals.find((x) => x.key === key);
  return s ? { word: s.verdict, off: s.off } : undefined;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length);
}

function restingSignal(value: number, base: number[]): MorningSignal | undefined {
  if (base.length < MIN_BASELINE_DAYS) return undefined;
  const diff = value - Math.round(mean(base));
  if (diff >= RHR_SAME) return { key: 'restingHeartRate', verdict: 'hoger', off: diff >= RHR_OFF, text: `rusthartslag ${diff} hoger dan normaal` };
  if (diff <= -RHR_SAME) return { key: 'restingHeartRate', verdict: 'lager', off: false, text: `rusthartslag ${-diff} lager dan normaal` };
  return { key: 'restingHeartRate', verdict: 'normaal', off: false, text: 'rusthartslag normaal' };
}

function hrvSignal(value: number, base: number[]): MorningSignal | undefined {
  if (base.length < MIN_BASELINE_DAYS) return undefined;
  const avg = mean(base);
  const margin = Math.max(stdev(base), avg * 0.07);
  if (value < avg - margin) return { key: 'hrv', verdict: 'lager', off: true, text: 'HRV lager dan normaal' };
  if (value > avg + margin) return { key: 'hrv', verdict: 'hoger', off: false, text: 'HRV hoger dan normaal' };
  return { key: 'hrv', verdict: 'normaal', off: false, text: 'HRV normaal' };
}

function sleepSignal(minutes: number, base: number[]): MorningSignal {
  const short = minutes < SHORT_NIGHT_MINUTES;
  if (base.length < MIN_BASELINE_DAYS) {
    return short
      ? { key: 'sleep', verdict: 'korter', off: true, text: `slaap ${sleepLabel(minutes)}, korter dan 6 uur` }
      : { key: 'sleep', verdict: 'normaal', off: false, text: `slaap ${sleepLabel(minutes)}` };
  }
  const diff = Math.round(minutes - mean(base));
  if (diff <= -SLEEP_SAME) return { key: 'sleep', verdict: 'korter', off: short || diff <= -SLEEP_SHORTER_OFF, text: `slaap ${sleepLabel(-diff)} korter dan normaal` };
  if (diff >= SLEEP_SAME) return { key: 'sleep', verdict: 'langer', off: short, text: `slaap ${sleepLabel(diff)} langer dan normaal` };
  return { key: 'sleep', verdict: 'normaal', off: short, text: short ? `slaap ${sleepLabel(minutes)}, korter dan 6 uur` : 'slaap normaal' };
}

// De regel voor deze ochtend, of undefined als het horloge nog niets gaf of er te weinig eigen
// dagen zijn om twee van de drie te beoordelen.
export function morningRule(today: string, metrics: readonly RecoveryMetric[], options: MorningRuleOptions = {}): MorningRule | undefined {
  const list = [...metrics];
  const record = dayRecord(today, list);
  if (!record) return undefined;
  const ignored = options.ignoredNights ?? new Set<string>();
  const excluded = options.excludedMornings ?? new Set<string>();
  const nightIgnored = ignored.has(today);
  const morningExcluded = excluded.has(today);
  const signals: MorningSignal[] = [];
  if (record.restingHeartRate !== undefined && !morningExcluded) {
    const s = restingSignal(record.restingHeartRate, baselineValues(today, list, (m) => m.restingHeartRate, excluded));
    if (s) signals.push(s);
  }
  if (record.hrv !== undefined && !morningExcluded && !nightIgnored) {
    const s = hrvSignal(record.hrv, baselineValues(today, list, (m) => m.hrv, new Set([...ignored, ...excluded])));
    if (s) signals.push(s);
  }
  if (record.sleepMinutes !== undefined && !nightIgnored) {
    signals.push(sleepSignal(record.sleepMinutes, baselineValues(today, list, (m) => m.sleepMinutes, ignored)));
  }
  if (signals.length < 2) return undefined;
  const offCount = signals.filter((s) => s.off).length;
  const text = signals.map((s) => s.text).join(' · ');
  return { date: today, signals, offCount, askTired: offCount >= 2, line: text.charAt(0).toUpperCase() + text.slice(1) };
}
